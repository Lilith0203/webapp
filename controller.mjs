import Router from '@koa/router';
import path from 'node:path';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'url';

async function scan(router, controllerDir) {
    // 扫描controller目录:
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    //console.log(`scan dir ${dirname}...`);
    let files = readdirSync(path.join(dirname, controllerDir)).filter(f => f.endsWith('.mjs'));
    for (let file of files) {
        // 导入模块:
        //console.log(`import controller/${file}...`);
        let { default: mapping } = await import(`./${controllerDir}/${file}`);
        // 把每个URL映射添加到router:
        for (let url in mapping) {
            if (url.startsWith('GET ')) {
                let p = url.substring(4);
                if (Array.isArray(mapping[url])) {
                    router.get(p, ...mapping[url]);
                } else {
                    router.get(p, mapping[url]);
                }
                console.log(`mapping: GET ${p}`);
            } else if (url.startsWith('POST ')) {
                let p = url.substring(5);
                if (Array.isArray(mapping[url])) {
                    router.post(p, ...mapping[url]);
                } else {
                    router.post(p, mapping[url]);
                }
                console.log(`mapping: POST ${p}`);
            } else if (url.startsWith('PUT ')) {  // 添加 PUT 请求支持
                let p = url.substring(4);
                if (Array.isArray(mapping[url])) {
                    router.put(p, ...mapping[url]);
                } else {
                    router.put(p, mapping[url]);
                }
                console.log(`mapping: PUT ${p}`);
            } else {
                console.warn(`invalid mapping: ${url}`);
            }
        }
    }
}

// 默认扫描目录为 controller:
export default async function (controllerDir = 'controller') {
    const router = new Router();
    await scan(router, controllerDir);
    return router.routes();
}