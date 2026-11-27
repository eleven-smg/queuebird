# Contributing to Queuebird

Queuebird is public. You do **not** need an application, an invitation or an
assignment to work on it. If an issue is open and marked `status: ready`, comment
`/claim` and start. Every pull request is reviewed before merging.

The project is a browser tool for collecting, planning and publishing X posts
safely. It is assistive: a human decides what goes out. Read
[the safety policy](docs/SAFETY-POLICY.md) before writing automation code.

## Ways to help

- **Code** — pure `core/` modules and tests (best first contribution).
- **Tests** — fixtures for queue records, availability, planning and URL parsing.
- **Docs** — setup guides, troubleshooting, screenshots, accessibility notes.
- **Verification** — run a documented check on a real device or X account and
  record the build, steps and result on the issue.
- **Bug reports** — use the bug template. Include the version, browser, steps and
  the console log. Never include cookies, tokens or passwords.

## Start here

1. Read [the feature inventory](docs/FEATURE-INVENTORY.md), [the roadmap](docs/ROADMAP.md)
   and [the safety policy](docs/SAFETY-POLICY.md).
2. Pick an issue labelled `status: ready` or `good first issue`.
3. Comment `/claim` with what you plan to do and a rough ETA.
4. A maintainer adds `status: claimed`. If there is no draft PR within 7 days,
   the claim is released so someone else can take it.
5. Fork the repository (or create a branch if you have write access), implement,
   test, and open a pull request.

You can also propose a new task with the **Contributor task** template. Do not
start large unclaimed work; it may duplicate another lane.

## Setup

Requirements: Node.js 20 or newer. There are no runtime dependencies.

```sh
git clone https://github.com/eleven-smg/queuebird.git
cd queuebird
npm run verify
```

`npm run verify` runs the syntax check and the Node test suite. On Node 24,
`node --test tests/` is broken; use `node --test` or `npm test`.

## Branch names

- `feat/<issue>-<short-slug>` — new capability
- `fix/<issue>-<short-slug>` — defect
- `docs/<short-slug>` — documentation
- `test/<issue>-<short-slug>` — tests only
- `chore/<short-slug>` — tooling and maintenance

Branch from `main`. Rebase on `main` before marking a PR ready.

## Architecture boundary

The target architecture is one pure core with thin adapters:

```
core/                 pure JavaScript: no DOM, no GM_*, no chrome.*, no network
adapters/userscript/  Tampermonkey shell
adapters/extension/   MV3 shell (planned)
tests/                Node tests
src/x-bulk-scheduler.user.js   the installed single-file artifact
```

**Anti-collision rule:** unless the issue explicitly says “integration”, create
new files under `core/` or `tests/`. Do **not** edit
`src/x-bulk-scheduler.user.js`. The maintainer wires core modules into the
single-file artifact in a separate integration PR. This lets several people and
AI lanes work at the same time without merge conflicts.

Module contracts are in [`core/README.md`](core/README.md).

## Tests

- Add a test for every pure behaviour you add or change.
- Use `node:test` and `assert`.
- Keep fixtures synthetic. Do not commit private posts, captures, cookies or
  account data.
- No test may require live X, credentials or a paid service.
- For UI work, include a screenshot and the manual steps you ran.

## Pull requests

- One concern per PR. Link the issue with `Closes #123`.
- Copy the issue’s acceptance criteria into the PR and tick them off.
- Keep the diff focused; do not reformat unrelated code.
- `verify` must be green. A maintainer must approve. History is linear, so PRs
  are squash-merged.
- Do not change `CONFIG.dryRun` defaults, the `@namespace`, the filename or the
  update URLs.
- Do not claim live-X acceptance from synthetic data. If you tested on X, say
  exactly what you did and attach evidence without credentials.
- Stale PRs are closed after 14 days of no response; comment to keep one alive.

## Safety rules

- No account creation, mass following, mass liking, mass replying or stealth.
- No credential, cookie or token storage.
- No unattended posting; an X tab must stay open.
- Dry-run is the default. Live actions need an explicit human decision.
- Destructive actions must be previewed and confirmed.

These are product boundaries, not preferences. A PR that crosses them is closed.

## Licensing

The repository does not have a license file yet; the decision is tracked in
[#107](https://github.com/eleven-smg/queuebird/issues/107). Until a license is
added, do not copy this code into another project. By opening a pull request you
confirm the work is yours and can be distributed under the license the maintainer
chooses.

## Communication

Use issue comments. Do not send credentials or personal data in an issue, PR,
screenshot or log. Maintainer response is best effort; a polite ping after a week
is fine.

## Parallel lanes

The maintainer runs several AI lanes at once. See
[`docs/WORK-LANES.md`](docs/WORK-LANES.md) for the current claims and the
handoff format. Lanes are coordination, not permission: anyone can claim any
ready issue.
