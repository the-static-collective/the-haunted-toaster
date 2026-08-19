# Resonant Disturbance v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the smallest pure Haunted Toaster body-plan evaluator that turns one admitted fixture pressure into deterministic threshold, declared transfer, recoil, terminal, and ordered-history evidence without changing renderer or canonical execution semantics.

**Architecture:** Add one focused CommonJS generation primitive backed by the repository's existing `canonicalStringify`, `hashCanonical`, and `deepFreeze` helpers. The module validates a finite declared body and fixture pressure, evaluates each cell at most once under deterministic cell/coupling ordering and an atomic finite event budget, and returns a frozen addressed plan. Export the primitive through the generation index only; do not touch render, renderer, VSPantry, VisualScore, or ResolvedTimeline code.

**Tech Stack:** Node.js >=22, CommonJS, `node:test`, `node:assert/strict`, existing Haunted Toaster generation canonicalization helpers.

**Spec:** `docs/superpowers/specs/2026-08-19-resonant-disturbance-v0-design.md`

## Global Constraints

- Project issue authority is Haunted Toaster #187.
- Policy identifier is exactly `resonant-disturbance-v0`.
- Body schema is exactly `haunted-toaster/resonant-disturbance-body/v0`.
- Pressure schema is exactly `haunted-toaster/resonant-disturbance-pressure/v0`.
- Plan schema is exactly `haunted-toaster/resonant-disturbance-plan/v0`.
- Event kinds are exactly `pressure | threshold-cross | transfer | recoil | terminal` in v0.
- Terminal dispositions are exactly `settled | exhausted | refused`.
- Load quantities, thresholds, recoil, transfer, pressure amounts, ordinals, and `maxEvents` are safe integers.
- Initial load, recoil, transfer, and pressure are non-negative; thresholds and `maxEvents` are positive.
- Each cell may cross its threshold at most once per v0 evaluation.
- Eligible cells sort by stable cell id; outgoing couplings sort by stable coupling id.
- Threshold packages are atomic with respect to the event budget: no partial transfer/recoil mutation when the complete next package cannot fit.
- Declaration arrays normalize by stable id before hashing; ordered event history never set-normalizes.
- Reuse `canonicalStringify`, `hashCanonical`, and `deepFreeze`; do not add another serializer/hasher.
- No Project0 runtime dependency or shared-library import.
- No files under `src/full-measure/src/render/**`, `src/full-measure/src/renderer/**`, or `src/full-measure/src/video-pantry/**` change.
- No VisualScore or ResolvedTimeline schema change.
- No browser, package, tag, release, or promotion work in this implementation slice.
- Broad verification gate is root `npm run verify`.

---

## File Structure

Create one focused implementation module and one focused test file first:

```text
src/full-measure/src/generation/resonant-disturbance.cjs
src/full-measure/tests/resonant-disturbance.test.cjs
```

Modify only the public generation export surface after the primitive is green:

```text
src/full-measure/src/generation/index.cjs
```

Do not split validation/addressing into additional files unless the first implementation demonstrably becomes harder to review than the surrounding generation modules. This v0 is one primitive, not a framework.

---

### Task 1: Freeze the contract, validation, normalization, and canonical identity

**Files:**
- Create: `src/full-measure/src/generation/resonant-disturbance.cjs`
- Create: `src/full-measure/tests/resonant-disturbance.test.cjs`

**Interfaces:**
- Consumes: `canonicalStringify`, `hashCanonical`, `deepFreeze` from `src/full-measure/src/generation/canonical.cjs`.
- Produces: `RESONANT_DISTURBANCE_POLICY`, schema constants, `normalizeDisturbanceBody(body)`, `normalizeDisturbancePressure(pressure)`, `hashDisturbanceBody(body)`, and `hashDisturbancePressure(pressure)`.

- [ ] **Step 1: Write RED contract tests**

Create `src/full-measure/tests/resonant-disturbance.test.cjs` with imports that do not exist yet:

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DISTURBANCE_BODY_SCHEMA,
  DISTURBANCE_PLAN_SCHEMA,
  DISTURBANCE_PRESSURE_SCHEMA,
  RESONANT_DISTURBANCE_POLICY,
  hashDisturbanceBody,
  hashDisturbancePressure,
  normalizeDisturbanceBody,
  normalizeDisturbancePressure,
} = require("../src/generation/resonant-disturbance.cjs");

