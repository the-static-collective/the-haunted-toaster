const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const { createPrng } = require("./prng.cjs");
const {
  appendSigilOperation,
  normalizeSigilTopologyExpression,
} = require("./sigil-topology-expression.cjs");
const {
  compileSigilTopologyExpression,
} = require("./sigil-topology-compiler.cjs");

const SIGIL_UTTERANCE_FAMILY_SCHEMA = "haunted-toaster/sigil-utterance-family/v0";
const SIGIL_UTTERANCE_FAMILY_POLICY = "six-grammar-consequences-v0";
const UTTERANCE_ROLES = Object.freeze([
  Object.freeze({ role: "turn", operator: "ROTATE" }),
  Object.freeze({ role: "mirror", operator: "REFLECT" }),
  Object.freeze({ role: "echo", operator: "REPEAT" }),
  Object.freeze({ role: "scar", operator: "CUT" }),
  Object.freeze({ role: "aperture", operator: "OPEN" }),
  Object.freeze({ role: "branch", operator: "BRANCH" }),
]);

function normalizedParent(input) {
  let parent;
  try {
    parent = normalizeSigilTopologyExpression(input);
  } catch (error) {
    throw new TypeError(`parentExpression must be a normalized sigil topology expression: ${error.message}`);
  }
  if (input?.expressionHash !== parent.expressionHash) {
    throw new TypeError("parentExpression hash does not match its normalized content.");
  }
  return parent;
}

function boundedCount(value) {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new TypeError("count must be an integer in 1..6.");
  }
  return value;
}

function roleArgs(role, prng) {
  if (role === "turn") return { quarterTurns: prng.integer(1, 3) };
  if (role === "mirror") return { axis: prng.pick(["horizontal", "vertical"]) };
  if (role === "echo") return { count: prng.integer(2, 4) };
  if (role === "scar") return { cutIndex: prng.integer(0, 15) };
  if (role === "aperture") return { apertureIndex: prng.integer(0, 15) };
  if (role === "branch") return { count: prng.integer(2, 4) };
  throw new TypeError(`Unknown sigil utterance role: ${role}`);
}

function generateSigilUtteranceFamily({ parentExpression, rootSeed, count = 6 } = {}) {
  const parent = normalizedParent(parentExpression);
  const requestedCount = boundedCount(count);
  const seed = String(rootSeed);
  const targetId = parent.roots[0].id;
  const operationId = `o${parent.operations.length}`;
  const utterances = [];

  for (let slotIndex = 0; slotIndex < requestedCount; slotIndex += 1) {
    const descriptor = UTTERANCE_ROLES[slotIndex];
    const prng = createPrng(`${seed}:${parent.expressionHash}:${slotIndex}:${descriptor.role}`);
    const operation = {
      id: operationId,
      kind: descriptor.operator,
      inputs: [targetId],
      args: roleArgs(descriptor.role, prng),
    };
    const expression = appendSigilOperation(parent, operation);
    const plan = compileSigilTopologyExpression(expression);
    utterances.push({
      index: slotIndex,
      slotIndex,
      role: descriptor.role,
      parentExpressionHash: parent.expressionHash,
      operation,
      expression,
      expressionHash: expression.expressionHash,
      plan,
      planHash: plan.planHash,
    });
  }

  const core = {
    schema: SIGIL_UTTERANCE_FAMILY_SCHEMA,
    policy: SIGIL_UTTERANCE_FAMILY_POLICY,
    rootSeed: seed,
    parentExpressionHash: parent.expressionHash,
    sourceKind: parent.source.kind,
    requestedCount,
    producedCount: utterances.length,
    roles: utterances.map((item) => item.role),
    expressionHashes: utterances.map((item) => item.expressionHash),
    planHashes: utterances.map((item) => item.planHash),
  };
  const familyHash = hashCanonical(core, "HauntedToaster-SigilUtteranceFamily-v0");
  return deepFreeze({ ...core, utterances, familyHash });
}

function sameArray(a, b) {
  return Array.isArray(a) && Array.isArray(b) && canonicalStringify(a) === canonicalStringify(b);
}

function replaySigilUtteranceFamily(family, { parentExpression } = {}) {
  let actual;
  try {
    actual = generateSigilUtteranceFamily({
      parentExpression,
      rootSeed: family?.rootSeed,
      count: family?.requestedCount,
    });
  } catch (error) {
    return deepFreeze({
      ok: false,
      error: error.message,
      actualFamilyHash: null,
      actualRoles: [],
      actualExpressionHashes: [],
      actualPlanHashes: [],
    });
  }

  const ok = Boolean(
    family &&
      family.schema === SIGIL_UTTERANCE_FAMILY_SCHEMA &&
      family.policy === SIGIL_UTTERANCE_FAMILY_POLICY &&
      family.parentExpressionHash === actual.parentExpressionHash &&
      family.sourceKind === actual.sourceKind &&
      family.producedCount === actual.producedCount &&
      family.familyHash === actual.familyHash &&
      sameArray(family.roles, actual.roles) &&
      sameArray(family.expressionHashes, actual.expressionHashes) &&
      sameArray(family.planHashes, actual.planHashes)
  );

  return deepFreeze({
    ok,
    actualFamilyHash: actual.familyHash,
    actualRoles: actual.roles,
    actualExpressionHashes: actual.expressionHashes,
    actualPlanHashes: actual.planHashes,
  });
}

module.exports = {
  SIGIL_UTTERANCE_FAMILY_POLICY,
  SIGIL_UTTERANCE_FAMILY_SCHEMA,
  UTTERANCE_ROLES,
  generateSigilUtteranceFamily,
  replaySigilUtteranceFamily,
};
