'use strict';

/**
 * Future slot planning for the native scheduler.
 *
 * Pure module: no DOM, no network, no storage, no clock, no randomness.
 * Contract: core/README.md ("core/plan.js - issues #96 and #106").
 *
 * A plan is built only from the arguments: `now` is the clock, `reservations`
 * are minutes already used, and `settings.timezone` decides which local day a
 * timestamp belongs to. Inputs are never mutated.
 */

const OK = 'ok';
const INVALID_SETTINGS = 'invalid-settings';
const INVALID_NOW = 'invalid-now';
const INVALID_INPUT = 'invalid-input';
const MISSING_STATUS_ID = 'missing-status-id';
const UNAVAILABLE = 'unavailable';
const NO_SLOT = 'no-slot';

const MINUTE = 60000;

// Defensive bound for pathological settings, for example a spacing so large
// that the candidate overflows. Normal plans need only a handful of advances.
const MAX_ADVANCES = 1000000;

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

function failure(reason, field) {
  return { slots: [], skipped: [], conflicts: [{ reason, field }], reason };
}

/**
 * Builds a formatter-backed local day key. `en-CA` is asked for ISO-like
 * parts; assembling them explicitly keeps the key `YYYY-MM-DD` even when a
 * host renders that locale differently. Returns `null` for invalid dates.
 */
function createDayKey(timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return function dayKey(ms) {
    if (!Number.isFinite(ms)) return null;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return null;

    let year;
    let month;
    let day;
    for (const part of formatter.formatToParts(date)) {
      if (part.type === 'year') year = part.value;
      else if (part.type === 'month') month = part.value;
      else if (part.type === 'day') day = part.value;
    }
    if (year === undefined || month === undefined || day === undefined) {
      return null;
    }
    return `${year}-${month}-${day}`;
  };
}

function checkSettings(settings) {
  if (!isPlainObject(settings)) return { ok: false, field: 'settings' };

  let timezone;
  let dailyCap;
  let spacingMinutes;
  try {
    timezone = settings.timezone;
    dailyCap = settings.dailyCap;
    spacingMinutes = settings.spacingMinutes;
  } catch (_) {
    return { ok: false, field: 'settings' };
  }

  if (typeof timezone !== 'string' || timezone.trim().length === 0) {
    return { ok: false, field: 'timezone' };
  }

  let dayKey;
  try {
    dayKey = createDayKey(timezone);
  } catch (_) {
    return { ok: false, field: 'timezone' };
  }

  if (!Number.isInteger(dailyCap) || dailyCap < 1) {
    return { ok: false, field: 'dailyCap' };
  }
  if (!Number.isInteger(spacingMinutes) || spacingMinutes < 1) {
    return { ok: false, field: 'spacingMinutes' };
  }

  return { ok: true, dayKey, dailyCap, spacingMinutes };
}

/**
 * Finds the first candidate at or after `start` whose minute is not reserved
 * and whose local day still has room under the daily cap.
 */
function findSlot(start, dayKey, reserved, counts, dailyCap, spacingMs) {
  let at = start;
  for (let advances = 0; advances < MAX_ADVANCES; advances += 1) {
    if (!reserved.has(Math.floor(at / MINUTE))) {
      const key = dayKey(at);
      if (key !== null && (counts.get(key) || 0) < dailyCap) {
        return { at, key };
      }
    }

    const next = at + spacingMs;
    if (!Number.isFinite(next) || next <= at) return null;
    at = next;
  }
  return null;
}

/**
 * buildPlan({ items, settings, now, reservations }) ->
 *   { slots, skipped, conflicts, reason }
 *
 * slots:     [{ statusId, at }] ascending, strictly after `now`
 * skipped:   [{ statusId, reason: 'unavailable' }]
 * conflicts: [{ reason, field }] for validation, or { reason, item } for items
 */
function buildPlan(input) {
  if (!isPlainObject(input)) return failure(INVALID_SETTINGS, 'settings');

  let settings;
  let now;
  let items;
  let reservations;
  try {
    settings = input.settings;
    now = input.now;
    items = input.items;
    reservations = input.reservations;
  } catch (_) {
    return failure(INVALID_SETTINGS, 'settings');
  }

  const checked = checkSettings(settings);
  if (!checked.ok) return failure(INVALID_SETTINGS, checked.field);

  if (typeof now !== 'number' || !Number.isFinite(now)) {
    return failure(INVALID_NOW, 'now');
  }

  const inputConflicts = [];
  if (!Array.isArray(items)) {
    inputConflicts.push({ reason: INVALID_INPUT, field: 'items' });
  }
  if (!Array.isArray(reservations)) {
    inputConflicts.push({ reason: INVALID_INPUT, field: 'reservations' });
  }
  if (inputConflicts.length > 0) {
    return {
      slots: [],
      skipped: [],
      conflicts: inputConflicts,
      reason: INVALID_INPUT,
    };
  }

  const { dayKey, dailyCap, spacingMinutes } = checked;
  const counts = new Map();
  const reserved = new Set();

  // Historical minutes are reserved and count toward their local day, but are
  // not treated as delivered slots.
  for (const entry of reservations) {
    if (typeof entry !== 'number' || !Number.isFinite(entry)) continue;
    reserved.add(Math.floor(entry / MINUTE));
    const key = dayKey(entry);
    if (key !== null) counts.set(key, (counts.get(key) || 0) + 1);
  }

  const slots = [];
  const skipped = [];
  const conflicts = [];
  const spacingMs = spacingMinutes * MINUTE;
  let candidate = (Math.floor(now / MINUTE) + 1) * MINUTE;

  for (const item of items) {
    if (!isPlainObject(item)) {
      conflicts.push({ reason: MISSING_STATUS_ID, item });
      continue;
    }

    let statusId;
    try {
      statusId = item.statusId;
    } catch (_) {
      statusId = undefined;
    }
    if (typeof statusId !== 'string' || statusId.trim().length === 0) {
      conflicts.push({ reason: MISSING_STATUS_ID, item });
      continue;
    }

    let availability;
    try {
      availability = item.availability;
    } catch (_) {
      // An unreadable classification is not proof of unavailability.
      availability = undefined;
    }
    if (availability === UNAVAILABLE) {
      skipped.push({ statusId, reason: UNAVAILABLE });
      continue;
    }

    const found = findSlot(candidate, dayKey, reserved, counts, dailyCap, spacingMs);
    if (found === null) {
      conflicts.push({ reason: NO_SLOT, item });
      continue;
    }

    slots.push({ statusId, at: found.at });
    counts.set(found.key, (counts.get(found.key) || 0) + 1);
    candidate = found.at + spacingMs;
  }

  return { slots, skipped, conflicts, reason: OK };
}

module.exports = { buildPlan };
