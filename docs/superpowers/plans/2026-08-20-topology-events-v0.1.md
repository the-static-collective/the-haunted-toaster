# Topology Events v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove one deterministic, locally deforming `GRAB` topology event end-to-end through the existing accepted CandidateFamily → ResolvedTimeline → topology compiler seam, while freezing a four-verb contract that can later admit APERTURE, SPEAK, and GROW without creating new base topologies.

**Architecture:** Add one generation-side topology-event resolver that accepts an already constituted CandidateFamily, selected candidate index, and accepted ResolvedTimeline; first verifies the CandidateFamily's canonical content address; then derives authoritative locks/topology/score identity from those specimens; creates an addressed plan; and attaches that plan inside the canonical timeline body while rebuilding `timelineHash` and `canonicalJson`. Add one render-side compiler that consumes only the attached plan and produces a bounded local GRAB deformation field. `GRAB` is the only rendered event in the first implementation; APERTURE/SPEAK/GROW remain contract fixtures until GRAB proves the seam.

**Tech Stack:** Node.js/CommonJS, `node:test`, existing canonical hashing helpers, CandidateFamily v1, ResolvedTimeline v1, existing timeline execution/topology compiler/FFmpeg path.

**Spec:** `docs/superpowers/specs/2026-08-20-topology-events-v0.1-design.md`

## Global Constraints

- Source issue is #195; parent beta target is #148.
- Policy is exactly `topology-events-v0.1`.
- Plan schema is exactly `haunted-toaster/topology-event-plan/v0.1`.
- Primitive event kinds are exactly `aperture | speak | grab | grow`.
- `body` is never a primitive event kind.
- First executable renderer event is `grab` only.
- Base topology identity remains frozen and unchanged.
- Before reading CandidateFamily locks or candidate identity, recompute the canonical CandidateFamily core hash with domain `HauntedToaster-CandidateFamily-v1` and require equality with `family.familyHash`.
- Authoritative locks come only from a canonically verified accepted `CandidateFamily.locks`.
- Caller input must not contain an independent `locks` field or `sourceTopology` field.
- `topology` lock refuses topology-event planning in v0.1.
- The accepted timeline must match the selected candidate by score address and base topology.
- The event plan must be attached inside the canonical timeline body and must participate in `timelineHash` / `canonicalJson`.
- A plan addressed to another topology or timeline must fail before render.
- GRAB must produce a bounded local deformation field; whole-frame pan/zoom alone cannot satisfy the contract.
- Reuse `canonicalStringify`, `hashCanonical`, and `deepFreeze`; no new serializer/hasher.
- No renderer-local randomness, raw audio read, sensor read, model call, clock, filesystem discovery, or hidden mutable event state.
- Existing Topology Arc and Elastic Topology Response semantics remain unchanged.
- Historical no-event artifacts and pinned renderer policies remain compatible.
- Preview and production must share the same accepted timeline/plan evidence.
- Broad gate is root `npm run verify`.

---

## File Structure

Create:

```text
src/full-measure/src/generation/topology-events.cjs
src/full-measure/tests/topology-events.test.cjs
src/full-measure/src/render/topology-events.cjs
src/full-measure/tests/topology-event-render.test.cjs
```

Modify only after focused modules are green:

```text
src/full-measure/src/generation/index.cjs
src/full-measure/src/render/timeline-execution.cjs
src/full-measure/src/render/topology-compilers.cjs
src/full-measure/tests/topology-response-compiler.test.cjs
src/full-measure/tests/timeline-topology-smoke.test.cjs
```

Read and reuse the attachment pattern in:

```text
src/full-measure/src/generation/native-color.cjs
```

Read the exact CandidateFamily hash core in:

```text
src/full-measure/src/generation/candidate-family.cjs
```

Do not change `generation/topology-arc.cjs` or `render/topology-response.cjs` merely to share the new vocabulary.

---

### Task 1: Freeze the event contract against canonically verified CandidateFamily lineage

**Files:**
- Create: `src/full-measure/src/generation/topology-events.cjs`
- Create: `src/full-measure/tests/topology-events.test.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`

