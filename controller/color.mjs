import { Color } from '../orm.mjs'
import { Op } from 'sequelize'
import { getAdminUserIds } from '../util/workOwnerScope.mjs'

const USER_COLOR_CATEGORIES = [3, 4]

function getAuthedUserId(ctx) {
    const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id;
    return typeof id === 'number' || typeof id === 'string' ? parseInt(id, 10) : null;
}

function isAdmin(ctx) {
    return (ctx && ctx.state && ctx.state.user && ctx.state.user.role) === 'admin';
}

function requireAuth(ctx) {
    const userId = getAuthedUserId(ctx);
    if (!userId) {
        ctx.status = 401;
        ctx.body = { success: false, message: '未授权，请登录' };
        return null;
    }
    return userId;
}

function requireAdmin(ctx) {
    if (!isAdmin(ctx)) {
        ctx.status = 403;
        ctx.body = { success: false, message: '无权限：仅管理员可操作' };
        return false;
    }
    return true;
}

function parseCategory(category) {
    const cat = parseInt(category, 10);
    return Number.isFinite(cat) ? cat : null;
}

function canUserManageCategory(ctx, category) {
    if (isAdmin(ctx)) return true;
    const cat = parseCategory(category);
    return !!getAuthedUserId(ctx) && USER_COLOR_CATEGORIES.includes(cat);
}

function ownerWhere(ctx, userId) {
    return isAdmin(ctx) ? {} : { userId };
}

// POST /api/color/add - 添加颜色
async function addColor(ctx, next) {
    const userId = requireAuth(ctx);
    if (!userId) return;
    const { category, set, name, code } = ctx.request.body;

    if (!canUserManageCategory(ctx, category)) {
        ctx.status = 403;
        ctx.body = { success: false, message: '无权限：仅可管理格子图颜色与收藏颜色' };
        return;
    }

    // 验证输入
    if (!category || !code) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '类别和颜色代码不能为空'
        };
        return;
    }

    // 验证颜色值格式（十六进制颜色代码）
    if (!/^#[0-9A-Fa-f]{6}$/.test(code)) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '无效的颜色代码格式，请使用十六进制颜色代码（例如：#FF0000）'
        };
        return;
    }

    try {
        // 创建新颜色
        const newColor = await Color.create({
            userId,
            category,
            set,
            name,
            code,
            isDeleted: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        ctx.body = {
            success: true,
            message: '颜色添加成功',
            data: {
                id: newColor.id,
                category: newColor.category,
                set: newColor.set,
                name: newColor.name,
                code: newColor.code,
                createdAt: newColor.createdAt,
                updatedAt: newColor.updatedAt
            }
        };
    } catch (error) {
        console.error('添加颜色失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '添加颜色失败'
        };
    }
}

// GET /api/colors - 获取颜色列表
async function getColors(ctx, next) {
    try {
        const { category, mine } = ctx.query;
        const userId = getAuthedUserId(ctx);
        const whereCondition = { isDeleted: 0 };

        const mineOnly = mine === '1' || mine === 'true';

        if (mineOnly) {
            if (!userId) {
                ctx.body = { success: true, data: [] };
                return;
            }
            whereCondition.userId = userId;
            if (category !== undefined) {
                whereCondition.category = parseCategory(category);
            } else {
                whereCondition.category = { [Op.in]: USER_COLOR_CATEGORIES };
            }
        } else if (!isAdmin(ctx)) {
            const cat = category !== undefined ? parseCategory(category) : null;
            if (cat === 3 || cat === 4) {
                if (!userId) {
                    ctx.body = { success: true, data: [] };
                    return;
                }
                whereCondition.userId = userId;
                whereCondition.category = cat;
            } else {
                const adminIds = await getAdminUserIds();
                whereCondition.userId = { [Op.in]: adminIds.length ? adminIds : [-1] };
                if (cat !== null) {
                    whereCondition.category = cat;
                }
            }
        } else if (category !== undefined) {
            whereCondition.category = parseCategory(category);
        }

        const colors = await Color.findAll({
            where: whereCondition,
            order: [['updatedAt', 'DESC']]
        });

        // 处理每一行的数据
        const formattedColors = colors.map(color => {
            const row = color.get({ plain: true });
            return {
                id: row.id,
                category: row.category,
                set: row.set,
                name: row.name,
                code: row.code,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
        });

        ctx.body = {
            success: true,
            data: formattedColors
        };
    } catch (error) {
        console.error('获取颜色列表失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取颜色列表失败'
        };
    }
}

// POST /api/color/delete - 删除颜色
async function deleteColor(ctx, next) {
    const userId = requireAuth(ctx);
    if (!userId) return;
    const { id } = ctx.request.body;

    if (!id) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '缺少颜色ID'
        };
        return;
    }

    try {
        const color = await Color.findOne({
            where: {
                id: id,
                isDeleted: 0
            }
        });

        if (!color) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '颜色不存在或已被删除'
            };
            return;
        }

        if (!canUserManageCategory(ctx, color.category)) {
            ctx.status = 403;
            ctx.body = { success: false, message: '无权限操作该颜色' };
            return;
        }

        if (!isAdmin(ctx) && parseInt(color.userId, 10) !== userId) {
            ctx.status = 403;
            ctx.body = { success: false, message: '无权限：只能删除自己的颜色' };
            return;
        }

        // 软删除颜色
        await Color.update(
            { 
                isDeleted: 1,
                updatedAt: new Date()
            },
            {
                where: {
                    id: id,
                    ...(isAdmin(ctx) ? {} : { userId })
                }
            }
        );

        ctx.body = {
            success: true,
            message: '颜色删除成功'
        };
    } catch (error) {
        console.error('删除颜色失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除颜色失败'
        };
    }
}

