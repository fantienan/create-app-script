const path = require('path');
const fs = require('fs-extra');
const { warn } = require('./common');
const compile = require('./compile');

function resolution(data) {
    // 原来的路由
    const { routers, keys } = getRoutersFile();
    const intersection = [];
    const list = data.reduce((acc, cur) => {
        if (!keys.includes(cur.key)) {
            acc.push(cur)
        } else {
            intersection.push(cur.key)
        }
        return acc
    }, routers)
    .filter(v => v.key != 'example')
    return { intersection, list }
}

function getRoutersFile() {
    const file = fs.readFileSync(path.join(process.cwd(), 'src/routes/routers.js'), 'utf-8');
    const name = `_${Math.random().toString().replace('0.', '')}.js`;
    const way = path.join(process.cwd(), `src/routes/${name}`);
    fs.writeFileSync(way, file.replace('export const routers', 'module.exports'), 'utf-8');
    const routers = require(way) || [];
    fs.unlinkSync(way)
    return {
        routers,
        keys: routers.reduce((acc, cur) => {
            acc.push(cur.key)
            return acc
        }, [])
    }
}

module.exports = function generateRouter(routes) {
    let { intersection, list } = resolution(routes);
    if (intersection.length) {
        warn(`Duplicate router will be ignored:${JSON.stringify(intersection)}`)
    }
    list = { list };
    const templatePath = path.resolve(__dirname, '../../template/router.js.hbs');
    const filePath = path.resolve(process.cwd(), './src/routes/routers.js');

    compile(
        list,
        filePath,
        templatePath
    )
}