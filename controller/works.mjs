import * as utils from 'utility';
import { Works } from '../orm.mjs';
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
    
    let where = {
        isDeleted: 0
    };
    
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

    let {count, rows} = await Works.findAndCountAll({
        where,
        limit: size,
        offset: offset,
        order: [['updatedAt', 'DESC']]
    });

    // 处理每一行的数据
    rows = rows.map(item => {
        const row = item.get({ plain: true });
        // 解析 tags 字符串为数组
        try {
            row.tags = JSON.parse(row.tags || '[]');
            row.pictures = JSON.parse(row.pictures || '[]');
            row.materials = parseMaterials(row.materials || '[]');
        } catch (e) {
            row.tags = [];
            row.pictures = [];
            row.materials = [];
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
            price: workData.price || 0,
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
        await Works.update({
            name: updateData.name,
            description: updateData.description,
            pictures: pictures,
            tags: tags,
            materials: materials,
            price: updateData.price || 0,
            updatedAt: new Date()
        }, {
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
        } catch (e) {
            workData.tags = [];
            workData.pictures = [];
            workData.materials = [];
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

export default {
    'GET /api/works': works,
    'GET /api/worktags': works_tags,
    'GET /api/works/:id': works_detail,
    'POST /api/works/edit': works_edit,
    'POST /api/works/add': works_add,
    'POST /api/works/delete': works_delete
}