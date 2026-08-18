# Video Source, VSPantry, ToastPacks, and Receipt-Backed Toaster Memory — Design

**Date:** 2026-08-17

**Status:** Design for review

**Project:** The Haunted Toaster

**Related:** #44 foreign visual material; #148 beta living creative playground; #147 Toastmood-driven six-up + CROSS

## 1. Purpose

The Haunted Toaster should treat local video as a first-class source field beside song, image, and lyrics, while preserving the existing authority boundary in which accepted `VisualScore → ResolvedTimeline → shared renderer` state determines what is rendered.

The goal is larger than one imported clip. A persistent local visual pantry should let the Toaster accumulate hundreds of short generated video specimens, digest them into reusable expansion packs, remember what it has actually done with them through durable receipts, and use that witnessed history to make future composition and diversity more developmental and consistent.

The governing idea is:

```text
Video
  ↓
VSPantry
  ↓
ToastPack / HDToastPack
  ↓
accepted candidate/timeline use
  ↓
render receipt
  ↓
Toaster receipt archive
  ↓
Toaster Memory
  ↓
future composition and diversity pressure
```

This is not an NLE, a second editing timeline, or a mechanism for imported footage to become render authority.

## 2. Core terms

### Video

`Video` is a first-class source field alongside `Song`, `Image`, and `Lyrics`.

Each source contributes a different kind of evidence:

```text
Song    → temporal and musical evidence
Image   → chromatic and spatial evidence
Lyrics  → semantic and language evidence
Video   → temporal and visual evidence
```

A session may contain any supported subset. Adding a video should default to offering durable admission into VSPantry, with a human-visible checkbox enabled by default: **Add to VSPantry**. The user may uncheck it for one-session use.

Video is input evidence/material. It does not independently schedule itself, create a second timeline, or bypass candidate acceptance.

### VSPantry

`VSPantry` is one persistent local pantry belonging to the Toaster installation/user, shared across songs and sessions.

It answers: **What video specimens does this Toaster have access to?**

It contains or addresses admitted source specimens and their stable identity/probe metadata. Filesystem order, filenames, import order, and OS enumeration order must not create semantic differences. Canonical catalogue order must be derived from stable specimen identity.

Minimum specimen identity/probe evidence:

- raw-byte SHA-256;
- byte length;
- source filename as non-authoritative display metadata;
- duration;
- width and height;
- frame rate or rational rate evidence;
- container;
- video codec;
- audio-presence metadata if present;
- admission timestamp as historical metadata, never as generation authority;
- analysis state/version.

The pantry is local-first. No online video service is required for use or replay.

### ToastPack

A `ToastPack` is not a folder of videos. It is a **pre-read, mapped, integrated visual expansion pack** produced from VSPantry specimens.

A pack manifest addresses a stable set of specimen identities and records deterministic analysis sufficient for generation-time search and lawful renderer compilation.

Useful analysis dimensions may include:

- luminance envelope;
- representative palette/chromatic behavior;
- edge density;
- motion magnitude or deterministic motion proxy;
- scene-change/frame-difference events;
- representative frame timestamps;
- negative-space/occupancy proxies where deterministic and cheap;
- coarse temporal texture descriptors;
- topology/material/motion affinity evidence derived by versioned policy.

ToastPack analysis must be versioned and hashable. The same specimen bytes under the same analysis policy/version must yield the same analysis result.

### HDToastPack

`HDToastPack` uses the same conceptual contract as ToastPack but represents material intended for higher-fidelity or flagship use: longer clips, higher spatial/temporal detail, and richer precomputation where justified.

It is a capability/fidelity tier, not a separate authority system.

A normal ToastPack and an HDToastPack may share manifest vocabulary. HD-only fields must be explicitly versioned and ignorable by consumers that do not need them.

### Toaster Memory

`Toaster Memory` is a derived local memory projection over durable witnessed history.

The memory substrate is the Toaster’s own local archive/index of render/session sidecar receipts. The original sidecar beside an output remains the authoritative receipt for that artifact; the Toaster stores or indexes a durable local copy for catalogue traversal and memory reconstruction.

Memory grows because things actually happened.

Memory must not become an opaque preference model and must never be the sole record of history. If derived memory state is deleted, it should be reconstructable from the durable receipt archive plus pantry/pack evidence to the degree those receipts record the necessary facts.

## 3. Constitutional separation

The system must preserve these distinct questions:

