# Queuebird shell prototype

This is a **design prototype**. It is not shipped and not wired into the
userscript. It is a static HTML, CSS and JavaScript mock used to review the
approved information architecture and accessibility basics before integration.

Nothing here is installed by Tampermonkey, and no code in `src/` loads it.

## Open it

Open `docs/prototype/shell.html` directly in a browser. Double-click the file,
or open `file:///.../docs/prototype/shell.html`.

There is no build step, no local server, no dependency and no network request.

## What it demonstrates

The seven-workspace information architecture from
[`docs/DASHBOARD-IA.md`](../DASHBOARD-IA.md):

- Accounts, Sources, Library, Plan, Publish, Cleanup and Settings.
- A persistent status strip with the active account, dry-run state, queue count
  and next scheduled slot.
- One primary action per workspace; secondary controls live under **Advanced**.
- Synthetic tables in Library and Plan, plus a publish preview card.
- Keyboard navigation: Arrow keys, Home and End move through the workspace rail;
  selecting a workspace moves focus to its heading.
- Visible focus rings, a skip link, and a layout that works at 360 px and
  1440 px. On narrow screens the rail becomes a horizontal, scrollable nav.

All values are synthetic. `@example`, the counts and the scheduled time are
placeholders.

## What is not wired

- No storage: nothing is read from or written to browser storage.
- No X integration: no harvesting, posting or account access.
- No scheduling or planning engine.
- No audit log, destructive confirmation flow or live/dry switch behaviour
  beyond the static markup.
- No Tampermonkey installation and no `src/` integration.

## Accessibility notes

- The page has one `<h1>`, a skip link to `<main>`, and landmark regions.
- The rail is a labelled navigation list; the active item uses
  `aria-current="page"`.
- Workspace changes are announced through a polite live region.
- Focus-visible outlines are defined globally and the colour tokens target
  WCAG AA contrast on the dark theme.
- Without JavaScript every workspace stays visible and readable; the script
  only adds one-at-a-time switching.

This prototype has not been checked with a browser automation run or an axe
scan. The maintainer will verify it visually.
