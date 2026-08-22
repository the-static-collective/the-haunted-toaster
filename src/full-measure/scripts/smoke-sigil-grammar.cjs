const {
  createFreeSigilExpression,
  createWitnessLockedSigilExpression,
} = require("../src/generation/sigil-topology-expression.cjs");
const {
  generateSigilUtteranceFamily,
} = require("../src/generation/sigil-utterance-family.cjs");

const WITNESS_DIGEST = "2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSixDistinct(family, label) {
  assert(family.producedCount === 6, `${label} must produce six utterances.`);
  assert(new Set(family.expressionHashes).size === 6, `${label} expression hashes must be distinct.`);
  assert(new Set(family.planHashes).size === 6, `${label} plan hashes must be distinct.`);
}

const freeParent = createFreeSigilExpression({ primitives: ["P8", "PA"] });
const freeFamily = generateSigilUtteranceFamily({
  parentExpression: freeParent,
  rootSeed: "smoke-free-sigil-v0",
});
assertSixDistinct(freeFamily, "free-sigil specimen");
assert(
  freeFamily.utterances.every((item) => item.expression.source.kind === "free-sigil"),
  "free-sigil descendants must remain in the free-sigil source channel.",
);

const witnessParent = createWitnessLockedSigilExpression({ digest: WITNESS_DIGEST });
const witnessFamily = generateSigilUtteranceFamily({
  parentExpression: witnessParent,
  rootSeed: "smoke-witness-sigil-v0",
});
assertSixDistinct(witnessFamily, "witness-locked specimen");
assert(
  witnessFamily.utterances.every((item) =>
    item.expression.source.kind === "witness-locked" &&
    item.expression.source.digest === WITNESS_DIGEST &&
    item.expression.source.projectionVersion === witnessParent.source.projectionVersion &&
    item.expressionHash !== witnessParent.expressionHash,
  ),
  "witness-locked descendants must preserve frozen source evidence while changing expression identity.",
);

const proof = {
  schema: "haunted-toaster/sigil-grammar-smoke/v0",
  freeSigil: {
    parentExpressionHash: freeParent.expressionHash,
    familyHash: freeFamily.familyHash,
    roles: freeFamily.roles,
    expressionHashes: freeFamily.expressionHashes,
    planHashes: freeFamily.planHashes,
  },
  witnessLocked: {
    digest: WITNESS_DIGEST,
    projectionVersion: witnessParent.source.projectionVersion,
    parentExpressionHash: witnessParent.expressionHash,
    familyHash: witnessFamily.familyHash,
    roles: witnessFamily.roles,
    expressionHashes: witnessFamily.expressionHashes,
    planHashes: witnessFamily.planHashes,
  },
};

process.stdout.write(`${JSON.stringify(proof)}\n`);
