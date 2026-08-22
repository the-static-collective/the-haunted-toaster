const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const {
  renderWitnessSigilV01,
  WITNESS_SIGIL_PROJECTION,
} = require("./witness-sigil-projection.cjs");

const SIGIL_TOPOLOGY_EXPRESSION_SCHEMA = "haunted-toaster/sigil-topology-expression/v0";
const MAX_SIGIL_ROOTS = 64;
const MAX_SIGIL_OPERATIONS = 128;
const SIGIL_PRIMITIVES = Object.freeze([
  "P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7",
  "P8", "P9", "PA", "PB", "PC", "PD", "PE", "PF",
]);
const SIGIL_OPERATORS = Object.freeze([
  "TRANSLATE", "ROTATE", "REFLECT", "SCALE", "REPEAT", "OVERLAP", "LIGATE",
  "CUT", "OPEN", "CLOSE", "NEST", "BRANCH", "MERGE", "PROJECT",
]);

const UNARY = new Set(["TRANSLATE", "ROTATE", "REFLECT", "SCALE", "REPEAT", "CUT", "OPEN", "CLOSE", "BRANCH", "PROJECT"]);
const BINARY = new Set(["OVERLAP", "LIGATE", "NEST", "MERGE"]);
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value;
}

function exactKeys(value, allowed, label) {
  const keys = Object.keys(value).sort();
  const expected = [...allowed].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} has unknown or missing fields.`);
  }
}

function integer(value, label, minimum = null, maximum = null) {
  if (!Number.isFinite(value) || !Number.isInteger(value)) throw new TypeError(`${label} must be a finite integer.`);
  if (minimum !== null && value < minimum) throw new TypeError(`${label} is below its minimum.`);
  if (maximum !== null && value > maximum) throw new TypeError(`${label} exceeds its maximum.`);
  return value;
}

function nonEmptyId(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9._:-]*$/.test(value)) {
    throw new TypeError(`${label} must be a stable non-empty identifier.`);
  }
  return value;
}

function normalizeArgs(kind, input) {
  const args = plainObject(input, `${kind} args`);
  if (kind === "TRANSLATE") {
    exactKeys(args, ["x", "y"], `${kind} args`);
    return { x: integer(args.x, "TRANSLATE x"), y: integer(args.y, "TRANSLATE y") };
  }
  if (kind === "ROTATE") {
    exactKeys(args, ["quarterTurns"], `${kind} args`);
    return { quarterTurns: integer(args.quarterTurns, "ROTATE quarterTurns", 0, 3) };
  }
  if (kind === "REFLECT") {
    exactKeys(args, ["axis"], `${kind} args`);
    if (!["horizontal", "vertical"].includes(args.axis)) throw new TypeError("REFLECT axis is invalid.");
    return { axis: args.axis };
  }
  if (kind === "SCALE") {
    exactKeys(args, ["numerator", "denominator"], `${kind} args`);
    return {
      numerator: integer(args.numerator, "SCALE numerator", 1),
      denominator: integer(args.denominator, "SCALE denominator", 1),
    };
  }
  if (kind === "REPEAT" || kind === "BRANCH") {
    exactKeys(args, ["count"], `${kind} args`);
    return { count: integer(args.count, `${kind} count`, 2, 8) };
  }
  if (kind === "CUT") {
    exactKeys(args, ["cutIndex"], `${kind} args`);
    return { cutIndex: integer(args.cutIndex, "CUT cutIndex", 0, 15) };
  }
  if (kind === "OPEN" || kind === "CLOSE") {
    exactKeys(args, ["apertureIndex"], `${kind} args`);
    return { apertureIndex: integer(args.apertureIndex, `${kind} apertureIndex`, 0, 15) };
  }
  if (kind === "PROJECT") {
    exactKeys(args, ["plane"], `${kind} args`);
    if (!["xy", "xz", "yz"].includes(args.plane)) throw new TypeError("PROJECT plane is invalid.");
    return { plane: args.plane };
  }
  exactKeys(args, [], `${kind} args`);
  return {};
}

function normalizeRoot(input, index) {
  const root = plainObject(input, `root ${index}`);
  exactKeys(root, ["id", "primitive", "quarterTurns"], `root ${index}`);
  const id = nonEmptyId(root.id, `root ${index} id`);
  if (!SIGIL_PRIMITIVES.includes(root.primitive)) throw new TypeError(`Unknown sigil primitive: ${root.primitive}`);
  return {
    id,
    primitive: root.primitive,
    quarterTurns: integer(root.quarterTurns, `root ${index} quarterTurns`, 0, 3),
  };
}

function normalizeSource(input) {
  const source = plainObject(input, "source");
  if (source.kind === "free-sigil") {
    exactKeys(source, ["kind"], "free-sigil source");
    return { kind: "free-sigil" };
  }
  if (source.kind === "witness-locked") {
    exactKeys(source, ["kind", "digest", "projectionVersion", "recipeHash"], "witness-locked source");
    if (typeof source.digest !== "string" || !DIGEST_PATTERN.test(source.digest)) throw new TypeError("witness-locked source requires a canonical digest.");
    if (source.projectionVersion !== WITNESS_SIGIL_PROJECTION) throw new TypeError("witness-locked projection version is invalid.");
    const { recipe } = renderWitnessSigilV01(source.digest);
    const recipeHash = hashCanonical(recipe, "HauntedToaster-WitnessSigilRecipe-v0");
    if (source.recipeHash !== recipeHash) throw new TypeError("witness-locked recipe hash does not match the frozen projection.");
    return { kind: "witness-locked", digest: source.digest, projectionVersion: WITNESS_SIGIL_PROJECTION, recipeHash };
  }
  throw new TypeError(`Unknown sigil source kind: ${source.kind}`);
}

function witnessRoots(digest) {
  const { recipe } = renderWitnessSigilV01(digest);
  return recipe.slots.map((slot, index) => ({
    id: `r${index}`,
    primitive: slot.primitive,
    quarterTurns: slot.rotationDegrees / 90,
  }));
}

function normalizeLineage(input) {
  if (!Array.isArray(input)) throw new TypeError("lineage must be an array.");
  return input.map((item, index) => {
    if (typeof item !== "string" || !/^[0-9a-f]{64}$/.test(item)) throw new TypeError(`lineage ${index} must be an expression hash.`);
    return item;
  });
}

function normalizeOperation(input, index, available, usedIds) {
  const operation = plainObject(input, `operation ${index}`);
  exactKeys(operation, ["id", "kind", "inputs", "args"], `operation ${index}`);
  const id = nonEmptyId(operation.id, `operation ${index} id`);
  if (usedIds.has(id)) throw new TypeError(`Duplicate sigil node id: ${id}`);
  if (!SIGIL_OPERATORS.includes(operation.kind)) throw new TypeError(`Unknown sigil operator: ${operation.kind}`);
  if (!Array.isArray(operation.inputs)) throw new TypeError(`operation ${index} inputs must be an array.`);
  const arity = UNARY.has(operation.kind) ? 1 : BINARY.has(operation.kind) ? 2 : 0;
  if (operation.inputs.length !== arity) throw new TypeError(`${operation.kind} requires ${arity} input(s).`);
  const inputs = operation.inputs.map((nodeId, inputIndex) => {
    const normalized = nonEmptyId(nodeId, `operation ${index} input ${inputIndex}`);
    if (!available.has(normalized)) throw new TypeError(`operation ${id} refers to unavailable node ${normalized}.`);
    return normalized;
  });
  return { id, kind: operation.kind, inputs, args: normalizeArgs(operation.kind, operation.args) };
}

function normalizeSigilTopologyExpression(input) {
  const expression = plainObject(input, "sigil topology expression");
  if (expression.schema !== SIGIL_TOPOLOGY_EXPRESSION_SCHEMA) throw new TypeError(`Expected ${SIGIL_TOPOLOGY_EXPRESSION_SCHEMA}.`);
  const source = normalizeSource(expression.source);
  if (!Array.isArray(expression.roots) || expression.roots.length < 1 || expression.roots.length > MAX_SIGIL_ROOTS) {
    throw new TypeError(`roots must contain 1..${MAX_SIGIL_ROOTS} entries.`);
  }
  if (!Array.isArray(expression.operations) || expression.operations.length > MAX_SIGIL_OPERATIONS) {
    throw new TypeError(`operations must contain at most ${MAX_SIGIL_OPERATIONS} entries.`);
  }
  const roots = expression.roots.map(normalizeRoot);
  const usedIds = new Set();
  for (const root of roots) {
    if (usedIds.has(root.id)) throw new TypeError(`Duplicate sigil node id: ${root.id}`);
    usedIds.add(root.id);
  }
  if (source.kind === "witness-locked" && canonicalStringify(roots) !== canonicalStringify(witnessRoots(source.digest))) {
    throw new TypeError("witness-locked roots must exactly reproduce the frozen witness projection.");
  }
  const available = new Set(usedIds);
  const operations = [];
  for (let index = 0; index < expression.operations.length; index += 1) {
    const operation = normalizeOperation(expression.operations[index], index, available, usedIds);
    operations.push(operation);
    usedIds.add(operation.id);
    available.add(operation.id);
  }
  const lineage = normalizeLineage(expression.lineage || []);
  const core = { schema: SIGIL_TOPOLOGY_EXPRESSION_SCHEMA, source, roots, operations, lineage };
  const expressionHash = hashCanonical(core, "HauntedToaster-SigilTopologyExpression-v0");
  return deepFreeze({ ...core, expressionHash });
}

function createFreeSigilExpression({ primitives, operations = [], lineage = [] } = {}) {
  if (!Array.isArray(primitives) || primitives.length < 1 || primitives.length > MAX_SIGIL_ROOTS) {
    throw new TypeError(`primitives must contain 1..${MAX_SIGIL_ROOTS} entries.`);
  }
  return normalizeSigilTopologyExpression({
    schema: SIGIL_TOPOLOGY_EXPRESSION_SCHEMA,
    source: { kind: "free-sigil" },
    roots: primitives.map((primitive, index) => ({ id: `r${index}`, primitive, quarterTurns: 0 })),
    operations,
    lineage,
  });
}

function createWitnessLockedSigilExpression({ digest, operations = [], lineage = [] } = {}) {
  const { recipe } = renderWitnessSigilV01(digest);
  const source = {
    kind: "witness-locked",
    digest,
    projectionVersion: WITNESS_SIGIL_PROJECTION,
    recipeHash: hashCanonical(recipe, "HauntedToaster-WitnessSigilRecipe-v0"),
  };
  return normalizeSigilTopologyExpression({
    schema: SIGIL_TOPOLOGY_EXPRESSION_SCHEMA,
    source,
    roots: witnessRoots(digest),
    operations,
    lineage,
  });
}

function appendSigilOperation(expression, operation) {
  const parent = normalizeSigilTopologyExpression(expression);
  return normalizeSigilTopologyExpression({
    schema: parent.schema,
    source: parent.source,
    roots: parent.roots,
    operations: [...parent.operations, operation],
    lineage: [...parent.lineage, parent.expressionHash],
  });
}

module.exports = {
  MAX_SIGIL_OPERATIONS,
  MAX_SIGIL_ROOTS,
  SIGIL_OPERATORS,
  SIGIL_PRIMITIVES,
  SIGIL_TOPOLOGY_EXPRESSION_SCHEMA,
  appendSigilOperation,
  createFreeSigilExpression,
  createWitnessLockedSigilExpression,
  normalizeSigilTopologyExpression,
};
