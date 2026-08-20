# Resonant Disturbance v0 — Design

Date: 2026-08-19  
Status: Approved architecture checkpoint  
Project authority: Haunted Toaster issue #187  
Related project seams: #127, #148, #149, #151, #174, #183, #184; PR #185

## Design sentence

> **The Toaster may be disturbed before it is rendered. Recoil may restore present shape; witnessed disturbance remains in history.**

Resonant Disturbance v0 is Haunted Toaster's smallest deterministic **body-plan physiology** between perception testimony and separately constituted render execution.

The primitive receives a finite declared body plus one admitted pressure input, evaluates bounded threshold/transfer/recoil mechanics, and emits ordered addressed causal history. Its first version has **no visible effect**.

## Why this seam exists

The current project already contains distinct mechanisms for sensing, proposal influence, visual topology, history, and render authority:

```text
SENSE
  #183 Specimen Pulse
  #184 Perceptual Reflex Layer
        ↓ testimony

PROPOSAL / CONTEXT
  Creative Context Table
  Influence Diet
        ↓ bounded influence

BODY
  [missing seam]
        ↓ causal history

VISIBLE EXECUTION
  accepted VisualScore
  → ResolvedTimeline
  → shared preview / production renderer
        ↓

MEMORY
  #174 HAUNT return capsule
  #151 lineage / Elsewhere
```

Without a body seam, future resonance behavior has two bad implementation temptations:

1. let the sensor prescribe an effect; or
2. let the renderer keep hidden mutable state and improvise a simulation.

Both weaken the existing authority model.

Resonant Disturbance v0 inserts one pure, inspectable middle layer:

```text
witnessed pressure
      ↓
finite declared physiology
      ↓
ordered disturbance history
      ↓
no execution authority in v0
```

## Independent reproduction boundary

Project0's L-Branch and Snap-State experiments are **design lineage and cross-domain evidence**, not runtime dependencies.

Haunted Toaster must independently reproduce only the law it needs in product-native language.

Do not:

- import Project0 packages or source;
- mirror Project0 record names merely for compatibility;
- claim Project0 authority over Toaster execution;
- add a shared cross-repository runtime library.

This is a BEE-style downstream re-proof: provenance may travel; authority remains local.

## Naming boundary

Do not call the Toaster primitive `Snap-State`.

Haunted Toaster already has `primitiveField.dynamics = "snap"`, and Project0 separately owns `Snap-State v0.1`. Reusing that name would collapse three different things:

```text
primitiveField snap
  = expressive dynamics vocabulary

Project0 Snap-State
  = portable experimental threshold-topology specimen

Resonant Disturbance
  = Toaster-owned body-plan physiology
```

The working implementation policy identifier is:

```text
resonant-disturbance-v0
```

The record schema family should remain Haunted-Toaster-owned, for example:

```text
haunted-toaster/resonant-disturbance-body/v0
haunted-toaster/resonant-disturbance-plan/v0
```

Exact final constants may be tightened during implementation, but v0 must remain versioned.

## Authority law

Three stages remain mechanically distinct.

### Testimony

A pressure source says only what was measured or admitted.

Examples later may include:

- a fixed synthetic fixture;
- source-song response evidence;
- Specimen Pulse v1;
- another explicit Creative Context provider.

A sensor does not get to decide what body event should occur.

### Physiology

Resonant Disturbance deterministically maps admitted pressure into a declared finite body.

The evaluator may only:

- accumulate declared load;
- cross declared thresholds;
- activate declared couplings;
- transfer declared bounded load;
- apply declared recoil;
- record refusal or exhaustion;
- terminate under a finite event budget.

It may not invent topology, authority, evidence, timing, or an effect.

### Execution

Visible behavior remains outside this v0 primitive.

A later, separately authorized adapter may map accepted disturbance history into existing Ghost Topology / ResolvedTimeline semantics. The adapter is not part of v0.

## v0 data model

Prefer one focused module unless implementation pressure proves a split materially improves clarity.

Conceptually:

```js
DisturbanceBody {
  schema,
  policyVersion,
  bodyId,
  cells: [
    {
      id,
      initialLoad,
      threshold,
      recoil
    }
  ],
  couplings: [
    {
      id,
      sourceCellId,
      targetCellId,
      transfer
    }
  ],
  maxEvents
}
```

