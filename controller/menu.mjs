import { Menu } from '../orm.mjs'
import { Op } from 'sequelize'

function requireAdmin(ctx, next) {
  const role = ctx && ctx.state && ctx.state.user && ctx.state.user.role
  if (role !== 'admin') {
    ctx.status = 403
    ctx.body = { success: false, message: '无权限：仅管理员可操作' }
    return
  }
  return next()
}

function getAuthedUserId(ctx) {
  const id = ctx && ctx.state && ctx.state.user && ctx.state.user.id
  return typeof id === 'number' || typeof id === 'string' ? parseInt(id) : null
}

function normalizePictures(pictures) {
  if (!pictures) return '[]'
  if (Array.isArray(pictures)) return JSON.stringify(pictures)
  if (typeof pictures === 'string') {
    try {
      JSON.parse(pictures)
      return pictures
    } catch {
      return JSON.stringify([pictures])
    }
  }
  return '[]'
}

function toPlain(menu) {
  const row = menu.get({ plain: true })
  let pics = []
  if (row.pictures) {
    try {
      pics = JSON.parse(row.pictures)
      if (!Array.isArray(pics)) pics = []
    } catch {
      pics = []
    }
  }
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    staple: row.staple || '',
    ingredients: row.ingredients || '',
    steps: row.steps || '',
    pictures: pics,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

// GET /api/menus?page=1&size=10&search=xxx
async function listMenus(ctx) {
  const page = parseInt(ctx.query.page) || 1
  const size = parseInt(ctx.query.size) || 10
  const search = typeof ctx.query.search === 'string' ? ctx.query.search.trim() : ''

  const where = { isDeleted: 0 }
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { staple: { [Op.like]: `%${search}%` } },
      { ingredients: { [Op.like]: `%${search}%` } },
      { steps: { [Op.like]: `%${search}%` } }
    ]
  }

  const offset = (page - 1) * size
  const { count, rows } = await Menu.findAndCountAll({
    where,
    limit: size,
    offset,
    order: [['updatedAt', 'DESC'], ['id', 'DESC']]
  })

  ctx.body = {
    success: true,
    data: {
      menus: rows.map(toPlain),
      count,
      page_now: page,
      page_all: Math.ceil(count / size)
    }
  }
}

// GET /api/menus/:id
async function getMenuDetail(ctx) {
  const id = parseInt(ctx.params.id)
  const menu = await Menu.findOne({ where: { id, isDeleted: 0 } })
  if (!menu) {
    ctx.status = 404
    ctx.body = { success: false, message: '菜单不存在' }
    return
  }
  ctx.body = { success: true, data: toPlain(menu) }
}

// POST /api/menus
async function createMenu(ctx) {
  const userId = getAuthedUserId(ctx)
  if (!userId) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权，请登录' }
    return
  }
  const body = (ctx && ctx.request && ctx.request.body) || {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    ctx.status = 400
    ctx.body = { success: false, message: '菜名不能为空' }
    return
  }
  const menu = await Menu.create({
    userId,
    name,
    staple: typeof body.staple === 'string' ? body.staple.trim() : '',
    ingredients: typeof body.ingredients === 'string' ? body.ingredients : '',
    steps: typeof body.steps === 'string' ? body.steps : '',
    pictures: normalizePictures(body.pictures),
    isDeleted: 0
  })
  ctx.body = { success: true, data: toPlain(menu) }
}

// PUT /api/menus/:id
async function updateMenu(ctx) {
  const userId = getAuthedUserId(ctx)
  if (!userId) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权，请登录' }
    return
  }
  const id = parseInt(ctx.params.id)
  const body = (ctx && ctx.request && ctx.request.body) || {}

  const menu = await Menu.findOne({ where: { id, isDeleted: 0 } })
  if (!menu) {
    ctx.status = 404
    ctx.body = { success: false, message: '菜单不存在' }
    return
  }

  await menu.update({
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : menu.name,
    staple: typeof body.staple === 'string' ? body.staple.trim() : menu.staple,
    ingredients: typeof body.ingredients === 'string' ? body.ingredients : menu.ingredients,
    steps: typeof body.steps === 'string' ? body.steps : menu.steps,
    pictures: body.pictures !== undefined ? normalizePictures(body.pictures) : menu.pictures
  })

  ctx.body = { success: true, data: toPlain(menu) }
}

// POST /api/menus/delete
async function deleteMenu(ctx) {
  const userId = getAuthedUserId(ctx)
  if (!userId) {
    ctx.status = 401
    ctx.body = { success: false, message: '未授权，请登录' }
    return
  }
  const id = parseInt(ctx.request.body && ctx.request.body.id)
  if (!id) {
    ctx.status = 400
    ctx.body = { success: false, message: '缺少 id' }
    return
  }
  const menu = await Menu.findOne({ where: { id, isDeleted: 0 } })
  if (!menu) {
    ctx.status = 404
    ctx.body = { success: false, message: '菜单不存在' }
    return
  }
  await menu.update({ isDeleted: 1 })
  ctx.body = { success: true }
}

export default {
  'GET /api/menus': listMenus,
  'GET /api/menus/:id': getMenuDetail,
  'POST /api/menus': [requireAdmin, createMenu],
  'PUT /api/menus/:id': [requireAdmin, updateMenu],
  'POST /api/menus/delete': [requireAdmin, deleteMenu]
}

