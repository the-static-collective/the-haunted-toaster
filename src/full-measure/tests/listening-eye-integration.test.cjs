const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createCandidateSession,
} = require("../src/candidate-session.cjs");

function mediaAnalysis() {
  return {
    duration: 90,
    sections: [
      { start: 0, end: 20, energy: 0.20, label: "opening" },
      { start: 20, end: 52, energy: 0.68, label: "lift" },
      { start: 52, end: 74, energy: 0.90, label: "peak" },
      { start: 74, end: 90, energy: 0.36, label: "release" },
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
        })),
      };
    },
  });
  session.__families = families;
  return session;
}

async function birth({ listeningEye = null } = {}) {
  const session = createSession();
  session.noteAudio("listening-eye-song.mp3", mediaAnalysis());
  const view = await session.generate({
    presetId: "openField",
    rootSeed: "listening-eye-crossing-001",
    title: "Listening Eye",
    artist: "Static Collective",
    lyrics: "",
    listeningEye,
  });
  return { session, view, family: session.__families[0] };
}

test("LISTENING-EYE-CROSSING-001 is opt-in, bounded, deterministic, and excisable", async () => {
  const baselineA = await birth();
  const directedA = await birth({
    listeningEye: {
      enabled: true,
      albumContext: {
        albumId: "concept-album-a",
        albumSeed: "shared-world",
        trackIndex: 2,
        trackCount: 9,
      },
    },
  });
  const directedB = await birth({
    listeningEye: {
      enabled: true,
      albumContext: {
        albumId: "concept-album-a",
        albumSeed: "shared-world",
        trackIndex: 2,
        trackCount: 9,
      },
    },
  });
  const baselineB = await birth();

  assert.equal(directedA.view.listeningEye?.authority, "influence-only");
  assert.equal(directedA.view.listeningEye?.candidateLenses?.length, 6);
  assert.equal(directedA.family.candidates.length, 6);
  assert.ok(directedA.family.candidates.every((candidate) =>
    candidate.listeningEyeInfluence?.authority === "influence-only"));

  assert.notEqual(directedA.view.familyHash, baselineA.view.familyHash);
  assert.ok(directedA.view.candidates.some((candidate, index) =>
    candidate.scoreAddress !== baselineA.view.candidates[index].scoreAddress));

  assert.equal(directedA.view.familyHash, directedB.view.familyHash);
  assert.deepEqual(
    directedA.view.candidates.map(({ scoreAddress, timelineHash }) => [scoreAddress, timelineHash]),
    directedB.view.candidates.map(({ scoreAddress, timelineHash }) => [scoreAddress, timelineHash]),
  );

  assert.equal(baselineA.view.familyHash, baselineB.view.familyHash);
  assert.deepEqual(
    baselineA.view.candidates.map(({ scoreAddress, timelineHash }) => [scoreAddress, timelineHash]),
    baselineB.view.candidates.map(({ scoreAddress, timelineHash }) => [scoreAddress, timelineHash]),
  );
  assert.equal(baselineB.view.listeningEye, undefined);
});

test("Listening Eye family records one distinct art-direction lens per candidate slot", async () => {
  const directed = await birth({
    listeningEye: {
      enabled: true,
      albumContext: { trackIndex: 1, trackCount: 6 },
    },
  });
  const ids = directed.view.listeningEye.candidateLenses.map((item) => item.lensId);
  assert.deepEqual(ids, [
    "landscape",
    "architecture",
    "organism",
    "sigil",
    "weather",
    "dimensional-space",
  ]);
  assert.equal(new Set(ids).size, 6);
  assert.ok(directed.view.listeningEye.candidateLenses.every((item) =>
    Array.isArray(item.changedAxes)));
});
