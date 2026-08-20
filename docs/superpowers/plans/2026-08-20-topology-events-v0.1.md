# Topology Events v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove one deterministic `GRAB` topology event end-to-end, through the existing accepted timeline/topology compiler seam, while freezing a four-verb event-plan contract that can later admit APERTURE, SPEAK, and GROW without creating new base topologies.

**Architecture:** Add one pure generation-side topology-event planner and one pure render-side event-expression compiler. The generation plan is addressed with existing canonical helpers and carries no renderer commands. The render adapter compiles only accepted plan evidence and is attached once in `topology-compilers.cjs` alongside the existing elastic topology response. `GRAB` is the only rendered event in the first implementation; APERTURE/SPEAK/GROW remain contract fixtures until GRAB proves the seam.

**Tech Stack:** Node.js/CommonJS, `node:test`, existing canonical hashing helpers, existing ResolvedTimeline/topology compiler/FFmpeg expression path.

**Spec:** `docs/superpowers/specs/2026-08-20-topology-events-v0.1-design.md`

## Global Constraints

- Source issue is #195; parent beta target is #148.
- Policy is exactly `topology-events-v0.1`.
- Plan schema is exactly `haunted-toaster/topology-event-plan/v0.1`.
- Primitive event kinds are exactly `aperture | speak | grab | grow`.
- `body` is never a primitive event kind.
- First executable renderer event is `grab` only.
- Base topology identity remains frozen and unchanged.
- `topology` lock refuses topology-event planning in v0.1.
- Reuse `canonicalStringify`, `hashCanonical`, and `deepFreeze`; no new serializer/hasher.
- No renderer-local randomness, raw audio read, sensor read, model call, clock, filesystem discovery, or hidden mutable event state.
- Existing Topology Arc and Elastic Topology Response semantics remain unchanged.
- Historical artifacts and pinned renderer policies remain compatible.
- Preview and production must share accepted event plan/evidence.
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
src/full-measure/src/render/topology-compilers.cjs
src/full-measure/tests/topology-response-compiler.test.cjs
src/full-measure/tests/timeline-topology-smoke.test.cjs
```

Do not change `generation/topology-arc.cjs` or `render/topology-response.cjs` merely to share the new vocabulary.

---

### Task 1: Freeze and address the topology-event plan contract

**Files:**
- Create: `src/full-measure/src/generation/topology-events.cjs`
- Create: `src/full-measure/tests/topology-events.test.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`

- [ ] **Step 1: Write RED contract tests**

Require exact constants:

```js
TOPOLOGY_EVENT_POLICY === "topology-events-v0.1"
TOPOLOGY_EVENT_PLAN_SCHEMA === "haunted-toaster/topology-event-plan/v0.1"
TOPOLOGY_EVENT_KINDS deepEqual ["aperture", "speak", "grab", "grow"]
```

Use a canonical GRAB fixture:

```js
const grabInput = {
  sourceTopology: "spiral",
  locks: [],
  timebase: 1000,
  durationTicks: 12000,
  events: [{
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
      pull: 0.8,
      recoil: 0.55,
      residualOffsetX: 0.08,
      residualOffsetY: -0.03,
    },
    evidenceRefs: ["fixture:grab-1"],
  }],
};
```

Tests must prove:

- plan is deeply frozen;
- same input deep clone produces same `planSha256`;
- event order normalizes by `prepareTick`, then `id`;
- evidence refs normalize unique/sorted;
- source input remains unchanged;
- `body` is rejected as unsupported event kind;
- unknown keys/accessors/non-plain wrappers fail closed;
- invalid tick order refuses/throws according to representation vs lawful scheduling boundary.

- [ ] **Step 2: Run focused test and verify RED**

```bash
cd src/full-measure
node --test tests/topology-events.test.cjs
```

Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement descriptor-safe exact validation**

Use the same hostile-input posture as current generation primitives:

- plain objects only;
- exact known keys;
- data descriptors only;
- safe integers for all ticks/timebase/duration;
- finite bounded numeric parameters;
- no mutation of caller arrays/objects.

`GRAB` numeric coordinates and signed residual offsets are normalized to six decimal places. `pull` and `recoil` are bounded `0..1`; normalized position values are bounded `0..1`; residual offsets are bounded `-1..1`.

For APERTURE/SPEAK/GROW in Task 1, admit only schema-valid opaque parameter maps with an explicit kind-specific validator placeholder **implemented now**, not a generic arbitrary-object pass-through. Keep their first parameter sets minimal per spec even though they do not render yet.

- [ ] **Step 4: Implement addressed refusal for topology lock**

A valid input containing `locks: ["topology"]` returns a frozen plan with:

```text
eventCount = 0
refusal.reason = topology-lock-prohibits-topology-events
```

The refusal and overall plan are hashed with dedicated canonical domains.

- [ ] **Step 5: Export through generation index and run focused tests**

```bash
node --test tests/topology-events.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add -- src/full-measure/src/generation/topology-events.cjs src/full-measure/src/generation/index.cjs src/full-measure/tests/topology-events.test.cjs
git commit -m "feat: add topology event plan v0.1"
```

---

### Task 2: Compile one GRAB event into deterministic additive expressions

**Files:**
- Create: `src/full-measure/src/render/topology-events.cjs`
- Create: `src/full-measure/tests/topology-event-render.test.cjs`

- [ ] **Step 1: Write RED expression-shape tests**

Import a future:

```js
compileTopologyEvents(timeline)
```

Construct a minimal accepted timeline carrying the normalized GRAB plan under a dedicated non-renderer-private sidecar field selected during implementation from the existing resolved timeline extension pattern. If no lawful extension point exists, stop and upgrade the design before changing canonical schema.

Require output:

```js
{
  evidence: {
    policyVersion: "topology-events-v0.1",
    planSha256,
    eventCount: 1,
    renderedKinds: ["grab"],
  },
  expressions: {
    offsetX: "...",
    offsetY: "...",
    scale: "...",
  },
}
```

No generated expression may include random functions or read undeclared external state.

- [ ] **Step 2: Prove phase behavior numerically before producing FFmpeg strings**

Expose a pure helper:

```js
sampleGrabEvent(event, atTick)
```

Test exact semantic phases:

- before `prepareTick`: all offsets `0`, scale `1`;
- prepare→strike: monotonic movement toward target;
- strike: maximum declared pull;
- strike→release: recoil toward residual offset;
- release→residueUntil: non-zero residual offset remains;
- after residueUntil: offset returns `0`, scale `1`.

This is the primary correctness proof. FFmpeg string tests should verify deterministic compilation, not attempt to prove motion from opaque string comparison alone.

- [ ] **Step 3: Implement piecewise deterministic interpolation**

Use finite arithmetic and existing formatting conventions from `render/topology-response.cjs`. Do not import state from the topology-response module that would couple semantics; local small numeric helpers are acceptable.

The GRAB expression compiler should build additive expressions that can be composed with existing topology response travel rather than replacing it.

- [ ] **Step 4: Verify exact replay**

Deep-cloned identical plan/timeline must yield deep-equal evidence and byte-identical expression strings.

- [ ] **Step 5: Run focused tests and commit**

```bash
node --test tests/topology-event-render.test.cjs
git add -- src/full-measure/src/render/topology-events.cjs src/full-measure/tests/topology-event-render.test.cjs
git commit -m "feat: compile deterministic GRAB topology event"
```

---

### Task 3: Attach topology events once at the shared topology compiler context

**Files:**
- Modify: `src/full-measure/src/render/topology-compilers.cjs`
- Modify: `src/full-measure/tests/topology-response-compiler.test.cjs`
- Modify: `src/full-measure/tests/timeline-topology-smoke.test.cjs`

- [ ] **Step 1: Add RED shared-context tests**

Require the topology context to compile topology events once when accepted event evidence is present.

Do not add GRAB branches to every topology compiler.

The context should expose something like:

```text
context.eventResponse.expressions.offsetX
offsetY
scale
```

with neutral values when no event plan exists.

- [ ] **Step 2: Compose GRAB with existing responsive-frame transform**

At the shared post-topology geometry seam, compose:

```text
existing elastic travel + event offset
existing elastic extent * event scale
```

rather than choosing one system over the other.

If the current filter graph cannot safely express additive composition once, stop and revise the design instead of scattering event-specific filters through topology compilers.

- [ ] **Step 3: Preserve frozen topology identity**

Tests must still prove `frozenTopology(execution)` rejects segment topology drift exactly as before.

A GRAB event never changes `baseState.topology` or segment topology.

- [ ] **Step 4: Prove no-plan compatibility**

For a historical/no-event timeline, generated topology replacement/filter graph must remain byte-identical to current expected output.

- [ ] **Step 5: Prove event-plan graph distinction**

Same base score/timeline with one accepted GRAB plan must produce a deterministic graph distinct from the no-event graph while keeping topology compiler identity unchanged.

- [ ] **Step 6: Run focused topology tests and commit**

```bash
node --test tests/topology-event-render.test.cjs tests/topology-response-compiler.test.cjs tests/timeline-topology-smoke.test.cjs
git add -- src/full-measure/src/render/topology-compilers.cjs src/full-measure/tests/topology-response-compiler.test.cjs src/full-measure/tests/timeline-topology-smoke.test.cjs
git commit -m "feat: route GRAB through shared topology compiler seam"
```

---

### Task 4: Prove accepted-plan authority and preview/production parity seam

**Files:**
- Modify only the smallest existing timeline/sidecar compiler file necessary after Task 2 identifies the lawful extension point.
- Add/modify the closest existing test that already proves preview/production consume the same ResolvedTimeline evidence.

- [ ] **Step 1: Identify the existing extension seam instead of inventing a second timeline**

Inspect:

```text
generation/resolver.cjs
generation/schema.cjs
render/timeline-execution.cjs
render/timeline-preview.cjs
render/sidecars.cjs
```

Select the smallest existing accepted-evidence carrier that can hold the addressed topology event plan without changing historical `VisualScore` meaning.

If this requires a canonical schema version bump, stop and amend the design/issue before coding it.

- [ ] **Step 2: Write RED authority tests**

Prove:

- renderer cannot accept a raw unscheduled event request;
- event plan must arrive through the accepted timeline/evidence seam;
- preview and production resolve the same `planSha256`;
- no event plan is a normal backward-compatible path.

- [ ] **Step 3: Wire only the accepted plan**

No audio analysis or generation choice occurs in render.

- [ ] **Step 4: Run focused parity/smoke tests and commit**

Use the existing relevant test files discovered in Step 1; commit only task-local paths.

---

### Task 5: Full verification and field-witness handoff

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

Confirm no changes to:

- source audio behavior;
- candidate Creative Verb Kernel;
- Topology Arc semantics;
- Elastic Topology Response semantics;
- topology vocabulary/base values;
- UI unless a later separately approved witness surface requires it;
- package dependencies;
- release/tag state.

- [ ] **Step 4: Produce a human-witness specimen**

Create one deterministic GRAB fixture/render pair demonstrating:

```text
stable → anticipation → contact → pull → recoil → residual displacement → settle
```

The human gate is qualitative: does this read as something **happening to** the topology, rather than a generic zoom/pan effect?

Do not claim APERTURE/SPEAK/GROW implemented at this stage.

- [ ] **Step 5: Commit only any final task-local corrections**

No empty commit.

---

## Deferred follow-on sequence

After GRAB passes packaged human witness:

1. APERTURE through the same event-plan/render-expression seam.
2. SPEAK through a bounded explicit seam/emission adapter.
3. GROW with the first persistent strand and visible age-order proof.
4. BODY as choreography that compiles into the existing primitive kinds.

Each follow-on gets its own RED tests and must not widen the event-plan grammar unnecessarily.

## Verification-before-completion checklist

Before calling implementation complete:

- focused generation contract tests pass;
- focused GRAB sampling/expression tests pass;
- shared topology compiler tests pass;
- no-plan graph compatibility passes;
- topology identity remains frozen;
- accepted-plan authority/parity tests pass;
- `npm run verify` passes;
- render smoke passes;
- deterministic human witness exists;
- no release/tag/promotion occurred.

## Execution stop

Stop the first implementation after **GRAB** proves the shared seam. Do not implement all four moments in one pass merely because the contract names them.