**Interfaces:**
- Consumes: accepted CandidateFamily v1, candidate index, accepted ResolvedTimeline, requested event specimens.
- Produces: addressed/refused TopologyEventPlan v0.1; no rendering.

- [ ] **Step 1: Write RED contract constants**

Require exact constants:

```js
TOPOLOGY_EVENT_POLICY === "topology-events-v0.1"
TOPOLOGY_EVENT_PLAN_SCHEMA === "haunted-toaster/topology-event-plan/v0.1"
TOPOLOGY_EVENT_KINDS deepEqual ["aperture", "speak", "grab", "grow"]
```

- [ ] **Step 2: Build the fixture through the real CandidateFamily seam**

Use existing fixture `analysis`, constraints, renderer profile, parent score, and candidate-family helpers rather than inventing a second lock model.

Generate a family containing an accepted candidate and preserve:

```text
family.familyHash
family.locks
candidate.scoreAddress
candidate.timeline.timelineHash
candidate.timeline.baseState.topology
```

The topology-event API shape under test is:

```js
resolveTopologyEvents(candidate.timeline, {
  family,
  candidateIndex: candidate.index,
  events: [grabRequest],
})
```

The event request contains only event-local values:

```js
const grabRequest = {
  id: "grab-1",
  kind: "grab",
  prepareTick: 3000,
  strikeTick: 4000,
  releaseTick: 5000,
  residueUntilTick: 7000,
  parameters: {
    anchorX: 0.25,
    anchorY: 0.5,
    targetX: 0.75,
    targetY: 0.45,
    radiusX: 0.22,
    radiusY: 0.18,
    pull: 0.8,
    recoil: 0.55,
    falloff: 0.7,
    residualVectorX: 0.08,
    residualVectorY: -0.03,
    residualStretch: 0.06,
  },
  evidenceRefs: ["fixture:grab-1"],
};
```

There is intentionally no `locks`, `sourceTopology`, `scoreAddress`, or caller-provided timeline hash in the request.

- [ ] **Step 3: Write RED CandidateFamily-address integrity tests**

Before any lock or candidate field is trusted, reconstruct exactly the `familyCore` used by `generateCandidateSet(...)`:

```text
schema
policy
scoreSchema
prng
rootSeed
parentScoreRef
baselineScoreRef
constraintPackId
analysisHash
constraintsHash
rendererProfileHash
locks
requestedCount
producedCount
roles
scoreAddresses
timelineHashes
shortfall
```

Require:

```js
hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1") === family.familyHash
```

Negative fixture:

```text
start from a genuine family with locks = [topology]
clone it
replace clone.locks with []
leave clone.familyHash unchanged
→ resolver throws before reading the forged lock set or creating a plan
```

Also test mutations of `scoreAddresses`, `timelineHashes`, and `roles` with stale `familyHash` so the verifier is demonstrably the exact family-core address check rather than a lock-only special case.

The family hash is a content address, not a signature. This test proves internal identity consistency and stale/tampered representation refusal; it does not claim that arbitrary externally forged JSON becomes trusted merely because its author can compute a hash. The production call site must use the already retained accepted CandidateFamily specimen from candidate generation/selection, not deserialize a new remote family document for this purpose.

- [ ] **Step 4: Write RED authoritative-lock tests**

Generate a canonically valid CandidateFamily with a parent and `locks: ["topology"]`.

Require:

```text
eventCount = 0
refusal.reason = topology-lock-prohibits-topology-events
lockedAxes deepEqual family.locks
```

Also prove there is no supported caller field capable of replacing `family.locks` with `[]`.

Unknown top-level resolver options such as `locks` or `sourceTopology` must fail closed rather than be silently ignored.

- [ ] **Step 5: Write RED candidate/timeline identity tests**

After family-address verification, require failure when any of these is true:

1. `candidateIndex` does not exist;
2. `timeline.scoreAddress !== family.candidates[candidateIndex].scoreAddress`;
3. `timeline.baseState.topology !== family.candidates[candidateIndex].timeline.baseState.topology`;
4. supplied timeline is from another candidate in the same family;
5. supplied family is not CandidateFamily v1;
6. `producedCount`, `roles`, `scoreAddresses`, or `timelineHashes` do not align with the candidate array.

