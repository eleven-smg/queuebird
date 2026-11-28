'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { classify } = require('../core/availability.js');
const { dedupe, merge } = require('../core/queue.js');
const { readFixture, loadJsonFixture } = require('./helpers/fixtures.js');

const STATES = new Set(['available', 'unavailable', 'unknown']);

// Deliberately plain: no HTML parser and no dependency. The fixture is a
// static page, so a supported status URL is a literal https URL.
const STATUS_URL =
  /https:\/\/(?:x|twitter)\.com\/[A-Za-z0-9_]+\/status\/\d+(?:\/(?:video|photo)\/\d+)?/g;

function statusIdOf(item) {
  return item?.statusId ?? null;
}

test('availability fixtures', async (t) => {
  const cases = loadJsonFixture('availability.json');
  assert.ok(Array.isArray(cases), 'availability.json must be an array');
  assert.ok(cases.length > 0, 'availability.json must not be empty');

  for (const fixture of cases) {
    await t.test(fixture.name, () => {
      assert.ok(
        STATES.has(fixture.expected),
        `invalid expected state: ${fixture.expected}`
      );

      const result = classify(fixture.observation);
      assert.equal(result.state, fixture.expected);
    });
  }
});

test('queue dedupe fixtures', async (t) => {
  const fixtures = loadJsonFixture('queue.json');
  assert.ok(Array.isArray(fixtures.dedupe), 'queue.json dedupe must be an array');
  assert.ok(fixtures.dedupe.length > 0, 'queue.json dedupe must not be empty');

  for (const fixture of fixtures.dedupe) {
    await t.test(fixture.name, () => {
      const result = dedupe(fixture.items);
      assert.deepEqual(result.map(statusIdOf), fixture.expected);
    });
  }
});

test('queue merge fixtures', async (t) => {
  const fixtures = loadJsonFixture('queue.json');
  assert.ok(Array.isArray(fixtures.merge), 'queue.json merge must be an array');
  assert.ok(fixtures.merge.length > 0, 'queue.json merge must not be empty');

  for (const fixture of fixtures.merge) {
    await t.test(fixture.name, () => {
      const result = merge(fixture.local, fixture.remote);

      assert.deepEqual(result.items.map(statusIdOf), fixture.expected.items);
      assert.deepEqual(
        result.conflicts.map((conflict) => conflict.reason),
        fixture.expected.conflicts
      );
    });
  }
});

test('harvest fixture has exactly two unique supported status URLs', () => {
  const html = readFixture('harvest.html');
  const matches = html.match(STATUS_URL) ?? [];
  const unique = new Set(matches);

  assert.equal(
    unique.size,
    2,
    `expected 2 unique supported status URLs, found ${unique.size}`
  );
  assert.deepEqual([...unique].sort(), [
    'https://x.com/alice/status/1001',
    'https://x.com/bob/status/1002/video/1',
  ]);
});

test('fixture files are valid and non-empty', () => {
  const availability = loadJsonFixture('availability.json');
  const queue = loadJsonFixture('queue.json');
  const html = readFixture('harvest.html');

  assert.ok(Array.isArray(availability), 'availability.json must be an array');
  assert.ok(availability.length > 0, 'availability.json must not be empty');

  assert.ok(queue !== null && typeof queue === 'object', 'queue.json must be an object');
  assert.ok(Array.isArray(queue.dedupe), 'queue.json dedupe must be an array');
  assert.ok(Array.isArray(queue.merge), 'queue.json merge must be an array');

  assert.equal(typeof html, 'string', 'harvest.html must be text');
  assert.ok(html.trim().length > 0, 'harvest.html must not be empty');
});
