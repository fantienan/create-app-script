const fs = require('fs-extra');
const handlebars = require('handlebars');
const symbols = require('log-symbols');
const chalk = require('chalk');


/**
 * @param {object} meta - 模板数据
 * @param {object} filePath - 文件路径
 * @param {object} templatePath - 模板路径
 * **/
module.exports = function compile(meta, filePath, templatePath) {
    const content = fs.readFileSync(templatePath).toString();
    const template = handlebars.compile(content);
    const result = template(meta);
    fs.outputFileSync(filePath, result);
    console.log(symbols.success, chalk.green(`🚀${filePath} create success.`))
}