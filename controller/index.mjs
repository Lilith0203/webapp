async function index(ctx, next) {
    ctx.render('index.html', {
        
    });
}

export default {
    'GET /': index
}