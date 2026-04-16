import { createRequire } from 'module';
import * as Util from '@alicloud/tea-util';
import config from 'config';

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

// POST /api/ocr
async function ocr(ctx) {
  const { url, type } = ctx.request.body || {};

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

    const req = new RecognizeAllTextRequest({
      url,
      type: ocrType
    });

    const resp = await client.recognizeAllTextWithOptions(req, runtime);
    const data = resp?.body?.data ?? resp?.Body?.Data ?? resp?.body?.Data ?? resp?.Body?.data;

    ctx.body = {
      success: true,
      text: toPlainText(data),
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

