import { Story, StorySet, StorySetRel } from '../orm.mjs';
import { Op, Sequelize } from 'sequelize';
import * as utils from 'utility';

// ==================== 剧情合集接口 ====================

// 获取所有剧情合集（树形结构）
async function getAllStorySets(ctx, next) {
    try {
        // 获取所有合集
        const storySets = await StorySet.findAll({
            where: {
                isDeleted: 0
            },
            order: [
                ['sort', 'ASC'],
                ['createdAt', 'DESC']
            ]
        });

        // 处理数据
        const processedSets = storySets.map(set => {
            const setData = set.get({ plain: true });
            
            // 格式化日期
            setData.createdAt = utils.YYYYMMDDHHmmss(setData.createdAt);
            setData.updatedAt = utils.YYYYMMDDHHmmss(setData.updatedAt);
            
            // 初始化子合集数组
            setData.children = [];
            
            return setData;
        });

        // 构建树形结构
        const rootSets = [];
        const setMap = {};
        
        // 创建映射
        processedSets.forEach(set => {
            setMap[set.id] = set;
        });
        
        // 构建树
        processedSets.forEach(set => {
            if (set.parentId && setMap[set.parentId]) {
                // 如果有父合集，添加到父合集的children中
                setMap[set.parentId].children.push(set);
            } else {
                // 没有父合集或父合集不存在，作为根节点
                rootSets.push(set);
            }
        });

        ctx.body = {
            success: true,
            data: rootSets
        };
    } catch (error) {
        console.error('获取剧情合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取剧情合集失败'
        };
    }
}

// 获取单个剧情合集详情
async function getStorySetDetail(ctx, next) {
    const { id } = ctx.params;
    
    try {
        const storySet = await StorySet.findOne({
            where: {
                id,
                isDeleted: 0
            }
        });
        
        if (!storySet) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情合集不存在'
            };
            return;
        }
        
        // 获取合集中的所有剧情
        const relations = await StorySetRel.findAll({
            where: {
                setId: id,
                isDeleted: 0
            },
            order: [
                ['sort', 'ASC']
            ]
        });
        
        const storyIds = relations.map(rel => rel.storyId);
        
        let stories = [];
        if (storyIds.length > 0) {
            stories = await Story.findAll({
                where: {
                    id: {
                        [Op.in]: storyIds
                    },
                    isDeleted: 0
                }
            });
            
            // 处理剧情数据
            stories = stories.map(story => {
                const storyData = story.get({ plain: true });
                
                // 格式化日期
                storyData.createdAt = utils.YYYYMMDDHHmmss(storyData.createdAt);
                storyData.updatedAt = utils.YYYYMMDDHHmmss(storyData.updatedAt);
                
                // 添加排序信息
                const relation = relations.find(rel => rel.storyId === storyData.id);
                storyData.sort = relation ? relation.sort : 0;
                
                return storyData;
            });
            
            // 按照关联表中的排序顺序排序
            stories.sort((a, b) => a.sort - b.sort);
        }
        
        const setData = storySet.get({ plain: true });
        
        // 格式化日期
        setData.createdAt = utils.YYYYMMDDHHmmss(setData.createdAt);
        setData.updatedAt = utils.YYYYMMDDHHmmss(setData.updatedAt);
        
        // 添加剧情列表
        setData.stories = stories;
        
        // 获取子合集
        const childSets = await StorySet.findAll({
            where: {
                parentId: id,
                isDeleted: 0
            },
            order: [
                ['sort', 'ASC'],
                ['createdAt', 'DESC']
            ]
        });
        
        // 处理子合集数据
        setData.children = childSets.map(childSet => {
            const childData = childSet.get({ plain: true });
            
            // 格式化日期
            childData.createdAt = utils.YYYYMMDDHHmmss(childData.createdAt);
            childData.updatedAt = utils.YYYYMMDDHHmmss(childData.updatedAt);
            
            return childData;
        });
        
        ctx.body = {
            success: true,
            data: setData
        };
    } catch (error) {
        console.error('获取剧情合集详情失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取剧情合集详情失败'
        };
    }
}