// POST /api/color/edit - 编辑颜色
async function editColor(ctx, next) {
    const userId = requireAuth(ctx);
    if (!userId) return;
    const { id, set, name, code } = ctx.request.body;

    // 验证输入
    if (!id || !code) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: 'ID和颜色代码不能为空'
        };
        return;
    }

    // 验证颜色值格式（十六进制颜色代码）
    if (!/^#[0-9A-Fa-f]{6}$/.test(code)) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '无效的颜色代码格式，请使用十六进制颜色代码（例如：#FF0000）'
        };
        return;
    }

    try {
        // 检查颜色是否存在
        const existingColor = await Color.findOne({
            where: {
                id: id,
                isDeleted: 0
            }
        });

        if (!existingColor) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '颜色不存在或已被删除'
            };
            return;
        }

        if (!canUserManageCategory(ctx, existingColor.category)) {
            ctx.status = 403;
            ctx.body = { success: false, message: '无权限操作该颜色' };
            return;
        }

        if (!isAdmin(ctx) && parseInt(existingColor.userId, 10) !== userId) {
            ctx.status = 403;
            ctx.body = { success: false, message: '无权限：只能编辑自己的颜色' };
            return;
        }

        await Color.update(
            {
                set,
                name,
                code,
                updatedAt: new Date()
            },
            {
                where: {
                    id: id,
                    ...ownerWhere(ctx, userId)
                }
            }
        );

        // 获取更新后的颜色数据
        const updatedColor = await Color.findOne({
            where: {
                id: id
            }
        });

        ctx.body = {
            success: true,
            message: '颜色更新成功',
            data: {
                id: updatedColor.id,
                category: updatedColor.category,
                set: updatedColor.set,
                name: updatedColor.name,
                code: updatedColor.code,
                createdAt: updatedColor.createdAt,
                updatedAt: updatedColor.updatedAt
            }
        };
    } catch (error) {
        console.error('更新颜色失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '更新颜色失败'
        };
    }
}