const canonicalBody = {
  schema: "haunted-toaster/resonant-disturbance-body/v0",
  policyVersion: "resonant-disturbance-v0",
  bodyId: "specimen-three-cell",
  cells: [
    { id: "A", initialLoad: 0, threshold: 5, recoil: 5 },
    { id: "B", initialLoad: 4, threshold: 7, recoil: 7 },
    { id: "C", initialLoad: 2, threshold: 6, recoil: 6 },
  ],
  couplings: [
    { id: "AB", sourceCellId: "A", targetCellId: "B", transfer: 3 },
    { id: "BC", sourceCellId: "B", targetCellId: "C", transfer: 4 },
  ],
  maxEvents: 16,
};

const canonicalPressure = {
  schema: "haunted-toaster/resonant-disturbance-pressure/v0",
  policyVersion: "resonant-disturbance-v0",
  sourceRef: "fixture:pressure-A-5",
  targetCellId: "A",
  amount: 5,
  authority: "fixture",
};

test("freezes the exact v0 identifiers", () => {
  assert.equal(RESONANT_DISTURBANCE_POLICY, "resonant-disturbance-v0");
  assert.equal(DISTURBANCE_BODY_SCHEMA, "haunted-toaster/resonant-disturbance-body/v0");
  assert.equal(DISTURBANCE_PRESSURE_SCHEMA, "haunted-toaster/resonant-disturbance-pressure/v0");
  assert.equal(DISTURBANCE_PLAN_SCHEMA, "haunted-toaster/resonant-disturbance-plan/v0");
});

test("normalizes declaration order before hashing", () => {
  const reordered = structuredClone(canonicalBody);
  reordered.cells.reverse();
  reordered.couplings.reverse();
  assert.deepEqual(normalizeDisturbanceBody(reordered), normalizeDisturbanceBody(canonicalBody));
  assert.equal(hashDisturbanceBody(reordered), hashDisturbanceBody(canonicalBody));
});

test("normalizes and hashes one fixture pressure", () => {
  const pressure = normalizeDisturbancePressure(canonicalPressure);
  assert.equal(pressure.authority, "fixture");
  assert.match(hashDisturbancePressure(pressure), /^[0-9a-f]{64}$/);
});
```

Add validation cases requiring rejection of:

```js
[
  { mutate: (body) => { body.cells[0].threshold = 0; }, pattern: /threshold/i },
  { mutate: (body) => { body.cells[0].initialLoad = -1; }, pattern: /initialLoad/i },
  { mutate: (body) => { body.maxEvents = 0; }, pattern: /maxEvents/i },
  { mutate: (body) => { body.cells[1].id = "A"; }, pattern: /duplicate cell/i },
  { mutate: (body) => { body.couplings[0].targetCellId = "Z"; }, pattern: /undeclared.*target/i },
  { mutate: (body) => { body.couplings[1].id = "AB"; }, pattern: /duplicate coupling/i },
]
```

Also require unknown top-level/body-cell/coupling/pressure fields to fail closed rather than be ignored.

- [ ] **Step 2: Run the focused test and verify RED**

Run from repository root:

```bash
cd src/full-measure
node --test tests/resonant-disturbance.test.cjs
```

Expected: FAIL because `../src/generation/resonant-disturbance.cjs` does not exist.

- [ ] **Step 3: Implement exact constants and descriptor-safe plain-object admission**

Create `src/full-measure/src/generation/resonant-disturbance.cjs` beginning with:

```js
const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");

