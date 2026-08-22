# BETA Receipt Memory + Witness Loop Rescue — Design v2

**Date:** 2026-08-22  
**Status:** Proposed current-spine design; implementation not yet authorized by this document alone  
**Branch:** `rescue/beta-receipt-memory-loop-v2`  
**Source ancestry:** PR #166 (`feat: wire receipt memory into alpha.9 beta loop`)  
**Current authority base:** `main` at `899a920b17019a54dadfb0c6bb321cc6e4cf860b`

## Purpose

Re-port the still-valid Receipt Memory + Witness Loop concepts from PR #166 onto the current BETA candidate ecology without reviving the old alpha.9 implementation wholesale.

The rescue must preserve the current production spine:

```text
accepted VisualScore
  → ResolvedTimeline
  → renderer
  → immutable render receipt
```

Memory is downstream evidence and upstream pressure only. It may influence a future candidate family through a narrow, deterministic policy. It does not become production authority, admission authority, identity, authentication, or permission.

## Core law

> Memory may propose bounded pressure. It never acquires generation authority.

Corollaries:

- A prior render receipt is immutable historical evidence.
- A Human Verdict is append-only testimony about a render; it never edits the render receipt.
- A Witness Encounter is append-only testimony about a witnessed render/memory state; it never edits the render receipt.
- A Memory Projection is a deterministic interpretation of local archived evidence, not a constituted truth source.
- A Memory Capsule is a deterministic bounded proposal derived from that projection plus current-song evidence.
- Ordinary memory may affect at most one candidate in an ordinary six-up family.
- Explicit Re-toast ancestry is human-selected ancestry for a fresh current-BETA generation. It is not replay of a historical timeline.
- Absence, corruption, or incompatibility of memory evidence must degrade to no influence or explicit refusal, never invented evidence.
- Removing the memory subsystem must leave ordinary BETA generation semantically valid.

## Scope

### In scope

1. Current-spine Memory Service coordinator.
2. Witness Encounter append-only receipt.
3. Deterministic Memory Projection / Capsule integration using primitives already present on `main` where their contracts remain valid.
4. New BETA-native one-seat memory influence policy.
5. Deterministic replay proof for memory-influenced ordinary families.
6. Explicit Re-toast ancestry using archived accepted VisualScore evidence.
7. Narrow Electron IPC/preload surface for memory operations.
8. Current BETA Past Toasts surface.
9. Read-only Thoughtline projection of actual Influence Trace evidence.
10. Fresh RED→GREEN tests and packaged witness.

### Out of scope

- Merging or rebasing PR #166 wholesale.
- Automatic influence of TEST 6, forced witnesses, STOMP, CROSS, Sigil Grammar, or other special families.
- Multi-parent ancestry composition.
- Memory-owned renderer behavior.
- Memory-owned topology or atmosphere ontology.
- Hidden recommendation loops that bypass candidate-family receipts.
- Cloud/network memory synchronization.
- Authentication, identity, admission, or authority semantics.
- Migration promises for every alpha.9 file/schema byte-for-byte.

## Ancestry versus authority

PR #166 is historical design and implementation evidence. It is not the implementation base.

The rescue keeps concepts only when they still satisfy current BETA contracts. Any reused schema or algorithm must be re-proven against current code. Any concept that cannot be cleanly mapped to the current spine is refused or redesigned rather than silently promoted.

Where a new semantic contract differs from the old implementation, the new contract receives a new policy version.

## Architecture

```text
successful canonical render
  ↓
immutable render receipt
  ↓
local receipt archive
  ├── Human Verdict testimony
  └── Witness Encounter testimony
          ↓
    Memory Projection
          ↓
     Memory Capsule
          ↓
 bounded ordinary influence
   [maximum ONE BETA seat]
          ↓
     Influence Trace
```

Explicit ancestry is a separate human-controlled lane:

```text
Past Toast
  ↓ human chooses Re-toast
archived accepted render receipt
  ↓
archived VisualScore sidecar
  ↓ verify score address
armed Re-toast ancestor
  ↓
fresh current-BETA generation
  ↓
new family + explicit ancestry evidence
```

## Component contracts

### 1. Memory Service

A new current-spine `memory-service.cjs` coordinates existing memory primitives and local archive operations.

