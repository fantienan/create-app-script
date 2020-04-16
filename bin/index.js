#!/usr/bin/env node

'use strict';
const chalk = require('chalk');
const semver = require('semver');
const requiredVersion = require('../package.json').engines.node;
const currentNodeVersion = process.versions.node;

/**
 * @param {string} wanted - 期望的node版本号
 */
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

require('./createApp');