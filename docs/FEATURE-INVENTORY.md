# Queuebird feature inventory

**Snapshot:** 2026-11-26 · `main` @ `e46752c` · userscript `0.13.1`
**Scope:** every capability that exists in code, every capability that exists only
in the experimental `0.13.1-test.*` packages, and every capability that is planned.
This is the baseline for the next feature list. It is a map, not a promise.

## How to read this

| Status | Meaning |
|---|---|
| **Shipped** | Code is in `main` and reachable from the panel. The pure parts have automated tests. Live X behaviour may still be unverified. |
| **Shipped, unverified** | Code is in `main`, but the only evidence is source, mock or synthetic data. A live check is an open issue. |
| **Experimental** | Code exists in the `0.13.1-test.4`–`.10` packages, **not in `main`**. Design input, not shipped. |
| **Planned** | An issue or milestone exists; no product code. |
| **Module ready** | A pure `core/` module is merged with tests, but it is not yet wired into the userscript. |
| **Partial** | Some of the capability is merged; the remainder is tracked in the linked issue. |
| **Blocked** | Cannot be completed without the owner's X account, device, or a decision. |
| **Out of scope** | Explicitly excluded by `docs/SAFETY-POLICY.md`. |

The rule from `docs/PROJECT-STATUS.md` still applies: a feature is done only with a
reproducible command or a recorded manual check linked from its issue.
Documentation alone never closes a behaviour issue.

---

## 1. Product shape

