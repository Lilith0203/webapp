import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../orm.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key';

function md5(text) {
  return crypto.createHash('md5').update(String(text || '')).digest('hex');
}

function getAuthedUserId(ctx) {
  // koa-jwt 会把 payload 放到 ctx.state.user
  const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id;
  return typeof id === 'number' || typeof id === 'string' ? id : null;
}

// POST /api/user/profile/update
// body: { oldPassword, newUsername?, newPassword? }
async function updateProfile(ctx) {
  const userId = getAuthedUserId(ctx);
  if (!userId) {
    ctx.status = 401;
    ctx.body = { success: false, message: '未授权，请登录' };
    return;
  }

  const body = (ctx && ctx.request && ctx.request.body) || {};
  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : '';
  const newUsername = typeof body.newUsername === 'string' ? body.newUsername.trim() : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!newUsername && !newPassword) {
    ctx.status = 400;
    ctx.body = { success: false, message: '请填写要修改的内容' };
    return;
  }

  if (newUsername && newUsername.length < 2) {
    ctx.status = 400;
    ctx.body = { success: false, message: '用户名太短' };
    return;
  }

  if (newPassword && newPassword.length < 6) {
    ctx.status = 400;
    ctx.body = { success: false, message: '新密码至少 6 位' };
    return;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    ctx.status = 401;
    ctx.body = { success: false, message: '用户不存在或已失效，请重新登录' };
    return;
  }

  // 只有改密码时才需要校验旧密码
  if (newPassword) {
    if (!oldPassword) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请输入旧密码' };
      return;
    }
    if (md5(oldPassword) !== user.password) {
      ctx.status = 400;
      ctx.body = { success: false, message: '旧密码不正确' };
      return;
    }
  }

  if (newUsername && newUsername !== user.name) {
    const exists = await User.findOne({ where: { name: newUsername } });
    if (exists) {
      ctx.status = 400;
      ctx.body = { success: false, message: '用户名已存在' };
      return;
    }
    user.name = newUsername;
  }

  if (newPassword) {
    user.password = md5(newPassword);
  }

  await user.save();

  const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  ctx.body = { success: true, data: { user: user.name, token } };
}

export default {
  'POST /api/user/profile/update': updateProfile
};

