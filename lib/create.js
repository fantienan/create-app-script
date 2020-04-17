
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
const minimist = require('minimist');

const {
    log,
    warn,
    error,
    stopSpinner,
    capital,
    chop
} = require('../lib/utils/common');

async function create(name, options) {
    const { template, router } = options;
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
        routes = chop(res.router).map(name => ({
            key: name,
            name,
            to: `/${name}`,
            path: `/${name}`,
            component: `pages/${capital(name)}`,
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
    log(📦)
    if (shell.exec(`git clone ${repo}`).code !== 0) {
        process.exit(1)
    }
    log(chalk.green('✔ Cloning into development-templates success.'));
    const src = path.resolve(repoName);
    shell.cd('../..');
    fs.readdirSync(src)
        .forEach(path => {
            shell.cp('-R', `${src}/${path}`, `${appName}/`)
        });
    shell.rm('-rf', `${name}/${dirname}`);
    shell.cd(name)
    if (routes) {
        require('../lib/utils/generatePage')(routes);
        require('../lib/utils/generateRouter')(routes);
    }
    shell.exec(command)
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

module.exports = (...argus) => create(...argus).catch(err => {
    stopSpinner(false)
    error(err)
    process.exit(1)
});