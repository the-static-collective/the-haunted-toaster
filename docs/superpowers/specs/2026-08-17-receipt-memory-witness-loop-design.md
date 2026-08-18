# Receipt Memory + Witness Loop — Design

**Date:** 2026-08-17

**Status:** Design for review

**Project:** The Haunted Toaster

**Parent architecture:** `docs/superpowers/specs/2026-08-17-video-source-pantry-toastpacks-memory-design.md`, Slice B

## 1. Purpose

Slice B turns the Toaster's durable render receipts into an inspectable developmental memory that can affect future candidate search and witness disposition without ever rewriting historical receipts or accepted render authority.

The loop is:

```text
prior receipts
    ↓
Toaster receipt archive
    ↓
rebuildable memory projection
    ↙                    ↘
future generation pressure   witness disposition
    ↓                            ↓
current six-up             current Witness Window
    ↓                            ↓
accepted candidate ─────────→ rendered encounter
    ↓                            ↓
render receipt             witness evidence
          ↘                ↙
           human verdict
                ↓
       new memory projection
                ↓
            next toast
```

The core law is:

> Memory may change what the Toaster is inclined to try and what the witness is inclined to notice. Neither may change what actually happened.

## 2. Existing authority seam

Current score-driven rendering already produces an immutable successful `full-measure.video-receipt.v1` after output validation. That receipt includes:

- title and artist treatment metadata;
- source song hash and byte evidence;
- VisualScore address and ResolvedTimeline hash;
- Toast Feel and Native Color evidence where present;
- Witness Window evidence;
- compiled visual/operator evidence;
- output hash, byte length, duration, streams, and subtitle sidecars;
- accepted validation state.

`renderVideo()` returns the receipt object and `receiptPath` to Electron main after the canonical sidecar has been written.

Current `witness-window-v1` is deliberately narrow: it applies the final output projection and records immutable output-boundary evidence such as dimensions, sample aspect ratio, pixel format, alpha policy, and observable stream count.

Slice B must therefore attach around the successful render boundary and future generation boundary. It must not alter the meaning of the historical render receipt or turn the Witness Window into a second renderer.

## 3. Constitutional separation

The following objects remain distinct:

```text
Render Receipt
= what the completed render attests happened

Human Verdict Receipt
= what a human later said about that render

Witness Encounter Receipt
= what the Toaster's declared witness policy observed or carried during an encounter

Receipt Archive
= durable local history preserving those independent records

Memory Projection
= rebuildable developmental interpretation of archived history

Influence Trace
= inspectable evidence of how memory/current evidence pressured a proposal

Accepted ResolvedTimeline
= what the renderer is authorized to execute
```

No later rating, witness observation, memory summary, or influence trace may mutate an existing render receipt.

Similarity, popularity, recency, and rating are never render authority.

## 4. Local archive

The Toaster maintains one persistent local receipt archive under its application-owned local data root.

Conceptually:

```text
TOASTER_HOME/
└── Receipts/
    ├── render/
    ├── verdict/
    ├── witness/
    └── index/

TOASTER_HOME/
└── Memory/
    ├── projection/
    └── influence-traces/
```

Exact disk layout is an implementation concern. Required semantics are:

- render sidecars remain authoritative for their output artifact;
- archive ingestion is idempotent;
- canonical receipt bytes or canonical parsed identity are preserved without silent mutation;
- derived indexes may be deleted and rebuilt;
- missing/corrupt receipts are surfaced explicitly rather than invented around;
- filesystem enumeration order must not affect semantic projection results.

## 5. Past Toasts

The renderer UI gains a bounded **Past Toasts** surface backed by the archive/index.

Each toast row/card represents one witnessed render encounter, not merely an MP4 file.

Minimum display fields:

- song/title;
- render date/time as historical display metadata;
- compact visual identity where the receipt exposes it, such as topology / structure / dynamics / Toast Feel;
- human rating/verdict state if one exists;
- links/actions for available video, receipt, score, timeline, subtitles, and other sidecars;
- missing-material state where a referenced artifact is unavailable.

Past Toasts must work from archive records even when the original output folder is no longer the current working folder. It must not pretend missing source/video files still exist.

