import * as utils from 'utility';
import { Works, WorksSet, WorksRelation } from '../orm.mjs';
import { cleanOssUrls } from '../oss.mjs';
import { Op } from 'sequelize';
import cache from '../util/cache.mjs';

// 缓存键前缀
const CACHE_KEYS = {
    ALL_TAGS: 'works:tags:all',
    TAG_COUNT: 'works:tags:count:',
};

/**
 * 从JSON字符串数组中提取所有标签
 * @param {Array} items 包含tags字段的数组
 * @returns {Set} 唯一标签集合
 */
function extractTags(items) {
    const tagSet = new Set();
    
    items.forEach(item => {
        try {
            const tags = JSON.parse(item.tags || '[]');
            if (Array.isArray(tags)) {
                tags.forEach(tag => {
                    if (tag) tagSet.add(tag);
                });
            }
        } catch (e) {
            console.error('Parse tags error:', e);
        }
    });
    
    return tagSet;
}

/**
 * 解析materials字段，兼容旧数据格式
 * @param {string} materialsStr JSON字符串
 * @returns {Array} 材料数组，格式为 [{id: number, quantity: number}]
 */
function parseMaterials(materialsStr) {
    try {
        const materials = JSON.parse(materialsStr);
        if (!Array.isArray(materials)) {
            return [];
        }
        
        // 兼容旧数据格式：如果是数字数组，转换为新格式
        return materials.map(item => {
            if (typeof item === 'number') {
                // 旧格式：只有ID，默认数量为1
                return { id: item, quantity: 1 };
            } else if (typeof item === 'object' && item.id !== undefined) {
                // 新格式：包含ID和数量
                return { 
                    id: parseInt(item.id), 
                    quantity: parseInt(item.quantity) || 1 
                };
            }
            return null;
        }).filter(Boolean);
    } catch (e) {
        console.error('Parse materials error:', e);
        return [];
    }
}

/**
 * 处理materials字段，确保存储格式正确
 * @param {Array|string} materials 材料数据
 * @returns {string} JSON字符串
 */
function processMaterials(materials) {
    if (typeof materials === 'string') {
        try {
            // 如果是JSON字符串，先解析再处理
            const parsed = JSON.parse(materials);
            return JSON.stringify(parsed);
        } catch (e) {
            return '[]';
        }
    } else if (Array.isArray(materials)) {
        // 确保每个材料项都有正确的格式
        const processed = materials.map(item => {
            if (typeof item === 'number') {
                return { id: item, quantity: 1 };
            } else if (typeof item === 'object' && item.id !== undefined) {
                return { 
                    id: parseInt(item.id), 
                    quantity: parseInt(item.quantity) || 1 
                };
            }
            return null;
        }).filter(Boolean);
        
        return JSON.stringify(processed);
    }
    
    return '[]';
}

//GET /api/works
async function works(ctx, next) {
    let size = ctx.query.size ? parseInt(ctx.query.size) : 12;
    let page = ctx.query.page ? parseInt(ctx.query.page) : 1;
    let offset = (page - 1) * size;
    
    // 解析标签参数
    let tags = ctx.query.tags ? ctx.query.tags.split(',').filter(Boolean) : [];
    
    // 获取关键词参数
    let keyword = ctx.query.keyword ? ctx.query.keyword.trim() : '';
    
    // 获取status参数（0表示未完成，1表示完成）
    let status = ctx.query.status !== undefined ? parseInt(ctx.query.status) : undefined;
    
    let where = {
        isDeleted: 0
    };
    
    // 如果有status筛选，添加status条件
    if (status !== undefined && (status === 0 || status === 1)) {
        where.status = status;
    }
    
    // 如果有标签筛选，添加标签条件
    if (tags.length > 0) {
        where = {
            ...where,
            [Op.and]: tags.map(tag => ({
                tags: {
                    [Op.like]: `%${tag}%`
                }
            }))
        };
    }
    
    // 如果有关键词，添加名称或描述的搜索条件
    if (keyword) {
        where = {
            ...where,
            [Op.or]: [
                {
                    name: {
                        [Op.like]: `%${keyword}%`
                    }
                },
                {
                    description: {
                        [Op.like]: `%${keyword}%`
                    }
                }
            ]
        };
    }

    // 如果有关键词搜索，按创建时间排序；否则按更新时间排序
    const orderBy = keyword 
        ? [['createdAt', 'DESC']]  // 搜索时按创建时间从新到旧
        : [['updatedAt', 'DESC']]; // 非搜索时按更新时间排序
    
    let {count, rows} = await Works.findAndCountAll({
        where,
        limit: size,
        offset: offset,
        order: orderBy
    });

    // 处理每一行的数据
    rows = rows.map(item => {
        const row = item.get({ plain: true });
        // 解析 tags 字符串为数组
        try {
            row.tags = JSON.parse(row.tags || '[]');
            row.pictures = JSON.parse(row.pictures || '[]');
            row.materials = parseMaterials(row.materials || '[]');
            row.video = row.video || '';
            row.link = row.link || '';
        } catch (e) {
            row.tags = [];
            row.pictures = [];
            row.materials = [];
            row.video = '';
            row.link = '';
        }
        row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt);
        row.updatedAt = utils.YYYYMMDDHHmmss(row.updatedAt);
        return row;
    });

    ctx.body = {
        works: rows,
        count: count
    }
}