// 创建剧情合集
async function createStorySet(ctx, next) {
    const { title, description, sort = 0, parentId = null } = ctx.request.body;
    
    if (!title) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '标题不能为空'
        };
        return;
    }
    
    try {
        // 如果指定了父合集，检查父合集是否存在
        if (parentId) {
            const parentSet = await StorySet.findOne({
                where: {
                    id: parentId,
                    isDeleted: 0
                }
            });
            
            if (!parentSet) {
                ctx.status = 404;
                ctx.body = {
                    success: false,
                    message: '父合集不存在'
                };
                return;
            }
        }
        
        const storySet = await StorySet.create({
            title,
            description: description || '',
            sort,
            parentId,
            isDeleted: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        ctx.body = {
            success: true,
            message: '创建剧情合集成功',
            data: {
                id: storySet.id
            }
        };
    } catch (error) {
        console.error('创建剧情合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '创建剧情合集失败'
        };
    }
}

// 更新剧情合集
async function updateStorySet(ctx, next) {
    const { id } = ctx.params;
    const { title, description, sort, parentId } = ctx.request.body;
    
    try {
        const storySet = await StorySet.findOne({
            where: {
                id,
                isDeleted: 0
            }
        });
        
        if (!storySet) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情合集不存在'
            };
            return;
        }
        
        // 检查是否形成循环引用
        if (parentId) {
            // 不能将自己设为自己的父合集
            if (parseInt(id) === parseInt(parentId)) {
                ctx.status = 400;
                ctx.body = {
                    success: false,
                    message: '不能将合集设为自己的父合集'
                };
                return;
            }
            
            // 检查父合集是否存在
            const parentSet = await StorySet.findOne({
                where: {
                    id: parentId,
                    isDeleted: 0
                }
            });
            
            if (!parentSet) {
                ctx.status = 404;
                ctx.body = {
                    success: false,
                    message: '父合集不存在'
                };
                return;
            }
            
            // 检查是否形成循环引用（防止A->B->C->A这样的循环）
            let currentParentId = parentId;
            const visitedIds = new Set();
            
            while (currentParentId) {
                if (visitedIds.has(currentParentId)) {
                    ctx.status = 400;
                    ctx.body = {
                        success: false,
                        message: '不能形成循环引用'
                    };
                    return;
                }
                
                visitedIds.add(currentParentId);
                
                const currentParent = await StorySet.findOne({
                    where: {
                        id: currentParentId,
                        isDeleted: 0
                    }
                });
                
                if (!currentParent) break;
                
                // 如果当前父合集的父合集是要更新的合集，则形成循环
                if (currentParent.parentId === parseInt(id)) {
                    ctx.status = 400;
                    ctx.body = {
                        success: false,
                        message: '不能形成循环引用'
                    };
                    return;
                }
                
                currentParentId = currentParent.parentId;
            }
        }
        
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (sort !== undefined) updateData.sort = sort;
        if (parentId !== undefined) updateData.parentId = parentId;
        updateData.updatedAt = new Date();
        
        await StorySet.update(updateData, {
            where: {
                id
            }
        });
        
        ctx.body = {
            success: true,
            message: '更新剧情合集成功'
        };
    } catch (error) {
        console.error('更新剧情合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '更新剧情合集失败'
        };
    }
}

// 删除剧情合集
async function deleteStorySet(ctx, next) {
    const { id } = ctx.params;
    
    try {
        const storySet = await StorySet.findOne({
            where: {
                id,
                isDeleted: 0
            }
        });
        
        if (!storySet) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情合集不存在'
            };
            return;
        }
        
        // 检查是否有子合集
        const childSets = await StorySet.findAll({
            where: {
                parentId: id,
                isDeleted: 0
            }
        });
        
        if (childSets.length > 0) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '请先删除所有子合集'
            };
            return;
        }
        
        // 软删除合集
        await StorySet.update({
            isDeleted: 1,
            updatedAt: new Date()
        }, {
            where: {
                id
            }
        });
        
        // 软删除关联关系
        await StorySetRel.update({
            isDeleted: 1,
            updatedAt: new Date()
        }, {
            where: {
                setId: id
            }
        });
        
        ctx.body = {
            success: true,
            message: '删除剧情合集成功'
        };
    } catch (error) {
        console.error('删除剧情合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除剧情合集失败'
        };
    }
}

