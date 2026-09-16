# Video Phrase Grammar v1 — Design

**Date:** 2026-09-16  
**Carrier ancestry:** `beta/0.0.1-video-phrasing-current` / PR #277 @ `fdaf32616148b1463a68f77055e2653307ea2852`  
**Status:** approved design, implementation not yet authorized by this document alone

## Purpose

Replace the two rigid Video selectors introduced by the first 0.0.1 phrasing slice with one deterministic Toaster-owned phrase grammar.

The current carrier proves useful primitives:

- Texture, Topology mask, Motion mask;
- Loop, Play once → release, Stretch across song;
- deterministic foreign-material plan identity;
- shared preview/final compiler behavior;
- KEEP invalidation when Video settings change;
- real-FFmpeg duration and finite-playback behavior.

Those nine combinations are not discarded. They become the first proven primitive behaviors beneath a more general composition layer.

The governing change is:

```text
video specimen + candidate evidence + seed
                ↓
        VideoPhrasePlan v1
                ↓
   ordered/overlapping phrase spans
                ↓
 source-time map + digestion atoms + transforms
                ↓
      shared preview/final compiler
```

The human admits Video material. The Toaster decides how that material behaves inside each generated candidate.

## Core law

> Video is material, not a mode selector.

A Video specimen may contribute different things at different times. It may become texture, mask, motion witness, disappear, return, reverse, mirror, rotate, accelerate, slow down, ping-pong, or release to native composition. No single dropdown should collapse the whole song to one digestion operator or one timing policy.

The resulting choice must remain attributable and replayable:

```text
same admitted evidence + same generation seed + same policy version
= same VideoPhrasePlan
```

A changed plan must change the candidate derivation identity and invalidate stale KEEP authority.

## Scope of the first mutation

This first grammar is deliberately bounded. It proves the architecture without pretending to exhaust what FFmpeg or future render adapters can do.

### Digestion atoms

The v1 planner may use these existing proven atoms independently per phrase:

- `clip-luma-texture-v1`
- `clip-luma-mask-v1`
- `clip-motion-mask-v1`

A phrase may use one atom or a bounded combination. Different phrases in one song may use different atoms.

Literal source pixels are not silently granted new authority. Existing operator semantics remain intact unless a later explicit primitive says otherwise.

### Source-time maps

The v1 planner replaces Loop / Once / Stretch as top-level modes with explicit phrase-local time mapping.

Minimum supported forms:

- forward source window: `A → B`;
- reverse source window: `B → A`;
- ping-pong: `A → B → A`;
- repeated ping-pong / bounded shuttle: `A → B → A → B ...`;
- whole-window retime to phrase duration;
- source-rate playback followed by native release;
- held final frame only when explicitly represented by the phrase plan.

`loop-source-clip-v1`, `play-source-once-v1`, and `stretch-source-clip-v1` remain valid ancestry and compatibility specimens. They are expressible as simple phrase plans and should not be deleted until compatibility proof is complete.

### Spatial transforms

The first mutation admits only transforms with straightforward deterministic FFmpeg realization:

- identity;
- horizontal mirror;
- vertical mirror;
- 90°, 180°, 270° rotation;
- bounded crop/reframe;
- bounded zoom;
- phrase-local opacity / blend amount where the selected digestion atom already supports blending.

No arbitrary affine matrix, perspective warp, optical-flow interpolation, object tracking, semantic segmentation, generative inpainting, or renderer-specific hidden behavior belongs in v1.

### Phrase scheduling

One `VideoPhrasePlan` contains a bounded ordered collection of phrases over the accepted song timeline.

Each phrase records at minimum:

```js
{
  phraseId,
  startTick,
  endTick,
  sourceWindow: { startSeconds, endSeconds },
  traversal: "forward" | "reverse" | "ping-pong",
  cycles,
  playbackRate,
  digestion: [{ operatorId, weight }],
  transforms: {
    mirrorX,
    mirrorY,
    rotationDegrees,
    crop,
    zoom,
    opacity
  },
  release: "native" | "hold"
}
```

The exact normalized schema may tighten during implementation, but the semantics above are required.

Phrase count, overlap count, transform count, and cycle count must have explicit finite bounds. The compiler must reject out-of-policy plans rather than quietly simplify them.

