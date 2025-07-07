import { Guide, sequelize } from '../orm.mjs';
import { Op } from 'sequelize';

// 获取攻略列表
export async function getGuides(ctx) {
    try {
        const page = parseInt(ctx.query.page) || 1;
        const size = parseInt(ctx.query.size) || 8;
        const category = ctx.query.category || '';
        const search = ctx.query.search || '';
        
        const offset = (page - 1) * size;
        
        // 构建查询条件
        const whereClause = {
            isDeleted: 0
        };
        
        if (category) {
            whereClause.category = category;
        }
        
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { content: { [Op.like]: `%${search}%` } }
            ];
        }
        
        const { count, rows } = await Guide.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC'], ['id', 'DESC']],
            limit: size,
            offset: offset
        });
        
        const pageAll = Math.ceil(count / size);
        
        ctx.body = {
            success: true,
            data: {
                guides: rows,
                count: count,
                page_now: page,
                page_all: pageAll
            }
        };
    } catch (error) {
        console.error('获取攻略列表失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取攻略列表失败'
        };
    }
}

// 获取攻略分类列表
export async function getCategories(ctx) {
    try {
        const categories = await Guide.findAll({
            attributes: [
                [sequelize.fn('DISTINCT', sequelize.col('category')), 'category']
            ],
            where: {
                isDeleted: 0
            },
            raw: true
        });
        
        const categoryList = categories.map(item => item.category).filter(Boolean);
        
        ctx.body = {
            success: true,
            data: categoryList
        };
    } catch (error) {
        console.error('获取分类列表失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取分类列表失败'
        };
    }
}

// 获取攻略详情
export async function getGuideDetail(ctx) {
    try {
        const id = ctx.params.id;
        
        const guide = await Guide.findOne({
            where: {
                id: id,
                isDeleted: 0
            }
        });
        
        if (!guide) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '攻略不存在'
            };
            return;
        }
        
        ctx.body = {
            success: true,
            data: guide
        };
    } catch (error) {
        console.error('获取攻略详情失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取攻略详情失败'
        };
    }
}

// 创建攻略
export const createGuide = async (ctx) => {
    try {
        const { title, content, category, tags } = ctx.request.body
        
        // 验证必填字段
        if (!title || !content || !category) {
            ctx.status = 400
            ctx.body = { error: '标题、内容和分类为必填项' }
            return
        }
        
        // 将tags数组转换为字符串
        const tagsString = Array.isArray(tags) ? tags.join(',') : tags || ''
        
        const guide = await Guide.create({
            title,
            content,
            category,
            tags: tagsString,
            isDeleted: 0
        })
        
        ctx.body = { 
            success: true, 
            data: guide,
            message: '攻略创建成功' 
        }
    } catch (error) {
        console.error('创建攻略失败:', error)
        ctx.status = 500
        ctx.body = { error: '创建攻略失败' }
    }
}

// 更新攻略
export const updateGuide = async (ctx) => {
    try {
        const { id } = ctx.params
        const { title, content, category, tags } = ctx.request.body
        
        const guide = await Guide.findOne({ where: { id, isDeleted: 0 } })
        if (!guide) {
            ctx.status = 404
            ctx.body = { error: '攻略不存在' }
            return
        }
        
        // 将tags数组转换为字符串
        const tagsString = Array.isArray(tags) ? tags.join(',') : tags || ''
        
        await guide.update({
            title: title || guide.title,
            content: content || guide.content,
            category: category || guide.category,
            tags: tagsString
        })
        
        ctx.body = { 
            success: true, 
            data: guide,
            message: '攻略更新成功' 
        }
    } catch (error) {
        console.error('更新攻略失败:', error)
        ctx.status = 500
        ctx.body = { error: '更新攻略失败' }
    }
}

// 删除攻略
export async function deleteGuide(ctx) {
    try {
        const { id } = ctx.request.body;
        
        const guide = await Guide.findOne({
            where: {
                id: id,
                isDeleted: 0
            }
        });
        
        if (!guide) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '攻略不存在'
            };
            return;
        }
        
        await guide.update({
            isDeleted: 1
        });
        
        ctx.body = {
            success: true,
            message: '攻略删除成功'
        };
    } catch (error) {
        console.error('删除攻略失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除攻略失败'
        };
    }
}

export default {
    'GET /api/guide': getGuides,
    'GET /api/guide/categories': getCategories,
    'GET /api/guide/:id': getGuideDetail,
    'POST /api/guide': createGuide,
    'PUT /api/guide/:id': updateGuide,
    'POST /api/guide/delete': deleteGuide
}; 