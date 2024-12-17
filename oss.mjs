import OSS from 'ali-oss';
import config from 'config'

// OSS 配置
const ossClient = new OSS({
    region: config.get("oss.region"),  // 例如：'oss-cn-hangzhou'
    accessKeyId: config.get("oss.accessKeyId"),
    accessKeySecret: config.get("oss.accessKeySecret"),
    bucket: 'lilithu'
});

// 生成文件名
const generateFileName = (originalName) => {
    const ext = originalName.split('.').pop();
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `materials/${timestamp}-${random}.${ext}`;
};

// 上传文件到 OSS
export async function uploadToOSS(file) {
    try {
        const fileName = generateFileName(file.originalname);
        const result = await ossClient.put(fileName, file.buffer);
        return result.url; // 返回文件访问地址
    } catch (error) {
        console.error('OSS upload error:', error);
        throw error;
    }
}