## Toaster spectrum

The requested “Toaster spectrum lever” is an internal deterministic planning coordinate in this first mutation, not a new human-facing slider.

It controls bounded composition pressure such as:

- phrase density;
- source-window fragmentation;
- likelihood of mixed digestion atoms;
- reversal / ping-pong probability;
- spatial-transform diversity;
- overlap allowance;
- release frequency.

It must be derived from candidate generation evidence/seed under a versioned policy. The same candidate replay must recover the same spectrum value and exact plan.

The first mutation should expose the chosen spectrum value in receipts for inspection, but not add a UI control that recreates the knob problem we are removing.

## Candidate relationship

Video phrasing becomes candidate-owned creative data rather than mutable global Video settings.

Admission answers only:

```text
What Video specimen is available?
```

Candidate generation answers:

```text
How does this candidate use it?
```

Therefore six candidates may produce six materially different VideoPhrasePlans while preserving the same admitted source identity.

KEEP binds the accepted candidate and its exact VideoPhrasePlan. SCRAPE/search may produce new plans. Re-generating six may produce new plans according to the existing deterministic generation law.

Changing or removing the admitted Video source invalidates any KEEP whose plan depends on the previous source.

## UI

Remove both Video policy dropdowns from the ordinary BETA surface:

- Video digestion selector;
- Video timing selector.

The Video row should return to material admission/removal plus concise status.

After candidate generation, the UI may present a descriptive phrase stamp derived from candidate evidence, for example:

```text
Video phrase · 4 movements · texture/motion · reverse + mirror · candidate-owned
```

This is observational. It must not become a second editing surface in v1.

## Compiler architecture

Keep planning separate from execution.

### New pure planner module

Recommended module:

`src/full-measure/src/render/video-phrase-plan.cjs`

Responsibilities:

- normalize/validate `VideoPhrasePlan v1`;
- derive deterministic phrase plans from admitted Video + timeline + explicit seed/evidence;
- compute canonical plan hash;
- provide compatibility lowering for the three historical timing policies where needed;
- contain no Electron/UI/FFmpeg process execution.

### Existing foreign-material compiler

`src/full-measure/src/render/foreign-material.cjs` remains responsible for lowering accepted foreign-material/video creative data into FFmpeg graph/input behavior.

Its role changes from compiling one whole-song operator/policy pair to compiling an accepted phrase schedule.

The existing three digestion operator implementations remain the primitive compiler bodies where possible.

### Candidate session

`candidate-session.cjs` must treat phrase-plan identity as part of candidate Video identity/derivation. A candidate cannot retain KEEP after its source or accepted phrase plan changes.

## Receipts and provenance

The accepted render receipt / foreign-material evidence must record enough data to explain exact Video behavior without reverse-engineering the filter graph.

Required compact evidence:

- schema + phrase policy version;
- source specimen identity;
- spectrum value;
- phrase count;
- canonical `videoPhrasePlanHash`;
- per-phrase ids and timeline spans;
- source windows and traversal type;
- digestion operator ids/weights;
- transforms;
- release behavior;
- compiler policy identity.

Large implementation-local strings such as the entire FFmpeg graph do not become canonical authority merely for convenience.

## Determinism and failure law

The planner is pure and deterministic.

The compiler is a deterministic lowering of an already accepted plan.

Unknown operators, invalid tick spans, invalid source windows, unsupported transforms, excessive cycles, excessive overlaps, NaN/Infinity, or impossible bounds must refuse before FFmpeg execution where possible.

No silent fallback from an invalid VideoPhrasePlan to legacy loop behavior.

Legacy loop behavior may be used only through an explicit compatibility plan whose identity states that fact.

## Proof gates for the mutation

The mutation is proven only when all of the following are witnessed:

1. **REPLAY** — same admitted source/timeline/seed yields byte-identical canonical phrase plan and hash.
2. **DELTA** — changing the planning seed or bounded spectrum coordinate can produce an attributable plan delta.
3. **ANCESTRY** — each historical #277 timing behavior can be represented or explicitly compatibility-lowered without losing its tested semantics.
4. **MULTI-PHRASE** — one render uses at least three distinct phrase spans with at least two digestion atoms.
5. **PING-PONG** — one real-FFmpeg specimen proves `A → B → A` source traversal.
6. **TRANSFORM** — mirror and 90° rotation are visually/pixel-test distinguishable and deterministic.
7. **RELEASE** — a phrase can end and return cleanly to native composition while the song continues.
8. **PREVIEW/FINAL PARITY** — preview and final consume the same accepted phrase plan.
9. **KEEP LAW** — accepted candidate/plan is bound to KEEP; source or plan identity change invalidates stale KEEP.
10. **UI FLOOR** — ordinary Video admission has no digestion/timing dropdowns.
11. **FIELD WITNESS** — packaged desktop use with real footage produces useful non-rigid phrasing and no concrete blocker.

## Explicit non-goals for v1

- no generic node-graph editor;
- no human phrase sequencer;
- no Ableton-style timeline;
- no optical flow claim;
- no semantic object understanding;
- no arbitrary shader/plugin host;
- no HyperFood/HyperFrames authority migration;
- no new VisualScore/ResolvedTimeline authority layer;
- no automatic promotion of experimental transforms into canon;
- no attempt to enumerate every technically possible FFmpeg filter.

## Intended next-step expansion after this mutation is proven

This frontier is part of the design on purpose. Passing v1 does not mean the grammar is finished; it means the grammar boundary is trustworthy enough to widen.

After REPLAY, preview/final parity, KEEP law, packaged field proof, and receipt legibility are all green, the next expansion should grow **vocabulary and relational composition**, not add new top-level dropdowns.

### Expansion A — richer time topology

Admit additional source-time operators under the same phrase grammar:

- freeze / stutter cells;
- bounded jump-cut walks across multiple source windows;
- palindrome phrases larger than simple ping-pong;
- variable-rate curves within a phrase;
- nested phrase recurrence;
- phrase-to-phrase call/response using shared source ancestry;
- deterministic phase offsets when multiple video layers eventually exist.

### Expansion B — richer spatial topology

Add versioned transform primitives only after each has deterministic renderer proof:

- arbitrary bounded rotation;
- tiled / kaleidoscopic repetition;
- nested crops / tunnel folds using Frame Reservoir ancestry;
- radial echo / split-screen / multi-panel projection;
- perspective / affine transforms where cross-platform FFmpeg behavior is stable;
- topology-event-aware reframing.

### Expansion C — digestion as composable material organisms

Move from simple weighted combinations toward explicit composition of digestion processes:

```text
source
  → motion witness
  → topology selection
  → texture residue
  → native consequence
```

This is the natural future crossing with HyperFood-style organism composition, but authority remains explicit: HyperFood or HyperFrames may supply reusable organisms/adapters without silently acquiring accepted song-render authority.

### Expansion D — evidence-responsive phrasing

Once the Creative Context Table / Influence Diet reconnection is proven, allow phrase generation to lawfully consume bounded evidence such as:

- song section boundaries;
- Listener/alignment evidence;
- topology events;
- Specimen Pulse clip-relative testimony;
- accepted candidate genealogy;
- declared response/consequence structures.

The rule remains:

```text
evidence may influence the plan
!=
evidence automatically authorizes an effect
```

### Expansion E — more than one admitted video

Only after single-source phrase grammar is stable, permit multiple admitted Video specimens with explicit ancestry and layer budgets.

Then the planner may choose:

- alternation;
- juxtaposition;
- masks derived from one specimen applied to another;
- shared-stage collisions;
- source handoffs;
- multi-source call/response.

This is intentionally not part of v1 because multi-source identity and blend authority deserve their own proof.

### Expansion F — learned taste without hidden preference

Human KEEP/SCRAPE history may eventually inform bounded priors over phrase grammar coordinates, but only through the existing continuation-without-preference discipline and explicit evidence boundaries. Repetition alone must not silently become taste truth.

## Promotion rule

No item in the expansion frontier becomes ordinary behavior merely because v1 proves the architecture.

Each expansion requires:

- a named primitive or policy version;
- RED → GREEN executable proof;
- receipt identity;
- deterministic replay;
- preview/final parity where applicable;
- explicit human field disposition before broad promotion.

The durable architecture is therefore:

```text
stable phrase grammar
      +
versioned growing vocabulary
      +
receipts
      +
field witness
```

—not an ever-growing pile of mode selectors.
