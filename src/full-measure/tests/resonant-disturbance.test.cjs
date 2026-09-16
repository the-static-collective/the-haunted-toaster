const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DISTURBANCE_BODY_SCHEMA, DISTURBANCE_PLAN_SCHEMA, DISTURBANCE_PRESSURE_SCHEMA,
  RESONANT_DISTURBANCE_POLICY, hashDisturbanceBody, hashDisturbancePressure,
  normalizeDisturbanceBody, normalizeDisturbancePressure, runResonantDisturbance,
} = require("../src/generation/resonant-disturbance.cjs");

const canonicalBody = {
  schema: "haunted-toaster/resonant-disturbance-body/v0", policyVersion: "resonant-disturbance-v0",
  bodyId: "specimen-three-cell",
  cells: [
    { id: "A", initialLoad: 0, threshold: 5, recoil: 5 },
    { id: "B", initialLoad: 4, threshold: 7, recoil: 7 },
    { id: "C", initialLoad: 2, threshold: 6, recoil: 6 },
  ],
  couplings: [
    { id: "AB", sourceCellId: "A", targetCellId: "B", transfer: 3 },
    { id: "BC", sourceCellId: "B", targetCellId: "C", transfer: 4 },
  ], maxEvents: 16,
};
const canonicalPressure = {
  schema: "haunted-toaster/resonant-disturbance-pressure/v0", policyVersion: "resonant-disturbance-v0",
  sourceRef: "fixture:pressure-A-5", targetCellId: "A", amount: 5, authority: "fixture",
};

test("freezes the exact v0 identifiers", () => {
  assert.equal(RESONANT_DISTURBANCE_POLICY, "resonant-disturbance-v0");
  assert.equal(DISTURBANCE_BODY_SCHEMA, "haunted-toaster/resonant-disturbance-body/v0");
  assert.equal(DISTURBANCE_PRESSURE_SCHEMA, "haunted-toaster/resonant-disturbance-pressure/v0");
  assert.equal(DISTURBANCE_PLAN_SCHEMA, "haunted-toaster/resonant-disturbance-plan/v0");
});

test("runs the canonical three-cell pressure cascade", () => {
  const plan = runResonantDisturbance(canonicalBody, canonicalPressure);
  assert.equal(plan.schema, DISTURBANCE_PLAN_SCHEMA);
  assert.equal(plan.policyVersion, RESONANT_DISTURBANCE_POLICY);
  assert.equal(plan.terminal.disposition, "settled");
  assert.deepEqual(plan.finalState.loads, { A: 0, B: 0, C: 0 });
  assert.deepEqual(plan.events.map(({ kind }) => kind), [
    "pressure", "threshold-cross", "transfer", "recoil", "threshold-cross",
    "transfer", "recoil", "threshold-cross", "recoil", "terminal",
  ]);
  assert.deepEqual(plan.finalState.crossedCellIds, ["A", "B", "C"]);
  assert.match(plan.planSha256, /^[0-9a-f]{64}$/);
  assert.equal(plan.events[1].causeEventOrdinal, 0);
  assert.equal(plan.events[4].causeEventOrdinal, 2);
  assert.equal(plan.events[7].causeEventOrdinal, 5);
  assert.ok(Object.isFrozen(plan));
});

test("settles below threshold without fabricated transfer", () => {
  const pressure = { ...canonicalPressure, sourceRef: "fixture:pressure-A-4", amount: 4 };
  const plan = runResonantDisturbance(canonicalBody, pressure);
  assert.equal(plan.terminal.disposition, "settled");
  assert.deepEqual(plan.events.map(({ kind }) => kind), ["pressure", "terminal"]);
  assert.deepEqual(plan.finalState.loads, { A: 4, B: 4, C: 2 });
});

test("refuses valid non-fixture authority without executing pressure", () => {
  for (const authority of ["testimony-only", "influence-only"]) {
    const plan = runResonantDisturbance(canonicalBody, { ...canonicalPressure, authority });
    assert.equal(plan.terminal.disposition, "refused");
    assert.deepEqual(plan.events.map(({ kind }) => kind), ["terminal"]);
    assert.deepEqual(plan.finalState.loads, { A: 0, B: 4, C: 2 });
    assert.deepEqual(plan.finalState.crossedCellIds, []);
  }
});

test("exhausts without partially applying an unaffordable threshold package", () => {
  const body = { ...canonicalBody, maxEvents: 5 };
  const plan = runResonantDisturbance(body, canonicalPressure);
  assert.equal(plan.terminal.disposition, "exhausted");
  assert.deepEqual(plan.events.map(({ kind }) => kind), ["pressure", "threshold-cross", "transfer", "recoil", "terminal"]);
  assert.deepEqual(plan.finalState.loads, { A: 0, B: 7, C: 2 });
  assert.deepEqual(plan.finalState.crossedCellIds, ["A"]);
});

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

