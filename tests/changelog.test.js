'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const changelogPath = path.join(root, 'CHANGELOG.md');
const packagePath = path.join(root, 'package.json');
const userscriptPath = path.join(root, 'src', 'x-bulk-scheduler.user.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function releasedHeadings(text) {
  const headings = [];
  for (const match of text.matchAll(/^## \[([^\]]+)\](.*)$/gm)) {
    if (match[1] === 'Unreleased') continue;
    headings.push({ version: match[1], line: match[0] });
  }
  return headings;
}

test('CHANGELOG.md exists, is non-empty and starts with # Changelog', () => {
  assert.ok(fs.existsSync(changelogPath), 'CHANGELOG.md must exist');

  const text = read(changelogPath);
  assert.ok(text.trim().length > 0, 'CHANGELOG.md must not be empty');
  assert.ok(text.startsWith('# Changelog'), 'CHANGELOG.md must start with # Changelog');
});

test('CHANGELOG.md contains an Unreleased section', () => {
  const text = read(changelogPath);
  assert.match(text, /^## \[Unreleased\]$/m, 'missing ## [Unreleased] heading');
});

test('CHANGELOG.md contains a heading for the package version', () => {
  const pkg = JSON.parse(read(packagePath));
  const text = read(changelogPath);
  const heading = new RegExp(
    `^## \\[${escapeRegExp(pkg.version)}\\] - \\d{4}-\\d{2}-\\d{2}$`,
    'm'
  );

  assert.match(
    text,
    heading,
    `missing released heading for package version ${pkg.version}`
  );
});

test('userscript @version matches package.json', () => {
  const pkg = JSON.parse(read(packagePath));
  const source = read(userscriptPath);
  const match = source.match(/^\/\/\s*@version\s+(\S+)\s*$/m);

  assert.ok(match, 'userscript metadata must declare @version');
  assert.equal(match[1], pkg.version, 'package.json and userscript @version must match');
});

test('every released heading matches ## [x.y.z] - YYYY-MM-DD', () => {
  const headings = releasedHeadings(read(changelogPath));

  assert.ok(headings.length > 0, 'expected at least one released version');
  for (const heading of headings) {
    assert.match(
      heading.line,
      /^## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}$/,
      `malformed released heading: ${heading.line}`
    );
  }
});

test('no released version appears twice', () => {
  const versions = releasedHeadings(read(changelogPath)).map((h) => h.version);
  const duplicates = versions.filter((version, index) => versions.indexOf(version) !== index);

  assert.deepEqual(duplicates, [], `duplicate released versions: ${duplicates.join(', ')}`);
});