It may:

- archive a successful canonical render;
- list compact Past Toast summaries;
- load one Past Toast detail;
- append Human Verdict testimony;
- build the current deterministic Memory Projection;
- derive a Memory Capsule and bounded influence plan for the current song;
- resolve an archived Re-toast ancestor;
- append a Witness Encounter;
- resolve archived artifacts by explicit receipt identity and artifact kind.

It may not:

- generate candidates itself;
- mutate VisualScores or ResolvedTimelines;
- edit prior receipts/verdicts/witness encounters;
- expose arbitrary filesystem reads to the renderer;
- infer missing authority from missing evidence.

The service is a coordinator, not a semantic authority.

### 2. Witness Encounter

Witness Encounter remains a separate append-only receipt family.

Proposed schema identity:

`haunted-toaster/witness-encounter/v1`

The old schema may be retained only if current tests prove the same meaning. Otherwise it must be versioned.

A witness encounter must point to a locally archived accepted render receipt by SHA-256 identity. It may carry bounded references such as:

- render receipt SHA-256;
- immutable Witness Window copied from the archived canonical receipt;
- Memory Capsule SHA-256;
- Influence Trace SHA-256;
- current-song evidence class/hash as appropriate;
- derived witness disposition;
- Re-toast ancestor receipt/score address when explicitly present.

It must not reinterpret a failed/unaccepted render as accepted and must reject disagreement with immutable archived evidence.

### 3. Memory Projection and Capsule

The existing deterministic primitives on `main` are the preferred basis where still lawful:

- render archive evidence;
- Human Verdict evidence;
- witness evidence;
- feature counts / recent saturation;
- current-song energy evidence;
- allowed feature universe derived from current constraints;
- deterministic pressure ordering.

Projection/capsule output is evidence-addressed and deterministic.

If an archive contains corrupt records, corrupt records stay on disk but do not enter semantic memory. Their absence from the projection is not authority to invent replacements.

### 4. BETA one-seat influence

The old alpha.9 memory-generation wrapper is not restored.

Current BETA generation runs first according to its canonical rules. A narrow post-generation decorator may then consider one designated ordinary candidate seat.

New policy identity:

`toaster-memory-seat-v2`

Reason for `v2`: the old v1 implementation existed on an unconstituted alpha.9 branch and targeted older family machinery. The current BETA contract must not imply byte-compatible continuity that has not been proved.

Rules:

1. Only an ordinary BETA six-up family is eligible.
2. The family is valid before memory influence is considered.
3. At most one seat may be targeted.
4. The seat selection is deterministic and policy-declared.
5. The proposed target must be legal under current garment constraints.
6. Existing locks remain absolute.
7. If target equals current value, no mutation occurs and the no-op reason is receipted.
8. If target is illegal or locked, no mutation occurs and the refusal reason is receipted.
9. If applied, the changed score is re-addressed through current canonical score machinery.
10. Any affected current timeline layers are recomputed through current current-spine resolvers, not copied from alpha.9.
11. The candidate family is re-addressed through the current BETA family contract.
12. Memory influence metadata is evidence/provenance and must not masquerade as an ordinary source-family hash.

Five candidates remain byte/semantic-equivalent to the original ordinary family except for family-level metadata needed to describe the one-seat policy.

### 5. Influence Trace

Every considered memory pressure produces explicit trace evidence sufficient to answer:

- which capsule was consulted;
- which target was proposed;
- which candidate seat was considered;
- whether the pressure applied;
- if not, why not;
- old/new score address when changed;
- resulting family identity;
- evidence references supporting the pressure.

Thoughtline is a read-only projection of this evidence.

Thoughtline owns no generation call and cannot change memory state.

### 6. Re-toast ancestry

Re-toast is a human-selected operation from Past Toasts.

Arm sequence:

1. Human selects a Past Toast whose accepted render receipt exists locally.
2. Service resolves the archived VisualScore sidecar.
3. VisualScore is parsed by current score validation.
4. Its computed current address must agree with archived score evidence when such evidence exists.
5. Session arms `{ receiptSha256, scoreAddress }` as explicit ancestry.
6. The next eligible fresh ordinary BETA generation uses that VisualScore as parent ancestry.
7. The generated family and eventual render receipt carry explicit Re-toast ancestry evidence.
8. The arm is consumed only after successful family generation.
9. Failure leaves the arm intact unless the human clears it.

