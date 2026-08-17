const assert = require("node:assert/strict");
const test = require("node:test");

const generation = require("../src/generation/index.cjs");
const { CONSTRAINTS_BY_PRESET, rendererProfile } = require("../src/candidate-session.cjs");

function analysis() {
  return {
    schema: generation.ANALYSIS_SCHEMA,
    durationSeconds: 9,
    sections: [{ startSeconds: 0, endSeconds: 9, energy: 0.55, label: "Steady" }],
    phrases: [],
    transients: [],
  };
}

function witness(dbValues) {
  return generation.deriveResponseWitness({
    energySamples: dbValues.map((db, time) => ({ time, db })),
    sections: analysis().sections,
    durationSeconds: 9,
  });
}

function options(responseWitness) {
  return {
    analysis: analysis(),
    responseWitness,
    garmentConstraints: CONSTRAINTS_BY_PRESET.openField,
    rendererProfile,
    rootSeed: "task2-replay-witness",
    count: 6,
    phase: "initial",
    toastFeelId: "low-and-slow",
  };
}

test("raster-4 replay reproduces nested response while witness changes leave score identity alone", () => {
  const firstWitness = witness([-28, -25, -21, -20, -22, -27, -29, -24, -20]);
  const family = generation.generateCandidateSet(options(firstWitness));
  const replay = generation.replayCandidateFamily(family, options(firstWitness));

  assert.equal(replay.ok, true);
  assert.deepEqual(
    replay.replayed.candidates.map((candidate) => candidate.timeline.nestedResponse.planSha256),
    family.candidates.map((candidate) => candidate.timeline.nestedResponse.planSha256),
  );

  const changedWitness = witness([-28, -25, -21, -20, -22, -27, -29, -18, -12]);
  const changed = generation.generateCandidateSet(options(changedWitness));
  assert.deepEqual(changed.scoreAddresses, family.scoreAddresses);
  assert.notDeepEqual(
    changed.candidates.map((candidate) => candidate.timeline.nestedResponse.planSha256),
    family.candidates.map((candidate) => candidate.timeline.nestedResponse.planSha256),
  );
});
