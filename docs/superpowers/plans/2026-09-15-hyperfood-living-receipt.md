# HyperFood Living Receipt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-port the already-proven renderer-independent HyperFood Slice A ABI onto post-BETA `main`, then build the first living-receipt descendant from one accepted Haunted Toaster receipt without granting HyperFrames, the receipt, or the adapter new song-render authority.

**Architecture:** Treat PR #270 (`impl/hyperfood-slice-a`) as a witnessed donor, not current authority. Re-port its isolated HyperFood ABI onto the post-BETA carrier using RED→GREEN proof. Then add a receipt-to-specimen bridge that derives explicit event/cue evidence plus a companion derivation receipt; finally add HyperFrames as the first projection adapter. `VisualScore -> ResolvedTimeline` remains accepted song execution authority; HyperFood remains a descendant/material system.

**Tech Stack:** Node.js >=22, CommonJS, `node:test`, existing Haunted Toaster canonicalization helpers, HyperFrames HTML/CSS/GSAP adapter, GitHub Actions proof surface.

**Spec:** PR #269 design (`docs/superpowers/specs/2026-09-15-hyperfood-v0-design.md` on `design/hyperfood-v0`) plus Daily Slice `2026-09-06/hyperfood-the-render-is-not-the-organism.md` and the post-BETA living-receipt decision recorded in this plan.

## Global Constraints

- Work from post-BETA `main` at or after merge commit `e8e8fb0fa3c13c98aae8c3ca5e98cb4de9f19031`.
- Reconcile before rebuilding; PR #270 is a donor, not a branch to merge blindly.
- HyperFood specimen identity remains distinct from render identity and from VSPantry byte identity.
- `accepted VisualScore -> canonical ResolvedTimeline -> production render` remains the only song-render execution authority.
- HyperFrames may supply capability without acquiring organism authority.
- The first living receipt is a descendant of an accepted render receipt; it does not modify or reinterpret the accepted render.
- Receipt-derived event grids and text cues must be explicit outputs of a bounded bridge with their own derivation receipt; HyperFood organisms must not rummage through arbitrary receipt JSON.
- `PULSE@0.1.0`, `GHOST-TEXT@0.1.0`, and `FRAME-EAT-FRAME@0.1.0` remain the only Slice A organism versions.
- No `Math.random()`, `Date.now()`, ambient entropy, renderer-local creative decisions, or hidden audio analysis.
- Source receipt identity, field-selection policy, derived cues/events, and resulting HyperFood specimen ID must be attributable.
- Do not promote `RECEIPT-STORM` as a canonical organism in this slice. Earn reusable receipt organisms only after the first composed specimen exists and exposes recurring mechanics.
- No release/tag/main promotion follows from this experimental branch.

---

## File Structure

Re-port from PR #270:

```text
src/full-measure/src/hyperfood/
├── registry.cjs
├── schema.cjs
├── identity.cjs
├── graph.cjs
├── mutation.cjs
├── trace.cjs
└── index.cjs

src/full-measure/tests/
├── hyperfood-schema.test.cjs
├── hyperfood-identity.test.cjs
├── hyperfood-graph.test.cjs
├── hyperfood-mutation.test.cjs
├── hyperfood-trace.test.cjs
└── hyperfood-slice-a-contract.test.cjs
```

New Slice B boundary:

```text
src/full-measure/src/hyperfood/
├── receipt-bridge.cjs          # accepted receipt -> explicit derived evidence + spec inputs
└── hyperframes-adapter.cjs     # normalized HyperFoodSpec -> deterministic HyperFrames project model/source

src/full-measure/tests/
├── hyperfood-receipt-bridge.test.cjs
└── hyperfood-hyperframes-adapter.test.cjs

src/full-measure/hyperframes/living-receipt/
├── DESIGN.md                   # required visual identity gate before HTML exists
└── README.md                   # bounded experimental surface / preview-render instructions
```

---

### Task 1: Re-port HyperFood Slice A onto post-BETA main

**Files:**
- Create the seven `src/full-measure/src/hyperfood/*.cjs` modules listed above from PR #270 donor behavior.
- Create the six `src/full-measure/tests/hyperfood-*.test.cjs` files listed above from PR #270 donor contracts.

**Interfaces:**
- Consumes: existing `generation/canonical.cjs` and `video-pantry/schema.cjs` helpers.
- Produces: `normalizeHyperFoodSpec`, `specimenId`, `normalizeHyperFoodGraph`, `reconstructHyperFoodMutation`, `evaluateHyperFoodTrace`, immutable organism/source registries, and a stable public `hyperfood/index.cjs` surface.

- [ ] **Step 1: Write/carry the Slice A contract test only**

