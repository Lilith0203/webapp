import cache from '../util/cache.mjs';

function getUserId(ctx) {
    const id = ctx?.state?.user?.id;
    const n = parseInt(id, 10);
    return Number.isNaN(n) ? null : n;
}

function requireAuth(ctx, next) {
    if (!getUserId(ctx)) {
        ctx.status = 401;
        ctx.body = { success: false, message: '未授权，请登录' };
        return;
    }
    return next();
}

function prefsKey(userId) {
    return `user_prefs:${userId}`;
}

function legacyStoryPrefsKey(userId) {
    return `story_prefs:${userId}`;
}

function normalizeStoryBookmarks(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {};
    }

    const cleaned = {};
    Object.keys(raw).forEach((k) => {
        const rootId = parseInt(k, 10);
        if (!Number.isFinite(rootId) || rootId <= 0) return;

        const entry = raw[k];

        if (typeof entry === 'number' || typeof entry === 'string') {
            const page = parseInt(entry, 10);
            if (Number.isFinite(page) && page > 0) {
                cleaned[rootId] = { page, sortDirection: 'DESC' };
            }
            return;
        }

        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;

        const asc = parseInt(entry.ASC, 10);
        const desc = parseInt(entry.DESC, 10);
        if (Number.isFinite(desc) && desc > 0) {
            cleaned[rootId] = { page: desc, sortDirection: 'DESC' };
            return;
        }
        if (Number.isFinite(asc) && asc > 0) {
            cleaned[rootId] = { page: asc, sortDirection: 'ASC' };
            return;
        }

        const page = parseInt(entry.page, 10);
        const dir = entry.sortDirection;
        if (Number.isFinite(page) && page > 0 && (dir === 'ASC' || dir === 'DESC')) {
            cleaned[rootId] = { page, sortDirection: dir };
        }
    });

    return cleaned;
}

function normalizeCustomSetIds(raw) {
    if (!Array.isArray(raw)) return [];
    const ids = raw
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isFinite(id) && id > 0);
    return [...new Set(ids)];
}

function emptyStoryPrefs() {
    return {
        bookmarks: {},
        customSetIds: [],
        isCustomMode: false
    };
}

function normalizeStoryPrefs(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return emptyStoryPrefs();
    }
    return {
        bookmarks: normalizeStoryBookmarks(raw.bookmarks),
        customSetIds: normalizeCustomSetIds(raw.customSetIds),
        isCustomMode: !!raw.isCustomMode
    };
}

function emptyUserPrefs() {
    return {
        story: emptyStoryPrefs()
    };
}

function unwrapStoredPrefs(data) {
    if (typeof data === 'string') {
        try {
            return unwrapStoredPrefs(JSON.parse(data));
        } catch (_) {
            return {};
        }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return {};
    }
    return data;
}

async function readUserPrefs(userId) {
    let data = unwrapStoredPrefs(await cache.getPersist(prefsKey(userId)));

    // 兼容旧版 story_prefs:${userId} 键
    if (!data.story) {
        const legacy = await cache.getPersist(legacyStoryPrefsKey(userId));
        if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
            data = { ...data, story: normalizeStoryPrefs(legacy) };
            await cache.setPersist(prefsKey(userId), data);
            await cache.del(legacyStoryPrefsKey(userId));
        }
    }

    return {
        ...data,
        story: normalizeStoryPrefs(data.story)
    };
}

async function getUserPrefs(ctx) {
    try {
        const userId = getUserId(ctx);
        const scope = String(ctx.query?.scope || '').trim();
        const prefs = await readUserPrefs(userId);

        if (scope === 'story') {
            ctx.body = { success: true, data: prefs.story };
            return;
        }

        ctx.body = { success: true, data: prefs };
    } catch (error) {
        console.error('getUserPrefs error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: '获取用户偏好失败' };
    }
}

async function saveUserPrefs(ctx) {
    try {
        const userId = getUserId(ctx);
        const body = ctx.request.body || {};
        const current = await readUserPrefs(userId);
        const next = { ...current };

        if (body.story !== undefined) {
            const patch = body.story && typeof body.story === 'object' && !Array.isArray(body.story)
                ? body.story
                : {};
            const story = { ...current.story };
            if (patch.bookmarks !== undefined) {
                story.bookmarks = normalizeStoryBookmarks(patch.bookmarks);
            }
            if (patch.customSetIds !== undefined) {
                story.customSetIds = normalizeCustomSetIds(patch.customSetIds);
            }
            if (patch.isCustomMode !== undefined) {
                story.isCustomMode = !!patch.isCustomMode;
            }
            next.story = story;
        }

        // 预留：其它模块偏好按命名空间合并，如 body.works = { ... }

        await cache.setPersist(prefsKey(userId), next);

        const scope = String(ctx.query?.scope || '').trim();
        if (scope === 'story') {
            ctx.body = { success: true, data: next.story };
            return;
        }

        ctx.body = { success: true, data: next };
    } catch (error) {
        console.error('saveUserPrefs error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: '保存用户偏好失败' };
    }
}

export default {
    'GET /api/user-prefs': [requireAuth, getUserPrefs],
    'POST /api/user-prefs': [requireAuth, saveUserPrefs]
};
