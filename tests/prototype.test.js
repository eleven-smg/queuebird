'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const prototypeDir = path.join(root, 'docs', 'prototype');
const htmlPath = path.join(prototypeDir, 'shell.html');
const cssPath = path.join(prototypeDir, 'shell.css');
const jsPath = path.join(prototypeDir, 'shell.js');
const readmePath = path.join(prototypeDir, 'README.md');

const WORKSPACES = [
  'accounts',
  'sources',
  'library',
  'plan',
  'publish',
  'cleanup',
  'settings',
];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function matchOrFail(value, pattern, message) {
  const match = value.match(pattern);
  assert.ok(match, message);
  return match;
}

test('all seven workspace ids exist and every nav target resolves', () => {
  const html = read(htmlPath);
  const nav = matchOrFail(html, /<nav\b[\s\S]*?<\/nav>/i, 'expected a nav landmark')[0];
  const targets = [...nav.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(targets, WORKSPACES, 'nav must list the seven workspaces in IA order');

  const sectionIds = [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(
    (match) => match[1]
  );

  for (const id of WORKSPACES) {
    assert.ok(sectionIds.includes(id), `missing <section id="${id}">`);
    assert.match(html, new RegExp(`id="${id}"`), `nav target #${id} must resolve`);
  }
});

test('there is exactly one h1 and a skip link to the main landmark', () => {
  const html = read(htmlPath);
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  assert.equal(h1Count, 1, 'expected exactly one h1');

  const skipLink = matchOrFail(
    html,
    /<a\b(?=[^>]*class="[^"]*\bskip-link\b)[^>]*>/i,
    'expected a skip link'
  )[0];
  const target = matchOrFail(skipLink, /href="#([^"]+)"/i, 'skip link needs a hash target')[1];

  assert.match(
    html,
    new RegExp(`<main\\b[^>]*\\bid="${target}"`),
    'skip link must target the main landmark'
  );
});

test('no inline style attributes and no native dialogs', () => {
  for (const file of [htmlPath, jsPath]) {
    const text = read(file);
    const name = path.basename(file);

    assert.doesNotMatch(text, /\sstyle\s*=/i, `${name} must not use inline style attributes`);
    assert.doesNotMatch(
      text,
      /\b(?:prompt|alert|confirm)\s*\(/,
      `${name} must not call native dialogs`
    );
  }
});

test('the stylesheet is linked and defines tokens, focus-visible and a media query', () => {
  const html = read(htmlPath);
  const link = matchOrFail(
    html,
    /<link\b(?=[^>]*rel="stylesheet")[^>]*>/i,
    'expected a linked stylesheet'
  )[0];

  assert.match(link, /href="shell\.css"/i, 'stylesheet must be shell.css');

  const css = read(cssPath);
  assert.match(css, /:root\s*\{/, 'CSS must define :root tokens');
  assert.match(css, /:focus-visible/, 'CSS must define :focus-visible');
  assert.match(css, /@media\b/, 'CSS must include a media query');
});

test('HTML and JS contain no external URLs', () => {
  for (const file of [htmlPath, jsPath]) {
    assert.doesNotMatch(
      read(file),
      /https?:\/\//i,
      `${path.basename(file)} must not reference the network`
    );
  }
});

test('the status strip labels account, dry-run, queue and next slot', () => {
  const html = read(htmlPath);
  const strip = matchOrFail(
    html,
    /<dl\b(?=[^>]*class="[^"]*\bstatus-strip\b)[\s\S]*?<\/dl>/i,
    'expected a status strip'
  )[0];

  for (const key of ['account', 'dry-run', 'queue', 'next-slot']) {
    assert.match(strip, new RegExp(`data-status="${key}"`), `status strip missing ${key}`);
  }

  assert.match(strip, /@example/, 'account value must be present and synthetic');
  assert.match(strip, /\bDry-run\b/i, 'dry-run label must be present');
  assert.match(strip, /state-on[^>]*>on</i, 'dry-run must show on');
  assert.match(strip, /\bQueued\b/i, 'queue label must be present');
  assert.match(strip, /\bNext slot\b/i, 'next-slot label must be present');
});

test('the README explains that this is a prototype and is not wired', () => {
  const readme = read(readmePath);

  assert.match(readme, /prototype/i, 'README must call it a prototype');
  assert.match(readme, /not wired/i, 'README must say what is not wired');
  assert.match(readme, /not (?:shipped|installed)/i, 'README must say it is not shipped');
});