// GET /api/worktags
async function works_tags(ctx, next) {
    try {
        // 尝试从缓存获取
        let cachedData = await cache.get(CACHE_KEYS.ALL_TAGS);
        if (cachedData) {
            ctx.body = {
                success: true,
                data: cachedData
            };
            return;
        }
        // 获取所有未删除作品的标签
        const works = await Works.findAll({
            attributes: ['tags'],
            where: {
                tags: {
                    [Op.not]: null,
                    [Op.ne]: '[]'
                },
                isDeleted: 0
            }
        });

        // 提取标签
        const tagSet = extractTags(works);
        
        // 统计每个标签的使用次数
        const tagCounts = {};
        for (const tag of tagSet) {
            // 尝试从缓存获取标签计数
            // 尝试从缓存获取标签计数
            const cacheKey = CACHE_KEYS.TAG_COUNT + tag;
            let count = await cache.get(cacheKey);

            if (count === null) {
                count = await Works.count({
                    where: {
                        tags: {
                            [Op.like]: `%${tag}%`
                        },
                        isDeleted: 0
                    }
                });
                // 缓存标签计数，有效期1小时
                await cache.set(cacheKey, count, 3600);
            }
            tagCounts[tag] = count;
        }

        // 按使用次数排序
        const sortedTags = [...tagSet].sort((a, b) => tagCounts[b] - tagCounts[a]);
        
        const data = {
            tags: sortedTags,
            counts: tagCounts
        };

        // 缓存结果，有效期15分钟
        await cache.set(CACHE_KEYS.ALL_TAGS, data, 900);

        ctx.body = {
            success: true,
            data
        };
    } catch (error) {
        console.error('Get works tags error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取标签失败: ' + error.message
        };
    }
}

