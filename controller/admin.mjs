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

export default {
    'GET /api/config/load': getConfig,
    'POST /api/config/set': setConfig,
}