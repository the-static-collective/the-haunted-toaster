const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeVideoPhrasePlan,
} = require("../src/render/video-phrase-plan.cjs");
const {
  createForeignMaterialPhrasePlan,
  applyForeignMaterialToGraph,
  ffmpegInputArgsForForeignMaterial,
} = require("../src/render/foreign-material.cjs");

const SOURCE_SHA = "a".repeat(64);
const TIMELINE = Object.freeze({ durationTicks: 3000, timebase: 1000 });

function binding(path = "/tmp/phrase-source.mkv") {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${SOURCE_SHA}:4096`,
    sourceSha256: SOURCE_SHA,
    byteLength: 4096,
    path,
    filename: "phrase-source.mkv",
    probe: {
      durationSeconds: 1,
      width: 64,
      height: 36,
      frameRate: "8/1",
      frameCount: 8,
    },
  };
}

function phrase(overrides = {}) {
  return {
    phraseId: "phrase-1",
    startTick: 0,
    endTick: 3000,
    sourceWindow: { startSeconds: 0, endSeconds: 1 },
    traversal: "forward",
    cycles: 1,
    playbackRate: 1,
    digestion: [{ operatorId: "clip-luma-texture-v1", weight: 1 }],
    transforms: {
      mirrorX: false,
      mirrorY: false,
      rotationDegrees: 0,
      crop: null,
      zoom: 1,
      opacity: 1,
    },
    release: "native",
    ...overrides,
  };
}

function phrasePlan(phrases = [phrase()]) {
  return normalizeVideoPhrasePlan({
    schema: "haunted-toaster/video-phrase-plan/v1",
    policyVersion: "toaster-spectrum/v1",
    source: {
      specimenId: `sha256:${SOURCE_SHA}:4096`,
      sourceSha256: SOURCE_SHA,
      byteLength: 4096,
      durationSeconds: 1,
    },
    timeline: TIMELINE,
    spectrum: 0.75,
    phrases,
  });
}

test("phrase-aware foreign material binds exact VideoPhrasePlan identity without path authority", () => {
  const accepted = phrasePlan();
  const first = createForeignMaterialPhrasePlan({
    videoBinding: binding("/tmp/a.mkv"),
    videoPhrasePlan: accepted,
    timeline: TIMELINE,
  });
  const moved = createForeignMaterialPhrasePlan({
    videoBinding: binding("/moved/b.mkv"),
    videoPhrasePlan: accepted,
    timeline: TIMELINE,
  });
  assert.equal(first.schema, "haunted-toaster/foreign-material-phrase/v1");
  assert.equal(first.videoPhrasePlanHash, accepted.planHash);
  assert.equal(first.planHash, moved.planHash);
  assert.equal(first.sourcePath, "/tmp/a.mkv");
  assert.equal(moved.sourcePath, "/moved/b.mkv");
});

test("phrase-aware input is finite and never smuggles the historical infinite stream loop", () => {
  const plan = createForeignMaterialPhrasePlan({
    videoBinding: binding(), videoPhrasePlan: phrasePlan(), timeline: TIMELINE,
  });
  const args = ffmpegInputArgsForForeignMaterial(plan);
  assert.deepEqual(args, ["-i", "/tmp/phrase-source.mkv"]);
});

test("phrase compiler accepts forward reverse ping-pong, transforms, and mixed digestion as receipt-visible data", () => {
  const accepted = phrasePlan([
    phrase({
      phraseId: "forward-texture",
      startTick: 0,
      endTick: 1000,
      traversal: "forward",
      release: "hold",
    }),
    phrase({
      phraseId: "reverse-mask",
      startTick: 1000,
      endTick: 2000,
      traversal: "reverse",
      digestion: [{ operatorId: "clip-luma-mask-v1", weight: 0.8 }],
      transforms: {
        mirrorX: true,
        mirrorY: false,
        rotationDegrees: 90,
        crop: null,
        zoom: 1.25,
        opacity: 0.9,
      },
      release: "hold",
    }),
    phrase({
      phraseId: "pingpong-mixed",
      startTick: 2000,
      endTick: 3000,
      traversal: "ping-pong",
      digestion: [
        { operatorId: "clip-luma-texture-v1", weight: 0.5 },
        { operatorId: "clip-motion-mask-v1", weight: 1 },
      ],
      release: "hold",
    }),
  ]);
  const plan = createForeignMaterialPhrasePlan({
    videoBinding: binding(), videoPhrasePlan: accepted, timeline: TIMELINE,
  });
  const compiled = applyForeignMaterialToGraph({
    graph: "[0:v]null[vout]",
    foreignMaterialPlan: plan,
    foreignMaterialInputIndex: 1,
    width: 64,
    height: 36,
    fps: 8,
  });
  assert.equal(compiled.evidence.videoPhrasePlanHash, accepted.planHash);
  assert.deepEqual(
    compiled.evidence.phrases.map(({ phraseId, traversal, operatorIds }) => ({ phraseId, traversal, operatorIds })),
    [
      { phraseId: "forward-texture", traversal: "forward", operatorIds: ["clip-luma-texture-v1"] },
      { phraseId: "reverse-mask", traversal: "reverse", operatorIds: ["clip-luma-mask-v1"] },
      { phraseId: "pingpong-mixed", traversal: "ping-pong", operatorIds: ["clip-luma-texture-v1", "clip-motion-mask-v1"] },
    ],
  );
  assert.match(compiled.graph, /reverse/);
  assert.match(compiled.graph, /hflip/);
  assert.match(compiled.graph, /transpose/);
  assert.match(compiled.graph, /maskedmerge/);
  assert.match(compiled.graph, /blend/);
});
