# VisualScore v0.5 laboratory

This directory is the first executable attempt at the Haunted Toaster's next architecture:

```text
portable VisualScore artifact
  + normalized AudioAnalysis
  + GarmentConstraints
  + RendererProfile
        ↓ pure deterministic resolution
track-bound ResolvedTimeline
        ↓ renderer primitive
linear / circle / mirrored-ring graph
```

The separation is deliberate. A `VisualScore` contains no audio fingerprint, duration, sections, paths, URLs, renderer output, or machine-local state. Its address therefore survives application to another track. Track identity enters only when the score resolves into a `ResolvedTimeline`.

## Included

- strict `VisualScoreV1`, `GarmentConstraintsV1`, `RendererProfileV1`, and analysis validation;
- canonical UTF-8 JSON with deterministic key order, six-decimal numeric quantization, collection/depth limits, and SHA-256 domain separation;
- addressed scores using the `htvs1_` domain;
- `xoshiro256** / splitmix64-v1` with published vectors and no ambient entropy;
- pure integer-timebase resolution with bounded section, phrase, or transient patches;
- versioned Porchlight, Wire Orchard, and Absolute Residual constraint packs;
- linear, circle, and mirrored-ring FFmpeg graph primitives;
- deterministic bounded mutation with field locks;
- typed breeding with numeric interpolation, seeded enum inheritance, parent score references, and a policy receipt;
- score diff and replay verification that localizes score, analysis, constraint, profile, or timeline mismatches;
- three analysis fixtures and 27 exact golden score/timeline cases.

## Lab commands

Run from `src/full-measure`:

```bash
node scripts/visual-score-lab.cjs score \
  constraints/wire-orchard.v1.json score-a.json \
  --seed 42 --topology circle

node scripts/visual-score-lab.cjs resolve \
  fixtures/analysis/sectional.v1.json score-a.json \
  constraints/wire-orchard.v1.json profiles/toaster-raster-1.json \
  timeline-a.json

node scripts/visual-score-lab.cjs mutate \
  score-a.json constraints/wire-orchard.v1.json score-b.json \
  --seed 137 --amount 0.35 --lock topology

node scripts/visual-score-lab.cjs breed \
  score-a.json score-b.json constraints/wire-orchard.v1.json child.json \
  --seed 183 --mix 0.5

node scripts/visual-score-lab.cjs diff score-a.json child.json diff.json

node scripts/visual-score-lab.cjs replay \
  timeline-a.json fixtures/analysis/sectional.v1.json score-a.json \
  constraints/wire-orchard.v1.json profiles/toaster-raster-1.json \
  replay-report.json

node scripts/visual-score-lab.cjs graph \
  timeline-a.json profiles/toaster-raster-1.json topology.ffgraph
```

## Invariants

1. The score address is independent of any target track.
2. Imported v1 documents reject unknown fields and unsupported identifiers.
3. Accepted scores contain every creative value explicitly; the resolver does not invent hidden defaults.
4. Topology is frozen for the track. Timeline patches may touch only motion, palette, material, lyric, or camera state.
5. Patches occur only at declared boundaries and cannot exceed the constraint pack's patch or entropy budgets.
6. Preview and export FPS do not change semantic patch ticks or values. Renderer-profile identity still remains part of the timeline hash.
7. Mutation and breeding are deterministic, constraint-checked derivations with separate lineage receipts.
8. Replay reports which addressed dependency changed instead of reducing every mismatch to “different output.”

## Current boundary

This is a laboratory core, not a claim that the v0.5 product is finished.

The existing v0.4 `renderVideo` path is intentionally unchanged. The topology module produces FFmpeg graphs that compile for linear, circle, and mirrored-ring modes, but the desktop renderer and preview do not consume `ResolvedTimeline` yet. Video Receipt fields, score/timeline sidecars, UI controls, preview parity, production garment migration, and raster-conformance fixtures remain follow-up integration work.

This boundary keeps the new artifact law reviewable before it becomes authoritative over the working renderer.
