const path = require('path');
const fs = require('fs-extra');
const { warn } = require('./common')
const compile = require('./compile');

function resolution(data) {
    let fileStr = fs
        .readFileSync(path.resolve(process.cwd(), './src/routes/routers.js'))
        .toString();
    fileStr = JSON.stringify(fileStr).replace(/\s/g, '');
    const intersection = [], list = [];
    data.forEach(v => {
        if (fileStr.includes(`key:'${v.key}',`)) {
            intersection.push(v.key);
        } else {
            list.push(v)
        }
    })
    return { intersection, list }
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