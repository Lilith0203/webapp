import * as utils from 'utility';
import { Works } from '../orm.mjs';

//GET /api/works
async function works(ctx, next) {
    let {count, rows} = await Works.findAndCountAll({
        where: {
            isDeleted: 0
        },
        order: [['updatedAt', 'DESC']]
    });

    // 处理每一行的数据
    rows = rows.map(item => {
        const row = item.get({ plain: true });
        // 解析 tags 字符串为数组
        try {
            row.tags = JSON.parse(row.tags || '[]');
            row.pictures = JSON.parse(row.pictures || '[]');
        } catch (e) {
            row.tags = [];
            row.pictures = [];
        }
        row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt);
        row.updatedAt = utils.YYYYMMDDHHmmss(row.updatedAt);
        return row;
    });

    ctx.body = {
        works: rows
    }
}

//POST /api/works/add
async function works_add(ctx, next) {
    const workData = ctx.request.body;
    
    try {
        // 处理 tags 数组
        const tags = Array.isArray(workData.tags) 
            ? JSON.stringify(workData.tags)
            : workData.tags;
        const pictures = Array.isArray(workData.pictures) 
            ? JSON.stringify(workData.pictures)
            : workData.pictures;

        // 创建新文章
        const works = await Works.create({
            name: workData.name,
            description: workData.description,
            pictures: pictures,
            tags: tags,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        ctx.body = {
            success: true,
            message: '作品发布成功',
            data: {
                id: works.id
            }
        };
    } catch (error) {
        console.error('Add works error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '作品发布失败'
        };
    }
}

//POST /api/works/edit
async function works_edit(ctx, next) {
    const updateData = ctx.request.body;
    const id = parseInt(updateData.id);
    
    try {
        // 查找文章
        const works = await Works.findByPk(id);
        if (!works) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '作品不存在'
            };
            return;
        }

        // 处理 tags 数组
        const tags = Array.isArray(updateData.tags) 
            ? JSON.stringify(updateData.tags)  // 如果是数组，转换为 JSON 字符串
            : updateData.tags; 
        const pictures = Array.isArray(updateData.pictures) 
            ? JSON.stringify(updateData.pictures)
            : updateData.pictures;

        // 更新文章
        await Works.update({
            name: updateData.name,
            description: updateData.description,
            pictures: pictures,
            tags: tags,
            updatedAt: new Date()
        }, {
            where: { id: id }
        });

        ctx.body = {
            success: true,
            message: '作品更新成功'
        };
    } catch (error) {
        console.error('Update works error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '作品更新失败'
        };
    }
}

async function works_delete(ctx, next) {
    const id = parseInt(ctx.request.body.id);
    await Works.update({
        isDeleted: 1
    }, {
        where: { id: id }
    });
}

//GET /api/works/:id
async function works_detail(ctx, next) {
    let id = parseInt(ctx.params.id);
    let works = await Works.findOne({
        where: {
            id: id
        }
    });
    if (works) {
        const workData = works.get({ plain: true });
        // 解析 tags 字符串为数组
        try {
            workData.tags = JSON.parse(workData.tags || '[]');
            workData.pictures = JSON.parse(workData.pictures || '[]');
        } catch (e) {
            workData.tags = [];
            workData.pictures = [];
        }
        workData.updatedAt = utils.YYYYMMDDHHmmss(workData.updatedAt);
        
        ctx.body = {
            works: workData
        }
    } else {
        ctx.status = 404;
        ctx.body = {
            message: '作品不存在'
        }
    }
}

export default {
    'GET /api/works': works,
    'GET /api/works/:id': works_detail,
    'POST /api/works/edit': works_edit,
    'POST /api/works/add': works_add,
    'POST /api/works/delete': works_delete
}