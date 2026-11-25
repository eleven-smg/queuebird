# Project status

**Snapshot:** 2026-11-25 · `main` at `dccab60` · repository `eleven-smg/x-bulk-scheduler`

This document is the maintainer view. It is deliberately short. The test matrix
and the legacy issue queue remain as history, not as the current plan.

---

## 1. Health at a glance

| Area | State | Evidence |
|---|---|---|
| Product shape | Single Tampermonkey userscript, 2,024 lines / 117 KB | `src/x-bulk-scheduler.user.js` |
| Build | None. File is served raw and auto-updated by Tampermonkey | Userscript header |
| Unit tests | 7 tests passing: 2 model tests + 5 userscript contract tests | `npm test` |
| Test command | Works on Node 20+ (`node --test` auto-discovers) | `npm run verify` |
| CI | GitHub Actions `verify` job on every PR | `.github/workflows/ci.yml` |
| Release | No tags, no changelog, no artifacts | `gh release list` empty |
| License | None | No `LICENSE` |
| Backlog | 60 legacy issues, 16 draft PRs, all against one file | GitHub |
| Board | Created: *X Scheduler Rebuild* (project #1), 76 items | GitHub Projects |
| Labels | 29 labels: type / area / priority / status / size | GitHub |
| Milestones | M0–M7 | GitHub |

## 2. What the userscript actually does today

Grouped by capability, not by button:

- **Harvest** — bookmarks, likes, search pages; dedupe; photo suffix option.
- **Resolve** — wrapper/quoted post → original status via syndication and oEmbed.
- **Availability** — text-based tombstone detection; oEmbed disabled (402 paywall).
- **Library** — per-account pool, parked photo pool, captions, general cross-account queue.
- **Plan** — presets, WAT start time, daily cap, free shuffle, spread shuffle.
- **Publish** — native composer insertion and native schedule picker automation, dry-run default.
- **Community** — collections and a per-session community posting plan.
- **Cleanup** — dry-run delete scan; like-bot (gated); unbookmark-after-post (flag off).
- **Ops** — export/import, self-test, probe, bounded log.

That is a real product. It is not a "bulk scheduler" any more.

## 3. What is verified vs. claimed

This distinction caused most of the existing backlog.

| Claim | Reality |
|---|---|
| "Live posting works" | Composer previously duplicated text in a live test. Unverified since. |
| "Dead links are pruned" | Text matching only; a false positive was reproduced in a synthetic test. |
| "Timezone is WAT" | Planning is tested in WAT; the actual X picker selection is unverified. |
| "Multi-account safe" | Key scoping exists in source; real account switching is untested. |
| "Accessible" | No audit. Several controls are unlabelled; the panel is not keyboard-complete. |
| "Tested" | Two unit tests against an unintegrated model. Browser tests depend on absent private fixtures. |

**Rule going forward:** an item is only "done" with a reproducible command or a
recorded manual check, linked from the issue. Documentation alone never closes
a behaviour issue.

## 4. Backlog audit

The legacy backlog is not wrong, it is **mis-shaped**:

- 60 issues, most of them "verify X manually" against a build that is about to be
  restructured.
- 16 open draft PRs, each a small patch to the same 2,000-line file, most now
  conflicting. Merging them would preserve the architecture we are replacing.
- 7 merged PRs are documentation only. No application behaviour has shipped
  through review.

**Decision:** freeze the legacy queue, map it into the new module issues, and
close the superseded drafts. Valuable logic from the drafts is ported, not merged.

## 5. Top risks

1. **Account risk.** Automating likes, follows or posting on X can get accounts
   limited or banned. Mitigation: assistive design, dry-run default, hard caps,
   no account creation, no mass follow. See `#98`.
2. **Brittle DOM automation.** X changes selectors without notice. Mitigation:
   one selector module, versioned, with a probe that reports breakage.
3. **Unattended execution is not solved by any current option.** A userscript and
   an extension both need a browser tab. Only a headless runner posts with the
   browser closed — and that raises account risk. Must be an explicit decision.
4. **Double-posting.** Retries around an unverified composer are dangerous.
   Mitigation: verify editor content, one attempt per post, idempotency key.
5. **Process debt.** 76 open items with no CI and no release discipline becomes
   noise. Mitigation: milestones, a board, a definition of done, and closing
   superseded work aggressively.

## 6. Decisions pending

| Decision | Issue | Recommendation |
|---|---|---|
| Runtime target | #84 | Hybrid: pure `core/` + userscript adapter + extension adapter |
| Product name / repo rename | #85 | **Postdeck**; rename in M0, before any release |
| Dashboard information architecture | #86 | Seven workspaces, one product, one shared state |
| Automation boundaries | #98 | Assistive only; no account creation, no mass follow |

## 7. Immediate next steps (M0)

1. Answer the four decisions above.
2. Land CI + a working `npm test` (#87, #88).
3. Extract `core/` behind tests (#90).
4. Freeze and map the legacy backlog; close superseded drafts (#99).
5. Cut the first tagged release only after CI is green.

## 8. How we work

- **Branches:** `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- **PRs:** one concern per PR, linked issue, acceptance criteria copied into the
  description, CI green, one review.
- **Roles:** maintainer actions (triage, review, merge, release) as `eleven-smg`;
  implementation branches and PRs as `dhillic`.
- **Definition of done:** acceptance criteria met + test or recorded manual check
  + docs updated + issue closed by the PR.
- **No silent scope:** a new idea becomes an issue with a label and a milestone
  before it becomes code.