| Layer | What exists | Status |
|---|---|---|
| Runtime | Tampermonkey userscript on `x.com` / `twitter.com`; desktop and Firefox Android | Shipped |
| Extension adapter | MV3 prototype in the experimental packages only; no extension in this repo | Planned (#104) |
| Headless runner | None; unattended posting is out of scope | Out of scope |
| Build | None; `main` is served raw and auto-updated | Shipped (by design) |
| Storage | Tampermonkey `GM_setValue` / `GM_getValue`, per browser profile | Shipped |
| Test suite | 7 Node tests (`npm test`) + 43 in-panel self-tests | Shipped |
| CI | GitHub Actions `verify` on every PR; branch protection on `main` | Shipped |
| Release | No tags, no changelog, no artifacts, no license | Planned (#89) / decision |

The userscript filename and `@namespace` are intentionally unchanged so installed
copies keep auto-updating.

---

## 2. Accounts

| Capability | What it does | Status | Evidence / issue |
|---|---|---|---|
| Handle detection | Reads the profile link or account-switcher link and lowercases the handle | Shipped | `detectAccount()` |
| Per-account pool | Namespaces queue, posted IDs and last-harvest by `::handle` | Shipped, unverified | Real switching untested (#5, #94) |
| Legacy pool migration | One-time move of the old shared pool into the first detected account | Shipped | `migrateLegacyPool()` |
| Unknown identity fallback | Falls back to the shared key instead of guessing | Shipped, risky | Should block, not share (#4) |
| Visible-account guard | Stops actions when the visible account cannot be confirmed; detects A→B→A | Experimental | `0.13.1-test.4+` |
| Profile list / switch UI | Inspect and switch profiles from the dashboard | Planned | #94 |
| Warm-up planner | Ramp new accounts with caps and health guardrails | Planned | #95 |
| Account health | Risk level, last activity, limit warnings | Planned | #95 |

**Gap:** settings, captions, the log and community collections are shared across
accounts. That is intentional for settings and captions, but community done-state
is currently shared too, which can suppress a legitimate post on a second account.

---

## 3. Sources

| Capability | What it does | Status | Evidence / issue |
|---|---|---|---|
| Bookmark harvest | Scrolls `x.com/i/history` (legacy `/i/bookmarks`), collects video links | Shipped, unverified | Live run collected 11 links (#25) |
| Likes harvest | Scrolls `x.com/i/history/likes` or `/<user>/likes` | Shipped, unverified | Earlier live run collected links (#26) |
| New-only mode | Blank target: stops after two all-known screens | Shipped | `harvest()` |
| Next-N mode | Number target: fast-forwards past known posts, collects N older ones | Shipped | `harvest()` |
| Dedupe | Dedupes against queued and posted IDs, including resolved originals | Shipped | #27 |
| Tombstone skip | Skips posts whose text says deleted/unavailable/suspended | Shipped, unverified | Text match only (#59) |
| Video detection | Detects video player / `<video>` / preview interstitial | Shipped | `mediaKind()` |
| Photo opt-in | Collects `/photo/1` links only when Photos is on | Shipped | #31 |
| Wrapper→original (DOM) | Uses the “From creator” attribution or a single embedded status | Shipped, unverified | #2, #57 |
| Wrapper→original (syndication) | Bulk “Fix Links” via `cdn.syndication.twimg.com/tweet-result` | Shipped, unverified | One public example (#57) |
| Malformed URL rejection | Rejects non-numeric / malformed normalized video-source URLs | Experimental | `0.13.1-test.10`; port tracked by #58 |
| Undo last harvest | Removes only still-queued items from the last batch | Shipped | `undoLastHarvest()` |
| Remove by link | Removes an item by status URL, ID, wrapper ID or URL fragment | Shipped | `removeItem()` |
| Inspect | Dumps the first 5 posts’ IDs, links, media and attribution to JSON | Shipped | `inspectView()` |
| Search builder | Opens Latest search with `filter:native_video`, `-filter:replies`, `min_faves`, `lang` | Shipped | `buildSearchUrl()` |
| Like bot | Likes visible posts, capped and paced, separate dry/live switch | Shipped, unverified | #10 risk; live check open |
| List source | Harvest from an X List | Planned | Not in current IA beyond “List” card |
| Confirmed-dead skip | Skip only confirmed-dead originals during collection | Planned | #60 |
| Source filters / depth UI | Per-source filters, depth and time estimate | Planned | #93 |

**Harvest limits:** X virtualises the feed, so “next 100” still loads the earlier
posts. Fast-forward makes that cheap; unbookmark-after-post is the permanent fix.

---

## 4. Library

| Capability | What it does | Status | Evidence / issue |
|---|---|---|---|
| Per-account pool | Stores collected items per handle | Shipped, unverified | #5 |
| Item schema | `id`, `url`, `kind`, `text`, `media`, `wrapperId`, `source`, `state`, `day/session/slot`, `scheduledAt`, `harvestedAt`, `errors`, `communities` | Shipped | `store` |
| Parked photo pool | Photos are saved but not scheduled while Mix Pics is off | Shipped | #32, #33 |
| Mix Pics | Folds parked photos into Build/Shuffle | Shipped | #32 |
| Caption pool | Local text pool with non-repeating draw and reshuffle when exhausted | Shipped | `captions` |
| Caption-only posts | Queues N text-only posts and stamps times | Shipped | `buildCaptionSchedule()` |
| General queue | Browser-wide push/pull pool with source tags, for moving links between accounts | Shipped | `generalAdd()` / `generalPull()` |
| Export | JSON download of queue, posted IDs, general queue and captions | Shipped | `exportQueue()` |
| Import | Merges a JSON file, skips already-posted/queued IDs, resets scheduling | Shipped | `importQueue()` |
| Status readout | Counts videos, parked pictures, built items, dead/rejected, posted IDs, next time | Shipped | `statusSummary()` |
| Clear queue | Drops only `queued` items; keeps scheduled/posted | Shipped | `clearQueued()` |
| Full reset | Wipes queue and the harvested-ID checkpoint after confirmation | Shipped | `resetHarvest()` |
| Tags and filters | Tag, filter by availability/media/source/used state | Planned | #92, #93 |
| Availability state | `available` / `unavailable` / `unknown` per item | Module ready | `core/availability.js` (#92, #110); UI wiring pending |
| Provenance / thumbnails | Show where each item came from and its preview media | Planned | #92, #93 |
| Post history / retention | Delivered history, retention window, analytics | Planned | #97 |

**Gap:** there is no library table, no tag model, no availability field and no
per-item edit UI. The pool is a JSON array behind a status line.

---

## 5. Plan

| Capability | What it does | Status | Evidence / issue |
|---|---|---|---|
| Presets | `12x4` and `10x5` (posts per session × sessions) | Shipped | `CONFIG.presets` |
| Start time | Daily start in `HH:MM`, treated as WAT | Shipped | #36 |
| Drip spacing | `gapMinutes > 0` makes every post N minutes apart; sessions ignored | Shipped | #36 |
| Days ahead | Builds N days per run | Shipped | #37 |
| Daily cap | Hard ceiling, default 48/day | Shipped | #37 |
| Build | Stamps `scheduledAt`, day, session and slot; idempotent | Shipped | `buildSchedule()` |
| Photo parking | Photos excluded unless Mix Pics is on | Shipped | #33 |
| Free shuffle | Fully random reorder of un-posted items | Shipped | #29 |
| Spread shuffle | Groups by N and deals one from a different group at a time | Shipped | #30 |
| Timing form | In-page prompts for preset, start, gap, days, cap | Shipped | Native prompts (#51) |
| Future-only times | Rolls to the next WAT day if the start time has passed | Experimental | `0.13.1-test.4+` |
| Invalid-time rejection | Blocks `24:00`, malformed reservations instead of normalizing | Experimental | `0.13.1-test.6+` |
| Multi-day cap enforcement | Checks caps across days, not just per day | Experimental | `0.13.1-test.6+` |
| Legacy reservations | Reserves known old scheduled minutes without calling them delivered | Experimental | `0.13.1-test.5+` |
| Whole-plan revalidation | Pauses when queue/settings/bindings disagree; preserves old plan | Experimental | `0.13.1-test.8` |
| Stale-settings detection | Pauses when timing settings changed elsewhere; cancels stale jobs | Experimental | `0.13.1-test.7` |
| Preview calendar | Day columns with per-slot time, link and status | Planned | #93, #96 |
| Manual slot editing | Move/remove a slot before publishing | Planned | #93 |
| Timezone selector | Choose a zone instead of assuming WAT | Planned | #96 |

**Gap:** `main` builds times from the browser clock and assumes WAT. The
experimental guards are not in `main`.

---

## 6. Publish

| Capability | What it does | Status | Evidence / issue |
|---|---|---|---|
| Run loop | Sorts built items by time and processes them one at a time | Shipped | `runSchedule()` |
| Dry run | Marks items locally without touching X; default on | Shipped | `CONFIG.dryRun` |
| Composer insert | `execCommand('insertText')`, then InputEvent fallback; verifies text | Shipped, unverified | Duplicated text in an earlier live test (#11, #49) |
| Schedule picker | Finds six native selects, sets WAT wall clock, clicks Confirm | Shipped, unverified | #12, #50 |
| Submit check | Clicks Post, then treats “composer closed” as success | Shipped, unverified | No Unsent Posts check (#96) |
| Stop / panic | Clears running flags; in-flight item is left as-is | Shipped, unverified | #10, #47 |
| Dead-link precheck | Optional oEmbed 404 check before scheduling | Shipped, disabled | oEmbed returns 402; false positives (#59) |
| Unbookmark after post | Intended to remove a scheduled bookmark | Stub | Control not mapped; `BOOKMARK_REMOVE_MAPPED = false` (#20) |
| Community collections | Named collections of communities | Shipped | `getCollections()` |
| Community plan | Allocates up to N queued links per community, skips already-done | Shipped | `planCommunityPosts()` |
| Community post | One tap = one real post now; own dry/live switch; confirm once | Shipped, unverified | Community posts cannot be scheduled |
| Idempotency key | One attempt per post, no duplicate on retry | Planned | #96 |
| Delivery confirmation | Verify the post appears in Unsent Posts / scheduled list | Planned | #96 |
| Run observability | Per-post outcome list with reason and elapsed time | Planned | #93, #96 |
| Live composer/picker acceptance | Confirm one copy, draft preservation and the selected instant on X | Blocked | #11, #12, #49, #50 |

**Critical:** the live path has never been accepted end to end. Earlier evidence
showed duplicated composer text. Do not treat “scheduled” in dry run as delivery.

---

## 7. Cleanup

| Capability | What it does | Status | Evidence / issue |
|---|---|---|---|
| Delete scan | Dry-run scan of your own profile with 5 rules: `all`, `firstN`, `pastWeek`, `linkDeadEmbed`, `liveMedia` | Shipped | `deleteScan()` |
| Candidate storage | Saves matching IDs, rule, handle and timestamp | Shipped | `xbs_delete_candidates` |
| Candidate preview | Logs the first 8 matches | Shipped | `deleteScan()` |
| Like cleanup | Remove selected Likes after collection | Planned | #19, #21 |
| Bookmark cleanup | Remove selected bookmarks after collection | Planned | #20, #22 |
| Durable-save proof | Prove links are saved before removing the source | Planned | #21, #22 |
| Dedupe after cleanup | Re-collect without losing saved items or duplicating | Planned | #23 |
| Confirmed-dead cleanup | Remove only confirmed-dead items, never unknowns | Planned | #59, #62 |
| Retention window | Age-based cleanup policy | Planned | #97 |
| Actual delete | Execute a delete after confirmation | Not planned | Safety policy keeps this a scan |

**Gap:** cleanup is scan-only. No unlike, unbookmark or delete executes.

---

## 8. Settings and operations

| Capability | What it does | Status | Evidence / issue |
|---|---|---|---|
| Persisted settings | Whitelisted fields survive reload; unknown fields preserved | Shipped | `SETTABLE`, `loadSettings()` |
| Dry-run code gate | `CONFIG.dryRun` is not settable from the UI on purpose | Shipped | Deliberate safety choice |
| Bounded log | 300 lines kept, last 40 shown, mirrored to console | Shipped | `log()` |
| Export / import | Manual JSON bridge between browsers and accounts | Shipped | `exportQueue()` / `importQueue()` |
| Self-test | 43 pure checks for schedule math, shuffle, photos, URLs, parsing | Shipped | In-panel “Self-Test” |
| Probe | Read-only checks for composer insert, schedule button/dialog and oEmbed | Shipped | Downloads `xbs-probe.json` |
| Inspect | Read-only DOM dump for selector repair | Shipped | Downloads `xbs-inspect.json` |
| Version | `@version 0.13.1` in the header only | Shipped | No in-UI version/channel |
| Settings workspace | One place for dry-run, timezone, import/export, diagnostics | Planned | #93 |
| Diagnostics bundle | One download with log, version, selectors and probe | Planned | #93 |
| Release channel | Stable/preview, changelog, tagged releases | Planned | #89 |
| License | No `LICENSE` file | Blocked | Owner decision |

**Gap:** the UI is 30 equal-weight buttons and native `prompt()` / `confirm()`
dialogs. There is no settings screen, no visible version, no accessible
confirmation panel.

---

## 9. Platform and architecture

| Capability | What it does | Status | Evidence / issue |
|---|---|---|---|
| Single-file userscript | 2,125 lines, no build, no dependencies | Shipped | `src/x-bulk-scheduler.user.js` |
| GM storage | Per-profile key/value storage | Shipped | `GM_getValue` / `GM_setValue` |
| Auto-update | Tampermonkey pulls `main` raw URL | Shipped | `@updateURL` |
| CI | Syntax check + 7 tests on every PR | Shipped | `.github/workflows/ci.yml` |
| Contract tests | 5 tests for header, storage keys, panel wiring, dry-run default | Shipped | `tests/userscript-contract.test.js` |
| Model tests | 2 tests for the legacy review model | Shipped | Not wired into the product |
| Core extraction | Pure `core/` modules with no DOM or GM globals | Planned | #90 |
| Storage v2 | Revision-safe, multi-tab, multi-account writes | Module ready | `core/storage.js` (#112); multi-tab and multi-account pending |
| Queue identity | Alias-based dedupe, merge with conflicts, per-account keys | Module ready | `core/queue.js`, 15 tests (#115) |
| Availability module | Pure state machine with provider evidence | Module ready | `core/availability.js`, 8 tests (#110) |
| Build step | Bundle `core/` + adapters into the userscript artifact | Planned | #103 |
| MV3 extension | Desktop shell with dashboard | Planned | #104 |
| Real test harness | Fixtures and browser smoke suite | Partial | Fixtures + `docs/TESTING.md` (#117); Playwright and importable internals pending |
| Release hardening | Versioning, changelog, tags, migration | Planned | #89 |
| Board and labels | Queuebird project, 29 labels, M0–M7 milestones | Shipped | Project #1 |

**Gap:** the experimental packages contain 28 functions that are not in `main`,
including account visibility, job cancellation, plan guards, stale-context
detection, strict timestamps and picker context checks. They are design input
until ported and tested.

---

## 10. Safety boundaries

These are product boundaries, not missing features.

| Allowed | Not allowed |
|---|---|
| Read bookmarks, Likes and search results | Create accounts |
| Collect, dedupe, tag and order links | Mass follow, like or reply |
| Build a preview plan with caps | Stealth, fingerprint evasion or proxy rotation |
| Post or schedule with a human decision in the loop | Store credentials |
| Dry-run cleanup scans | Delete at scale without confirmation |
| Community posts one tap at a time | Post with the browser closed |

Every run needs an open X tab. Account automation can still cause limits or
bans; the caps reduce risk, they do not remove it.

---

## 11. Known verification debt

| # | Item | Why it is open |
|---|---|---|
| 1 | Composer duplicates text | Observed live; later fixes are synthetic only (#11, #49) |
| 2 | Picker timezone / selected instant | Browser-local vs WAT not confirmed on X (#12, #50) |
| 3 | Dead-link false positives | Text matching only; oEmbed is paywalled (#59) |
| 4 | Wrapper→original accuracy | One public example; owner’s saved examples unverified (#2, #57) |
| 5 | Multi-account isolation | Key scoping exists; real A→B→A untested (#5, #94) |
| 6 | Cross-tab storage race | Revision checks are not atomic (#1, #8, #91) |
| 7 | Stop responsiveness | No measured limit; late callbacks untested (#10, #47) |
| 8 | Accessibility | No audit; several controls unlabelled (#16, #53) |
| 9 | Installation paths | Tampermonkey, extension and phone untested (#17, #18, #54, #55) |
| 10 | Unbookmark control | Menu not mapped; only previews (#20) |
| 11 | Legacy scheduled markers | Cannot prove past delivery; preserved, not relabelled (#9 closed as review-only) |
| 12 | License | No license file; owner decision |

---

## 12. Planned work by milestone

| Milestone | Scope | Key issues |
|---|---|---|
| M0 Foundation | Triage, CI, harness, naming, license | #88, #99, license decision |
| M1 Core engine | Pure modules, storage v2, availability, build | #90, #91, #92, #103 |
| M2 Accounts | Profiles, identity guard, warm-up, health | #94, #95 |
| M3 Dashboard | Shell, workspaces, accessibility, extension scaffold | #93, #104 |
| M4 Sources & Library | Harvest reliability, provenance, tags, availability | #92, #57, #59, #60 |
| M5 Plan & Publish | Calendar, composer, picker, idempotency, observability | #96, #11, #12, #49, #50 |
| M6 Cleanup & Insights | Safe unlike/unbookmark, retention, history | #97, #19–#23, #62 |
| M7 Release hardening | Versioning, changelog, tags, migration | #89 |

---

## 13. Work lanes and assignment guide

These lanes are **coordination, not permission**. Anyone can claim any
`status: ready` issue by commenting `/claim`; you do not need an assignment or an
application. See [`CONTRIBUTING.md`](../CONTRIBUTING.md) and
[`docs/WORK-LANES.md`](WORK-LANES.md).

Work is split by what can be verified without the owner’s live X account.

### Lane A — pure code, no X access (best first assignment for another AI)

1. **#88** real test harness and fixtures.
2. **#91** queue/storage v2 with revision-safe writes and tests.
3. **#92** availability state machine with `available` / `unavailable` / `unknown`.
4. **#58** port the malformed video-URL rejection from `0.13.1-test.10`.
5. **#89** versioning, changelog and release checklist.

These are testable in Node, have no DOM dependency, and do not need credentials.

### Lane B — shell and packaging

1. **#103** build step that bundles `core/` + adapters.
2. **#104** MV3 extension scaffold (manifest, storage adapter, message bus).
3. **#93** dashboard shell with mock data and accessibility checks.

Depends on #90 for clean module boundaries; can start with the shell and adapters.

### Maintainer lane

1. **#90** incremental `core/` extraction from the 2,125-line file.
2. **#96** composer and picker reliability, with the owner’s live checks.
3. **#94** multi-account identity and isolation, with the owner’s live checks.
4. Review, merge, board and release.

### Owner-only

1. Live X verification of composer, picker, wrapper examples and account switching.
2. Target devices for Tampermonkey and the extension.
3. License choice.
4. The next feature list.

### Rules for contributors

- One concern per PR; link the issue; copy the acceptance criteria.
- Add a test for pure logic. For DOM behaviour, record the manual check.
- Never claim live acceptance from synthetic data.
- Do not change `CONFIG.dryRun` defaults or the `@namespace` / filename.
- Run `npm run verify` before opening a PR.
