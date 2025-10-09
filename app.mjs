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
app.use(bodyParser({
    jsonLimit: '200mb',
    textLimit: '200mb',
    formLimit: '200mb'
}));

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

// 添加 JWT 中间件，排除不需要验证的路径和方法
app.use(jwt({ 
  secret: JWT_SECRET 
}).unless({ 
  custom: (ctx) => {
    // 需要JWT验证的路径和方法组合
    const protectedRoutes = [
        { path: '/api/config/set', methods: ['POST'] },
        { path: '/api/articleAdd', methods: ['POST'] },
        { path: '/api/article/edit', methods: ['POST'] },
        { path: '/api/article/delete', methods: ['POST'] },
        { path: '/api/color/delete', methods: ['POST'] },
        { path: '/api/color/add', methods: ['POST'] },
        { path: '/api/color/edit', methods: ['POST'] },
        { path: '/api/color/update-set', methods: ['POST'] },
        { path: '/api/color/delete-set', methods: ['POST'] },
        { path: '/api/grid/save', methods: ['POST'] },
        { path: '/api/grid/delete', methods: ['POST'] },
        { path: '/api/interaction/recommend', methods: ['POST'] },
        { path: '/api/updateMaterialType', methods: ['POST'] },
        { path: '/api/addMaterialType', methods: ['POST'] },
        { path: '/api/deleteMaterialType', methods: ['POST'] },
        { path: '/api/updateMaterial', methods: ['POST'] },
        { path: '/api/addMaterial', methods: ['POST'] },
        { path: '/api/deleteMaterial', methods: ['POST'] },
        { path: '/api/story-sets', methods: ['POST', 'PUT'] },
        { path: '/api/story-sets/delete', methods: ['POST'] },
        { path: '/api/stories', methods: ['POST', 'PUT'] }, 
        { path: '/api/stories/delete', methods: ['POST'] },
        { path: '/api/story-relation/add', methods: ['POST'] },
        { path: '/api/story-relation/delete', methods: ['POST'] },
        { path: '/api/upload', methods: ['POST'] },
        { path: '/api/comment_delete', methods: ['POST'] },
        { path: '/api/comment_approve', methods: ['POST'] },
        { path: '/api/works/edit', methods: ['POST'] },
        { path: '/api/works/add', methods: ['POST'] },
        { path: '/api/works/delete', methods: ['POST'] },
        { path: '/api/guide', methods: ['POST', 'PUT'] },
        { path: '/api/guide/delete', methods: ['POST'] },
    ];
    
    // 检查当前请求的路径和方法是否需要保护
    for (const route of protectedRoutes) {
        if (ctx.path.startsWith(route.path) && route.methods.includes(ctx.method)) {
            return false; // 需要验证
        }
    }
    
    return true; // 不需要验证
  }
}));

// 添加文件上传错误处理
app.use(async (ctx, next) => {
  try {
      await next();
  } catch (err) {
      if (err && err.name === 'MulterError') {
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
                  'Location': 'https://' + (req.headers.host ? req.headers.host.split(':')[0] : 'your-default-domain.com') + ':443' + req.url
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