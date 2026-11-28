'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildPlan } = require('../core/plan.js');

const LAGOS = 'Africa/Lagos';

// Africa/Lagos is UTC+1 all year (no DST), so a local wall-clock time maps to
// UTC by subtracting one hour. Every timestamp below is fixed; the real clock
// is never read.
function local(year, month, day, hour, minute, second = 0) {
  return Date.UTC(year, month - 1, day, hour - 1, minute, second);
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LAGOS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dayKey(ms) {
  return dayFormatter.format(new Date(ms));
}

function settings(overrides = {}) {
  return { timezone: LAGOS, dailyCap: 10, spacingMinutes: 15, ...overrides };
}

function plan(overrides = {}) {
  return buildPlan({
    items: [],
    settings: settings(),
    now: local(2026, 1, 5, 9, 0, 0),
    reservations: [],
    ...overrides,
  });
}

test('slots start after now, on the next whole minute, and respect spacing', () => {
  const now = local(2026, 1, 5, 9, 0, 30);
  const result = plan({
    now,
    items: [{ statusId: 'a' }, { statusId: 'b' }, { statusId: 'c' }],
    settings: settings({ spacingMinutes: 15 }),
  });

  assert.equal(result.reason, 'ok');
  assert.deepEqual(result.skipped, []);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.slots.length, 3);

  const start = local(2026, 1, 5, 9, 1, 0);
  for (let index = 0; index < 3; index += 1) {
    const slot = result.slots[index];
    assert.equal(slot.statusId, ['a', 'b', 'c'][index]);
    assert.ok(slot.at > now, 'every slot must be strictly in the future');
    assert.equal(slot.at, start + index * 15 * 60000);
    if (index > 0) {
      assert.equal(slot.at - result.slots[index - 1].at, 15 * 60000);
    }
  }
});

test('the daily cap is enforced and the next slot rolls into the next local day', () => {
  const result = plan({
    now: local(2026, 1, 5, 23, 0, 0),
    items: [{ statusId: 'a' }, { statusId: 'b' }, { statusId: 'c' }],
    settings: settings({ dailyCap: 2, spacingMinutes: 30 }),
  });

  assert.equal(result.reason, 'ok');
  assert.deepEqual(
    result.slots.map((slot) => slot.at),
    [
      local(2026, 1, 5, 23, 1, 0),
      local(2026, 1, 5, 23, 31, 0),
      local(2026, 1, 6, 0, 1, 0),
    ]
  );

  assert.equal(dayKey(result.slots[0].at), dayKey(result.slots[1].at));
  assert.notEqual(dayKey(result.slots[2].at), dayKey(result.slots[0].at));
});

test('a reservation blocks its exact minute and counts toward the daily cap', () => {
  const now = local(2026, 1, 5, 9, 0, 0);
  const reserved = local(2026, 1, 5, 9, 1, 0);

  const result = plan({
    now,
    items: [{ statusId: 'a' }, { statusId: 'b' }],
    settings: settings({ dailyCap: 2, spacingMinutes: 10 }),
    // Non-finite entries are ignored.
    reservations: [reserved, NaN, Infinity, 'ignored'],
  });

  assert.equal(result.slots.length, 2);

  // 09:01 is reserved, so the first slot moves one spacing step to 09:11.
  assert.notEqual(result.slots[0].at, reserved);
  assert.equal(result.slots[0].at, local(2026, 1, 5, 9, 11, 0));

  // The reservation already used one of the two slots for 5 Jan, so the
  // second item rolls to the next local day instead of 09:21.
  assert.equal(result.slots[1].at, local(2026, 1, 6, 0, 1, 0));
  assert.notEqual(dayKey(result.slots[1].at), dayKey(result.slots[0].at));
});

test('unavailable is skipped while unknown and missing availability are kept', () => {
  const result = plan({
    items: [
      { statusId: 'gone', availability: 'unavailable' },
      { statusId: 'unsure', availability: 'unknown' },
      { statusId: 'plain' },
    ],
  });

  assert.equal(result.reason, 'ok');
  assert.deepEqual(
    result.slots.map((slot) => slot.statusId),
    ['unsure', 'plain']
  );
  assert.deepEqual(result.skipped, [{ statusId: 'gone', reason: 'unavailable' }]);
  assert.deepEqual(result.conflicts, []);
});

test('missing or invalid statusId becomes a conflict instead of throwing', () => {
  const hostile = {
    get statusId() {
      throw new Error('boom');
    },
  };
  const items = [
    { statusId: 'ok' },
    { availability: 'unknown' },
    { statusId: '' },
    { statusId: '   ' },
    { statusId: 42 },
    null,
    'not-an-item',
    [],
    hostile,
  ];

  let result;
  assert.doesNotThrow(() => {
    result = plan({ items });
  });

  assert.deepEqual(
    result.slots.map((slot) => slot.statusId),
    ['ok']
  );
  assert.equal(result.conflicts.length, 8);
  for (const conflict of result.conflicts) {
    assert.equal(conflict.reason, 'missing-status-id');
    assert.ok(Object.prototype.hasOwnProperty.call(conflict, 'item'));
  }
  assert.equal(result.conflicts[0].item, items[1]);
  assert.equal(result.conflicts[7].item, hostile);
  assert.equal(result.reason, 'ok');
});

