import nunjucks from 'nunjucks';

function createEnv(path, {autoescape = true, noCache = false, watch = false, throwOnUndefined = false}, filters = {}) {
    const loader = new nunjucks.FileSystemLoader(path, {
        noCache: noCache,
        watch: watch
    });
    const env = new nunjucks.Environment(loader, {
        autoescape: autoescape,
        throwOnUndefined: throwOnUndefined
    });
    for (let name in filters) {
        env.addFilter(name, filters[name]);
    }
    return env;
}

const env = createEnv('view', {
    noCache: process.env.NODE_ENV !== 'production'
});

// 导出env对象:
export default env;