These are representation/identity failures, not renderer refusals.

- [ ] **Step 6: Implement `verifyCandidateFamilyAddress(...)` before deriving locks**

The helper must:

1. validate the CandidateFamily wrapper shape needed by this module;
2. reconstruct the exact canonical `familyCore` fields listed in Step 3;
3. recompute `hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1")`;
4. require exact equality with `family.familyHash`;
5. verify candidate-count and parallel-array alignment;
6. return a cloned/frozen verified view or the original already-frozen family without mutating caller input.

Only **after** this function succeeds may `family.locks`, candidate score addresses, or candidate timeline hashes be used to derive the topology-event plan.

- [ ] **Step 7: Implement descriptor-safe exact event validation and plan derivation**

Use the project's hostile-input posture:

- plain objects only;
- exact known keys;
- own data descriptors only;
- safe integers for ticks/timebase/duration;
- finite bounded numeric parameters;
- no mutation of caller arrays/objects.

The normalized plan derives:

```text
acceptedFamilyHash = verified family.familyHash
acceptedScoreAddress = selectedCandidate.scoreAddress
sourceTimelineHash = supplied timeline.timelineHash
sourceTopology = supplied timeline.baseState.topology
lockedAxes = verified family.locks
```

Do not accept caller substitutes for those values.

- [ ] **Step 8: Normalize GRAB parameters**

Normalize to six decimal places.

Bounds:

```text
anchorX, anchorY, targetX, targetY: 0..1
radiusX, radiusY: >0..1
pull, recoil, falloff: 0..1
residualVectorX, residualVectorY, residualStretch: -1..1
```

For APERTURE/SPEAK/GROW, implement exact kind-specific request validators now even though their render adapters remain deferred. Do not use arbitrary opaque object pass-through.

- [ ] **Step 9: Prove plan normalization/addressing**

Tests must prove:

- same verified family/candidate/timeline + deep-cloned request yields same `planSha256`;
- event order normalizes by `prepareTick`, then `id`;
- evidence refs normalize unique/sorted;
- plan is deeply frozen;
- source inputs remain unchanged;
- `body` is rejected as a primitive kind;
- unknown fields/accessors/non-plain wrappers fail closed;
- invalid tick order fails/refuses at the documented boundary.

- [ ] **Step 10: Run focused tests**

```bash
cd src/full-measure
node --test tests/topology-events.test.cjs
```

Expected: PASS.

- [ ] **Step 11: Commit Task 1**

```bash
git add -- src/full-measure/src/generation/topology-events.cjs src/full-measure/src/generation/index.cjs src/full-measure/tests/topology-events.test.cjs
git commit -m "feat: bind topology events to verified candidate lineage"
```

---

### Task 2: Attach topology-event evidence inside the canonical ResolvedTimeline identity

**Files:**
- Modify: `src/full-measure/src/generation/topology-events.cjs`
- Modify: `src/full-measure/tests/topology-events.test.cjs`
- Modify: `src/full-measure/src/render/timeline-execution.cjs`

**Interfaces:**
- Consumes: current accepted ResolvedTimeline + addressed plan from Task 1.
- Produces: new accepted ResolvedTimeline containing `topologyEvents` in its canonical body.

- [ ] **Step 1: Write RED timeline identity tests**

Follow the identity pattern already used by `resolveNativeColorPlan(...)`.

Require:

```js
const before = candidate.timeline;
const after = resolveTopologyEvents(before, { family, candidateIndex, events });

assert.equal(after.topologyEvents.sourceTimelineHash, before.timelineHash);
assert.notEqual(after.timelineHash, before.timelineHash);
assert.match(after.canonicalJson, /topologyEvents/);
```

Also prove:

```text
changing only event plan content / planSha256 changes final timelineHash
same attached plan produces same final timelineHash
no-event/refusal path preserves documented compatibility behavior
```

- [ ] **Step 2: Implement canonical attachment**