Port `tests/hyperfood-slice-a-contract.test.cjs` first, while `src/hyperfood/` is absent on the post-BETA branch.

- [ ] **Step 2: Verify RED on post-BETA carrier**

Run the repository proof. Expected failure: HyperFood public module/ABI is missing on this carrier; unrelated BETA tests stay green.

- [ ] **Step 3: Re-port the minimal donor implementation and focused tests**

Carry the seven donor modules and remaining five focused test files from PR #270 without importing the old branch ancestry or changing unrelated runtime code.

- [ ] **Step 4: Verify GREEN**

Run the focused HyperFood tests, then consolidated repository proof. Expected: all HyperFood contracts pass; no renderer/UI/product behavior changes.

- [ ] **Step 5: Record re-port receipt**

Record donor PR/head, post-BETA base/head, changed files, and exact workflow run. Explicitly state that this is a provenance re-port, not a blind merge.

---

### Task 2: Accepted-receipt -> explicit HyperFood evidence bridge

**Files:**
- Create: `src/full-measure/src/hyperfood/receipt-bridge.cjs`
- Create: `src/full-measure/tests/hyperfood-receipt-bridge.test.cjs`

**Interfaces:**
- Consumes: one complete accepted video receipt object plus caller-supplied target dimensions/fps and explicit bridge policy version.
- Produces:
  - `buildLivingReceiptEvidence(receipt, options)` -> `{ sourceReceipt, events, cues, derivation }`
  - `buildLivingReceiptSpecInputs(receipt, options)` -> canonical material suitable for constructing a HyperFood graph.

The bridge is intentionally not an organism. It is provenance-preserving evidence preparation.

- [ ] **Step 1: Write failing bridge tests**

Tests must prove:

```js
assert.throws(() => buildLivingReceiptEvidence(unacceptedReceipt), /accepted receipt/i);
assert.equal(result.sourceReceipt.sha256, expectedReceiptSha);
assert.equal(result.derivation.authority, "descriptive-descendant-only");
assert.deepEqual(result.events, result2.events); // same receipt + policy => same evidence
assert.deepEqual(result.cues, result2.cues);
assert.notDeepEqual(
  buildLivingReceiptEvidence(receiptA).derivation.sourceReceiptSha256,
  buildLivingReceiptEvidence(receiptB).derivation.sourceReceiptSha256,
);
```

A fixture should cover at minimum: source identity, accepted timeline identity, candidate genealogy, topology event evidence, Haunted Haiku, Dogram availability, and final output projection.

- [ ] **Step 2: Verify RED**

Run `node --test tests/hyperfood-receipt-bridge.test.cjs`. Expected: module missing.

- [ ] **Step 3: Implement a bounded bridge policy**

Use an explicit schema such as:

```js
const LIVING_RECEIPT_BRIDGE_SCHEMA = "haunted-toaster/hyperfood-living-receipt-bridge/v0";
const LIVING_RECEIPT_BRIDGE_POLICY = "first-beta-receipt/v0";
```

Required behavior:

```text
receipt.validation.accepted === true
+ stable source receipt digest
+ explicit field-selection policy
-> deterministic event grid
-> deterministic text cues
-> derivation receipt
```

Do not infer aesthetic quality or hidden semantics. Initial event classes may be limited to known structural boundaries already present in the receipt: accepted topology event strikes/releases, section boundaries when explicitly retained, and terminal output projection. Initial cues may be limited to retained lyric/title/Haiku/provenance strings already present in the receipt or explicitly supplied by the caller.

- [ ] **Step 4: Verify GREEN and refusal**

Prove deterministic replay, source-receipt sensitivity, malformed/unaccepted refusal, and no mutation of the input receipt.

- [ ] **Step 5: Commit/receipt the bridge**

State exactly which receipt fields are consumed and which are intentionally ignored.

---

### Task 3: Compose the first living-receipt HyperFood specimen

**Files:**
- Extend: `src/full-measure/tests/hyperfood-receipt-bridge.test.cjs`
- Modify only if required: existing `src/full-measure/src/hyperfood/*.cjs`

**Interfaces:**
- Consumes: `buildLivingReceiptEvidence()` plus one explicitly admitted visual surface asset and one pinned font asset.
- Produces: one graph-form `HyperFoodSpec` composed from existing organisms only.

- [ ] **Step 1: Write failing composition test**

The target graph must be explicit and typed:

```text
surface asset -> FRAME-EAT-FRAME -> PULSE -> output
text cues + font asset -> GHOST-TEXT -> PULSE surface input through a declared composition edge
receipt-derived event grid -> PULSE events
```