test("exhaustion leaves an unaffordable first threshold package wholly unapplied", () => {
  const body = {
    ...structuredClone(canonicalBody),
    bodyId: "atomic-first-package",
    cells: [
      { id: "A", initialLoad: 0, threshold: 5, recoil: 5 },
      { id: "B", initialLoad: 4, threshold: 7, recoil: 7 },
    ],
    couplings: [
      { id: "AB", sourceCellId: "A", targetCellId: "B", transfer: 3 },
    ],
    maxEvents: 4,
  };
  const plan = runResonantDisturbance(body, canonicalPressure);
  assert.equal(plan.terminal.disposition, "exhausted");
  assert.deepEqual(plan.finalState.crossedCellIds, []);
  assert.deepEqual(plan.finalState.loads, { A: 5, B: 4 });
  assert.deepEqual(plan.events.map((event) => event.kind), ["pressure", "terminal"]);
});

test("the same final state is not historical identity across body envelopes", () => {
  const bodyWithZeroTransfer = structuredClone(canonicalBody);
  bodyWithZeroTransfer.bodyId = "specimen-three-cell-with-zero-transfer";
  bodyWithZeroTransfer.couplings.push({
    id: "CZ", sourceCellId: "C", targetCellId: "A", transfer: 0,
  });
  const canonicalPlan = runResonantDisturbance(canonicalBody, canonicalPressure);
  const zeroTransferPlan = runResonantDisturbance(bodyWithZeroTransfer, canonicalPressure);
  assert.deepEqual(canonicalPlan.finalState.loads, zeroTransferPlan.finalState.loads);
  assert.notDeepEqual(canonicalPlan.events, zeroTransferPlan.events);
  assert.notEqual(canonicalPlan.planSha256, zeroTransferPlan.planSha256);
});

test("the same body and final state retain distinct pressure source history", () => {
  const alternatePressure = { ...canonicalPressure, sourceRef: "fixture:alternate-A-5" };
  const canonicalPlan = runResonantDisturbance(canonicalBody, canonicalPressure);
  const alternatePlan = runResonantDisturbance(canonicalBody, alternatePressure);
  assert.deepEqual(canonicalPlan.finalState, alternatePlan.finalState);
  assert.notDeepEqual(canonicalPlan.events, alternatePlan.events);
  assert.notEqual(canonicalPlan.pressureHash, alternatePlan.pressureHash);
  assert.notEqual(canonicalPlan.planSha256, alternatePlan.planSha256);
});

test("deep-cloned identical inputs replay byte-equivalent immutable plan evidence", () => {
  const body = structuredClone(canonicalBody);
  const pressure = structuredClone(canonicalPressure);
  const bodyBefore = JSON.stringify(body);
  const pressureBefore = JSON.stringify(pressure);
  const first = runResonantDisturbance(body, pressure);
  const second = runResonantDisturbance(structuredClone(canonicalBody), structuredClone(canonicalPressure));
  assert.equal(first.planSha256, second.planSha256);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(JSON.stringify(body), bodyBefore);
  assert.equal(JSON.stringify(pressure), pressureBefore);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.events), true);
  assert.equal(Object.isFrozen(first.events[0]), true);
  assert.equal(Object.isFrozen(first.finalState), true);
  assert.equal(Object.isFrozen(first.finalState.loads), true);
});

test("rejects an undeclared pressure target and arithmetic overflow", () => {
  assert.throws(() => runResonantDisturbance(canonicalBody, { ...canonicalPressure, targetCellId: "Z" }), /undeclared.*target/i);
  const body = structuredClone(canonicalBody);
  body.cells[0].initialLoad = Number.MAX_SAFE_INTEGER;
  assert.throws(() => runResonantDisturbance(body, canonicalPressure), /safe integer bounds/i);
});

test("normalizes declaration order before hashing and freezes the clone", () => {
  const reordered = structuredClone(canonicalBody);
  reordered.cells.reverse(); reordered.couplings.reverse();
  const normalized = normalizeDisturbanceBody(reordered);
  assert.deepEqual(normalized, normalizeDisturbanceBody(canonicalBody));
  assert.equal(hashDisturbanceBody(reordered), hashDisturbanceBody(canonicalBody));
  assert.ok(Object.isFrozen(normalized)); assert.ok(Object.isFrozen(normalized.cells));
  assert.ok(Object.isFrozen(normalized.cells[0])); assert.notEqual(normalized, reordered);
});