// ==================== 剧情项接口 ====================

// 创建剧情
async function createStory(ctx, next) {
    const { title, content, setIds = [] } = ctx.request.body;
    
    if (!title) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '标题不能为空'
        };
        return;
    }
    
    if (!content) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '内容不能为空'
        };
        return;
    }
    
    const transaction = await Sequelize.transaction();
    
    try {
        // 创建剧情
        const story = await Story.create({
            title,
            content,
            isDeleted: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        }, { transaction });
        
        // 如果指定了合集，添加关联
        if (setIds.length > 0) {
            // 检查合集是否存在
            const sets = await StorySet.findAll({
                where: {
                    id: {
                        [Op.in]: setIds
                    },
                    isDeleted: 0
                }
            });
            
            const validSetIds = sets.map(set => set.id);
            
            // 为每个合集创建关联
            for (const setId of validSetIds) {
                // 获取当前合集中最大的排序值
                const maxSortRel = await StorySetRel.findOne({
                    where: {
                        setId,
                        isDeleted: 0
                    },
                    order: [['sort', 'DESC']],
                    transaction
                });
                
                const nextSort = maxSortRel ? maxSortRel.sort + 1 : 0;
                
                // 创建关联
                await StorySetRel.create({
                    storyId: story.id,
                    setId,
                    sort: nextSort,
                    isDeleted: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, { transaction });
            }
        }
        
        await transaction.commit();
        
        ctx.body = {
            success: true,
            message: '创建剧情成功',
            data: {
                id: story.id
            }
        };
    } catch (error) {
        await transaction.rollback();
        console.error('创建剧情失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '创建剧情失败'
        };
    }
}

// 更新剧情
async function updateStory(ctx, next) {
    const { id } = ctx.params;
    const { title, content } = ctx.request.body;
    
    try {
        const story = await Story.findOne({
            where: {
                id,
                isDeleted: 0
            }
        });
        
        if (!story) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情不存在'
            };
            return;
        }
        
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (content !== undefined) updateData.content = content;
        updateData.updatedAt = new Date();
        
        await Story.update(updateData, {
            where: {
                id
            }
        });
        
        ctx.body = {
            success: true,
            message: '更新剧情成功'
        };
    } catch (error) {
        console.error('更新剧情失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '更新剧情失败'
        };
    }
}

// 删除剧情
async function deleteStory(ctx, next) {
    const { id } = ctx.params;
    
    try {
        const story = await Story.findOne({
            where: {
                id,
                isDeleted: 0
            }
        });
        
        if (!story) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情不存在'
            };
            return;
        }
        
        // 软删除剧情
        await Story.update({
            isDeleted: 1,
            updatedAt: new Date()
        }, {
            where: {
                id
            }
        });
        
        // 软删除关联关系
        await StorySetRel.update({
            isDeleted: 1,
            updatedAt: new Date()
        }, {
            where: {
                storyId: id
            }
        });
        
        ctx.body = {
            success: true,
            message: '删除剧情成功'
        };
    } catch (error) {
        console.error('删除剧情失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除剧情失败'
        };
    }
}

// ==================== 关联接口 ====================

