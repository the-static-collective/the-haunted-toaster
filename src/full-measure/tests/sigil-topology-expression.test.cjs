const assert = require("node:assert/strict");
const test = require("node:test");

const {
  MAX_SIGIL_OPERATIONS,
  MAX_SIGIL_ROOTS,
  SIGIL_OPERATORS,
  SIGIL_PRIMITIVES,
  appendSigilOperation,
  createFreeSigilExpression,
  createWitnessLockedSigilExpression,
  normalizeSigilTopologyExpression,
} = require("../src/generation/sigil-topology-expression.cjs");

const ZERO = "0".repeat(64);

test("primitive and operator alphabets are frozen v0 contracts", () => {
  assert.deepEqual(SIGIL_PRIMITIVES, ["P0","P1","P2","P3","P4","P5","P6","P7","P8","P9","PA","PB","PC","PD","PE","PF"]);
  assert.deepEqual(SIGIL_OPERATORS, ["TRANSLATE","ROTATE","REFLECT","SCALE","REPEAT","OVERLAP","LIGATE","CUT","OPEN","CLOSE","NEST","BRANCH","MERGE","PROJECT"]);
  assert.equal(MAX_SIGIL_ROOTS, 64);
  assert.equal(MAX_SIGIL_OPERATIONS, 128);
  assert.ok(Object.isFrozen(SIGIL_PRIMITIVES));
  assert.ok(Object.isFrozen(SIGIL_OPERATORS));
});

test("free-sigil and witness-locked are distinct source channels", () => {
  const free = createFreeSigilExpression({ primitives: ["P8"] });
  const witness = createWitnessLockedSigilExpression({ digest: ZERO });
  assert.equal(free.source.kind, "free-sigil");
  assert.deepEqual(free.source, { kind: "free-sigil" });
  assert.equal(witness.source.kind, "witness-locked");
  assert.equal(witness.source.digest, ZERO);
  assert.equal(witness.source.projectionVersion, "witness-sigil/v0.1");
  assert.match(witness.source.recipeHash, /^[0-9a-f]{64}$/);
  assert.equal(witness.roots.length, 16);
  assert.ok(witness.roots.every((root) => root.primitive === "P0" && root.quarterTurns === 0));
  assert.notEqual(free.expressionHash, witness.expressionHash);
  assert.ok(Object.isFrozen(free));
  assert.ok(Object.isFrozen(witness));
});

test("operation order is syntax and changes identity", () => {
  const a = normalizeSigilTopologyExpression({
    schema: "haunted-toaster/sigil-topology-expression/v0",
    source: { kind: "free-sigil" },
    roots: [{ id: "r0", primitive: "P8", quarterTurns: 0 }],
    operations: [
      { id: "o0", kind: "ROTATE", inputs: ["r0"], args: { quarterTurns: 1 } },
      { id: "o1", kind: "CUT", inputs: ["o0"], args: { cutIndex: 0 } },
    ],
    lineage: [],
  });
  const b = normalizeSigilTopologyExpression({
    schema: a.schema,
    source: a.source,
    roots: a.roots,
    operations: [
      { id: "o0", kind: "CUT", inputs: ["r0"], args: { cutIndex: 0 } },
      { id: "o1", kind: "ROTATE", inputs: ["r0"], args: { quarterTurns: 1 } },
    ],
    lineage: a.lineage,
  });
  assert.notEqual(a.expressionHash, b.expressionHash);
});

test("append preserves ancestry and adds one syntax node", () => {
  const parent = createFreeSigilExpression({ primitives: ["P8"] });
  const child = appendSigilOperation(parent, { id: "o0", kind: "OPEN", inputs: ["r0"], args: { apertureIndex: 7 } });
  assert.equal(child.operations.length, 1);
  assert.equal(child.lineage.at(-1), parent.expressionHash);
  assert.notEqual(child.expressionHash, parent.expressionHash);
});

