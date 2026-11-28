'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dedupe, merge, scopeKey } = require('../core/queue.js');

function clone(value) {
  return structuredClone(value);
}

test('dedupe removes exact duplicates and keeps order', () => {
  const items = [
    { statusId: '1', text: 'one' },
    { statusId: '2', text: 'two' },
    { statusId: '1', text: 'one' },
    { statusId: '3', text: 'three' },
    { statusId: '2', text: 'two' },
  ];

  const result = dedupe(items);

  assert.deepEqual(result, [
    { statusId: '1', text: 'one' },
    { statusId: '2', text: 'two' },
    { statusId: '3', text: 'three' },
  ]);
  assert.notEqual(result, items, 'dedupe must return a new array');
});

test('dedupe keeps the first occurrence when content differs', () => {
  const first = { statusId: '1', text: 'first' };
  const second = { statusId: '1', text: 'second' };

  const result = dedupe([first, second]);

  assert.equal(result.length, 1);
  assert.equal(result[0], first);
});

test('dedupe treats wrapper, original and status IDs as the same post', () => {
  const original = { statusId: '10', text: 'original' };
  const wrapper = { statusId: '11', wrapperStatusId: '10', text: 'wrapper' };
  const quote = { statusId: '12', originalStatusId: '10', text: 'quote' };

  assert.deepEqual(dedupe([original, wrapper, quote]), [original]);
  assert.deepEqual(dedupe([wrapper, original, quote]), [wrapper]);
});

test('dedupe retains malformed items in place and does not mutate the input', () => {
  const malformed = { text: 'no alias' };
  const items = [
    { statusId: '1', text: 'one' },
    malformed,
    null,
    'not-an-item',
    { statusId: '2', originalStatusId: '1' },
    { statusId: '3', text: 'three' },
  ];
  const before = clone(items);

  const result = dedupe(items);

  assert.equal(result.length, 5);
  assert.equal(result[0], items[0]);
  assert.equal(result[1], malformed);
  assert.equal(result[2], null);
  assert.equal(result[3], 'not-an-item');
  assert.equal(result[4], items[5]);
  assert.notEqual(result, items);
  assert.deepEqual(items, before, 'input must not be mutated');
});

test('dedupe never drops repeated malformed items', () => {
  const malformed = { text: 'no alias' };

  assert.deepEqual(dedupe([malformed, malformed]), [malformed, malformed]);
});

test('merge unions local and remote without duplicates', () => {
  const local = [
    { statusId: '1', text: 'one' },
    { statusId: '2', text: 'two' },
  ];
  const remote = [
    { statusId: '2', text: 'two' },
    { statusId: '3', text: 'three' },
    { statusId: '1', text: 'one' },
  ];

  const result = merge(local, remote);

  assert.deepEqual(result.items, [
    { statusId: '1', text: 'one' },
    { statusId: '2', text: 'two' },
    { statusId: '3', text: 'three' },
  ]);
  assert.deepEqual(result.conflicts, []);
});

test('merge collapses structurally identical records regardless of key order', () => {
  const local = [
    {
      statusId: '1',
      text: 'hello',
      media: { width: 10, height: 20 },
    },
  ];
  const remote = [
    {
      media: { height: 20, width: 10 },
      text: 'hello',
      statusId: '1',
    },
  ];

  const result = merge(local, remote);

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0], local[0]);
  assert.deepEqual(result.conflicts, []);
});

test('merge keeps local and reports a divergent record as a conflict', () => {
  const localItem = { statusId: '1', text: 'local' };
  const remoteItem = { statusId: '1', text: 'remote' };

  const result = merge([localItem], [remoteItem]);

  assert.deepEqual(result.items, [localItem]);
  assert.equal(result.items[0], localItem);
  assert.equal(result.conflicts.length, 1);

  const [conflict] = result.conflicts;
  assert.equal(conflict.statusId, '1');
  assert.equal(conflict.local, localItem);
  assert.equal(conflict.remote, remoteItem);
  assert.equal(conflict.reason, 'divergent-record');
});

