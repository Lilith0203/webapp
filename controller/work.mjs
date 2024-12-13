import { MaterialType } from '../orm.mjs'
import { Material } from '../orm.mjs'

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
    });
    let typetree = arrayToTree(types, 0)

    ctx.body = {
        typetree: typetree
    }
}

//POST /diy/addtype
async function addtype(ctx, next) {
    if (ctx.session.logged) {
        let typeName = ctx.request.body.typeName;
        let parentId = ctx.request.body.parentId || 0;
        const type = await MaterialType.create({
           typeName: typeName,
           parentId: parentId
        });
        ctx.response.redirect('/admin');
    } else {
        ctx.response.redirect('/login');
    }
}

//POST /api/material
async function material(ctx, next) {
    let materials = await Material.findAll({
        where: {
            isDeleted: 0
        }
    });
    ctx.body = {
        materials: materials,
    }
}

//POST /api/updateMaterial
async function updateMaterial(ctx, next) {
    const id = ctx.request.body.id;
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
        pic: ctx.request.body.pic
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
    const id = ctx.request.body.id;
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
        pic: ctx.request.body.pic
    };

    try {
        //查找并更新material
        const material = await Material.create(newData);
        ctx.body = {
            success: true
        }
    } catch (error) {
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

export default {
    'GET /api/getMaterialType': getType,
    'POST /diy/addtype': addtype,
    'POST /api/material': material,
    'POST /api/updateMaterial': updateMaterial,
    'POST /api/addMaterial': addMaterial,
    'POST /api/deleteMaterial': deleteMaterial,
}