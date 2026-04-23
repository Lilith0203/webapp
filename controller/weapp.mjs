import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from 'config';
import https from 'https';
import { User } from '../orm.mjs';
import { Sequelize } from 'sequelize';

const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key';
const WEAPP_INITIAL_PASSWORD = 'lilithu';

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

async function pickUniqueUsername(baseName) {
  const base = (baseName || '').trim();
  if (!base) return 'wx_user';
  // 最多尝试 10 次避免死循环
  for (let i = 0; i < 10; i++) {
    const suffix = i === 0 ? '' : `_${crypto.randomBytes(2).toString('hex')}`;
    const candidate = `${base}${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({
      where: Sequelize.where(Sequelize.fn('BINARY', Sequelize.col('name')), candidate)
    });
    if (!exists) return candidate;
  }
  return `${base}_${Date.now()}`;
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

// POST /api/auth/weapp/login
// body: { code }
async function weappLogin(ctx) {
  const code = ctx.request.body?.code || '';
  if (!code || typeof code !== 'string') {
    ctx.status = 400;
    ctx.body = { success: false, message: '缺少 code' };
    return;
  }

  const { appId, appSecret } = getWeappConfig();

  try {
    const session = await httpsGetJson(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(appId)}` +
        `&secret=${encodeURIComponent(appSecret)}` +
        `&js_code=${encodeURIComponent(code)}` +
        `&grant_type=authorization_code`
    );

    if (session.errcode) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `微信登录失败：${session.errmsg || session.errcode}`
      };
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
      // 创建占位用户（兼容你现有的 user 表：name/password 必填）
      const name = await pickUniqueUsername(`wx_${openid.slice(0, 8)}`);
      user = await User.create({
        name,
        password: md5(WEAPP_INITIAL_PASSWORD),
        role: 'user',
        wechatOpenid: openid
      });
    }

    const token = jwt.sign({ id: user.id, name: user.name, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });

    ctx.body = {
      success: true,
      data: {
        user: user.name,
        role: user.role || 'user',
        token
      }
    };
  } catch (error) {
    console.error('weapp login error:', error);
    ctx.status = 500;
    ctx.body = { success: false, message: '服务器错误' };
  }
}

export default {
  'POST /api/auth/weapp/login': weappLogin
};

