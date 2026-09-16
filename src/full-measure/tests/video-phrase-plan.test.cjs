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
  phrasePlanForLegacyBinding,
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

test("#277 Loop lowers to bounded forward recurrence over the full source", () => {
  const legacy = {
    ...binding("C:/legacy.mp4"),
    digestOperatorId: "clip-motion-mask-v1",
    samplingPolicyId: "loop-source-clip-v1",
  };
  const plan = phrasePlanForLegacyBinding({
    videoBinding: legacy,
    timeline: { durationTicks: 12000, timebase: 1000 },
  });
  assert.equal(plan.phrases.length, 1);
  assert.equal(plan.phrases[0].traversal, "forward");
  assert.equal(plan.phrases[0].cycles, 3);
  assert.deepEqual(plan.phrases[0].sourceWindow, { startSeconds: 0, endSeconds: 4 });
  assert.equal(plan.phrases[0].digestion[0].operatorId, "clip-motion-mask-v1");
  assert.equal(plan.legacy.samplingPolicyId, "loop-source-clip-v1");
});

test("#277 Play once lowers to source-rate finite phrase then native release", () => {
  const plan = phrasePlanForLegacyBinding({
    videoBinding: {
      ...binding("C:/legacy.mp4"),
      digestOperatorId: "clip-luma-mask-v1",
      samplingPolicyId: "play-source-once-v1",
    },
    timeline: { durationTicks: 12000, timebase: 1000 },
  });
  assert.equal(plan.phrases[0].startTick, 0);
  assert.equal(plan.phrases[0].endTick, 4000);
  assert.equal(plan.phrases[0].playbackRate, 1);
  assert.equal(plan.phrases[0].cycles, 1);
  assert.equal(plan.phrases[0].release, "native");
  assert.equal(plan.legacy.samplingPolicyId, "play-source-once-v1");
});

test("#277 Stretch lowers to one full-span retimed phrase", () => {
  const plan = phrasePlanForLegacyBinding({
    videoBinding: {
      ...binding("C:/legacy.mp4"),
      digestOperatorId: "clip-luma-texture-v1",
      samplingPolicyId: "stretch-source-clip-v1",
    },
    timeline: { durationTicks: 12000, timebase: 1000 },
  });
  assert.equal(plan.phrases[0].endTick, 12000);
  assert.equal(plan.phrases[0].playbackRate, 1 / 3);
  assert.equal(plan.phrases[0].cycles, 1);
  assert.equal(plan.phrases[0].release, "hold");
  assert.equal(plan.phrases[0].digestion[0].operatorId, "clip-luma-texture-v1");
  assert.equal(plan.legacy.samplingPolicyId, "stretch-source-clip-v1");
});

test("Toaster spectrum makes candidate seeds into bounded multi-phrase composition rather than one global mode", () => {
  const plans = Array.from({ length: 6 }, (_, index) => createVideoPhrasePlan({
    videoBinding: binding("C:/clips/a.mp4"),
    timeline,
    seed: `candidate-${index}`,
  }));
  assert.equal(new Set(plans.map((plan) => plan.planHash)).size, 6);
  assert.ok(plans.every((plan) => plan.phrases.length >= 2 && plan.phrases.length <= MAX_PHRASES));

  const phrases = plans.flatMap((plan) => plan.phrases);
  const traversals = new Set(phrases.map((item) => item.traversal));
  assert.ok(traversals.has("reverse"));
  assert.ok(traversals.has("ping-pong"));
  assert.ok(phrases.some((item) => item.digestion.length > 1), "at least one phrase must combine digestion atoms");
  assert.ok(phrases.some((item) =>
    item.transforms.mirrorX || item.transforms.mirrorY || item.transforms.rotationDegrees !== 0 || item.transforms.zoom !== 1
  ), "at least one phrase must use a spatial transform");
  assert.ok(phrases.some((item) => item.startTick > 0), "video must be able to leave and return later in the song");
});
