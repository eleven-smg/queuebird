'use strict';

const path = require('node:path');
const fs = require('node:fs');

const fixturesDir = path.join(__dirname, '..', 'fixtures');

function fixturePath(name) {
  return path.join(fixturesDir, name);
}

function readFixture(name) {
  return fs.readFileSync(fixturePath(name), 'utf8');
}

function loadJsonFixture(name) {
  return JSON.parse(readFixture(name));
}

module.exports = {
  fixturesDir,
  fixturePath,
  readFixture,
  loadJsonFixture,
};
