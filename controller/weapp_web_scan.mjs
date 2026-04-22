import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from 'config';
import https from 'https';
import cache from '../util/cache.mjs';
import { User } from '../orm.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key';
const LOGIN_TTL_SECONDS = 300; // 5分钟

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function getWeappConfig() {
  const appId = config.get('weapp.appId');
  const appSecret = config.get('weapp.appSecret');
  return { appId, appSecret };
}

function newLoginId() {
  // 兼容旧 Node：不使用 base64url 编码
  return crypto.randomBytes(18).toString('hex');
}

function cacheKey(loginId) {
  return `weapp-web-scan:${loginId}`;
}

// POST /api/auth/weapp-web/create
// body: { redirect? }
async function create(ctx) {
  try {
    const body = (ctx && ctx.request && ctx.request.body) || {};
    const redirect = typeof body.redirect === 'string' ? body.redirect : '/';
    const loginId = newLoginId();

    await cache.set(
      cacheKey(loginId),
      {
        status: 'pending',
        redirect,
        createdAt: Date.now()
      },
      LOGIN_TTL_SECONDS
    );

    // 二维码内容：给小程序扫到后原样带回 confirm
    const qrText = `weapp-web-login:${loginId}`;

    ctx.body = {
      success: true,
      data: {
        loginId,
        qrText,
        expiresIn: LOGIN_TTL_SECONDS
      }
    };
  } catch (error) {
    console.error('weapp-web create error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '创建二维码失败' };
  }
}

// GET /api/auth/weapp-web/status?loginId=...
async function status(ctx) {
  const loginId = typeof ctx.query.loginId === 'string' ? ctx.query.loginId : '';
  if (!loginId) {
    ctx.status = 400;
    ctx.body = { success: false, message: '缺少 loginId' };
    return;
  }

  const data = await cache.get(cacheKey(loginId));
  if (!data) {
    ctx.body = { success: true, data: { status: 'expired' } };
    return;
  }

  if (data.status === 'confirmed' && data.token) {
    // 一次性：取到 token 后立刻失效，避免被重复拉取
    await cache.del(cacheKey(loginId));
    ctx.body = { success: true, data: { status: 'confirmed', token: data.token, redirect: data.redirect } };
    return;
  }

  ctx.body = { success: true, data: { status: 'pending' } };
}

// POST /api/auth/weapp-web/confirm
// body: { loginId, code }
async function confirm(ctx) {
  const body = (ctx && ctx.request && ctx.request.body) || {};
  const loginId = body.loginId || '';
  const code = body.code || '';

  if (!loginId || !code) {
    ctx.status = 400;
    ctx.body = { success: false, message: '缺少 loginId/code' };
    return;
  }

  const ticket = await cache.get(cacheKey(loginId));
  if (!ticket) {
    ctx.status = 400;
    ctx.body = { success: false, message: '二维码已失效，请刷新网页重试' };
    return;
  }

  const { appId, appSecret } = getWeappConfig();
  if (!appId || !appSecret) {
    ctx.status = 500;
    ctx.body = { success: false, message: '服务端未配置 weapp.appId/appSecret' };
    return;
  }

  try {
    const session = await httpsGetJson(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}` +
        `&secret=${encodeURIComponent(appSecret)}` +
        `&js_code=${encodeURIComponent(code)}` +
        `&grant_type=authorization_code`
    );

    if (session.errcode) {
      ctx.status = 400;
      ctx.body = { success: false, message: `微信登录失败：${session.errmsg || session.errcode}` };
      return;
    }

    const openid = session.openid;
    if (!openid) {
      ctx.status = 400;
      ctx.body = { success: false, message: '微信返回缺少 openid' };
      return;
    }

    let user = await User.findOne({ where: { wechatOpenid: openid } });
    if (!user) {
      const randomPass = crypto.randomBytes(24).toString('hex');
      const name = `wx_${openid.slice(0, 8)}`;
      user = await User.create({
        name,
        password: md5(randomPass),
        wechatOpenid: openid
      });
    }

    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    // 标记为已确认，等待网页轮询取 token
    await cache.set(
      cacheKey(loginId),
      { ...ticket, status: 'confirmed', token, confirmedAt: Date.now() },
      LOGIN_TTL_SECONDS
    );

    ctx.body = { success: true };
  } catch (error) {
    console.error('weapp-web confirm error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '服务器错误（confirm）' };
  }
}

export default {
  'POST /api/auth/weapp-web/create': create,
  'GET /api/auth/weapp-web/status': status,
  'POST /api/auth/weapp-web/confirm': confirm,

  // 兼容某些反向代理会剥离 /api 前缀的情况
  'POST /auth/weapp-web/create': create,
  'GET /auth/weapp-web/status': status,
  'POST /auth/weapp-web/confirm': confirm
};

