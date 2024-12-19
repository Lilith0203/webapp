import OSS from 'ali-oss';
import config from 'config'

// OSS 配置
const ossClient = new OSS({
    region: config.get("oss.region"),  // 例如：'oss-cn-hangzhou'
    accessKeyId: config.get("oss.accessKeyId"),
    accessKeySecret: config.get("oss.accessKeySecret"),
    bucket: config.get("oss.bucket")
});

// 生成文件名
const generateDefaultPath = (originalName) => {
    const ext = originalName.split('.').pop();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `default/${timestamp}-${random}.${ext}`;
};

// 上传文件到 OSS
export async function uploadToOSS(file, filePath) {
    try {
        // 使用传入的文件路径，如果没有则生成默认路径
        const ossPath = filePath || generateDefaultPath(file.originalname);

        const result = await ossClient.put(ossPath, file.buffer);

        // 使用配置的自定义域名替换默认的OSS域名
        const customDomain = config.get("oss.customDomain");
        const url = result.url.replace(
            /^http?:\/\/[^\/]+/,
            customDomain.startsWith('http') ? customDomain : `http://${customDomain}`
        );
        return url; // 返回文件访问地址
    } catch (error) {
        console.error('OSS upload error:', error);
        throw error;
    }
}