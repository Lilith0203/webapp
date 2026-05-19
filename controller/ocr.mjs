import { createRequire } from 'module';
import * as Util from '@alicloud/tea-util';
import config from 'config';
import ConfigSetting from '../util/config.mjs';
import { Control, sequelize } from '../orm.mjs';

const require = createRequire(import.meta.url);
const OcrApi = require('@alicloud/ocr-api20210707');
const OcrClient = OcrApi?.default;
const RecognizeAllTextRequest = OcrApi?.RecognizeAllTextRequest;

/** control 表：本月全站已用次数（纯数字字符串，如 "97"） */
const OCR_USAGE_CONTROL_KEY = 'ocr_monthly_usage';
/** control 表：已用次数对应的自然月 YYYY-MM（东八区），与上行配套用于换月归零 */
const OCR_USAGE_PERIOD_KEY = 'ocr_monthly_usage_period';
/** control 表：每月参考次数上限（字符串数字），未设置时用 config ocr.monthlyUserLimit */
const OCR_LIMIT_CONTROL_KEY = 'ocr_monthly_limit';

async function getGlobalMonthUsed(yearMonth) {
    const periodRow = await Control.findOne({ where: { key: OCR_USAGE_PERIOD_KEY, isDeleted: 0 } });
    const countRow = await Control.findOne({ where: { key: OCR_USAGE_CONTROL_KEY, isDeleted: 0 } });
    const period = String(periodRow?.value || '').trim();
    if (period !== yearMonth) return 0;
    return Math.max(0, parseInt(String(countRow?.value ?? '0').trim(), 10) || 0);
}

async function persistFlatUsage(yearMonth, usedCount, t) {
    const used = Math.max(0, Math.floor(usedCount));
    const [countRow] = await Control.findOrCreate({
        where: { key: OCR_USAGE_CONTROL_KEY, isDeleted: 0 },
        defaults: { key: OCR_USAGE_CONTROL_KEY, value: '0', isDeleted: 0 },
        transaction: t,
        lock: t.LOCK.UPDATE
    });
    const [periodRow] = await Control.findOrCreate({
        where: { key: OCR_USAGE_PERIOD_KEY, isDeleted: 0 },
        defaults: { key: OCR_USAGE_PERIOD_KEY, value: yearMonth, isDeleted: 0 },
        transaction: t,
        lock: t.LOCK.UPDATE
    });
    await countRow.update({ value: String(used) }, { transaction: t });
    await periodRow.update({ value: yearMonth }, { transaction: t });
}

