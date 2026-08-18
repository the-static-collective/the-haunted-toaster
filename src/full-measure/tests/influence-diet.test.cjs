const test = require("node:test");
const assert = require("node:assert/strict");
const generation = require("../src/generation/index.cjs");

function table() {
  return generation.buildCreativeContextTable({
    entries: [
      {
        providerId: "source/song",
        policyVersion: "song-source-v1",
        evidenceRef: "sha256:" + "1".repeat(64),
        authorityClass: "source-truth",
        ancestryClass: "none",
        allowedDecisions: ["family-composition"],
        required: true,
        availability: "available",
        payload: { analysisHash: "a".repeat(64) },
      },
      {
        providerId: "source/image-native-color",
        policyVersion: "native-color-v1",
        evidenceRef: "sha256:" + "2".repeat(64),
        authorityClass: "creative-material",
        ancestryClass: "none",
        allowedDecisions: ["native-color"],
        required: false,
        availability: "available",
        payload: { profileSha256: "b".repeat(64) },
      },
      {
        providerId: "memory/receipt-v1",
        policyVersion: "toaster-memory-influence-v1",
        evidenceRef: "sha256:" + "3".repeat(64),
        authorityClass: "influence-only",
        ancestryClass: "none",
        allowedDecisions: ["coverage", "palette"],
        required: false,
        availability: "available",
        payload: { target: "paletteLogic:duotone" },
      },
    ],
  });
}

test("diet separates eaten, ignored, influence-only, and boundary evidence", () => {
  const diet = generation.buildInfluenceDiet({
    table: table(),
    consumedProviderIds: ["source/image-native-color"],
    influenceOnlyProviderIds: ["memory/receipt-v1"],
  });
  assert.deepEqual(diet.ate, ["source/image-native-color"]);
  assert.deepEqual(diet.influenceOnly, ["memory/receipt-v1"]);
  assert.deepEqual(diet.boundaries, ["source/song"]);
  assert.deepEqual(diet.ignored, []);
});

test("an available optional provider can be ignored without disappearing", () => {
  const diet = generation.buildInfluenceDiet({ table: table() });
  assert.deepEqual(diet.boundaries, ["source/song"]);
  assert.deepEqual(diet.ignored, ["memory/receipt-v1", "source/image-native-color"]);
});

test("influence-only evidence cannot be eaten or treated as ancestry", () => {
  assert.throws(
    () => generation.buildInfluenceDiet({
      table: table(),
      consumedProviderIds: ["memory/receipt-v1"],
    }),
    /influence-only provider memory\/receipt-v1 cannot be eaten/i,
  );
});

test("diet cannot cite a provider absent from its table", () => {
  assert.throws(
    () => generation.buildInfluenceDiet({
      table: table(),
      influenceOnlyProviderIds: ["memory/missing"],
    }),
    /not present in Creative Context Table/i,
  );
});
