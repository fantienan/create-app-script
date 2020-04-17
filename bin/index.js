#!/usr/bin/env node

'use strict';
const chalk = require('chalk');
const semver = require('semver');
const requiredVersion = require('../package.json').engines.node;
const currentNodeVersion = process.versions.node;

function checkNodeVersion(wanted, id) {
  if (!semver.satisfies(process.version, wanted)) {
    console.log(chalk.red('You are running Node ' +
      currentNodeVersion +
      '.\n' +
      'Create React App requires Node ' + requiredVersion + '. \n' +
      'Please update your version of Node.'
    ));
    process.exit(1)
  }
}
checkNodeVersion(currentNodeVersion, requiredVersion);

const program = require('commander');
const minimist = require('minimist');

program
  .version(require('../package').version)
  .usage('<command> [options]');

program
  .command('create <app-name>')
  .description('create a new project powered by create-app-script-service')
  .option('-t, --template', 'choice template')
  .option('-r, --router', 'initial route')
  .action((name, cmd) => {
    const options = cleanArgs(cmd)
    if (minimist(process.argv.slice(3))._.length > 1) {
      console.log(chalk.yellow(`\nInfo: You provided more than one argument. The first one will be used as the app\'s name, the rest are ignored.`))
    }
    require('../lib/create')(name, options)
  });

program
  .command('page <page-name>')
  .description('create a new page powered by create-app-script-service')
  .option('-b, --batch', 'batch page creation')
  .action((name, cmd) => {
    const options = cleanArgs(cmd)
    if (minimist(process.argv.slice(3))._.length > 1) {
      console.log(chalk.yellow(`\nInfo: You provided more than one argument. The first one will be used as the page\'s name, the rest are ignored.`))
    }
    require('../lib/createPage')(name, options)
  })

program
  .command('router <router-name>')
  .description('create a new router powered by create-app-script-service')
  .option('-b, --batch', 'batch router creation')
  .action((name, cmd) => {
    const options = cleanArgs(cmd)
    if (minimist(process.argv.slice(3))._.length > 1) {
      console.log(chalk.yellow(`\nInfo: You provided more than one argument. The first one will be used as the page\'s name, the rest are ignored.`))
    }
    require('../lib/createRouter')(name, options)
  })

program.parse(process.argv)

function camelize(str) {
  return str.replace(/-(\w)/g, (_, c) => c ? c.toUpperCase() : '')
}

function cleanArgs(cmd) {
  const args = {}
  cmd.options.forEach(o => {
    const key = camelize(o.long.replace(/^--/, ''))
    if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
      args[key] = cmd[key]
    }
  })
  return args
}