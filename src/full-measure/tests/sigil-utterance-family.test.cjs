const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createFreeSigilExpression,
  createWitnessLockedSigilExpression,
} = require("../src/generation/sigil-topology-expression.cjs");
const {
  generateSigilUtteranceFamily,
  replaySigilUtteranceFamily,
} = require("../src/generation/sigil-utterance-family.cjs");

const WITNESS_DIGEST = "2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881";
const ROLES = ["turn", "mirror", "echo", "scar", "aperture", "branch"];

test("one parent speaks six distinct grammatical descendants", () => {
  const parent = createFreeSigilExpression({ primitives: ["P8"] });
  const family = generateSigilUtteranceFamily({
    parentExpression: parent,
    rootSeed: "first-sentence",
  });

  assert.equal(family.requestedCount, 6);
  assert.equal(family.producedCount, 6);
  assert.deepEqual(family.roles, ROLES);
  assert.equal(new Set(family.expressionHashes).size, 6);
  assert.equal(new Set(family.planHashes).size, 6);
  assert.ok(family.utterances.every((item) => item.parentExpressionHash === parent.expressionHash));
  assert.equal(family.sourceKind, "free-sigil");
});

test("replay is byte/hash stable", () => {
  const parent = createWitnessLockedSigilExpression({ digest: WITNESS_DIGEST });
  const family = generateSigilUtteranceFamily({
    parentExpression: parent,
    rootSeed: "witness-family",
  });
  const replay = replaySigilUtteranceFamily(family, { parentExpression: parent });

  assert.equal(replay.ok, true);
  assert.equal(replay.actualFamilyHash, family.familyHash);
  assert.deepEqual(replay.actualRoles, family.roles);
  assert.deepEqual(replay.actualExpressionHashes, family.expressionHashes);
  assert.deepEqual(replay.actualPlanHashes, family.planHashes);
});

test("same deep-cloned inputs reproduce the exact family", () => {
  const parent = createFreeSigilExpression({ primitives: ["P8", "PA"] });
  const a = generateSigilUtteranceFamily({ parentExpression: parent, rootSeed: "repeat-me" });
  const b = generateSigilUtteranceFamily({ parentExpression: structuredClone(parent), rootSeed: "repeat-me" });
  assert.deepEqual(a, b);
});

test("root seed changes grammatical arguments and family identity", () => {
  const parent = createFreeSigilExpression({ primitives: ["P8", "PA"] });
  const a = generateSigilUtteranceFamily({ parentExpression: parent, rootSeed: "seed-a" });
  const b = generateSigilUtteranceFamily({ parentExpression: parent, rootSeed: "seed-b" });

  assert.notEqual(a.familyHash, b.familyHash);
  assert.ok(a.utterances.some((item, index) =>
    JSON.stringify(item.operation.args) !== JSON.stringify(b.utterances[index].operation.args),
  ));
});

test("family generation is read-only and preserves witness source channel", () => {
  const parent = createWitnessLockedSigilExpression({ digest: WITNESS_DIGEST });
  const before = structuredClone(parent);
  const family = generateSigilUtteranceFamily({ parentExpression: parent, rootSeed: "witness-continuity" });

  assert.deepEqual(parent, before);
  for (const utterance of family.utterances) {
    assert.equal(utterance.expression.source.kind, "witness-locked");
    assert.equal(utterance.expression.source.digest, WITNESS_DIGEST);
    assert.equal(utterance.expression.source.projectionVersion, "witness-sigil/v0.1");
    assert.notEqual(utterance.expressionHash, parent.expressionHash);
  }
});

test("count is bounded to integer slots 1 through 6", () => {
  const parent = createFreeSigilExpression({ primitives: ["P8"] });
  for (const count of [1, 2, 3, 4, 5, 6]) {
    const family = generateSigilUtteranceFamily({ parentExpression: parent, rootSeed: "bounded", count });
    assert.equal(family.requestedCount, count);
    assert.equal(family.producedCount, count);
    assert.deepEqual(family.roles, ROLES.slice(0, count));
  }
  for (const count of [0, 7, 1.5, NaN, Infinity]) {
    assert.throws(
      () => generateSigilUtteranceFamily({ parentExpression: parent, rootSeed: "bad", count }),
      /count|integer|1\.\.6/i,
    );
  }
});

test("family rejects malformed parent expressions", () => {
  assert.throws(
    () => generateSigilUtteranceFamily({
      parentExpression: { schema: "haunted-toaster/sigil-topology-expression/v0" },
      rootSeed: "bad-parent",
    }),
    /parent|expression|source|normalized/i,
  );
});

test("replay detects modified role and hash metadata", () => {
  const parent = createFreeSigilExpression({ primitives: ["P8"] });
  const family = generateSigilUtteranceFamily({ parentExpression: parent, rootSeed: "tamper" });

  const changedRole = structuredClone(family);
  changedRole.roles[0] = "branch";
  assert.equal(replaySigilUtteranceFamily(changedRole, { parentExpression: parent }).ok, false);

  const changedHash = structuredClone(family);
  changedHash.expressionHashes[0] = "0".repeat(64);
  assert.equal(replaySigilUtteranceFamily(changedHash, { parentExpression: parent }).ok, false);
});

test("generation package exports the complete Sigil Grammar v0 surface", () => {
  const generation = require("../src/generation/index.cjs");
  const names = [
    "renderWitnessSigilV01",
    "createFreeSigilExpression",
    "createWitnessLockedSigilExpression",
    "normalizeSigilTopologyExpression",
    "appendSigilOperation",
    "compileSigilTopologyExpression",
    "generateSigilUtteranceFamily",
    "replaySigilUtteranceFamily",
  ];
  for (const name of names) assert.equal(typeof generation[name], "function", `${name} must be exported`);
});
