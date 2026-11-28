# Parallel work lanes

Queuebird is developed in parallel by the maintainer and several AI sessions.
This file keeps them from colliding. Lanes are **coordination, not permission**:
anyone can claim any `status: ready` issue.

## Rules

1. **One issue per lane at a time.** Finish or release before taking another.
2. **Claim before starting.** Comment `/claim` on the issue. A maintainer adds
   `status: claimed`. No draft PR within 7 days releases the claim.
3. **New files only.** Create `core/<module>.js` and `tests/<module>.test.js`.
   Do not edit `src/x-bulk-scheduler.user.js` unless the issue says
   “integration”. The maintainer integrates.
4. **Branch from `main`.** Use `feat/<issue>-<slug>`, `fix/...`, `docs/...`.
5. **Open a draft PR after the first commit.** Link it on the issue so the other
   lanes can see the files you own.
6. **Rebase before ready.** Do not force-push after review starts.
7. **If two lanes need the same file, stop.** Split the module first or ask the
   maintainer to sequence them.
8. **Every PR:** `npm run verify` green, one maintainer approval, squash merge.

## Current lanes

| Lane | Who | Issue | Branch | Files owned | State |
|---|---|---|---|---|---|
| **O** | OpenCode (this session) | contribution kit, integration, review | `docs/open-contribution` | `CONTRIBUTING.md`, `.github/`, `core/README.md`, `src/x-bulk-scheduler.user.js` | active |
| **T** | Terminal OpenCode, DeepSeek free | #89 changelog + release docs | `feat/89-release-terminal` | `CHANGELOG.md`, `docs/RELEASING.md`, `tests/changelog.test.js` | claimed |
| **B** | Browser AI | #58 malformed video URLs | `feat/58-url-validation-browser` | `core/url.js`, `tests/url.test.js` | ready |
| **X** | External contributors | #93, #104, #106 groups | per issue | per issue | open |

Lane O owns integration and review. It does not take a second code module while
reviewing. Lanes T and B are deliberately disjoint: availability and URL parsing
share no file.

## Handoff prompt — terminal lane

Paste this into the terminal session, or run it with `opencode run`:

```
You are contributing to Queuebird at https://github.com/eleven-smg/queuebird.

Read first:
- CONTRIBUTING.md
- core/README.md
- docs/FEATURE-INVENTORY.md (sections 4 and 11)
- docs/SAFETY-POLICY.md

Your issue: #89 [INFRA] Versioning, changelog and releases - phase 1: docs + sync test
Your branch: feat/89-release-terminal
You own only: CHANGELOG.md, docs/RELEASING.md, tests/changelog.test.js

Write a Keep a Changelog file seeded from the real merged history, a release
procedure (SemVer, version sync, tags, channels, rollback), and a test that keeps
the changelog heading and both version fields in sync. Do not create tags,
releases or branches. Do not edit package.json, src/, core/ or existing tests.

Do not add dependencies. Do not claim live-X verification.

Run: npm run verify
Commit locally only. Do not push, do not open a PR, do not use gh. Report the
local commit SHA and the exact test counts.
```

## Handoff prompt — browser lane

Send the issue link plus this brief. The browser AI may not have repository
access, so ask for complete file contents, not a diff against unseen code.

```
Repository: https://github.com/eleven-smg/queuebird
Issue: https://github.com/eleven-smg/queuebird/issues/58

Read the public files:
- CONTRIBUTING.md
- core/README.md (section "core/url.js")
- docs/SAFETY-POLICY.md

Write two complete files:
1. core/url.js
2. tests/url.test.js

API: parseStatusUrl(input) and isSupportedSourceUrl(input), exactly as
specified in core/README.md.

Accept only literal X/Twitter status URLs. Reject dot segments, backslashes,
whitespace, encoded hostnames, encoded slashes, userinfo, ports, query strings,
fragments, javascript:/data: URLs, protocol-relative URLs, non-digit or overlong
IDs, and any host other than x.com or twitter.com. Do not normalise a malformed
URL into a valid one.

Tests must cover every accepted shape and every rejected class, including at
least 8 malformed examples and 4 valid controls. Use node:test and
node:assert/strict. No dependencies.

Output the full contents of both files and a one-paragraph explanation. Do not
claim you ran the tests. Do not include credentials or private posts.
```

## Handoff prompt — external contributor

Point them at the issue and `CONTRIBUTING.md`. Do not send a private brief. The
issue body, acceptance criteria and templates are enough. If they need a
starting point, suggest #58 or #89.

## Rate-limit strategy

- **Lane O** is the coordinator and integrator. It avoids long code generation
  and spends its budget on review, integration and unblocking.
- **Lane T** runs one pure module at a time in its own worktree. It can run
  tests locally and iterate without using the hosted session.
- **Lane B** produces one self-contained patch at a time. It does not need the
  repo or a test run; Lane O validates.
- **Lane X** takes independent issues. No lane duplicates a `status: claimed`
  issue.

## Merge order

1. Pure module + tests (Lane T or B).
2. Maintainer review and squash merge.
3. Integration PR by Lane O, only if the module must ship in the userscript.
4. Update `docs/FEATURE-INVENTORY.md` in the same integration PR.

## Claim log

Keep this table current. Add a row when an issue is claimed; remove it when the
PR merges or the claim is released.

| Issue | Lane | Claimed | Branch / PR | Notes |
|---|---|---|---|---|
| #89 | T | 2026-11-28 | `feat/89-release-terminal` | changelog + release docs |
| #58 | B | 2026-11-27 | `feat/58-url-validation-browser` | URL parser |
