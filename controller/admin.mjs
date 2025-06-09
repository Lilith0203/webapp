import ConfigSetting from '../util/config.mjs';

// 获取配置
async function getConfig(ctx, next) {
    // 获取请求中的keys参数，允许客户端指定要获取的配置项
    const requestedKeys = ctx.query.keys ? ctx.query.keys.split(',') : ['comment'];
    
    // 创建结果对象
    const result = {};
    
    // 获取每个请求的配置项
    for (const key of requestedKeys) {
        // 从数据库获取配置值
        const value = await ConfigSetting.getConfig(key);
        result[key] = value;
    }
    
    // 如果没有特别请求，默认包含comment配置
    if (!ctx.query.keys || requestedKeys.includes('comment')) {
        result.comment = (await ConfigSetting.getConfig('comment')) === '1'; 
    }
    
    ctx.body = {
        success: true,
        data: result
    };
}

async function setConfig(ctx, next) {
    const configData = ctx.request.body;
    
    try {
        // 遍历所有提交的配置项
        for (const [key, value] of Object.entries(configData)) {
            if (key === 'comment') {
                // 特殊处理评论状态，确保它是布尔值并转换为'0'或'1'
                if (typeof value !== 'boolean') {
                    ctx.status = 400;
                    ctx.body = {
                        success: false,
                        message: '无效的评论状态，必须为布尔值'
                    };
                    return;
                }
                await ConfigSetting.setConfig(key, value ? '1' : '0');
            } else {
                // 其他配置项按原样保存
                await ConfigSetting.setConfig(key, value.toString());
            }
        }
        
        ctx.body = {
            success: true,
            message: '配置更新成功'
        };
    } catch (error) {
        console.error('更新配置失败:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '更新配置失败'
        };
    }
}

export default {
    'GET /api/config/load': getConfig,
    'POST /api/config/set': setConfig
}