A pressure input is explicit:

```js
DisturbancePressure {
  schema,
  sourceRef,
  targetCellId,
  amount,
  authority: "testimony-only" | "influence-only" | "fixture"
}
```

The first implementation uses only `fixture` pressure. The broader shape exists so a later adapter does not require widening the evaluator itself.

The result is conceptually:

```js
ResonantDisturbancePlan {
  schema,
  policyVersion,
  bodyHash,
  pressureHash,
  events,
  finalState,
  terminal,
  planSha256
}
```

## Numeric law

v0 does not need floating-point physics.

Use safe integer or deliberately quantized integer load units so exact replay and validation are boring.

Requirements:

- finite safe integers only;
- non-negative initial load, threshold, recoil, transfer, and admitted pressure;
- threshold must be positive;
- `maxEvents` must be a positive bounded safe integer;
- arithmetic must remain inside `Number.isSafeInteger` bounds;
- overflow or malformed values fail before mutation.

Do not infer physical units. `load` is a project-local deterministic quantity.

## Structural envelope

The declared body is immutable for one evaluation.

```text
cells_after = cells_declared
couplings_after ⊆ couplings_declared
```

No event may create:

- a new cell;
- a new coupling;
- a new endpoint;
- a new threshold;
- a new transfer amount;
- a new recoil amount;
- a new pressure source.

A coupling whose source or target is undeclared makes the body invalid before execution.

Duplicate IDs or contradictory duplicate declarations fail closed.

## Evaluation law

The v0 evaluator is pure.

Suggested deterministic sequence:

```text
1. validate and normalize body
2. validate and normalize pressure
3. copy current loads from declared initial loads
4. admit pressure event atomically
5. apply pressure to target cell
6. determine eligible threshold crossings
7. sort eligible cells by stable cell id
8. for each admitted crossing:
     threshold-cross event
     ordered outgoing transfers
     recoil
9. recompute eligible frontier
10. stop at settled or exhausted
```

Each cell should cross at most once per v0 evaluation. This is the smallest rule that makes cycles finite and inspectable without inventing deactivation or repeated oscillation semantics.

Outgoing couplings sort by stable coupling id.

A threshold package is atomic with respect to event budget: if the complete next admitted package cannot fit, stop as `exhausted` without partially mutating the package.

## Event history

The event stream is ordered history and must never be set-normalized.

Keep the taxonomy minimal. A viable v0 family is:

```text
pressure
threshold-cross
transfer
recoil
terminal
```

Refusal may be represented as a terminal reason rather than a separate event when no valid execution began.

Each event must retain enough evidence to reconstruct causal order, including:

- stable ordinal;
- event kind;
- affected cell/coupling;
- load delta;
- causing prior event ordinal or source pressure ref where applicable;
- post-event load for affected cells where useful.

The key invariant is:

> **Current state is a projection of history. It is not a substitute for history.**

Two plans that end with the same final loads but contain materially different ordered events must have different plan hashes.

## Terminal states

Keep v0 terminals small:

```text
settled
exhausted
refused
```

Definitions:

- `settled`: no uncrossed declared cell remains threshold-eligible and the event budget was not exceeded;
- `exhausted`: additional declared work is eligible but the finite event budget cannot admit the complete next package;
- `refused`: representation/body/pressure admission is valid enough to return a structured refusal but execution is not allowed to begin.

Malformed representation should throw/fail validation rather than masquerade as a lawful runtime refusal.

## Canonical identity

Reuse existing generation canonicalization helpers:

```text
canonicalStringify
hashCanonical
deepFreeze
```

Do not add another serializer or hasher.

Normalize body elements that are declaration sets into stable ID order before hashing. Preserve event order exactly.

Same normalized body + same pressure + same policy must produce byte-equivalent plan evidence and the same `planSha256`.

## Canonical specimen

Freeze one tiny three-cell specimen:

```text
A --AB--> B --BC--> C
```

Recommended integers:

```text
A: initial 0, threshold 5, recoil 5
B: initial 4, threshold 7, recoil 7
C: initial 2, threshold 6, recoil 6
AB transfer 3
BC transfer 4
pressure: +5 to A
```

Expected causal path:

```text
pressure A +5
→ A threshold-cross
→ AB transfer +3 to B
→ A recoil -5
→ B threshold-cross
→ BC transfer +4 to C
→ B recoil -7
→ C threshold-cross
→ C recoil -6
→ settled
```

This specimen intentionally resembles the minimal threshold/cascade shape proven elsewhere while remaining independently represented and implemented in Toaster grammar.

## Required contrast specimens

### Below threshold

Pressure does not cross any threshold. Result settles without synthetic transfer events.

### Same final state, different history

Add one declared zero-transfer or alternate bounded causal path that settles to the same final load vector but creates a different ordered event history. The plan hash must differ.

### Cycle

Declare a cycle such as `A → B → A`. Each cell may cross at most once, so evaluation terminates rather than oscillating forever.

### Budget exhaustion

Choose a `maxEvents` that cannot admit the full next threshold package. The evaluator must not partially apply the package.

### Hostile topology

Undeclared endpoint, duplicate ID, negative quantity, unsafe integer, unknown field, or accessor-backed hostile representation fails before mutation.

## Relationship to Creative Context

Resonant Disturbance does not consume a Creative Context Table in v0.

A later adapter may do so, but it must preserve the existing law:

```text
influence-only provider
  ≠ ancestry
  ≠ source truth
  ≠ renderer authority
```

The body evaluator receives only an already-admitted pressure projection, never a bag of ambient provider payloads.

## Relationship to Specimen Pulse #183

Specimen Pulse remains a **sense**.

Later composition:

```text
Specimen Pulse
  ↓ explicit pressure projection policy
DisturbancePressure
  ↓
Resonant Disturbance
```

The pressure projection policy must be separately versioned and hashed. It cannot silently reinterpret raw attached audio.

No specimen audio enters the final master through this seam.

## Relationship to Ghost Topology #127

Resonant Disturbance is not a second topology system.

Later composition, only after existing execution gates:

```text
accepted disturbance history
  ↓ Ghosted Topology Coupling adapter
existing Topology Arc / apparition vocabulary
  ↓
ResolvedTimeline
```

A topology lock remains stronger than any future coupling request.

## Relationship to HAUNT #174 / #151

Body history and creative memory remain different categories.

```text
body history
  = what happened inside one admitted physiology evaluation

HAUNT / lineage memory
  = what prior encounter residue may influence future proposal space
```

A body event does not automatically become persistent cross-session memory.

## Relationship to MOLT

MOLT is deferred.

Resonant Disturbance should expose enough explicit pre/post/history evidence that a later Typed Continuity adapter can state what survived a transformation without inferring identity from final-state similarity.

No continuity-lane machinery belongs in v0.

## File boundary

First implementation target:

```text
Create: src/full-measure/src/generation/resonant-disturbance.cjs
Create: src/full-measure/tests/resonant-disturbance.test.cjs
Modify: src/full-measure/src/generation/index.cjs
```

Do not modify:

```text
src/full-measure/src/render/**
src/full-measure/src/renderer/**
src/full-measure/src/video-pantry/**
VisualScore schema
ResolvedTimeline schema
```

unless implementation inspection proves the public generation export requires a narrower adjacent edit. Any widening must be justified in the PR.

## Verification contract

Focused:

```bash
cd src/full-measure
node --test tests/resonant-disturbance.test.cjs
```

Broad:

```bash
npm run verify
```

No browser or packaged witness is required for this pure-data v0 unless implementation unexpectedly changes UI or runtime packaging paths.

## Non-goals

- no renderer-local mutable simulation;
- no visual effect;
- no second timeline;
- no new canonical VisualScore axis;
- no continuous physics;
- no frequency-domain resonance model;
- no generalized graph engine;
- no model call;
- no AI governor;
- no Project0 runtime dependency;
- no raw VSPantry audio access;
- no Ghost Topology adapter;
- no MOLT or STRIDE;
- no Witness Sigil rendering;
- no release/tag/promotion.

## Stop condition

Stop v0 when Haunted Toaster can prove, entirely upstream of render execution:

> **A finite declared creature body can receive one admitted pressure, cross deterministic thresholds, transfer disturbance only along declared paths, recoil, settle or exhaust within a finite budget, and preserve the exact ordered causal history that happened.**

Only then consider a separately authorized visible coupling.