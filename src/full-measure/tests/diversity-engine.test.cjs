const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const porchlight = readJson("constraints/porchlight.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const sectional = readJson("fixtures/analysis/sectional.v1.json");

function signature(score) {
  return generation.canonicalStringify({
    topology: score.topology,
    motion: score.motion.grammar,
    palette: score.palette.logic,
    material: score.material.texture,
    camera: score.camera.grammar,
    temporalDensity: score.temporalDensity,
  });
}

test("initial six remains coverage-first and visibly spans categorical creative regions", () => {
  const family = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    rootSeed: "diversity-initial-proof",
    count: 6,
    phase: "initial",
  });

  assert.equal(family.policy, generation.CANDIDATE_FAMILY_POLICY);
  assert.equal(family.producedCount, 6);
  assert.deepEqual(family.roles, [
    "near-parent",
    "motion-frontier",
    "palette-material-frontier",
    "topology-composition-frontier",
    "cross-axis-combination",
    "foreign-body-frontier",
  ]);

  const signatures = family.candidates.map((candidate) => signature(candidate.scoreArtifact.score));
  assert.ok(new Set(signatures).size >= 4, "initial six should occupy at least four categorical regions");
});

test("mutate six explores the chosen branch instead of rerunning global frontier coverage", () => {
  const parent = generation.createVisualScore({ seed: "branch-parent", constraints: porchlight });
  const first = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent.score,
    locks: ["topology"],
    rootSeed: "branch-family-root",
    count: 6,
    phase: "branch",
  });
  const second = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent.score,
    locks: ["topology"],
    rootSeed: "branch-family-root",
    count: 6,
    phase: "branch",
  });

  assert.equal(first.policy, generation.BRANCH_EXPLORATION_POLICY);
  assert.equal(first.phase, "branch");
  assert.deepEqual(first.roles, [
    "branch-motion",
    "branch-palette",
    "branch-material",
    "branch-composition",
    "branch-temporal",
    "branch-hybrid",
  ]);
  assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
  assert.deepEqual(first.timelineHashes, second.timelineHashes);

  for (const candidate of first.candidates) {
    assert.equal(candidate.scoreArtifact.score.topology, parent.score.topology);
    assert.equal(candidate.changedAxes.includes("topology"), false);
    assert.equal(generation.scoreWithinConstraints(candidate.scoreArtifact.score, porchlight).ok, true);
  }

  assert.ok(first.candidates.some((candidate) => candidate.changedAxes.includes("motion")));
  assert.ok(first.candidates.some((candidate) => candidate.changedAxes.includes("palette")));
  assert.ok(first.candidates.some((candidate) => candidate.changedAxes.includes("material")));
});

test("branch families replay from recorded phase policy, root seed, locks, and parent", () => {
  const parent = generation.createVisualScore({ seed: "branch-replay-parent", constraints: porchlight });
  const family = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent.score,
    locks: ["palette", "topology"],
    rootSeed: "branch-replay-root",
    count: 6,
    phase: "branch",
  });
  const replay = generation.replayCandidateFamily(family, {
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent.score,
  });

  assert.equal(replay.ok, true);
  assert.deepEqual(replay.actualScoreAddresses, family.scoreAddresses);
  assert.deepEqual(replay.actualTimelineHashes, family.timelineHashes);
});
