const test = require("node:test");
const assert = require("node:assert/strict");
const {
  VIDEO_PHRASE_PLAN_SCHEMA,
  MAX_PHRASES,
  MAX_OVERLAPS,
  MAX_CYCLES,
  createVideoPhrasePlan,
  normalizeVideoPhrasePlan,
  hashVideoPhrasePlan,
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

function generated() {
  return createVideoPhrasePlan({
    videoBinding: binding("C:/clips/a.mp4"),
    timeline,
    seed: "candidate-A",
  });
}

function mutatePlan(mutator) {
  const plan = structuredClone(generated());
  delete plan.planHash;
  mutator(plan);
  return plan;
}

test("VideoPhrasePlan v1 replays deterministically and ignores source path metadata", () => {
  const first = generated();
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

test("normalizer reproduces canonical plan identity", () => {
  const plan = generated();
  const normalized = normalizeVideoPhrasePlan(plan);
  assert.deepEqual(normalized, plan);
  assert.equal(hashVideoPhrasePlan(plan), plan.planHash);
  assert.equal(MAX_PHRASES, 6);
  assert.equal(MAX_OVERLAPS, 2);
  assert.equal(MAX_CYCLES, 4);
});

test("normalizer refuses empty phrase spans and source windows outside the specimen", () => {
  assert.throws(
    () => normalizeVideoPhrasePlan(mutatePlan((plan) => {
      plan.phrases[0].endTick = plan.phrases[0].startTick;
    })),
    /span|tick|duration/i,
  );
  assert.throws(
    () => normalizeVideoPhrasePlan(mutatePlan((plan) => {
      plan.phrases[0].sourceWindow.endSeconds = plan.source.durationSeconds + 0.001;
    })),
    /source.*window|duration/i,
  );
});

test("normalizer refuses unbounded cycles, operators, rotations, and non-finite rate", () => {
  assert.throws(
    () => normalizeVideoPhrasePlan(mutatePlan((plan) => { plan.phrases[0].cycles = MAX_CYCLES + 1; })),
    /cycles/i,
  );
  assert.throws(
    () => normalizeVideoPhrasePlan(mutatePlan((plan) => {
      plan.phrases[0].digestion[0].operatorId = "mystery-digester-v99";
    })),
    /operator|digestion/i,
  );
  assert.throws(
    () => normalizeVideoPhrasePlan(mutatePlan((plan) => {
      plan.phrases[0].transforms.rotationDegrees = 45;
    })),
    /rotation/i,
  );
  assert.throws(
    () => normalizeVideoPhrasePlan(mutatePlan((plan) => {
      plan.phrases[0].playbackRate = Infinity;
    })),
    /playback|finite/i,
  );
});

test("normalizer refuses phrase-count and overlap-depth overflow", () => {
  assert.throws(
    () => normalizeVideoPhrasePlan(mutatePlan((plan) => {
      const template = plan.phrases[0];
      plan.phrases = Array.from({ length: MAX_PHRASES + 1 }, (_, index) => ({
        ...structuredClone(template),
        phraseId: `phrase-${index + 1}`,
        startTick: index * 1000,
        endTick: index * 1000 + 500,
      }));
    })),
    /phrase.*limit|too many phrases/i,
  );

  assert.throws(
    () => normalizeVideoPhrasePlan(mutatePlan((plan) => {
      const template = plan.phrases[0];
      plan.phrases = Array.from({ length: MAX_OVERLAPS + 1 }, (_, index) => ({
        ...structuredClone(template),
        phraseId: `overlap-${index + 1}`,
      }));
    })),
    /overlap/i,
  );
});
