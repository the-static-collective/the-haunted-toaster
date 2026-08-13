const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const constraints = readJson("constraints/porchlight.v2.json");
const profile = readJson("profiles/toaster-raster-3.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

const EXPECTED_ROLES = Object.freeze([
  "structure-break",
  "dynamics-break",
  "field-break",
  "categorical-break",
  "compound-mutant",
  "rail-rider",
]);

function parentCandidate(seed = "stomp-parent") {
  return generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: seed,
    count: 6,
    phase: "initial",
  }).candidates[2];
}

test("STOMP produces six deterministic rail roles with explicit policy evidence", () => {
  const parent = parentCandidate();
  const options = {
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    parentScore: parent.scoreArtifact.score,
    locks: [],
    rootSeed: "stomp-six",
    count: 6,
  };
  const first = generation.generateStompCandidateSet(options);
  const second = generation.generateStompCandidateSet(options);

  assert.equal(generation.STOMP_POLICY, "visible-outcome-stomp-v1");
  assert.equal(first.policy, generation.STOMP_POLICY);
  assert.equal(first.producedCount, 6);
  assert.deepEqual(first.candidates.map((candidate) => candidate.role), EXPECTED_ROLES);
  assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
  assert.deepEqual(first.timelineHashes, second.timelineHashes);
  assert.equal(first.familyHash, second.familyHash);
  assert.ok(first.candidates.every((candidate) =>
    candidate.scoreArtifact.derivation.policy.candidatePolicy === generation.STOMP_POLICY &&
    candidate.scoreArtifact.derivation.policy.stompRole === candidate.role &&
    candidate.thresholdRelaxation &&
    Number.isFinite(candidate.visibleDistanceFromParent)));
});

test("STOMP rides farther from the parent than a normal descendant family", () => {
  const parent = parentCandidate("stomp-distance-parent");
  const shared = {
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    parentScore: parent.scoreArtifact.score,
    locks: [],
    rootSeed: "stomp-distance",
    count: 6,
    phase: "branch",
  };
  const ordinary = generation.generateCandidateSet(shared);
  const stomp = generation.generateStompCandidateSet(shared);
  const average = (family) => family.candidates.reduce(
    (sum, candidate) => sum + generation.visibleSemanticDistance(
      parent.scoreArtifact.score,
      candidate.scoreArtifact.score,
      constraints,
    ),
    0,
  ) / family.candidates.length;

  assert.ok(average(stomp) > average(ordinary));
  assert.ok(stomp.candidates.every((candidate) => candidate.role !== "anchor"));
});

test("STOMP preserves broad locks and their hidden primitive domains", () => {
  const parent = parentCandidate("stomp-lock-parent").scoreArtifact.score;
  const family = generation.generateStompCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    parentScore: parent,
    locks: ["topology", "motion"],
    rootSeed: "stomp-locked",
    count: 6,
  });

  assert.equal(family.producedCount, 6);
  assert.ok(family.candidates.every((candidate) =>
    candidate.scoreArtifact.score.topology === parent.topology &&
    candidate.scoreArtifact.score.motion.grammar === parent.motion.grammar &&
    candidate.scoreArtifact.score.primitiveField.structure === parent.primitiveField.structure &&
    candidate.scoreArtifact.score.primitiveField.dynamics === parent.primitiveField.dynamics));
  assert.ok(family.candidates.some((candidate) => candidate.thresholdRelaxation.applied));
});

test("STOMP leaves ordinary mutation and renderer semantics unaware of the pedal", () => {
  const parent = parentCandidate("stomp-isolation-parent");
  const ordinary = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    parentScore: parent.scoreArtifact.score,
    rootSeed: "ordinary-after-stomp",
    count: 6,
    phase: "branch",
  });
  assert.notEqual(ordinary.policy, "visible-outcome-stomp-v1");

  const renderRoot = path.join(root, "src", "render");
  for (const name of fs.readdirSync(renderRoot).filter((entry) => entry.endsWith(".cjs"))) {
    const source = fs.readFileSync(path.join(renderRoot, name), "utf8")
      // Alpha.8 may receipt-bind the already executed Toast Feel/STOMP evidence;
      // the compiler itself must remain unaware of the pedal.
      .replace(/^\s*stompPolicy: toastFeel\.stompPolicy \|\| null,\s*$/m, "");
    assert.doesNotMatch(source, /STOMP|visible-outcome-stomp-v1/i, name);
  }
});
