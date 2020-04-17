const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const compile = require('./compile');
const { warn } = require('./common');

function createPaths(list, file, templateFile) {
    const filePath = path.resolve(process.cwd(), `./src/pages/${list.componentName}`);
    const templatePath = path.resolve(__dirname, '../../template');
    return {
        list,
        filePath: path.resolve(filePath, file),
        templatePath: path.resolve(templatePath, templateFile)
    }
}

module.exports = function generatePage(data) {
    const dirs = fs.readdirSync(path.resolve(process.cwd(), './src/pages'));
    const intersection = data.reduce((acc, cur) => {
        if (dirs.includes(cur.componentName)) {
            acc.push(cur.componentName)
        }
        return acc
    }, [])
    if (intersection.length) {
        warn(`Duplicate pages will be ignored:${JSON.stringify(intersection)}`)
    }
    data.forEach(item => {
        const list = {
            name: item.name,
            componentName: item.componentName || item.component.split('/').pop(),
        };
        const index = createPaths(list, 'index.js', 'page.js.hbs');
        const io = createPaths(list, 'io.js', 'io.js.hbs');
        const store = createPaths(list, 'store.js', 'store.js.hbs');
        const less = createPaths(list, 'style.less', 'page.less.hbs');
        [
            index,
            io,
            store,
            less
        ].forEach(v => {
            compile(v.list, v.filePath, v.templatePath);
        })
    })
}