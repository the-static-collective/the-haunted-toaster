const assert = require("node:assert/strict");
const test = require("node:test");

const { createCandidateSession } = require("../src/candidate-session.cjs");

function createTestSession() {
  return createCandidateSession({
    renderCandidateFamilyPreviews: async (_input, family) => ({
      familyHash: family.familyHash,
      candidates: family.candidates,
    }),
  });
}

function primeSession(session) {
  session.noteAudio("/tmp/converge-contract.wav", {
    duration: 12,
    sections: [
      { start: 0, end: 12, energy: 0.5, label: "whole-song" },
    ],
  });
}

function baseConfig(rootSeed) {
  return {
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed,
    title: "",
    artist: "",
    lyrics: "",
  };
}

function coverageProjection(score) {
  return {
    topology: score.topology,
    motionGrammar: score.motion.grammar,
    materialTexture: score.material.texture,
  };
}

test("fresh-session CONVERGE counts the selected parent before choosing a frontier", async () => {
  const session = createTestSession();
  primeSession(session);
  const config = baseConfig("issue-133-selected-parent");
  const initial = await session.generate(config);
  const parent = initial.candidates[0];

  const branch = await session.mutate({
    ...config,
    familyHash: initial.familyHash,
    parentIndex: 0,
    converge: true,
    locks: [],
  });
  const child = branch.candidates.find((candidate) => candidate.role === "converge-frontier");

  assert.ok(child, "CONVERGE should replace one branch slot with a frontier child");
  assert.equal(child.frontierEvidence.historyCount, 1);
  assert.notDeepEqual(
    child.frontierEvidence.selectedFrontierTarget,
    coverageProjection(parent.scoreArtifact.score),
  );
  assert.ok(child.changedAxes.length > 0, "CONVERGE must visibly leave its selected parent");
});

test("CONVERGE explicitly refuses when locks leave no distinct coverage target", async () => {
  const session = createTestSession();
  primeSession(session);
  const config = baseConfig("issue-133-locked-refusal");
  const initial = await session.generate(config);

  await assert.rejects(
    () => session.mutate({
      ...config,
      familyHash: initial.familyHash,
      parentIndex: 0,
      converge: true,
      locks: ["topology", "motion", "material"],
    }),
    (error) => {
      assert.equal(error.code, "CONVERGE_NO_DISTINCT_TARGET");
      assert.match(error.message, /no distinct coverage target/i);
      return true;
    },
  );
});
