# HyperFood v0 — Deterministic Motion Organisms Design

**Date:** 2026-09-15

**Status:** Design for user review

**Project:** The Haunted Toaster — Video Receipt Renderer

**Base:** `main` at `b5c8981bdaf701ad4a7145a10c98244193f3efd7`

**Related:** VSPantry / ToastPack design; receipt memory; Dogram video trace sidecars; `foreign-material-v1`; Video Digestion

## 1. Purpose

HyperFood gives The Haunted Toaster a cheap, deterministic way to turn still images, text, SVG/diagram material, timing events, and existing visual specimens into families of short reusable motion clips without repeatedly calling a generative-video service.

The governing economic and architectural idea is:

> Generate rarely. Transform aggressively. Preserve everything.

The first implementation proves three reusable motion organisms:

- `PULSE` — a surface responds to an explicit event grid;
- `GHOST-TEXT` — timed text leaves age-governed residue and clears deterministically;
- `FRAME-EAT-FRAME` — a source surface recursively re-enters itself through structural nested transforms.

HyperFrames is the first reference renderer because HTML/CSS/SVG + GSAP gives a broad motion grammar, explicit timelines, local rendering, transparent WebM, and deterministic execution constraints. The organism contract must remain renderer-independent. Remotion is the first cross-renderer witness for `PULSE`.

HyperFood is not a second song renderer. It is an upstream material-production system.

## 2. Existing authority boundary

Current Haunted Toaster law remains unchanged:

```text
accepted VisualScore
  -> canonical ResolvedTimeline
  -> production preview
  -> production render
  -> retained score/timeline sidecars
  -> receipt
```

The accepted `ResolvedTimeline` remains the sole semantic execution authority for a song render.

HyperFood sits before that boundary:

```text
assets + timing + parameters
          |
          v
   HyperFood organism
          |
          v
 HyperFood specimen
          |
          v
 renderer adapter
          |
          v
short rendered descendant + HyperFood receipt
          |
          v
 optional VSPantry admission
          |
          v
 ordinary candidate / acceptance machinery
          |
          v
 accepted ResolvedTimeline
          |
          v
      song render
```

A HyperFood render may become candidate material. It does not schedule itself, mutate an accepted timeline, bypass candidate acceptance, or become song-render authority merely because it exists.

## 3. Constitutional laws

HyperFood v0 adopts three explicit laws:

> **THE RENDER IS NOT THE ORGANISM.**

> **A MUTATION MUST SHOW ITS DELTA.**

> **COMPOSITION MUST NOT ERASE LINEAGE.**

And four inherited Haunted Toaster constraints:

- no hidden entropy;
- source/material evidence is not render authority;
- completed receipts must describe what actually happened;
- local-first execution is the default boundary.

## 4. Terms

### 4.1 Organism

An `Organism` is a versioned visual behavior contract independent of one renderer implementation.

Examples:

```text
PULSE@0.1.0
GHOST-TEXT@0.1.0
FRAME-EAT-FRAME@0.1.0
```

An organism defines:

- accepted input port types;
- parameter schema and bounds;
- timing semantics;
- deterministic state function or transform trace;
- output surface semantics;
- refusal behavior.

The organism does not contain renderer-specific HTML, React markup, FFmpeg filters, browser version, or codec settings.

### 4.2 HyperFoodSpec

A `HyperFoodSpec` is a canonical renderer-independent instruction object that binds one organism or an explicit composition graph to concrete assets, timing, parameters, seed, and target geometry.

It answers:

> What motion specimen is being requested?

### 4.3 Specimen

A `Specimen` is the canonical identity of a fully bound HyperFoodSpec.

It is identified by a domain-separated canonical hash of the semantic instruction object. It exists before any specific renderer executes it.

### 4.4 Render Adapter

A `Render Adapter` translates a HyperFood specimen into a renderer's implementation language while preserving the organism's declared transform/timing trace.

Reference adapters:

