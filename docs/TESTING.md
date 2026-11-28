# Testing Queuebird

Queuebird's test suite is plain Node.js. There is no install step and no
dependency: Node.js 20 or newer is all you need.

```sh
node --version   # v20 or newer
npm test         # runs node --test
npm run verify   # syntax check plus the full test suite
```

`npm test` runs the Node test runner over the repository. `npm run verify` also
runs `npm run check` against `src/x-bulk-scheduler.user.js`.

Run a single test file directly:

```sh
node --test tests/fixtures.test.js
node --test tests/availability.test.js
```

On Node 24, prefer `node --test` or `npm test`; passing a directory such as
`node --test tests/` is broken there.

## Fixtures

Fixtures live in `tests/fixtures/`. They are synthetic: no real posts, accounts,
cookies or tokens.

- `availability.json` is an array of
  `{ "name": string, "observation": object | null, "expected": string }` cases
  for `core/availability.js`. `expected` is `available`, `unavailable` or
  `unknown`.
- `queue.json` is `{ "dedupe": [...], "merge": [...] }` for `core/queue.js`.
  - Dedupe cases are `{ "name", "items", "expected" }`, where `expected` is a
    list of status IDs.
  - Merge cases are `{ "name", "local", "remote", "expected" }`, where
    `expected` is `{ "items": [...], "conflicts": [...] }`. Items are compared
    by `item.statusId ?? null` and conflicts by `conflict.reason`.
- `harvest.html` is a static profile-timeline page for checking status-link
  harvesting. It contains duplicate links, a quoted link and decoy links, but no
  scripts or external assets.

`tests/helpers/fixtures.js` exposes `fixturesDir`, `fixturePath(name)`,
`readFixture(name)` and `loadJsonFixture(name)`.

## Adding a case

1. Add an object to the relevant JSON array in `tests/fixtures/`.
2. Give it a short, unique `name`.
3. Set the input and the expected result from the module contract in
   `core/README.md`.
4. Run `npm test` (or the one fixture file) and confirm the new case passes.

If a fixture disagrees with a merged module, stop and decide which one is wrong.
The fixture encodes the contract in `core/README.md`, so a disagreement usually
means either the fixture is wrong or the module has a bug. Fix the correct side
and report the decision in the pull request; never weaken a test to make it pass.

## What these tests do not cover

- Live X behaviour, rate limits or account-visible content.
- Browser automation, the userscript runtime or Tampermonkey.
- The planned MV3 extension.
- Credentials, cookies, tokens or any real account data.

Passing tests never prove live-X behaviour. They only prove that the pure
modules match their documented contracts for synthetic inputs.
