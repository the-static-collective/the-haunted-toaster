const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const porchlight = readJson("constraints/porchlight.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const sectional = readJson("fixtures/analysis/sectional.v1.json");

function scoreAt(parent, target) {
  const score = structuredClone(parent);
  score.topology = target.topology;
  score.motion.grammar = target.motionGrammar;
  score.material.texture = target.materialTexture;
  return score;
}

test("CONVERGE replay is exact for the same history, parent, locks, constraints, and seed", () => {
  const parent = generation.createVisualScore({
    seed: "converge-parent",
    constraints: porchlight,
  }).score;
  const input = {
    history: [],
    parentScore: parent,
    locks: [],
    constraints: porchlight,
    rootSeed: "converge-replay",
  };

  const first = generation.computeCoverageFrontier(input);
  const second = generation.computeCoverageFrontier(input);
  assert.deepEqual(first, second);

  const firstCandidate = generation.makeConvergeCandidate({
    ...input,
    analysis: sectional,
    rendererProfile: profile,
  });
  const secondCandidate = generation.makeConvergeCandidate({
    ...input,
    analysis: sectional,
    rendererProfile: profile,
  });
  assert.equal(firstCandidate.scoreAddress, secondCandidate.scoreAddress);
  assert.equal(firstCandidate.timelineHash, secondCandidate.timelineHash);
  assert.deepEqual(firstCandidate.frontierEvidence, secondCandidate.frontierEvidence);
});

test("declared accepted history changes frontier pressure", () => {
  const parent = generation.createVisualScore({
    seed: "history-parent",
    constraints: porchlight,
  }).score;
  const base = generation.computeCoverageFrontier({
    history: [],
    parentScore: parent,
    locks: [],
    constraints: porchlight,
    rootSeed: "history-pressure",
  });
  const visited = scoreAt(parent, base.selectedFrontierTarget);
  const afterVisit = generation.computeCoverageFrontier({
    history: [visited],
    parentScore: parent,
    locks: [],
    constraints: porchlight,
    rootSeed: "history-pressure",
  });

  assert.notDeepEqual(afterVisit.selectedFrontierTarget, base.selectedFrontierTarget);
  assert.notEqual(afterVisit.historySetHash, base.historySetHash);
  assert.equal(afterVisit.frontierSelectionReason, "deterministic-unvisited-lawful-region");
});

test("locked frontier axes remain exact and illegal targets are excluded", () => {
  const parent = generation.createVisualScore({
    seed: "locked-converge-parent",
    constraints: porchlight,
    overrides: { topology: "circle" },
  }).score;
  const candidate = generation.makeConvergeCandidate({
    history: [],
    parentScore: parent,
    locks: ["topology"],
    constraints: porchlight,
    analysis: sectional,
    rendererProfile: profile,
    rootSeed: "locked-converge",
  });

  assert.equal(candidate.frontierEvidence.selectedFrontierTarget.topology, parent.topology);
  assert.equal(candidate.scoreArtifact.score.topology, parent.topology);
  assert.equal(candidate.changedAxes.includes("topology"), false);
  assert.equal(generation.scoreWithinConstraints(candidate.scoreArtifact.score, porchlight).ok, true);
});

test("CONVERGE replaces only the final ordinary six-up slot", () => {
  const parent = generation.createVisualScore({
    seed: "replacement-parent",
    constraints: porchlight,
  }).score;
  const ordinary = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent,
    rootSeed: "replacement-family",
    count: 6,
  });
  const converged = generation.replaceFinalCandidateWithConverge(ordinary, {
    history: [],
    parentScore: parent,
    locks: [],
    constraints: porchlight,
    analysis: sectional,
    rendererProfile: profile,
    rootSeed: "replacement-family",
  });

  assert.deepEqual(converged.scoreAddresses.slice(0, 5), ordinary.scoreAddresses.slice(0, 5));
  assert.deepEqual(converged.timelineHashes.slice(0, 5), ordinary.timelineHashes.slice(0, 5));
  assert.equal(converged.roles[5], "converge-frontier");
  assert.notEqual(converged.scoreAddresses[5], ordinary.scoreAddresses[5]);
});
