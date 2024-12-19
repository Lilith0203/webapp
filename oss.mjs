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

// 生成带签名的URL
async function generateSignedUrl(objectName) {
    try {
        // 生成带签名的URL，设置15分钟有效期
        const url = await ossClient.signatureUrl(objectName, {
            expires: 900, // 15分钟，单位秒
            process: 'image/resize,w_800' // 限制图片最大宽度为800px
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

// 刷新或获取图片URL
export async function refreshImageUrl(objectName) {
    return await generateSignedUrl(objectName);
};