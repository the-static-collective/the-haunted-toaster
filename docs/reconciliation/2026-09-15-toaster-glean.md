# Toaster Glean — 2026-09-15 reconciliation cut

This is a repository-owned reconciliation note for the gap after the 2026-09-05 `CURRENT_SPINE.md` cut. It records present transport/provenance state without promoting field work to `main` and without manufacturing human witness claims that have not been made.

## Current split

- `main` is currently `b5c8981bdaf701ad4a7145a10c98244193f3efd7` (`Automatic Dogram video trace sidecar (#267)`).
- `walk/e-sequential-braid` is currently `04ab5fcf8c78c622c35498a3780ed65a5f39d200` after the bounded Video Digestion stack was landed.
- These remain separate authority carriers. This reconciliation note does not merge or promote either carrier.

## WALK E additions since the last ledger cut

### #261 — foreign-material lifecycle measuring instrument

`#261` is merged into `walk/e-sequential-braid` as `04ab5fcf8c78c622c35498a3780ed65a5f39d200` through the explicit stacked ancestry below.

Retained law:

`encountered -> admitted -> assimilated -> residue -> future-pressure`

Current result remains deliberately fail-closed:

`REFUSES / no-attributable-future-pressure`

The later Video Digestion witness does not upgrade this lifecycle result into a metabolism claim.

### #262 — bounded two-descendant Video digest

`#262` established two deterministic descendants over one admitted clip:

- `clip-luma-texture-v1` — legacy/control texture assimilation;
- `clip-luma-mask-v1` — topology-mask assimilation where source luminance selects regions over native Toaster imagery and literal source pixels do not survive.

No new timeline authority was introduced.

### #263 — narrow human bridge

`#263` exposed exactly those two digest roles through the existing Video binding and visibly revoked stale six-up state when the role changed.

The human A/2A comparison was completed before landing. Operator testimony: the receipt descriptions matched the rendered behavior closely, including the distinct texture-vs-mask assimilation and topology/L-branch behavior. This is a receipt-legibility witness, not a blanket causal proof beyond the recorded execution path.

Landing ancestry is preserved:

`#263 -> #262 -> #261 -> walk/e-sequential-braid`

All three PRs are merged. No tag, release, or `main` promotion follows from this cut.

## WALK E human-gate boundary still open

Issue #234 remains a broader field gate. Existing testimony established visually legible GRAB and legitimate Video assimilation, but explicitly did not manufacture verdicts for every topology verb. SPEAK/APERTURE remained under-characterized in the prior field witness, and GROW/BODY/KITCHEN SINK were not established by that specimen.

Therefore:

- Video Digestion A/2A human PASS does not close #234;
- WALK E is not silently promoted to `main` by this reconciliation;
- future promotion requires an explicit decision that accounts for the unresolved perceptual gate.

## Gleaned small-work ledger

### GENUINELY MISSING

#### TITLE-SAFE

Field finding: haunted titles may tilt, but upside-down/inverted title treatments can rotate the upper-left title off-screen enough to become effectively invisible.

Bounded target:

- title role only;
- preserve selected treatment identity and all other morphology;
- constrain title angle to `-30deg..+30deg`;
- leave artist/lyrics/ghosts and the shared treatment vocabulary unchanged;
- preserve preview/final parity through the shared typography resolver.

Implementation carrier: PR #271 / `fix/title-safe-rotation`, stacked on the current WALK E head. TDD begins with an existing deterministic `inverted-emphasis` title specimen.

### ALREADY IMPLEMENTED / STALE PAPERWORK

#### Invalid preset refusal

Unknown render preset identity already fails closed in `getPreset()`; do not reopen the old silent-Porchlight-fallback papercut as new work.

#### FFmpeg failure evidence

Issue #116's diagnostic bundle path is implemented: abnormal FFmpeg failure can preserve the graph, score, timeline, args, and full stderr evidence. The recurring Windows `0xC0000005` root cause is a separate unresolved debugging frontier and remains open.

### READY-TO-CARRY, NOT YET RECONCILED WITH WALK E

#### #268 Haunted Haiku

PR #268 is a non-draft, mergeable `main`-based implementation with application proof, runtime audit, smoke, renderer witness, browser witness, and Windows package evidence recorded on the PR. Preserve it as ready fruit; do not casually merge it under a divergent WALK carrier without a deliberate reconciliation step.

### INTENTIONALLY PARKED EXPANSION

#### #269 / #270 HyperFood

#269 is the design lane; #270 is an implementation draft in TDD/RED state for renderer-independent Slice A ABI work. Preserve the work, but do not use it as justification to expand the current Toaster runtime before the spine/glean cleanup is resolved.

## Reconciliation disposition

This cut is documentation/provenance only.

It does **not**:

- merge WALK E into `main`;
- close #234;
- promote #261's lifecycle result from REFUSES to SUPPORTS;
- merge #268;
- advance HyperFood runtime behavior;
- tag or release a build.

The next bounded runtime child is TITLE-SAFE. After that child is proven, reassess the carry order from one truthful inventory rather than opening another feature lane.