const RESONANT_DISTURBANCE_POLICY = "resonant-disturbance-v0";
const DISTURBANCE_BODY_SCHEMA = "haunted-toaster/resonant-disturbance-body/v0";
const DISTURBANCE_PRESSURE_SCHEMA = "haunted-toaster/resonant-disturbance-pressure/v0";
const DISTURBANCE_PLAN_SCHEMA = "haunted-toaster/resonant-disturbance-plan/v0";
const DISTURBANCE_EVENT_KINDS = Object.freeze([
  "pressure",
  "threshold-cross",
  "transfer",
  "recoil",
  "terminal",
]);
const DISTURBANCE_TERMINALS = Object.freeze(["settled", "exhausted", "refused"]);
```

Implement local helpers that inspect property descriptors rather than reading accessors from hostile input:

```js
function ownDataValue(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !Object.hasOwn(descriptor, "value")) {
    throw new TypeError(`Expected data property ${key}.`);
  }
  return descriptor.value;
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value;
}
```

Do not call `structuredClone` on unvalidated hostile wrappers before descriptor-safe admission.

- [ ] **Step 4: Implement safe-integer and exact-key validation**

Add helpers:

```js
function assertSafeInteger(value, label, { positive = false, nonNegative = false } = {}) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be a safe integer.`);
  if (positive && value <= 0) throw new TypeError(`${label} must be positive.`);
  if (nonNegative && value < 0) throw new TypeError(`${label} must be non-negative.`);
  return value;
}

function assertExactKeys(object, allowed, label) {
  for (const key of Reflect.ownKeys(object)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw new TypeError(`${label} contains unknown field ${String(key)}.`);
    }
  }
}
```

Use exact allowed sets:

```js
const BODY_KEYS = new Set(["schema", "policyVersion", "bodyId", "cells", "couplings", "maxEvents"]);
const CELL_KEYS = new Set(["id", "initialLoad", "threshold", "recoil"]);
const COUPLING_KEYS = new Set(["id", "sourceCellId", "targetCellId", "transfer"]);
const PRESSURE_KEYS = new Set(["schema", "policyVersion", "sourceRef", "targetCellId", "amount", "authority"]);
```

Accept pressure authority exactly from:

```js
const PRESSURE_AUTHORITIES = new Set(["fixture", "testimony-only", "influence-only"]);
```

v0 tests use only `fixture`; keeping the two future adapter labels in the envelope does not authorize those adapters.

- [ ] **Step 5: Normalize body and pressure deterministically**

`normalizeDisturbanceBody(body)` must:

1. admit a plain object without accessors;
2. require exact schema/policy strings;
3. require a non-empty `bodyId`;
4. require non-empty arrays of cells, while couplings may be empty;
5. validate each cell/coupling object and exact keys;
6. reject duplicate cell or coupling IDs;
7. reject undeclared source/target cell IDs;
8. sort cloned normalized cells by `id`;
9. sort cloned normalized couplings by `id`;
10. return `deepFreeze(...)` of the normalized body.

`normalizeDisturbancePressure(pressure)` must require an exact schema/policy, non-empty sourceRef, declared-looking target id string, non-negative safe integer amount, and allowed authority label.

Do not validate that the target cell exists until `runResonantDisturbance(body, pressure)` has both admitted inputs.

- [ ] **Step 6: Implement canonical hashes using existing helpers**

Use:

```js
function hashDisturbanceBody(body) {
  return hashCanonical(
    normalizeDisturbanceBody(body),
    "HauntedToaster-ResonantDisturbanceBody-v0",
  );
}

function hashDisturbancePressure(pressure) {
  return hashCanonical(
    normalizeDisturbancePressure(pressure),
    "HauntedToaster-ResonantDisturbancePressure-v0",
  );
}
```

Export the constants/functions needed by the tests.

- [ ] **Step 7: Run focused tests and verify GREEN**

```bash
cd src/full-measure
node --test tests/resonant-disturbance.test.cjs
```

Expected: all contract, normalization, exact-field, hostile-representation, and hash tests pass.

- [ ] **Step 8: Commit the contract slice**

```bash
git add src/full-measure/src/generation/resonant-disturbance.cjs src/full-measure/tests/resonant-disturbance.test.cjs
git commit -m "feat: define Resonant Disturbance v0 contract"
```

---

### Task 2: Implement the pure threshold, transfer, recoil, and terminal evaluator

**Files:**
- Modify: `src/full-measure/src/generation/resonant-disturbance.cjs`
- Modify: `src/full-measure/tests/resonant-disturbance.test.cjs`

**Interfaces:**
- Consumes: normalized body/pressure and existing hash helpers from Task 1.
- Produces: `runResonantDisturbance(body, pressure): ResonantDisturbancePlan`.

- [ ] **Step 1: Add the RED canonical cascade test**

Extend the test file:

```js
const {
  runResonantDisturbance,
} = require("../src/generation/resonant-disturbance.cjs");

test("runs the canonical three-cell pressure cascade", () => {
  const plan = runResonantDisturbance(canonicalBody, canonicalPressure);

  assert.equal(plan.schema, DISTURBANCE_PLAN_SCHEMA);
  assert.equal(plan.policyVersion, RESONANT_DISTURBANCE_POLICY);
  assert.equal(plan.terminal.disposition, "settled");
  assert.deepEqual(plan.finalState.loads, { A: 0, B: 0, C: 0 });
  assert.deepEqual(
    plan.events.map((event) => event.kind),
    [
      "pressure",
      "threshold-cross",
      "transfer",
      "recoil",
      "threshold-cross",
      "transfer",
      "recoil",
      "threshold-cross",
      "recoil",
      "terminal",
    ],
  );
  assert.deepEqual(plan.finalState.crossedCellIds, ["A", "B", "C"]);
  assert.match(plan.planSha256, /^[0-9a-f]{64}$/);
});
```

Add a below-threshold fixture:

```js
test("settles below threshold without fabricated transfer", () => {
  const pressure = { ...canonicalPressure, sourceRef: "fixture:pressure-A-4", amount: 4 };
  const plan = runResonantDisturbance(canonicalBody, pressure);
  assert.equal(plan.terminal.disposition, "settled");
  assert.deepEqual(plan.events.map((event) => event.kind), ["pressure", "terminal"]);
  assert.deepEqual(plan.finalState.loads, { A: 4, B: 4, C: 2 });
});
```

- [ ] **Step 2: Run focused test and verify RED**

```bash
cd src/full-measure
node --test tests/resonant-disturbance.test.cjs
```

Expected: FAIL because `runResonantDisturbance` is absent.

- [ ] **Step 3: Add checked arithmetic and event construction**

Implement:

```js
function checkedAdd(left, right, label) {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new TypeError(`${label} exceeded safe integer bounds.`);
  return result;
}

function event(ordinal, kind, body) {
  const core = { ordinal, kind, ...body };
  return deepFreeze({
    ...core,
    eventSha256: hashCanonical(core, "HauntedToaster-ResonantDisturbanceEvent-v0"),
  });
}
```

Every event ordinal starts at `0` and increments exactly once per admitted event.

- [ ] **Step 4: Admit pressure atomically**

Inside `runResonantDisturbance(bodyInput, pressureInput)`:

1. normalize both inputs;
2. reject a pressure target that is not a declared cell;
3. copy initial loads into a plain local object keyed by sorted cell IDs;
4. create `crossed = new Set()`;
5. create `events = []`;
6. before mutation, ensure the pressure event fits `maxEvents`;
7. append one `pressure` event naming `sourceRef`, `targetCellId`, `amount`, and previous/post load;
8. then apply the load mutation.

If the pressure event itself cannot fit, return a valid plan with only one `terminal` event when possible and disposition `exhausted`; if even the terminal cannot fit under malformedly tiny `maxEvents`, validation should already have prevented the impossible contract by requiring `maxEvents >= 2` rather than merely positive. Update Task 1 validation accordingly and add a regression test for `maxEvents: 1` rejection.

- [ ] **Step 5: Resolve deterministic threshold packages**

At each frontier recomputation:

```js
const eligible = body.cells
  .filter((cell) => !crossed.has(cell.id) && loads[cell.id] >= cell.threshold)
  .sort((a, b) => a.id.localeCompare(b.id));
```

Take the first eligible cell only, build its **complete** next package before mutating:

```text
threshold-cross
all outgoing transfer events in coupling-id order
recoil
```

Outgoing couplings:

```js
const outgoing = body.couplings
  .filter((coupling) => coupling.sourceCellId === cell.id)
  .sort((a, b) => a.id.localeCompare(b.id));
```

Calculate package event count first. Reserve one final terminal slot throughout evaluation:

```js
const remainingNonTerminalBudget = body.maxEvents - events.length - 1;
if (packageSize > remainingNonTerminalBudget) {
  // do not mutate threshold, transfers, crossed set, or recoil
  break as exhausted
}
```

This is the atomicity boundary.

- [ ] **Step 6: Preserve real causal references**

Each `threshold-cross` event records:

```js
{
  cellId,
  threshold,
  loadBefore,
  causeEventOrdinal,
}
```

