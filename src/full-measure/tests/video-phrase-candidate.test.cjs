const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createCandidateSession } = require("../src/candidate-session.cjs");
const { normalizeVideoPhrasePlan } = require("../src/render/video-phrase-plan.cjs");

function binding() {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${"d".repeat(64)}:2048`,
    sourceSha256: "d".repeat(64),
    byteLength: 2048,
    path: path.resolve("candidate-phrase-witness.mp4"),
    filename: "candidate-phrase-witness.mp4",
    probe: {
      durationSeconds: 4,
      width: 640,
      height: 360,
      frameRate: "30/1",
      frameCount: 120,
    },
    persisted: false,
  };
}

function previewStub(_config, family) {
  return Promise.resolve({
    familyHash: family.familyHash,
    candidates: family.candidates.map((candidate) => ({
      index: candidate.index,
      scoreAddress: candidate.scoreAddress,
      timelineHash: candidate.timelineHash,
      videoPhrasePlanHash: candidate.videoPhrasePlanHash || null,
      videoPhrasePlan: candidate.videoPhrasePlan || null,
    })),
  });
}

async function generateWitness(rootSeed) {
  const session = createCandidateSession({ renderCandidateFamilyPreviews: previewStub });
  session.noteAudio(path.resolve("/tmp/video-phrase-candidate.wav"), {
    duration: 12,
    sections: [{ start: 0, end: 12, energy: 0.5 }],
    energySamples: [],
  });
  session.noteVideo(binding());
  return session.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed,
    lyrics: "",
  });
}

test("six-up candidates own distinct deterministic VideoPhrasePlan identities", async () => {
  const view = await generateWitness("candidate-video-phrase-ownership");
  assert.equal(view.candidates.length, 6);
  for (const candidate of view.candidates) {
    const normalized = normalizeVideoPhrasePlan(candidate.videoPhrasePlan);
    assert.equal(candidate.videoPhrasePlanHash, normalized.planHash);
    assert.equal(normalized.timeline.durationTicks, candidate.videoPhrasePlan.timeline.durationTicks);
  }
  assert.ok(
    new Set(view.candidates.map((candidate) => candidate.videoPhrasePlanHash)).size >= 2,
    "candidate family must not collapse to one global Video phrase plan",
  );
});

test("same family seed replays the same ordered VideoPhrasePlan hashes", async () => {
  const first = await generateWitness("candidate-video-phrase-replay");
  const second = await generateWitness("candidate-video-phrase-replay");
  assert.deepEqual(
    second.candidates.map((candidate) => candidate.videoPhrasePlanHash),
    first.candidates.map((candidate) => candidate.videoPhrasePlanHash),
  );
});
