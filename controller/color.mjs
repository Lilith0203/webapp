import { Color } from '../orm.mjs'
import { Op } from 'sequelize'

// POST /api/color/add - 添加颜色
async function addColor(ctx, next) {
    const { category, set, name, code } = ctx.request.body;

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
        // 获取查询参数
        const { category } = ctx.query;

        // 构建查询条件
        const whereCondition = {
            isDeleted: 0
        };

        // 如果指定了类别，添加到查询条件中
        if (category !== undefined) {
            whereCondition.category = category;
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
        // 检查颜色是否存在
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

        // 软删除颜色
        await Color.update(
            { 
                isDeleted: 1,
                updatedAt: new Date()
            },
            {
                where: {
                    id: id
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

        // 更新颜色
        await Color.update(
            {
                set,
                name,
                code,
                updatedAt: new Date()
            },
            {
                where: {
                    id: id
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
    const { category, oldSet, colors } = ctx.request.body;

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

        // 获取原合集中的所有颜色
        const existingColors = await Color.findAll({
            where: {
                category,
                set: oldSet,
                isDeleted: 0
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
                // 更新已存在的颜色
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
                            isDeleted: 0
                        }
                    }
                );
            } else {
                // 创建新颜色
                await Color.create({
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
                set: colors[0].set, // 使用新的合集名称
                isDeleted: 0
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
    const { category, set } = ctx.request.body;

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
                isDeleted: 0
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

        // 软删除整个合集的颜色
        await Color.update(
            {
                isDeleted: 1,
                updatedAt: new Date()
            },
            {
                where: {
                    category,
                    set,
                    isDeleted: 0
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
