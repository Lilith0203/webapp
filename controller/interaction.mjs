import { Interaction } from '../orm.mjs';
import { Op } from 'sequelize';

// POST /api/interaction/like - 点赞功能
async function likeItem(ctx, next) {
    const { type, itemId } = ctx.request.body;

    // 验证输入
    if (!type || !itemId) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '类型和项目ID不能为空'
        };
        return;
    }

    try {
        // 查找是否已存在该项目的交互记录
        let interaction = await Interaction.findOne({
            where: {
                type,
                itemId,
                isDeleted: 0
            }
        });

        if (interaction) {
            // 如果已存在，则增加点赞数
            await Interaction.update(
                {
                    like: interaction.like + 1,
                    updatedAt: new Date()
                },
                {
                    where: {
                        id: interaction.id
                    }
                }
            );
        } else {
            // 如果不存在，则创建新记录
            await Interaction.create({
                type,
                itemId,
                like: 1,
                weight: 0,
                isDeleted: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        // 获取更新后的交互数据
        interaction = await Interaction.findOne({
            where: {
                type,
                itemId,
                isDeleted: 0
            }
        });

        ctx.body = {
            success: true,
            message: '点赞成功',
            data: {
                like: interaction.like,
                weight: interaction.weight
            }
        };
    } catch (error) {
        console.error('点赞失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '点赞失败'
        };
    }
}

// POST /api/interaction/recommend - 推荐功能（设置权重）
async function recommendItem(ctx, next) {
    const { type, itemId, weight } = ctx.request.body;

    // 验证输入
    if (!type || !itemId || weight === undefined) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '类型、项目ID和权重不能为空'
        };
        return;
    }

    try {
        // 查找是否已存在该项目的交互记录
        let interaction = await Interaction.findOne({
            where: {
                type,
                itemId,
                isDeleted: 0
            }
        });

        if (interaction) {
            // 如果已存在，则更新权重
            await Interaction.update(
                {
                    weight,
                    updatedAt: new Date()
                },
                {
                    where: {
                        id: interaction.id
                    }
                }
            );
        } else {
            // 如果不存在，则创建新记录
            await Interaction.create({
                type,
                itemId,
                like: 0,
                weight,
                isDeleted: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        // 获取更新后的交互数据
        interaction = await Interaction.findOne({
            where: {
                type,
                itemId,
                isDeleted: 0
            }
        });

        ctx.body = {
            success: true,
            message: '推荐设置成功',
            data: {
                like: interaction.like,
                weight: interaction.weight
            }
        };
    } catch (error) {
        console.error('推荐设置失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '推荐设置失败'
        };
    }
}

// GET /api/interaction/:type/:itemId - 获取交互数据
async function getInteraction(ctx, next) {
    const { type, itemId } = ctx.params;

    // 验证输入
    if (!type || !itemId) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '类型和项目ID不能为空'
        };
        return;
    }

    try {
        // 查找交互记录
        const interaction = await Interaction.findOne({
            where: {
                type,
                itemId,
                isDeleted: 0
            }
        });

        if (interaction) {
            ctx.body = {
                success: true,
                data: {
                    like: interaction.like,
                    weight: interaction.weight
                }
            };
        } else {
            ctx.body = {
                success: true,
                data: {
                    like: 0,
                    weight: 0
                }
            };
        }
    } catch (error) {
        console.error('获取交互数据失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取交互数据失败'
        };
    }
}

// 导出接口
export default {
    'POST /api/interaction/like': likeItem,
    'POST /api/interaction/recommend': recommendItem,
    'GET /api/interaction/:type/:itemId': getInteraction
}; 