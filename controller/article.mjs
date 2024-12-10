import * as utils from 'utility';
import { Articles } from '../orm.mjs';

//GET /article
async function article(ctx, next) {
    let page = parseInt(ctx.query.page) || 1;
    let size = parseInt(ctx.query.size) || 10;
    let {count, rows} = await Articles.findAndCountAll({
        attributes: ['id', 'title', 'abbr', 'tags', 'classify', 'createdAt'],
        offset: (page - 1) * size,
        limit: size,
        order: [['createdAt', 'DESC']]
    });
    rows.forEach(item => {
        item.setDataValue('createdAt', utils.YYYYMMDDHHmmss(item.createdAt));
    })
    ctx.render('article.html', {
        count: count,
        articles: rows,
        page_all: Math.ceil(count / size),
        page_now: page,
    });
}

//GET /article/id
async function article_detail(ctx, next) {
    let id = ctx.params.id;
    let article = await Articles.findOne({
        where: {
            id: id
        }
    });
    ctx.render('article_detail.html', {
        article: article
    });
}

export default {
    'GET /article': article,
    'GET /article/:id': article_detail
}