Model the mechanics on `generation/native-color.cjs`:

```text
strip old timelineHash + canonicalJson + prior topologyEvents wrapper field
clone remaining body
insert topologyEvents plan
hash body with HauntedToaster-ResolvedTimeline-v1
rebuild canonicalJson from exact body
deepFreeze
```

Do not store execution-significant topology-event evidence outside that body.

- [ ] **Step 3: Add source-topology and source-timeline attachment guards**

Before attachment require:

```text
plan.sourceTimelineHash === timeline.timelineHash
plan.sourceTopology === timeline.baseState.topology
plan.acceptedScoreAddress === timeline.scoreAddress
plan.acceptedFamilyHash === verified family.familyHash
```

Write negative tests for each mismatch.

The key regression specimen:

```text
plan.sourceTopology = spiral
accepted timeline.baseState.topology = linear
→ attachment fails before render
```

- [ ] **Step 4: Add `assertTopologyEvents(timeline)` in timeline execution**

Optional plan validation must include:

- exact schema/policy;
- lowercase SHA-256 where applicable;
- ordered bounded event windows;
- `sourceTopology === timeline.baseState.topology`;
- `acceptedScoreAddress === timeline.scoreAddress`;
- event envelope within `durationTicks`;
- supported primitive kinds only;
- event count equals event array length.

It must not attempt to recreate CandidateFamily authority at render time; family identity and locks were consumed upstream during verified attachment.

- [ ] **Step 5: Prove renderer cannot consume an orphan raw request**

There should be no `compileTopologyEvents(rawRequest)` production path.

The renderer accepts only a ResolvedTimeline that has already passed `assertResolvedTimeline(...)` / `assertTopologyEvents(...)`.

- [ ] **Step 6: Run focused tests and commit**

```bash
node --test tests/topology-events.test.cjs tests/timeline-topology-smoke.test.cjs
git add -- src/full-measure/src/generation/topology-events.cjs src/full-measure/src/render/timeline-execution.cjs src/full-measure/tests/topology-events.test.cjs src/full-measure/tests/timeline-topology-smoke.test.cjs
git commit -m "feat: bind topology event plan into timeline identity"
```

---

### Task 3: Compile GRAB into a deterministic bounded local deformation field

**Files:**
- Create: `src/full-measure/src/render/topology-events.cjs`
- Create: `src/full-measure/tests/topology-event-render.test.cjs`

**Interfaces:**
- Consumes: only `timeline.topologyEvents` from an accepted timeline.
- Produces: deterministic renderer-neutral local deformation field/evidence for the shared topology compiler seam.

- [ ] **Step 1: Write RED sampling tests before FFmpeg compilation**

Expose a pure helper:

```js
sampleGrabEvent(event, atTick)
```

Return a bounded local field specimen:

```js
{
  centerX,
  centerY,
  radiusX,
  radiusY,
  vectorX,
  vectorY,
  stretch,
  falloff,
}
```

Test semantic phases:

- before `prepareTick`: `vectorX=0`, `vectorY=0`, `stretch=0`;
- prepare→strike: magnitude grows monotonically toward the target vector;
- strike: maximum declared local pull;
- strike→release: local field recoils toward residual vector/stretch;
- release→`residueUntilTick`: non-zero local residual remains;
- after `residueUntilTick`: neutral field returns.

The center/radii stay bounded and deterministic throughout.

- [ ] **Step 2: Add the anti-pan/zoom regression test**

The compiled GRAB representation must contain a bounded local region/falloff and may not reduce to only:

```text
global offsetX
global offsetY
global scale
```

A test should fail if the compiler returns only whole-frame transform values.

- [ ] **Step 3: Implement deterministic interpolation**

Use finite arithmetic and existing formatting conventions where appropriate.

The event field represents a local pull toward the drag target with bounded falloff and residual stretch. Do not import mutable state from the elastic topology-response module.

- [ ] **Step 4: Compile the field to a shared local-warp recipe**

Expose:

```js
compileTopologyEvents(timeline)
```

Expected conceptual result:

```js
{
  evidence: {
    policyVersion: "topology-events-v0.1",
    planSha256,
    sourceTopology,
    eventCount: 1,
    renderedKinds: ["grab"],
  },
  localDeformation: {
    centerX,
    centerY,
    radiusX,
    radiusY,
    vectorX,
    vectorY,
    stretch,
    falloff,
  },
}
```

No generated expression may include random functions or read undeclared external state.

- [ ] **Step 5: Choose one deterministic FFmpeg-local deformation construction**

Implementation may use a masked displacement/warp, remap, or equivalent local construction, but it must satisfy all of these:

1. deformation is spatially bounded around the declared region;
2. falloff decays toward region boundary;
3. neighboring pixels visibly stretch/pull rather than the entire frame merely translating;
4. outside region remains recognizably governed by the base topology;
5. same accepted timeline compiles byte-identically.

If the current FFmpeg seam cannot express a bounded local deformation without invasive duplication, stop and amend the design before substituting global pan/zoom.

- [ ] **Step 6: Verify exact replay**

Deep-cloned identical accepted timeline must yield deep-equal evidence and byte-identical compiled field/filter fragments.

- [ ] **Step 7: Run focused tests and commit**

```bash
node --test tests/topology-event-render.test.cjs
git add -- src/full-measure/src/render/topology-events.cjs src/full-measure/tests/topology-event-render.test.cjs
git commit -m "feat: compile deterministic local GRAB field"
```

---

### Task 4: Attach topology events once at the shared topology compiler context

**Files:**
- Modify: `src/full-measure/src/render/topology-compilers.cjs`
- Modify: `src/full-measure/tests/topology-response-compiler.test.cjs`
- Modify: `src/full-measure/tests/timeline-topology-smoke.test.cjs`

- [ ] **Step 1: Add RED shared-context tests**

Require the topology context to compile topology events once when accepted `timeline.topologyEvents` evidence is present.

Do not add GRAB branches to every topology compiler.

The context should expose one local deformation representation, for example:

```text
context.eventResponse.localDeformation
```

and be `null` when no event plan exists.

- [ ] **Step 2: Preserve frozen topology identity and reject foreign-addressed plans**

Existing `frozenTopology(execution)` must still reject segment topology drift.

Additionally, before event compilation require:

```text
timeline.topologyEvents.sourceTopology === timeline.baseState.topology
```

The negative regression test must construct an otherwise valid timeline whose attached event evidence claims another topology and require failure before filter-graph creation.

- [ ] **Step 3: Compose local GRAB with existing topology response once**

Apply the local deformation at one shared post-topology/pre-final-composite seam.

Do **not** replace existing elastic response. Do **not** scatter separate GRAB implementations through individual topology compiler functions.

Do **not** collapse the effect into whole-frame global travel/scale.

- [ ] **Step 4: Prove no-plan compatibility**

For a historical/no-event timeline, generated topology replacement/filter graph must remain byte-identical to current expected output.

- [ ] **Step 5: Prove event-plan graph distinction**

Same base accepted candidate with one attached GRAB plan must produce a deterministic graph distinct from the no-event graph while keeping topology compiler identity unchanged.

- [ ] **Step 6: Run focused topology tests and commit**

```bash
node --test tests/topology-event-render.test.cjs tests/topology-response-compiler.test.cjs tests/timeline-topology-smoke.test.cjs
git add -- src/full-measure/src/render/topology-compilers.cjs src/full-measure/tests/topology-response-compiler.test.cjs src/full-measure/tests/timeline-topology-smoke.test.cjs
git commit -m "feat: route local GRAB through shared topology seam"
```

---

### Task 5: Prove accepted-plan authority and preview/production parity

**Files:**
- Modify only the smallest existing preview/production parity test or helper necessary.
- Prefer no new canonical schema version because `topologyEvents` is attached using the established optional-plan/re-address pattern; if current validation proves this assumption false, stop and amend the design before proceeding.

- [ ] **Step 1: Write RED authority/parity tests**

Prove:

- renderer cannot accept a raw unscheduled event request;
- event plan must arrive inside an accepted ResolvedTimeline;
- final accepted timeline hash includes the attached plan;
- changing `planSha256` changes `timelineHash`;
- preview and production resolve the same final `timelineHash` and `planSha256`;
- no-event timeline is a normal backward-compatible path.

- [ ] **Step 2: Prove the family lock survived the whole crossing**

A canonically verified CandidateFamily created with `locks: ["topology"]` must be unable to produce an executable topology-event timeline through any supported public API.

Also prove that cloning that family, changing `locks` to `[]`, and retaining the original `familyHash` is rejected before planning.

- [ ] **Step 3: Prove topology addressing survived the whole crossing**

A plan derived for candidate A/topology A cannot be attached to candidate B or rendered over topology B, even if event parameters are otherwise valid.

- [ ] **Step 4: Wire only the accepted timeline**

No audio analysis, lock selection, topology selection, or event generation choice occurs in render.

- [ ] **Step 5: Run focused parity/smoke tests and commit**

Use the closest existing tests discovered during implementation; commit only task-local paths.

---

### Task 6: Full verification and field-witness handoff

**Files:**
- No planned production changes; fixes only if verification exposes task-related defects.

- [ ] **Step 1: Run the root gate**

From repository root:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 2: Run render smoke**

From `src/full-measure` as required by current scripts:

```bash
npm run smoke:render
```

If the exact script name differs on current main, use the repository-declared render smoke command rather than inventing one.

- [ ] **Step 3: Inspect final diff**

Confirm no unintended changes to:

- source audio behavior;
- candidate Creative Verb Kernel;
- CandidateFamily lock/hash semantics;
- Topology Arc semantics;
- Elastic Topology Response semantics;
- topology vocabulary/base values;
- UI unless a later separately approved witness surface requires it;
- package dependencies;
- release/tag state.

- [ ] **Step 4: Produce a human-witness specimen**

Create one deterministic GRAB fixture/render pair demonstrating:

```text
stable
→ local anticipation
→ contact
→ bounded regional pull/stretch
→ local recoil
→ residual local displacement/stretch
→ settle
```

The human gate is qualitative and strict:

> Does this read as one region **grabbing and deforming** visual material, rather than a generic camera move, pan, zoom, or whole-frame wobble?

If it reads as generic pan/zoom, the founding specimen has failed even when determinism tests pass.

Do not claim APERTURE/SPEAK/GROW implemented at this stage.

- [ ] **Step 5: Commit only final task-local corrections**

No empty commit.

---

## Deferred follow-on sequence

After GRAB passes packaged human witness:

1. APERTURE through the same accepted-plan/local-event seam.
2. SPEAK through a bounded explicit seam/emission adapter.
3. GROW with the first persistent strand and visible age-order proof.
4. BODY as choreography that compiles into existing primitive kinds.

Each follow-on gets its own RED tests and must not widen the event-plan grammar unnecessarily.

## Verification-before-completion checklist

Before calling implementation complete:

- CandidateFamily canonical address verification passes;
- stale/tampered family core regression passes;
- CandidateFamily lineage/lock tests pass;
- topology-lock bypass regression passes;
- candidate/timeline score-address mismatch regression passes;
- source-topology mismatch regression passes;
- attached plan changes canonical timeline identity;
- changing `planSha256` changes `timelineHash`;
- focused GRAB local-deformation sampling tests pass;
- anti-pan/zoom regression passes;
- shared topology compiler tests pass;
- no-plan graph compatibility passes;
- frozen topology identity remains intact;
- accepted-plan authority/parity tests pass;
- `npm run verify` passes;
- render smoke passes;
- deterministic local GRAB human witness exists;
- no release/tag/promotion occurred.

## Execution stop

Stop the first implementation after **GRAB** proves the shared seam with all five authority invariants intact:

```text
CandidateFamily core verifies against familyHash before use
locks come from that verified accepted family
plan topology equals accepted timeline topology
plan is inside canonical timeline identity
GRAB is a local deformation, not whole-frame pan/zoom
```

Do not implement all four moments in one pass merely because the contract names them.