For a cell loaded directly by the fixture, `causeEventOrdinal` points to the pressure event. For a cell made eligible by transfer, it points to the last transfer event that raised it to or beyond threshold.

Track `lastLoadCauseOrdinal[cellId]` whenever pressure/transfer changes a load.

Each transfer event records:

```js
{
  couplingId,
  sourceCellId,
  targetCellId,
  amount,
  targetLoadBefore,
  targetLoadAfter,
  causeEventOrdinal: thresholdEvent.ordinal,
}
```

Each recoil event records:

```js
{
  cellId,
  amount: cell.recoil,
  loadBefore,
  loadAfter,
  causeEventOrdinal: thresholdEvent.ordinal,
}
```

Recoil uses:

```js
loads[cell.id] = Math.max(0, loads[cell.id] - cell.recoil);
```

The non-negative clamp is explicit v0 policy; add it to the module constant/evidence rather than relying on an implicit JavaScript behavior.

- [ ] **Step 7: Finalize one terminal event and canonical plan**

After no eligible uncrossed cells remain, disposition is `settled`.

After a complete next package is eligible but cannot fit, disposition is `exhausted`.

Return:

```js
const core = {
  schema: DISTURBANCE_PLAN_SCHEMA,
  policyVersion: RESONANT_DISTURBANCE_POLICY,
  bodyHash: hashDisturbanceBody(body),
  pressureHash: hashDisturbancePressure(pressure),
  events,
  finalState: {
    loads: Object.fromEntries(body.cells.map((cell) => [cell.id, loads[cell.id]])),
    crossedCellIds: [...crossed].sort(),
  },
  terminal: {
    disposition,
    reason: disposition === "exhausted" ? "event-budget-cannot-admit-next-package" : "no-eligible-uncrossed-cell",
  },
};
```

Append the terminal event **before** hashing the plan so terminal history is part of identity. The returned `terminal` summary must agree with the final terminal event.

Then:

```js
return deepFreeze({
  ...coreWithTerminalEvent,
  planSha256: hashCanonical(coreWithTerminalEvent, "HauntedToaster-ResonantDisturbancePlan-v0"),
});
```

Do not include `canonicalJson` unless a current nearby generation primitive demonstrably requires it; `planSha256` plus frozen structured evidence is sufficient for v0.

- [ ] **Step 8: Run focused tests and verify GREEN**

```bash
cd src/full-measure
node --test tests/resonant-disturbance.test.cjs
```

Expected: canonical cascade and below-threshold cases pass.

- [ ] **Step 9: Commit the evaluator slice**

```bash
git add src/full-measure/src/generation/resonant-disturbance.cjs src/full-measure/tests/resonant-disturbance.test.cjs
git commit -m "feat: evaluate bounded resonant disturbance"
```

---

### Task 3: Prove cycles, event-budget atomicity, history identity, replay, and hostile boundaries

**Files:**
- Modify: `src/full-measure/tests/resonant-disturbance.test.cjs`
- Modify: `src/full-measure/src/generation/resonant-disturbance.cjs` only for bugs exposed by RED tests

**Interfaces:**
- Consumes: `runResonantDisturbance` from Task 2.
- Produces: adversarial and historical proof that v0 cannot invent topology, partially mutate an exhausted package, erase causal history, or diverge under replay.

- [ ] **Step 1: Add RED cycle termination proof**

Add:

```js
test("declared cycles terminate because each cell crosses at most once", () => {
  const body = {
    ...structuredClone(canonicalBody),
    bodyId: "cycle-A-B-A",
    cells: [
      { id: "A", initialLoad: 0, threshold: 5, recoil: 5 },
      { id: "B", initialLoad: 0, threshold: 3, recoil: 3 },
    ],
    couplings: [
      { id: "AB", sourceCellId: "A", targetCellId: "B", transfer: 3 },
      { id: "BA", sourceCellId: "B", targetCellId: "A", transfer: 5 },
    ],
    maxEvents: 16,
  };
  const plan = runResonantDisturbance(body, canonicalPressure);
  assert.equal(plan.terminal.disposition, "settled");
  assert.deepEqual(plan.finalState.crossedCellIds, ["A", "B"]);
  assert.equal(plan.events.filter((event) => event.kind === "threshold-cross").length, 2);
});
```

