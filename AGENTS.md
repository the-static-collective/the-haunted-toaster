# Haunted Toaster operating law

This file applies to the entire repository. Keep it to durable rules; issue-specific acceptance criteria still control the requested slice.

## Authority and scope

- Current `main` is the product authority. Archaeology branches and old PRs are source material only.
- Never merge a divergent historical branch wholesale. Port only compatible pieces that satisfy current contracts.
- Preserve unrelated user changes and keep each patch within its requested boundary.
- Toaster Lab may propose inputs, but those proposals are non-authoritative until Haunted Toaster validates and canonicalizes them.
- Derive capability and Build Info claims from the active registries and renderer profile actually used by `src/full-measure/`; never maintain a manually claimed feature list.

## Execution invariants

Preserve deterministic semantic execution, complete and truthful receipts, replayable canonical artifacts, and production preview/render parity. Do not introduce UI state, renderer-only defaults, wall-clock state, ambient process state, or unseeded randomness as alternate semantic authority.

Add or update executable tests whenever behavior changes. A failed render must not leave a receipt claiming successful completion.

## Root build door

`package.json` at the repository root is the command door; `src/full-measure/package.json` and its lockfile are the application and version authority. Use the commands that exist in those manifests:

```bash
npm --prefix src/full-measure ci
npm run verify
npm --prefix src/full-measure test
npm --prefix src/full-measure run smoke
npm --prefix src/full-measure run pack
npm run dist:win
npm run start
```

`npm run verify` runs check, test, and smoke. `pack` creates an unpacked application directory; `dist:win` creates Windows distribution artifacts. Report any generated or retained artifact impact.

## Delivery boundary

Do not tag, publish, release, merge, or otherwise promote artifacts unless explicitly requested. Before opening a PR, self-review the branch diff and report:

- the exact checks run and their results;
- every failure or environment limitation;
- remaining uncertainty or unsupported cases;
- artifact impact.
