const test = require("node:test");
const assert = require("node:assert/strict");
const {
  VIDEO_PHRASE_PLAN_SCHEMA,
  createVideoPhrasePlan,
} = require("../src/render/video-phrase-plan.cjs");

function binding(path) {
  return {
    specimenId: "vsp1_" + "a".repeat(64),
    sourceSha256: "b".repeat(64),
    byteLength: 123456,
    path,
    probe: {
      durationSeconds: 4,
      width: 640,
      height: 360,
      fps: 24,
    },
  };
}

const timeline = Object.freeze({
  durationTicks: 120000,
  timebase: 1000,
});

test("VideoPhrasePlan v1 replays deterministically and ignores source path metadata", () => {
  const first = createVideoPhrasePlan({
    videoBinding: binding("C:/clips/a.mp4"),
    timeline,
    seed: "candidate-A",
  });
  const moved = createVideoPhrasePlan({
    videoBinding: binding("D:/renamed/source.mp4"),
    timeline,
    seed: "candidate-A",
  });

  assert.equal(VIDEO_PHRASE_PLAN_SCHEMA, "haunted-toaster/video-phrase-plan/v1");
  assert.equal(first.schema, VIDEO_PHRASE_PLAN_SCHEMA);
  assert.equal(first.policyVersion, "toaster-spectrum/v1");
  assert.match(first.planHash, /^[0-9a-f]{64}$/);
  assert.equal(first.planHash, moved.planHash);
  assert.deepEqual(first.phrases, moved.phrases);
  assert.equal(first.source.specimenId, binding("ignored").specimenId);
  assert.equal(first.source.sourceSha256, binding("ignored").sourceSha256);
  assert.ok(Number.isFinite(first.spectrum));
  assert.ok(first.spectrum >= 0 && first.spectrum <= 1);
  assert.ok(first.phrases.length >= 1);
});
