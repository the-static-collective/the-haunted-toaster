const assert = require("node:assert/strict");
const test = require("node:test");

const {
  appendSigilOperation,
  createFreeSigilExpression,
} = require("../src/generation/sigil-topology-expression.cjs");
const {
  compileSigilTopologyExpression,
} = require("../src/generation/sigil-topology-compiler.cjs");

function append(parent, kind, args) {
  return appendSigilOperation(parent, {
    id: `o${parent.operations.length}`,
    kind,
    inputs: [parent.operations.at(-1)?.id || parent.roots[0].id],
    args,
  });
}

test("CUT raises rupture without erasing root ancestry", () => {
  const parent = createFreeSigilExpression({ primitives: ["P8"] });
  const child = append(parent, "CUT", { cutIndex: 0 });

  const parentPlan = compileSigilTopologyExpression(parent);
  const childPlan = compileSigilTopologyExpression(child);

  assert.equal(parentPlan.pressure.rupture, 0);
  assert.equal(childPlan.pressure.rupture, 1);
  assert.deepEqual(childPlan.rootCounts, parentPlan.rootCounts);
  assert.notEqual(childPlan.planHash, parentPlan.planHash);
});

test("same expression always produces the same topology plan", () => {
  const expression = createFreeSigilExpression({ primitives: ["PA", "PC"] });
  const a = compileSigilTopologyExpression(expression);
  const b = compileSigilTopologyExpression(structuredClone(expression));
  assert.deepEqual(a, b);
});

test("root and operator contributions are exact integer pressure sums", () => {
  const rupture = compileSigilTopologyExpression(createFreeSigilExpression({ primitives: ["P9"] }));
  assert.equal(rupture.pressure.rupture, 1);

  const recurrenceParent = createFreeSigilExpression({ primitives: ["PA"] });
  const recurrenceChild = compileSigilTopologyExpression(append(recurrenceParent, "REPEAT", { count: 2 }));
  assert.equal(recurrenceChild.pressure.recurrence, 2);

  const reflectionParent = createFreeSigilExpression({ primitives: ["PD"] });
  const reflectionChild = compileSigilTopologyExpression(append(reflectionParent, "REFLECT", { axis: "horizontal" }));
  assert.equal(reflectionChild.pressure.reflection, 2);

  const ecologyParent = createFreeSigilExpression({ primitives: ["PE"] });
  const ecologyChild = compileSigilTopologyExpression(append(ecologyParent, "BRANCH", { count: 2 }));
  assert.equal(ecologyChild.pressure.ecology, 2);

  const boundaryParent = createFreeSigilExpression({ primitives: ["P2", "P3"] });
  const boundaryChild = compileSigilTopologyExpression(append(boundaryParent, "OPEN", { apertureIndex: 0 }));
  assert.equal(boundaryChild.pressure.boundary, 3);

  const witness = compileSigilTopologyExpression(createFreeSigilExpression({ primitives: ["P8"] }));
  assert.equal(witness.pressure.witness, 1);

  for (const value of Object.values(ecologyChild.pressure)) {
    assert.equal(Number.isInteger(value), true);
    assert.ok(value >= 0);
  }
});

test("compiler keeps every primitive and operator count explicit", () => {
  const expression = append(
    createFreeSigilExpression({ primitives: ["P0", "P8", "PF"] }),
    "ROTATE",
    { quarterTurns: 1 },
  );
  const plan = compileSigilTopologyExpression(expression);

  assert.deepEqual(Object.keys(plan.rootCounts), [
    "P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7",
    "P8", "P9", "PA", "PB", "PC", "PD", "PE", "PF",
  ]);
  assert.equal(plan.rootCounts.P0, 1);
  assert.equal(plan.rootCounts.P8, 1);
  assert.equal(plan.rootCounts.PF, 1);
  assert.equal(plan.operatorCounts.ROTATE, 1);
  assert.equal(plan.sourceKind, "free-sigil");
});

test("compiler rejects unnormalized or tampered expression objects", () => {
  assert.throws(
    () => compileSigilTopologyExpression({ schema: "haunted-toaster/sigil-topology-expression/v0" }),
    /sigil topology expression|source|normalized|expression/i,
  );

  const expression = createFreeSigilExpression({ primitives: ["P8"] });
  const tampered = structuredClone(expression);
  tampered.expressionHash = "0".repeat(64);
  assert.throws(() => compileSigilTopologyExpression(tampered), /expression|hash|normalized/i);
});

test("topology intent contains no authority-shaped output fields", () => {
  const plan = compileSigilTopologyExpression(createFreeSigilExpression({ primitives: ["P8"] }));
  const forbidden = ["authority", "admission", "authenticated", "ancestryGranted", "identity"];
  for (const field of forbidden) assert.equal(Object.hasOwn(plan, field), false);
});
