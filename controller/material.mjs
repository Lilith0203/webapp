import { MaterialType } from '../orm.mjs'
import { Material } from '../orm.mjs'
import { cleanOssUrl } from '../oss.mjs';
import { Op } from 'sequelize';

function getAuthedUserId(ctx) {
    const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id;
    return typeof id === 'number' || typeof id === 'string' ? parseInt(id) : null;
}

function arrayToTree(arr, root) {
    const result = []
    const map = {}

    // 首先将 Sequelize 模型实例转换为普通对象
    const items = arr.map(item => item.get({ plain: true }))

    // 建立映射关系
    for (const item of items) {
        map[item.id] = { ...item, children: [] }
    }
    
    // 建立树形结构
    for (const item of items) {
        if (item.parentId === root) {
            result.push(map[item.id])
        } else {
            if (map[item.parentId]) {
                map[item.parentId].children.push(map[item.id])
            }
        }
    }
    return result
}

//GET /getMaterialType
async function getType(ctx, next) {
    const userId = getAuthedUserId(ctx)
    if (!userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录', typetree: [] }
        return
    }
    let types = await MaterialType.findAll({
        where: {
            userId,
            isDeleted: 0
        }
    });
    let typetree = arrayToTree(types, 0)

    ctx.body = {
        success: true,
        typetree: typetree
    }
}

//POST /api/addMaterialType
async function addtype(ctx, next) {
    const userId = getAuthedUserId(ctx)
    if (!userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录' }
        return
    }
    let typeName = ctx.request.body.typeName;
    let parentId = ctx.request.body.parentId || 0;
    if (parentId === 0) {
        await MaterialType.create({
            userId,
            typeName: typeName,
            level: 0,
            parentId: parentId
        });
    } else {
        await MaterialType.create({
            userId,
            typeName: typeName,
            level: 1,
            parentId: parentId
        });
    }
    ctx.body = {
        success: true
    }
}

async function updateMaterialType(ctx, next) {
    const userId = getAuthedUserId(ctx)
    if (!userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录' }
        return
    }
    const id = ctx.request.body.id;
    const updateData = {
        typeName: ctx.request.body.typeName,
    };

    try {
        //查找并更新material
        const materialType = await MaterialType.findOne({
            where: {
                id: id,
                userId,
                isDeleted: 0
            }
        });
        if (!materialType) {
            ctx.body = {
                success: false,
                message: '未找到该材料类型'
            }
            return;
        }

        await MaterialType.update(updateData, {
            where: {
                id: id,
                userId
            }
        });
        ctx.body = {
            success: true
        }
    } catch (error) {
        ctx.body = {
            success: false,
            message: '更新失败: ' + error.message
        }
    }
}

//POST /api/material
async function material(ctx, next) {
    // 获取请求体中的参数
    const { ids, showAll, sortBy, sortOrder } = ctx.request.body;
    
    // 构建查询条件
    // 当通过 ids 批量查询材料（如作品详情展示）时：允许未登录访问，并且不按 userId 过滤
    // 仅用于“展示材料信息”；材料详情页仍会按 userId 过滤/鉴权。
    const isIdsQuery = ids && Array.isArray(ids) && ids.length > 0

    const userId = getAuthedUserId(ctx)
    if (!isIdsQuery && !userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录' }
        return
    }

    let whereCondition = isIdsQuery
      ? { isDeleted: 0 }
      : { userId, isDeleted: 0 };
    
    // 如果提供了 ids 数组，添加到查询条件中
    if (isIdsQuery) {
        whereCondition.id = {
            [Op.in]: ids
        };
    }
    
    // 默认隐藏“明确缺货”的材料（stock 为 '0' 或 '无'），但保留空值/未知库存
    // 除非 showAll 为 true 或者指定了 ids
    if (!showAll && !(ids && ids.length > 0)) {
        whereCondition.stock = {
            [Op.or]: [
                { [Op.is]: null },
                { [Op.eq]: '' },
                {
                    [Op.and]: [
                        { [Op.ne]: '0' },
                        { [Op.ne]: '无' }
                    ]
                }
            ]
        };
    }
    
    // 构建排序条件
    let orderCondition = [['name', 'ASC']]; // 默认按名称倒序
    
    if (sortBy) {
        const validSortFields = ['name', 'type', 'substance', 'size', 'price', 'stock', 'shop', 'updatedAt', 'createdAt'];
        const validSortOrders = ['ASC', 'DESC'];
        
        if (validSortFields.includes(sortBy)) {
            const order = validSortOrders.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';
            orderCondition = [[sortBy, order]];
        }
    }
    
    let materials = await Material.findAll({
        where: whereCondition,
        order: orderCondition
    });
    
    ctx.body = {
        materials: materials,
    }
}