test("normalizes and hashes one fixture pressure", () => {
  const pressure = normalizeDisturbancePressure(canonicalPressure);
  assert.equal(pressure.authority, "fixture"); assert.ok(Object.isFrozen(pressure));
  assert.notEqual(pressure, canonicalPressure);
  assert.match(hashDisturbancePressure(pressure), /^[0-9a-f]{64}$/);
});

for (const { name, mutate, pattern } of [
  { name: "zero threshold", mutate: (b) => { b.cells[0].threshold = 0; }, pattern: /threshold/i },
  { name: "negative initial load", mutate: (b) => { b.cells[0].initialLoad = -1; }, pattern: /initialLoad/i },
  { name: "event budget below two", mutate: (b) => { b.maxEvents = 1; }, pattern: /maxEvents/i },
  { name: "duplicate cell", mutate: (b) => { b.cells[1].id = "A"; }, pattern: /duplicate cell/i },
  { name: "undeclared target", mutate: (b) => { b.couplings[0].targetCellId = "Z"; }, pattern: /undeclared.*target/i },
  { name: "undeclared source", mutate: (b) => { b.couplings[0].sourceCellId = "Z"; }, pattern: /undeclared.*source/i },
  { name: "duplicate coupling", mutate: (b) => { b.couplings[1].id = "AB"; }, pattern: /duplicate coupling/i },
]) test(`rejects ${name}`, () => { const body = structuredClone(canonicalBody); mutate(body); assert.throws(() => normalizeDisturbanceBody(body), pattern); });

test("fails closed on unknown fields at every object boundary", () => {
  for (const mutate of [
    (b) => { b.surprise = true; }, (b) => { b.cells[0].surprise = true; },
    (b) => { b.couplings[0].surprise = true; },
  ]) { const body = structuredClone(canonicalBody); mutate(body); assert.throws(() => normalizeDisturbanceBody(body), /unknown field surprise/i); }
  assert.throws(() => normalizeDisturbancePressure({ ...canonicalPressure, surprise: true }), /unknown field surprise/i);
});

test("rejects accessors without invoking them", () => {
  let invoked = false; const body = structuredClone(canonicalBody);
  Object.defineProperty(body, "bodyId", { enumerable: true, get() { invoked = true; throw new Error("must not run"); } });
  assert.throws(() => normalizeDisturbanceBody(body), /data property bodyId/i); assert.equal(invoked, false);
  const pressure = structuredClone(canonicalPressure);
  Object.defineProperty(pressure, "amount", { enumerable: true, get() { invoked = true; throw new Error("must not run"); } });
  assert.throws(() => normalizeDisturbancePressure(pressure), /data property amount/i); assert.equal(invoked, false);
});

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

test("refuses pressure aimed outside the declared body before mutation", () => {
  const body = structuredClone(canonicalBody);
  const pressure = { ...canonicalPressure, targetCellId: "Z", sourceRef: "fixture:undeclared-Z" };
  const bodyBefore = JSON.stringify(body);
  assert.throws(() => runResonantDisturbance(body, pressure), /undeclared.*target/i);
  assert.equal(JSON.stringify(body), bodyBefore);
});

test("rejects transfer overflow before emitting or mutating its threshold package", () => {
  const body = {
    ...structuredClone(canonicalBody),
    bodyId: "overflowing-transfer",
    cells: [
      { id: "A", initialLoad: 0, threshold: 1, recoil: 1 },
      { id: "B", initialLoad: Number.MAX_SAFE_INTEGER, threshold: Number.MAX_SAFE_INTEGER, recoil: 0 },
    ],
    couplings: [
      { id: "AB", sourceCellId: "A", targetCellId: "B", transfer: 1 },
    ],
    maxEvents: 8,
  };
  const bodyBefore = JSON.stringify(body);
  assert.throws(() => runResonantDisturbance(body, { ...canonicalPressure, amount: 1 }), /safe integer bounds/i);
  assert.equal(JSON.stringify(body), bodyBefore);
});

test("admits null-prototype declarations and empty coupling arrays", () => {
  const body = Object.assign(Object.create(null), structuredClone(canonicalBody), { couplings: [] });
  assert.deepEqual(normalizeDisturbanceBody(body).couplings, []);
});

test("validates exact identities, finite integer quantities, and pressure authorities", () => {
  for (const [field, value] of [["schema", "wrong"], ["policyVersion", "wrong"], ["sourceRef", ""], ["targetCellId", ""], ["amount", -1], ["amount", 0.5], ["authority", "ambient"]]) {
    const pressure = structuredClone(canonicalPressure); pressure[field] = value;
    assert.throws(() => normalizeDisturbancePressure(pressure), new RegExp(field, "i"));
  }
  for (const authority of ["fixture", "testimony-only", "influence-only"]) {
    assert.equal(normalizeDisturbancePressure({ ...canonicalPressure, authority }).authority, authority);
  }
});
