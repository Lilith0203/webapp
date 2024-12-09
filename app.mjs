import Koa from 'koa';
import mount from 'koa-mount';
import serve from 'koa-static';
import { bodyParser } from '@koa/bodyparser';

import controller from './controller.mjs';
import templateEngine from './view.mjs';
import { sequelize, Sequelize, User } from './orm.mjs';

const isProduction = process.env.NODE_ENV === 'production';

//创建一个koa实例表示webapp本身
const app = new Koa();

app.context.render = function (view, model) {
    this.response.type = 'text/html; charset=utf-8';
    this.response.body = templateEngine.render(view, Object.assign({}, this.state || {}, model || {}));
}

//log url:
app.use(async (ctx, next) => {
    //console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
    await next();
})

if (!isProduction) {
    app.use(mount('/static', serve('static')));
}

await sequelize.sync()

//解析request.body:
app.use(bodyParser());

//使用controller()
app.use(await controller());

//在端口80监听
app.listen(80);
console.log('app started at port 80');