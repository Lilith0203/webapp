import { Interaction, Works, Articles } from '../orm.mjs';
import { Op } from 'sequelize';
import cache from '../util/cache.mjs';
import * as utils from 'utility';

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

// GET /api/recommended-items - 获取推荐项目列表
async function getRecommendedItems(ctx, next) {
    let size = ctx.query.size ? parseInt(ctx.query.size) : 12;
    let page = ctx.query.page ? parseInt(ctx.query.page) : 1;
    let type = ctx.query.type ? parseInt(ctx.query.type) : 2; // 默认为作品类型(2)
    let offset = (page - 1) * size;

    try {
        // 从交互表中获取被推荐的项目ID列表
        const recommendedItems = await Interaction.findAll({
            where: {
                type,
                weight: {
                    [Op.gt]: 0 // 权重大于0
                },
                isDeleted: 0
            },
            order: [
                ['weight', 'DESC'], // 首先按权重降序排序
                ['updatedAt', 'DESC'] // 其次按更新时间降序排序
            ],
            limit: size,
            offset: offset
        });

        // 提取项目ID列表
        const itemIds = recommendedItems.map(item => item.itemId);
        
        // 如果没有推荐项目，直接返回空数组
        if (itemIds.length === 0) {
            ctx.body = {
                success: true,
                data: {
                    items: [],
                    count: 0,
                    type
                }
            };
            return;
        }

        let items = [];
        let processedItems = [];

        // 根据类型获取不同的数据
        if (type === 2) { // 作品类型
            // 获取作品详情
            items = await Works.findAll({
                where: {
                    id: {
                        [Op.in]: itemIds
                    },
                    isDeleted: 0
                }
            });

            // 处理作品数据
            processedItems = items.map(item => {
                const itemData = item.get({ plain: true });
                
                // 解析 JSON 字符串为数组
                try {
                    itemData.tags = JSON.parse(itemData.tags || '[]');
                    itemData.pictures = JSON.parse(itemData.pictures || '[]');
                    itemData.materials = JSON.parse(itemData.materials || '[]');
                } catch (e) {
                    itemData.tags = [];
                    itemData.pictures = [];
                    itemData.materials = [];
                }
                
                // 确保 link 字段有默认值
                itemData.link = itemData.link || '';
                
                // 格式化日期
                itemData.createdAt = utils.YYYYMMDDHHmmss(itemData.createdAt);
                itemData.updatedAt = utils.YYYYMMDDHHmmss(itemData.updatedAt);
                
                // 添加权重信息和原始更新时间（用于排序）
                const interaction = recommendedItems.find(rec => rec.itemId === itemData.id);
                itemData.weight = interaction ? interaction.weight : 0;
                itemData._interactionUpdatedAt = interaction ? interaction.updatedAt : new Date(0);
                
                return itemData;
            });
        } else if (type === 1) { // 文章类型
            // 获取文章详情
            items = await Articles.findAll({
                where: {
                    id: {
                        [Op.in]: itemIds
                    },
                    isDeleted: 0
                }
            });
            
            // 处理文章数据
            processedItems = items.map(item => {
                const itemData = item.get({ plain: true });
                
                // 解析 JSON 字符串为数组（如果有）
                try {
                    if (itemData.tags) itemData.tags = JSON.parse(itemData.tags || '[]');
                    if (itemData.pictures) itemData.pictures = JSON.parse(itemData.pictures || '[]');
                } catch (e) {
                    itemData.tags = itemData.tags || [];
                    itemData.pictures = itemData.pictures || [];
                }
                
                // 格式化日期
                itemData.createdAt = utils.YYYYMMDDHHmmss(itemData.createdAt);
                itemData.updatedAt = utils.YYYYMMDDHHmmss(itemData.updatedAt);
                
                // 添加权重信息和原始更新时间（用于排序）
                const interaction = recommendedItems.find(rec => rec.itemId === itemData.id);
                itemData.weight = interaction ? interaction.weight : 0;
                itemData._interactionUpdatedAt = interaction ? interaction.updatedAt : new Date(0);
                
                return itemData;
            });
        }
        // 可以根据需要添加更多类型的处理...

        // 按照原始推荐顺序排序（先按权重，再按更新时间）
        const sortedItems = itemIds.map(id => 
            processedItems.find(item => item.id === id)
        ).filter(Boolean); // 过滤掉可能不存在的项目

        // 删除临时排序字段
        sortedItems.forEach(item => {
            delete item._interactionUpdatedAt;
        });

        // 获取总推荐项目数量
        const totalCount = await Interaction.count({
            where: {
                type,
                weight: {
                    [Op.gt]: 0
                },
                isDeleted: 0
            }
        });

        ctx.body = {
            success: true,
            data: {
                items: sortedItems,
                count: totalCount,
                type
            }
        };
    } catch (error) {
        console.error('获取推荐项目失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取推荐项目失败'
        };
    }
}

// 导出接口
export default {
    'POST /api/interaction/like': likeItem,
    'POST /api/interaction/recommend': recommendItem,
    'GET /api/interaction/:type/:itemId/:clientId?': getInteraction,
    'GET /api/recommended-items': getRecommendedItems
}; 