// 在作品更新、添加、删除时清除相关缓存
async function clearWorksCache() {
    try {
        await cache.del(CACHE_KEYS.ALL_TAGS);
        // 可以添加更多缓存清理逻辑
    } catch (error) {
        console.error('Clear works cache error:', error);
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
        
        workData.pictures = cleanOssUrls(workData.pictures);
        const pictures = Array.isArray(workData.pictures) 
            ? JSON.stringify(workData.pictures)
            : workData.pictures;
            
        // 处理 materials 数组
        const materials = processMaterials(workData.materials);

        // 创建新文章
        const works = await Works.create({
            name: workData.name,
            description: workData.description,
            pictures: pictures,
            tags: tags,
            materials: materials,
            video: workData.video || '',
            link: workData.link || '',
            price: workData.price || 0,
            status: workData.status !== undefined ? parseInt(workData.status) : 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        await clearWorksCache();

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
        updateData.pictures = cleanOssUrls(updateData.pictures);
        const pictures = Array.isArray(updateData.pictures) 
            ? JSON.stringify(updateData.pictures)
            : updateData.pictures;
            
        // 处理 materials 数组
        const materials = processMaterials(updateData.materials);

        // 更新文章
        const updateFields = {
            name: updateData.name,
            description: updateData.description,
            pictures: pictures,
            tags: tags,
            materials: materials,
            video: updateData.video || '',
            link: updateData.link || '',
            price: updateData.price || 0,
            updatedAt: new Date()
        };
        
        // 如果提供了status字段，则更新它
        if (updateData.status !== undefined) {
            updateFields.status = parseInt(updateData.status);
        }
        
        await Works.update(updateFields, {
            where: { id: id }
        });
        await clearWorksCache();
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
    await clearWorksCache();
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
            workData.materials = parseMaterials(workData.materials || '[]');
            workData.video = workData.video || '';
            workData.link = workData.link || '';
        } catch (e) {
            workData.tags = [];
            workData.pictures = [];
            workData.materials = [];
            workData.video = '';
            workData.link = '';
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

// POST /api/works-set/add - 创建合集
async function worksSet_add(ctx, next) {
    const setData = ctx.request.body;
    
    try {
        // 处理 tags 数组
        const tags = Array.isArray(setData.tags) 
            ? JSON.stringify(setData.tags)
            : setData.tags;
        
        // 处理封面图片URL
        const cover = cleanOssUrls(setData.cover);
        
        const worksSet = await WorksSet.create({
            name: setData.name,
            description: setData.description || '',
            cover: cover || '',
            tags: tags || '[]',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        ctx.body = {
            success: true,
            message: '合集创建成功',
            data: {
                id: worksSet.id
            }
        };
    } catch (error) {
        console.error('创建合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '合集创建失败'
        };
    }
}

// POST /api/works-set/edit - 编辑合集
async function worksSet_edit(ctx, next) {
    const updateData = ctx.request.body;
    const id = parseInt(updateData.id);
    
    try {
        const worksSet = await WorksSet.findByPk(id);
        if (!worksSet) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '合集不存在'
            };
            return;
        }
        
        // 处理 tags 数组
        const tags = Array.isArray(updateData.tags) 
            ? JSON.stringify(updateData.tags)
            : updateData.tags;
        
        // 处理封面图片URL
        const cover = cleanOssUrls(updateData.cover);
        
        await WorksSet.update({
            name: updateData.name,
            description: updateData.description || '',
            cover: cover || '',
            tags: tags || '[]',
            updatedAt: new Date()
        }, {
            where: { id: id }
        });
        
        ctx.body = {
            success: true,
            message: '合集更新成功'
        };
    } catch (error) {
        console.error('更新合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '合集更新失败'
        };
    }
}

// POST /api/works-set/delete - 删除合集
async function worksSet_delete(ctx, next) {
    const id = parseInt(ctx.request.body.id);
    
    try {
        await WorksSet.update({
            isDeleted: 1,
            updatedAt: new Date()
        }, {
            where: { id: id }
        });
        
        // 同时删除该合集下的所有关联关系
        await WorksRelation.update({
            isDeleted: 1
        }, {
            where: { setId: id }
        });
        
        ctx.body = {
            success: true,
            message: '合集删除成功'
        };
    } catch (error) {
        console.error('删除合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '合集删除失败'
        };
    }
}

// GET /api/works-set/list - 获取合集列表
async function worksSet_list(ctx, next) {
    try {
        const sets = await WorksSet.findAll({
            where: {
                isDeleted: 0
            },
            order: [['updatedAt', 'DESC']]
        });
        
        const setsData = sets.map(set => {
            const setData = set.get({ plain: true });
            try {
                setData.tags = JSON.parse(setData.tags || '[]');
            } catch (e) {
                setData.tags = [];
            }
            setData.createdAt = utils.YYYYMMDDHHmmss(setData.createdAt);
            setData.updatedAt = utils.YYYYMMDDHHmmss(setData.updatedAt);
            return setData;
        });
        
        ctx.body = {
            success: true,
            data: {
                sets: setsData
            }
        };
    } catch (error) {
        console.error('获取合集列表失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取合集列表失败'
        };
    }
}

// POST /api/works-set/add-work - 将作品添加到合集
async function worksSet_addWork(ctx, next) {
    const { setId, worksId, order } = ctx.request.body;
    
    try {
        // 检查合集是否存在
        const worksSet = await WorksSet.findOne({
            where: {
                id: setId,
                isDeleted: 0
            }
        });
        
        if (!worksSet) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '合集不存在'
            };
            return;
        }
        
        // 检查作品是否存在
        const work = await Works.findOne({
            where: {
                id: worksId,
                isDeleted: 0
            }
        });
        
        if (!work) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '作品不存在'
            };
            return;
        }
        
        // 检查是否已经存在关联
        const existingRelation = await WorksRelation.findOne({
            where: {
                setId: setId,
                worksId: worksId,
                isDeleted: 0
            }
        });
        
        if (existingRelation) {
            ctx.body = {
                success: false,
                message: '作品已在该合集中'
            };
            return;
        }
        
        // 创建关联关系
        await WorksRelation.create({
            setId: setId,
            worksId: worksId,
            order: order || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        ctx.body = {
            success: true,
            message: '作品添加成功'
        };
    } catch (error) {
        console.error('添加作品到合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '添加作品到合集失败'
        };
    }
}

// GET /api/works-set/:id/works - 获取合集下的所有作品列表
async function worksSet_works(ctx, next) {
    const setId = parseInt(ctx.params.id);
    
    try {
        // 检查合集是否存在
        const worksSet = await WorksSet.findOne({
            where: {
                id: setId,
                isDeleted: 0
            }
        });
        
        if (!worksSet) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '合集不存在'
            };
            return;
        }
        
        // 获取该合集下的所有关联关系
        const relations = await WorksRelation.findAll({
            where: {
                setId: setId,
                isDeleted: 0
            },
            order: [['order', 'ASC'], ['id', 'ASC']]
        });
        
        const worksIds = relations.map(rel => rel.worksId);
        
        if (worksIds.length === 0) {
            ctx.body = {
                success: true,
                data: {
                    works: [],
                    count: 0
                }
            };
            return;
        }
        
        // 创建关联关系映射，包含 order 信息
        const relationMap = new Map();
        relations.forEach(rel => {
            relationMap.set(rel.worksId, {
                order: rel.order || 0,
                id: rel.id
            });
        });
        
        // 获取作品详情
        const works = await Works.findAll({
            where: {
                id: {
                    [Op.in]: worksIds
                },
                isDeleted: 0
            }
        });
        
        // 按照关联关系的 order 排序，order 相同时按创建时间从新到旧排序
        const worksMap = new Map(works.map(work => [work.id, work]));
        const sortedWorks = worksIds
            .map(id => {
                const work = worksMap.get(id);
                if (!work) return null;
                const relation = relationMap.get(id);
                return {
                    work,
                    order: relation ? relation.order : 999999,
                    createdAt: work.createdAt
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                // 首先按 order 排序
                if (a.order !== b.order) {
                    return a.order - b.order;
                }
                // order 相同时，按创建时间从新到旧（降序）
                return new Date(b.createdAt) - new Date(a.createdAt);
            })
            .map(item => item.work);
        
        // 处理作品数据
        const worksData = sortedWorks.map(item => {
            const workData = item.get({ plain: true });
            try {
                workData.tags = JSON.parse(workData.tags || '[]');
                workData.pictures = JSON.parse(workData.pictures || '[]');
                workData.materials = parseMaterials(workData.materials || '[]');
                workData.video = workData.video || '';
                workData.link = workData.link || '';
            } catch (e) {
                workData.tags = [];
                workData.pictures = [];
                workData.materials = [];
                workData.video = '';
                workData.link = '';
            }
            workData.createdAt = utils.YYYYMMDDHHmmss(workData.createdAt);
            workData.updatedAt = utils.YYYYMMDDHHmmss(workData.updatedAt);
            return workData;
        });
        
        ctx.body = {
            success: true,
            data: {
                works: worksData,
                count: worksData.length
            }
        };
    } catch (error) {
        console.error('获取合集作品列表失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取合集作品列表失败'
        };
    }
}

// POST /api/works-set/remove-work - 将作品从合集中移出
async function worksSet_removeWork(ctx, next) {
    const { setId, worksId } = ctx.request.body;
    
    try {
        await WorksRelation.update({
            isDeleted: 1,
            updatedAt: new Date()
        }, {
            where: {
                setId: setId,
                worksId: worksId,
                isDeleted: 0
            }
        });
        
        ctx.body = {
            success: true,
            message: '作品移除成功'
        };
    } catch (error) {
        console.error('移除作品失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '移除作品失败'
        };
    }
}

export default {
    'GET /api/works': works,
    'GET /api/worktags': works_tags,
    'GET /api/works/:id': works_detail,
    'POST /api/works/edit': works_edit,
    'POST /api/works/add': works_add,
    'POST /api/works/delete': works_delete,
    'POST /api/works-set/add': worksSet_add,
    'POST /api/works-set/edit': worksSet_edit,
    'POST /api/works-set/delete': worksSet_delete,
    'GET /api/works-set/list': worksSet_list,
    'POST /api/works-set/add-work': worksSet_addWork,
    'GET /api/works-set/:id/works': worksSet_works,
    'POST /api/works-set/remove-work': worksSet_removeWork
}