### Replay vs Re-toast

These are deliberately different actions.

**Replay** means: attempt exact return from the historical accepted execution evidence where sufficient source/material dependencies remain available. Replay never reuses the old execution receipt as proof of a new execution; a successful replay emits a new render receipt.

**Re-toast** means: use the selected historical toast as explicit ancestry for fresh candidate generation. It does not promise exact return. It feeds a bounded historical memory capsule into the normal six-up search path and the new candidates still cross ordinary acceptance before rendering.

For initial BETA implementation, **Re-toast is required**. Exact Replay may be exposed only when existing exact-return dependencies are honestly resolvable; otherwise the UI must refuse or mark it unavailable rather than emulate exactness.

## 6. Human Verdict Receipts

Human judgment is append-only testimony attached to a render receipt, never a field edited into the render receipt itself.

A conceptual record:

```json
{
  "schema": "haunted-toaster/human-verdict/v1",
  "verdictId": "uuid",
  "createdAt": "2026-08-17T...Z",
  "renderReceiptIdentity": "sha256:...",
  "rating": 4,
  "disposition": "keep",
  "wouldReToast": true,
  "signals": {
    "composition": 1,
    "movement": 1,
    "topology": 0,
    "color": 1,
    "surprise": 1,
    "coherence": 0
  }
}
```

Required BETA interaction:

- 1–5 overall rating;
- one optional disposition: `keep`, `weird`, or `compost`;
- optional `wouldReToast` boolean.

The finer-grained signal fields may exist in the schema/UI only if they remain low-friction. They are not required to prove Slice B.

A later verdict does not overwrite an earlier verdict. If the human changes their mind, create a new verdict event and project the latest applicable human state while preserving prior testimony.

## 7. Witness Encounter + Witness Disposition

Slice B does not redefine the existing render Witness Window. Instead it adds a declared **witness disposition** input to the compositional/witness loop.

Witness disposition is a non-sovereign, versioned projection of relevant memory such as:

- fixation toward a previously unresolved geometry;
- color residue from recent accepted work;
- fatigue/saturation around overused neighborhoods;
- heightened attention toward underexplored relationships;
- scar/echo pressure from a strongly witnessed previous encounter.

The disposition may affect future proposal/witness policy where an explicit consumer exists. It may never mutate an already accepted `ResolvedTimeline` or falsify the immutable output-boundary evidence recorded by `witness-window-v1`.

When witness disposition meaningfully affects a proposal or encounter, that fact must be captured in a separate witness/influence receipt so the effect is inspectable.

Current-song evidence remains primary over long-term memory.

## 8. Memory Projection v1

The first memory implementation is intentionally transparent and non-ML.

It derives stable, versioned summaries from archived receipts and verdicts using counters, sets, recency windows, relationship weights, and bounded decay.

Useful v1 fields include:

- recent accepted topology/material/motion neighborhoods;
- usage counts by stable visual identity exposed by receipts;
- accepted candidate lineage counts where receipts expose lineage;
- recent Toast Feel distribution;
- human verdict distribution;
- repeat saturation pressure;
- underexplored neighborhood pressure;
- positively reinforced relationships between current-song classes and visual relationships where evidence is attributable;
- negative/counterexample relationships where low ratings or compost verdicts recur;
- re-toast ancestry frequency.

### Rating is not a popularity multiplier

A high rating must strengthen attributable relationships, not simply increase repetition of all ingredients from that toast.

Example:

```text
compressed / violent song evidence
+ cathedral-fan ancestry
+ strong recoil after saturation
+ warm native-color return
+ high human verdict
→ strengthen this relationship capsule
```

The memory policy should also include anti-collapse pressure. Repeated highly rated use of one neighborhood eventually increases saturation/coverage pressure away from it so memory does not become a preset engine.

### Rebuildability

Given the same canonical archive contents and memory policy version, rebuilding derived memory must produce the same semantic projection regardless of directory enumeration order.

Deleting `Memory/` must not delete history.

## 9. Memory Capsule

Candidate generation never receives the entire archive as ambient omniscience.

A versioned selector derives a bounded `MemoryCapsule` for the current song/session from:

