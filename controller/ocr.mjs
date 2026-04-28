import { createRequire } from 'module';
import * as Util from '@alicloud/tea-util';
import config from 'config';
import ConfigSetting from '../util/config.mjs';

const require = createRequire(import.meta.url);
// 在 ESM 环境下，用 require() 加载 CJS SDK 更稳定
const OcrApi = require('@alicloud/ocr-api20210707');
const OcrClient = OcrApi?.default;
const RecognizeAllTextRequest = OcrApi?.RecognizeAllTextRequest;

function createClient() {
  const accessKeyId = config.get('ocr.accessKeyId');
  const accessKeySecret = config.get('ocr.accessKeySecret');

  if (!accessKeyId || !accessKeySecret) {
    const err = new Error(
      'Missing OCR AccessKey. Please set config ocr.accessKeyId / ocr.accessKeySecret (e.g. config/default.json).'
    );
    err.status = 500;
    throw err;
  }

  const endpoint = (config.has('ocr.endpoint') && config.get('ocr.endpoint')) || 'ocr-api.cn-hangzhou.aliyuncs.com';
  const regionId = (config.has('ocr.regionId') && config.get('ocr.regionId')) || 'cn-hangzhou';

  if (typeof OcrClient !== 'function') {
    const err = new Error('Aliyun OCR SDK load failed: Client is not a constructor.');
    err.status = 500;
    throw err;
  }

  return new OcrClient({
    endpoint,
    accessKeyId,
    accessKeySecret,
    type: 'access_key',
    regionId
  });
}

function toPlainText(data) {
  // 统一识别接口：识别文本汇总在 Data.Content
  return data?.Content ?? data?.content ?? '';
}

function toRowText(data) {
  const subImages = data?.SubImages ?? data?.subImages ?? [];
  if (!Array.isArray(subImages) || subImages.length === 0) return '';

  const lines = [];
  for (const sub of subImages) {
    const rowDetails =
      sub?.RowInfo?.RowDetails ??
      sub?.RowInfo?.rowDetails ??
      sub?.rowInfo?.RowDetails ??
      sub?.rowInfo?.rowDetails ??
      [];
    if (!Array.isArray(rowDetails) || rowDetails.length === 0) continue;
    for (const r of rowDetails) {
      const s = r?.RowContent ?? r?.rowContent ?? '';
      if (typeof s === 'string' && s.trim()) lines.push(s);
    }
  }
  return lines.join('\n');
}

function toParagraphText(data) {
  const subImages = data?.SubImages ?? data?.subImages ?? [];
  if (!Array.isArray(subImages) || subImages.length === 0) return '';

  const paras = [];
  for (const sub of subImages) {
    const paraDetails =
      sub?.ParagraphInfo?.ParagraphDetails ??
      sub?.ParagraphInfo?.paragraphDetails ??
      sub?.paragraphInfo?.ParagraphDetails ??
      sub?.paragraphInfo?.paragraphDetails ??
      [];
    if (!Array.isArray(paraDetails) || paraDetails.length === 0) continue;
    for (const p of paraDetails) {
      const s = p?.ParagraphContent ?? p?.paragraphContent ?? '';
      if (typeof s === 'string' && s.trim()) paras.push(s);
    }
  }
  return paras.join('\n\n');
}

// POST /api/ocr
async function ocr(ctx) {
  const { url, type, languages, outputRow, outputParagraph, outputTable } = ctx.request.body || {};

  // 配置：是否允许普通用户使用 OCR（管理员始终允许）
  try {
    const role = ctx && ctx.state && ctx.state.user && ctx.state.user.role;
    if (role !== 'admin') {
      const v = await ConfigSetting.getConfig('ocr_user_enabled');
      const enabled = v === undefined ? true : v === '1';
      if (!enabled) {
        ctx.status = 403;
        ctx.body = { success: false, message: '无权限：管理员已关闭普通用户文字识别功能' };
        return;
      }
    }
  } catch (e) {
    // 配置读取失败：默认不阻断
  }

  if (!url || typeof url !== 'string') {
    ctx.status = 400;
    ctx.body = { success: false, message: '缺少参数 url' };
    return;
  }
  if (!/^https?:\/\//i.test(url)) {
    ctx.status = 400;
    ctx.body = { success: false, message: 'url 必须是 http/https' };
    return;
  }

  // 默认通用基础版；也允许前端传 type，例如 Advanced / HandWriting / Table / IdCard
  const ocrType = typeof type === 'string' && type.trim() ? type.trim() : 'General';

  try {
    const client = createClient();
    const runtime = new Util.RuntimeOptions({
      readTimeout: 20000,
      connectTimeout: 8000
    });

    if (typeof RecognizeAllTextRequest !== 'function') {
      throw new Error('Aliyun OCR SDK load failed: RecognizeAllTextRequest missing.');
    }

    const reqMap = { url, type: ocrType };

    // Type=MultiLang 时，传语言列表才能拉开效果差异（如 "chn,eng"）
    if (ocrType === 'MultiLang' && typeof languages === 'string' && languages.trim()) {
      reqMap.multiLanConfig = { languages: languages.trim() };
    }

    // Type=Advanced 时，用 AdvancedConfig 拿到按行/按段/表格等结构化输出，再用它拼文本
    if (ocrType === 'Advanced') {
      reqMap.advancedConfig = {
        outputRow: !!outputRow,
        outputParagraph: !!outputParagraph,
        outputTable: !!outputTable
      };
    }

    // Type=Table 时，表格专属配置
    if (ocrType === 'Table') {
      reqMap.tableConfig = {
        outputTableExcel: false,
        outputTableHtml: false
      };
    }

    const req = new RecognizeAllTextRequest(reqMap);

    const resp = await client.recognizeAllTextWithOptions(req, runtime);
    const data = resp?.body?.data ?? resp?.Body?.Data ?? resp?.body?.Data ?? resp?.Body?.data;

    const rowText = toRowText(data);
    const paragraphText = toParagraphText(data);
    const plainText = toPlainText(data);

    // 优先用用户显式开启的结构化输出拼装文本
    let preferredText = plainText;
    if (ocrType === 'Advanced' && outputParagraph && paragraphText) preferredText = paragraphText;
    else if (ocrType === 'Advanced' && outputRow && rowText) preferredText = rowText;

    ctx.body = {
      success: true,
      text: preferredText,
      data
    };
  } catch (error) {
    console.error('Aliyun OCR error:', error);
    ctx.status = error?.status || 500;
    ctx.body = {
      success: false,
      message: error?.message || 'OCR 识别失败'
    };
  }
}

export default {
  'POST /api/ocr': ocr
};

