import * as utils from 'utility';
import { Plan } from '../orm.mjs';
import { Op } from 'sequelize';

// GET /api/plan
async function plan(ctx, next) {
    let page = parseInt(ctx.query.page) || 1;
    let size = parseInt(ctx.query.size) || 10;
    let search = ctx.query.search ? ctx.query.search : '';
    
    let {count, rows} = await Plan.findAndCountAll({
        where: {
            isDeleted: 0,
            ...(search ? {
                [Op.or]: [
                    { title: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ]
            } : {})
        },
        offset: (page - 1) * size,
        limit: size,
        order: [
            ['sort', 'ASC'],
            ['startDate', 'ASC'],
            ['createdAt', 'DESC']
        ]
    });

    // 处理每一行的数据
    rows = rows.map(item => {
        const row = item.get({ plain: true });
        // 格式化日期
        row.startDate = row.startDate ? utils.YYYYMMDD(row.startDate) : null;
        row.endDate = row.endDate ? utils.YYYYMMDD(row.endDate) : null;
        row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt);
        row.updatedAt = utils.YYYYMMDDHHmmss(row.updatedAt);
        return row;
    });

    ctx.body = {
        count: count,
        items: rows,
        page_all: Math.ceil(count / size),
        page_now: page,
    }
}

// GET /api/plan/:id
async function plan_detail(ctx, next) {
    let id = parseInt(ctx.params.id);
    let plan = await Plan.findOne({
        where: {
            id: id,
            isDeleted: 0
        }
    });
    
    if (plan) {
        const planData = plan.get({ plain: true });
        // 格式化日期
        planData.startDate = planData.startDate ? utils.YYYYMMDD(planData.startDate) : null;
        planData.endDate = planData.endDate ? utils.YYYYMMDD(planData.endDate) : null;
        planData.updatedAt = utils.YYYYMMDDHHmmss(planData.updatedAt);
        
        ctx.body = {
            success: true,
            data: planData
        }
    } else {
        ctx.status = 404;
        ctx.body = {
            success: false,
            message: '计划不存在'
        }
    }
}

// POST /api/plan/edit
async function plan_update(ctx, next) {
    const id = parseInt(ctx.request.body.id);
    const updateData = ctx.request.body;
    
    try {
        // 查找计划
        const plan = await Plan.findOne({
            where: {
                id: id,
                isDeleted: 0
            }
        });
        
        if (!plan) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '计划不存在'
            };
            return;
        }

        // 更新计划
        await Plan.update({
            title: updateData.title,
            description: updateData.description,
            status: updateData.status,
            startDate: updateData.startDate,
            endDate: updateData.endDate,
            link: updateData.link,
            sort: updateData.sort || 0,
            updatedAt: new Date()
        }, {
            where: { id: id }
        });

        ctx.body = {
            success: true,
            message: '计划更新成功'
        };
    } catch (error) {
        console.error('Update plan error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '计划更新失败'
        };
    }
}

// POST /api/plan/delete
async function plan_delete(ctx, next) {
    const id = parseInt(ctx.request.body.id);
    
    try {
        // 查找计划
        const plan = await Plan.findOne({
            where: {
                id: id,
                isDeleted: 0
            }
        });
        
        if (!plan) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '计划不存在'
            };
            return;
        }

        // 软删除计划
        await Plan.update({
            isDeleted: 1
        }, {
            where: { id: id }
        });

        ctx.body = {
            success: true,
            message: '计划删除成功'
        };
    } catch (error) {
        console.error('Delete plan error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '计划删除失败'
        };
    }
}

// POST /api/planAdd
async function plan_add(ctx, next) {
    const planData = ctx.request.body;
    
    try {
        // 创建新计划
        const plan = await Plan.create({
            title: planData.title,
            description: planData.description,
            status: planData.status,
            startDate: planData.startDate,
            endDate: planData.endDate,
            link: planData.link,
            sort: planData.sort || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        ctx.body = {
            success: true,
            message: '计划创建成功',
            data: {
                id: plan.id
            }
        };
    } catch (error) {
        console.error('Add plan error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '计划创建失败'
        };
    }
}

export default {
    'GET /api/plans': plan,
    'GET /api/plan/:id': plan_detail,
    'POST /api/plan/edit': plan_update,
    'POST /api/planAdd': plan_add,
    'POST /api/plan/delete': plan_delete
} 