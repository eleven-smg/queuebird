'use strict';

/**
 * Queue deduplication, merging and per-account scope keys.
 *
 * Pure module: no DOM, no network, no storage, no clock, no randomness.
 * Contract: core/README.md ("core/queue.js - issue #91").
 *
 * A post is identified by any of its aliases: `statusId`, `originalStatusId`
 * or `wrapperStatusId`. A wrapper record and the original record therefore
 * describe the same post even when their primary IDs differ.
 */

const ALIAS_FIELDS = ['statusId', 'originalStatusId', 'wrapperStatusId'];

const MALFORMED_RECORD = 'malformed-record';
const DIVERGENT_RECORD = 'divergent-record';

const DEFAULT_BASE = 'queue';
const DEFAULT_ACCOUNT = 'default';

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function hasOwn(record, field) {
  return Object.prototype.hasOwnProperty.call(record, field);
}

/**
 * aliasesOf(item) -> string[] | null
 *
 * Returns the non-empty aliases of a well-formed item, or `null` when the item
 * is not a plain record or has no usable string alias. Aliases are trimmed and
 * de-duplicated for comparison; the item itself is never modified.
 */
function aliasesOf(item) {
  if (!isPlainObject(item)) return null;

  let aliases;
  try {
    aliases = [];
    for (const field of ALIAS_FIELDS) {
      if (!hasOwn(item, field)) continue;

      const value = item[field];
      if (typeof value !== 'string') continue;

      const alias = value.trim();
      if (alias.length === 0) continue;
      if (!aliases.includes(alias)) aliases.push(alias);
    }
  } catch (_) {
    // A hostile getter or proxy is malformed, never a crash.
    return null;
  }

  return aliases.length > 0 ? aliases : null;
}

function samePrimitive(a, b) {
  if (a === b) return true;
  return (
    typeof a === 'number' &&
    typeof b === 'number' &&
    Number.isNaN(a) &&
    Number.isNaN(b)
  );
}

/**
 * Structural equality that ignores object key order and treats `NaN` as equal
 * to itself. Cycles are compared coinductively. Non-plain objects (Date, Map,
 * class instances, ...) are only equal by identity.
 */
function structuralEqual(a, b, seen) {
  if (samePrimitive(a, b)) return true;
  if (typeof a !== 'object' || a === null) return false;
  if (typeof b !== 'object' || b === null) return false;

  // A pair already under comparison is assumed equal; this keeps cycles finite.
  for (const pair of seen) {
    if (pair[0] === a && pair[1] === b) return true;
  }
  seen.push([a, b]);

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
      if (!structuralEqual(a[index], b[index], seen)) return false;
    }
    return true;
  }

  if (!isPlainObject(a) || !isPlainObject(b)) return false;

  let keysA;
  let keysB;
  try {
    keysA = Object.keys(a);
    keysB = Object.keys(b);
  } catch (_) {
    return false;
  }
  if (keysA.length !== keysB.length) return false;

  const sortedA = keysA.slice().sort();
  const sortedB = keysB.slice().sort();
  for (let index = 0; index < sortedA.length; index += 1) {
    if (sortedA[index] !== sortedB[index]) return false;
  }

  for (const key of sortedA) {
    let valueA;
    let valueB;
    try {
      valueA = a[key];
      valueB = b[key];
    } catch (_) {
      return false;
    }
    if (!structuralEqual(valueA, valueB, seen)) return false;
  }

  return true;
}

function recordsEqual(a, b) {
  try {
    return structuralEqual(a, b, []);
  } catch (_) {
    // Uncomparable records are treated as divergent so the local one is kept.
    return false;
  }
}

/**
 * dedupe(items) -> items
 *
 * New array in the original order. The first occurrence of a post wins; later
 * items sharing any alias are dropped. Malformed items are kept in place.
 */
function dedupe(items) {
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  const result = [];

  for (const item of items) {
    const aliases = aliasesOf(item);

    if (aliases === null) {
      result.push(item);
      continue;
    }

    if (aliases.some((alias) => seen.has(alias))) continue;

    for (const alias of aliases) seen.add(alias);
    result.push(item);
  }

  return result;
}

function findAccepted(index, aliases) {
  for (const alias of aliases) {
    if (index.has(alias)) {
      return { item: index.get(alias), alias };
    }
  }
  return null;
}

function accept(index, aliases, item) {
  for (const alias of aliases) {
    if (!index.has(alias)) index.set(alias, item);
  }
}

/**
 * merge(local, remote) -> { items, conflicts }
 *
 * Local records are kept first (local duplicates collapse to their first
 * occurrence). Remote records are appended only when the post is new; an
 * identical record collapses silently, while a different record for the same
 * post is reported as `divergent-record`. Malformed records from either side
 * are retained and reported as `malformed-record`.
 */
function merge(local, remote) {
  const localItems = Array.isArray(local) ? local : [];
  const remoteItems = Array.isArray(remote) ? remote : [];

  const items = [];
  const conflicts = [];
  const index = new Map();

  for (const item of localItems) {
    const aliases = aliasesOf(item);

    if (aliases === null) {
      items.push(item);
      conflicts.push({ item, side: 'local', reason: MALFORMED_RECORD });
      continue;
    }

    if (findAccepted(index, aliases) !== null) continue;

    items.push(item);
    accept(index, aliases, item);
  }

  for (const item of remoteItems) {
    const aliases = aliasesOf(item);

    if (aliases === null) {
      items.push(item);
      conflicts.push({ item, side: 'remote', reason: MALFORMED_RECORD });
      continue;
    }

    const match = findAccepted(index, aliases);
    if (match === null) {
      items.push(item);
      accept(index, aliases, item);
      continue;
    }

    if (recordsEqual(match.item, item)) continue;

    conflicts.push({
      statusId: match.alias,
      local: match.item,
      remote: item,
      reason: DIVERGENT_RECORD,
    });
  }

  return { items, conflicts };
}

/**
 * scopeKey(base, account) -> string
 *
 * The single place that builds per-account storage keys. Never throws.
 */
function scopeKey(base, account) {
  let prefix = typeof base === 'string' ? base.trim() : '';
  if (prefix.length === 0) prefix = DEFAULT_BASE;

  let name = typeof account === 'string' ? account.trim() : '';
  if (name.startsWith('@')) name = name.slice(1);
  name = name.trim().toLowerCase();
  if (name.length === 0) name = DEFAULT_ACCOUNT;

  return `${prefix}::${name}`;
}

module.exports = { dedupe, merge, scopeKey };
