import { GridData, User } from '../orm.mjs';
import { Op } from 'sequelize';

function getAuthedUserId(ctx) {
    const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id;
    return typeof id === 'number' || typeof id === 'string' ? parseInt(id) : null;
}

function isAdmin(ctx) {
    return (ctx && ctx.state && ctx.state.user && ctx.state.user.role) === 'admin';
}

let adminUserIdCache = { value: null, ts: 0 };
async function getAdminUserId() {
    const now = Date.now();
    if (adminUserIdCache.value && now - adminUserIdCache.ts < 60_000) {
        return adminUserIdCache.value;
    }
    const admin = await User.findOne({
        where: { role: 'admin' },
        order: [['id', 'ASC']]
    });
    adminUserIdCache = { value: admin ? admin.id : null, ts: now };
    return adminUserIdCache.value;
}

//GET /api/grid/list
async function getGridList(ctx, next) {
    const userId = getAuthedUserId(ctx);
    const adminUserId = await getAdminUserId();
    if (!adminUserId && !userId) {
        ctx.body = { gridlist: [] };
        return;
    }
    const visibleUserIds = isAdmin(ctx)
        ? [userId] // 管理员只看自己的（管理员的）
        : (userId ? [userId, adminUserId].filter(Boolean) : [adminUserId]); // 游客仅看管理员
    let gridlist = await GridData.findAll({
        where: {
            userId: { [Op.in]: visibleUserIds },
            isDeleted: 0
        },
        order: [['updatedAt', 'DESC']]
    });
    ctx.body = {
        gridlist,
    }
}

//POST /api/grid/save
async function saveGrid(ctx, next) {
    const userId = getAuthedUserId(ctx);
    if (!userId) {
        ctx.status = 401;
        ctx.body = { success: false, message: '未授权，请登录' };
        return;
    }
    let name = ctx.request.body.name || 'temp';
    let size = parseInt(ctx.request.body.size);

    let cells = Array.isArray(ctx.request.body.cells) 
            ? JSON.stringify(ctx.request.body.cells)  // 如果是数组，转换为 JSON 字符串
            : ctx.request.body.cells; 

    let id = 0;
    let forked = false;
    if (ctx.request.body.id) {
        id = parseInt(ctx.request.body.id, 10);
        try {
            const grid = await GridData.findOne({
                where: { id, isDeleted: 0 }
            });
            if (!grid) {
                ctx.status = 404;
                ctx.body = {
                    success: false,
                    message: '格子图不存在'
                };
                return;
            }

            if (parseInt(grid.userId, 10) === parseInt(userId, 10)) {
                await GridData.update({
                    size: size,
                    cells: cells,
                    updatedAt: new Date()
                }, {
                    where: { id, userId }
                });
            } else {
                const newGrid = await GridData.create({
                    userId,
                    name: name,
                    size: size,
                    cells: cells
                });
                id = newGrid.id;
                forked = true;
            }
        } catch (e) {
            ctx.status = 500;
            ctx.body = {
                success: false,
                message: '格子图保存失败'
            };
            return;
        }
    } else {
        const grid = await GridData.create({
            userId,
            name: name,
            size: size,
            cells: cells
        });
        id = grid.id;
    }
    ctx.body = {
        id: id,
        success: true,
        forked
    }
}

//GET /api/grid/:id
async function getGrid(ctx, next) {
    const userId = getAuthedUserId(ctx);
    const adminUserId = await getAdminUserId();
    if (!adminUserId && !userId) {
        ctx.status = 404;
        ctx.body = { message: '格子图不存在' };
        return;
    }
    const visibleUserIds = isAdmin(ctx)
        ? [userId]
        : (userId ? [userId, adminUserId].filter(Boolean) : [adminUserId]);
    let id = parseInt(ctx.params.id);
    let grid = await GridData.findOne({
        where: {
            id: id,
            userId: { [Op.in]: visibleUserIds }
        }
    });
    if (grid) {
        const gridData = grid.get({ plain: true });
        ctx.body = {
            gridData
        }
    } else {
        ctx.status = 404;
        ctx.body = {
            message: '格子图不存在'
        }
    }
}

//POST /api/grid/delete
async function deleteGrid(ctx, next) {
    const userId = getAuthedUserId(ctx);
    if (!userId) {
        ctx.status = 401;
        ctx.body = { success: false, message: '未授权，请登录' };
        return;
    }
    let id = parseInt(ctx.request.body.id);
    const grid = await GridData.findOne({ where: { id, isDeleted: 0 } });
    if (!grid) {
        ctx.status = 404;
        ctx.body = { success: false, message: '格子图不存在' };
        return;
    }
    // 管理员账号也只允许删除自己的；普通用户更不能删除管理员的
    if (parseInt(grid.userId) !== parseInt(userId)) {
        ctx.status = 403;
        ctx.body = { success: false, message: '无权限：只能删除自己的格子图' };
        return;
    }

    await GridData.update({ isDeleted: 1 }, { where: { id, userId } });
    ctx.body = { success: true };
}

export default {
    'GET /api/grid/list': getGridList,
    'POST /api/grid/save': saveGrid,
    'GET /api/grid/:id': getGrid,
    'POST /api/grid/delete': deleteGrid,
}