# Core module contracts

`core/` is pure JavaScript. A module here may not touch the DOM, `GM_*`,
`chrome.*`, `window`, `document`, timers, storage or the network. Time and I/O
are passed in as arguments. This is what makes the logic testable and lets
several lanes work in parallel.

Modules use CommonJS (`module.exports`) so Node can test them without a build.
The maintainer integrates them into the single-file userscript later.

## Rules

- No side effects on import.
- No `Date.now()` or `new Date()` inside planning logic; pass `now`.
- No random values inside pure functions; pass a seed or a random function.
- Return plain objects and arrays. Never throw for expected invalid input; return
  a result with `ok: false` and a `reason`.
- Keep each module under ~300 lines. Split before it grows.
- Every module has `tests/<module>.test.js`.

## `core/availability.js` — issue #92

```js
classify(observation) -> { state, reason, evidence }
```

`state` is exactly one of `available`, `unavailable`, `unknown`.

`observation`:

| Field | Type | Meaning |
|---|---|---|
| `media` | boolean | A real video or photo element rendered on the post |
| `tombstone` | boolean | X's own unavailable panel is present, not just matching words in text |
| `text` | string | Visible post text, if any |
| `httpStatus` | number \| null | Result of a lookup, or `null` if none was made |
| `provider` | `dom` \| `oembed` \| `syndication` \| `manual` | Where the observation came from |
| `statusId` | string \| null | The status being observed |

Required behaviour:

- Media present → `available`, even if the text contains “deleted” or “no longer exists”.
- Structural tombstone with no media → `unavailable`.
- Text matching alone → `unknown`, never `unavailable`.
- A 404 from a public lookup → `unknown`; it is not proof for account-visible content.
- Timeout, network error or missing response → `unknown`.
- Anything not covered → `unknown`.

`reason` is a short machine-readable string. `evidence` echoes the observation
plus the rule that decided it.

## `core/url.js` — issue #58

```js
parseStatusUrl(input) -> { ok, id, author, media, canonical, reason }
isSupportedSourceUrl(input) -> boolean
```

Accept only literal, supported X/Twitter status URLs:

- `https://x.com/<author>/status/<digits>`
- `https://twitter.com/<author>/status/<digits>`
- `https://x.com/i/status/<digits>`
- Optional trailing `/video/1` or `/photo/1`

Reject, without normalising them into something valid:

- dot segments (`/../`, `/./`), backslashes, whitespace
- encoded hostnames or encoded slashes
- userinfo (`user@`), ports, query strings, fragments
- `javascript:`, `data:`, protocol-relative URLs
- non-digit or overlong status IDs
- any host other than `x.com` or `twitter.com`

`author` is `null` for `/i/status/...`. `media` is `video`, `photo` or `null`.
`canonical` is the clean URL without the media suffix, or `null` when invalid.
`reason` explains the rejection in one short phrase.

## `core/storage.js` — issue #91

```js
createStore(adapter) -> {
  read(key) -> { ok, value, revision, reason },
  write(key, value, { expectedRevision }) -> { ok, revision, reason },
  subscribe(listener) -> unsubscribe,
  migrate(legacy) -> { migrated, skipped, reason }
}
```

- `adapter` supplies `get`, `set` and `subscribe`; the module never calls
  `GM_*` or `chrome.*` directly.
- A write with a stale `expectedRevision` is rejected, not applied.
- Malformed and unknown records are preserved, not dropped.
- `migrate` is idempotent and reports what it skipped.

## `core/plan.js` — issues #96 and #106

```js
buildPlan({ items, settings, now, reservations }) -> {
  slots, skipped, conflicts, reason
}
```

- Future-only slots in the configured timezone.
- Respect the daily cap and the preset or drip spacing.
- Exclude only items classified `unavailable`; keep `unknown`.
- Reserve known historical minutes without calling them delivered.
- Return `conflicts` instead of silently rebuilding when the plan disagrees with
  settings or reservations.

## `core/queue.js` — issue #91

```js
dedupe(items) -> items
merge(local, remote) -> { items, conflicts }
scopeKey(base, account) -> string
```

- Dedupe by status ID, including wrapper and original IDs.
- Never drop a record because it is malformed; surface it as a conflict.
- `scopeKey` is the single place that builds per-account storage keys.

## Tests

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { classify } = require('../core/availability.js');

test('media wins over tombstone wording', () => {
  const r = classify({ media: true, tombstone: false, text: 'this post was deleted' });
  assert.equal(r.state, 'available');
});
```

Run `npm test` or `node --test`. Do not add dependencies.
