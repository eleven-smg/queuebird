'use strict';

/**
 * Revisioned key/value store over a synchronous adapter.
 *
 * Pure module: no DOM, no network, no storage globals, no clock, no randomness.
 * Contract: core/README.md ("core/storage.js - issue #91").
 *
 * The adapter is synchronous:
 *   get(key)                  -> envelope | undefined
 *   set(key, envelope)        -> void
 *   subscribe(listener)       -> unsubscribe        (optional)
 *
 * One envelope is stored per key: { value, revision }. Revisions are
 * non-negative integers and start at 1 on the first write.
 */

const OK = 'ok';
const MISSING = 'missing';
const MALFORMED = 'malformed';
const STALE_REVISION = 'stale-revision';
const MALFORMED_RECORD = 'malformed-record';
const INVALID_KEY = 'invalid-key';
const INVALID_ADAPTER = 'invalid-adapter';
const INVALID_OPTIONS = 'invalid-options';
const INVALID_EXPECTED_REVISION = 'invalid-expected-revision';
const INVALID_LEGACY = 'invalid-legacy';
const ADAPTER_ERROR = 'adapter-error';

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidKey(key) {
  return typeof key === 'string' && key.length > 0;
}

function hasOwn(record, field) {
  return Object.prototype.hasOwnProperty.call(record, field);
}

/**
 * An envelope is exactly a record with an own `value` and an integer
 * `revision` of zero or more. Anything else read from the adapter is
 * malformed and must be preserved rather than trusted.
 */
function isEnvelope(record) {
  if (!isRecord(record)) return false;
  try {
    return (
      hasOwn(record, 'value') &&
      hasOwn(record, 'revision') &&
      Number.isInteger(record.revision) &&
      record.revision >= 0
    );
  } catch (_) {
    return false;
  }
}

function isPlainObject(value) {
  if (!isRecord(value)) return false;
  try {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  } catch (_) {
    return false;
  }
}

function safeCall(listener, change) {
  try {
    listener(change);
  } catch (_) {
    // A listener must never break the store or the other listeners.
  }
}

