const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createCandidateSession } = require("../src/candidate-session.cjs");

const root = path.resolve(__dirname, "..");
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, "fixtures/analysis/sectional.v1.json"), "utf8"),
);

const audioPath = path.resolve("/tmp/Breathing House.wav");
const inspectedAudioSha256 = "1".repeat(64);
const replacedAudioSha256 = "2".repeat(64);
const mediaAnalysis = Object.freeze({
  filename: "Breathing House.wav",
  sizeBytes: 35_067_052,
  duration: fixture.durationSeconds,
  formatName: "wav",
  audio: Object.freeze({ codec: "pcm_s16le", sampleRate: 48_000, channels: 2 }),
  energySamples: Object.freeze([]),
  sections: Object.freeze(
    fixture.sections.map((section, index) =>
      Object.freeze({
        index,
        label: section.label,
        start: section.startSeconds,
        end: section.endSeconds,
        energy: section.energy,
      }),
    ),
  ),
});

async function previewView(_config, family) {
  return {
    familyHash: family.familyHash,
    candidates: family.candidates.map((candidate) => ({
      index: candidate.index,
      scoreAddress: candidate.scoreAddress,
      timelineHash: candidate.timelineHash,
      forcedWitness: candidate.forcedWitness === true,
      fixtureSlot: candidate.fixtureSlot || null,
    })),
  };
}

function session() {
  const value = createCandidateSession({ renderCandidateFamilyPreviews: previewView });
  value.noteAudio(audioPath, mediaAnalysis);
  return value;
}

test("selected TEST 6 KITCHEN SINK reaches final render despite unrelated front-panel Toast Feel", async () => {
  const value = session();
  const family = await value.generateTestSix({
    presetId: "openField",
    toastFeelId: null,
    rootSeed: "test-6-render-handoff",
    lyrics: "",
  });
  const selected = value.select({ familyHash: family.familyHash, index: 5 });

  const execution = value.executionForRender({
    audioPath,
    imagePath: null,
    presetId: "openField",
    toastFeelId: "low-and-slow",
  });

  assert.ok(execution, "accepted TEST 6 selection must not collapse to legacy render");
  assert.equal(execution.resolvedTimeline.timelineHash, selected.timelineHash);
  assert.equal(execution.forcedWitnessEvidence?.fixtureFamily, "test-6");
  assert.equal(execution.forcedWitnessEvidence?.fixtureSlot, "kitchen-sink");
  assert.equal(execution.atmosphereResolutionScale, 0.5);
  assert.deepEqual(execution.resolvedTimeline.renderConfig, {
    atmosphereResolutionScale: 0.5,
  });
  assert.deepEqual(execution.forcedRenderConfig, execution.resolvedTimeline.renderConfig);
});

test("a stale ordinary selected candidate refuses instead of silently falling back to legacy render", async () => {
  const value = session();
  const family = await value.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed: "ordinary-render-handoff",
    lyrics: "",
  });
  value.select({ familyHash: family.familyHash, index: 0 });

  assert.throws(
    () =>
      value.executionForRender({
        audioPath,
        imagePath: null,
        presetId: "porchlight",
        toastFeelId: "low-and-slow",
      }),
    /selected candidate.*render inputs|render inputs.*selected candidate/i,
  );
});

test("selected candidate refuses when source audio bytes change at the same path", async () => {
  const value = createCandidateSession({ renderCandidateFamilyPreviews: previewView });
  value.noteAudio(audioPath, {
    ...mediaAnalysis,
    sourceSha256: inspectedAudioSha256,
  });
  const family = await value.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed: "content-bound-render-handoff",
    lyrics: "",
  });
  value.select({ familyHash: family.familyHash, index: 0 });

  assert.throws(
    () =>
      value.executionForRender({
        audioPath,
        audioSourceSha256: replacedAudioSha256,
        imagePath: null,
        presetId: "openField",
        toastFeelId: "low-and-slow",
      }),
    /selected candidate.*render inputs|render inputs.*selected candidate/i,
  );
});