- current song analysis/evidence;
- recent receipt history;
- relevant human verdicts;
- explicit re-toast ancestry if selected;
- current coverage/saturation state.

Conceptual shape:

```json
{
  "policy": "toaster-memory-capsule-v1",
  "archiveCut": "sha256:...",
  "currentSongEvidenceHash": "sha256:...",
  "explicitAncestorReceipt": "sha256:...",
  "pressures": [
    {
      "kind": "underexplored",
      "target": "topology:split-horizon",
      "weight": 0.31,
      "evidenceRefs": ["receipt:...", "verdict:..."]
    }
  ],
  "capsuleSha256": "sha256:..."
}
```

The capsule is proposal evidence only. A candidate generated under one capsule must remain replayable from its accepted generation evidence. Memory cannot silently re-query itself later and change that candidate.

## 10. Influence Trace

Whenever memory pressure contributes to candidate generation, the Toaster records an inspectable **Influence Trace**.

This is not a claim to expose private model chain-of-thought. It is an explicit machine-generated causal/provenance graph built from recorded inputs and policy decisions.

Allowed node classes include:

- current song evidence;
- current section/recurrence evidence where already authoritative;
- prior render receipts;
- human verdict receipts;
- visual identities/relationships;
- memory pressure nodes;
- explicit re-toast ancestor;
- generated candidate identity.

Allowed edge semantics include:

- `recalled`;
- `favored`;
- `inhibited`;
- `underexplored`;
- `saturated`;
- `inherited`;
- `counterexampled`;
- `witnessed`.

Every durable edge must be recoverable from explicit archive/current-session evidence and a versioned policy. Decorative UI edges may animate, but they may not masquerade as causal evidence.

## 11. Synapse / Thoughtline UI

The renderer gains an optional visual projection of the current Influence Trace.

Working UI name: **Thoughtline**. Internal data name: **Influence Trace**.

The visualization may resemble synapses because Toaster topology already produces that visual language, but the UI must remain evidence-backed rather than implying literal consciousness.

Behavior:

- nodes represent actual trace entities;
- edges represent actual trace relations;
- current/provisional candidate influences may be visually lighter than durable archived relationships;
- selecting a node/edge reveals compact evidence provenance;
- the view can be hidden without changing generation semantics;
- reduced-motion mode disables nonessential animation;
- the graph must remain usable when only a few nodes exist and must degrade to a summarized/bounded view when history is large.

The first BETA version should cap the visible trace to a small current capsule/lineage graph rather than rendering the entire lifetime archive.

## 12. Data flow

### Successful new toast

```text
renderVideo()
   ↓ successful validated receipt
canonical output sidecar
   ↓
archive render receipt idempotently
   ↓
Past Toasts index refresh
   ↓
optional human verdict
   ↓
append verdict receipt
   ↓
rebuild/update deterministic memory projection
```

### Fresh six-up

```text
current song analysis
+ optional explicit re-toast ancestor
+ deterministic archive cut
        ↓
derive MemoryCapsule
        ↓
versioned memory influence policy
        ↓
candidate-session generation inputs
        ↓
six-up candidates + Influence Trace
        ↓
human acceptance
        ↓
existing VisualScore → ResolvedTimeline authority
```

### Witness feedback

```text
MemoryCapsule
   ↓
optional witness disposition
   ↓
current encounter observations / trace evidence
   ↓
separate witness receipt
   ↓
future memory projection
```

## 13. IPC and process boundary

Persistent archive/memory filesystem access belongs in Electron main or dedicated main-process modules, not sandboxed renderer code.

Renderer-facing bridge methods should be narrow, structured, and path-safe.

Conceptual bridge capabilities:

- list past toasts;
- fetch one toast detail/provenance summary;
- open/reveal an already-validated archived/output artifact;
- submit a human verdict;
- request re-toast ancestry for the next candidate session;
- fetch current Influence Trace.

The renderer must never receive arbitrary filesystem traversal authority through this feature.

## 14. Failure and recovery

