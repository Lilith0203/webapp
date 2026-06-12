import { GridData } from '../orm.mjs';

function getAuthedUserId(ctx) {
    const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id;
    return typeof id === 'number' || typeof id === 'string' ? parseInt(id, 10) : null;
}

const MIN_GRID_SIZE = 1;
const MAX_GRID_SIZE = 80;

function normalizeGridSize(raw) {
    const size = parseInt(raw, 10);
    if (Number.isNaN(size) || size < MIN_GRID_SIZE || size > MAX_GRID_SIZE) {
        return null;
    }
    return size;
}

//GET /api/grid/list
async function getGridList(ctx, next) {
    const userId = getAuthedUserId(ctx);
    if (!userId) {
        ctx.body = { gridlist: [] };
        return;
    }
    const gridlist = await GridData.findAll({
        where: {
            userId,
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
    let size = normalizeGridSize(ctx.request.body.size);
    if (size == null) {
        ctx.status = 400;
        ctx.body = { success: false, message: `格子尺寸须在 ${MIN_GRID_SIZE}～${MAX_GRID_SIZE} 之间` };
        return;
    }

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
    if (!userId) {
        ctx.status = 404;
        ctx.body = { message: '格子图不存在' };
        return;
    }
    const id = parseInt(ctx.params.id, 10);
    const grid = await GridData.findOne({
        where: {
            id,
            userId,
            isDeleted: 0
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