```text
VSPantry
= what video specimens exist and are admitted

ToastPack / HDToastPack
= what has been deterministically understood and prepared

Toaster Receipt Archive
= what witnessed sessions/renders actually happened

Toaster Memory
= what developmental state can be derived from that history

Candidate generation
= what may happen next

Accepted ResolvedTimeline
= what actually will happen in this render
```

Memory may influence candidate search, coverage, novelty pressure, and diversity. Memory does not rewrite historical specimen analysis or secretly mutate an accepted timeline.

## 4. Data flow

### 4.1 Add Video

```text
human chooses local video
        ↓
validate supported local file
        ↓
probe + raw SHA-256 + byte length
        ↓
current-session Video source binding
        ↓
[default checked] Add to VSPantry?
       ↙                      ↘
     yes                      no
      ↓                        ↓
durable pantry admission   ephemeral session binding
```

The session path must work even when pantry persistence is disabled for that import.

Unsupported/unreadable inputs fail clearly and do not partially enter the pantry.

### 4.2 Pantry admission

A pantry admission is idempotent by specimen content identity. Re-adding identical bytes must not create a semantically new specimen merely because the filename or path changed.

The catalogue should separate:

- content identity;
- current/recent local path observations;
- display metadata;
- deterministic probe evidence;
- deterministic analysis evidence;
- pack membership.

This permits path repair without rewriting specimen identity.

### 4.3 Pack digestion

Large harvests should use two-stage digestion.

**Stage A — cheap intake for every specimen**

- SHA-256;
- byte length;
- ffprobe-derived metadata;
- deterministic catalogue identity;
- optional bounded representative-frame fingerprint if cheap enough.

**Stage B — deeper deterministic analysis**

Performed lazily or explicitly in pack-building work, not as a blocking requirement for admitting hundreds of clips.

This prevents a 200–500 clip import from becoming an expensive synchronous analysis wall.

### 4.4 Candidate use

Candidate generation may query pack/pantry evidence and Toaster Memory to choose a lawful diversity set. It must not depend on unstable filesystem enumeration or ambient randomness.

A future six-up may, for example, deliberately span different specimens or visual neighborhoods when sufficient material exists.

Any specimen selected for an accepted candidate must be concretely receipt-bound by content identity and analysis/policy hashes.

### 4.5 Render use

Imported video material remains subordinate to accepted timeline authority:

```text
selected specimen(s)
     +
recorded specimen analysis
     +
accepted VisualScore
     +
accepted ResolvedTimeline
     +
renderer profile
        ↓
versioned foreign-material compilation
        ↓
shared preview / production semantics
        ↓
receipt
```

No direct “play this clip here because it exists” path is permitted.

## 5. Receipt archive and memory

### 5.1 Receipt archival law

Every completed render/session receipt that contributes to developmental memory should be copied or indexed into a persistent local Toaster receipt archive.

The archive entry should preserve the canonical receipt bytes or canonical receipt object identity whenever possible. Derived catalogue records may point to them but must not silently alter them.

Minimum memory-relevant evidence should include, where applicable:

- source song identity/hash;
- source image identity/hash;
- source video specimen SHA-256 identities;
- ToastPack / HDToastPack manifest identity/version;
- VisualScore identity;
- ResolvedTimeline identity;
- candidate family identity;
- accepted candidate lineage;
- generation seed/policy identities;
- Toastmood/field evidence already accepted by current architecture;
- operators/topology/material/motion/camera evidence recorded by the renderer;
- foreign visual assimilation policy and sampling plan;
- renderer profile identity;
- output hash and byte length;
- terminal status/failure evidence where current receipt law supports it.

### 5.2 Derived developmental memory

Memory may derive reproducible summaries such as:

- specimen usage counts and recency;
- visual neighborhood coverage;
- topology/material/motion combinations previously explored;
- accepted lineage density;
- underrepresented pantry/pack regions;
- repeated source-to-operator pairings;
- candidate/accepted history where receipts expose it;
- novelty distance from recent accepted work;
- pack coverage and starvation.

The first implementation should prefer simple, inspectable counters/histograms/sets over learned embeddings or opaque taste scores.

### 5.3 Memory influence law

Memory is advisory/search pressure, not authority.

Example:

```text
receipts say recent accepted work heavily used
  fluid motion + dense blue + echo-tunnel neighborhood

pantry says several admitted specimens occupy
  sparse warm low-motion + hard interruption neighborhoods

candidate generation may increase coverage pressure
  toward the underexplored regions
```

That pressure must still produce ordinary candidates that cross the existing acceptance boundary before rendering.

## 6. Pack manifests

Pack manifests should be canonical, hash-addressable, and portable independently of the original source filenames.

A conceptual shape:

