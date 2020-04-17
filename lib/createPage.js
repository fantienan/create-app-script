const inquirer = require('inquirer');
const {
    error,
    stopSpinner,
    capital,
    chop
} = require('./utils/common');
async function createPage(name, options) {
    const { batch } = options;
    let pages = name;
    if (batch) {
        const res = await inquirer.prompt({
            name: 'pages',
            message: 'Page names are separated by \',\' (for example: header, nav):'
        })
        pages += `,${res.pages}`
    }
    pages = chop(pages).map(v => ({
        name: v,
        componentName: capital(v)
    }))
    require('./utils/generatePage')(pages)
}

module.exports = (...argus) => createPage(...argus).catch(err => {
    error(err)
    stopSpinner(false)
    process.exit(1)
})