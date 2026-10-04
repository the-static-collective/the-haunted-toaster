# FRANKEN-COMPOSER-001 — Deterministic Cross-Renderer Composition Bench

**Date:** 2026-10-03  
**Status:** design for review; implementation is not authorized by this document alone  
**Host repository:** `the-static-collective/the-haunted-toaster`  
**Design branch:** `design/franken-composer-001`  
**Base carrier:** `experimental/hyperkitchen-001-hyperframes-projection` @ `2c9df3844594635f353231f6ecbe60b6290cdbdb` (draft PR #297)  
**Related gates:** #298 HYPERKITCHEN-002, #299 MEDIA-METABOLISM-001, #302 TOPOLOGY SEASON  
**Donor repositories:** `the-haunted-blender` and `playdeck`

## Purpose

Prove that the current Static Collective media organs can compose into one genuinely expressive, deterministic editor/rendering vertical without collapsing their authority boundaries.

The founding specimen is one **30–60 second composition** that can combine:

- a Haunted Toaster candidate / accepted composition context;
- a small Playdeck-style deck of addressable cards;
- one explicitly accepted Haunted Blender moving take;
- deterministic typography and topology/material layers;
- scene transitions and camera-like spatial choreography;
- one frozen composition plan;
- two renderer projections: **Remotion** and **HyperFrames**;
- a portable receipt proving what plan each renderer consumed.

The test is intentionally visually ambitious enough to answer a real product question:

> Can the Toaster become a layered compositional instrument rather than a preset video generator, while keeping deterministic replay and inspectable lineage?

A simple anime / manga-cutout treatment is acceptable for the first witness. Visual sophistication comes from composition, staging, layering, timing, and relational behavior rather than from requiring a generative video model.

## Shared understanding and success condition

The requested outcome is not a speculative architecture document and not a wholesale repository merge. It is a buildable vertical that demonstrates actual creative compositional range.

Success means one human-editable composition can be changed, frozen, replayed, previewed, and projected through two different renderers without either renderer becoming the source of composition truth.

The first witness should feel like an editor/instrument:

```text
materials
  ↓
deterministic composition bench
  ↓
editable proposal
  ↓
explicit freeze / acceptance
  ↓
FrankenCompositionV0
  ├─→ Remotion projection
  └─→ HyperFrames projection
        ↓
renderer-specific outputs + receipts
```

## Current implementation facts

### Haunted Toaster

The host repository operating law preserves the accepted chain:

```text
accepted VisualScore
  -> canonical ResolvedTimeline
  -> production preview
  -> production render
  -> retained score/timeline sidecars
  -> receipt
```

The renderer may lower accepted semantics but must not silently invent or mutate them.

The current experimental carrier already contains:

- `src/full-measure/src/render/video-phrase-plan.cjs`: deterministic `VideoPhrasePlan v1` normalization, seeded planning, bounded phrase counts, source windows, traversal, transforms, digestion atoms, and canonical identity;
- `src/full-measure/src/candidate-session.cjs`: candidate-level acceptance/derivation behavior;
- `src/full-measure/src/render/foreign-material.cjs`: lowering of accepted foreign material into render behavior;
- HyperFood graph/trace/receipt modules;
- PR #297's additive HyperKitchen local HTML/GSAP projection and local render witness;
- existing receipt, preview/final, VSPantry, and deterministic test infrastructure.

The design must preserve the Toaster rule that material may influence a composition without silently gaining timeline or acceptance authority.

### Haunted Blender

The relevant donor body is `experimental/accepted-take-cut-001`, twenty commits ahead of Blender main.

It contains:

- `haunted_blender/scene_weave.py`: frozen fictional scene-world state and deterministic presentation proposals;
- `haunted_blender/scene_artifact.py`: accepted scene artifact boundary;
- `haunted_blender/creative_take.py`: separately admitted moving-take candidate;
- `haunted_blender/take_cut.py`: a private cut where one explicitly accepted moving take replaces the presentation of one accepted beat;
- receipt checks that revalidate source clip, snapshot, stills and output identity.

Blender explicitly treats its accepted moving clip as a presentation artifact, not proof of real-world occurrence, dialogue, release authority, or audience response.

### Playdeck

Playdeck main currently defines itself as a visual composition runtime where **the composition is data and the renderer is replaceable**.

The current tree contains:

- `packages/composer/src/composeDeck.ts` and `validatePlan.ts`;
- `packages/render-remotion/src/PlaydeckComposition.tsx`;
- `packages/studio/src/App.tsx`, `recompose.ts`, `possibilityEcology.ts`, and session/branch continuity surfaces;
- `packages/core/src/PerformanceReceipt.ts`;
- `packages/receipts/`;
- Studio 010, which can edit deck ordering/traits/world rules/gates, preview through the real Remotion composition, render, seal receipts, and preserve continuity checkpoints.

The first Franken proof borrows these **contracts and interaction ideas**. It does not make Playdeck the Toaster's new authority layer.

### HyperFrames

The HyperFrames composition contract is a suitable projection target because it supports finite, seekable composition timelines, explicit track indexes, nested compositions, media clips and GSAP choreography.

For this proof:

- no `Math.random()`, `Date.now()`, unseeded entropy, or infinite-repeat timelines;
- timeline construction remains synchronous;
- clip timing is explicit;
- multi-scene projections use explicit transitions;
- lint / validate / inspect are renderer proof gates;
- a HyperFrames output receipt remains renderer evidence, not composition authority.

### Remotion

Playdeck already contains a Remotion renderer and Studio/player path. Remotion is therefore the lowest-friction second projection for a shared plan.

Remotion remains a renderer. React component structure, sequencing convenience, or player state must not become canonical composition semantics.

## Architecture choice

### Chosen approach: one canonical adapter plan, two renderer projections

Do **not** merge Haunted Blender or Playdeck source trees into Haunted Toaster.

Do **not** allow Remotion or HyperFrames component trees to become the composition plan.

Instead introduce one bounded Toaster-owned experimental artifact:

`static-collective/franken-composition/v0`

It is a frozen, canonical plan that references admitted materials and carries only renderer-neutral composition semantics.

Sibling systems cross through versioned adapters:

```text
Toaster evidence / candidate context
             │
Playdeck deck snapshot ── proposal adapter
             │
Blender accepted take ─── material adapter
             │
             ▼
     FrankenCompositionV0
        canonical + frozen
          /          \
         /            \
RemotionProjection   HyperFramesProjection
      │                     │
 output receipt        output receipt
```

This keeps the experiment reversible. If the shared plan proves weak, no sibling repository must be rewritten to preserve the result.

## FrankenCompositionV0

The exact implementation schema may tighten during planning, but the following semantics are required.

```js
{
  schema: "static-collective/franken-composition/v0",
  compositionId,
  seed,
  fps,
  durationFrames,

  ancestry: {
    toasterCarrier,
    toasterCandidateOrPlan,
    playdeckSnapshot,
    blenderTakeAcceptance
  },

  materials: [
    {
      materialId,
      kind: "image" | "video" | "text" | "generated-shape",
      sourceIdentity,
      digest,
      rightsBasis,
      admissionBasis
    }
  ],

  scenes: [
    {
      sceneId,
      startFrame,
      durationFrames,
      worldRule,
      tracks: [
        {
          trackId,
          layer,
          role,
          clips: [
            {
              clipId,
              materialId,
              startFrame,
              durationFrames,
              sourceWindow,
              transform,
              crop,
              opacity,
              blend,
              entrance,
              transitionRelation
            }
          ]
        }
      ]
    }
  ],

  transitions: [
    {
      transitionId,
      fromSceneId,
      toSceneId,
      kind,
      durationFrames,
      parameters
    }
  ],

  receipts: {
    planHash,
    materialSetHash,
    policyVersion
  }
}
```

All numbers are finite and normalized. IDs are stable. Ordering is canonical. Unsupported values refuse before a renderer runs.

## Deterministic composition bench

The first UI is deliberately **not** a generic NLE, node graph, or Adobe clone.

It is a bounded composition bench over one proposal.

The human may edit only the controls needed to prove compositional agency:

1. reorder the six-card deck;
2. assign cards to scene roles;
3. choose one of a bounded set of world-rule treatments;
4. place or remove the accepted moving take;
5. choose bounded transition relations;
6. alter declared text;
7. change a seed / variation coordinate;
8. freeze the resulting proposal.

A useful first surface can read as three acts rather than hundreds of timeline controls:

```text
ACT I — ARRIVE
ACT II — CROSS
ACT III — ASSEMBLE

[ six addressable cards ]
[ one accepted moving take ]
[ type / topology layers ]
[ transition relations ]

RECOMPOSE
FREEZE THIS COMPOSITION
```

The editor state is proposal state. Only freeze creates the canonical `FrankenCompositionV0` plan and hash.

## Founding visual witness

The first witness should intentionally exercise range rather than visual polish.

Target style: **deterministic anime / manga collage**.

Permitted ingredients include:

- flat card cutouts;
- panel borders and split-screen layouts;
- speed-line / halftone / impact-shape SVG or CSS layers;
- deterministic parallax;
- typography as an addressable layer;
- rotations, crops, push-ins and camera-like framing;
- one Blender moving-take window;
- layered foreground/background card relations;
- two or more scene-transition families;
- one topology/material disturbance derived from existing Toaster semantics.

No remote image/video generation is required for the proof. Synthetic or repository-owned fixture media is sufficient.

## Renderer-neutral law

Both renderers consume the same frozen plan.

Required semantic parity:

- same duration and fps;
- same scene boundaries;
- same material IDs and source windows;
- same layer/track ordering;
- same explicit transforms;
- same transition identities and durations;
- same accepted moving-take placement;
- same text contents;
- same plan hash.

Not required:

- byte-identical encoded MP4;
- pixel-identical rasterization;
- identical font antialiasing;
- identical implementation-local component/DOM structure.

```text
SEMANTIC PARITY != PIXEL PARITY
RENDER OUTPUT != COMPOSITION AUTHORITY
```

Renderer-specific approximation must be explicit in its projection receipt. It may not silently alter the canonical plan.

## Projection A — Remotion

Use the existing Playdeck/Remotion patterns as donor evidence, not as an imported authority layer.

The adapter should lower each scene/track/clip into independently addressable React nodes so the preview remains editable and inspectable.

The Remotion projection should expose an interactive preview before any export is treated as a witness.

## Projection B — HyperFrames

Project the same plan into finite HyperFrames composition HTML.

Requirements include:

- explicit `data-composition-id`;
- explicit `data-start`, `data-duration`, and `data-track-index`;
- paused registered GSAP timelines;
- deterministic seeded values only;
- finite repeats;
- explicit scene transitions;
- renderer lint / validate / inspect before a successful projection witness.

Hosted/remote HyperFrames use remains separately permissioned under #298. A local HyperFrames-capable projection is sufficient for the first implementation slice unless the user explicitly authorizes remote submission.

## Blender crossing

The first Blender integration is deliberately one-way and bounded.

Input:

- one accepted `experimental/accepted-take-cut-001` take acceptance / receipt;
- exact moving clip digest;
- scene/beat identity;
- no private photographs committed to Git.

The Franken plan may place that moving clip as material in one scene.

It does not:

- edit Blender's SceneWorld;
- grant Toaster authority back into Blender;
- claim the clip depicts a real event;
- inherit publication or rights authority;
- create an automatic reverse render loop.

A future reverse crossing remains a separate adapter and gate.

## Playdeck crossing

For the first proof, Playdeck contributes a normalized deck snapshot and composition vocabulary:

- card identity;
- order;
- traits / role hints;
- world-rule values;
- explicit continuity/ancestry references where present.

The Franken plan does not import Playdeck's full session history as Toaster authority.

Possibility ecology stays possibility. A Playdeck proposal becomes part of the frozen Franken plan only through explicit composition freeze.

## Receipts

Three receipt layers remain distinct.

### Composition receipt

Records:

- `FrankenCompositionV0` schema/policy;
- plan hash;
- seed;
- material digests;
- adapter input identities;
- scene/track counts;
- duration/fps;
- freeze event identity.

### Remotion projection receipt

Records:

- canonical plan hash consumed;
- renderer/version;
- projection package hash;
- output identity if rendered;
- semantic approximation/refusal notes.

### HyperFrames projection receipt

Records:

- canonical plan hash consumed;
- HyperFrames capability/version;
- generated composition identity;
- lint / validate / inspect evidence;
- output identity if rendered;
- semantic approximation/refusal notes.

Neither projection receipt may rewrite the composition receipt.

## Error and refusal law

Refuse before rendering when:

- referenced material is missing or has changed digest;
- a Blender take acceptance does not match the clip/scene it claims;
- track spans are invalid or overlap beyond declared policy;
- a source window exceeds source duration;
- a transition references missing scenes;
- a renderer cannot express a required semantic without an explicit allowed approximation;
- hidden entropy is detected in the canonical planner;
- a frozen plan is mutated after hashing.

Renderer failure produces failure evidence, not a successful render receipt.

## Test strategy

### Pure plan tests

Prove:

- same inputs + same seed -> byte-identical canonical plan/hash;
- explicit editor delta -> attributable plan/hash delta;
- ordering is canonical;
- invalid spans/materials/transitions refuse;
- plan freeze is immutable.

### Adapter contract tests

Use synthetic fixtures to prove:

- one Playdeck deck snapshot becomes bounded proposal data;
- one Blender accepted-take witness becomes one material binding;
- neither donor can inject renderer or acceptance authority.

### Cross-renderer parity tests

From one frozen fixture plan:

- generate Remotion projection;
- generate HyperFrames projection;
- compare normalized semantic trace;
- require equality for scenes, spans, materials, transforms, transition identities and text;
- permit separately recorded raster/encoder differences.

### UI witness

Follow `docs/UI_CHANGE_PROTOCOL.md`.

The first bench must prove:

- ordinary Toaster workflow remains usable;
- editor proposal changes visibly alter the preview;
- freezing exposes the exact plan identity;
- preview never silently accepts or KEEP's a proposal;
- keyboard/focus behavior remains usable.

## Acceptance criteria

The first implementation slice is complete only when all are true:

1. One 30–60 second synthetic/repository-owned witness uses at least **three scenes**.
2. At least **six addressable image/card materials** participate.
3. At least one **accepted Blender moving take** participates as bounded material.
4. At least one typography layer and one topology/material layer participate.
5. At least two transition relations are exercised.
6. The composition bench can recompose and freeze a proposal without becoming a generic timeline editor.
7. Same frozen inputs + seed reproduce the exact canonical `FrankenCompositionV0` bytes/hash.
8. An explicit editor change yields an attributable plan delta.
9. Remotion and HyperFrames projections consume the same canonical plan hash.
10. Their normalized semantic traces match at the required renderer-neutral level.
11. Renderer-specific raster/encoding differences remain evidence, not semantic failures.
12. Composition, Remotion projection and HyperFrames projection receipts are distinct and linked.
13. Donor artifacts remain unchanged.
14. Existing Toaster acceptance / ResolvedTimeline authority is not widened by the experiment.
15. Focused tests pass and repository-required verification is run at the exact implementation head.
16. UI impact disposition and visual witness evidence are recorded.
17. No private media, EXIF location data, credentials, or provider secrets enter Git.
18. No tag, release, merge-to-main, or product promotion occurs from this proof alone.

## Explicit non-goals

- no wholesale merge of Toaster, Blender and Playdeck repositories;
- no replacement of VisualScore / ResolvedTimeline;
- no generic node graph;
- no full NLE timeline;
- no autonomous taste model;
- no silent KEEP or automatic acceptance;
- no remote generative-video dependency;
- no multi-user collaboration;
- no reverse Toaster -> Blender authority crossing;
- no attempt to make Remotion and HyperFrames byte-identical;
- no claim that this experiment proves a production release architecture;
- no merge to `main`.

## Implementation boundary

After this design is approved, write a task-level implementation plan before changing product code.

The expected execution branch is a new feature/experiment branch from the reviewed carrier, not this design branch. Implementation should use TDD and preserve narrow adapter boundaries.

Likely implementation surfaces are:

```text
src/full-measure/src/franken-composer/
  schema.cjs
  canonicalize.cjs
  compose.cjs
  adapters/
    playdeck.cjs
    blender-take.cjs
  projectors/
    remotion.cjs
    hyperframes.cjs
  receipt.cjs

src/full-measure/src/renderer/
  franken-composer-ui.js
  franken-composer-ui.css

src/full-measure/tests/
  franken-composer-*.test.cjs
```

These filenames are design targets, not authorization to create them before implementation planning.

## Stop condition

Stop the experiment when it can truthfully say:

> One frozen composition can contain several kinds of addressable media, can be intentionally rearranged by a human, can survive projection through two different renderers, and can still answer exactly what changed and where every material came from.

That is enough to prove the compositional seam. Everything beyond it becomes a descendant experiment.


## Implementation Evidence — 2026-10-04

The approved design has been implemented on `experimental/franken-composer-001` / PR #315. The implementation preserves this document's authority split: Toaster owns the frozen `FrankenCompositionV0`; Playdeck and Blender cross through bounded read-only adapters; HyperFrames and Remotion remain projections.

Validated evidence is recorded in `docs/reconciliation/2026-10-03-franken-composer-001-witness.md`. At the reconciliation checkpoint, consolidated Toaster verification, focused Franken contracts, HyperFrames lint/validate/inspect, Remotion composition discovery, semantic parity sealing, and the browser witness all pass. The Windows package handoff remains intentionally deferred to the ready-for-review CI gate so it can run on the exact review head.
