import { MaterialType } from '../orm.mjs'
import { Material } from '../orm.mjs'
import { cleanOssUrl } from '../oss.mjs';

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
    let types = await MaterialType.findAll({
        where: {
            isDeleted: 0
        }
    });
    let typetree = arrayToTree(types, 0)

    ctx.body = {
        typetree: typetree
    }
}

//POST /api/addMaterialType
async function addtype(ctx, next) {
    let typeName = ctx.request.body.typeName;
    let parentId = ctx.request.body.parentId || 0;
    if (parentId === 0) {
        await MaterialType.create({
            typeName: typeName,
            level: 0,
            parentId: parentId
        });
    } else {
        await MaterialType.create({
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
    const id = ctx.request.body.id;
    const updateData = {
        typeName: ctx.request.body.typeName,
    };

    try {
        //查找并更新material
        const materialType = await MaterialType.findByPk(id);
        if (!materialType) {
            ctx.body = {
                success: false,
                message: '未找到该材料类型'
            }
            return;
        }

        await MaterialType.update(updateData, {
            where: {
                id: id
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
    let materials = await Material.findAll({
        where: {
            isDeleted: 0
        },
        order: [['updatedAt', 'DESC']]
    });
    ctx.body = {
        materials: materials,
    }
}

//POST /api/updateMaterial
async function updateMaterial(ctx, next) {
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
        const material = await Material.findByPk(id);
        if (!material) {
            ctx.body = {
                success: false,
                message: '未找到该材料'
            }
            return;
        }

        await Material.update(updateData, {
            where: {
                id: id
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
    const newData = {
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
    const id = ctx.request.body.id;
    const updateData = {
        isDeleted: 1
    };

    try {
        //查找并更新material
        const material = await Material.findByPk(id);
        if (!material) {
            ctx.body = {
                success: false,
                message: '未找到该材料'
            }
            return;
        }

        await Material.update(updateData, {
            where: {
                id: id
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

//POST /api/deleteMaterialType
async function deleteType(ctx, next) {
    const id = ctx.request.body.id;
    const updateData = {
        isDeleted: 1
    };

    try {
        //查找并更新material
        const materialType = await MaterialType.findByPk(id);
        if (!materialType) {
            ctx.body = {
                success: false,
                message: '未找到该材料'
            }
            return;
        }

        await MaterialType.update(updateData, {
            where: {
                id: id
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
    'POST /api/updateMaterialType': updateMaterialType,
    'POST /api/addMaterialType': addtype,
    'POST /api/deleteMaterialType': deleteType,
    'POST /api/material': material,
    'POST /api/updateMaterial': updateMaterial,
    'POST /api/addMaterial': addMaterial,
    'POST /api/deleteMaterial': deleteMaterial,
}