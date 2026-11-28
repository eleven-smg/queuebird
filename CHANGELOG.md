# Changelog

All notable changes to Queuebird are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

No release tags exist yet. Until the first tag is created with the procedure in
[`docs/RELEASING.md`](docs/RELEASING.md), `Unreleased` is the source of truth.

## [Unreleased]

### Added

- Pure availability classifier (`core/availability.js`) with 8 tests: media
  wins, only a structural tombstone proves unavailability, everything ambiguous
  stays `unknown` (#110).
- Revision-safe storage store (`core/storage.js`) with 18 tests: stale writes
  are rejected, malformed records are preserved, migrate is idempotent (#112).
- Queue identity module (`core/queue.js`) with 15 tests: alias-based dedupe,
  non-mutating merge with conflicts, per-account scope keys (#115).
- Plan builder (`core/plan.js`) with 12 tests: future-only spacing, daily cap
  per local day, reservations and conflict reporting (#122).
- Synthetic fixtures for availability, queue and harvest parsing, a shared
  fixture loader and 33 fixture-driven tests (#117).
- Userscript contract tests for the metadata block, update URLs, compilation and
  credential patterns (#101).
- GitHub Actions CI that runs `npm run verify` on every pull request (#101).
- Contributor kit: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue and pull
  request templates, `CODEOWNERS`, `core/README.md` and `docs/WORK-LANES.md`
  (#108).
- Pinned contributor hub and public project board with `status:` and
  `platform:` labels (#109).
- MIT license (#113).
- `docs/TESTING.md` covering the test runner, fixtures and coverage limits
  (#117).
- `docs/FEATURE-INVENTORY.md` with shipped, experimental and planned
  capabilities (#105).
- Dashboard IA, safety policy, roadmap and project status documents (#100,
  #102).

### Changed

- Renamed the product to Queuebird; the userscript filename, `@namespace` and
  update URLs are intentionally unchanged (#102).
- Rebuilt the README around the new contribution model (#100, #108).
- Kept project status, lane handoffs and the feature inventory current as core
  modules landed (#111, #114, #116, #118).

## [0.13.1] - 2026-09-26

Baseline userscript release. No changelog was kept before this file; the
`Unreleased` section above records the work done after this version.
