import { Interaction } from '../orm.mjs';
import { Op } from 'sequelize';
import cache from '../util/cache.mjs';

// POST /api/interaction/like - 点赞/取消点赞功能
async function likeItem(ctx, next) {
    const { type, itemId, clientId } = ctx.request.body;

    // 验证输入
    if (!type || !itemId || !clientId) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '类型、项目ID和客户端ID不能为空'
        };
        return;
    }

    try {
        // 使用现有的缓存系统检查用户是否已点赞
        const likeKey = `like:${clientId}:${type}:${itemId}`;
        const hasLiked = await cache.get(likeKey);

        // 查找是否已存在该项目的交互记录
        let interaction = await Interaction.findOne({
            where: {
                type,
                itemId,
                isDeleted: 0
            }
        });

        if (!interaction) {
            // 如果不存在交互记录，创建新记录
            interaction = await Interaction.create({
                type,
                itemId,
                like: 0,
                weight: 0,
                isDeleted: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

        if (hasLiked) {
            // 如果已点赞，则取消点赞
            await Interaction.update(
                {
                    like: Math.max(0, interaction.like - 1), // 确保点赞数不小于0
                    updatedAt: new Date()
                },
                {
                    where: {
                        id: interaction.id
                    }
                }
            );

            // 从缓存中删除点赞记录
            await cache.del(likeKey);

            // 获取更新后的交互数据
            interaction = await Interaction.findOne({
                where: {
                    id: interaction.id
                }
            });

            ctx.body = {
                success: true,
                message: '取消点赞成功',
                data: {
                    like: interaction.like,
                    weight: interaction.weight,
                    hasLiked: false
                }
            };
        } else {
            // 如果未点赞，则添加点赞
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

            // 在缓存中记录用户已点赞，设置30天过期
            await cache.set(likeKey, '1', 30 * 24 * 60 * 60);

            // 获取更新后的交互数据
            interaction = await Interaction.findOne({
                where: {
                    id: interaction.id
                }
            });

            ctx.body = {
                success: true,
                message: '点赞成功',
                data: {
                    like: interaction.like,
                    weight: interaction.weight,
                    hasLiked: true
                }
            };
        }
    } catch (error) {
        console.error('点赞/取消点赞失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '操作失败'
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

// GET /api/interaction/:type/:itemId/:clientId - 获取交互数据
async function getInteraction(ctx, next) {
    const { type, itemId, clientId } = ctx.params;

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

        // 检查用户是否已点赞
        let hasLiked = false;
        if (clientId) {
            // 先从缓存中检查
            const likeKey = `like:${clientId}:${type}:${itemId}`;
            hasLiked = !!(await cache.get(likeKey));
        }

        if (interaction) {
            ctx.body = {
                success: true,
                data: {
                    like: interaction.like,
                    weight: interaction.weight,
                    hasLiked
                }
            };
        } else {
            ctx.body = {
                success: true,
                data: {
                    like: 0,
                    weight: 0,
                    hasLiked
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
    'GET /api/interaction/:type/:itemId/:clientId?': getInteraction
}; 