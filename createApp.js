
'use strict';

const chalk = require('chalk');
const commander = require('commander');
const path = require('path');
const validateProjectName = require('validate-npm-package-name');
const fs = require('fs-extra');
const execSync = require('child_process').execSync;
const shell = require('shelljs');
const semver = require('semver');
const packageJson = require('./package.json');

let projectName;

const program = new commander.Command(packageJson.name)
    .version(packageJson.version)
    .arguments('<project-directory')
    .usage(`${chalk.green('<project-directory>')} [options]`)
    .action(argus => {
        argus && (projectName = argus.split(' ')[0])
    })
    // 打印额外的日志
    .option('--verbose', 'print additional logs')
    .allowUnknownOption()
    .on('--help', () => {
        console.log(`    Only ${chalk.green('<project-directory>')} is required.`)
    })
    .parse(process.argv);

if ((typeof projectName).toString() === "undefined") {
    console.error('Please specify the project directory:');
    console.log(
        `  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`
    );
    console.log();
    console.log('For example:');
    console.log(`  ${chalk.cyan(program.name())} ${chalk.green('my-react-app')}`);
    console.log();
    console.log(
        `Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`
    );
    process.exit(1);
}

createApp(projectName);

function createApp(name) {
    const root = path.resolve(name);
    const appName = path.basename(root);
    const { repoName, repo } = packageJson["development-template"];
    const useYarn = shouldUseYarn() ? true : false;
    let command = 'yarn install';
    if (!useYarn) {
        const npmInfo = checkNpmVersion();
        // npm version < v5
        if (!npmInfo.hasMinNpm && npmInfo.npmVersion) {
            console.log(
                chalk.yellow(
                    `You are using npm ${npmInfo.npmVersion} so the project will be bootstrapped with an old unsupported version of tools.\n\n` +
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
    shell.cd(name);
    if (!shell.which('git')) {
        shell.echo(chalk.red('This script requires git'));
        process.exit(1);
    }
    const dirname = `_${Math.random().toString().replace('0.', '')}`;
    fs.mkdirSync(dirname);
    shell.cd(dirname);
    if (shell.exec(`git clone ${repo}`).code !== 0) {
        process.exit(1)
    }
    console.log(chalk.green('Cloning into development-templates success.'));
    console.log();
    console.log(`${command}...`);
    const src = path.resolve(repoName);
    shell.cd('../..');
    fs.readdirSync(src)
        .forEach(path => {
            shell.cp('-R', `${src}/${path}`, `${appName}/`)
        });
    shell.rm('-rf', `${name}/${dirname}`);
    shell.cd(name)
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
        console.log(
            `The directory ${chalk.green(name)} contains files that could conflict:`
        );
        console.log();
        for (const file of conflicts) {
            try {
                const stats = fs.lstatSync(path.join(root, file));
                if (stats.isDirectory()) {
                    console.log(`  ${chalk.blue(`${file}/`)}`);
                } else {
                    console.log(`  ${file}`);
                }
            } catch (e) {
                console.log(`  ${file}`);
            }
        }
        console.log();
        console.log(
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
