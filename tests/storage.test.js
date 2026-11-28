'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../core/storage.js');

function memoryAdapter() {
  const records = new Map();
  const listeners = new Set();

  return {
    records,
    get(key) {
      return records.get(key);
    },
    set(key, envelope) {
      records.set(key, envelope);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    push(change) {
      for (const listener of Array.from(listeners)) listener(change);
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

test('read of an absent key reports missing', () => {
  const store = createStore(memoryAdapter());

  assert.deepEqual(store.read('nope'), {
    ok: false,
    value: null,
    revision: 0,
    reason: 'missing',
  });
});

test('first write creates revision 1 and a conditional write reaches 2', () => {
  const store = createStore(memoryAdapter());

  assert.deepEqual(store.write('k', 'one'), { ok: true, revision: 1, reason: 'ok' });
  assert.deepEqual(store.write('k', 'two', { expectedRevision: 1 }), {
    ok: true,
    revision: 2,
    reason: 'ok',
  });
  assert.deepEqual(store.read('k'), {
    ok: true,
    value: 'two',
    revision: 2,
    reason: 'ok',
  });
});

test('stale expectedRevision is rejected and the stored value is unchanged', () => {
  const store = createStore(memoryAdapter());

  store.write('k', 'one');
  store.write('k', 'two', { expectedRevision: 1 });

  assert.deepEqual(store.write('k', 'three', { expectedRevision: 1 }), {
    ok: false,
    revision: 2,
    reason: 'stale-revision',
  });
  assert.deepEqual(store.read('k'), {
    ok: true,
    value: 'two',
    revision: 2,
    reason: 'ok',
  });
});

test('two stores over one adapter: only the first conditional write wins', () => {
  const adapter = memoryAdapter();
  const first = createStore(adapter);
  const second = createStore(adapter);

  first.write('k', 'seed');

  assert.deepEqual(first.write('k', 'first', { expectedRevision: 1 }), {
    ok: true,
    revision: 2,
    reason: 'ok',
  });
  assert.deepEqual(second.write('k', 'second', { expectedRevision: 1 }), {
    ok: false,
    revision: 2,
    reason: 'stale-revision',
  });
  assert.equal(second.read('k').value, 'first');
});

test('malformed envelopes are reported and preserved, never dropped by read', () => {
  const adapter = memoryAdapter();
  const raw = { value: 'kept', revision: 'one' };
  adapter.records.set('bad', raw);
  adapter.records.set('junk', 'not an envelope');
  const store = createStore(adapter);

  const malformed = store.read('bad');
  assert.equal(malformed.ok, false);
  assert.equal(malformed.reason, 'malformed');
  assert.equal(malformed.revision, 0);
  assert.deepEqual(malformed.value, raw);
  assert.equal(adapter.records.get('bad'), raw, 'raw record must be preserved');

  assert.deepEqual(store.read('junk'), {
    ok: false,
    value: 'not an envelope',
    revision: 0,
    reason: 'malformed',
  });
  assert.equal(adapter.records.get('junk'), 'not an envelope');
});

test('invalid envelope shapes are all malformed', () => {
  const cases = [
    null,
    'garbage',
    [],
    {},
    { value: 'v' },
    { revision: 1 },
    { value: 'v', revision: 1.5 },
    { value: 'v', revision: -1 },
    { value: 'v', revision: '1' },
  ];

  for (const raw of cases) {
    const adapter = memoryAdapter();
    adapter.records.set('k', raw);
    const result = createStore(adapter).read('k');

    assert.equal(result.ok, false, `expected malformed for ${JSON.stringify(raw)}`);
    assert.equal(result.reason, 'malformed');
    assert.equal(result.value, raw);
  }
});

test('a conditional write against a malformed record is rejected unless expectedRevision is 0', () => {
  const adapter = memoryAdapter();
  const raw = { value: 'kept', revision: 'one' };
  adapter.records.set('bad', raw);
  const store = createStore(adapter);

  assert.deepEqual(store.write('bad', 'new', { expectedRevision: 1 }), {
    ok: false,
    revision: 0,
    reason: 'malformed-record',
  });
  assert.equal(adapter.records.get('bad'), raw);

  assert.deepEqual(store.write('bad', 'new', { expectedRevision: 0 }), {
    ok: true,
    revision: 1,
    reason: 'ok',
  });
  assert.deepEqual(store.read('bad'), {
    ok: true,
    value: 'new',
    revision: 1,
    reason: 'ok',
  });
});

test('an unconditional write replaces a malformed record', () => {
  const adapter = memoryAdapter();
  adapter.records.set('bad', { value: 'kept', revision: 'one' });
  const store = createStore(adapter);

  assert.deepEqual(store.write('bad', 'replaced'), {
    ok: true,
    revision: 1,
    reason: 'ok',
  });
  assert.deepEqual(store.read('bad'), {
    ok: true,
    value: 'replaced',
    revision: 1,
    reason: 'ok',
  });
});

test('subscribe fires on local write and unsubscribe stops delivery', () => {
  const adapter = memoryAdapter();
  const store = createStore(adapter);
  const seen = [];

  const unsubscribe = store.subscribe((change) => seen.push(change));
  store.write('k', 'one');
  assert.deepEqual(seen, [{ key: 'k', value: 'one', revision: 1 }]);
  assert.equal(adapter.listenerCount(), 1);

  unsubscribe();
  assert.equal(adapter.listenerCount(), 0);

  store.write('k', 'two', { expectedRevision: 1 });
  assert.equal(seen.length, 1);
  assert.doesNotThrow(unsubscribe);
});

test('subscribe receives adapter pushes and stops after unsubscribe', () => {
  const adapter = memoryAdapter();
  const store = createStore(adapter);
  const seen = [];

  const unsubscribe = store.subscribe((change) => seen.push(change));
  adapter.push({ key: 'remote', value: 'v', revision: 4 });
  assert.deepEqual(seen, [{ key: 'remote', value: 'v', revision: 4 }]);

  unsubscribe();
  adapter.push({ key: 'remote', value: 'w', revision: 5 });
  assert.equal(seen.length, 1);
});

test('subscribing the same listener twice keeps one adapter bridge', () => {
  const adapter = memoryAdapter();
  const store = createStore(adapter);
  const seen = [];
  const listener = (change) => seen.push(change);

  const first = store.subscribe(listener);
  const second = store.subscribe(listener);
  assert.equal(adapter.listenerCount(), 1);

  store.write('k', 'one');
  assert.equal(seen.length, 1);
  adapter.push({ key: 'remote', value: 'v', revision: 2 });
  assert.equal(seen.length, 2);

  first();
  second();
  store.write('k', 'two', { expectedRevision: 1 });
  assert.equal(seen.length, 2);
});

test('a throwing subscriber does not break the store or other subscribers', () => {
  const adapter = memoryAdapter();
  const store = createStore(adapter);
  const seen = [];

  store.subscribe(() => {
    throw new Error('boom');
  });
  store.subscribe((change) => seen.push(change));

  assert.doesNotThrow(() => store.write('k', 'one'));
  assert.deepEqual(seen, [{ key: 'k', value: 'one', revision: 1 }]);
  assert.equal(store.read('k').ok, true);

  assert.doesNotThrow(() =>
    adapter.push({ key: 'remote', value: 'v', revision: 2 })
  );
  assert.deepEqual(seen, [
    { key: 'k', value: 'one', revision: 1 },
    { key: 'remote', value: 'v', revision: 2 },
  ]);
});

test('migrate writes missing keys, skips valid ones and is idempotent', () => {
  const adapter = memoryAdapter();
  adapter.records.set('existing', { value: 'old', revision: 3 });
  const store = createStore(adapter);
  const legacy = { existing: 'new', fresh: 'v1', other: 'v2' };

  const first = store.migrate(legacy);
  assert.deepEqual(first.migrated, ['fresh', 'other']);
  assert.deepEqual(first.skipped, [{ key: 'existing', reason: 'existing' }]);
  assert.equal(first.reason, 'ok');

  assert.deepEqual(store.read('existing'), {
    ok: true,
    value: 'old',
    revision: 3,
    reason: 'ok',
  });
  assert.deepEqual(store.read('fresh'), {
    ok: true,
    value: 'v1',
    revision: 1,
    reason: 'ok',
  });

  const second = store.migrate(legacy);
  assert.deepEqual(second.migrated, []);
  assert.deepEqual(second.skipped, [
    { key: 'existing', reason: 'existing' },
    { key: 'fresh', reason: 'existing' },
    { key: 'other', reason: 'existing' },
  ]);
  assert.equal(second.reason, 'ok');
});

test('migrate replaces malformed records with revision 1', () => {
  const adapter = memoryAdapter();
  adapter.records.set('bad', { value: 'kept', revision: 'one' });
  const store = createStore(adapter);

  assert.deepEqual(store.migrate({ bad: 'good' }), {
    migrated: ['bad'],
    skipped: [],
    reason: 'ok',
  });
  assert.deepEqual(store.read('bad'), {
    ok: true,
    value: 'good',
    revision: 1,
    reason: 'ok',
  });
});

test('a conditional write cannot create an absent key with a non-zero revision', () => {
  const store = createStore(memoryAdapter());

  assert.deepEqual(store.write('k', 'v', { expectedRevision: 1 }), {
    ok: false,
    revision: 0,
    reason: 'stale-revision',
  });
  assert.equal(store.read('k').reason, 'missing');
  assert.deepEqual(store.write('k', 'v', { expectedRevision: 0 }), {
    ok: true,
    revision: 1,
    reason: 'ok',
  });
});

test('an adapter without subscribe still supports local writes', () => {
  const records = new Map();
  const store = createStore({
    get: (key) => records.get(key),
    set: (key, envelope) => records.set(key, envelope),
  });
  const seen = [];

  const unsubscribe = store.subscribe((change) => seen.push(change));
  store.write('k', 'v');
  assert.deepEqual(seen, [{ key: 'k', value: 'v', revision: 1 }]);

  assert.doesNotThrow(unsubscribe);
  store.write('k', 'w', { expectedRevision: 1 });
  assert.equal(seen.length, 1);
});

test('invalid arguments never throw', () => {
  const store = createStore(memoryAdapter());

  assert.doesNotThrow(() => {
    assert.equal(store.read().reason, 'invalid-key');
    assert.equal(store.read(42).reason, 'invalid-key');
    assert.equal(store.read('').reason, 'invalid-key');

    assert.equal(store.write().reason, 'invalid-key');
    assert.equal(store.write('k', 'v', 'nope').reason, 'invalid-options');
    assert.equal(
      store.write('k', 'v', { expectedRevision: '1' }).reason,
      'invalid-expected-revision'
    );

    const unsubscribe = store.subscribe(null);
    assert.equal(typeof unsubscribe, 'function');
    unsubscribe();

    assert.equal(store.migrate(null).reason, 'invalid-legacy');
    assert.equal(store.migrate([]).reason, 'invalid-legacy');
    assert.equal(store.migrate('nope').reason, 'invalid-legacy');
  });
});

test('an unusable adapter is reported instead of throwing', () => {
  for (const adapter of [null, undefined, {}, { get() {} }, { set() {} }]) {
    const store = createStore(adapter);

    assert.equal(store.read('k').reason, 'invalid-adapter');
    assert.equal(store.write('k', 'v').reason, 'invalid-adapter');
    assert.doesNotThrow(store.subscribe(() => {}));

    const result = store.migrate({ a: 1 });
    assert.deepEqual(result.migrated, []);
    assert.equal(result.reason, 'invalid-adapter');
  }
});
