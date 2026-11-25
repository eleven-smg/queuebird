# Safety policy

Queuebird is **assistive**. It does the tedious parts and keeps a human in the
loop for anything that changes an account.

## Capability matrix

| Capability | Mode | Guardrail |
|---|---|---|
| Harvest bookmarks / Likes / search | Automatic | Read-only; no account mutation |
| Resolve wrapper to original | Automatic | Network read only |
| Availability check | Automatic | Classifies, never deletes |
| Build a preview plan | Automatic | Local only |
| Schedule via native picker | **Manual confirmation** | Dry-run default; one post per confirmation |
| Like search results | **Opt-in** | Cap, spacing, asks once per page load |
| Unbookmark after scheduling | **Opt-in** | Only after a verified save |
| Unlike / unbookmark cleanup | **Manual confirmation** | Preview + confirmation + audit log |
| Delete posts | **Dry-run only** | No live delete until a separate decision |
| Community posting | **Manual, one tap per post** | Dry-run default |

## Hard rules

1. **No account creation.** Ever. Not automated, not assisted.
2. **No automated follows, replies or mass likes.** Likes are opt-in, capped and
   paced; they exist to build a harvest surface, not to grow an account.
3. **No stealth.** No fingerprint spoofing, no proxy rotation, no anti-detection.
4. **No credential storage.** The browser session is the only authentication.
5. **Dry-run is the default** for every new capability, and for every capability
   after a release that changes its behaviour.
6. **Destructive actions are previewed, confirmed and logged.** No silent cleanup.
7. **Unknown is not dead.** An unverified item is never auto-skipped or removed.

## Limits

Defaults, enforced in `core/ratelimit` once M1 lands:

| Action | Default cap | Notes |
|---|---|---|
| Scheduled posts | 48 / day | Free-tier safety margin |
| Likes | 50 / run, 80 hard ceiling | Minimum 1.8 s spacing |
| Cleanup | 25 / run | Preview required |
| Harvest | No cap | Read-only, but polite pacing |

Caps are configurable downward at any time. Raising a cap requires an explicit
confirmation and is recorded in the audit log.

## Risk

Automating actions on X can lead to rate limits, forced logouts, shadow limits or
account suspension. Queuebird cannot remove that risk; it can only reduce blast
radius. If an account shows limits, stop, reduce caps, and wait.

## Enforcement

- `core/ratelimit` owns counters and cooldowns.
- `core/availability` owns the available/unavailable/unknown state machine.
- Adapters may not bypass either module.
- A PR that adds an automated account mutation without a guardrail is rejected.