//POST /api/updateMaterial
async function updateMaterial(ctx, next) {
    const userId = getAuthedUserId(ctx)
    if (!userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录' }
        return
    }
    const id = ctx.request.body.id;
    const cleanedUrl = ctx.request.body.pic ? cleanOssUrl(ctx.request.body.pic) : '';
    const updateData = {
        name: ctx.request.body.name,
        type: parseInt(ctx.request.body.type),
        substance: ctx.request.body.substance,
        size: ctx.request.body.size,
        shape: ctx.request.body.shape,
        color: ctx.request.body.color,
        price: ctx.request.body.price,
        stock: ctx.request.body.stock,
        shop: ctx.request.body.shop,
        note: ctx.request.body.note,
        link: ctx.request.body.link,
        pic: cleanedUrl
    };

    try {
        //查找并更新material
        const material = await Material.findOne({
            where: {
                id: id,
                userId
            }
        });
        if (!material) {
            ctx.body = {
                success: false,
                message: '未找到该材料'
            }
            return;
        }

        await Material.update(updateData, {
            where: {
                id: id,
                userId
            }
        });
        ctx.body = {
            success: true
        }
    } catch (error) {
        ctx.body = {
            success: false,
            message: '更新失败: ' + error.message
        }
    }
}

//POST /api/addMaterial
async function addMaterial(ctx, next) {
    const userId = getAuthedUserId(ctx)
    if (!userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录' }
        return
    }
    const newData = {
        userId,
        name: ctx.request.body.name,
        type: parseInt(ctx.request.body.type),
        substance: ctx.request.body.substance,
        size: ctx.request.body.size,
        shape: ctx.request.body.shape,
        color: ctx.request.body.color,
        price: ctx.request.body.price,
        stock: ctx.request.body.stock,
        shop: ctx.request.body.shop,
        note: ctx.request.body.note,
        link: ctx.request.body.link,
    };

    try {
        //查找并更新material
        const material = await Material.create(newData);
        ctx.body = {
            success: true,
            data: material
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '添加失败: ' + error.message
        }
    }
}

//POST /api/deleteMaterial
async function deleteMaterial(ctx, next) {
    const userId = getAuthedUserId(ctx)
    if (!userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录' }
        return
    }
    const id = ctx.request.body.id;
    const updateData = {
        isDeleted: 1
    };

    try {
        //查找并更新material
        const material = await Material.findOne({
            where: {
                id: id,
                userId
            }
        });
        if (!material) {
            ctx.body = {
                success: false,
                message: '未找到该材料'
            }
            return;
        }

        await Material.update(updateData, {
            where: {
                id: id,
                userId
            }
        });
        ctx.body = {
            success: true
        }
    } catch (error) {
        ctx.body = {
            success: false,
            message: '删除失败: ' + error.message
        }
    }
}

// GET /api/material/countByType?type= — 当前用户下某材料类型的未删除材料数量
async function countMaterialsByType(ctx) {
    const userId = getAuthedUserId(ctx)
    if (!userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录', count: 0 }
        return
    }
    const typeId = parseInt(ctx.query.type, 10)
    if (!Number.isFinite(typeId) || typeId <= 0) {
        ctx.status = 400
        ctx.body = { success: false, message: '无效的 type 参数', count: 0 }
        return
    }
    const count = await Material.count({
        where: {
            userId,
            isDeleted: 0,
            type: typeId
        }
    })
    ctx.body = { success: true, count }
}

//POST /api/deleteMaterialType
async function deleteType(ctx, next) {
    const userId = getAuthedUserId(ctx)
    if (!userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录' }
        return
    }
    const id = ctx.request.body.id;
    const updateData = {
        isDeleted: 1
    };

    try {
        //查找并更新material
        const materialType = await MaterialType.findOne({
            where: {
                id: id,
                userId,
                isDeleted: 0
            }
        });
        if (!materialType) {
            ctx.body = {
                success: false,
                message: '未找到该材料'
            }
            return;
        }

        await MaterialType.update(updateData, {
            where: {
                id: id,
                userId
            }
        });
        ctx.body = {
            success: true
        }
    } catch (error) {
        ctx.body = {
            success: false,
            message: '删除失败: ' + error.message
        }
    }
}

export default {
    'GET /api/getMaterialType': getType,
    'GET /api/material/countByType': countMaterialsByType,
    'POST /api/updateMaterialType': updateMaterialType,
    'POST /api/addMaterialType': addtype,
    'POST /api/deleteMaterialType': deleteType,
    'POST /api/material': material,
    'POST /api/updateMaterial': updateMaterial,
    'POST /api/addMaterial': addMaterial,
    'POST /api/deleteMaterial': deleteMaterial,
}