test('invalid settings return invalid-settings with the offending field', () => {
  const cases = [
    [{ settings: undefined }, 'settings'],
    [{ settings: null }, 'settings'],
    [{ settings: 'nope' }, 'settings'],
    [{ settings: settings({ timezone: '' }) }, 'timezone'],
    [{ settings: settings({ timezone: '   ' }) }, 'timezone'],
    [{ settings: settings({ timezone: 'Not/AZone' }) }, 'timezone'],
    [{ settings: settings({ timezone: 42 }) }, 'timezone'],
    [{ settings: settings({ dailyCap: 0 }) }, 'dailyCap'],
    [{ settings: settings({ dailyCap: -1 }) }, 'dailyCap'],
    [{ settings: settings({ dailyCap: 1.5 }) }, 'dailyCap'],
    [{ settings: settings({ dailyCap: '2' }) }, 'dailyCap'],
    [{ settings: settings({ spacingMinutes: 0 }) }, 'spacingMinutes'],
    [{ settings: settings({ spacingMinutes: -5 }) }, 'spacingMinutes'],
    [{ settings: settings({ spacingMinutes: 2.5 }) }, 'spacingMinutes'],
    [{ settings: settings({ spacingMinutes: null }) }, 'spacingMinutes'],
  ];

  for (const [overrides, field] of cases) {
    const result = plan(overrides);
    assert.equal(result.reason, 'invalid-settings', field);
    assert.deepEqual(result.slots, []);
    assert.deepEqual(result.skipped, []);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].reason, 'invalid-settings');
    assert.equal(result.conflicts[0].field, field);
  }
});

test('invalid now returns invalid-now with a conflict', () => {
  for (const now of [NaN, Infinity, -Infinity, '123', null, undefined, {}]) {
    const result = plan({ now });
    assert.equal(result.reason, 'invalid-now');
    assert.deepEqual(result.slots, []);
    assert.deepEqual(result.skipped, []);
    assert.deepEqual(result.conflicts, [{ reason: 'invalid-now', field: 'now' }]);
  }
});

test('a missing plan argument is invalid settings, not a throw', () => {
  for (const input of [undefined, null, 'nope', []]) {
    const result = buildPlan(input);
    assert.equal(result.reason, 'invalid-settings');
    assert.deepEqual(result.slots, []);
    assert.deepEqual(result.skipped, []);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].reason, 'invalid-settings');
    assert.equal(result.conflicts[0].field, 'settings');
  }
});

test('non-array items or reservations return invalid-input naming the field', () => {
  const badItems = plan({ items: null });
  assert.equal(badItems.reason, 'invalid-input');
  assert.deepEqual(badItems.conflicts, [
    { reason: 'invalid-input', field: 'items' },
  ]);

  const badReservations = plan({ reservations: 'nope' });
  assert.equal(badReservations.reason, 'invalid-input');
  assert.deepEqual(badReservations.conflicts, [
    { reason: 'invalid-input', field: 'reservations' },
  ]);

  const both = plan({ items: {}, reservations: null });
  assert.equal(both.reason, 'invalid-input');
  assert.deepEqual(both.conflicts, [
    { reason: 'invalid-input', field: 'items' },
    { reason: 'invalid-input', field: 'reservations' },
  ]);
});

test('inputs are not mutated', () => {
  const items = [
    { statusId: 'a' },
    { statusId: 'b', availability: 'unavailable' },
    { statusId: 'c', availability: 'unknown' },
    { availability: 'unknown' },
  ];
  const settingsInput = settings({ dailyCap: 2, spacingMinutes: 10 });
  const reservations = [local(2026, 1, 5, 9, 1, 0), NaN, Infinity, 'ignored'];
  const itemsBefore = structuredClone(items);
  const settingsBefore = structuredClone(settingsInput);
  const reservationsBefore = structuredClone(reservations);

  buildPlan({
    items,
    settings: settingsInput,
    now: local(2026, 1, 5, 9, 0, 0),
    reservations,
  });

  assert.deepEqual(items, itemsBefore);
  assert.deepEqual(settingsInput, settingsBefore);
  assert.deepEqual(reservations, reservationsBefore);
});

test('the daily cap follows the configured local day, not UTC', () => {
  // `now` is 00:30 on 6 Jan in Lagos (23:30 UTC on 5 Jan). The reservation is
  // 23:30 on 5 Jan in Lagos, a different local day, so 6 Jan still has room.
  const result = plan({
    now: local(2026, 1, 6, 0, 30, 0),
    items: [{ statusId: 'a' }],
    settings: settings({ dailyCap: 1, spacingMinutes: 5 }),
    reservations: [local(2026, 1, 5, 23, 30, 0)],
  });

  assert.equal(result.slots[0].at, local(2026, 1, 6, 0, 31, 0));
});

test('an empty item list returns empty arrays and ok', () => {
  const result = plan({ items: [], reservations: [local(2026, 1, 5, 9, 1, 0)] });

  assert.deepEqual(result, {
    slots: [],
    skipped: [],
    conflicts: [],
    reason: 'ok',
  });
});