- `hyperframes/v0` — first renderer and primary v0 implementation;
- `remotion/v0` — cross-renderer witness for `PULSE` only in the initial crucible.

Future adapters may include direct procedural/FFmpeg paths where an organism can be expressed faithfully.

### 4.5 HyperFood Render

A `HyperFood Render` is one concrete encoded output produced by a declared adapter and rendering environment.

The same specimen may have several renders.

### 4.6 HyperFood Receipt

A `HyperFood Receipt` records the specimen identity, renderer environment, output bytes, determinism evidence, ancestry, and mutation delta for a material-production render.

It is provenance for visual material. It is not a `full-measure.video-receipt.v1` song receipt and does not impersonate one.

## 5. Identity model

HyperFood preserves three separate identities.

### 5.1 Organism identity

```text
organism_id = <name>@<semantic-version>
```

Example:

```text
PULSE@0.1.0
```

A semantic change to timing, parameter interpretation, transform trace, or refusal behavior requires an organism version change.

### 5.2 Specimen identity

The specimen address is produced with the repository's existing canonical JSON machinery and a dedicated domain/prefix:

```text
specimen_id = addressCanonical(
  canonical HyperFoodSpec semantic payload,
  domain = "HauntedToaster-HyperFood-Specimen-v0",
  prefix = "hf0_"
)
```

The specimen identity includes:

- schema version;
- organism/version or full composition graph;
- asset content digests and byte lengths;
- timing values and explicit event/cue data;
- semantic parameters;
- seed where the organism permits seeded variation;
- target canvas geometry and alpha requirement where they alter the organism state trace.

It excludes non-semantic display/path metadata such as source filename, absolute filesystem path, creation timestamp, and UI labels.

### 5.3 Render identity

A render identity binds a specimen to the declared adapter/environment/transport target:

```text
render_id = addressCanonical(
  {
    specimen_id,
    adapter,
    adapter_version,
    renderer_version,
    environment_identity,
    width,
    height,
    fps,
    format,
    codec_profile
  },
  domain = "HauntedToaster-HyperFood-Render-v0",
  prefix = "hfr0_"
)
```

The encoded output SHA-256 and byte length are evidence about the resulting bytes, not substitutes for `render_id`.

### 5.4 VSPantry identity remains unchanged

If a HyperFood render is admitted to VSPantry, VSPantry continues to identify it only by its existing content identity:

```text
sha256:<raw-byte-sha256>:<byte-length>
```

Therefore two adapters can render the same HyperFood specimen into different byte-identities while still sharing one upstream `specimen_id`.

This separation is intentional:

```text
HyperFood specimen identity = what was instructed
HyperFood render identity   = how it was rendered
VSPantry specimen identity  = what bytes were admitted
```

No identity silently replaces another.

## 6. HyperFoodSpec v0.1

The initial semantic shape is:

```json
{
  "schema": "haunted-toaster/hyperfood-spec/v0.1",
  "organism": {
    "id": "PULSE",
    "version": "0.1.0"
  },
  "assets": [
    {
      "id": "primary",
      "mediaType": "image/png",
      "sha256": "<64 hex>",
      "byteLength": 12345
    }
  ],
  "timing": {
    "durationMs": 4200,
    "events": [
      { "tMs": 0, "strength": 0.8 },
      { "tMs": 487, "strength": 1.0 },
      { "tMs": 981, "strength": 0.65 }
    ]
  },
  "parameters": {
    "attackMs": 40,
    "holdMs": 0,
    "decayMs": 180,
    "scaleAmount": 0.08
  },
  "seed": 481516,
  "target": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "alpha": true
  }
}
```

The implementation may store a separate local asset binding from asset ID/digest to current filesystem path. Paths must not enter semantic specimen identity.

All numeric semantic values pass through current Haunted Toaster canonicalization. Organism schemas should prefer integer milliseconds and bounded integers/rationals where practical to minimize cross-runtime float ambiguity.

## 7. Typed composition graph

Composable HyperFood is represented as a typed directed acyclic graph, not executable string syntax such as `PULSE(GHOST-TEXT(image))`.

