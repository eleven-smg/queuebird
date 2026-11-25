# Queuebird roadmap

## Product thesis

A **control room for posting on X**: collect source material, keep a trustworthy
library, plan a rhythm that respects account limits, publish with human
confirmation, and clean up safely.

It is not a bulk blaster. Volume without account safety is how accounts die.

---

## Architecture: one core, thin adapters

```
core/                     pure JavaScript, no DOM, no GM_*, no chrome.*
  storage/                key scoping, migrations, revision-safe writes
  queue/                  pool model, dedupe, ordering
  plan/                   timing, caps, spacing, timezone, preview ledger
  resolve/                wrapper -> original status
  availability/           available | unavailable | unknown
  ratelimit/              caps, cooldowns, circuit breaker
  selectors/              every X DOM selector, versioned
  log/                    structured, bounded audit log

adapters/
  userscript/             Tampermonkey shell (mobile / zero-install)
  extension/              MV3 shell + dashboard (primary desktop product)
  runner/                 optional, later: unattended Node + Playwright
```

The core is the product. Adapters are replaceable.

## Why not split into separate tools

Every workspace shares account identity, the library, availability state, rate
limits and the audit log. Separate tools would duplicate all of it and drift.
We split the **code** into modules and the **UI** into workspaces, not the
**product** into apps.

## Dashboard: seven workspaces

| Workspace | Primary action | Advanced (collapsed) |
|---|---|---|
| Accounts | Switch / inspect profile | Warm-up plan, limits, export |
| Sources | Run a harvest | Source filters, photo mode, depth |
| Library | Review and tag posts | Availability, captions, parked photos, general queue |
| Plan | Build a preview | Presets, caps, spacing, shuffle, calendar |
| Publish | Start a dry run | Live mode, community posting, stop conditions |
| Cleanup | Scan | Unlike, unbookmark, delete rules, retention |
| Settings | Toggle dry-run | Timezone, import/export, diagnostics, logs |

One primary action per screen. Destructive actions always behind a confirmation
panel, never a native `prompt()`.

---

## Phases

Each phase ends with a tagged release candidate and a green CI run.

### M0 — Foundation
Triage, decisions, CI, real test harness, repo hygiene, naming.
**Exit:** CI required on `main`; `npm test` works; backlog mapped; name and
runtime decided.

### M1 — Core engine
Extract `core/` behind tests. Behaviour-preserving.
**Exit:** `core/` has zero DOM globals; queue, plan, resolve and availability are
unit-tested; the userscript adapter consumes `core/`.

### M2 — Accounts & warm-up
Profiles, identity guard, isolation, warm-up planner, health guardrails.
**Exit:** unknown identity blocks publishing; accounts cannot leak into each
other; caps enforced in `core/ratelimit`.

### M3 — Dashboard
Workspace shell, navigation, in-page forms, accessibility.
**Exit:** no `prompt()` remains; keyboard-only preview run works; axe critical
violations = 0.

### M4 — Sources & Library
Harvest reliability, original resolution, availability states, tags, captions.
**Exit:** every library item has a provenance and an availability state; dead
items are only excluded when confirmed.

### M5 — Plan & Publish
Preview calendar, composer and picker reliability, live observability.
**Exit:** dry-run output matches a live submission; a failed run cannot double-post.

### M6 — Cleanup & Insights
Safe unlike/unbookmark/delete, retention, post history, account analytics.
**Exit:** cleanup refuses unsaved items; interrupted cleanup resumes; every
destructive action is audited.

### M7 — Release hardening
Accessibility, packaging, versioned releases, auto-update, migration.
**Exit:** stable and preview channels; installed version visible; legacy build
deprecation notice published.

---

## What we will not build

- Automated account creation.
- Automated mass following, liking or replying.
- Stealth or fingerprint evasion.
- Credential storage.
- Anything that posts without an explicit human decision in the loop.

These are product boundaries, not implementation details. See `#98`.
