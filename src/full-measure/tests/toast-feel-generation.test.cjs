const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const toastGeneration = require("../src/generation/toast-feel-generation.cjs");
const { getToastFeel } = require("../src/toast-feels.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const constraints = readJson("constraints/open-field.v1.json");
const profile = readJson("profiles/toaster-raster-3.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

test("ordinary Toast Feel pressure is deterministic, constrained, and lock-aware", () => {
  const source = generation.createVisualScore({ seed: "toast-pressure", constraints }).score;
  const feel = getToastFeel("risky-hybrid");
  const first = toastGeneration.applyToastFeelPressure(source, constraints, feel, ["palette", "camera"]);
  const second = toastGeneration.applyToastFeelPressure(source, constraints, feel, ["palette", "camera"]);

  assert.deepEqual(first, second);
  assert.deepEqual(first.palette, source.palette);
  assert.deepEqual(first.camera, source.camera);
  assert.notEqual(first.motion.amplitude, source.motion.amplitude);
  assert.equal(generation.scoreWithinConstraints(first, constraints).ok, true);
});

test("an ordinary Toast Feel deterministically biases a complete six-up family", () => {
  const options = {
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "toast-family",
    count: 6,
    phase: "initial",
    toastFeelId: "risky-hybrid",
  };
  const first = toastGeneration.generateCandidateSet(options);
  const second = toastGeneration.generateCandidateSet(options);

  assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
  assert.deepEqual(first.timelineHashes, second.timelineHashes);
  assert.equal(first.familyHash, second.familyHash);
  assert.equal(first.toastFeel.id, "risky-hybrid");
  assert.equal(first.toastFeel.contractVersion, "toast-feel-v1");
  assert.match(first.toastFeel.pressureHash, /^[0-9a-f]{64}$/);
  assert.equal(first.candidates.length, 6);
  for (const candidate of first.candidates) {
    assert.equal(candidate.scoreArtifact.derivation.policy.toastFeel.id, "risky-hybrid");
    assert.equal(candidate.timeline.possessionArc?.policyVersion || "none", "possession-arc-v1");
    assert.equal(candidate.timeline.colorDrift?.policyVersion || "none", "color-drift-v1");
  }
});

test("unknown Toast Feel ids fail closed", () => {
  assert.throws(() => toastGeneration.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "unknown-toast",
    count: 6,
    toastFeelId: "toast-but-unlawful",
  }), /Unknown Toast Feel/);
});

test("MADD CLOWN deterministically delegates its visible family to STOMP", () => {
  const options = {
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "madd-clown-family",
    count: 6,
    phase: "initial",
    toastFeelId: "madd-clown-crazy-slots",
  };
  const first = toastGeneration.generateCandidateSet(options);
  const second = toastGeneration.generateCandidateSet(options);

  assert.equal(first.policy, "toast-feel-madd-clown-v1");
  assert.equal(first.toastFeel.semanticClass, "madd-clown");
  assert.equal(first.toastFeel.stompPolicy, "visible-outcome-stomp-v1");
  assert.match(first.toastFeel.seedParentScoreRef, /^htvs1_[0-9a-f]{64}$/);
  assert.match(first.toastFeel.seedFamilyHash, /^[0-9a-f]{64}$/);
  assert.equal(first.candidates.length, 6);
  assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
  assert.deepEqual(first.timelineHashes, second.timelineHashes);
  assert.equal(first.familyHash, second.familyHash);
  for (const candidate of first.candidates) {
    assert.equal(
      candidate.scoreArtifact.derivation.policy.candidatePolicy,
      "visible-outcome-stomp-v1",
    );
  }

  const replay = toastGeneration.replayCandidateFamily(first, {
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
  });
  assert.equal(replay.ok, true);
});