If current one-input Surface ports cannot express the desired composition without hidden multiplexing, the test must expose that limitation rather than adding an opaque special case. The minimal lawful response may be to choose a simpler first graph rather than widening the ABI prematurely.

- [ ] **Step 2: Verify RED for the exact missing seam**

Expected failure must identify the graph capability actually missing, if any.

- [ ] **Step 3: Implement only the smallest lawful delta**

Prefer a simpler lawful graph over adding general multi-surface compositing. Any ABI widening requires a new typed operator/version, not a renderer-specific escape hatch.

- [ ] **Step 4: Verify specimen replay and mutation**

Same receipt/assets/policy -> same `hf0_` specimen ID. One declared parameter change -> different specimen ID with reconstructable delta.

- [ ] **Step 5: Record the first specimen manifest**

Retain source receipt digest, HyperFood specimen ID, organism lineage, assets, timing evidence, and bridge derivation identity.

---

### Task 4: Define visual identity before any HyperFrames HTML

**Files:**
- Create: `src/full-measure/hyperframes/living-receipt/DESIGN.md`

**Interfaces:**
- Consumes: explicit human visual direction.
- Produces: palette, typography, motion identity, and anti-patterns used by every living-receipt HyperFrames composition.

- [ ] **Step 1: Obtain the three required visual decisions**

Record:

```text
mood: explosive | cinematic | fluid | technical | chaotic | warm | custom
canvas: light | dark
references: explicit colors/fonts/visual references or "none"
```

- [ ] **Step 2: Write DESIGN.md**

It must contain `## Style Prompt`, `## Colors`, `## Typography`, `## Motion`, and `## What NOT to Do`.

- [ ] **Step 3: Review against Haunted Toaster legibility**

No visual choice may imply new receipt authority. Provenance labels must remain readable when shown.

---

### Task 5: HyperFrames projection adapter

**Files:**
- Create: `src/full-measure/src/hyperfood/hyperframes-adapter.cjs`
- Create: `src/full-measure/tests/hyperfood-hyperframes-adapter.test.cjs`
- Create after Task 4 only: `src/full-measure/hyperframes/living-receipt/index.html` and focused sub-compositions if needed.

**Interfaces:**
- Consumes: normalized graph-form HyperFoodSpec + transform traces + DESIGN.md identity.
- Produces: deterministic HyperFrames HTML/source model and a render-projection receipt. HyperFrames receives no authority to alter HyperFood specimen semantics.

- [ ] **Step 1: Write failing adapter tests**

Tests must prove deterministic HTML/model generation from canonical spec, explicit `data-composition-id`, finite timelines, no ambient randomness, and refusal for unsupported organism versions/operators.

- [ ] **Step 2: Verify RED**

Expected: adapter missing.

- [ ] **Step 3: Implement adapter for the first specimen only**

Map existing organism traces to visual properties. Do not add general-purpose renderer DSL. The adapter may render only the exact supported Slice A organism versions.

- [ ] **Step 4: Lint and inspect**

Run HyperFrames `lint` and `inspect` against the generated composition. Fix all errors before render.

- [ ] **Step 5: Render first projection**

Render a draft MP4 and, where meaningful, transparent WebM. Record renderer/version/environment separately from `hf0_` specimen identity.

- [ ] **Step 6: Replay proof**

Render the same specimen twice in the same pinned environment and report which determinism levels were actually demonstrated: spec, timeline, pixel, and/or byte.

---

### Task 6: Observe before naming RECEIPT-STORM

**Files:**
- Add a bounded research receipt under `docs/research/` or the existing project receipt location only after the first projection exists.

- [ ] **Step 1: Compare intended mechanics to observed mechanics**

List which behaviors genuinely recurred across the living receipt: pulse, residue, recursion, ancestry reveal, topology witness, provenance transitions.

- [ ] **Step 2: Refuse premature ontology**

Do not register `RECEIPT-STORM@0.1.0` unless at least one reusable mechanical contract can be stated independently of the first-beta specimen.

- [ ] **Step 3: Propose the smallest next organism, if earned**

Any new organism gets its own versioned typed ports, parameter bounds, trace law, TDD contract, and renderer-independent identity.

---

## Verification Gate

Before this branch can be considered technically complete:

```text
Slice A re-port: current-main RED witnessed -> GREEN
HyperFood focused tests: PASS
full Haunted Toaster consolidated proof: PASS
receipt bridge replay/refusal: PASS
first specimen stable identity: PASS
HyperFrames lint: PASS
HyperFrames inspect: PASS
first projection renders: PASS
source receipt -> bridge derivation -> hf0 specimen -> renderer projection lineage retained
no VisualScore/ResolvedTimeline authority change
no tag/release/main merge without separate approval
```
