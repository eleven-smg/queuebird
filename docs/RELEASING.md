# Releasing Queuebird

Queuebird is shipped as a single Tampermonkey userscript served from the
repository. There is no build step and no package to publish.

## Versioning

Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html):
`MAJOR.MINOR.PATCH`.

- `PATCH` for backward-compatible fixes.
- `MINOR` for backward-compatible features.
- `MAJOR` for breaking changes.

Before `1.0.0`, a `MINOR` release may include a breaking change. Call that out in
the changelog. A `PATCH` release must stay backward compatible.

The version lives in two places and they must match:

- `"version"` in `package.json`
- `// @version` in the userscript metadata block in
  `src/x-bulk-scheduler.user.js`

`CHANGELOG.md` must also contain a released heading for the same version:
`## [X.Y.Z] - YYYY-MM-DD`. `tests/changelog.test.js` fails if any of these
disagree.

## Release checklist

Run these steps in order.

1. Choose the next version from the changes since the last release.
2. Bump `package.json` and the userscript `@version` to the same value.
3. In `CHANGELOG.md`, move the entries out of `## [Unreleased]` into a new
   `## [X.Y.Z] - YYYY-MM-DD` section. Leave an empty `## [Unreleased]` section
   and update the comparison links if the file uses them.
4. Run `npm run verify` and confirm it passes.
5. Commit the version bump and changelog together.
6. Tag the commit: `git tag -a vX.Y.Z -m "vX.Y.Z"`.
7. Push the tag: `git push origin vX.Y.Z`. The tagged commit must already be on
   `main`.
8. Create a GitHub release from the tag. Use the changelog section as the release
   notes.
9. Attach `src/x-bulk-scheduler.user.js` to the release.
10. Verify the raw URL for the tag returns the released file, for example
    `https://raw.githubusercontent.com/eleven-smg/queuebird/vX.Y.Z/src/x-bulk-scheduler.user.js`.

Do not change `@namespace`, the userscript filename or the update URLs as part
of a release. Installed copies rely on them.

## Update channels

- **Stable** is the raw file on `main`:
  `https://raw.githubusercontent.com/eleven-smg/queuebird/main/src/x-bulk-scheduler.user.js`.
  This is the `@updateURL` and `@downloadURL` in the userscript. Merging to
  `main` therefore ships to installed users on their next update check.
- **Preview** is the raw file on a `preview` branch. That branch must exist
  before it can be used; this document does not create it. A preview build needs
  its own installation or download URL and must not be pointed at stable users.

## Tags are immutable

Never move, delete or reuse a published tag. If a release is wrong, ship a new
patch version instead.

## Rollback

If a release is broken:

1. Revert the release commit on `main`.
2. Bump the patch version in both version locations.
3. Move the changelog entry into a new patch section.
4. Run `npm run verify`, commit, tag and release again.

Do not retag the broken version. Users recover by updating to the new patch.

## Release notes

Use the matching changelog section. Do not include credentials, tokens, cookies,
private account data, queue contents or unreleased security details. State what
was actually verified; synthetic tests do not demonstrate live-X or browser
behaviour.