- [ ] **Step 2: Add RED atomic exhaustion proof**

Create a body where after the pressure event, A is eligible and its complete package requires three events (`threshold-cross`, one `transfer`, `recoil`) but the remaining non-terminal budget allows only two.

Assert:

```js
assert.equal(plan.terminal.disposition, "exhausted");
assert.deepEqual(plan.finalState.crossedCellIds, []);
assert.equal(plan.finalState.loads.A, 5);
assert.equal(plan.finalState.loads.B, 4);
assert.deepEqual(plan.events.map((event) => event.kind), ["pressure", "terminal"]);
```

No partial threshold/transfer/recoil may appear.

- [ ] **Step 3: Add RED same-final-state / different-history identity proof**

Construct two valid bodies that end with the same load vector:

- body 1: canonical path;
- body 2: add a declared zero-transfer coupling `CZ` from C back to A with `transfer: 0` and enough budget.

Because C crosses, body 2 emits one additional transfer event while final loads remain `{ A: 0, B: 0, C: 0 }`.

Assert:

```js
assert.deepEqual(plan1.finalState.loads, plan2.finalState.loads);
assert.notDeepEqual(plan1.events, plan2.events);
assert.notEqual(plan1.planSha256, plan2.planSha256);
```

The body hashes will also differ because the declared envelope differs; the test still proves final current state is not historical identity. Add a second contrast using the **same body** with two pressure fixtures that produce the same final loads but distinct source refs/amount histories if a simple deterministic fixture exists without widening v0 rules. If no such fixture exists, keep the body-envelope contrast and state the narrower proof in the test name.

- [ ] **Step 4: Add RED replay and immutability proof**

```js
test("deep-cloned identical inputs replay byte-equivalent plan evidence", () => {
  const first = runResonantDisturbance(structuredClone(canonicalBody), structuredClone(canonicalPressure));
  const second = runResonantDisturbance(structuredClone(canonicalBody), structuredClone(canonicalPressure));
  assert.equal(first.planSha256, second.planSha256);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.events), true);
});
```

Also snapshot the original input JSON before evaluation and assert it is unchanged afterward.

- [ ] **Step 5: Add hostile accessor and undeclared-target pressure tests**

Accessor test:

```js
test("rejects accessor-backed body wrapper without executing getter", () => {
  let touched = false;
  const hostile = {};
  Object.defineProperty(hostile, "schema", {
    enumerable: true,
    get() {
      touched = true;
      return DISTURBANCE_BODY_SCHEMA;
    },
  });
  assert.throws(() => normalizeDisturbanceBody(hostile), /data property|plain object/i);
  assert.equal(touched, false);
});
```

Pressure target test:

```js
test("refuses pressure aimed outside the declared body before mutation", () => {
  const pressure = { ...canonicalPressure, targetCellId: "Z", sourceRef: "fixture:undeclared-Z" };
  assert.throws(() => runResonantDisturbance(canonicalBody, pressure), /undeclared.*target/i);
});
```

This is structural admission failure, not a `refused` runtime terminal, because execution never lawfully began.

- [ ] **Step 6: Run focused tests and fix only demonstrated defects**

```bash
cd src/full-measure
node --test tests/resonant-disturbance.test.cjs
```

Expected: GREEN after any narrowly required evaluator corrections.

Do not add repeated snaps, dynamic thresholds, deactivation, arbitrary refusal taxonomies, or generalized graph utilities to satisfy these tests.

- [ ] **Step 7: Commit the hardening slice**

```bash
git add src/full-measure/src/generation/resonant-disturbance.cjs src/full-measure/tests/resonant-disturbance.test.cjs
git commit -m "test: harden resonant disturbance history"
```

---

### Task 4: Export the public seam and run repository verification

**Files:**
- Modify: `src/full-measure/src/generation/index.cjs`
- Test: `src/full-measure/tests/resonant-disturbance.test.cjs`

**Interfaces:**
- Consumes: completed primitive from Tasks 1-3.
- Produces: bounded public generation export for later explicit adapters; no renderer integration.

- [ ] **Step 1: Add RED public export test**

Inspect the current `src/full-measure/src/generation/index.cjs` export style, then add a test that imports the public generation entry and requires the exact seam:

