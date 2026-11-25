# X Bulk Scheduler

A Tampermonkey userscript that harvests video links from X bookmarks and Likes,
resolves wrapper posts to the original status, keeps a per-account library, and
drives X's native scheduler.

> **Status: in restructuring.** The current `main` is a single-file userscript
> that works but is being rebuilt into a modular core with a proper dashboard.
> Read [project status](docs/PROJECT-STATUS.md) and [roadmap](docs/ROADMAP.md)
> before relying on it.

## Safety

- Dry-run is the default. Nothing is posted, liked or removed until you switch
  the relevant mode to live.
- Earlier live tests of this source duplicated composer text and the schedule
  picker's selected instant is unverified. Do not use it for unattended posting.
- Account automation carries a real risk of limits or bans. The product is
  assistive, not a bot farm. See the automation boundaries in `#98`.

## Install / auto-update

Open the raw link in a browser with Tampermonkey installed:

**[Install / update](src/x-bulk-scheduler.user.js)**

Tampermonkey will offer to install it and will auto-update from the same URL.
`main` is the auto-update source, so merging code affects installed users.

## Project

- [Project status](docs/PROJECT-STATUS.md) — what works, what is claimed, top risks
- [Roadmap](docs/ROADMAP.md) — phases M0–M7 and the module map
- [Legacy issue queue](docs/ISSUE-QUEUE.md) — historical record, frozen during M0
- [Functionality test matrix](docs/FUNCTIONALITY-TESTS.md) — historical tests

Work is tracked on the **X Scheduler Rebuild** project board. New issues use
`type:` / `area:` / `prio:` / `status:` / `size:` labels and an M0–M7 milestone.
