# Queuebird

A Tampermonkey userscript that collects video links from X bookmarks and Likes,
resolves wrapper posts to the original status, keeps a per-account library, and
drives X's native scheduler.

> **Status: in restructuring.** The current `main` is a single-file userscript
> that works but is being rebuilt into a modular core with a proper dashboard.
> Read [project status](docs/PROJECT-STATUS.md) and [roadmap](docs/ROADMAP.md)
> before relying on it.

Formerly `x-bulk-scheduler`. The repository was renamed in M0; old GitHub URLs
redirect. The userscript filename is intentionally unchanged so installed copies
keep auto-updating.

## Safety

- Dry-run is the default. Nothing is posted, liked or removed until you switch
  the relevant mode to live.
- Earlier live tests of this source duplicated composer text and the schedule
  picker's selected instant is unverified. Do not use it for unattended posting.
- The tool only runs while an X tab is open. It is assistive, not a bot farm.
- Account automation carries a real risk of limits or bans. See
  [safety policy](docs/SAFETY-POLICY.md).

## Install / auto-update

Open the raw link in a browser with Tampermonkey installed:

**[Install / update](src/x-bulk-scheduler.user.js)**

Tampermonkey will offer to install it and will auto-update from the same URL.
`main` is the auto-update source, so merging code affects installed users.

### Upgrading from X Bulk Scheduler

The script identity is `@name Queuebird` with the original `@namespace
x-bulk-scheduler`, so Tampermonkey updates in place. If it installs alongside the
old entry instead, remove the old entry once; the storage keys are unchanged.

## Development

```sh
npm run check   # syntax-check the userscript
npm test        # unit + contract tests
npm run verify  # both, as CI runs them
```

No install step and no dependencies. CI runs `npm run verify` on every pull
request.

## Project

- [Feature inventory](docs/FEATURE-INVENTORY.md) - every shipped, experimental and planned capability
- [Project status](docs/PROJECT-STATUS.md) - what works, what is claimed, top risks
- [Roadmap](docs/ROADMAP.md) - phases M0-M7 and the module map
- [Dashboard IA](docs/DASHBOARD-IA.md) - workspaces and navigation
- [Safety policy](docs/SAFETY-POLICY.md) - automation boundaries
- [Legacy issue queue](docs/ISSUE-QUEUE.md) - historical record, frozen during M0
- [Functionality test matrix](docs/FUNCTIONALITY-TESTS.md) - historical tests

Work is tracked on the **Queuebird** project board. New issues use
`type:` / `area:` / `prio:` / `status:` / `size:` labels and an M0-M7 milestone.

## Contributing

Queuebird is open to anyone. You do **not** need an application, an invitation
or an assignment. Pick an issue labelled `status: ready` or `good first issue`,
comment `/claim`, fork the repository and open a pull request. A maintainer
reviews every PR; `verify` must be green.

- [Contributing guide](CONTRIBUTING.md) - setup, branch names, tests, review rules
- [Parallel work lanes](docs/WORK-LANES.md) - who is working on what, and the handoff format
- [Core module contracts](core/README.md) - the pure modules we need next
- [Code of conduct](CODE_OF_CONDUCT.md)

Good first task: **#58** (URL parser). Larger: **#104** (MV3 scaffold),
**#106** (safeguard port), **#123** (plan windows and DST).

## License

Queuebird is released under the [MIT License](LICENSE). You may use, modify and
distribute it, including commercially, as long as the copyright notice and
permission notice are kept. The software is provided without warranty.
