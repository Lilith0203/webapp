import * as utils from 'utility';
import { uploadToOSS, generateSignedUrl } from '../oss.mjs';
import multer from '@koa/multer';
import config from 'config'
import { Comment} from '../orm.mjs';
import ConfigSetting from '../util/config.mjs';

// 配置文件上传
const upload = multer();

// 文件上传处理
async function uploadFile(ctx, next) {
    try {
        const file = ctx.request.file;
        const folder = ctx.request.body.folder || 'default';

        // 验证文件夹路径
        if (!/^[a-zA-Z0-9_\/-]+$/.test(folder)) {
            throw new Error('无效的文件夹路径');
        }

        // 生成文件名
        const fileName = generateFileName(file.originalname);
        // 组合完整的文件路径
        const filePath = `${folder.replace(/^\/+|\/+$/g, '')}/${fileName}`;

        const url = await uploadToOSS(file, filePath);
        
        ctx.body = {
            success: true,
            url: url
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '文件上传失败: ' + error.message
        };
    }
}

async function refreshSignedUrl(ctx, next) {
    if (ctx.request.body.url) {
        let objectName = getObjectNameFromUrl(ctx.request.body.url);
        let new_url = await generateSignedUrl(objectName, ctx.request.body.url);
        ctx.body = {
            success: true,
            url: new_url
        };
    } else if (ctx.request.body.urls) {
        let urls = [];
        for (let url of ctx.request.body.urls) {
            let objectName = getObjectNameFromUrl(url);
            let new_url = await generateSignedUrl(objectName, url);
            urls.push(new_url);
        }
        ctx.body = {
            urls
        };
    } else {
        ctx.body = {
            success: false,
            message: '参数错误'
        };
    }
}

// 生成文件名
function generateFileName(originalName) {
    const ext = originalName.split('.').pop();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${timestamp}-${random}.${ext}`;
}

// 从完整URL中提取objectName
function getObjectNameFromUrl(url) {
    try {
        const customDomain = config.get("oss.customDomain");
        // 移除协议前缀
        const domainPattern = customDomain.replace(/^https?:\/\//, '');
        
        // 创建正则表达式来匹配域名
        const regex = new RegExp(`^http?://${domainPattern}/(.+?)(?:\\?|$)`);
        const match = url.match(regex);
        
        if (match && match[1]) {
            // URL解码以处理可能的中文或特殊字符
            return decodeURIComponent(match[1]);
        }
        
        // 如果无法匹配自定义域名，尝试匹配默认OSS域名
        const ossRegex = /^https?:\/\/[^/]+\/(.+?)(?:\?|$)/;
        const ossMatch = url.match(ossRegex);
        
        if (ossMatch && ossMatch[1]) {
            return decodeURIComponent(ossMatch[1]);
        }
        
        throw new Error('Invalid OSS URL format');
    } catch (error) {
        console.error('Error extracting objectName from URL:', error);
        throw error;
    }
}

// POST /api/comment
async function addComment(ctx, next) {
    const commentStatus = await ConfigSetting.getConfig('comment');
    if (commentStatus !== '1') {
        ctx.body = {
            success: false,
            message: '评论关闭'
        };
        return;
    }
    const { name, content, type, itemId, reply } = ctx.request.body;

    try {
        // 创建新评论
        const comment = await Comment.create({
            name,
            content,
            type,
            itemId,
            reply,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        ctx.body = {
            success: true,
            message: '评论成功',
            data: {
                comment
            }
        };
    } catch (error) {
        console.error('Add comment error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '评论失败'
        };
    }
}

// GET /api/comments/:itemId
async function getComments(ctx, next) {
    const itemId = parseInt(ctx.params.itemId);
    const type = ctx.query.type; // 文章或作品类型

    try {
        const comments = await Comment.findAll({
            where: {
                itemId: itemId,
                type: type,
                isDeleted: 0
            },
            order: [['createdAt', 'DESC']]
        });

        // 处理每一行的数据
        const formattedComments = comments.map(comment => {
            const row = comment.get({ plain: true });
            row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt); // 格式化时间
            return row;
        });

        // 组织评论和回复
        const commentsMap = {};
        formattedComments.forEach(comment => {
            if (!comment.reply) {
                // 顶级评论
                comment.replies = []; // 初始化回复数组
                commentsMap[comment.id] = comment; // 将顶级评论存入 map
            } else {
                // 回复评论
                const parentComment = commentsMap[comment.reply];
                if (parentComment) {
                    parentComment.replies.push(comment); // 将回复添加到对应的顶级评论
                }
            }
        });

        // 只返回顶级评论
        const topLevelComments = Object.values(commentsMap);

        ctx.body = {
            success: true,
            comments: topLevelComments
        };
    } catch (error) {
        console.error('Get comments error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取评论失败'
        };
    }
}

async function deleteComment(ctx, next) {
    const id = parseInt(ctx.request.body.id);
    const updateData = {
        isDeleted: 1
    };
    
    try {
        // 查找文章
        const comment = await Comment.findByPk(id);
        if (!comment) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '评论不存在'
            };
            return;
        }

        // 更新文章
        await Comment.update(updateData, {
            where: { id: id }
        });

        ctx.body = {
            success: true,
            message: '评论删除成功'
        };
    } catch (error) {
        console.error('Update comment error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '评论删除失败'
        };
    }
}

export default {
    'POST /api/upload': [upload.single('file'), uploadFile],
    'POST /api/oss-refresh': refreshSignedUrl,
    'GET /api/comments/:itemId': getComments,
    'POST /api/comment': addComment,
    'POST /api/comment_delete': deleteComment
}