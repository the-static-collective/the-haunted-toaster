const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const nativeGeneration = require("../src/generation/native-color-generation.cjs");
const toastGeneration = require("../src/generation/toast-feel-generation.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const analysis = readJson("fixtures/analysis/sectional.v1.json");
const constraints = readJson("constraints/open-field.v1.json");
const rendererProfile = readJson("profiles/toaster-raster-3.json");
const profile = Object.freeze({
  sourceSha256: "3".repeat(64),
  profileSha256: "4".repeat(64),
  hueCentroidDegrees: 26,
  saturationMean: 0.76,
  chromaWeight: 0.82,
});

test("six-up deterministically covers preferred and alternate Native Color relationships", () => {
  const options = {
    analysis,
    garmentConstraints: constraints,
    rendererProfile,
    rootSeed: "native-color-family",
    count: 6,
    toastFeelId: "risky-hybrid",
    nativeChromaticProfile: profile,
  };
  const first = nativeGeneration.generateCandidateSet(options);
  const second = nativeGeneration.generateCandidateSet(options);
  assert.deepEqual(first.candidates.map(({ timeline }) => timeline.nativeColor.relationship), [
    "counterpoint", "echo", "counterpoint", "echo", "counterpoint", "echo",
  ]);
  assert.equal(first.nativeColor.preferredRelationship, "counterpoint");
  assert.deepEqual(first.nativeColor.relationships, ["echo", "counterpoint"]);
  assert.deepEqual(first.timelineHashes, second.timelineHashes);
  assert.equal(first.familyHash, second.familyHash);
  assert.ok(first.candidates.every((candidate, index) =>
    candidate.scoreAddress === toastGeneration.generateCandidateSet(options).candidates[index].scoreAddress));
});

test("palette lock preserves the parent relationship across descendants", () => {
  const parentFamily = nativeGeneration.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile,
    rootSeed: "native-color-parent",
    count: 6,
    toastFeelId: "low-and-slow",
    nativeChromaticProfile: profile,
  });
  const parent = parentFamily.candidates[0];
  assert.equal(parent.timeline.nativeColor.relationship, "echo");
  const descendants = nativeGeneration.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile,
    rootSeed: "native-color-locked",
    count: 6,
    parentScore: parent.scoreArtifact.score,
    locks: ["palette"],
    toastFeelId: "risky-hybrid",
    nativeChromaticProfile: profile,
    parentNativeColorPlan: parent.timeline.nativeColor,
  });
  assert.ok(descendants.candidates.every(({ timeline }) => timeline.nativeColor.relationship === "echo"));
});

test("without an admitted image profile Native Color is an exact no-op", () => {
  const options = {
    analysis,
    garmentConstraints: constraints,
    rendererProfile,
    rootSeed: "native-color-no-profile",
    count: 6,
    toastFeelId: "wire-heat",
  };
  const expected = toastGeneration.generateCandidateSet(options);
  const actual = nativeGeneration.generateCandidateSet(options);
  assert.deepEqual(actual, expected);
  assert.equal(actual.nativeColor, undefined);
});
