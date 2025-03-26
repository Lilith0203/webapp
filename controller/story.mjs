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
                ['onlineAt', 'ASC']
            ]
        });

        // 处理数据
        const processedSets = storySets.map(set => {
            const setData = set.get({ plain: true });
            
            // 格式化日期
            setData.createdAt = utils.YYYYMMDDHHmmss(setData.createdAt);
            setData.updatedAt = utils.YYYYMMDDHHmmss(setData.updatedAt);
            if (setData.onlineAt) {
                setData.onlineAt = utils.YYYYMMDDHHmmss(setData.onlineAt);
            }
            
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
            if (set.parentId && set.parentId !== 0 && setMap[set.parentId]) {
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
    // 添加分页参数
    let page = parseInt(ctx.query.page) || 1;
    let size = parseInt(ctx.query.size) || 10;
    // 添加排序方向参数
    let sortDirection = ctx.query.sortDirection || 'ASC';
    // 添加搜索关键词参数
    let keyword = ctx.query.keyword || '';
    
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
        
        // 获取子合集
        const childSets = await StorySet.findAll({
            where: {
                parentId: id,
                isDeleted: 0
            },
            order: [
                ['sort', 'ASC'],
                ['onlineAt', 'ASC']
            ]
        });
        
        // 收集当前合集及所有子合集的ID
        const allSetIds = [parseInt(id)].concat(childSets.map(child => child.id));
        
        // 获取所有相关合集中的剧情关联
        const relations = await StorySetRel.findAll({
            where: {
                setId: {
                    [Op.in]: allSetIds
                },
                isDeleted: 0
            },
            order: [
                ['sort', 'ASC']
            ]
        });
        
        const storyIds = [...new Set(relations.map(rel => rel.storyId))]; // 使用Set去重
        
        // 获取所有剧情
        let allStories = [];
        if (storyIds.length > 0) {
            // 添加标题搜索条件
            const whereCondition = {
                id: {
                    [Op.in]: storyIds
                },
                isDeleted: 0
            };
            
            // 如果有关键词，添加标题搜索条件
            if (keyword) {
                whereCondition.title = {
                    [Op.like]: `%${keyword}%`
                };
            }
            
            allStories = await Story.findAll({
                where: whereCondition
            });
            
            // 处理剧情数据
            allStories = allStories.map(story => {
                const storyData = story.get({ plain: true });
                
                // 格式化日期
                storyData.createdAt = utils.YYYYMMDDHHmmss(storyData.createdAt);
                storyData.updatedAt = utils.YYYYMMDDHHmmss(storyData.updatedAt);
                if (storyData.onlineAt) {
                    storyData.onlineAt = utils.YYYYMMDDHHmmss(storyData.onlineAt);
                }
                
                // 添加排序信息（使用当前合集中的排序，如果存在）
                const currentSetRelation = relations.find(rel => rel.storyId === storyData.id && rel.setId === parseInt(id));
                storyData.sort = currentSetRelation ? currentSetRelation.sort : 0;
                
                // 添加所属合集信息
                storyData.setIds = relations
                    .filter(rel => rel.storyId === storyData.id)
                    .map(rel => rel.setId);
                
                return storyData;
            });
            
            // 按照关联表中的排序顺序排序
            allStories.sort((a, b) => {
                // 首先按sort排序
                if (a.sort !== b.sort) {
                    return sortDirection === 'ASC' ? a.sort - b.sort : b.sort - a.sort;
                }
                
                // 如果sort相同，则按onlineAt排序
                if (!a.onlineAt && !b.onlineAt) return 0;
                if (!a.onlineAt) return sortDirection === 'ASC' ? 1 : -1;
                if (!b.onlineAt) return sortDirection === 'ASC' ? -1 : 1;
                
                return sortDirection === 'ASC' 
                    ? a.onlineAt.localeCompare(b.onlineAt) 
                    : b.onlineAt.localeCompare(a.onlineAt);
            });
        }
        
        // 获取总数量
        const totalCount = allStories.length;
        
        // 应用分页 - 在排序后进行
        const stories = allStories.slice((page - 1) * size, page * size);
        
        ctx.body = {
            success: true,
            data: stories,
            count: totalCount,
            page_all: Math.ceil(totalCount / size),
            page_now: page
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
    const { name, description, cover, sort, level, parentId, onlineAt } = ctx.request.body;
    
    if (!name) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '合集名称不能为空'
        };
        return;
    }
    
    try {
        // 创建新合集
        const newSet = await StorySet.create({
            name,
            description: description || '',
            cover: cover || '',
            sort: sort || 0,
            level: level || 1,
            parentId: parentId || 0,
            onlineAt: onlineAt || null,
            isDeleted: 0
        });
        
        const setData = newSet.get({ plain: true });
        
        // 格式化日期
        setData.createdAt = utils.YYYYMMDDHHmmss(setData.createdAt);
        setData.updatedAt = utils.YYYYMMDDHHmmss(setData.updatedAt);
        if (setData.onlineAt) {
            setData.onlineAt = utils.YYYYMMDDHHmmss(setData.onlineAt);
        }
        
        ctx.body = {
            success: true,
            message: '创建剧情合集成功',
            data: setData
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
    const { name, description, cover, sort, level, parentId, onlineAt } = ctx.request.body;
    
    if (!name) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '合集名称不能为空'
        };
        return;
    }
    
    try {
        // 检查合集是否存在
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
        
        // 检查是否将合集设为自己的子合集
        if (parentId && parseInt(parentId) === parseInt(id)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '不能将合集设为自己的子合集'
            };
            return;
        }
        
        // 更新合集
        await StorySet.update({
            name,
            description: description !== undefined ? description : storySet.description,
            cover: cover !== undefined ? cover : storySet.cover,
            sort: sort !== undefined ? sort : storySet.sort,
            level: level !== undefined ? level : storySet.level,
            parentId: parentId !== undefined ? parentId : storySet.parentId,
            onlineAt: onlineAt !== undefined ? onlineAt : storySet.onlineAt,
            updatedAt: new Date()
        }, {
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
        // 检查合集是否存在
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
                message: '该合集下有子合集，请先删除子合集'
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
        
        // 软删除合集中的所有剧情关联
        await StorySetRel.update({
            isDeleted: 1,
            updatedAt: new Date()
        }, {
            where: {
                setId: id,
                isDeleted: 0
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

// ==================== 剧情接口 ====================

// 创建剧情
async function createStory(ctx, next) {
    const { title, content, pictures, link, onlineAt, setIds } = ctx.request.body;
    
    if (!title) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '剧情标题不能为空'
        };
        return;
    }
    
    // 获取数据库连接
    const t = await Story.sequelize.transaction();
    
    try {
        // 创建新剧情
        const newStory = await Story.create({
            title,
            content: content || '',
            pictures: pictures || '',
            link: link || '',
            onlineAt: onlineAt || null,
            isDeleted: 0
        }, { transaction: t });
        
        // 如果指定了合集，添加关联
        if (setIds && Array.isArray(setIds) && setIds.length > 0) {
            // 检查所有合集是否存在
            const storySets = await StorySet.findAll({
                where: {
                    id: {
                        [Op.in]: setIds
                    },
                    isDeleted: 0
                }
            });
            
            if (storySets.length !== setIds.length) {
                await t.rollback();
                ctx.status = 404;
                ctx.body = {
                    success: false,
                    message: '部分指定的剧情合集不存在'
                };
                return;
            }
            
            // 为每个合集创建关联
            for (const setId of setIds) {  
                // 创建关联
                await StorySetRel.create({
                    storyId: newStory.id,
                    setId,
                    isDeleted: 0
                }, { transaction: t });
            }
        }
        
        await t.commit();
        
        const storyData = newStory.get({ plain: true });
        
        // 格式化日期
        storyData.createdAt = utils.YYYYMMDDHHmmss(storyData.createdAt);
        storyData.updatedAt = utils.YYYYMMDDHHmmss(storyData.updatedAt);
        if (storyData.onlineAt) {
            storyData.onlineAt = utils.YYYYMMDDHHmmss(storyData.onlineAt);
        }
        
        // 添加合集ID信息
        storyData.setIds = setIds || [];
        
        ctx.body = {
            success: true,
            message: '创建剧情成功',
            data: storyData
        };
    } catch (error) {
        await t.rollback();
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
    const { title, content, pictures, link, onlineAt, setIds } = ctx.request.body;
    
    if (!title) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '剧情标题不能为空'
        };
        return;
    }
    
    // 获取数据库连接
    const t = await Story.sequelize.transaction();
    
    try {
        // 检查剧情是否存在
        const story = await Story.findOne({
            where: {
                id,
                isDeleted: 0
            }
        });
        
        if (!story) {
            await t.rollback();
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情不存在'
            };
            return;
        }
        
        // 处理onlineAt字段，确保它是有效的日期或null
        let processedOnlineAt = onlineAt;
        if (onlineAt === '' || onlineAt === 'Invalid date' || !onlineAt) {
            processedOnlineAt = null;
        }
        
        // 更新剧情基本信息
        await Story.update({
            title,
            content: content !== undefined ? content : story.content,
            pictures: pictures !== undefined ? pictures : story.pictures,
            link: link !== undefined ? link : story.link,
            onlineAt: processedOnlineAt,
            updatedAt: new Date()
        }, {
            where: { id },
            transaction: t
        });
        
        // 如果提供了合集ID数组，更新剧情所属合集
        if (setIds && Array.isArray(setIds)) {
            // 检查所有合集是否存在
            if (setIds.length > 0) {
                const storySets = await StorySet.findAll({
                    where: {
                        id: {
                            [Op.in]: setIds
                        },
                        isDeleted: 0
                    }
                });
                
                if (storySets.length !== setIds.length) {
                    await t.rollback();
                    ctx.status = 404;
                    ctx.body = {
                        success: false,
                        message: '部分指定的剧情合集不存在'
                    };
                    return;
                }
            }
            
            // 获取当前剧情的所有关联
            const currentRels = await StorySetRel.findAll({
                where: {
                    storyId: id,
                    isDeleted: 0
                },
                transaction: t
            });
            
            const currentSetIds = currentRels.map(rel => rel.setId);
            
            // 需要删除的关联
            const toRemove = currentSetIds.filter(setId => !setIds.includes(setId));
            
            // 需要添加的关联
            const toAdd = setIds.filter(setId => !currentSetIds.includes(setId));
            
            // 软删除不再需要的关联
            if (toRemove.length > 0) {
                await StorySetRel.update({
                    isDeleted: 1,
                    updatedAt: new Date()
                }, {
                    where: {
                        storyId: id,
                        setId: {
                            [Op.in]: toRemove
                        },
                        isDeleted: 0
                    },
                    transaction: t
                });
            }
            
            // 添加新的关联
            for (const setId of toAdd) {
                // 获取当前合集中最大的排序值
                const maxSortRel = await StorySetRel.findOne({
                    where: {
                        setId,
                        isDeleted: 0
                    },
                    order: [['sort', 'DESC']],
                    transaction: t
                });
                
                const maxSort = maxSortRel ? maxSortRel.sort : 0;
                
                // 创建关联
                await StorySetRel.create({
                    storyId: id,
                    setId,
                    sort: maxSort + 1,
                    isDeleted: 0
                }, { transaction: t });
            }
        }
        
        await t.commit();
        
        ctx.body = {
            success: true,
            message: '更新剧情成功'
        };
    } catch (error) {
        await t.rollback();
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
        // 检查剧情是否存在
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
        
        // 软删除所有关联
        await StorySetRel.update({
            isDeleted: 1,
            updatedAt: new Date()
        }, {
            where: {
                storyId: id,
                isDeleted: 0
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

// 将剧情添加到合集
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
        // 检查剧情是否存在
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
        
        // 获取当前合集中最大的排序值
        let sortValue = sort;
        if (sortValue === undefined) {
            const maxSortRel = await StorySetRel.findOne({
                where: {
                    setId,
                    isDeleted: 0
                },
                order: [['sort', 'DESC']]
            });
            
            sortValue = maxSortRel ? maxSortRel.sort + 1 : 1;
        }
        
        // 创建关联
        await StorySetRel.create({
            storyId,
            setId,
            sort: sortValue,
            isDeleted: 0
        });
        
        ctx.body = {
            success: true,
            message: '已将剧情添加到合集'
        };
    } catch (error) {
        console.error('将剧情添加到合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '将剧情添加到合集失败'
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

// 获取剧情详情
async function getStoryDetail(ctx, next) {
    const { id } = ctx.params;
    
    try {
        // 查询剧情
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
        
        // 获取剧情所属的所有合集关联
        const relations = await StorySetRel.findAll({
            where: {
                storyId: id,
                isDeleted: 0
            }
        });
        
        // 获取剧情所属的所有合集ID
        const setIds = relations.map(rel => rel.setId);
        
        // 处理剧情数据
        const storyData = story.get({ plain: true });
        
        // 格式化日期
        storyData.createdAt = utils.YYYYMMDDHHmmss(storyData.createdAt);
        storyData.updatedAt = utils.YYYYMMDDHHmmss(storyData.updatedAt);
        if (storyData.onlineAt) {
            storyData.onlineAt = utils.YYYYMMDDHHmmss(storyData.onlineAt);
        }
        
        // 添加合集ID信息
        storyData.setIds = setIds;
        
        ctx.body = {
            success: true,
            data: storyData
        };
    } catch (error) {
        console.error('获取剧情详情失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取剧情详情失败'
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
    'POST /api/story-set-rel/order': updateStoryOrder,
    'GET /api/stories/:id': getStoryDetail
};