```json
{
  "schema": "haunted-toaster/toast-pack/v1",
  "packId": "sha256:...",
  "analysisPolicy": "toast-pack-analysis/v1",
  "specimens": [
    {
      "sourceSha256": "...",
      "byteLength": 123,
      "probeHash": "...",
      "analysisHash": "..."
    }
  ]
}
```

The exact implementation schema is deferred to the implementation plan, but these laws are not:

- specimen identity is content-based;
- manifest ordering is canonical;
- analysis policy is explicit/versioned;
- manifest identity changes when meaningful pack evidence changes;
- filenames and import order do not affect pack identity.

HDToastPack should extend capability without creating a parallel incompatible concept.

## 7. Foreign material v1

The first renderer-facing assimilation primitive remains one deliberately narrow operator, provisionally `foreign-material-v1`.

Its purpose is to make a Flow/generated clip behave as foreign visual DNA eaten by Haunted Toaster, not as stock footage inserted behind the output.

The operator may use deterministic time-remapping, sampling, texture contribution, displacement, chromatic matter, or deformation, but v1 should prove one bounded visual metabolism rather than six unrelated effects.

The result should remain subject to existing topology/material/response/atmosphere/camera laws where compatible.

### Renderer trust gate

Renderer-facing foreign-video work must not be mixed into the current renderer repair/stabilization stack. The pantry/catalogue/receipt-memory foundation may proceed independently because it does not change render semantics.

`foreign-material-v1`, preview/final FFmpeg wiring, and renderer receipt evidence wait until the renderer trust line is settled.

## 8. Shared media input plan prerequisite

Current preview and production rendering independently construct FFmpeg input indexes. Foreign video would make that duplication dangerous.

Before foreign-material compilation lands, preview and production must consume one deterministic shared media-input plan that assigns logical roles rather than hard-coded ad hoc indexes.

Conceptually:

```text
audio                → logical input audio
procedural garment   → logical input garment
optional user image  → logical input image
foreign specimen A   → logical input foreign:<sha256>
```

The compiler may turn logical roles into FFmpeg indexes, but preview and final render must use the same plan and semantics.

This prerequisite belongs to the renderer-facing slice, not pantry admission.

## 9. VisualScore and timeline authority

Do not add clip identity as a canonical VisualScore v1 axis merely to prove ingestion.

Foreign visual identity/evidence belongs in accepted derivation/timeline evidence and receipts until repeated field evidence proves a first-class canonical score axis is warranted.

A conceptual accepted-timeline extension:

```text
foreignVisual:
  catalogHash
  specimenSha256
  analysisHash
  packManifestHash
  policy: foreign-material-v1
  samplingPlanHash
  placementEvidence
```

The exact field names may evolve, but accepted foreign-material evidence must be included in the deterministic identity that governs replay.

## 10. Beta ecology integration

The long-term value is not merely imported footage. Pantry + packs + memory become an external gene pool for the beta creative ecology.

Examples:

- initial six-up can draw from different lawful specimen neighborhoods;
- CROSS can inherit a foreign specimen/material lineage from one parent without averaging entire candidates;
- MOLT can preserve a specimen while changing how the Toaster metabolizes it;
- HAUNT can allow discarded/ancestral visual material to leave lawful residue without becoming ambient render authority;
- memory can increase pressure toward underexplored regions without forcing novelty for novelty’s sake.

This is downstream of the candidate ecology law in #148/#147. The accepted winner still crosses the existing canonical render boundary.

## 11. Local state shape

A conceptual local Toaster home:

```text
TOASTER_HOME/
├── VSPantry/
│   ├── specimens/         # admitted/addressed video material or managed references
│   └── catalog/           # canonical specimen/probe/analysis indexes
├── ToastPacks/
│   ├── standard/
│   └── hd/
├── Receipts/
│   └── archive/           # durable local copies/indexed canonical receipts
└── Memory/
    ├── receipt-index/
    ├── encounter-history/
    └── derived-state/
```

The exact disk layout is an implementation concern. The semantic separation is required.

## 12. Error and recovery behavior

- Failed probe/hash/admission must not create a valid pantry specimen.
- Identical content re-import is idempotent.
- Missing original paths should surface as repairable path/material availability problems, not silently create new identities.
- Pack analysis failure for one specimen should not invalidate unrelated admitted specimens; the pack build should report bounded per-specimen failure evidence.
- Corrupt derived memory state should be rebuildable from receipt archive and source catalogues where sufficient evidence exists.
- Missing/corrupt archived receipts must be reported explicitly; memory must not invent history.
- Ephemeral video sessions must remain possible when **Add to VSPantry** is unchecked.
- Removing/omitting Video must preserve the ordinary renderer path without changing unrelated score/timeline authority.

