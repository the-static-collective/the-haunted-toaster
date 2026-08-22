const {
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const {
  SIGIL_OPERATORS,
  SIGIL_PRIMITIVES,
  normalizeSigilTopologyExpression,
} = require("./sigil-topology-expression.cjs");

const SIGIL_TOPOLOGY_PLAN_SCHEMA = "haunted-toaster/sigil-topology-plan/v0";

function zeroCounts(keys) {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function assertNormalizedExpression(input) {
  let normalized;
  try {
    normalized = normalizeSigilTopologyExpression(input);
  } catch (error) {
    throw new TypeError(`Expected a normalized sigil topology expression: ${error.message}`);
  }
  if (input?.expressionHash !== normalized.expressionHash) {
    throw new TypeError("Sigil topology expression hash does not match its normalized content.");
  }
  return normalized;
}

function compileSigilTopologyExpression(input) {
  const expression = assertNormalizedExpression(input);
  const rootCounts = zeroCounts(SIGIL_PRIMITIVES);
  const operatorCounts = zeroCounts(SIGIL_OPERATORS);

  for (const root of expression.roots) rootCounts[root.primitive] += 1;
  for (const operation of expression.operations) operatorCounts[operation.kind] += 1;

  const pressure = {
    rupture:
      rootCounts.P6 +
      rootCounts.P9 +
      operatorCounts.CUT +
      operatorCounts.OPEN,
    recurrence:
      rootCounts.PA +
      rootCounts.PC +
      operatorCounts.REPEAT +
      operatorCounts.NEST,
    reflection:
      rootCounts.PD +
      operatorCounts.REFLECT,
    ecology:
      rootCounts.PB +
      rootCounts.PE +
      rootCounts.PF +
      operatorCounts.BRANCH +
      operatorCounts.MERGE,
    witness: rootCounts.P8,
    boundary:
      rootCounts.P2 +
      rootCounts.P3 +
      operatorCounts.OPEN +
      operatorCounts.CLOSE,
  };

  const core = {
    schema: SIGIL_TOPOLOGY_PLAN_SCHEMA,
    expressionHash: expression.expressionHash,
    sourceKind: expression.source.kind,
    rootCounts,
    operatorCounts,
    pressure,
  };
  const planHash = hashCanonical(core, "HauntedToaster-SigilTopologyPlan-v0");
  return deepFreeze({ ...core, planHash });
}

module.exports = {
  SIGIL_TOPOLOGY_PLAN_SCHEMA,
  compileSigilTopologyExpression,
};
