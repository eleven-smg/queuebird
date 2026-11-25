'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'x-bulk-scheduler.user.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function header() {
  const match = source.match(/^\/\/ ==UserScript==([\s\S]*?)\/\/ ==\/UserScript==/);
  assert.ok(match, 'userscript metadata block must be present and closed');
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^\/\/\s+@(\S+)\s+(.*)$/);
    if (m) fields.set(m[1], (fields.get(m[1]) || []).concat(m[2].trim()));
  }
  return fields;
}

test('metadata block declares the required keys', () => {
  const h = header();
  for (const key of ['name', 'namespace', 'version', 'description', 'match', 'grant', 'run-at']) {
    assert.ok(h.has(key), `missing @${key}`);
  }
  assert.ok(h.get('match').some((m) => m.includes('x.com')), '@match must cover x.com');
  assert.ok(h.get('grant').includes('GM_setValue'), 'must declare GM_setValue');
  assert.ok(h.get('grant').includes('GM_getValue'), 'must declare GM_getValue');
});

test('userscript version matches package.json', () => {
  const h = header();
  assert.equal(h.get('version')[0], pkg.version, 'bump both together');
});

test('update and download URLs agree', () => {
  const h = header();
  assert.ok(h.has('updateURL'), 'missing @updateURL');
  assert.ok(h.has('downloadURL'), 'missing @downloadURL');
  assert.equal(h.get('updateURL')[0], h.get('downloadURL')[0]);
  assert.match(h.get('updateURL')[0], /^https:\/\/raw\.githubusercontent\.com\//);
});

test('source compiles as a script without executing', () => {
  assert.doesNotThrow(() => new vm.Script(source, { filename: 'x-bulk-scheduler.user.js' }));
});

test('no plaintext credentials or tokens in source', () => {
  assert.doesNotMatch(source, /ghp_[A-Za-z0-9]{20,}/);
  assert.doesNotMatch(source, /github_pat_[A-Za-z0-9_]{20,}/);
  assert.doesNotMatch(source, /-----BEGIN [A-Z ]*PRIVATE KEY-----/);
});
