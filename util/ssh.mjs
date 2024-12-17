import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SSLConfig {
    constructor() {
        this.sslOptions = null;
    }

    // 加载 SSL 证书
    loadCertificates() {
        try {
            // 读取密钥和证书文件
            const privateKey = fs.readFileSync(path.join(__dirname, '../ssl/lilithu.com.key'), 'utf8');
            const certificate = fs.readFileSync(path.join(__dirname, '../ssl/lilithu.com.pem'), 'utf8');

            this.sslOptions = {
                key: privateKey,
                cert: certificate,
                // 添加 SSL/TLS 安全选项
                minVersion: 'TLSv1.2',
                ciphers: [
                    'ECDHE-ECDSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-ECDSA-AES256-GCM-SHA384',
                    'ECDHE-RSA-AES256-GCM-SHA384'
                ].join(':')
            };

            return true;
        } catch (error) {
            console.error('SSL证书加载失败:', error);
            return false;
        }
    }

    // 创建 HTTPS 服务器
    createHttpsServer(app) {
        if (!this.sslOptions) {
            throw new Error('SSL证书未加载');
        }

        return https.createServer(this.sslOptions, app.callback());
    }
}

// 创建单例
export default new SSLConfig();