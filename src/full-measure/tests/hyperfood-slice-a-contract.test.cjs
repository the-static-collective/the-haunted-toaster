const test = require("node:test");
const assert = require("node:assert/strict");
const hyperfood = require("../src/hyperfood/index.cjs");

const EXPECTED_EXPORTS = [
  "HYPERFOOD_SPEC_SCHEMA",
  "ORGANISM_REGISTRY",
  "SOURCE_NODE_REGISTRY",
  "applyHyperFoodDelta",
  "canonicalSpecimenJson",
  "evaluateHyperFoodTrace",
  "getOrganismDefinition",
  "normalizeEventGrid",
  "normalizeHyperFoodGraph",
  "normalizeHyperFoodSpec",
  "normalizeMutationDelta",
  "normalizeTextCues",
  "reconstructHyperFoodMutation",
  "semanticPayload",
  "specimenId",
];

test("Slice A exposes only the stable renderer-independent HyperFood ABI", () => {
  assert.deepEqual(Object.keys(hyperfood).sort(), EXPECTED_EXPORTS.sort());
  for (const forbidden of ["render", "ffmpeg", "hyperframes", "remotion", "admitToPantry", "receiptWriter"]) {
    assert.equal(hyperfood[forbidden], undefined);
  }
});
