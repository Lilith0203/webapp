import { User } from '../orm.mjs';
import { Op } from 'sequelize';

export function getAuthedUserId(ctx) {
    const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id;
    return typeof id === 'number' || typeof id === 'string' ? parseInt(id, 10) : null;
}

let adminUserIdsCache = { value: null, ts: 0 };

export async function getAdminUserIds() {
    const now = Date.now();
    if (adminUserIdsCache.value && now - adminUserIdsCache.ts < 60_000) {
        return adminUserIdsCache.value;
    }
    const admins = await User.findAll({
        where: { role: 'admin' },
        attributes: ['id']
    });
    const ids = admins.map((u) => parseInt(u.id, 10)).filter((id) => !Number.isNaN(id));
    adminUserIdsCache = { value: ids, ts: now };
    return ids;
}

/**
 * @param {object} where 作品查询条件
 * @param {'mine'|'public'} scope mine=当前用户 public=管理员
 * @param {object} ctx koa context
 * @returns {Promise<{ ok: true, where: object } | { ok: false, status: number, body: object }>}
 */
export async function applyWorksOwnerScope(where, scope, ctx) {
    const base = { ...where };

    if (scope === 'mine') {
        const uid = getAuthedUserId(ctx);
        if (!uid) {
            return {
                ok: false,
                status: 401,
                body: {
                    works: [],
                    count: 0,
                    message: '请先登录'
                }
            };
        }
        base.userId = uid;
        return { ok: true, where: base };
    }

    const adminIds = await getAdminUserIds();
    if (adminIds.length === 0) {
        base.userId = { [Op.in]: [-1] };
    } else {
        base.userId = { [Op.in]: adminIds };
    }
    return { ok: true, where: base };
}
