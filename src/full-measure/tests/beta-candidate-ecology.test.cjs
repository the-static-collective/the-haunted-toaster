const test = require("node:test");
const assert = require("node:assert/strict");

const generation = require("../src/generation/index.cjs");
const { deriveBuildCapabilities } = require("../src/build-capabilities.cjs");
const {
  CONSTRAINTS_BY_PRESET,
  createCandidateSession,
  rendererProfile,
  toGenerationAnalysis,
} = require("../src/candidate-session.cjs");

function mediaAnalysis() {
  return {
    duration: 60,
    sections: [
      { start: 0, end: 20, energy: 0.25, label: "opening" },
      { start: 20, end: 42, energy: 0.72, label: "lift" },
      { start: 42, end: 60, energy: 0.48, label: "return" },
    ],
    energySamples: [],
  };
}

function createSession() {
  const families = [];
  const session = createCandidateSession({
    renderCandidateFamilyPreviews: async (_source, family) => {
      families.push(family);
      return {
        familyHash: family.familyHash,
        candidates: family.candidates.map((candidate) => ({
          index: candidate.index,
          role: candidate.role,
          scoreAddress: candidate.scoreAddress,
          timelineHash: candidate.timelineHash,
          toastmoodLane: candidate.toastmoodLane || null,
          crossLineage: candidate.crossLineage || null,
        })),
      };
    },
  });
  session.__families = families;
  return session;
}

async function generateField(session, rootSeed = "beta-ecology-no-preselection") {
  session.noteAudio("beta-ecology-song.mp3", mediaAnalysis());
  return session.generate({
    presetId: "openField",
    rootSeed,
    title: "Beta Ecology",
    artist: "Static Collective",
    lyrics: "",
  });
}

test("build capabilities truthfully advertise landed beta candidate ecology", () => {
  assert.equal(generation.TOASTMOOD_FIELD_POLICY, "toastmood-field-v1");
  assert.equal(generation.CROSS_POLICY, "two-parent-cross-v1");
  assert.ok(deriveBuildCapabilities().capabilities.includes("betaCandidateEcologyV1"));
});

test("ordinary beta generation reaches six lane-identified candidates without Toast Feel preselection", async () => {
  const session = createSession();
  const view = await generateField(session);

  assert.equal(view.candidates.length, 6);
  assert.equal(view.toastFeel, null);
  assert.equal(view.toastmoodField?.policy, "toastmood-field-v1");
  assert.equal(view.toastmoodField?.mandatoryPreselection, false);
  assert.equal(view.toastmoodField?.candidateLanes?.length, 6);
  assert.equal(new Set(view.toastmoodField.candidateLanes.map((lane) => lane.id)).size, 6);
  assert.ok(view.candidates.every(
    (candidate) => candidate.role === `toastmood:${candidate.toastmoodLane?.id}`,
  ));
});

test("beta initial field records and replays chromatic coverage as first-class evidence", async () => {
  assert.equal(typeof generation.startingChromaticIdentity, "function");
  assert.equal(typeof generation.toastmoodFieldCoverage, "function");

  const firstSession = createSession();
  const secondSession = createSession();
  const first = await generateField(firstSession, "field-replay-seed");
  const second = await generateField(secondSession, "field-replay-seed");

  assert.ok(first.toastmoodField.coverage.chromaticIdentityCount >= 3);
  assert.ok(first.toastmoodField.coverage.topologyChromaticPairCount >= 3);
  assert.deepEqual(
    first.candidates.map(({ scoreAddress, timelineHash }) => [scoreAddress, timelineHash]),
    second.candidates.map(({ scoreAddress, timelineHash }) => [scoreAddress, timelineHash]),
  );
  assert.equal(first.toastmoodField.fieldSha256, second.toastmoodField.fieldSha256);
});

