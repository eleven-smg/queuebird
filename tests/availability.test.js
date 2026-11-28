'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classify } = require('../core/availability.js');

const STATES = new Set(['available', 'unavailable', 'unknown']);

function assertShape(result) {
  assert.equal(typeof result, 'object');
  assert.ok(STATES.has(result.state), `unexpected state: ${result.state}`);
  assert.equal(typeof result.reason, 'string');
  assert.ok(result.reason.length > 0, 'reason must not be empty');
  assert.equal(typeof result.evidence, 'object');
  assert.equal(result.evidence.rule, result.reason);
}

test('media present wins over deleted wording', () => {
  const result = classify({
    media: true,
    tombstone: false,
    text: 'this post was deleted',
    httpStatus: null,
    provider: 'dom',
    statusId: '1001',
  });

  assertShape(result);
  assert.equal(result.state, 'available');
  assert.equal(result.reason, 'media-present');
});

test('structural tombstone with no media is unavailable', () => {
  const result = classify({
    media: false,
    tombstone: true,
    text: '',
    httpStatus: null,
    provider: 'dom',
    statusId: '1002',
  });

  assertShape(result);
  assert.equal(result.state, 'unavailable');
  assert.equal(result.reason, 'structural-tombstone');
});

test('deletion wording in text alone stays unknown', () => {
  const result = classify({
    media: false,
    tombstone: false,
    text: 'This post is unavailable because it no longer exists.',
    httpStatus: 200,
    provider: 'dom',
    statusId: '1003',
  });

  assertShape(result);
  assert.equal(result.state, 'unknown');
  assert.equal(result.reason, 'text-only-wording');
});

test('a 404 from a public lookup stays unknown', () => {
  const result = classify({
    media: false,
    tombstone: false,
    text: '',
    httpStatus: 404,
    provider: 'syndication',
    statusId: '1004',
  });

  assertShape(result);
  assert.equal(result.state, 'unknown');
  assert.equal(result.reason, 'public-lookup-404');
});

test('timeout or missing response stays unknown', () => {
  const result = classify({
    media: false,
    tombstone: false,
    text: '',
    httpStatus: null,
    provider: 'oembed',
    statusId: '1005',
  });

  assertShape(result);
  assert.equal(result.state, 'unknown');
  assert.equal(result.reason, 'no-response');
});

test('missing fields stay unknown', () => {
  const result = classify({});

  assertShape(result);
  assert.equal(result.state, 'unknown');
  assert.equal(result.reason, 'missing-fields');
});

test('invalid observations never throw and stay unknown', () => {
  for (const input of [null, undefined, 'deleted', 404, []]) {
    const result = classify(input);
    assertShape(result);
    assert.equal(result.state, 'unknown');
  }
});

test('evidence echoes the observation', () => {
  const observation = {
    media: false,
    tombstone: false,
    text: '',
    httpStatus: 404,
    provider: 'manual',
    statusId: '1006',
  };
  const result = classify(observation);

  assert.deepEqual(result.evidence.observation, observation);
  assert.notEqual(result.evidence.observation, observation, 'evidence must not alias input');
});
