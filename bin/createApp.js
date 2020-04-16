
'use strict';

const chalk = require('chalk');
const commander = require('commander');
const path = require('path');
const validateProjectName = require('validate-npm-package-name');
const fs = require('fs-extra');
const execSync = require('child_process').execSync;
const shell = require('shelljs');
const semver = require('semver');
const inquirer = require('inquirer');
const packageJson = require('../package.json');
const symbols = require('log-symbols');
const handlebars = require('handlebars');
const minimist = require('minimist');
const {
    log,
    done,
    warn
} = require('../lib/utils/common');

let projectName;

const program = new commander.Command(packageJson.name)
    .version(packageJson.version)
    .arguments('<project-directory')
    .usage(`${chalk.green('<project-directory>')} [options]`)
    .action((name, cmd) => {
        projectName = name;
        if (minimist(process.argv.slice(3))._.length >= 1) {
            warn(chalk.yellow(`检测到您输入了多个名称，将以第一个参数为项目名，舍弃后续参数哦`))
        }
    })
    // 打印额外的日志
    .option('--verbose', 'print additional logs')
    .option('--template', 'choice template')
    .option('--router', 'initial route')
    .allowUnknownOption()
    .on('--help', () => {
        log(`Only ${chalk.green('<project-directory>')} is required.`);
    })
program.parse(process.argv);

