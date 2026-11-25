# Dashboard information architecture

Decision: **one product, seven workspaces, one shared state.**
Not seven apps. Code is split into modules; the UI is split into workspaces.

## Shell

```
+---------------------------------------------------------------+
| Queuebird          [ acting as @handle ]  DRY-RUN  3 queued  |
+--------------+------------------------------------------------+
| Accounts     |                                                |
| Sources      |   workspace content                            |
| Library      |   one primary action, advanced collapsed       |
| Plan         |                                                |
| Publish      |                                                |
| Cleanup      |                                                |
| Settings     |                                                |
+--------------+------------------------------------------------+
| audit log (collapsible)                                       |
+---------------------------------------------------------------+
```

- Persistent **status strip**: active profile, dry-run state, queue count, next
  scheduled slot, last error.
- Left rail on desktop, top tabs or a sheet on narrow widths.
- One primary action per workspace. Everything else lives under **Advanced**.
- Destructive actions always use an in-page confirmation panel showing exactly
  what will change. Never `prompt()`, never `confirm()`.
- The audit log is one shared, bounded list. Every workspace writes to it.

## Workspaces

### 1. Accounts
- Profile list with handle, warm-up stage, risk level, last activity.
- Primary: switch or inspect profile.
- Advanced: warm-up targets, daily caps, export.

### 2. Sources
- Source cards: Bookmarks, Likes, Search, List.
- Primary: run a harvest.
- Shows: items found, duplicates skipped, unresolved wrappers, estimated time.
- Advanced: photo mode, depth, "fast-forward past N already collected".

### 3. Library
- Table/list of collected posts: thumbnail, author, link, media type,
  availability (`available` / `unavailable` / `unknown`), tags, used/unused.
- Primary: review and tag.
- Filters: availability, media, source, used state.
- Advanced: captions, parked photos, general queue transfer, bulk remove.

### 4. Plan
- Preview calendar (day columns) with per-slot time, link and status.
- Primary: build a preview.
- Advanced: presets, start time, gap, daily cap, free shuffle, spread shuffle,
  timezone. Every change invalidates the preview and says so.

### 5. Publish
- Run card: queued count, next action, elapsed, stop button.
- Primary: start a dry run.
- Live mode is a separate, explicit switch with a confirmation panel.
- Per-post outcome list: scheduled / failed / skipped, with reason.

### 6. Cleanup
- Primary: scan (dry-run).
- Rules: all, first N, past week, confirmed dead, live media.
- Each rule previews affected items before anything changes.
- Advanced: unlike, unbookmark, retention window.

### 7. Settings
- Primary: dry-run toggle.
- Timezone, import/export, diagnostics, self-test, probe, version and channel.
- Log viewer with copy and download.

## Interaction rules

1. A workspace never performs a hidden action on load.
2. Any long action shows progress and a working Stop.
3. Any plan mutation invalidates the preview visibly.
4. Any destructive action is previewed, confirmed, logged.
5. Numbers shown are labelled by what they count: `previewed`, `scheduled`,
   `delivered`. These are never mixed.
6. Unknown state is displayed as unknown, never as zero or as an error.

## Accessibility

- Keyboard reachable in a logical order; visible focus ring.
- Every icon button has an accessible name.
- WCAG AA contrast on the dark theme.
- Status changes announced via a polite live region; errors assertive.
- No interaction requires hovering.

## Component inventory (build once, reuse)

`StatusStrip`, `WorkspaceNav`, `PrimaryAction`, `AdvancedPanel`, `DataTable`,
`AvailabilityBadge`, `ProfileChip`, `ConfirmPanel`, `ProgressRun`, `AuditLog`,
`EmptyState`, `ErrorBanner`.

## Anti-patterns (the current panel)

- 30 equal-weight buttons: no hierarchy.
- Native dialogs: unstyled, blocking, inaccessible.
- Mixed counts: preview numbers read like delivered numbers.
- Hidden modes: dry/live toggles buried in button labels.
- No global status: the user cannot tell what account or state they are in.
