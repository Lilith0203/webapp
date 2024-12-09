import { User } from '../orm.mjs'

//POST /signin
async function signin(ctx, next) {
    let name = ctx.request.body.name || '';
    let password = ctx.request.body.password || '';
    console.log(`try signin: ${name}, password: ${password}`);
    //调用Model.findOne() 查询一行记录
    let user = await User.findOne({
        where: {
            name: name
        }
    });
    if (name === 'lily' && password === '123456') {
        ctx.response.type = 'text/html';
        ctx.response.body = `<h1>Welcome, ${name}!</h1>`;
    } else {
        ctx.response.type = 'text/html';
        ctx.response.body = '<h1>Signin failed!</h1><p><a href="/">Retry</a></p>';
    }
}

//导出处理函数
export default {
    'POST /signin': signin
}