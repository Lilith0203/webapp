import * as utils from 'utility';
import { Articles } from '../orm.mjs';

async function index(ctx, next) {
    let articles = await Articles.findAll({
        attributes: ['id', 'title', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 8
    });
    articles.forEach(item => {
        item.setDataValue('createdAt', utils.YYYYMMDDHHmmss(item.createdAt));
    })
    ctx.render('index.html', {
        articles: articles
    });
}

export default {
    'GET /': index
}