import {GridData} from '../orm.mjs';

//GET /api/grid/list
async function getGridList(ctx, next) {
    let gridlist = await GridData.findAll({
        where: {
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
    let name = ctx.request.body.name || 'temp';
    let size = parseInt(ctx.request.body.size);

    let cells = Array.isArray(ctx.request.body.cells) 
            ? JSON.stringify(ctx.request.body.cells)  // 如果是数组，转换为 JSON 字符串
            : ctx.request.body.cells; 

    let id = 0;
    if(ctx.request.body.id) {
        id = parseInt(ctx.request.body.id);
        try {
            const grid = await GridData.findByPk(id);
            if (!grid) {
                ctx.status = 404;
                ctx.body = {
                    success: false,
                    message: '格子图不存在'
                };
                return;
            } else {
                await GridData.update({
                    size: size,
                    cells: cells,
                    updatedAt: new Date()
                }, {
                    where: { id: id }
                });
            }
        } catch (e) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '格子图更新失败'
            };
            return;
        }
    } else {
        const grid =await GridData.create({
            name: name,
            size: size,
            cells: cells
        });
        id = grid.id;
    }
    ctx.body = {
        id: id,
        success: true
    }
}

//GET /api/grid/:id
async function getGrid(ctx, next) {
    let id = parseInt(ctx.params.id);
    let grid = await GridData.findOne({
        where: {
            id: id
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
    let id = parseInt(ctx.request.body.id);
    await GridData.update({isDeleted: 1}, {where: {id: id}});
    ctx.body = {
        success: true
    }
}

export default {
    'GET /api/grid/list': getGridList,
    'POST /api/grid/save': saveGrid,
    'GET /api/grid/:id': getGrid,
    'POST /api/grid/delete': deleteGrid,
}