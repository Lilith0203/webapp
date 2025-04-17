import OSS from 'ali-oss';
import config from 'config'
import crypto from 'crypto';

// OSS 配置
const ossClient = new OSS({
    region: config.get("oss.region"),  // 例如：'oss-cn-hangzhou'
    accessKeyId: config.get("oss.accessKeyId"),
    accessKeySecret: config.get("oss.accessKeySecret"),
    bucket: config.get("oss.bucket")
});

/**
 * 从URL中提取图片处理参数
 * @param {string} url OSS URL
 * @returns {string|null} 图片处理参数
 */
function extractImageProcess(url) {
    try {
        const urlObj = new URL(url);
        const process = urlObj.searchParams.get('x-oss-process');
        return process;
    } catch (error) {
        console.error('Extract image process error:', error);
        return null;
    }
}

/**
 * 刷新或获取图片URL
 * @param {string} objectName OSS对象名称
 * @param {string} originalUrl 原始URL（可选，用于获取图片处理参数）
 * @returns {Promise<string>} 带签名的新URL
 */
export async function generateSignedUrl(objectName, originalUrl = '') {
    try {
        // 从原始URL中提取图片处理参数
        let process = originalUrl ? extractImageProcess(originalUrl) : 'image/resize,w_2400';
        // 生成带签名的URL，设置1小时有效期
        const url = await ossClient.signatureUrl(objectName, {
            expires: 3600, // 1小时，单位秒
            process: process ? process : 'image/resize,w_2400'
        });
        
        const customDomain = config.get("oss.customDomain");
        return url.replace(
            /^http?:\/\/[^\/]+/,
            customDomain.startsWith('http') ? customDomain : `http://${customDomain}`
        );
    } catch (error) {
        console.error('Generate signed URL error:', error);
        throw error;
    }
}

// 生成文件名
const generateDefaultPath = (originalName, hash) => {
    const ext = originalName.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    return `default/${timestamp}-${hash}.${ext}`;
};

// 上传文件到 OSS
export async function uploadToOSS(file, filePath) {
    try {
        // 生成文件hash作为文件名的一部分，防止重复
        const hash = crypto.createHash('md5')
            .update(file.buffer)
            .digest('hex')
            .substring(0, 8);
            
        // 使用传入的文件路径，如果没有则生成默认路径
        const ossPath = filePath || generateDefaultPath(file.originalname, hash);

        // 设置文件元数据和访问控制
        const options = {
            headers: {
                'Content-Type': file.mimetype,
                'x-oss-object-acl': 'private', // 设置为私有访问
                'Cache-Control': 'no-cache', // 禁止缓存
                'x-oss-storage-class': 'Standard' // 使用标准存储
            }
        };

        await ossClient.put(ossPath, file.buffer, options);

        // 返回带签名的URL
        return await generateSignedUrl(ossPath);
    } catch (error) {
        console.error('OSS upload error:', error);
        throw error;
    }
}

/**
 * 清理 OSS URL，移除签名参数
 * @param {string} url OSS URL
 * @returns {string} 清理后的 URL
 */
export function cleanOssUrl(url) {
    try {
        if (!url) return '';
        
        // 解析 URL
        const urlObj = new URL(url);

        // 保存图片处理参数
        const process = urlObj.searchParams.get('x-oss-process');
        
        // 移除签名相关参数
        const paramsToRemove = ['Expires', 'OSSAccessKeyId', 'Signature', 'security-token'];
        paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
        
        // 如果有图片处理参数，添加回去
        if (process) {
            urlObj.searchParams.set('x-oss-process', process);
        }

        // 如果是自定义域名，直接返回清理后的 URL
        const customDomain = config.get("oss.customDomain");
        if (customDomain) {
            return urlObj.toString().replace(
                /^http?:\/\/[^\/]+/,
                customDomain.startsWith('http') ? customDomain : `http://${customDomain}`
            );
        }

        // 如果是自定义域名，直接返回清理后的 URL
        return urlObj.toString();
    } catch (error) {
        console.error('Clean OSS URL error:', error);
        return url; // 如果处理失败，返回原始 URL
    }
}

/**
 * 批量清理 OSS URL
 * @param {object} data 包含 URL 的对象或数组
 * @param {string[]} fields 需要处理的字段名数组
 * @returns {object} 处理后的对象
 */
export function cleanOssUrls(data, fields) {
    if (!data) return data;

    // 处理数组
    if (Array.isArray(data)) {
        return data.map(item => cleanOssUrl(item));
    }

    // 处理对象
    if (typeof data === 'object') {
        const cleaned = { ...data };
        fields.forEach(field => {
            if (cleaned[field]) {
                cleaned[field] = cleanOssUrl(cleaned[field]);
            }
        });
        return cleaned;
    }

    return data;
}