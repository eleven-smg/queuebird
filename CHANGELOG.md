# Changelog

All notable changes to Queuebird are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing here has shipped. The following work is in progress or planned._

### Added

- Adapter wiring that connects `core/availability.js`, `core/storage.js` and
  `core/queue.js` to the userscript shell (planned).
- Dashboard shell with the seven workspaces described in
  `docs/DASHBOARD-IA.md` (planned).
- MV3 extension adapter (planned).
- Build step that assembles the single-file userscript artifact (planned).

## [0.13.1] - 2026-11-28

### Added

- Pure availability classifier with text-based tombstone detection, plus tests
  (#110).
- Revisioned storage store with migrations, plus tests (#112).
- Queue dedupe, merge and scope keys, plus tests (#115).
- Synthetic fixtures for availability, queue and harvest parsing, with a shared
  fixture loader (#117).
- Userscript contract tests for the metadata block, update URLs, compilation and
  credential patterns (#101).
- GitHub Actions CI that runs `npm run verify` on pull requests (#101).
- Contributor kit: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue and pull
  request templates, `CODEOWNERS`, `core/README.md` and `docs/WORK-LANES.md`
  (#108).
- MIT license (#113).

### Changed

- Renamed the product to Queuebird and recorded the M0 architecture, safety and
  dashboard decisions (#102).
- Rebuilt the README and added project status and roadmap documents (#100).

### Docs

- Added `docs/TESTING.md` covering the test runner, fixtures and coverage limits
  (#117).
- Added `docs/FEATURE-INVENTORY.md` with shipped, experimental and planned
  capabilities (#105).
- Added the dashboard IA and safety policy documents (#102).
- Kept project status and lane handoffs current as core modules landed (#111,
  #114, #116).

### Infra

- Added the `check`, `test` and `verify` npm scripts (#101).
- Documented the Queuebird project board, labels and milestones in
  `docs/PROJECT-STATUS.md` (#100).

[Unreleased]: https://github.com/eleven-smg/queuebird/compare/v0.13.1...HEAD
[0.13.1]: https://github.com/eleven-smg/queuebird/compare/v0.13.0...v0.13.1