Conceptual form:

```json
{
  "schema": "haunted-toaster/hyperfood-spec/v0.1",
  "graph": {
    "nodes": [
      { "id": "asset-a", "op": "ASSET", "version": "0.1.0" },
      { "id": "ghost", "op": "GHOST-TEXT", "version": "0.1.0" },
      { "id": "pulse", "op": "PULSE", "version": "0.1.0" }
    ],
    "edges": [
      { "from": "asset-a.surface", "to": "ghost.surface" },
      { "from": "ghost.surface", "to": "pulse.surface" },
      { "from": "events-a.events", "to": "pulse.events" }
    ],
    "output": "pulse.surface"
  }
}
```

Graph laws:

- node IDs are unique;
- edges connect compatible declared port types;
- the graph is acyclic in v0;
- exactly one output surface is declared;
- node/edge canonical ordering is derived from IDs and ports, never authoring order;
- every node retains its organism/version and local parameter payload;
- composition does not flatten away ancestry;
- cyclic visual feedback is refused in v0 rather than implicitly simulated.

True frame-history feedback is reserved for a future explicitly stateful organism such as `FEEDBACK`; it is not hidden inside `FRAME-EAT-FRAME`.

## 8. Organism contracts

### 8.1 PULSE@0.1.0

**Purpose:** respond to an explicit event stream with a bounded envelope applied to one input surface.

**Required ports:**

```text
surface : Surface
 events : EventGrid
```

**Event shape:**

```text
{ tMs: non-negative integer, strength: bounded number [0,1] }
```

Events must be sorted canonically by `tMs`, then strength. Duplicate event timestamps are allowed and combine by a versioned rule: `max(strength)` for v0.1.0.

PULSE never analyzes raw audio. Beat/onset analysis is an upstream process that must leave its own evidence if used.

Core envelope:

```text
event
 -> attack
 -> optional hold
 -> peak * strength
 -> decay
 -> rest
```

Initial bounded parameters:

- `attackMs`;
- `holdMs`;
- `decayMs`;
- `scaleAmount`;
- `rotationDeg`;
- `translateXPx` / `translateYPx`;
- `opacityAmount`;
- `brightnessAmount`;
- `blurPx`;
- `phaseOffsetMs`.

Overlapping envelopes combine by explicit v0 rule: per-channel maximum normalized envelope before applying the signed/amplitude parameter. The adapter may not invent a different overlap policy.

### 8.2 GHOST-TEXT@0.1.0

**Purpose:** produce deterministic timed text plus accumulating residues whose appearance is a function of residue age.

**Required ports:**

```text
surface? : Surface
cues      : TextCue[]
font      : FontAsset
```

Cue shape:

```text
{
  text,
  startMs,
  clearMs
}
```

Every visible residue derives from a cue and deterministic birth index. Its state is computed from:

```text
appearance = f(cue, residueIndex, ageMs, parameters, seed)
```

Initial parameters:

- `ghostCount`;
- `ghostIntervalMs`;
- `ghostLifetimeMs`;
- `xDriftPx` / `yDriftPx`;
- `scaleDrift`;
- `rotationDriftDeg`;
- `blurGrowthPx`;
- `opacityDecay`;
- `blendMode` from a bounded allow-list;
- `clearMode` from a bounded allow-list.

Fonts are pinned assets by bytes. System-font fallback is not permitted for a verified specimen because it would change geometry across environments.

### 8.3 FRAME-EAT-FRAME@0.1.0

**Purpose:** recursively re-enter the same source surface through nested viewports/transforms.

This is structural recursion, not framebuffer feedback.

**Required port:**

```text
surface : Surface
```

Initial parameters:

- `depth`;
- `stepMs`;
- `scalePerDepth`;
- `rotationPerDepthDeg`;
- `cropPerDepth`;
- `pivotX` / `pivotY`;
- `opacityPerDepth`;
- `staggerMs`;
- `entryOrder`;
- `exitOrder`.

