import * as utils from 'utility';
import { uploadToOSS, generateSignedUrl } from '../oss.mjs';
import multer from '@koa/multer';
import config from 'config'
import { Comment} from '../orm.mjs';
import ConfigSetting from '../util/config.mjs';
import { Op } from 'sequelize';

// 配置文件上传
const upload = multer({
    limits: {
        fileSize: 200 * 1024 * 1024 // 200MB 文件大小限制
    }
});

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
        let isVideo = isVideoFile(objectName);
        let new_url = await generateSignedUrl(objectName, ctx.request.body.url, isVideo);
        ctx.body = {
            success: true,
            url: new_url
        };
    } else if (ctx.request.body.urls) {
        let urls = [];
        for (let url of ctx.request.body.urls) {
            let objectName = getObjectNameFromUrl(url);
            let isVideo = isVideoFile(objectName);
            let new_url = await generateSignedUrl(objectName, url, isVideo);
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

// 判断是否为视频文件
function isVideoFile(objectName) {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp', 'ogv'];
    const ext = objectName.split('.').pop().toLowerCase();
    return videoExtensions.includes(ext);
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

function getAuthedUserId(ctx) {
    const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id;
    return typeof id === 'number' || typeof id === 'string' ? parseInt(id, 10) : null;
}

function isAdminUser(ctx) {
    const role = ctx && ctx.state && ctx.state.user && ctx.state.user.role;
    return typeof role === 'string' && role.toLowerCase() === 'admin';
}

async function loadCommentNameMap(replyParentIds) {
    const ids = [...new Set(replyParentIds.filter((id) => id > 0))];
    if (!ids.length) return new Map();
    const parents = await Comment.findAll({
        where: { id: { [Op.in]: ids }, isDeleted: 0 },
        attributes: ['id', 'name', 'userId']
    });
    return new Map(parents.map((p) => {
        const row = p.get({ plain: true });
        return [row.id, row];
    }));
}

function applyReplyToMeta(rows, parentMap) {
    return rows.map((row) => {
        if (!row.reply || row.reply <= 0) return row;
        const parent = parentMap.get(row.reply);
        if (parent) {
            row.replyToName = parent.name;
            row.replyToUserId = parent.userId;
        }
        return row;
    });
}

function applyUnreadReplyFlags(topLevelComments, uid) {
    if (!uid) return;
    topLevelComments.forEach((parent) => {
        parent.hasUnreadReplies = (parent.replies || []).some(
            (r) =>
                r.notifyUserId != null &&
                parseInt(r.notifyUserId, 10) === uid &&
                Number(r.userRead) === 0
        );
    });
}

// POST /api/comment — 未登录仅可发顶级评论；回复必须登录
async function addComment(ctx, next) {
    const commentStatus = await ConfigSetting.getConfig('comment');
    if (commentStatus !== '1') {
        ctx.body = {
            success: false,
            message: '评论关闭'
        };
        return;
    }

    const { name: bodyName, content, type, itemId, reply } = ctx.request.body;

    if (content == null || String(content).trim() === '') {
        ctx.body = {
            success: false,
            message: '评论内容不能为空'
        };
        return;
    }

    const replyParentId = parseInt(reply, 10);
    const isReply = !Number.isNaN(replyParentId) && replyParentId > 0;

    try {
        const uid = getAuthedUserId(ctx);
        const isLoggedIn = uid != null && !Number.isNaN(uid) && uid > 0;

        if (isReply && !isLoggedIn) {
            ctx.status = 401;
            ctx.body = {
                success: false,
                message: '请先登录后再回复'
            };
            return;
        }

        let displayName;
        let userIdVal;
        let isApproved;

        if (isLoggedIn) {
            displayName =
                ctx.state.user && ctx.state.user.name != null
                    ? String(ctx.state.user.name).trim().slice(0, 64)
                    : '';
            if (!displayName) {
                ctx.body = {
                    success: false,
                    message: '无法获取用户名，请重新登录'
                };
                return;
            }
            userIdVal = uid;
            isApproved = 1;
        } else {
            displayName =
                bodyName != null ? String(bodyName).trim().slice(0, 64) : '';
            if (!displayName) {
                ctx.body = {
                    success: false,
                    message: '请填写称呼'
                };
                return;
            }
            userIdVal = null;
            isApproved = 0;
        }

        let adminReadVal = 0;
        let notifyUserId = null;
        let userReadVal = 1;

        if (isLoggedIn && isAdminUser(ctx)) {
            adminReadVal = 1;
        }

        if (isReply) {
            const parent = await Comment.findByPk(replyParentId, {
                attributes: ['id', 'name', 'userId']
            });
            if (parent) {
                const targetUid =
                    parent.userId != null && parent.userId !== ''
                        ? parseInt(parent.userId, 10)
                        : null;
                if (
                    targetUid != null &&
                    !Number.isNaN(targetUid) &&
                    targetUid > 0 &&
                    (!isLoggedIn || targetUid !== uid)
                ) {
                    notifyUserId = targetUid;
                    userReadVal = 0;
                }
            }
        }

        const comment = await Comment.create({
            name: displayName,
            content,
            type,
            itemId,
            reply: isReply ? replyParentId : 0,
            userId: userIdVal,
            isApproved,
            adminRead: adminReadVal,
            notifyUserId,
            userRead: userReadVal,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        ctx.body = {
            success: true,
            message: isLoggedIn ? '评论已发布' : '评论已提交，管理员查看后将公开展示',
            guestPending: !isLoggedIn,
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
    /** 管理列表专用：unread | read（未读 adminRead=0，已读 adminRead=1） */
    const approvalStatus = ctx.query.approval;

    // 翻页参数
    const page = parseInt(ctx.query.page) || 1; // 页码，默认为1
    const pageSize = parseInt(ctx.query.pageSize) || 10; // 每页数量，默认为10
    
    try {
        // 构建查询条件
        const whereCondition = {
            isDeleted: 0
        };
        
        // 如果提供了 itemId，添加到查询条件
        if (!isNaN(itemId)) {
            whereCondition.itemId = itemId;
        }
        
        // 如果提供了 type，添加到查询条件
        if (type) {
            whereCondition.type = type;
        }

        if (!isNaN(itemId)) {
            // 前台详情：只按「是否公开展示」筛选，与管理员未读/已读无关
            whereCondition.isApproved = 1;
        } else {
            // 管理后台：只有未读 / 已读两种（非已读即未读）
            whereCondition.adminRead = approvalStatus === 'read' ? 1 : 0;
        }

        // 管理列表（无 itemId）：仅管理员
        if (isNaN(itemId)) {
            if (!isAdminUser(ctx)) {
                ctx.status = 403;
                ctx.body = {
                    success: false,
                    message: '无权限'
                };
                return;
            }
            const offset = (page - 1) * pageSize;
            
            // 按 adminRead 分页列表（含回复行，扁平）
            const totalCount = await Comment.count({
                where: whereCondition
            });

            const allComments = await Comment.findAll({
                where: whereCondition,
                order: [['createdAt', 'DESC']],
                limit: pageSize,
                offset: offset
            });

            // 处理每一行的数据
            let formattedComments = allComments.map(comment => {
                const row = comment.get({ plain: true });
                row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt);
                return row;
            });
            const parentMap = await loadCommentNameMap(
                formattedComments.map((c) => c.reply)
            );
            formattedComments = applyReplyToMeta(formattedComments, parentMap);

            // 计算分页信息
            const totalPages = Math.ceil(totalCount / pageSize);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;

            ctx.body = {
                success: true,
                comments: formattedComments,
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    totalCount: totalCount,
                    totalPages: totalPages,
                    hasNextPage: hasNextPage,
                    hasPrevPage: hasPrevPage
                }
            };
            return;
        }

        // 如果是具体页面的评论，使用原来的逻辑
        // 首先获取所有顶级评论（不包含回复）
        const topLevelWhereCondition = { ...whereCondition, reply: 0 };
        
        // 计算偏移量
        const offset = (page - 1) * pageSize;
        
        // 获取顶级评论总数
        const totalCount = await Comment.count({
            where: topLevelWhereCondition
        });

        // 获取当前页的顶级评论
        const topLevelComments = await Comment.findAll({
            where: topLevelWhereCondition,
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: offset
        });

        // 获取这些顶级评论的所有回复（包括多层回复）
        const topLevelIds = topLevelComments.map(comment => comment.id);
        let allReplies = [];
        
        if (topLevelIds.length > 0) {
            // 递归获取所有回复
            const getAllReplies = async (parentIds) => {
                if (parentIds.length === 0) return [];
                
                const replies = await Comment.findAll({
                    where: {
                        ...whereCondition,
                        reply: { [Op.in]: parentIds }
                    },
                    order: [['createdAt', 'ASC']]
                });
                
                if (replies.length > 0) {
                    const replyIds = replies.map(reply => reply.id);
                    const nestedReplies = await getAllReplies(replyIds);
                    return [...replies, ...nestedReplies];
                }
                
                return replies;
            };
            
            allReplies = await getAllReplies(topLevelIds);
        }

        // 处理顶级评论数据
        const formattedTopLevelComments = topLevelComments.map(comment => {
            const row = comment.get({ plain: true });
            row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt);
            row.replies = []; // 初始化回复数组
            return row;
        });

        // 处理回复数据
        let formattedReplies = allReplies.map(reply => {
            const row = reply.get({ plain: true });
            row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt);
            return row;
        });

        const replyParentMap = await loadCommentNameMap(
            formattedReplies.map((r) => r.reply)
        );
        formattedReplies = applyReplyToMeta(formattedReplies, replyParentMap);

        // 将所有回复关联到对应的顶级评论
        formattedReplies.forEach(reply => {
            // 找到回复的根父评论
            let rootParentId = reply.reply;
            let currentReply = reply;
            
            // 向上查找直到找到顶级评论
            while (currentReply && currentReply.reply !== 0) {
                const parentReply = formattedReplies.find(r => r.id === currentReply.reply);
                if (parentReply) {
                    rootParentId = parentReply.reply;
                    currentReply = parentReply;
                } else {
                    break;
                }
            }
            
            // 将回复添加到对应的顶级评论
            const parentComment = formattedTopLevelComments.find(comment => comment.id === rootParentId);
            if (parentComment) {
                parentComment.replies.push(reply);
            }
        });

        const viewerUid = getAuthedUserId(ctx);
        applyUnreadReplyFlags(formattedTopLevelComments, viewerUid);

        // 计算分页信息
        const totalPages = Math.ceil(totalCount / pageSize);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        ctx.body = {
            success: true,
            comments: formattedTopLevelComments,
            pagination: {
                page: page,
                pageSize: pageSize,
                totalCount: totalCount,
                totalPages: totalPages,
                hasNextPage: hasNextPage,
                hasPrevPage: hasPrevPage
            }
        };
    } catch (error) {
        console.error('Get comments error:', error);
        console.error('Error details:', {
            itemId,
            type,
            approvalStatus,
            page,
            pageSize,
            whereCondition: JSON.stringify(whereCondition)
        });
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取评论失败'
        };
    }
}

async function loadCommentIdMap(ids) {
    const unique = [...new Set(ids.filter((id) => id > 0))];
    if (!unique.length) return new Map();
    const rows = await Comment.findAll({
        where: { id: { [Op.in]: unique }, isDeleted: 0 },
        attributes: ['id', 'name', 'content', 'userId', 'reply']
    });
    return new Map(rows.map((r) => {
        const row = r.get({ plain: true });
        return [row.id, row];
    }));
}

function findMyAncestorComment(replyRow, uid, idMap) {
    let pid = replyRow.reply;
    let depth = 0;
    while (pid && depth < 12) {
        let parent = idMap.get(pid);
        if (!parent) break;
        const ownerId =
            parent.userId != null && parent.userId !== ''
                ? parseInt(parent.userId, 10)
                : null;
        if (ownerId === uid) return parent;
        pid = parent.reply;
        depth += 1;
    }
    return null;
}

// GET /api/user/my-comments — tab=mine 我发表的；tab=replies 别人回复我的（需 JWT）
async function getMyComments(ctx, next) {
    const uid = getAuthedUserId(ctx);
    if (uid == null || Number.isNaN(uid) || uid <= 0) {
        ctx.status = 401;
        ctx.body = {
            success: false,
            message: '请先登录'
        };
        return;
    }

    const page = parseInt(ctx.query.page) || 1;
    const rawSize = parseInt(ctx.query.pageSize) || 20;
    const pageSize = Math.min(Math.max(rawSize, 1), 50);
    const offset = (page - 1) * pageSize;
    const tab = ctx.query.tab === 'replies' ? 'replies' : 'mine';

    try {
        const whereCondition =
            tab === 'replies'
                ? {
                    isDeleted: 0,
                    notifyUserId: uid,
                    userId: { [Op.ne]: uid }
                }
                : { isDeleted: 0, userId: uid };

        const totalCount = await Comment.count({ where: whereCondition });
        const rows = await Comment.findAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset
        });

        let comments = rows.map((comment) => {
            const row = comment.get({ plain: true });
            row.createdAt = utils.YYYYMMDDHHmmss(row.createdAt);
            row.listTab = tab;
            return row;
        });
        const parentMap = await loadCommentNameMap(comments.map((c) => c.reply));
        comments = applyReplyToMeta(comments, parentMap);

        if (tab === 'replies') {
            const idMap = await loadCommentIdMap(comments.map((c) => c.reply));
            parentMap.forEach((v, k) => idMap.set(k, v));
            let pending = [...new Set(comments.map((c) => c.reply).filter((id) => id > 0))];
            let depth = 0;
            while (pending.length && depth < 12) {
                const toFetch = pending.filter((id) => !idMap.has(id));
                if (toFetch.length) {
                    const more = await loadCommentIdMap(toFetch);
                    more.forEach((v, k) => idMap.set(k, v));
                }
                const next = [];
                pending.forEach((id) => {
                    const p = idMap.get(id);
                    if (p && p.reply > 0) next.push(p.reply);
                });
                pending = [...new Set(next)];
                depth += 1;
            }
            comments = comments.map((row) => {
                const mine = findMyAncestorComment(row, uid, idMap);
                const snippet = mine && mine.content
                    ? String(mine.content).trim().slice(0, 120)
                    : '';
                row.myCommentSnippet = snippet;
                row.isUnreadReply = Number(row.userRead) === 0;
                return row;
            });
        }

        const totalPages = Math.ceil(totalCount / pageSize) || 1;
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        ctx.body = {
            success: true,
            comments,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage,
                hasPrevPage
            }
        };
    } catch (error) {
        console.error('Get my comments error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取评论失败'
        };
    }
}

