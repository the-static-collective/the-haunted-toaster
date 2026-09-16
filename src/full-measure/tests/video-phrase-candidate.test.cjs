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

function sessionHarness() {
  const session = createCandidateSession({ renderCandidateFamilyPreviews: previewStub });
  const audioPath = path.resolve("/tmp/video-phrase-candidate.wav");
  session.noteAudio(audioPath, {
    duration: 12,
    sections: [{ start: 0, end: 12, energy: 0.5 }],
    energySamples: [],
  });
  session.noteVideo(binding());
  return {
    session,
    audioPath,
    renderConfig: { presetId: "openField", audioPath, imagePath: null },
  };
}

async function generateWitness(rootSeed) {
  const { session } = sessionHarness();
  return session.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed,
    lyrics: "",
  });
}

async function generateSessionWitness(rootSeed) {
  const harness = sessionHarness();
  const view = await harness.session.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed,
    lyrics: "",
  });
  return { ...harness, view };
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

test("KEEP freezes the exact candidate VideoPhrasePlan into final render authority", async () => {
  const { session, view, renderConfig } = await generateSessionWitness("candidate-video-phrase-keep");
  const chosen = view.candidates[2];
  const kept = session.keep({ familyHash: view.familyHash, index: chosen.index });
  assert.equal(kept.videoPhrasePlanHash, chosen.videoPhrasePlanHash);
  assert.equal(kept.receipt.videoPhrasePlanHash, chosen.videoPhrasePlanHash);

  const execution = session.executionForRender(renderConfig);
  assert.equal(execution.foreignVisualMaterial.videoPhrasePlanHash, chosen.videoPhrasePlanHash);
  assert.equal(execution.foreignVisualMaterial.videoPhrasePlan.planHash, chosen.videoPhrasePlanHash);
});

test("same admitted Video source cannot revoke KEEP or rewrite its candidate-owned phrase plan", async () => {
  const { session, view, renderConfig } = await generateSessionWitness("candidate-video-phrase-source-law");
  const chosen = view.candidates[1];
  session.keep({ familyHash: view.familyHash, index: chosen.index });

  session.noteVideo({
    ...binding(),
    path: path.resolve("relocated-candidate-phrase-witness.mp4"),
    filename: "relocated-candidate-phrase-witness.mp4",
    digestOperatorId: "clip-motion-mask-v1",
    samplingPolicyId: "play-source-once-v1",
  });
  const preserved = session.executionForRender(renderConfig);
  assert.equal(preserved.foreignVisualMaterial.videoPhrasePlanHash, chosen.videoPhrasePlanHash);

  session.noteVideo({
    ...binding(),
    specimenId: `sha256:${"e".repeat(64)}:2048`,
    sourceSha256: "e".repeat(64),
    path: path.resolve("replacement-video.mp4"),
    filename: "replacement-video.mp4",
  });
  assert.throws(
    () => session.executionForRender(renderConfig),
    { code: "CANDIDATE_RENDER_KEEP_REQUIRED" },
    "replacing source content must revoke stale KEEP",
  );
});