test('merge detects divergence through a non-primary alias', () => {
  const localItem = { statusId: '1', text: 'local' };
  const remoteItem = { wrapperStatusId: '1', text: 'remote' };

  const result = merge([localItem], [remoteItem]);

  assert.deepEqual(result.items, [localItem]);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].statusId, '1');
  assert.equal(result.conflicts[0].reason, 'divergent-record');
});

test('merge retains malformed items from both sides and reports them', () => {
  const localBad = { text: 'bad local' };
  const remoteBad = { text: 'bad remote' };
  const good = { statusId: '1', text: 'one' };

  const result = merge([good, localBad], [good, remoteBad, 42]);

  assert.deepEqual(result.items, [good, localBad, remoteBad, 42]);
  assert.equal(result.conflicts.length, 3);

  assert.equal(result.conflicts[0].item, localBad);
  assert.equal(result.conflicts[0].side, 'local');
  assert.equal(result.conflicts[0].reason, 'malformed-record');

  assert.equal(result.conflicts[1].item, remoteBad);
  assert.equal(result.conflicts[1].side, 'remote');
  assert.equal(result.conflicts[1].reason, 'malformed-record');

  assert.equal(result.conflicts[2].item, 42);
  assert.equal(result.conflicts[2].side, 'remote');
  assert.equal(result.conflicts[2].reason, 'malformed-record');
});

test('merge does not mutate either input', () => {
  const local = [
    { statusId: '1', text: 'local' },
    { text: 'bad local' },
  ];
  const remote = [
    { statusId: '1', text: 'remote' },
    { statusId: '2', text: 'two' },
  ];
  const localBefore = clone(local);
  const remoteBefore = clone(remote);

  const result = merge(local, remote);

  assert.deepEqual(local, localBefore);
  assert.deepEqual(remote, remoteBefore);
  assert.equal(result.items[0], local[0]);
  assert.equal(result.items[1], local[1]);
  assert.equal(result.items[2], remote[1]);
});

test('merge treats non-array sides as empty', () => {
  const remote = [{ statusId: '1', text: 'one' }];

  assert.deepEqual(merge(null, undefined), { items: [], conflicts: [] });
  assert.deepEqual(merge('nope', {}), { items: [], conflicts: [] });
  assert.deepEqual(merge(undefined, remote), { items: remote, conflicts: [] });
});

test('merge collapses duplicate local posts to their first occurrence', () => {
  const first = { statusId: '1', text: 'first' };
  const second = { statusId: '1', text: 'second' };

  const result = merge([first, second], []);

  assert.deepEqual(result.items, [first]);
  assert.deepEqual(result.conflicts, []);
});

test('scopeKey normalises case and @, and falls back for empty or invalid input', () => {
  assert.equal(scopeKey(' queue ', ' @Alice '), 'queue::alice');
  assert.equal(scopeKey('Queue', '@USER'), 'Queue::user');
  assert.equal(scopeKey('queue', '@@User'), 'queue::@user');
  assert.equal(scopeKey('', ''), 'queue::default');
  assert.equal(scopeKey('   ', '   '), 'queue::default');
  assert.equal(scopeKey(null, undefined), 'queue::default');
  assert.equal(scopeKey(42, {}), 'queue::default');
});

test('invalid arguments never throw', () => {
  assert.deepEqual(dedupe(null), []);
  assert.deepEqual(dedupe(undefined), []);
  assert.deepEqual(dedupe('nope'), []);
  assert.deepEqual(dedupe({}), []);
  assert.deepEqual(merge(null, undefined), { items: [], conflicts: [] });

  assert.doesNotThrow(() => scopeKey(Symbol('base'), Symbol('account')));

  const hostile = {
    get statusId() {
      throw new Error('boom');
    },
  };

  const deduped = dedupe([hostile]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0], hostile);

  const mergedLocal = merge([hostile], []);
  assert.equal(mergedLocal.items[0], hostile);
  assert.equal(mergedLocal.conflicts[0].side, 'local');
  assert.equal(mergedLocal.conflicts[0].reason, 'malformed-record');

  const mergedRemote = merge([], [hostile]);
  assert.equal(mergedRemote.items[0], hostile);
  assert.equal(mergedRemote.conflicts[0].side, 'remote');
  assert.equal(mergedRemote.conflicts[0].reason, 'malformed-record');
});