function createStore(adapter) {
  let usable = false;
  try {
    usable =
      isRecord(adapter) &&
      typeof adapter.get === 'function' &&
      typeof adapter.set === 'function';
  } catch (_) {
    usable = false;
  }

  const listeners = new Set();
  const adapterStops = new Map();

  function notify(change) {
    // Snapshot so a listener that unsubscribes mid-delivery cannot skip peers.
    for (const listener of Array.from(listeners)) {
      safeCall(listener, change);
    }
  }

  function read(key) {
    if (!isValidKey(key)) {
      return { ok: false, value: null, revision: 0, reason: INVALID_KEY };
    }
    if (!usable) {
      return { ok: false, value: null, revision: 0, reason: INVALID_ADAPTER };
    }

    let record;
    try {
      record = adapter.get(key);
    } catch (_) {
      return { ok: false, value: null, revision: 0, reason: ADAPTER_ERROR };
    }

    if (record === undefined) {
      return { ok: false, value: null, revision: 0, reason: MISSING };
    }
    if (!isEnvelope(record)) {
      // Malformed records are reported and preserved; read never drops them.
      return { ok: false, value: record, revision: 0, reason: MALFORMED };
    }

    let value;
    try {
      value = record.value;
    } catch (_) {
      return { ok: false, value: record, revision: 0, reason: MALFORMED };
    }

    return { ok: true, value, revision: record.revision, reason: OK };
  }

  function write(key, value, options) {
    if (!isValidKey(key)) {
      return { ok: false, revision: 0, reason: INVALID_KEY };
    }
    if (!usable) {
      return { ok: false, revision: 0, reason: INVALID_ADAPTER };
    }

    let opts;
    let expected;
    try {
      opts = options === undefined || options === null ? {} : options;
      if (!isRecord(opts)) {
        return { ok: false, revision: 0, reason: INVALID_OPTIONS };
      }
      expected = opts.expectedRevision;
    } catch (_) {
      return { ok: false, revision: 0, reason: INVALID_EXPECTED_REVISION };
    }

    const conditional = expected !== undefined && expected !== null;
    if (conditional && typeof expected !== 'number') {
      return { ok: false, revision: 0, reason: INVALID_EXPECTED_REVISION };
    }

    let record;
    try {
      record = adapter.get(key);
    } catch (_) {
      return { ok: false, revision: 0, reason: ADAPTER_ERROR };
    }

    const present = record !== undefined;
    const valid = isEnvelope(record);
    const current = valid ? record.revision : 0;

    if (present && !valid) {
      // A malformed record may only be replaced unconditionally or by an
      // explicit revision 0; a conditional write must not discard it.
      if (conditional && expected !== 0) {
        return { ok: false, revision: 0, reason: MALFORMED_RECORD };
      }
    } else if (valid) {
      if (conditional && expected !== current) {
        return { ok: false, revision: current, reason: STALE_REVISION };
      }
    } else if (conditional && expected !== 0) {
      // Absent record: current revision is 0, so only 0 may create it.
      return { ok: false, revision: 0, reason: STALE_REVISION };
    }

    const revision = current + 1;
    try {
      adapter.set(key, { value, revision });
    } catch (_) {
      return { ok: false, revision: current, reason: ADAPTER_ERROR };
    }

    notify({ key, value, revision });
    return { ok: true, revision, reason: OK };
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      return function unsubscribe() {};
    }

    // Subscribing the same function twice keeps one adapter bridge. Any of the
    // returned unsubscribe functions removes the shared subscription.
    if (!listeners.has(listener)) {
      listeners.add(listener);

      let stop = null;
      if (usable) {
        try {
          if (typeof adapter.subscribe === 'function') {
            const unsubscribeAdapter = adapter.subscribe((change) => {
              if (!listeners.has(listener) || !isRecord(change)) return;
              safeCall(listener, {
                key: change.key,
                value: change.value,
                revision: change.revision,
              });
            });
            if (typeof unsubscribeAdapter === 'function') {
              stop = unsubscribeAdapter;
            }
          }
        } catch (_) {
          stop = null;
        }
      }
      adapterStops.set(listener, stop);
    }

    let active = true;
    return function unsubscribe() {
      if (!active) return;
      active = false;
      listeners.delete(listener);

      const stop = adapterStops.get(listener);
      adapterStops.delete(listener);
      if (typeof stop === 'function') {
        try {
          stop();
        } catch (_) {
          // Unsubscribing must never throw.
        }
      }
    };
  }

  function migrate(legacy) {
    if (!isPlainObject(legacy)) {
      return { migrated: [], skipped: [], reason: INVALID_LEGACY };
    }

    let keys;
    try {
      keys = Object.keys(legacy);
    } catch (_) {
      return { migrated: [], skipped: [], reason: INVALID_LEGACY };
    }

    if (!usable) {
      return {
        migrated: [],
        skipped: keys.map((key) => ({ key, reason: INVALID_ADAPTER })),
        reason: INVALID_ADAPTER,
      };
    }

    const migrated = [];
    const skipped = [];

    for (const key of keys) {
      let value;
      try {
        value = legacy[key];
      } catch (_) {
        skipped.push({ key, reason: 'invalid-value' });
        continue;
      }

      if (read(key).ok) {
        skipped.push({ key, reason: 'existing' });
        continue;
      }

      // Missing or malformed: expectedRevision 0 replaces it with revision 1.
      const result = write(key, value, { expectedRevision: 0 });
      if (result.ok) {
        migrated.push(key);
      } else {
        skipped.push({ key, reason: result.reason });
      }
    }

    return { migrated, skipped, reason: OK };
  }

  return { read, write, subscribe, migrate };
}

module.exports = { createStore };
