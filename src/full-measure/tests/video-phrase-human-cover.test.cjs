const test = require("node:test");
const assert = require("node:assert/strict");

const {
  findMinimumWitnessCovers,
  claimsLostIfSpecimenFails,
} = require("../src/render/video-phrase-human-cover.cjs");

const REQUIRED = Object.freeze([
  "multi-phrase",
  "reverse-time",
  "ping-pong-time",
  "mixed-digestion",
  "spatial-transform",
  "leave-and-return",
]);

const SPECIMENS = Object.freeze([
  { id: "candidate-A", claims: ["multi-phrase", "reverse-time", "leave-and-return"] },
  { id: "candidate-B", claims: ["ping-pong-time", "mixed-digestion", "spatial-transform"] },
  { id: "candidate-C", claims: ["multi-phrase", "ping-pong-time", "leave-and-return"] },
  { id: "candidate-D", claims: ["reverse-time", "mixed-digestion", "spatial-transform"] },
]);

test("returns every minimum witness cover instead of blessing one arbitrary pair", () => {
  const receipt = findMinimumWitnessCovers({
    requiredClaims: REQUIRED,
    specimens: SPECIMENS,
  });

  assert.equal(receipt.minimumSize, 2);
  assert.deepEqual(receipt.covers, [
    ["candidate-A", "candidate-B"],
    ["candidate-C", "candidate-D"],
  ]);
  assert.deepEqual(receipt.requiredClaims, [...REQUIRED]);
  assert.equal(receipt.authority, "none");
});

test("reports uncovered claims when one selected specimen becomes unusable", () => {
  assert.deepEqual(
    claimsLostIfSpecimenFails({
      cover: ["candidate-A", "candidate-B"],
      failedSpecimenId: "candidate-A",
      requiredClaims: REQUIRED,
      specimens: SPECIMENS,
    }),
    ["leave-and-return", "multi-phrase", "reverse-time"],
  );
});

test("same-size alternate cover remains visible after a pathological clip invalidates one specimen", () => {
  const receipt = findMinimumWitnessCovers({
    requiredClaims: REQUIRED,
    specimens: SPECIMENS.filter((specimen) => specimen.id !== "candidate-A"),
  });

  assert.equal(receipt.minimumSize, 2);
  assert.deepEqual(receipt.covers, [["candidate-C", "candidate-D"]]);
});

test("refuses to call an incomplete matrix covered", () => {
  const receipt = findMinimumWitnessCovers({
    requiredClaims: [...REQUIRED, "native-release-legibility"],
    specimens: SPECIMENS,
  });

  assert.equal(receipt.minimumSize, null);
  assert.deepEqual(receipt.covers, []);
  assert.deepEqual(receipt.uncoverableClaims, ["native-release-legibility"]);
});