test("explicit Toast Feel remains a compatible opt-in bias", async () => {
  const session = createSession();
  session.noteAudio("beta-explicit-feel.mp3", mediaAnalysis());
  const view = await session.generate({
    presetId: "openField",
    toastFeelId: "wire-heat",
    rootSeed: "explicit-feel-still-lawful",
    lyrics: "",
  });
  assert.equal(view.toastFeel.id, "wire-heat");
  assert.equal(view.toastmoodField, null);
});

test("candidate session exposes exact two-parent CROSS with typed genealogy", async () => {
  const session = createSession();
  const first = await generateField(session, "cross-parent-field");
  const crossed = await session.cross({
    presetId: "openField",
    familyHash: first.familyHash,
    parentIndexes: [0, 1],
    rootSeed: "two-parent-cross",
    locks: [],
    lyrics: "",
  });

  assert.equal(generation.CROSS_POLICY, "two-parent-cross-v1");
  assert.equal(typeof generation.generateCrossCandidateSet, "function");
  assert.equal(crossed.candidates.length, 6);
  assert.equal(crossed.cross.policy, generation.CROSS_POLICY);
  assert.equal(crossed.cross.parentScoreRefs.length, 2);
  assert.notEqual(crossed.cross.parentScoreRefs[0], crossed.cross.parentScoreRefs[1]);
  assert.ok(crossed.candidates.every((candidate) => candidate.crossLineage?.policy === generation.CROSS_POLICY));
  assert.equal(new Set(crossed.candidates.map((candidate) => candidate.crossLineage.planId)).size, 6);
});

test("CROSS replay reconstructs the exact family from the same two parents and seed", async () => {
  const session = createSession();
  const first = await generateField(session, "cross-replay-parents");
  await session.cross({
    presetId: "openField",
    familyHash: first.familyHash,
    parentIndexes: [0, 1],
    rootSeed: "cross-replay-children",
    locks: [],
    lyrics: "",
  });

  const parentFamily = session.__families[0];
  const crossFamily = session.__families[1];
  const analysis = toGenerationAnalysis(mediaAnalysis());
  const responseWitness = generation.deriveResponseWitness({
    energySamples: [],
    sections: analysis.sections,
    durationSeconds: mediaAnalysis().duration,
  });
  const replay = generation.replayCandidateFamily(crossFamily, {
    analysis,
    responseWitness,
    garmentConstraints: CONSTRAINTS_BY_PRESET.openField,
    rendererProfile,
    parentCandidates: [parentFamily.candidates[0], parentFamily.candidates[1]],
  });

  assert.equal(replay.ok, true);
  assert.equal(replay.familyHashMatches, true);
  assert.equal(replay.addressesMatch, true);
  assert.equal(replay.timelinesMatch, true);
});

test("explicit Toast Feel pressure remains bound through CROSS", async () => {
  const session = createSession();
  session.noteAudio("explicit-cross.mp3", mediaAnalysis());
  const first = await session.generate({
    presetId: "openField",
    toastFeelId: "wire-heat",
    rootSeed: "explicit-cross-parents",
    lyrics: "",
  });
  const crossed = await session.cross({
    presetId: "openField",
    toastFeelId: "wire-heat",
    familyHash: first.familyHash,
    parentIndexes: [0, 1],
    rootSeed: "explicit-cross-children",
    locks: [],
    lyrics: "",
  });
  assert.equal(crossed.toastFeel.id, "wire-heat");
  assert.equal(crossed.cross.policy, generation.CROSS_POLICY);
});

test("CROSS refuses anything other than two distinct current parents", async () => {
  const session = createSession();
  const first = await generateField(session, "cross-refusal-field");

  await assert.rejects(() => session.cross({
    presetId: "openField",
    familyHash: first.familyHash,
    parentIndexes: [0],
    rootSeed: "one-parent-is-not-cross",
  }), /exactly two/i);
  await assert.rejects(() => session.cross({
    presetId: "openField",
    familyHash: first.familyHash,
    parentIndexes: [0, 0],
    rootSeed: "same-parent-is-not-cross",
  }), /distinct/i);
});