## 13. Testing laws

### Pantry

Prove:

- same bytes at different paths collapse to one content identity;
- same files imported in different OS/filesystem orders produce the same canonical catalogue;
- unsupported/unreadable video refuses cleanly;
- admission can be repeated idempotently;
- ephemeral session video does not persist when pantry checkbox is disabled.

### Pack analysis

Prove:

- same specimen + same policy/version → identical analysis hash;
- canonical manifest identity is independent of filename/import order;
- lazy analysis does not change already-established specimen identity;
- partial analysis failure is explicit and bounded.

### Receipt archive / memory

Prove:

- canonical sidecar evidence is archived/indexed without semantic mutation;
- repeated indexing is idempotent;
- derived memory can be rebuilt from archive fixtures;
- deleting derived memory and rebuilding yields the same developmental summary;
- memory influences candidate search inputs only through explicit versioned policy;
- memory cannot directly mutate an accepted timeline.

### Renderer-facing foreign material

After renderer trust gate:

- preview and final use the same shared media-input plan;
- same clip bytes + analysis + accepted timeline + renderer profile replay identically;
- one short clip lawfully contributes beyond its literal duration through recorded sampling/time-remapping;
- removing the clip restores normal renderer semantics;
- receipt records specimen identity, analysis identity, policy, sampling/placement evidence, and compiled operator evidence.

## 14. Decomposition into executable slices

This architecture spans multiple subsystems and must be implemented as separate reviewable slices.

### Slice A — Persistent Video Source + VSPantry

Safe to build before renderer trust settles.

Deliverables:

- Video source field in local session state/UI;
- **Add to VSPantry** default-on control;
- bounded MP4/WebM admission;
- hashing/probing;
- persistent idempotent catalogue;
- deterministic canonical ordering;
- cheap bulk intake suitable for hundreds of Flow clips;
- no renderer semantic change.

### Slice B — Receipt Archive + Toaster Memory v1

Safe to build before renderer trust settles if it only consumes existing receipts.

Deliverables:

- persistent local receipt archive/index;
- idempotent ingestion of existing/new sidecars;
- rebuildable memory projection;
- first inspectable developmental summaries: recent-use, coverage, underexplored neighborhoods where current receipt evidence supports them;
- no opaque taste model;
- no direct render authority.

### Slice C — ToastPack / HDToastPack

Safe to build before renderer trust settles if analysis remains offline/preparatory.

Deliverables:

- versioned deterministic analysis contract;
- lazy analysis worker/path;
- canonical ToastPack manifest;
- HD capability tier under the same contract;
- pack identity and pack coverage evidence;
- candidate-query interface, but no renderer foreign-material execution yet.

### Slice D — Shared Media Input Plan + `foreign-material-v1`

Blocked on renderer trust/stabilization.

Deliverables:

- shared logical media-input plan for preview and production;
- one deterministic foreign-material operator;
- accepted timeline foreign visual evidence;
- preview/final parity;
- receipt evidence and replay proof.

### Slice E — Population Feeding / Beta Ecology

Depends on candidate ecology and sufficient pantry/pack evidence.

Deliverables:

- deterministic pantry/pack sampler for six-up coverage;
- memory-derived diversity pressure;
- later typed integration with CROSS/MOLT/HAUNT lineage;
- no hidden randomness and no second authority path.

## 15. Non-goals

- no multitrack NLE;
- no arbitrary drag/drop edit timeline;
- no online generation API dependency;
- no direct AI-video execution inside renderer;
- no semantic computer-vision model requirement for v1;
- no opaque learned preference model for Toaster Memory;
- no mutation of historical analysis because memory develops a preference;
- no premature VisualScore v1 schema expansion;
- no renderer-facing work stacked onto the current trust-repair PR chain;
- no requirement to deeply analyze hundreds of clips synchronously at import time.

## 16. Success state

The architecture is successful when a user can build one persistent local visual pantry from hundreds of short Flow/generated clips; convert subsets into deterministic, portable ToastPacks; optionally use higher-fidelity HDToastPacks; add Video as naturally as Song/Image/Lyrics; archive render receipts inside the Toaster; rebuild developmental memory from witnessed history; and eventually let that memory exert explicit diversity/compositional pressure over six-up generation without bypassing acceptance or renderer authority.

The Toaster should become more compositionally developed because it has accumulated lawful experience, not because an opaque model silently changed its tastes.

**The Toaster remembers because things actually happened.**
