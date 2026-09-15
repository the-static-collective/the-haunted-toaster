# Video phrasing: first 0.0.1 development slice

Based on landed BETA 0.0.0 (`e8e8fb0`, PR #275). This is an opt-in development slice, not a tagged 0.0.1 release. The package version remains the landed version until release reconciliation.

## What to try

Admit a song and a short video. The Video row exposes two independent selectors. Changing either requires generating six again and making a new KEEP.

| Digestion | What the clip contributes |
| --- | --- |
| Texture | Existing blurred luminance texture |
| Topology mask · experimental | Existing luminance regions select a bounded treatment of native composition |
| Motion mask · experimental | Adjacent-frame luminance differences select that native treatment; source pixels do not survive |

| Timing | Behavior |
| --- | --- |
| Loop | Existing repeated source playback; legacy default |
| Play once → release | One pass at source speed, then native composition continues for the rest of the song |
| Stretch across song | One pass retimed over the complete song; frame holds, no optical-flow interpolation |

Motion mask is temporal luminance difference, not object recognition, optical flow, motion-vector transfer, or topology deformation. Camera movement and cuts can activate it. A still source should contribute no motion. Stretch can slow or accelerate a source, depending on the song length.

## Listening and looking test

1. Use a clip noticeably shorter than the song. Try all nine combinations with the same song and seed.
2. Compare preview and final render at matching song times. Preview uses the whole-song timing plan, not a separately stretched preview.
3. With Play once, inspect after the source duration: the video contribution should end while the native composition and audio continue.
4. With Stretch, inspect near the end: later source material should still contribute. Repeated output frames are expected when slowing a short clip.
5. With Motion mask, compare a still clip, a moving subject, a camera pan, and a hard cut. Evaluate whether the treatment feels intentional or merely busy.
6. KEEP a candidate, change timing or digestion, and verify that a new family and KEEP are required. Re-select the same source file too: resetting its settings must revoke the old KEEP.
7. Render and inspect the foreign-material plan and compiler evidence in the existing provenance path. Record source identity, seed, plan hash, settings, output duration, and any preview/render disagreement.

A useful failure report includes the build commit, source duration/frame rate, song duration, both selectors, and the time where behavior differs from expectation. Test a one-frame source, variable-frame-rate phone video, clips longer than the song, and fractional frame rates before broad release; the automated pixel fixture covers constant-rate synthetic clips.

## Compatibility and proof

Old loop plans and compiler paths are preserved. New choices have explicit operator/policy IDs and distinct plan hashes. The v1 two-descendant digest-family helper remains unchanged; the nine combinations are human-selected input settings, not nine automatically evolved candidates. No score schema, renderer profile, receipt schema, HyperFood ABI, or GitBook ontology is migrated.

Automated proof includes all nine real-FFmpeg paths, full output duration, native return after source EOF, still-source motion control, later-source contribution under stretch, deterministic path-independent hashes, rejected unknown policies, narrow IPC behavior, UI rollback, and stale KEEP invalidation. Browser tests exercise both selectors and capture the Video row. Packaging alone does not prove packaged Electron interaction; that witness remains a separate gate.

Local verification on the development branch: syntax check passed (283 scripts), all 627 deterministic tests passed, and Linux unpacked packaging passed. The browser suite could not launch its missing Chromium executable; no baselines were updated. Packaged Electron interaction is unverified in this environment. The PR Completion watcher is blocked because `gh` is unavailable; this is not a merge-readiness claim. See the PR for final smoke/CI status and exact commit.

```text
UI impact: bridge
browser witness: FAIL @ development branch (Chromium missing; exact head in PR)
visual delta: expected
packaged witness required: yes
packaged witness: FAIL (not executed; environment limitation)
GitBook ontology changed: no
```

The expected visual change is a second Video selector and wrapping of the admitted Video row. It has semantic coverage but has not been visually inspected in this environment. Generated unpacked binaries and smoke artifacts are local test outputs, excluded from the source commit. No Windows package, release, or published build is claimed by this local record.

## Next composition work

HyperFood's first living receipt is already in [PR #276](https://github.com/the-static-collective/the-haunted-toaster/pull/276). Its receipt bridge is explicitly a descriptive descendant. Keep that boundary: a receipt animation should not silently become render authority. After that work lands, explore a versioned adapter that admits selected HyperFood outputs into the accepted score/timeline before preview and final render.

For topology diversity, the existing post-WALK grammar already crosses response, scope, and consequence. Its fixed send gain/resolution/smoothing are promising next admitted axes. Expose bounded, seeded values with replay evidence and lock behavior before adding more renderer-only knobs.

For video composition, the next useful step is a recorded phrase schedule: source window, entry time, playback rate, crop, and release. Mutation and CROSS should carry those values as accepted data. Rank experiments by visible compositional difference and human intention, not merely by unique hashes. A preparation → action → consequence phrase is a useful artistic experiment, not a new hidden rule.

## Orientation sources

Current main and repository operating law remain authoritative. Session orientation used LOADOUT `1adcb3d82f736f3ca8329c3c1d0d9eba398d49ee`, 3rdi `e631167a04c6bd1bf95c62cbe5a415994ebb8134`, and ALEX.2 `45c30b2ccfb194b14baa0a35cc229ac57b55bfdd`, plus GitBook Front Room revision `FCskTP0FvAOCQyc13Nlc`. No orientation document was rewritten.