```js
const generation = require("../src/generation/index.cjs");

assert.equal(typeof generation.resonantDisturbance.runResonantDisturbance, "function");
assert.equal(
  generation.resonantDisturbance.RESONANT_DISTURBANCE_POLICY,
  "resonant-disturbance-v0",
);
```

Use a single namespace export `resonantDisturbance` rather than spraying every helper into the top-level generation API.

- [ ] **Step 2: Run focused test and verify RED**

```bash
cd src/full-measure
node --test tests/resonant-disturbance.test.cjs
```

Expected: FAIL because the public namespace export does not yet exist.

- [ ] **Step 3: Add the narrow public export**

Modify `src/full-measure/src/generation/index.cjs` following its current style:

```js
const resonantDisturbance = require("./resonant-disturbance.cjs");
```

and include:

```js
resonantDisturbance,
```

in the exported object.

Do not wire the module into candidate generation, resolver, timeline attachment, topology arc, Creative Context, Video, or renderer paths.

- [ ] **Step 4: Run focused test GREEN**

```bash
cd src/full-measure
node --test tests/resonant-disturbance.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Run the Full Measure check and complete test suite**

```bash
cd src/full-measure
npm run check
npm test
```

Expected: PASS with the new resonant-disturbance test included in the standard `tests/*.test.cjs` suite.

- [ ] **Step 6: Run smoke proofs**

```bash
cd src/full-measure
npm run smoke
```

Expected: production render smoke and candidate smoke remain unchanged and PASS. This is important precisely because v0 should have no render or candidate behavior.

- [ ] **Step 7: Run the root repository gate**

From repository root:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 8: Audit the final diff for forbidden scope**

Require the final changed implementation paths to be limited to:

```text
src/full-measure/src/generation/resonant-disturbance.cjs
src/full-measure/src/generation/index.cjs
src/full-measure/tests/resonant-disturbance.test.cjs
```

plus the already-landed design/plan docs on the implementation branch if they are carried forward.

Explicitly verify no changed path begins with:

```text
src/full-measure/src/render/
src/full-measure/src/renderer/
src/full-measure/src/video-pantry/
```

and no schema file for VisualScore or ResolvedTimeline changed.

- [ ] **Step 9: Commit the public seam**

```bash
git add src/full-measure/src/generation/index.cjs src/full-measure/tests/resonant-disturbance.test.cjs
git commit -m "feat: export Resonant Disturbance v0"
```

---

## PR Acceptance Evidence

The implementation PR must report:

```text
focused resonant-disturbance tests: PASS
Full Measure check: PASS
Full Measure complete tests: PASS
render smoke: PASS
candidate smoke: PASS
root npm run verify: PASS
renderer files changed: 0
renderer UI files changed: 0
VSPantry files changed: 0
VisualScore schema changed: no
ResolvedTimeline schema changed: no
Project0 runtime dependency added: no
```

No browser witness or packaged Windows artifact is required unless the implementation unexpectedly changes a UI/runtime/package path. If that happens, stop and split the unexpected behavior-changing work rather than silently widening this PR.

## Self-Review Checklist

Before implementation begins, verify this plan covers every v0 requirement from the spec:

- exact versioned schemas/policy: Task 1;
- safe integers and fail-closed declared envelope: Task 1;
- deterministic order: Tasks 1-2;
- threshold/transfer/recoil: Task 2;
- causal references: Task 2;
- one-cross-per-cell cycle bound: Tasks 2-3;
- atomic event budget: Tasks 2-3;
- current state distinct from history: Task 3;
- replay/immutability: Task 3;
- hostile representation: Tasks 1 and 3;
- bounded public export only: Task 4;
- no renderer/canonical execution widening: Task 4;
- broad repository verification: Task 4.

No implementation task authorizes Specimen Pulse projection, Ghosted Topology Coupling, MOLT, STRIDE, Witness Sigils, release, or promotion.

## Stop Condition

Stop after one verified pure-data implementation PR can truthfully show:

> **One finite declared Toaster body received one fixture pressure, crossed only declared thresholds, transferred load only through declared couplings, recoiled without erasing history, terminated under a finite budget, replayed exactly, and changed no render behavior.**

Any visible coupling is a separate future issue/PR behind the existing execution gates.