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

test("ordinary GRAB admission binds one L BRANCH bank and one Mix Plan per accepted timeline before preview/final render", async () => {
  let admittedFamily = null;
  const value = createCandidateSession({
    async renderCandidateFamilyPreviews(_config, family) {
      admittedFamily = family;
      return {
        familyHash: family.familyHash,
        candidates: family.candidates.map((candidate) => ({
          index: candidate.index,
          scoreAddress: candidate.scoreAddress,
          timelineHash: candidate.timelineHash,
        })),
      };
    },
  });
  value.noteAudio(audioPath, mediaAnalysis);

  const view = await value.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed: "walk-d-production-admission",
    lyrics: "",
  });

  assert.ok(admittedFamily, "preview must receive the admitted candidate family");
  assert.equal(admittedFamily.lBranch?.schema, "haunted-toaster/l-branch-family/v1");
  assert.match(admittedFamily.lBranch?.laneBankHash || "", /^[0-9a-f]{64}$/);
  assert.equal(view.familyHash, admittedFamily.familyHash);

  for (const candidate of admittedFamily.candidates) {
    assert.equal(candidate.laneBankHash, admittedFamily.lBranch.laneBankHash);
    assert.match(candidate.mixPlanHash || "", /^[0-9a-f]{64}$/);
    assert.equal(candidate.timeline.lBranch?.laneBankHash, candidate.laneBankHash);
    assert.equal(candidate.timeline.lBranch?.mixPlan?.planHash, candidate.mixPlanHash);
    assert.equal(candidate.timeline.lBranch?.execution?.planHash, candidate.mixPlanHash);
    assert.equal(
      candidate.timeline.lBranch?.mixPlan?.sourceTimelineHash,
      candidate.timeline.lBranch?.execution?.sourceTimelineHash,
    );
    assert.notEqual(
      candidate.timeline.lBranch?.mixPlan?.sourceTimelineHash,
      candidate.timelineHash,
      "binding must describe the post-GRAB source timeline, not recurse into its rebound identity",
    );
  }

  const selectedCandidate = admittedFamily.candidates[0];
  const selectionAck = value.select({ familyHash: view.familyHash, index: selectedCandidate.index });
  const execution = value.executionForRender({
    audioPath,
    imagePath: null,
    presetId: "openField",
    toastFeelId: "low-and-slow",
  });

  assert.equal(selectionAck.timelineHash, selectedCandidate.timelineHash);
  assert.equal(execution.resolvedTimeline.timelineHash, selectedCandidate.timelineHash);
  assert.equal(
    execution.resolvedTimeline.lBranch?.laneBankHash,
    selectedCandidate.laneBankHash,
  );
  assert.equal(
    execution.resolvedTimeline.lBranch?.mixPlan?.planHash,
    selectedCandidate.mixPlanHash,
  );
});