async function incrementGlobalMonthUsed(yearMonth) {
    await sequelize.transaction(async (t) => {
        const [countRow] = await Control.findOrCreate({
            where: { key: OCR_USAGE_CONTROL_KEY, isDeleted: 0 },
            defaults: { key: OCR_USAGE_CONTROL_KEY, value: '0', isDeleted: 0 },
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        const [periodRow] = await Control.findOrCreate({
            where: { key: OCR_USAGE_PERIOD_KEY, isDeleted: 0 },
            defaults: { key: OCR_USAGE_PERIOD_KEY, value: yearMonth, isDeleted: 0 },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        let used = 0;
        const period = String(periodRow.value || '').trim();
        if (period === yearMonth) {
            used = Math.max(0, parseInt(String(countRow.value ?? '0').trim(), 10) || 0);
        }

        used += 1;
        await countRow.update({ value: String(used) }, { transaction: t });
        await periodRow.update({ value: yearMonth }, { transaction: t });
    });
}

async function setGlobalMonthUsed(yearMonth, usedCount) {
    const n = Math.max(0, Math.floor(usedCount));
    await sequelize.transaction(async (t) => {
        await persistFlatUsage(yearMonth, n, t);
    });
}

function getAuthedUserId(ctx) {
    const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id;
    return typeof id === 'number' || typeof id === 'string' ? parseInt(id, 10) : null;
}

function getAuthedRole(ctx) {
    return (ctx && ctx.state && ctx.state.user && ctx.state.user.role) || '';
}

/** 东八区自然月 YYYY-MM */
function getYearMonthShanghai() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit' })
        .format(new Date())
        .slice(0, 7);
}

function getMonthlyLimitFromConfig() {
    if (config.has('ocr.monthlyUserLimit')) {
        const n = parseInt(config.get('ocr.monthlyUserLimit'), 10);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return 200;
}

async function getMonthlyLimit() {
    const row = await Control.findOne({ where: { key: OCR_LIMIT_CONTROL_KEY, isDeleted: 0 } });
    if (row?.value != null && String(row.value).trim() !== '') {
        const n = parseInt(String(row.value).trim(), 10);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return getMonthlyLimitFromConfig();
}

async function setMonthlyLimitValue(limit) {
    const [row] = await Control.findOrCreate({
        where: { key: OCR_LIMIT_CONTROL_KEY, isDeleted: 0 },
        defaults: { key: OCR_LIMIT_CONTROL_KEY, value: String(limit), isDeleted: 0 }
    });
    await row.update({ value: String(limit) });
}

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

async function recordGlobalOcrSuccess(yearMonth) {
    await incrementGlobalMonthUsed(yearMonth);
}

// GET /api/ocr/quota — remaining 供文字识别页；limit/used 供管理页回填
async function ocrQuota(ctx) {
    const userId = getAuthedUserId(ctx);
    if (!userId) {
        ctx.status = 401;
        ctx.body = { success: false, message: '未授权，请登录' };
        return;
    }
    const limit = await getMonthlyLimit();
    const yearMonth = getYearMonthShanghai();
    const used = await getGlobalMonthUsed(yearMonth);
    const remaining = Math.max(0, limit - used);
    ctx.body = {
        success: true,
        remaining,
        limit,
        used,
        yearMonth
    };
}

// POST /api/ocr/quota/admin — 管理员设置「每月参考次数」和/或「当前月全站已用」
async function ocrQuotaAdminSet(ctx) {
    const role = getAuthedRole(ctx);
    if (role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, message: '需要管理员权限' };
        return;
    }
    const body = ctx.request.body || {};
    const { yearMonth: rawYm, usedCount: rawUsed, monthlyLimit: rawLimit } = body;

    let didSomething = false;
    const ym = typeof rawYm === 'string' && /^\d{4}-\d{2}$/.test(rawYm.trim()) ? rawYm.trim() : getYearMonthShanghai();

    if (rawLimit !== undefined && rawLimit !== null && String(rawLimit).trim() !== '') {
        const ml = parseInt(rawLimit, 10);
        if (!Number.isFinite(ml) || ml <= 0 || ml > 100000) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'monthlyLimit 须为 1～100000 的整数' };
            return;
        }
        await setMonthlyLimitValue(ml);
        didSomething = true;
    }

    if (rawUsed !== undefined && rawUsed !== null && String(rawUsed).trim() !== '') {
        const usedCount = parseInt(rawUsed, 10);
        if (!Number.isFinite(usedCount) || usedCount < 0) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'usedCount 须为非负整数' };
            return;
        }
        const limit = await getMonthlyLimit();
        if (usedCount > limit * 50) {
            ctx.status = 400;
            ctx.body = { success: false, message: `usedCount 过大（>${limit * 50}）` };
            return;
        }
        await setGlobalMonthUsed(ym, usedCount);
        didSomething = true;
    }

    if (!didSomething) {
        ctx.status = 400;
        ctx.body = { success: false, message: '请至少提供 monthlyLimit 或 usedCount' };
        return;
    }

    const limit = await getMonthlyLimit();
    const used = await getGlobalMonthUsed(ym);
    ctx.body = {
        success: true,
        data: {
            yearMonth: ym,
            monthlyLimit: limit,
            usedCount: used,
            remaining: Math.max(0, limit - used)
        }
    };
}

// POST /api/ocr
async function ocr(ctx) {
    const { url, type, languages, outputRow, outputParagraph, outputTable } = ctx.request.body || {};
    const userId = getAuthedUserId(ctx);
    const role = getAuthedRole(ctx);

    if (!userId) {
        ctx.status = 401;
        ctx.body = { success: false, message: '未授权，请登录' };
        return;
    }

    try {
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

    const ocrType = typeof type === 'string' && type.trim() ? type.trim() : 'General';
    const yearMonth = getYearMonthShanghai();
    const monthlyLimit = await getMonthlyLimit();

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

        if (ocrType === 'MultiLang' && typeof languages === 'string' && languages.trim()) {
            reqMap.multiLanConfig = { languages: languages.trim() };
        }

        if (ocrType === 'Advanced') {
            reqMap.advancedConfig = {
                outputRow: !!outputRow,
                outputParagraph: !!outputParagraph,
                outputTable: !!outputTable
            };
        }

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

        let preferredText = plainText;
        if (ocrType === 'Advanced' && outputParagraph && paragraphText) preferredText = paragraphText;
        else if (ocrType === 'Advanced' && outputRow && rowText) preferredText = rowText;

        await recordGlobalOcrSuccess(yearMonth);

        const usedAfter = await getGlobalMonthUsed(yearMonth);

        ctx.body = {
            success: true,
            text: preferredText,
            data,
            quota: {
                remaining: Math.max(0, monthlyLimit - usedAfter)
            }
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
    'GET /api/ocr/quota': ocrQuota,
    'POST /api/ocr/quota/admin': ocrQuotaAdminSet,
    'POST /api/ocr': ocr
};
