import { Story, StorySet, StorySetRel, StoryRelation } from '../orm.mjs';
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
            // 添加标题和内容搜索条件
            const whereCondition = {
                id: {
                    [Op.in]: storyIds
                },
                isDeleted: 0
            };
            
            // 如果有关键词，添加标题、内容和合集名称搜索条件
            if (keyword) {
                whereCondition[Op.or] = [
                    {
                        title: {
                            [Op.like]: `%${keyword}%`
                        }
                    },
                    {
                        content: {
                            [Op.like]: `%${keyword}%`
                        }
                    }
                ];

                // 获取包含关键词的合集ID
                const matchingSets = await StorySet.findAll({
                    where: {
                        name: {
                            [Op.like]: `%${keyword}%`
                        },
                        isDeleted: 0
                    }
                });
                
                // 如果找到匹配的合集，将其ID加入到搜索条件中
                if (matchingSets.length > 0) {
                    const matchingSetIds = matchingSets.map(set => set.id);
                    const matchingRelations = await StorySetRel.findAll({
                        where: {
                            setId: {
                                [Op.in]: matchingSetIds
                            },
                            isDeleted: 0
                        }
                    });
                    
                    if (matchingRelations.length > 0) {
                        const matchingStoryIds = matchingRelations.map(rel => rel.storyId);
                        whereCondition[Op.or].push({
                            id: {
                                [Op.in]: matchingStoryIds
                            }
                        });
                    }
                }
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
                
                // 处理pictures字段，确保它是数组
                if (storyData.pictures) {
                    try {
                        storyData.pictures = JSON.parse(storyData.pictures);
                    } catch (e) {
                        // 如果解析失败，假设它是单个URL
                        storyData.pictures = [storyData.pictures];
                    }
                } else {
                    storyData.pictures = [];
                }
                
                // 添加排序信息（使用当前合集中的排序，如果存在）
                const currentSetRelation = relations.find(rel => rel.storyId === storyData.id && rel.setId === parseInt(id));
                storyData.sort = currentSetRelation ? currentSetRelation.sort : 0;
                
                // 添加所属合集信息
                storyData.setIds = relations
                    .filter(rel => rel.storyId === storyData.id)
                    .map(rel => rel.setId);
                
                // 确保isRecommended字段存在
                storyData.isRecommended = !!storyData.isRecommended;
                
                return storyData;
            });
            
            // 按照关联表中的排序顺序排序
            allStories.sort((a, b) => {
                // 处理null或undefined的情况
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

// 添加一个使用POST方法的删除合集函数
async function deleteStorySet(ctx, next) {
    const { id } = ctx.request.body;
    
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
    const { title, content, pictures, link, onlineAt, setIds, isRecommended } = ctx.request.body;
    
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
        // 处理pictures字段，确保它是JSON字符串
        let processedPictures = pictures;
        if (pictures) {
            if (Array.isArray(pictures)) {
                processedPictures = JSON.stringify(pictures);
            } else if (typeof pictures === 'string') {
                try {
                    // 尝试解析为JSON，如果成功则是有效的JSON字符串
                    JSON.parse(pictures);
                    processedPictures = pictures;
                } catch (e) {
                    // 如果解析失败，假设它是单个URL
                    processedPictures = JSON.stringify([pictures]);
                }
            }
        } else {
            processedPictures = '[]';
        }
        
        // 创建新剧情
        const newStory = await Story.create({
            title,
            content: content || '',
            pictures: processedPictures,
            link: link || '',
            onlineAt: onlineAt || null,
            isRecommended: isRecommended === 1 ? 1 : 0,
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
    const { title, content, pictures, link, onlineAt, setIds, isRecommended, detail } = ctx.request.body;
    
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
        
        // 处理pictures字段，确保它是JSON字符串
        let processedPictures = pictures;
        if (pictures !== undefined) {
            if (Array.isArray(pictures)) {
                processedPictures = JSON.stringify(pictures);
            } else if (typeof pictures === 'string') {
                try {
                    // 尝试解析为JSON，如果成功则是有效的JSON字符串
                    JSON.parse(pictures);
                    processedPictures = pictures;
                } catch (e) {
                    // 如果解析失败，假设它是单个URL
                    processedPictures = JSON.stringify([pictures]);
                }
            }
        } else {
            processedPictures = story.pictures;
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
            pictures: processedPictures,
            link: link !== undefined ? link : story.link,
            onlineAt: processedOnlineAt,
            isRecommended: isRecommended === 1 ? 1 : 0,
            detail: detail !== undefined ? detail : story.detail,
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
                // 创建关联
                await StorySetRel.create({
                    storyId: id,
                    setId,
                    sort: 1,
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

// 添加一个使用POST方法的删除函数
async function deleteStory(ctx, next) {
    const { id } = ctx.request.body; // 从请求体获取ID
    
    try {
        // 检查剧情是否存在
        const story = await Story.findOne({
            where: {
                id,
                isDeleted: 0
            }
        });
        
        if (!story) {
            console.log('剧情不存在，ID:', id);
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情不存在'
            };
            return;
        }
        
        console.log('开始删除剧情，ID:', id);
        
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
        
        console.log('剧情删除成功，ID:', id);
        
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

        // 获取合集信息
        const sets = await StorySet.findAll({
            where: {
                id: {
                    [Op.in]: setIds
                },
                isDeleted: 0
            },
            attributes: ['id', 'name']
        });

        // 处理剧情数据
        const storyData = story.get({ plain: true });
        
        // 格式化日期
        storyData.createdAt = utils.YYYYMMDDHHmmss(storyData.createdAt);
        storyData.updatedAt = utils.YYYYMMDDHHmmss(storyData.updatedAt);
        if (storyData.onlineAt) {
            storyData.onlineAt = utils.YYYYMMDDHHmmss(storyData.onlineAt);
        }

        // 处理pictures字段
        if (storyData.pictures) {
            try {
                storyData.pictures = JSON.parse(storyData.pictures);
            } catch (e) {
                storyData.pictures = [storyData.pictures];
            }
        } else {
            storyData.pictures = [];
        }

        // 添加合集信息
        storyData.sets = sets.map(set => ({
            id: set.id,
            name: set.name
        }));

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

// 添加剧情关联
// POST /api/story-relation/add
async function addStoryRelation(ctx, next) {
    const { storyId, relatedId, relationType, note } = ctx.request.body;

    if (!storyId || !relatedId || !relationType) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: 'storyId、relatedId、relationType 不能为空'
        };
        return;
    }
    if (storyId === relatedId) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '不能关联自身'
        };
        return;
    }

    try {
        // 检查剧情是否存在
        const story = await Story.findOne({ where: { id: storyId, isDeleted: 0 } });
        const related = await Story.findOne({ where: { id: relatedId, isDeleted: 0 } });
        if (!story || !related) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '剧情不存在'
            };
            return;
        }

        // 检查是否已存在
        const exist = await StoryRelation.findOne({
            where: { storyId, relatedId, relationType, isDeleted: 0 }
        });
        if (exist) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '该关联已存在'
            };
            return;
        }

        await StoryRelation.create({
            storyId,
            relatedId,
            relationType,
            note: note || '',
            isDeleted: 0
        });

        ctx.body = {
            success: true,
            message: '添加剧情关联成功'
        };
    } catch (error) {
        console.error('添加剧情关联失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '添加剧情关联失败'
        };
    }
}

// 查询剧情的所有关联
// GET /api/story-relation/:storyId
async function getStoryRelations(ctx, next) {
    const { storyId } = ctx.params;
    try {
        // 查询当前剧情主动关联的其他剧情
        const relations = await StoryRelation.findAll({
            where: {
                storyId,
                isDeleted: 0
            }
        });

        // 查询其他剧情关联当前剧情的记录（反向关联）
        const reverseRelations = await StoryRelation.findAll({
            where: {
                relatedId: storyId,
                isDeleted: 0
            }
        });

        // 处理反向关联，转换为当前剧情的视角
        const processedReverseRelations = reverseRelations.map(rel => {
            let relationType = rel.relationType;
            let note = rel.note || '';
            
            // 处理前传/后续的互相关联
            if (rel.relationType === 'prequel') {
                relationType = 'sequel';
                note = rel.note || '前传';
            } else if (rel.relationType === 'sequel') {
                relationType = 'prequel';
                note = rel.note || '后续';
            }
            // related和parallel保持相同类型
            
            return {
                id: rel.id,
                storyId: rel.relatedId, // 当前剧情ID
                relatedId: rel.storyId, // 关联的剧情ID
                relationType,
                note
            };
        });

        // 合并所有关联
        const allRelations = [...relations, ...processedReverseRelations];
        
        // 去重（基于relatedId和relationType）
        const uniqueRelations = [];
        const seen = new Set();
        
        allRelations.forEach(rel => {
            const key = `${rel.relatedId}-${rel.relationType}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueRelations.push(rel);
            }
        });

        // 查询被关联剧情的详细信息
        const relatedIds = uniqueRelations.map(rel => rel.relatedId);
        let relatedStories = [];
        if (relatedIds.length > 0) {
            relatedStories = await Story.findAll({
                where: {
                    id: relatedIds,
                    isDeleted: 0
                }
            });
        }
        
        // 组装返回
        const relatedMap = {};
        relatedStories.forEach(story => {
            relatedMap[story.id] = story.get({ plain: true });
        });

        const result = uniqueRelations.map(rel => ({
            id: rel.id,
            storyId: rel.storyId,
            relatedId: rel.relatedId,
            relationType: rel.relationType,
            note: rel.note,
            relatedStory: relatedMap[rel.relatedId] || null
        }));

        ctx.body = {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('查询剧情关联失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '查询剧情关联失败'
        };
    }
}

// 删除剧情关联
// POST /api/story-relation/delete
async function deleteStoryRelation(ctx, next) {
    const { id } = ctx.request.body;
    if (!id) {
        ctx.status = 400;
        ctx.body = { success: false, message: '关联ID不能为空' };
        return;
    }
    try {
        const rel = await StoryRelation.findOne({ where: { id, isDeleted: 0 } });
        if (!rel) {
            ctx.status = 404;
            ctx.body = { success: false, message: '关联不存在' };
            return;
        }
        await StoryRelation.update(
            { isDeleted: 1 },
            { where: { id } }
        );

        // 直接删除关联记录，无需处理反向关联
        ctx.body = { success: true, message: '删除关联成功' };
    } catch (error) {
        console.error('删除剧情关联失败:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: '删除剧情关联失败' };
    }
}

// 编辑剧情关联
// PUT /api/story-relation/:id
async function updateStoryRelation(ctx, next) {
    const { id } = ctx.params;
    const { relationType, note } = ctx.request.body;
    
    if (!relationType) {
        ctx.status = 400;
        ctx.body = { success: false, message: '关联类型不能为空' };
        return;
    }
    
    try {
        const rel = await StoryRelation.findOne({ where: { id, isDeleted: 0 } });
        if (!rel) {
            ctx.status = 404;
            ctx.body = { success: false, message: '关联不存在' };
            return;
        }
        
        // 更新关联信息
        await StoryRelation.update({
            relationType,
            note: note || '',
            updatedAt: new Date()
        }, {
            where: { id }
        });
        
        ctx.body = { success: true, message: '更新关联成功' };
    } catch (error) {
        console.error('更新剧情关联失败:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: '更新剧情关联失败' };
    }
}

// GET /api/stories
// 支持 ?search=xxx&size=10&setIds=1,2,3
async function searchStories(ctx, next) {
    const search = ctx.query.search ? ctx.query.search.trim() : ''
    const size = parseInt(ctx.query.size) || 10
    let setIds = ctx.query.setIds
    if (typeof setIds === 'string' && setIds.length > 0) {
        setIds = setIds.split(',').map(id => parseInt(id)).filter(Boolean)
    } else {
        setIds = undefined
    }

    let where = { isDeleted: 0 }
    if (search) {
        where.title = { [Op.like]: `%${search}%` }
    }

    try {
        let storyIds = null
        if (setIds && setIds.length > 0) {
            // 查找属于这些合集的剧情ID
            const rels = await StorySetRel.findAll({
                where: {
                    setId: { [Op.in]: setIds },
                    isDeleted: 0
                },
                attributes: ['storyId']
            })
            storyIds = rels.map(r => r.storyId)
            if (storyIds.length === 0) {
                ctx.body = { success: true, items: [] }
                return
            }
            where.id = { [Op.in]: storyIds }
        }

        const stories = await Story.findAll({
            where,
            attributes: ['id', 'title'],
            limit: size,
            order: [['updatedAt', 'DESC']]
        })
        ctx.body = {
            success: true,
            items: stories.map(s => s.get({ plain: true }))
        }
    } catch (error) {
        console.error('剧情搜索失败:', error)
        ctx.status = 500
        ctx.body = {
            success: false,
            message: '剧情搜索失败'
        }
    }
}

// 导出接口
export default {
    // 剧情合集接口
    'GET /api/story-sets': getAllStorySets,
    'GET /api/story-sets/:id': getStorySetDetail,
    'POST /api/story-sets': createStorySet,
    'PUT /api/story-sets/:id': updateStorySet,
    'POST /api/story-sets/delete': deleteStorySet,
    
    // 剧情接口
    'POST /api/stories': createStory,
    'PUT /api/stories/:id': updateStory,
    'POST /api/stories/delete': deleteStory,
    
    // 关联接口
    'GET /api/stories/:id': getStoryDetail,
    'POST /api/story-relation/add': addStoryRelation,
    'GET /api/story-relation/:storyId': getStoryRelations,
    'POST /api/story-relation/delete': deleteStoryRelation,
    'PUT /api/story-relation/:id': updateStoryRelation,
    'GET /api/stories': searchStories
};

