const inquirer = require('inquirer');
const {
    error,
    stopSpinner,
    capital,
    chop
} = require('./utils/common');
async function createRouter(name, options) {
    const { batch } = options;
    let routes = name;
    if (batch) {
        const res = await inquirer.prompt({
            name: 'router',
            message: 'Router names are separated by \',\' (for example: header, nav):'
        })
        routes += `,${res.router}`
    }
    routes = chop(routes).map(name => ({
        key: name,
        name,
        to: `/${name}`,
        path: `/${name}`,
        component: `pages/${capital(name)}`,
        exact: true,
        children: [],
    }))
    require('./utils/generatePage')(routes)
    require('./utils/generateRouter')(routes)
}

module.exports = (...argus) => createRouter(...argus).catch(err => {
    error(err)
    stopSpinner(false)
    process.exit(1)
})