const path = require('path');
const fs = require('fs-extra');
const { warn } = require('./common');
const compile = require('./compile');
function resolution(data) {
    // 原来的路由
    const { routers, keys, isLayoutIndex } = getRoutersFile();
    const intersection = [];
    data.reduce((acc, cur) => {
        if (!keys.includes(cur.key)) {
            acc.push(cur)
        } else {
            intersection.push(cur.key)
        }
        return acc
    },routers[isLayoutIndex].routes || routers).filter(v => v.key != 'example')
    return { intersection, list: routers }
}

function getRoutersFile() {
    const file = fs.readFileSync(path.join(process.cwd(), 'src/routes/routers.ts'), 'utf-8');
    const name = `_${Math.random().toString().replace('0.', '')}.js`;
    const way = path.join(process.cwd(), `src/routes/${name}`);
    fs.writeFileSync(
        way,
        `module.exports = [${file
            .split('/* @create-app-script-split-start*/')[1]
            .split('/* @create-app-script-split-end*/')[0]}]`,
        'utf-8'
    );
    const routers = require(way) || [];
    let index;
    const layout = routers.find((v, i) => {
        index = v.key === 'layouts' ? i : index
        return index !== undefined
    }) || {}
    fs.unlinkSync(way)
    return {
        isLayoutIndex: index,
        routers,
        keys: (layout.routes || routers).reduce((acc, cur) => {
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
    const filePath = path.resolve(process.cwd(), './src/routes/routers.ts');

    compile(
        list,
        filePath,
        templatePath
    )
}