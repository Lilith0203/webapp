import { User } from '../orm.mjs'
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || "my-secret-key"

//POST /signin
async function login(ctx, next) {
    let name = ctx.request.body.username || '';
    let password = ctx.request.body.password || '';
    
    try {
        //调用Model.findOne() 查询一行记录
        let user = await User.findOne({
            where: {
                name: name
            }
        });

        if (!user) {
            ctx.status = 401;
            ctx.body = {
                message: "用户不存在"
            };
            return;
        }

        const hashedPassword = crypto
            .createHash('md5')
            .update(password)
            .digest('hex');

        if (hashedPassword === user.password) {
            const token = jwt.sign({
                id: user.id,
                name: user.name,
                },
                JWT_SECRET,
                {expiresIn: '24h'}
            );
            //ctx.session.logged = true;
            ctx.body = {
                code: 200,
                data: {
                    user: user.name,
                    token: `${token}`,
                },
                message: "成功登录"
            }
        } else {
            ctx.status = 401;
            ctx.body = {
                code: 401,
                message: "密码错误"
            }
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            code: 500,
            message: "服务器错误"
        }
    }
}

//导出处理函数
export default {
    'POST /api/login': login
}