// 添加剧情到合集
async function addStoryToSet(ctx, next) {
    const { storyId, setId, sort } = ctx.request.body;
    
    if (!storyId || !setId) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '剧情ID和合集ID不能为空'
        };
        return;
    }
    
    try {
        // 检查剧情和合集是否存在
        const story = await Story.findOne({
            where: {
                id: storyId,
                isDeleted: 0
            }
        });
        
        if (!story) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情不存在'
            };
            return;
        }
        
        const storySet = await StorySet.findOne({
            where: {
                id: setId,
                isDeleted: 0
            }
        });
        
        if (!storySet) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '合集不存在'
            };
            return;
        }
        
        // 检查关联是否已存在
        const existingRel = await StorySetRel.findOne({
            where: {
                storyId,
                setId,
                isDeleted: 0
            }
        });
        
        if (existingRel) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '剧情已在该合集中'
            };
            return;
        }
        
        // 确定排序值
        let nextSort = 0;
        if (sort === undefined) {
            const maxSortRel = await StorySetRel.findOne({
                where: {
                    setId,
                    isDeleted: 0
                },
                order: [['sort', 'DESC']]
            });
            
            nextSort = maxSortRel ? maxSortRel.sort + 1 : 0;
        } else {
            nextSort = sort;
        }
        
        // 创建新的关联
        await StorySetRel.create({
            storyId,
            setId,
            sort: nextSort,
            isDeleted: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        ctx.body = {
            success: true,
            message: '剧情已添加到合集'
        };
    } catch (error) {
        console.error('添加剧情到合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '添加剧情到合集失败'
        };
    }
}

// 从合集中移除剧情
async function removeStoryFromSet(ctx, next) {
    const { storyId, setId } = ctx.request.body;
    
    if (!storyId || !setId) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '剧情ID和合集ID不能为空'
        };
        return;
    }
    
    try {
        // 检查关联是否存在
        const relation = await StorySetRel.findOne({
            where: {
                storyId,
                setId,
                isDeleted: 0
            }
        });
        
        if (!relation) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情不在该合集中'
            };
            return;
        }
        
        // 软删除关联
        await StorySetRel.update({
            isDeleted: 1,
            updatedAt: new Date()
        }, {
            where: {
                id: relation.id
            }
        });
        
        ctx.body = {
            success: true,
            message: '已从合集中移除剧情'
        };
    } catch (error) {
        console.error('从合集中移除剧情失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '从合集中移除剧情失败'
        };
    }
}

// 更新合集中剧情的排序
async function updateStoryOrder(ctx, next) {
    const { setId, storyOrders } = ctx.request.body;
    
    if (!setId || !storyOrders || !Array.isArray(storyOrders)) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '合集ID和剧情排序数组不能为空'
        };
        return;
    }
    
    const transaction = await Sequelize.transaction();
    
    try {
        // 检查合集是否存在
        const storySet = await StorySet.findOne({
            where: {
                id: setId,
                isDeleted: 0
            }
        });
        
        if (!storySet) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '合集不存在'
            };
            return;
        }
        
        // 更新每个剧情的排序
        for (const order of storyOrders) {
            if (!order.storyId || order.sort === undefined) continue;
            
            await StorySetRel.update({
                sort: order.sort,
                updatedAt: new Date()
            }, {
                where: {
                    setId,
                    storyId: order.storyId,
                    isDeleted: 0
                },
                transaction
            });
        }
        
        await transaction.commit();
        
        ctx.body = {
            success: true,
            message: '剧情排序更新成功'
        };
    } catch (error) {
        await transaction.rollback();
        console.error('更新剧情排序失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '更新剧情排序失败'
        };
    }
}

// 导出接口
export default {
    // 剧情合集接口
    'GET /api/story-sets': getAllStorySets,
    'GET /api/story-sets/:id': getStorySetDetail,
    'POST /api/story-sets': createStorySet,
    'PUT /api/story-sets/:id': updateStorySet,
    'DELETE /api/story-sets/:id': deleteStorySet,
    
    // 剧情接口
    'POST /api/stories': createStory,
    'PUT /api/stories/:id': updateStory,
    'DELETE /api/stories/:id': deleteStory,
    
    // 关联接口
    'POST /api/story-set-rel/add': addStoryToSet,
    'POST /api/story-set-rel/remove': removeStoryFromSet,
    'POST /api/story-set-rel/order': updateStoryOrder
};