Every nested level references the same declared upstream source or prior graph-node surface according to the graph. No frame at time `t` may sample the encoded/rendered frame at `t-1` in v0.

## 9. Adapter contract

Every adapter must produce two things before encoding:

1. a renderer-native composition;
2. a canonical `transformTrace` describing the organism-level state at declared witness times.

The trace is the portability seam. Pixel equality across different renderers is not required for the first cross-renderer proof. Equivalent organism semantics are demonstrated by equivalent canonical traces at the same witness times.

Minimum adapter declaration:

```json
{
  "adapter": "hyperframes/v0",
  "adapterVersion": "0.1.0",
  "renderer": "hyperframes",
  "rendererVersion": "<pinned>",
  "runtime": {
    "node": "<pinned>",
    "browser": "<pinned-or-tool-reported>",
    "ffmpeg": "<tool-reported>"
  }
}
```

### HyperFrames reference adapter

The HyperFrames adapter must:

- build timelines synchronously;
- register paused GSAP timelines as required by HyperFrames;
- use no ambient/random runtime state;
- use a seeded PRNG only where an organism explicitly allows seeded variation;
- use finite repeats only;
- pin required fonts/assets;
- lint and visually inspect a crucible composition before a successful final proof;
- emit MP4 and transparent WebM where the organism/target requests alpha and the renderer supports it.

### Remotion witness adapter

The first Remotion adapter implements `PULSE@0.1.0` only. It exists to test renderer independence, not to create feature parity with HyperFrames.

It must derive state from explicit frame/time and the same HyperFood specimen/event contract. The portability test compares its canonical transform trace with the HyperFrames trace at the same witness timestamps.

## 10. HyperFood receipt

A successful material render writes a sidecar adjacent to the output:

```text
<name>.mp4
<name>.hyperfood.json
```

Conceptual receipt:

```json
{
  "schema": "haunted-toaster/hyperfood-receipt/v0",
  "specimenId": "hf0_...",
  "renderId": "hfr0_...",
  "organismLineage": [
    { "id": "PULSE", "version": "0.1.0" }
  ],
  "specHash": "...",
  "adapter": {
    "id": "hyperframes/v0",
    "version": "0.1.0",
    "environment": {}
  },
  "target": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "format": "webm",
    "alpha": true
  },
  "output": {
    "sha256": "...",
    "byteLength": 123456
  },
  "determinism": {
    "spec": "verified",
    "timeline": "verified",
    "pixels": "not-tested",
    "bytes": "not-tested"
  },
  "mutation": {
    "parentSpecimenId": null,
    "delta": []
  }
}
```

A failed render must not produce a receipt claiming successful output. Failure evidence may be retained separately, following existing Toaster practice.

The receipt is allowed to produce a comparison-only Dogram trace source in a later slice, but Dogram projection is not part of the initial crucible. HyperFood does not import Dogram as authority.

## 11. Mutation law

A mutation is a new HyperFoodSpec descended from a parent specimen by an explicit bounded patch over semantic fields.

The child receipt records:

- parent specimen ID;
- child specimen ID;
- canonical delta operations;
- unchanged organism/version or explicit organism version change;
- changed asset identities where applicable.

A mutation must be reconstructable from parent spec + delta and must produce exactly the child's canonical spec. If reconstruction does not hash to the declared child specimen ID, the mutation is invalid.

The initial mutation representation uses JSON-Pointer-like operations over canonical semantic fields with only `add`, `replace`, and `remove`; array index mutation is refused where canonical ordering would make index meaning unstable. Event/cue changes should replace the explicitly addressed semantic collection in v0.

## 12. VSPantry / freezer relationship

HyperFood does not create a second competing video pantry.

The "cheap-food freezer" is a projection over:

```text
HyperFood specimens + HyperFood receipts + admitted VSPantry descendants
```

Rendered descendants are admitted through the ordinary VSPantry path. Their raw-byte SHA-256/byte-length identity remains authoritative for pantry content identity.