// GET /api/user/comment-notifications/count — 登录用户：被回复未读数；管理员：全站未读评论数
async function getCommentNotificationCount(ctx, next) {
    const uid = getAuthedUserId(ctx);
    if (uid == null || Number.isNaN(uid) || uid <= 0) {
        ctx.status = 401;
        ctx.body = { success: false, message: '请先登录' };
        return;
    }

    try {
        let count;
        if (isAdminUser(ctx)) {
            count = await Comment.count({
                where: { isDeleted: 0, adminRead: 0 }
            });
        } else {
            count = await Comment.count({
                where: {
                    isDeleted: 0,
                    notifyUserId: uid,
                    userRead: 0
                }
            });
        }
        ctx.body = { success: true, count };
    } catch (error) {
        console.error('Get comment notification count error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: '获取通知失败' };
    }
}

// POST /api/user/comment-notifications/read — 标记「回复我的」为已读（可选 type + itemId）
async function markCommentNotificationsRead(ctx, next) {
    const uid = getAuthedUserId(ctx);
    if (uid == null || Number.isNaN(uid) || uid <= 0) {
        ctx.status = 401;
        ctx.body = { success: false, message: '请先登录' };
        return;
    }

    const body = (ctx && ctx.request && ctx.request.body) || {};
    const where = {
        isDeleted: 0,
        notifyUserId: uid,
        userRead: 0
    };
    const type = parseInt(body.type, 10);
    const itemId = parseInt(body.itemId, 10);
    if (!Number.isNaN(type) && type > 0) where.type = type;
    if (!Number.isNaN(itemId) && itemId > 0) where.itemId = itemId;

    try {
        await Comment.update(
            { userRead: 1, updatedAt: new Date() },
            { where }
        );
        ctx.body = { success: true };
    } catch (error) {
        console.error('Mark comment notifications read error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: '操作失败' };
    }
}

async function deleteComment(ctx, next) {
    const id = parseInt(ctx.request.body.id);
    const uid = getAuthedUserId(ctx);
    const updateData = {
        isDeleted: 1
    };

    try {
        const comment = await Comment.findByPk(id);
        if (!comment) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '评论不存在'
            };
            return;
        }

        const admin = isAdminUser(ctx);
        if (!admin) {
            const ownerId =
                comment.userId != null && comment.userId !== ''
                    ? parseInt(comment.userId, 10)
                    : null;
            if (!uid || ownerId == null || Number.isNaN(ownerId) || ownerId !== uid) {
                ctx.status = 403;
                ctx.body = {
                    success: false,
                    message: '无权限删除该评论'
                };
                return;
            }
        }

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

// 管理员：标记已读（游客评论同时公开展示；不需要的内容请用删除）
async function approveComment(ctx, next) {
    if (!isAdminUser(ctx)) {
        ctx.status = 403;
        ctx.body = {
            success: false,
            message: '无权限'
        };
        return;
    }

    const id = parseInt(ctx.request.body.id);

    try {
        const comment = await Comment.findByPk(id);
        if (!comment) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '评论不存在'
            };
            return;
        }

        const updates = { adminRead: 1, updatedAt: new Date() };
        if (comment.isApproved === 0) {
            updates.isApproved = 1;
        }
        await Comment.update(updates, { where: { id } });
        ctx.body = {
            success: true,
            message: '已标记为已读'
        };
    } catch (error) {
        console.error('Approve comment error:', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '操作失败'
        };
    }
}

export default {
    'POST /api/upload': [upload.single('file'), uploadFile],
    'POST /api/oss-refresh': refreshSignedUrl,
    'GET /api/comments/:itemId': getComments,
    'GET /api/comments': getComments,
    'GET /api/user/my-comments': getMyComments,
    'GET /api/user/comment-notifications/count': getCommentNotificationCount,
    'POST /api/user/comment-notifications/read': markCommentNotificationsRead,
    'POST /api/comment': addComment,
    'POST /api/comment_delete': deleteComment,
    'POST /api/comment_approve': approveComment
}