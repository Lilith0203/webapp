import { MaterialType, Material, sequelize } from '../orm.mjs'
import { cleanOssUrl } from '../oss.mjs';
import { Op, Sequelize } from 'sequelize';

const MATERIAL_LIST_ATTRIBUTES = [
    'id', 'userId', 'name', 'type', 'substance', 'size', 'shape', 'color',
    'price', 'stock', 'shop', 'note', 'link', 'pic', 'createdAt', 'updatedAt'
];

function buildMaterialUpdateData(body) {
    const cleanedUrl = body.pic ? cleanOssUrl(body.pic) : '';
    return {
        name: body.name,
        type: parseInt(body.type),
        substance: body.substance,
        size: body.size,
        shape: body.shape,
        color: body.color,
        price: body.price,
        stock: body.stock,
        shop: body.shop,
        note: body.note,
        link: body.link,
        pic: cleanedUrl
    };
}

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

function buildSearchFilterParts(filters) {
    if (!filters || typeof filters !== 'object') return [];

    const parts = [];

    if (Array.isArray(filters.ids) && filters.ids.length > 0) {
        const ids = filters.ids
            .map((id) => parseInt(id, 10))
            .filter((id) => Number.isFinite(id) && id > 0);
        if (ids.length) {
            parts.push({ id: { [Op.in]: ids } });
        }
    }

    const addLike = (field, value) => {
        const text = String(value ?? '').trim();
        if (!text) return;
        parts.push(Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col(field)),
            { [Op.like]: `%${text.toLowerCase()}%` }
        ));
    };

    addLike('name', filters.name);
    addLike('substance', filters.substance);
    addLike('shape', filters.shape);
    addLike('color', filters.color);
    addLike('shop', filters.shop);
    addLike('size', filters.size);

    if (Array.isArray(filters.type) && filters.type.length > 0) {
        const typeIds = filters.type
            .map((id) => parseInt(id, 10))
            .filter((id) => Number.isFinite(id) && id > 0);
        if (typeIds.length) {
            parts.push({ type: { [Op.in]: typeIds } });
        }
    }

    return parts;
}

function buildOrderCondition(sortBy, sortOrder, idOrderList) {
    const validSortFields = ['name', 'type', 'substance', 'size', 'price', 'stock', 'shop', 'updatedAt', 'createdAt'];
    const validSortOrders = ['ASC', 'DESC'];
    const order = validSortOrders.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

    if (Array.isArray(idOrderList) && idOrderList.length > 1) {
        return [[Sequelize.literal(`FIELD(id, ${idOrderList.join(',')})`), 'ASC']];
    }

    if (sortBy === 'stock') {
        return [
            [Sequelize.literal(
                "CASE WHEN stock IS NULL OR TRIM(stock) = '' THEN 2 WHEN stock IN ('0','无') THEN 0 ELSE 1 END"
            ), order],
            ['stock', order]
        ];
    }

    if (sortBy && validSortFields.includes(sortBy)) {
        return [[sortBy, order]];
    }

    return [['name', 'ASC']];
}

//POST /api/material
async function material(ctx, next) {
    // 获取请求体中的参数
    const {
        ids,
        showAll,
        sortBy,
        sortOrder,
        page,
        pageSize,
        fetchAll,
        filters
    } = ctx.request.body;
    
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
    const andParts = [];
    if (!showAll && !isIdsQuery) {
        andParts.push(Sequelize.literal(
            "(stock IS NULL OR stock = '' OR (stock <> '0' AND stock <> '无'))"
        ));
    }
    if (!isIdsQuery) {
        andParts.push(...buildSearchFilterParts(filters));
    }
    if (andParts.length) {
        whereCondition[Op.and] = andParts;
    }

    const filterIds = !isIdsQuery && Array.isArray(filters?.ids)
        ? filters.ids.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id) && id > 0)
        : [];
    const orderCondition = buildOrderCondition(sortBy, sortOrder, filterIds);

    const parsedPage = parseInt(page, 10);
    const parsedPageSize = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 200);
    const isPagedList = !isIdsQuery && Number.isFinite(parsedPage) && parsedPage > 0;
    const isFetchAll = !isIdsQuery && fetchAll === true;

    if (isFetchAll || isPagedList) {
        const queryOptions = {
            where: whereCondition,
            order: orderCondition,
            attributes: MATERIAL_LIST_ATTRIBUTES,
            raw: true
        };

        if (isFetchAll) {
            const materials = await Material.findAll(queryOptions);
            ctx.body = {
                materials,
                total: materials.length
            };
            return;
        }

        const { count, rows } = await Material.findAndCountAll({
            ...queryOptions,
            limit: parsedPageSize,
            offset: (parsedPage - 1) * parsedPageSize
        });

        ctx.body = {
            materials: rows,
            total: count,
            page: parsedPage,
            pageSize: parsedPageSize
        };
        return;
    }

    const materials = await Material.findAll({
        where: whereCondition,
        order: orderCondition,
        attributes: MATERIAL_LIST_ATTRIBUTES,
        raw: true
    });

    ctx.body = {
        materials
    };
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
    const updateData = buildMaterialUpdateData(ctx.request.body);

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

// POST /api/batchUpdateMaterial — 批量更新材料（单次请求）
async function batchUpdateMaterial(ctx) {
    const userId = getAuthedUserId(ctx)
    if (!userId) {
        ctx.status = 401
        ctx.body = { success: false, message: '未授权，请登录' }
        return
    }

    const { materials } = ctx.request.body || {}
    if (!Array.isArray(materials) || materials.length === 0) {
        ctx.status = 400
        ctx.body = { success: false, message: 'materials 不能为空' }
        return
    }

    const failed = []
    let updated = 0
    const transaction = await sequelize.transaction()

    try {
        for (let i = 0; i < materials.length; i++) {
            const item = materials[i]
            const id = parseInt(item?.id, 10)
            if (!Number.isFinite(id)) {
                failed.push({ index: i, id: item?.id, message: '无效的材料 ID' })
                continue
            }

            const material = await Material.findOne({
                where: { id, userId },
                transaction
            })
            if (!material) {
                failed.push({ index: i, id, message: '未找到该材料' })
                continue
            }

            await Material.update(buildMaterialUpdateData(item), {
                where: { id, userId },
                transaction
            })
            updated++
        }

        await transaction.commit()
        ctx.body = {
            success: failed.length === 0,
            updated,
            failed,
            message: failed.length
                ? `已更新 ${updated} 条，${failed.length} 条失败`
                : `已成功更新 ${updated} 条`
        }
    } catch (error) {
        await transaction.rollback()
        ctx.status = 500
        ctx.body = {
            success: false,
            message: '批量更新失败: ' + error.message
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
    const cleanedUrl = ctx.request.body.pic ? cleanOssUrl(ctx.request.body.pic) : '';
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
        pic: cleanedUrl
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
    'POST /api/batchUpdateMaterial': batchUpdateMaterial,
    'POST /api/addMaterial': addMaterial,
    'POST /api/deleteMaterial': deleteMaterial,
}