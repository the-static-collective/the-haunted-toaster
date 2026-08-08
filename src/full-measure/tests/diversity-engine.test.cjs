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

function coreVisualSignature(score) {
  return generation.canonicalStringify({
    topology: score.topology,
    motion: score.motion.grammar,
    material: score.material.texture,
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

  const scores = family.candidates.map((candidate) => candidate.scoreArtifact.score);
  const signatures = scores.map(signature);
  const coverage = generation.categoricalCoverage(scores);
  assert.ok(new Set(signatures).size >= 4, "initial six should occupy at least four categorical regions");
  assert.ok(coverage.topology >= 2, "initial six should cover multiple topologies when Porchlight allows them");
  assert.ok(coverage.motion >= 2, "initial six should cover multiple motion grammars");
  assert.ok(coverage.material >= 2, "initial six should cover multiple material textures");
  assert.ok(coverage.camera >= 2, "initial six should cover multiple camera grammars");
  assert.ok(coverage.palette >= 2, "initial six should cover multiple palette logics");
  assert.ok(coverage.temporalDensity >= 2, "initial six should cover multiple temporal densities");
});

test("mutate six keeps one anchor and forces five visibly separate alternatives", () => {
  const parent = generation.createVisualScore({ seed: "visible-branch-parent", constraints: porchlight });
  const first = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent.score,
    locks: ["topology"],
    rootSeed: "visible-branch-family-root",
    count: 6,
    phase: "branch",
  });
  const second = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent.score,
    locks: ["topology"],
    rootSeed: "visible-branch-family-root",
    count: 6,
    phase: "branch",
  });

  assert.equal(first.policy, generation.VISIBLE_BRANCH_POLICY);
  assert.equal(first.distancePolicy, generation.VISIBLE_DISTANCE_POLICY);
  assert.equal(first.phase, "branch");
  assert.deepEqual(first.roles, [
    "anchor",
    "motion-break",
    "topology-composition-break",
    "material-break",
    "temporal-palette-break",
    "risky-hybrid",
  ]);
  assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
  assert.deepEqual(first.timelineHashes, second.timelineHashes);

  for (const candidate of first.candidates) {
    assert.equal(candidate.scoreArtifact.score.topology, parent.score.topology);
    assert.equal(candidate.changedAxes.includes("topology"), false);
    assert.equal(generation.scoreWithinConstraints(candidate.scoreArtifact.score, porchlight).ok, true);
  }

  assert.equal(first.candidates[0].role, "anchor");
  for (const candidate of first.candidates.slice(1)) {
    assert.ok(candidate.categoricalBreaks.length >= 1, `${candidate.role} should carry a categorical break`);
    assert.ok(candidate.visibleDistanceFromParent >= 5, `${candidate.role} should be visibly separated from parent`);
    assert.ok(candidate.minimumSiblingDistance >= 7, `${candidate.role} should be visibly separated from accepted siblings`);
  }
  assert.ok(first.candidates.at(-1).categoricalBreaks.length >= 3, "risky hybrid should combine at least three categorical breaks when lawful");
});

test("Porchlight descendants do not collapse to the same topology + motion + material outcome", () => {
  const generated = generation.createVisualScore({ seed: "halo-in-motion-parent", constraints: porchlight });
  const parent = structuredClone(generated.score);
  parent.topology = "circle";
  parent.motion.grammar = "orbit";
  parent.material.texture = "grain";

  const family = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent,
    rootSeed: "halo-in-motion-descendants",
    count: 6,
    phase: "branch",
  });

  assert.equal(family.producedCount, 6);
  const signatures = family.candidates.map((candidate) => coreVisualSignature(candidate.scoreArtifact.score));
  assert.ok(new Set(signatures).size >= 3, "descendants must not all retain the parent's topology + motion + material combination");
  assert.ok(family.candidates.some((candidate) => candidate.scoreArtifact.score.motion.grammar !== parent.motion.grammar));
  assert.ok(family.candidates.some((candidate) => candidate.scoreArtifact.score.material.texture !== parent.material.texture));
  assert.ok(family.candidates.some((candidate) => candidate.scoreArtifact.score.topology !== parent.topology));
});

test("visible branch distance is dominated by categorical outcomes rather than tiny numeric nudges", () => {
  const generated = generation.createVisualScore({ seed: "distance-weight-parent", constraints: porchlight });
  const parent = generated.score;
  const numericNudge = structuredClone(parent);
  numericNudge.motion.amplitude = Math.min(porchlight.motion.amplitude.max, parent.motion.amplitude + 0.01);
  const grammarBreak = structuredClone(parent);
  grammarBreak.motion.grammar = porchlight.motion.grammar.allowed.find((value) => value !== parent.motion.grammar);

  const numericDistance = generation.visibleSemanticDistance(parent, numericNudge, porchlight);
  const grammarDistance = generation.visibleSemanticDistance(parent, grammarBreak, porchlight);
  assert.ok(grammarDistance >= 8);
  assert.ok(grammarDistance > numericDistance * 10, "motion grammar break should outweigh a tiny amplitude change by a wide margin");
});

test("visible branch families replay from recorded policy, root seed, locks, and parent", () => {
  const parent = generation.createVisualScore({ seed: "visible-branch-replay-parent", constraints: porchlight });
  const family = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent.score,
    locks: ["palette", "topology"],
    rootSeed: "visible-branch-replay-root",
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
