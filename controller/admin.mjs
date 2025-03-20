import ConfigSetting from '../util/config.mjs';

// 获取评论状态
async function getConfig(ctx, next) {
    const comment = await ConfigSetting.getConfig('comment');
    ctx.body = {
        success: true,
        data: {
            comment: comment === '1' // 默认开启评论
        }
    };
}

async function setConfig(ctx, next) {
    const commentStatus = ctx.request.body.comment; // 从请求体中获取评论状态
    if (typeof commentStatus !== 'boolean') {
        ctx.status = 400;
        ctx.body = {
            success: false,
            message: '无效的评论状态，必须为布尔值'
        };
        return;
    }
    await ConfigSetting.setConfig('comment', commentStatus ? '1' : '0');
     ctx.body = {
        success: true,
        message: '评论状态更新成功'
    };
}

// 获取关于页面内容
async function getAbout(ctx, next) {
    try {
        const aboutContent = await ConfigSetting.getConfig('about');
        ctx.body = {
            success: true,
            data: {
                content: aboutContent || '' // 如果没有内容则返回空字符串
            }
        };
    } catch (error) {
        console.error('获取关于页面内容失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取关于页面内容失败'
        };
    }
}

// 设置关于页面内容
async function setAbout(ctx, next) {
    try {
        const { content } = ctx.request.body;
        
        if (typeof content !== 'string') {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '内容必须为字符串'
            };
            return;
        }
        
        await ConfigSetting.setConfig('about', content);
        
        ctx.body = {
            success: true,
            message: '关于页面内容更新成功'
        };
    } catch (error) {
        console.error('设置关于页面内容失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '设置关于页面内容失败'
        };
    }
}

export default {
    'GET /api/config/load': getConfig,
    'POST /api/config/set': setConfig,
    'GET /api/about': getAbout,
    'POST /api/admin/about': setAbout
}