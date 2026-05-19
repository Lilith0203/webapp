import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User } from '../orm.mjs';
import { Sequelize } from 'sequelize';

const JWT_SECRET = process.env.JWT_SECRET || 'my-secret-key';

function md5(text) {
  return crypto.createHash('md5').update(String(text || '')).digest('hex');
}

function getAuthedUserId(ctx) {
  const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id;
  return typeof id === 'number' || typeof id === 'string' ? id : null;
}

function needsPasswordSetup(user) {
  return !user.passwordChangedAt;
}

// GET /api/user/profile
async function getProfile(ctx) {
  const userId = getAuthedUserId(ctx);
  if (!userId) {
    ctx.status = 401;
    ctx.body = { success: false, message: '未授权，请登录' };
    return;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    ctx.status = 401;
    ctx.body = { success: false, message: '用户不存在或已失效，请重新登录' };
    return;
  }

  ctx.body = {
    success: true,
    data: {
      username: user.name,
      role: user.role || 'user',
      needsPasswordSetup: needsPasswordSetup(user)
    }
  };
}

// POST /api/user/profile/update
// body: { oldPassword?, newUsername?, newPassword? }
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

  const user = await User.findByPk(userId);
  if (!user) {
    ctx.status = 401;
    ctx.body = { success: false, message: '用户不存在或已失效，请重新登录' };
    return;
  }

  const firstSetup = needsPasswordSetup(user);

  if (firstSetup) {
    if (!newPassword) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请设置新密码（至少 6 位）' };
      return;
    }
  } else {
    if (!oldPassword) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请输入旧密码' };
      return;
    }
    if (!newUsername && !newPassword) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请填写要修改的内容' };
      return;
    }
    if (md5(oldPassword) !== user.password) {
      ctx.status = 400;
      ctx.body = { success: false, message: '旧密码不正确' };
      return;
    }
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

  if (newUsername && newUsername !== user.name) {
    const exists = await User.findOne({
      where: Sequelize.where(Sequelize.fn('BINARY', Sequelize.col('name')), newUsername)
    });
    if (exists) {
      ctx.status = 400;
      ctx.body = { success: false, message: '用户名已存在' };
      return;
    }
    user.name = newUsername;
  }

  if (newPassword) {
    user.password = md5(newPassword);
    user.passwordChangedAt = new Date();
  }

  await user.save();

  const token = jwt.sign({ id: user.id, name: user.name, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '7d' });
  ctx.body = {
    success: true,
    data: {
      user: user.name,
      role: user.role || 'user',
      needsPasswordSetup: needsPasswordSetup(user),
      token
    }
  };
}

export default {
  'GET /api/user/profile': getProfile,
  'POST /api/user/profile/update': updateProfile
};