if ((typeof projectName).toString() === "undefined") {
    console.error('Please specify the project directory:');
    log(
        `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`
    );
    log();
    log('For example:');
    log(`  ${chalk.cyan(program.name())} ${chalk.green('my-react-app')}`);
    log();
    log(
        `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
}

createApp(
    projectName,
    program.template,
    program.router
);

async function createApp(
    name,
    template,
    router
) {
    const root = path.resolve(name);
    const appName = path.basename(root);
    const useYarn = shouldUseYarn() ? true : false;
    let repoInfo = packageJson["templates"]["default-template"];
    let command = 'yarn install';
    let routes;
    if (!useYarn) {
        const npmInfo = checkNpmVersion();
        // npm version < v5
        if (!npmInfo.hasMinNpm && npmInfo.npmVersion) {
            warn(
                chalk.yellow(
                    `You are using npm ${npmInfo.npmVersion} so the project will be bootstrapped with an old unsupported version of tools.\n` +
                    `Please update to npm 5 or higher for a better, fully supported experience.\n`
                )
            );
            process.exit(1)
        }
        command = 'npm install'
    }
    checkAppName(appName);
    // 确保目录存在，如果不存在就创建一个
    fs.ensureDirSync(name);
    // 判断新建这个文件夹是否安全，否则直接退出
    if (!isSafeToCreateProjectIn(root, name)) {
        process.exit(1)
    }

    if (!shell.which('git')) {
        shell.echo(chalk.red('This script requires git'));
        process.exit(1);
    }

    if (template) {
        const templates = packageJson["templates"];
        const res = await inquirer.prompt({
            type: 'list',
            name: 'template',
            message: 'Choice a template',
            choices: Object.keys(templates).map(key => ({
                name: key,
                value: templates[key]
            }))
        })
        repoInfo = res.template
    }

    if (router) {
        const res = await inquirer.prompt({
            name: 'router',
            message: '路由名称列表用逗号隔开(例如:name,router...):'
        })
        routes = res.router.split(/,|，/)
            .map(v => v.replace(/[^A-Za-z]/g, ''))
            .filter(_ => _)
            .reduce((acc, cur) => {
                if (acc.indexOf(cur.toLowerCase()) === -1) {
                    acc.push(cur.toLowerCase())
                }
                return acc
            }, [])
            .map(name => ({
                key: name,
                name,
                to: `/${name}`,
                path: `/${name}`,
                component: `pages/${name.replace(/(.{1})(.*)/g, (data, $1, $2) => $1.toUpperCase() + $2)}`,
                exact: true,
                children: [],
            }))
    }

    run(
        name,
        appName,
        repoInfo,
        command,
        routes
    )
}

async function run(
    name,
    appName,
    repoInfo,
    command,
    routes
) {
    const { repoName, repo } = repoInfo;
    const dirname = `_${Math.random().toString().replace('0.', '')}`;
    shell.cd(name);
    fs.mkdirSync(dirname);
    shell.cd(dirname);
    if (shell.exec(`git clone ${repo}`).code !== 0) {
        process.exit(1)
    }
    done(chalk.green('Cloning into development-templates success.'));
    const src = path.resolve(repoName);
    shell.cd('../..');
    fs.readdirSync(src)
        .forEach(path => {
            shell.cp('-R', `${src}/${path}`, `${appName}/`)
        });
    shell.rm('-rf', `${name}/${dirname}`);
    shell.cd(name)
    if (routes) {
        compile(
            { list: routes },
            path.resolve(process.cwd(), './src/routes/routers.js'),
            path.resolve(__dirname, '../template/router.js.hbs')
        );
        routes.forEach(route => {
            const list = { name: route.component.split('/').pop() };
            compile(
                list,
                path.resolve(process.cwd(), `./src/pages/${list.name}/index.js`),
                path.resolve(__dirname, '../template/page.js.hbs')
            )
        })
    }
    shell.exec(command)
}

/**生成路由配置
 * @param {object} meta - 模板数据
 * @param {object} filePath - 文件路径
 * @param {object} templatePath - 模板路径
 * **/
function compile(meta, filePath, templatePath) {
    const content = fs.readFileSync(templatePath).toString();
    const template = handlebars.compile(content);
    const result = template(meta);
    fs.outputFileSync(filePath, result);
    console.log(symbols.success, chalk.green(`🚀${filePath} create success.`))
}

function checkNpmVersion() {
    let hasMinNpm = false;
    let npmVersion = null;
    try {
        npmVersion = execSync('npm --version')
            .toString()
            .trim();
        hasMinNpm = semver.gte(npmVersion, '5.0.0');
    } catch (err) {
        // ignore
    }
    return {
        hasMinNpm,
        npmVersion,
    };
}

function shouldUseYarn() {
    try {
        execSync('yarnpkg --version', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

function checkAppName(appName) {
    const validationResult = validateProjectName(appName);
    if (!validationResult.validForNewPackages) {
        console.error(
            chalk.red(
                `Cannot create a project named ${chalk.green(
                    `"${appName}"`
                )} because of npm naming restrictions:\n`
            )
        );
        [
            ...(validationResult.errors || []),
            ...(validationResult.warnings || []),
        ].forEach(error => {
            console.error(chalk.red(`  * ${error}`));
        });
        console.error(chalk.red('\nPlease choose a different project name.'));
        process.exit(1);
    }
}

function isSafeToCreateProjectIn(root, name) {
    const validFiles = [
        '.DS_Store',
        '.git',
        '.gitattributes',
        '.gitignore',
        '.gitlab-ci.yml',
        '.hg',
        '.hgcheck',
        '.hgignore',
        '.idea',
        '.npmignore',
        '.travis.yml',
        'docs',
        'LICENSE',
        'README.md',
        'mkdocs.yml',
        'Thumbs.db',
    ];
    const errorLogFilePatterns = [
        'npm-debug.log',
        'yarn-error.log',
        'yarn-debug.log',
    ];
    const isErrorLog = file => {
        return errorLogFilePatterns.some(pattern => file.startsWith(pattern));
    };

    const conflicts = fs
        .readdirSync(root)
        .filter(file => !validFiles.includes(file))
        .filter(file => !/\.iml$/.test(file))
        .filter(file => !isErrorLog(file));

    if (conflicts.length > 0) {
        log(
            `The directory ${chalk.green(name)} contains files that could conflict:`
        );
        log();
        for (const file of conflicts) {
            try {
                const stats = fs.lstatSync(path.join(root, file));
                if (stats.isDirectory()) {
                    log(`  ${chalk.blue(`${file}/`)}`);
                } else {
                    log(`  ${file}`);
                }
            } catch (e) {
                log(`  ${file}`);
            }
        }
        log();
        log(
            'Either try using a new directory name, or remove the files listed above.'
        );
        return false;
    }

    // 从以前的安装中删除任何日志文件。
    fs.readdirSync(root).forEach(file => {
        if (isErrorLog(file)) {
            fs.removeSync(path.join(root, file));
        }
    });
    return true;
}