Re-toast never reuses a historical ResolvedTimeline or rendered video as production authority.

Re-toast ancestry and Lab Proposal ancestry remain mutually exclusive for this slice. A future multi-parent composition rule must be explicit rather than precedence-based.

### 7. Candidate session boundary

The candidate session owns transient arming and current-family state.

It may ask the Memory Service for:

- generation context;
- Re-toast ancestor resolution;
- post-render archive/witness operations.

Memory context must be separated from renderer authority. Renderer inputs receive only canonical render configuration plus explicitly allowed receipt provenance. Memory metadata that is not a renderer input must be stripped before renderer execution.

### 8. IPC / preload

Expose narrow semantic operations only, for example:

- `listPastToasts`
- `getPastToast`
- `submitHumanVerdict`
- `armReToast`
- `clearReToast`
- `getCurrentInfluenceTrace`
- `resolvePastToastArtifact` through typed artifact kinds

No raw root path, arbitrary path read, or generic filesystem operation is exposed to renderer code.

### 9. Past Toasts UI

Build on the current BETA Recent Toasts socket rather than transplanting the old alpha.9 layout.

Minimum operator behavior:

- recent compact projection on BETA home;
- full Past Toasts list;
- detail view with receipt identity, availability truth, latest verdict, bounded visual identity/evidence;
- explicit Re-toast action only when the archived VisualScore evidence is available;
- explicit unavailable states when media or sidecars are missing;
- no implication that a missing artifact invalidates historical receipt evidence.

### 10. Thoughtline UI

Thoughtline shows actual current Influence Trace evidence only.

Minimum fields:

- memory capsule identity;
- evidence refs;
- pressure target/reason;
- candidate seat;
- applied/refused/no-op result;
- score/family identity transition where applicable.

Empty state means no memory influence evidence exists. It must not synthesize narrative explanations.

## Authority semantics

The implementation must preserve these distinctions:

- Archived ≠ endorsed.
- Human Verdict ≠ render acceptance.
- Witness Encounter ≠ production authority.
- Memory Projection ≠ truth.
- Memory Capsule ≠ command.
- Influence proposal ≠ mutation.
- Legal target ≠ required target.
- Re-toast ancestor ≠ replay.
- Available artifact ≠ authoritative artifact.
- Missing artifact ≠ permission to infer.

No UI copy, schema name, code comment, or API name may turn memory into authentication, identity, admission, or authority.

## Determinism and replay

For ordinary memory-influenced families, the following inputs must be sufficient to reproduce the result:

- current accepted media analysis / current-song evidence;
- current constraints and locks;
- root seed and ordinary family inputs;
- deterministic archive cut / projection identity;
- memory capsule identity;
- influence policy version;
- explicit Re-toast ancestry identity if present;
- current renderer profile and all normal BETA generation inputs.

Replay proof must verify:

- candidate score addresses;
- timeline hashes;
- family hash;
- memory seat decision;
- Influence Trace identity.

Changing unrelated local memory after the recorded archive cut must not change replay of the recorded family.

## Failure behavior

Memory failure must fail closed with respect to memory influence while preserving ordinary generation where safe.

Examples:

- no memory root: ordinary generation continues without memory influence;
- empty archive: ordinary generation continues unchanged;
- corrupt witness/verdict record: record excluded from projection;
- corrupt requested Re-toast ancestor: explicit Re-toast generation refuses;
- missing Re-toast score sidecar: explicit Re-toast generation refuses;
- illegal memory target: family remains valid, influence receipted as refused;
- locked memory axis: family remains valid, influence receipted as refused;
- memory service unavailable while Re-toast is armed: explicit operation refuses rather than silently dropping ancestry.

Explicit human operations may fail loudly. Ambient optional memory must not make the Toaster unusable.

## Fresh proof ladder

Implementation follows RED→GREEN in this order.

### Task 1 — Memory Service contract

RED proves the current coordinator does not exist.

GREEN proves:

- archive accepted render only;
- list/get deterministic Past Toast summaries;
- typed artifact resolution;
- projection/capsule coordination;
- no arbitrary filesystem surface.

### Task 2 — Witness Encounter

