const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  normalizeVideoPhrasePlan,
} = require("../src/render/video-phrase-plan.cjs");
const {
  createForeignMaterialPhrasePlan,
  applyForeignMaterialToGraph,
  ffmpegInputArgsForForeignMaterial,
} = require("../src/render/foreign-material.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

const SOURCE_SHA = "a".repeat(64);
const TIMELINE = Object.freeze({ durationTicks: 3000, timebase: 1000 });

function binding(sourcePath = "/tmp/phrase-source.mkv") {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${SOURCE_SHA}:4096`,
    sourceSha256: SOURCE_SHA,
    byteLength: 4096,
    path: sourcePath,
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

test("real FFmpeg executes traversal, transforms, and mixed multi-phrase grammar without truncating the song", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ht-video-phrase-"));
  const source = path.join(temp, "source.mkv");
  const frameBytes = 64 * 36 * 3;
  async function render(accepted, label) {
    const material = createForeignMaterialPhrasePlan({
      videoBinding: binding(source), videoPhrasePlan: accepted, timeline: TIMELINE,
    });
    const compiled = applyForeignMaterialToGraph({
      graph: "[0:v]format=yuv444p[vout]",
      foreignMaterialPlan: material,
      foreignMaterialInputIndex: 1,
      width: 64,
      height: 36,
      fps: 8,
    });
    const output = path.join(temp, `${label}.raw`);
    await runProcess(resolveFfmpeg(), [
      "-y", "-v", "error", "-filter_complex_threads", "1",
      "-f", "lavfi", "-i", "testsrc2=s=64x36:r=8:d=3",
      ...ffmpegInputArgsForForeignMaterial(material),
      "-filter_complex", compiled.graph,
      "-map", "[vout]", "-an", "-frames:v", "24",
      "-pix_fmt", "rgb24", "-f", "rawvideo", output,
    ], { signal: AbortSignal.timeout(15000) });
    return fs.readFile(output);
  }
  try {
    await runProcess(resolveFfmpeg(), [
      "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=64x36:r=8:d=1",
      "-c:v", "ffv1", source,
    ], { signal: AbortSignal.timeout(15000) });

    const forward = await render(phrasePlan([phrase({ release: "hold" })]), "forward");
    const reverse = await render(phrasePlan([phrase({ traversal: "reverse", release: "hold" })]), "reverse");
    const pingPong = await render(phrasePlan([phrase({ traversal: "ping-pong", cycles: 1, release: "hold" })]), "pingpong");
    const transformed = await render(phrasePlan([phrase({
      traversal: "reverse",
      release: "hold",
      transforms: {
        mirrorX: true,
        mirrorY: true,
        rotationDegrees: 90,
        crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        zoom: 1.2,
        opacity: 0.8,
      },
    })]), "transformed");
    const mixed = await render(phrasePlan([
      phrase({ phraseId: "p1", startTick: 0, endTick: 1000, release: "hold" }),
      phrase({
        phraseId: "p2", startTick: 1000, endTick: 2000, traversal: "reverse", release: "hold",
        digestion: [{ operatorId: "clip-luma-mask-v1", weight: 1 }],
      }),
      phrase({
        phraseId: "p3", startTick: 2000, endTick: 3000, traversal: "ping-pong", release: "hold",
        digestion: [
          { operatorId: "clip-luma-texture-v1", weight: 0.45 },
          { operatorId: "clip-motion-mask-v1", weight: 1 },
        ],
      }),
    ]), "mixed");

    for (const [label, bytes] of Object.entries({ forward, reverse, pingPong, transformed, mixed })) {
      assert.equal(bytes.length, frameBytes * 24, `${label} truncated the three-second song`);
    }
    assert.notDeepEqual(forward.subarray(0, frameBytes * 8), reverse.subarray(0, frameBytes * 8));
    assert.notDeepEqual(forward.subarray(0, frameBytes * 8), transformed.subarray(0, frameBytes * 8));
    assert.notDeepEqual(forward.subarray(0, frameBytes * 16), pingPong.subarray(0, frameBytes * 16));
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
