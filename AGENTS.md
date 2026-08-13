# Haunted Toaster operating law

This file applies to the entire repository. Keep it to durable rules; issue-specific acceptance criteria still control the requested slice.

## Authority and scope

- Current `main` is the product authority. Archaeology branches and old PRs are source material only.
- Never merge a divergent historical branch wholesale. Port only compatible pieces that satisfy current contracts.
- Preserve unrelated user changes and keep each patch within its requested boundary.
- Toaster Lab may propose inputs, but those proposals are non-authoritative until Haunted Toaster validates and canonicalizes them.
- Derive capability and Build Info claims from the active registries and renderer profile actually used by `src/full-measure/`; never maintain a manually claimed feature list.

## Accepted execution chain

For score-driven work, preserve this authority chain:

```text
accepted VisualScore
  -> canonical ResolvedTimeline
  -> production preview
  -> production render
  -> retained score/timeline sidecars
  -> receipt
```

The accepted `ResolvedTimeline` is the sole semantic execution authority after resolution. Preview and final render must consume the same accepted timeline semantics. Renderer code may compile concrete FFmpeg operations from that timeline, but it must not silently reinterpret or mutate accepted score/timeline state.

## Determinism and compatibility

- No hidden entropy: `Math.random()`, `Date.now()`, wall-clock state, ambient process state, UI state, renderer-only defaults, or unseeded randomness must not alter score-driven semantic choices.
- Canonical score/timeline artifacts remain inspectable and replayable, and retained sidecars must describe exactly what was accepted and consumed.
- A failed render must never leave a receipt claiming successful completion.
- Compatibility is explicit. Preserve legacy v0.4/v1 score, garment, renderer-profile, and timeline behavior unless a requested slice deliberately migrates it. New profile generations must opt in rather than silently reinterpreting old artifacts.
- Existing audio, lyric timing, muxing, cancellation, validation, preview/render parity, and provenance behavior are regression constraints, not incidental implementation details.
- Local-first remains the default execution boundary unless a requested slice explicitly changes it.

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

`npm run verify` runs check, deterministic tests, and smoke. `pack` creates an unpacked application directory; `dist:win` creates Windows distribution artifacts. Report any generated or retained artifact impact.

## Proof before completion

Behavior changes require executable proof at the affected boundary. Do not report completion from inspection alone when the repository provides a runnable proof path.

Before declaring a slice complete, report:

- the exact checks run and their results;
- every failure or environment limitation;
- remaining uncertainty or unsupported cases;
- artifact impact;
- whether the branch changed any canonical artifact, receipt, profile, or compatibility surface.

If required proof cannot run in the available environment, state that limitation explicitly and rely only on proof that actually ran (for example GitHub Actions). Do not convert an unexecuted command into a claimed pass.

## UI change protocol

Follow [`docs/UI_CHANGE_PROTOCOL.md`](docs/UI_CHANGE_PROTOCOL.md) for every renderer, bridge, or interaction change. The production renderer is the UI authority; `witness-dist/` is generated and must never be edited. Browser witness never substitutes for packaged Electron proof when preload, IPC, native-dialog, filesystem, or packaged behavior changed.

Record this exact disposition in UI-bearing handoffs:

```text
UI impact: none | behavioral | visual | bridge
browser witness: PASS/FAIL @ commit
visual delta: expected | none | unexplained
packaged witness required: yes | no
packaged witness: PASS/FAIL/not-required
GitBook ontology changed: yes | no
```

## Delivery boundary

Do not tag, publish, release, merge, or otherwise promote artifacts unless explicitly requested. Keep unfinished or unproved work on the requested branch/PR.