RED proves missing current-spine witness append/read contract.

GREEN proves:

- archived accepted receipt required;
- immutable witness-window agreement;
- append-only collision safety;
- corrupt records excluded from semantic reads;
- testimony does not mutate render receipt bytes.

### Task 3 — BETA one-seat memory policy

RED proves current BETA families ignore memory pressure.

GREEN proves:

- zero-or-one affected seat;
- deterministic seat;
- five untouched candidates;
- constraints/locks absolute;
- illegal/no-op/refused states explicit;
- current family/score/timeline addressing preserved.

### Task 4 — Replay

RED proves memory-influenced family cannot yet replay exactly.

GREEN proves exact current-spine reproduction of score addresses, timeline hashes, family hash, seat decision, and Influence Trace identity.

### Task 5 — No silent influence

RED asserts memory must not enter TEST 6, forced witnesses, STOMP, CROSS, Sigil Grammar, or other special-family paths.

GREEN proves ordinary BETA opt-in is the only admitted ambient influence path.

### Task 6 — Re-toast ancestry

RED proves no current Re-toast session contract.

GREEN proves:

- accepted archived receipt identity required;
- current VisualScore validation/addressing;
- fresh current-BETA descendants;
- no historical timeline replay;
- one-shot successful consumption;
- failure retains arm;
- Lab Proposal/Re-toast coexistence refused.

### Task 7 — Receipt separation

RED attacks mutation/authority leakage.

GREEN proves:

- archived render receipt bytes remain immutable;
- verdict and witness records append separately;
- memory metadata cannot alter renderer authority;
- influence/retoast provenance survives into the appropriate new receipts.

### Task 8 — IPC/preload

RED proves UI has no current semantic memory service.

GREEN proves narrow IPC methods and rejects arbitrary path behavior.

### Task 9 — Past Toasts / Thoughtline

RED proves missing operator surfaces.

GREEN proves:

- current BETA Recent Toasts integration;
- full history/detail truth states;
- explicit Re-toast arming;
- read-only actual-trace Thoughtline;
- missing-artifact truth states.

### Task 10 — Consolidated and packaged witness

Run:

- focused memory suites;
- complete application suite;
- renderer witness;
- dependency/runtime checks required by the current package pipeline;
- Windows package build;
- packaged human witness for Past Toasts, Re-toast, and Thoughtline.

No merge, tag, release, or promotion is implied by machine GREEN alone.

## Acceptance criteria

This slice is complete only when all of the following are true:

1. PR #166 code is not wholesale merged/rebased.
2. Current `main` ancestry is preserved.
3. Ordinary BETA generation works with the memory subsystem absent.
4. Current memory primitives are reused only where fresh tests prove their semantics.
5. Ambient memory affects at most one ordinary six-up candidate.
6. Special/forced families receive no ambient memory without a future explicit contract.
7. Influence is deterministic, lock-aware, and receipted.
8. Re-toast produces fresh current-BETA descendants from verified archived VisualScore ancestry.
9. Historical timelines are never replayed as current production authority.
10. Render receipt bytes remain immutable after verdict/witness/memory actions.
11. Past Toasts tells artifact availability truthfully.
12. Thoughtline displays only actual Influence Trace evidence and owns no generation actions.
13. Replay reproduces all declared memory-influenced identities exactly.
14. Current authority-language scan is clean.
15. Consolidated tests and packaged human witness are recorded.

## Non-goals and future openings

The design intentionally leaves these for later explicit slices:

- more than one memory-influenced six-up seat;
- adaptive influence strength;
- memory influence on GRAB/Topology Event selection;
- TEST 6 memory fixtures;
- influence on atmosphere-specific targets beyond current legal feature universe;
- multi-parent ancestry;
- free-event-graph/dreamstate memory;
- cross-machine or collective memory exchange.

Those may become valuable, but they must cross their own named gates rather than inheriting authority from this rescue.

## Implementation posture

Implementation should be a fresh branch/PR descended from this design branch or continue on this branch after review. Use test-driven development. Preserve #166 as ancestry evidence. Do not close #166 until the rescue PR clearly records which concepts were retained, redesigned, or refused.

This design authorizes a rescue path only after human review. It does not itself authorize merge, tag, release, or promotion.
