import Koa from 'koa';
import jwt from 'koa-jwt';
//import mount from 'koa-mount';
import serve from 'koa-static';
//import session from 'koa-session';
import { fileURLToPath} from 'url';
import { dirname, join } from 'path';
import {promises as fs} from 'fs';
import { bodyParser } from '@koa/bodyparser';
import cors from '@koa/cors';
import multer from '@koa/multer';

import controller from './controller.mjs';
//import templateEngine from './view.mjs';
import { sequelize, User } from './orm.mjs';
import sslConfig from './util/ssh.mjs';
import http from 'http';

const isProduction = process.env.NODE_ENV === 'production';
//添加 JWT 密钥配置
const JWT_SECRET = process.env.JWT_SECRET || "my-secret-key"
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//const session_signed_key = ["secret lily"]
//const session_config = {
//    key: 'koa.sess',     /**  cookie的key。 (默认是 koa:sess) */
//    maxAge: 86400000,    //单位毫秒，1天
//    overwrite: true,      /** 是否允许重写 。(默认是 true) */
//    httpOnly: true,     /** 是否设置HttpOnly，如果在Cookie中设置了"HttpOnly"属性，那么通过程序(JS脚本、Applet等)将无法读取到Cookie信息，这样能有效的防止XSS攻击。  (默认 true) */
//    signed: session_signed_key,
//    rolling: true   /** 是否每次响应时刷新Session的有效期。(默认是 false) */
//}
//创建一个koa实例表示webapp本身
const app = new Koa();
//const session1 = session(session_config, app)
//app.keys = session_signed_key;
//app.use(session1)

app.use(serve(join(__dirname, 'view')))

/*
app.context.render = function (view, model) {
    this.response.type = 'text/html; charset=utf-8';
    this.response.body = templateEngine.render(view, Object.assign({}, this.state || {}, model || {}));
}*/

async function initDb() {
    await sequelize.sync();
}
await initDb();

// 绑定db到app.context:
app.context.db = await initDb();

app.use(async (ctx, next) => {
    await fs.readFile(join(__dirname, 'view', 'index.html'))
    .then(content => {
      ctx.type = 'html'
      ctx.body = content
    })
    .catch(err => {
      ctx.status = 500
      ctx.body = 'Error loading index.html'
    })//console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
    await next();
})

//app.use(mount('/static', serve('static')));

//处理跨域
app.use(cors());
//解析request.body:
app.use(bodyParser());

//添加 JWT 错误处理中间件
app.use(async (ctx, next) => {
  return next().catch((err) => {
      if (err.status === 401) {
          ctx.status = 401;
          ctx.body = {
              success: false,
              message: '未授权，请登录'
          };
      } else {
          throw err;
      }
  });
});

// 添加 JWT 中间件，排除不需要验证的路径
app.use(jwt({ 
  secret: JWT_SECRET 
}).unless({ 
  custom: (ctx) => {
    // 需要JWT验证的路径
    const protectedPaths = [
        '/api/articleAdd',
        '/api/article/edit',
        '/api/article/delete',
        '/api/updateMaterialType', 
        '/api/addMaterialType', 
        '/api/deleteMaterialType',
        '/api/updateMaterial',
        '/api/addMaterial',
        '/api/deleteMaterial',
        '/api/grid/save',
        '/api/grid/delete',
        '/api/upload',
        '/api/works/edit',
        '/api/works/add',
        '/api/works/delete'
    ];
    
    // 检查当前路径是否需要保护
    return !protectedPaths.some(path => ctx.path.startsWith(path));
  }
}));

// 添加文件上传错误处理
app.use(async (ctx, next) => {
  try {
      await next();
  } catch (err) {
      if (err instanceof multer.MulterError) {
          ctx.status = 400;
          ctx.body = {
              success: false,
              message: '文件上传错误: ' + err.message
          };
      } else {
          throw err;
      }
  }
});

//使用controller()
app.use(await controller());

// 启动服务器
async function startServer() {
  try {
        // 启动 HTTP 服务器（80端口）
        //app.listen(80, () => {
        //    console.log('HTTP Server running on http://localhost:80');
        //});
        
      // 加载 SSL 证书
      if (sslConfig.loadCertificates()) {
          // 创建 HTTPS 服务器（443端口）
          const httpsServer = sslConfig.createHttpsServer(app);
          httpsServer.listen(443, () => {
              console.log('HTTPS Server running on https://localhost:443');
          });

          // 创建 HTTP 服务器并重定向到 HTTPS（80端口）
          http.createServer((req, res) => {
              res.writeHead(301, {
                  'Location': 'https://' + req.headers.host.split(':')[0] + ':443' + req.url
              });
              res.end();
          }).listen(80, () => {
              console.log('HTTP Server redirecting to HTTPS');
          });
      } else {
          // SSL 证书加载失败，仅启动 HTTP 服务器
          console.warn('SSL证书加载失败，使用HTTP模式');
          app.listen(80, () => {
              console.log('HTTP Server running on http://localhost:80');
          });
      }
  } catch (error) {
      console.error('服务器启动失败:', error);
      process.exit(1);
  }
}

// 启动服务器
startServer();

// 优雅退出
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，准备关闭服务器');
  process.exit(0);
});