HyperFood ancestry is stored as linked provenance, not smuggled into `canonicalSpecimenId()`.

Conceptual local state:

```text
TOASTER_HOME/
├── HyperFood/
│   ├── specs/             # canonical semantic specs by specimen_id
│   ├── receipts/          # material-production receipts
│   └── bindings/          # local path bindings, non-semantic
├── VSPantry/
│   ├── specimens/
│   └── catalog/
├── ToastPacks/
├── Receipts/
└── Memory/
```

VSPantry admission may record a provenance reference such as `hyperfoodReceiptId` in a non-identity metadata/evidence field once a dedicated bridge slice is implemented. The first crucible does not modify the existing VSPantry schema.

## 13. Behavioral descriptors

The freezer should eventually support search by measured behavior, while keeping measured, declared, and interpreted properties separate.

Initial measurable descriptors may include:

- duration;
- aspect ratio;
- fps;
- alpha capability / coverage;
- motion extent;
- motion velocity proxy;
- event-response latency;
- text occupancy;
- cut count;
- loop seam error;
- luminance delta;
- render cost/duration evidence.

Declared tags such as `ghost`, `pulse`, `recursive`, `lyric`, or `transition` remain separate metadata.

No `haunted=true` or similar vibe tag may directly become candidate/render authority.

Behavioral indexing is outside the first crucible except for values already trivial to derive from the HyperFood receipt.

## 14. Determinism levels

HyperFood refuses the ambiguous boolean `deterministic: true`.

Receipts distinguish:

1. **Spec deterministic** — identical canonical semantic inputs resolve to the same `specimen_id`.
2. **Timeline deterministic** — requested witness times resolve to identical organism transform traces.
3. **Pixel deterministic** — the same pinned render environment produces identical decoded pixels.
4. **Byte deterministic** — the encoded output file hashes identically.

The first crucible requires levels 1 and 2. Pixel and byte determinism are measured and reported when tested; they are never inferred from semantic determinism.

HyperFrames Docker rendering may later provide the stricter environment for byte-level replay proof.

## 15. Refusal and recovery behavior

HyperFood v0 must refuse clearly when:

- the schema/organism version is unsupported;
- required asset bytes are unavailable or digest/length mismatched;
- a font is unpinned for verified `GHOST-TEXT`;
- timing is negative, non-finite, outside duration, or violates organism bounds;
- an event/cue/parameter uses an unsupported type/value;
- graph ports are incompatible;
- graph nodes/edges are duplicated or unresolved;
- a graph contains a cycle;
- the requested output surface is ambiguous or absent;
- renderer/adapter capability cannot satisfy alpha/target requirements;
- a renderer introduces unseeded randomness or ambient time into semantic behavior;
- mutation delta reconstruction does not match the child specimen ID.

A failed adapter/render must not mutate canonical specs or pantry state.

## 16. First crucible

The first experiment deliberately uses a tiny fixed input set:

- one still image with pinned bytes;
- one pinned font asset;
- one lyric fragment;
- one manually supplied event grid;
- one 4.2-second target duration;
- 1080x1920 at 30 fps as the primary target.

It creates:

```text
PULSE               -> baseline + 4 bounded mutations
GHOST-TEXT          -> baseline + 4 bounded mutations
FRAME-EAT-FRAME     -> baseline + 4 bounded mutations
```

The HyperFrames adapter renders MP4 for every specimen and transparent WebM where meaningful. It writes a HyperFood receipt for every successful render.

No generated-video API is called. No production song-render path changes. No UI is added.

## 17. Crucible proof gates

### REPLAY

Render the identical specimen twice in the same declared HyperFrames environment.

Required proof:

- same `specimen_id`;
- same canonical transform trace;
- report output byte equality/hash result without assuming it.

### DELTA

Change exactly one semantic parameter.

Required proof:

- new child `specimen_id`;
- explicit one-field mutation delta;
- reconstruction from parent + delta hashes to the child ID;
- unchanged semantic fields remain equal.

### COMPOSITION

Compose at least:

```text
GHOST-TEXT -> PULSE
```

Required proof:

- graph validates;
- both organism lineages remain present;
- PULSE consumes the upstream surface without renderer-specific special casing in the HyperFood graph contract.

### PORTABILITY

Render/trace one fixed `PULSE@0.1.0` specimen through HyperFrames and Remotion.

Required proof:

- one shared `specimen_id`;
- distinct adapter/render IDs;
- equal canonical transform traces at the declared witness timestamps;
- pixel/byte equality explicitly out of scope across adapters.

### REFUSAL

Fixture tests must prove loud failure for at least:

- missing/mismatched asset;
- invalid event time;
- unsupported parameter;
- cyclic graph;
- unpinned Ghost Text font;
- invalid mutation reconstruction.

## 18. Implementation decomposition

The work is intentionally split into four reviewable slices.

### Slice A — HyperFood ABI + canonical identity

No renderer integration.

Deliverables:

- schema validation;
- organism registry metadata for the first three organisms;
- canonical specimen identity using existing Haunted Toaster canonicalization;
- typed DAG validation;
- mutation delta/reconstruction contract;
- pure transform-trace evaluators where practical;
- fixtures/tests for identity, graph refusal, and mutation law.

Proposed code boundary:

```text
src/full-measure/src/hyperfood/
```

### Slice B — HyperFrames reference adapter + crucible

Tooling/material-production only; no song-render semantics.

Deliverables:

- HyperFrames project/scaffold isolated under a tooling/experimental boundary;
- adapters for `PULSE`, `GHOST-TEXT`, `FRAME-EAT-FRAME`;
- pinned visual identity for the crucible composition;
- lint + inspect + render path;
- HyperFood receipt writer;
- baseline + four mutations per organism;
- MP4 / alpha WebM outputs as appropriate.

The adapter may depend on HyperFrames tooling but the core `src/hyperfood/` ABI must not.

### Slice C — Remotion PULSE portability witness

Deliverables:

- minimal Remotion adapter for `PULSE@0.1.0` only;
- canonical transform trace at shared witness times;
- test proving same specimen identity and semantic trace across HyperFrames/Remotion;
- no requirement for equal pixels/bytes.

### Slice D — VSPantry admission bridge

Only after the crucible proves the material boundary.

Deliverables:

- explicit command/API to admit a completed HyperFood render through existing VSPantry admission;
- provenance link from pantry observation/evidence to HyperFood receipt without changing pantry content identity;
- idempotent re-admission proof;
- no candidate/timeline authority widening.

## 19. Non-goals for v0

HyperFood v0 does not:

- replace Haunted Toaster's production renderer;
- change `VisualScore` or `ResolvedTimeline` authority;
- add a UI;
- automatically select HyperFood clips for songs;
- introduce a learned preference/taste model;
- analyze raw audio inside PULSE;
- perform true framebuffer feedback;
- require cloud rendering;
- merge HyperFood identity into VSPantry content identity;
- claim cross-renderer pixel equality;
- modify ToastPack/HDToastPack analysis contracts;
- decide artistic meaning from behavioral descriptors;
- automatically project HyperFood receipts into Dogram.

## 20. Success criterion

HyperFood v0 is successful when one fixed source field can produce a reproducible family of short motion specimens whose instruction identity, mutation delta, lineage, adapter, environment, and output bytes are inspectable; when at least one PULSE specimen preserves its organism-level transform trace across HyperFrames and Remotion; and when those resulting clips can later enter VSPantry without weakening existing Toaster authority or content-identity laws.

The desired proof is not "HyperFrames can make a cool video."

It is:

> **The Haunted Toaster can preserve and breed renderer-independent temporal behavior as witnessed material.**

## 21. Design disposition

This design adds no runtime behavior by itself.

```text
UI impact: none
browser witness: not-required
visual delta: none
packaged witness required: no
packaged witness: not-required
GitBook ontology changed: no
```

Implementation must not begin until this written design has been reviewed and explicitly approved.