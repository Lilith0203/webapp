import { User } from '../orm.mjs'

//GET /login
async function login(ctx, next) {
    if (!ctx.session.logged) {
        ctx.render('login.html', {
        
        });
    } else {
        ctx.response.redirect('/');
    }
}

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
    if (user && password === user.password) {
        ctx.session.logged = true;
        ctx.response.redirect('/');
    } else {
        ctx.response.type = 'text/html';
        ctx.response.body = '<h1>Signin failed!</h1><p><a href="/login">Retry</a></p>';
    }
}

//导出处理函数
export default {
    'GET /login': login,
    'POST /signin': signin
}