// POST /api/color/update-set - 更新颜色合集
async function updateColorSet(ctx, next) {
    const userId = requireAuth(ctx);
    if (!userId) return;
    const { category, oldSet, colors } = ctx.request.body;

    if (!canUserManageCategory(ctx, category)) {
        ctx.status = 403;
        ctx.body = { success: false, message: '无权限：仅可管理格子图颜色与收藏颜色' };
        return;
    }

    // 验证输入
    if (!category || !oldSet || !colors || !Array.isArray(colors)) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '类别、原合集名称和颜色数组不能为空'
        };
        return;
    }

    try {
        // 验证所有颜色代码格式
        for (const color of colors) {
            if (!color.code || !/^#[0-9A-Fa-f]{6}$/.test(color.code)) {
                ctx.status = 400;
                ctx.body = {
                    success: false,
                    message: `颜色 ${color.name || ''} 的代码格式无效，请使用十六进制颜色代码（例如：#FF0000）`
                };
                return;
            }
        }

        // 检查颜色代码是否有重复
        const colorCodes = colors.map(c => c.code);
        const uniqueColorCodes = new Set(colorCodes);
        if (colorCodes.length !== uniqueColorCodes.size) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '颜色代码不能重复'
            };
            return;
        }

        const existingColors = await Color.findAll({
            where: {
                category,
                set: oldSet,
                isDeleted: 0,
                ...ownerWhere(ctx, userId)
            }
        });

        // 获取新提交的颜色ID列表
        const newColorIds = colors.filter(c => c.id).map(c => c.id);

        // 找出需要删除的颜色（在原合集中存在但新提交的列表中不存在的颜色）
        const colorsToDelete = existingColors.filter(
            color => !newColorIds.includes(color.id)
        );

        // 软删除不再需要的颜色
        for (const color of colorsToDelete) {
            await Color.update(
                {
                    isDeleted: 1,
                    updatedAt: new Date()
                },
                {
                    where: {
                        id: color.id
                    }
                }
            );
        }

        // 批量更新或创建颜色
        for (const color of colors) {
            if (color.id) {
                await Color.update(
                    {
                        category,
                        set: color.set,
                        name: color.name,
                        code: color.code,
                        updatedAt: new Date()
                    },
                    {
                        where: {
                            id: color.id,
                            isDeleted: 0,
                            ...ownerWhere(ctx, userId)
                        }
                    }
                );
            } else {
                // 创建新颜色
                await Color.create({
                    userId,
                    category,
                    set: color.set,
                    name: color.name,
                    code: color.code,
                    isDeleted: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }

        // 获取更新后的颜色列表
        const updatedColors = await Color.findAll({
            where: {
                category,
                set: colors[0].set,
                isDeleted: 0,
                ...ownerWhere(ctx, userId)
            },
            order: [['updatedAt', 'DESC']]
        });

        ctx.body = {
            success: true,
            message: '颜色合集更新成功',
            data: updatedColors.map(color => ({
                id: color.id,
                category: color.category,
                set: color.set,
                name: color.name,
                code: color.code,
                createdAt: color.createdAt,
                updatedAt: color.updatedAt
            }))
        };
    } catch (error) {
        console.error('更新颜色合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '更新颜色合集失败'
        };
    }
}

// POST /api/color/delete-set - 删除颜色合集
async function deleteColorSet(ctx, next) {
    const userId = requireAuth(ctx);
    if (!userId) return;
    const { category, set } = ctx.request.body;

    if (!canUserManageCategory(ctx, category)) {
        ctx.status = 403;
        ctx.body = { success: false, message: '无权限：仅可管理格子图颜色与收藏颜色' };
        return;
    }

    // 验证输入
    if (!category || !set) {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '类别和合集名称不能为空'
        };
        return;
    }

    try {
        // 检查合集是否存在
        const existingColors = await Color.findAll({
            where: {
                category,
                set,
                isDeleted: 0,
                ...ownerWhere(ctx, userId)
            }
        });

        if (existingColors.length === 0) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '颜色合集不存在或已被删除'
            };
            return;
        }

        await Color.update(
            {
                isDeleted: 1,
                updatedAt: new Date()
            },
            {
                where: {
                    category,
                    set,
                    isDeleted: 0,
                    ...ownerWhere(ctx, userId)
                }
            }
        );

        ctx.body = {
            success: true,
            message: '颜色合集删除成功',
            data: {
                deletedCount: existingColors.length
            }
        };
    } catch (error) {
        console.error('删除颜色合集失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除颜色合集失败'
        };
    }
}

// 更新导出的接口
export default {
    'GET /api/colors': getColors,
    'POST /api/color/delete': deleteColor,
    'POST /api/color/add': addColor,
    'POST /api/color/edit': editColor,
    'POST /api/color/update-set': updateColorSet,
    'POST /api/color/delete-set': deleteColorSet
};
