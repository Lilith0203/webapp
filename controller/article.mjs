import * as utils from 'utility';
import { Articles } from '../orm.mjs';
import { Op } from 'sequelize';

//GET /api/article
async function article(ctx, next) {
    let page = parseInt(ctx.query.page) || 1;
    let size = parseInt(ctx.query.size) || 10;
    let tag = ctx.query.tag || '';
    let {count, rows} = await Articles.findAndCountAll({
        where: {
            isDeleted: 0,
            ...(tag ? {
                tags: {
                    [Op.substring]: tag
                }
            } : {})
        },
        attributes: ['id', 'title', 'abbr', 'tags', 'classify', 'createdAt', 'updatedAt'],
        offset: (page - 1) * size,
        limit: size,
        order: [['updatedAt', 'DESC']]
    });

    // 处理每一行的数据
    rows = rows.map(item => {
        const row = item.get({ plain: true });
        // 解析 tags 字符串为数组
        try {
            row.tags = JSON.parse(row.tags || '[]');
        } catch (e) {
            row.tags = [];
        }
        row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt);
        row.updatedAt = utils.YYYYMMDDHHmmss(row.updatedAt);
        return row;
    });

    ctx.body = {
        count: count,
        articles: rows,
        page_all: Math.ceil(count / size),
        page_now: page,
    }
}

//GET /article/id
async function article_detail(ctx, next) {
    let id = parseInt(ctx.params.id);
    let article = await Articles.findOne({
        where: {
            id: id
        }
    });
    if (article) {
        const articleData = article.get({ plain: true });
        // 解析 tags 字符串为数组
        try {
            articleData.tags = JSON.parse(articleData.tags || '[]');
        } catch (e) {
            articleData.tags = [];
        }
        articleData.updatedAt = utils.YYYYMMDDHHmmss(articleData.updatedAt);
        
        ctx.body = {
            article: articleData
        }
    } else {
        ctx.status = 404;
        ctx.body = {
            message: '文章不存在'
        }
    }
}

//POST /api/article/edit
async function article_update(ctx, next) {
    const id = parseInt(ctx.request.body.id);
    const updateData = ctx.request.body;
    
    try {
        // 查找文章
        const article = await Articles.findByPk(id);
        if (!article) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '文章不存在'
            };
            return;
        }

        // 处理 tags 数组
        const tags = Array.isArray(updateData.tags) 
            ? JSON.stringify(updateData.tags)  // 如果是数组，转换为 JSON 字符串
            : updateData.tags; 

        // 更新文章
        await Articles.update({
            title: updateData.title,
            content: updateData.content,
            abbr: updateData.abbr,
            tags: tags,
            classify: updateData.classify,
            updatedAt: new Date()
        }, {
            where: { id: id }
        });

        ctx.body = {
            success: true,
            message: '文章更新成功'
        };
    } catch (error) {
        console.error('Update article error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '文章更新失败'
        };
    }
}

async function article_delete(ctx, next) {
    const id = parseInt(ctx.request.body.id);
    const updateData = {
        isDeleted: 1
    };
    
    try {
        // 查找文章
        const article = await Articles.findByPk(id);
        if (!article) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '文章不存在'
            };
            return;
        }

        // 更新文章
        await Articles.update(updateData, {
            where: { id: id }
        });

        ctx.body = {
            success: true,
            message: '文章删除成功'
        };
    } catch (error) {
        console.error('Update article error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '文章删除失败'
        };
    }
}

//POST /api/articleAdd
async function article_add(ctx, next) {
    const articleData = ctx.request.body;
    
    try {
        // 处理 tags 数组
        const tags = Array.isArray(articleData.tags) 
            ? JSON.stringify(articleData.tags)
            : articleData.tags;

        // 创建新文章
        const article = await Articles.create({
            title: articleData.title,
            content: articleData.content,
            abbr: articleData.abbr,
            tags: tags,
            classify: articleData.classify,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        ctx.body = {
            success: true,
            message: '文章发布成功',
            data: {
                id: article.id
            }
        };
    } catch (error) {
        console.error('Add article error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '文章发布失败'
        };
    }
}

export default {
    'GET /api/article': article,
    'GET /api/article/:id': article_detail,
    'POST /api/article/edit': article_update,
    'POST /api/articleAdd': article_add,
    'POST /api/article/delete': article_delete
}