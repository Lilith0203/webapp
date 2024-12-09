import Koa from 'koa';
import mount from 'koa-mount';
import serve from 'koa-static';
import session from 'koa-session';
import { bodyParser } from '@koa/bodyparser';

import controller from './controller.mjs';
import templateEngine from './view.mjs';
import { sequelize, User } from './orm.mjs';

const isProduction = process.env.NODE_ENV === 'production';

const session_signed_key = ["secret lily"]
const session_config = {
    key: 'koa.sess',     /**  cookie的key。 (默认是 koa:sess) */
    maxAge: 86400000,    //单位毫秒，1天
    overwrite: true,      /** 是否允许重写 。(默认是 true) */
    httpOnly: true,     /** 是否设置HttpOnly，如果在Cookie中设置了"HttpOnly"属性，那么通过程序(JS脚本、Applet等)将无法读取到Cookie信息，这样能有效的防止XSS攻击。  (默认 true) */
    signed: session_signed_key,
    rolling: true   /** 是否每次响应时刷新Session的有效期。(默认是 false) */
}

//创建一个koa实例表示webapp本身
const app = new Koa();
const session1 = session(session_config, app)
app.keys = session_signed_key;
app.use(session1)

app.context.render = function (view, model) {
    this.response.type = 'text/html; charset=utf-8';
    this.response.body = templateEngine.render(view, Object.assign({}, this.state || {}, model || {}));
}

async function initDb() {
    // only for development:
    await sequelize.sync();
    const name = 'lily';
    let user = await User.findOne({
        where: {
            name: name
        }
    });
    if (user === null) {
        await User.create({
            name: 'lily',
            password: '123456'
        });
    }
}
await initDb();

// 绑定db到app.context:
app.context.db = await initDb();

//log url:
app.use(async (ctx, next) => {
    //console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
    await next();
})

//if (!isProduction) {
    app.use(mount('/static', serve('static')));
//}

//解析request.body:
app.use(bodyParser());

//使用controller()
app.use(await controller());

//在端口80监听
app.listen(80);
console.log('app started at port 80');