test("all operator argument and arity shapes normalize", () => {
  let expression = createFreeSigilExpression({ primitives: ["P0", "P1"] });
  const cases = [
    ["TRANSLATE", ["r0"], { x: -3, y: 4 }],
    ["ROTATE", ["r0"], { quarterTurns: 3 }],
    ["REFLECT", ["r0"], { axis: "vertical" }],
    ["SCALE", ["r0"], { numerator: 3, denominator: 2 }],
    ["REPEAT", ["r0"], { count: 8 }],
    ["OVERLAP", ["r0", "r1"], {}],
    ["LIGATE", ["r0", "r1"], {}],
    ["CUT", ["r0"], { cutIndex: 15 }],
    ["OPEN", ["r0"], { apertureIndex: 0 }],
    ["CLOSE", ["r0"], { apertureIndex: 15 }],
    ["NEST", ["r0", "r1"], {}],
    ["BRANCH", ["r0"], { count: 2 }],
    ["MERGE", ["r0", "r1"], {}],
    ["PROJECT", ["r0"], { plane: "xz" }],
  ];
  for (const [kind, inputs, args] of cases) {
    expression = appendSigilOperation(expression, { id: `o${expression.operations.length}`, kind, inputs, args });
  }
  assert.equal(expression.operations.length, 14);
});

test("normalizer fails closed on malformed grammar", () => {
  const base = {
    schema: "haunted-toaster/sigil-topology-expression/v0",
    source: { kind: "free-sigil" },
    roots: [{ id: "r0", primitive: "P8", quarterTurns: 0 }],
    operations: [],
    lineage: [],
  };
  const bad = [
    { ...base, roots: [{ id: "r0", primitive: "PX", quarterTurns: 0 }] },
    { ...base, roots: [{ id: "r0", primitive: "P8", quarterTurns: 0 }, { id: "r0", primitive: "P9", quarterTurns: 0 }] },
    { ...base, operations: [{ id: "o0", kind: "BOGUS", inputs: ["r0"], args: {} }] },
    { ...base, operations: [{ id: "o0", kind: "ROTATE", inputs: ["future"], args: { quarterTurns: 1 } }] },
    { ...base, source: { kind: "witness-locked" } },
    { ...base, source: { kind: "free-sigil", digest: ZERO } },
    { ...base, source: { kind: "free-sigil", projectionVersion: "witness-sigil/v0.1" } },
    { ...base, roots: Array.from({ length: 65 }, (_, i) => ({ id: `r${i}`, primitive: "P0", quarterTurns: 0 })) },
    { ...base, operations: Array.from({ length: 129 }, (_, i) => ({ id: `o${i}`, kind: "ROTATE", inputs: ["r0"], args: { quarterTurns: 0 } })) },
    { ...base, roots: [{ id: "r0", primitive: "P8", quarterTurns: 1.5 }] },
    { ...base, operations: [{ id: "o0", kind: "TRANSLATE", inputs: ["r0"], args: { x: Infinity, y: 0 } }] },
    { ...base, operations: [{ id: "o0", kind: "ROTATE", inputs: ["r0"], args: { quarterTurns: 4 } }] },
    { ...base, operations: [{ id: "o0", kind: "OVERLAP", inputs: ["r0"], args: {} }] },
  ];
  for (const specimen of bad) assert.throws(() => normalizeSigilTopologyExpression(specimen));
});

test("duplicate operation IDs and future operation references are refused", () => {
  const base = createFreeSigilExpression({ primitives: ["P0"] });
  assert.throws(() => normalizeSigilTopologyExpression({ ...base, expressionHash: undefined, operations: [
    { id: "o0", kind: "ROTATE", inputs: ["r0"], args: { quarterTurns: 1 } },
    { id: "o0", kind: "CUT", inputs: ["o0"], args: { cutIndex: 1 } },
  ] }));
  assert.throws(() => normalizeSigilTopologyExpression({ ...base, expressionHash: undefined, operations: [
    { id: "o0", kind: "ROTATE", inputs: ["o1"], args: { quarterTurns: 1 } },
    { id: "o1", kind: "CUT", inputs: ["r0"], args: { cutIndex: 1 } },
  ] }));
});
