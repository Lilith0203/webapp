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
import jsonwebtoken from 'jsonwebtoken';
import crypto from 'crypto';

import controller from './controller.mjs';
//import templateEngine from './view.mjs';
import { sequelize } from './orm.mjs';
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

const INDEX_HTML_PATH = join(__dirname, 'view', 'index.html');
let indexHtmlCache = null;

async function getIndexHtml() {
  if (!indexHtmlCache) {
    indexHtmlCache = await fs.readFile(INDEX_HTML_PATH);
  }
  return indexHtmlCache;
}

// 非 www 统一 301 到 www（与 canonical / 百度主站一致）
app.use(async (ctx, next) => {
  const host = (ctx.host || '').split(':')[0];
  if (host === 'lilithu.com') {
    ctx.status = 301;
    ctx.redirect(`https://www.lilithu.com${ctx.url}`);
    return;
  }
  await next();
});
//const session1 = session(session_config, app)
//app.keys = session_signed_key;
//app.use(session1)

app.use(serve(join(__dirname, 'view')))

/*
app.context.render = function (view, model) {
    this.response.type = 'text/html; charset=utf-8';
    this.response.body = templateEngine.render(view, Object.assign({}, this.state || {}, model || {}));
}*/

const INITIAL_PASSWORD_MD5 = crypto.createHash('md5').update('lilithu').digest('hex');

async function initDb() {
    await sequelize.sync();
}
await initDb();

// 绑定db到app.context:
app.context.db = await initDb();

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
// 对部分接口启用“可选登录”：未登录也可访问，但如果带 token 会解析到 ctx.state.user
app.use(async (ctx, next) => {
  const isOptionalAuthGetGrid =
    ctx.method === 'GET' &&
    (ctx.path === '/api/grid/list' || ctx.path.startsWith('/api/grid/'));

  const isOptionalAuthPostComment = ctx.method === 'POST' && ctx.path === '/api/comment';

  if (isOptionalAuthGetGrid || isOptionalAuthPostComment) {
    const header = (ctx.headers && (ctx.headers.authorization || ctx.headers.Authorization)) || '';
    const token = typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : '';
    if (token) {
      try {
        const decoded = jsonwebtoken.verify(token, JWT_SECRET);
        ctx.state = ctx.state || {};
        ctx.state.user = decoded;
      } catch (e) {
        // token 无效/过期：按未登录处理，不抛 401
      }
    }
  }
  await next();
});

app.use(jwt({ 
  secret: JWT_SECRET 
}).unless({ 
  custom: (ctx) => {
    // 管理员全站评论列表：仅精确路径 /api/comments（无 :itemId），需 JWT。
    // 详情页 GET /api/comments/123 不走此处，仍为公开。
    if (ctx.method === 'GET' && ctx.path === '/api/comments') {
      return false;
    }

    // 需要JWT验证的路径和方法组合
    const protectedRoutes = [
        { path: '/api/config/set', methods: ['POST'] },
        { path: '/api/user/profile', methods: ['GET'] },
        { path: '/api/user/profile/update', methods: ['POST'] },
        { path: '/api/user/my-comments', methods: ['GET'] },
        // 计划：仅允许登录用户访问自己的计划
        { path: '/api/plans', methods: ['GET'] },
        { path: '/api/plan/', methods: ['GET'] },
        { path: '/api/plan/edit', methods: ['POST'] },
        { path: '/api/planAdd', methods: ['POST'] },
        { path: '/api/plan/delete', methods: ['POST'] },
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
        { path: '/api/getMaterialType', methods: ['GET'] },
        { path: '/api/updateMaterialType', methods: ['POST'] },
        { path: '/api/addMaterialType', methods: ['POST'] },
        { path: '/api/deleteMaterialType', methods: ['POST'] },
        { path: '/api/material', methods: ['POST'] },
        { path: '/api/material/countByType', methods: ['GET'] },
        { path: '/api/updateMaterial', methods: ['POST'] },
        { path: '/api/batchUpdateMaterial', methods: ['POST'] },
        { path: '/api/addMaterial', methods: ['POST'] },
        { path: '/api/deleteMaterial', methods: ['POST'] },
        { path: '/api/story-sets', methods: ['POST', 'PUT'] },
        { path: '/api/story-sets/delete', methods: ['POST'] },
        { path: '/api/stories', methods: ['POST', 'PUT'] }, 
        { path: '/api/stories/delete', methods: ['POST'] },
        { path: '/api/story-relation/add', methods: ['POST'] },
        { path: '/api/story-relation/delete', methods: ['POST'] },
        { path: '/api/story-relation', methods: ['PUT'] },
        { path: '/api/upload', methods: ['POST'] },
        { path: '/api/ocr', methods: ['POST'] },
        { path: '/api/ocr/quota', methods: ['GET'] },
        { path: '/api/ocr/quota/admin', methods: ['POST'] },
        { path: '/api/comment_delete', methods: ['POST'] },
        { path: '/api/comment_approve', methods: ['POST'] },
        { path: '/api/works/edit', methods: ['POST'] },
        { path: '/api/works/add', methods: ['POST'] },
        { path: '/api/works/delete', methods: ['POST'] },
        { path: '/api/works-set/add-work', methods: ['POST'] },
        { path: '/api/works-set/remove-work', methods: ['POST'] },
        { path: '/api/guide', methods: ['POST', 'PUT'] },
        { path: '/api/guide/delete', methods: ['POST'] },
        { path: '/api/menus', methods: ['POST', 'PUT'] },
        { path: '/api/menus/delete', methods: ['POST'] },
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

// SPA 回退：仅当未命中静态文件且非 API 时返回 index.html
app.use(async (ctx, next) => {
  await next();
  if (ctx.method !== 'GET' && ctx.method !== 'HEAD') return;
  if (ctx.path.startsWith('/api')) return;
  if (ctx.body != null) return;
  try {
    ctx.type = 'html';
    ctx.body = await getIndexHtml();
  } catch (err) {
    ctx.status = 500;
    ctx.body = 'Error loading index.html';
  }
});

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