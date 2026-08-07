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

function family(overrides = {}) {
  return generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    rootSeed: "issue-15-family-root",
    ...overrides,
  });
}

test("same root seed produces the same ordered six addressed and resolved candidates", () => {
  const first = family();
  const second = family();

  assert.equal(first.producedCount, 6);
  assert.equal(first.shortfall, null);
  assert.deepEqual(first.roles, [
    "near-parent",
    "motion-frontier",
    "palette-material-frontier",
    "topology-composition-frontier",
    "cross-axis-combination",
    "foreign-body-frontier",
  ]);
  assert.equal(new Set(first.scoreAddresses).size, 6);
  assert.equal(new Set(first.timelineHashes).size, 6);
  assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
  assert.deepEqual(first.timelineHashes, second.timelineHashes);
  assert.equal(first.familyHash, second.familyHash);

  for (const candidate of first.candidates) {
    assert.equal(candidate.scoreAddress, generation.addressVisualScore(candidate.scoreArtifact.score));
    assert.equal(candidate.timeline.scoreAddress, candidate.scoreAddress);
    assert.equal(candidate.timeline.timelineHash, candidate.timelineHash);
    assert.equal(generation.scoreWithinConstraints(candidate.scoreArtifact.score, porchlight).ok, true);
  }
});

test("coverage policy targets named lawful frontiers before seeded choice", () => {
  const parent = generation.createVisualScore({
    seed: "coverage-parent",
    constraints: porchlight,
  });
  const result = family({ parentScore: parent, rootSeed: "coverage-family" });
  const byRole = Object.fromEntries(result.candidates.map((candidate) => [candidate.role, candidate]));

  assert.ok(byRole["near-parent"].changedAxes.includes("motion"));
  assert.ok(
    byRole["motion-frontier"].changedAxes.some((axis) => ["motion", "temporalDensity", "camera"].includes(axis)),
  );
  assert.ok(
    byRole["palette-material-frontier"].changedAxes.some((axis) => ["palette", "material"].includes(axis)),
  );
  assert.ok(
    byRole["topology-composition-frontier"].changedAxes.some((axis) => ["topology", "camera", "lyric"].includes(axis)),
  );
  assert.ok(byRole["cross-axis-combination"].changedAxes.length >= 2);
  assert.ok(byRole["foreign-body-frontier"].changedAxes.length >= 3);
});

test("locked axes remain exact across deterministic descendants and the family replays", () => {
  const parent = generation.createVisualScore({
    seed: "locked-parent",
    constraints: porchlight,
    overrides: { topology: "circle", palette: { logic: "duotone" } },
  });
  const result = family({
    parentScore: parent,
    locks: ["topology", "palette"],
    rootSeed: "locked-descendants",
  });

  assert.equal(result.producedCount, 6);
  for (const candidate of result.candidates) {
    assert.deepEqual(candidate.scoreArtifact.score.topology, parent.score.topology);
    assert.deepEqual(candidate.scoreArtifact.score.palette, parent.score.palette);
    assert.equal(candidate.changedAxes.includes("topology"), false);
    assert.equal(candidate.changedAxes.includes("palette"), false);
  }

  const unlockedFingerprints = result.candidates.map((candidate) =>
    generation.canonicalStringify({
      motion: candidate.scoreArtifact.score.motion,
      material: candidate.scoreArtifact.score.material,
      lyric: candidate.scoreArtifact.score.lyric,
      camera: candidate.scoreArtifact.score.camera,
      temporalDensity: candidate.scoreArtifact.score.temporalDensity,
    }),
  );
  assert.ok(new Set(unlockedFingerprints).size >= 2);

  const replay = generation.replayCandidateFamily(result, {
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent,
  });
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.actualScoreAddresses, result.scoreAddresses);
  assert.deepEqual(replay.actualTimelineHashes, result.timelineHashes);
});

test("when locks exhaust creative state the family returns an explicit shortfall instead of seed churn", () => {
  const parent = generation.createVisualScore({
    seed: "fully-locked-parent",
    constraints: porchlight,
  });
  const result = family({
    parentScore: parent,
    locks: [...generation.LOCKABLE_AXES],
    rootSeed: "fully-locked-family",
  });

  assert.equal(result.producedCount, 1);
  assert.equal(result.shortfall.requested, 6);
  assert.equal(result.shortfall.produced, 1);
  assert.equal(
    result.shortfall.reason,
    "constraints-and-locks-exhausted-materially-distinct-creative-states",
  );
  assert.equal(result.shortfall.exhaustedRoles.length, 5);
});

test("locks require a parent and unknown lock names are refused", () => {
  assert.throws(
    () => family({ locks: ["palette"] }),
    /locks require parentScore/i,
  );
  const parent = generation.createVisualScore({
    seed: "lock-validation-parent",
    constraints: porchlight,
  });
  assert.throws(
    () => family({ parentScore: parent, locks: ["banana"] }),
    /Unknown candidate lock: banana/,
  );
});
