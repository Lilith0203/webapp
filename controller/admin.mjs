import { MaterialType } from '../orm.mjs'

function arrayToTree(arr, root) {
    const result = []
    const map = {}
    for (const item of arr) {
        map[item.id] = item  //浅拷贝，存储对item的引用
    }
    for (const item of arr) {
        if (item.parentId === root) {
            result.push(map[item.id])
        } else {
            map[item.parentId].children ? map[item.parentId].children.push(map[item.id])
                : (map[item.parentId].children = [map[item.id]])
        }
    }
    return result
}

//GET /admin
async function admin(ctx, next) {
    if (ctx.session.logged) {
        let types = await MaterialType.findAll({
        });
        let typetree = arrayToTree(types, 0)
        ctx.render('admin.html', {
            typetree: typetree
        });
    } else {
        ctx.response.redirect('/login');
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

export default {
    'GET /admin': admin,
    'POST /diy/addtype': addtype,
}