- Archive ingest failure after a successful render must not invalidate the already-valid render receipt/output; surface archive failure separately.
- A corrupt archive entry must be quarantined/refused from projection and reported.
- Duplicate receipt ingestion is idempotent.
- A verdict referencing an unknown render receipt is refused.
- A missing original video/output path remains a historical toast with unavailable-media state.
- Derived memory corruption is repaired by deterministic rebuild from valid archive entries.
- Unknown schema versions are preserved where possible but excluded from projection until a declared reader exists.
- Re-toast with missing required ancestry evidence refuses clearly rather than silently substituting another toast.
- Thoughtline failure is non-fatal and must not block candidate generation or render.

## 15. Privacy / local-first law

Slice B is local-first. Receipt history, ratings, memory projections, and influence traces remain on the local Toaster unless a separate explicit export/share action is later designed.

No cloud preference profile is required.

## 16. Testing laws

### Archive

Prove:

- identical receipt bytes/index identity ingest idempotently;
- archive projection ordering is deterministic across filesystem orders;
- successful output receipt remains valid if archive copy/index later fails;
- corrupt receipt is excluded and reported;
- missing media does not erase historical metadata.

### Verdicts

Prove:

- verdict appends without changing render receipt bytes;
- 1–5 rating bounds are enforced;
- unknown receipt refs are refused;
- changed rating creates a new verdict event;
- projection chooses the latest applicable verdict while prior events remain queryable.

### Memory

Prove:

- delete derived memory → rebuild → same projection hash;
- same archive cut + policy → same capsule hash;
- high ratings strengthen attributable relationships without becoming mandatory candidate presets;
- repeated use increases saturation/coverage pressure;
- memory influences generation only through explicit capsule/policy input;
- memory cannot directly mutate accepted VisualScore/ResolvedTimeline state.

### Re-toast

Prove:

- selected historical toast becomes explicit ancestry evidence;
- re-toast creates a fresh candidate family rather than replaying old accepted state;
- ancestry identity is visible in candidate/influence evidence;
- missing/invalid ancestor refuses cleanly.

### Influence Trace / Thoughtline

Prove:

- every durable edge points to explicit evidence refs;
- trace identity is deterministic for the same capsule/candidate inputs;
- hiding Thoughtline changes no candidate data;
- reduced-motion mode prevents nonessential animation;
- bounded graph size prevents lifetime-history UI blowout.

### UI witness

Add canonical browser witness states for:

- Past Toasts empty;
- Past Toasts populated;
- toast detail + receipt access;
- verdict/rating interaction;
- re-toast armed state;
- Thoughtline compact graph;
- missing-media toast state.

Packaged Electron witness remains required for real filesystem/archive bridge behavior.

## 17. BETA scope

Required for Slice B completion:

1. persistent render receipt archive/index;
2. Past Toasts UI with song title and receipt/sidecar access;
3. append-only 1–5 Human Verdict Receipt plus `keep|weird|compost` and optional re-toast flag;
4. deterministic rebuildable Memory Projection v1;
5. bounded MemoryCapsule input to candidate generation;
6. explicit Re-toast ancestry path;
7. deterministic Influence Trace;
8. compact Thoughtline visualization backed by that trace;
9. memory-to-witness disposition seam that is recorded but cannot alter historical truth or accepted timeline authority;
10. UI/browser + packaged filesystem witness.

Explicitly deferred:

- embeddings / vector memory;
- learned opaque preference models;
- cloud sync;
- social/shared ratings;
- whole-lifetime graph rendering;
- automatic semantic labeling not supported by existing receipt evidence;
- exact Replay unless dependency identity/restoration can be proved honestly;
- memory-driven mutation after candidate acceptance.

## 18. Success state

Slice B is successful when the Toaster can answer four questions from inspectable local evidence:

1. **What have I toasted before?** — Past Toasts + canonical receipts.
2. **What did the human think of it?** — append-only verdict receipts.
3. **How did that history affect what I proposed or noticed next?** — MemoryCapsule + Influence Trace / Thoughtline.
4. **Can I use one old toast as ancestry without pretending it is the same execution?** — Re-toast.

The machine should become developmentally different because it has accumulated witnessed encounters and attributed human judgment, while every accepted render remains governed by the same existing VisualScore → ResolvedTimeline → renderer authority boundary.

> The Toaster remembers because things happened; it learns because those happenings acquire accountable relationships.