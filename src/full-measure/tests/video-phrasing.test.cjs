const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  createForeignMaterialPlan,
  applyForeignMaterialToGraph,
  ffmpegInputArgsForForeignMaterial,
} = require("../src/render/foreign-material.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

const operators = ["clip-luma-texture-v1", "clip-luma-mask-v1", "clip-motion-mask-v1"];
const policies = ["loop-source-clip-v1", "play-source-once-v1", "stretch-source-clip-v1"];
function binding(overrides = {}) {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${"a".repeat(64)}:4096`,
    sourceSha256: "a".repeat(64), byteLength: 4096,
    path: "/tmp/phrasing.mp4", filename: "phrasing.mp4",
    probe: { durationSeconds: 1, width: 64, height: 36, frameRate: "8/1" },
    ...overrides,
  };
}
function plan(overrides = {}) {
  return createForeignMaterialPlan({
    videoBinding: binding(overrides), timeline: { durationTicks: 24, timebase: 8 },
  });
}

test("video roles cross with timing policies without silently looping finite choices", () => {
  const hashes = new Set();
  for (const digestOperatorId of operators) {
    for (const samplingPolicyId of policies) {
      const value = plan({ digestOperatorId, samplingPolicyId });
      hashes.add(value.planHash);
      assert.equal(value.sampling.policyVersion, samplingPolicyId);
      assert.equal(value.assimilationPolicy.operatorId, digestOperatorId);
      const args = ffmpegInputArgsForForeignMaterial(value);
      assert.equal(args.includes("-stream_loop"), samplingPolicyId === policies[0]);
      assert.equal(value.planHash, plan({ digestOperatorId, samplingPolicyId, path: "/moved.mp4" }).planHash);
    }
  }
  assert.equal(hashes.size, 9);
  assert.deepEqual(plan(), plan({ samplingPolicyId: policies[0] }));
});

test("unknown timing refuses before compiling or decoding", () => {
  assert.throws(() => plan({ samplingPolicyId: "mystery" }), /sampling/i);
  const tampered = structuredClone(plan());
  tampered.sampling.policyVersion = "mystery";
  assert.throws(() => ffmpegInputArgsForForeignMaterial(tampered), /sampling/i);
  assert.throws(() => applyForeignMaterialToGraph({
    graph: "[0:v]null[vout]", foreignMaterialPlan: tampered,
    foreignMaterialInputIndex: 1, width: 64, height: 36, fps: 8,
  }), /sampling/i);
});

test("motion digest receipts describe temporal difference, not recovered optical flow", () => {
  const value = plan({ digestOperatorId: operators[2] });
  assert.equal(value.assimilationPolicy.sourceRole, "motion-mask");
  assert.equal(value.assimilationPolicy.literalSourcePixelsSurvive, false);
  const result = applyForeignMaterialToGraph({
    graph: "[0:v]null[vout]", foreignMaterialPlan: value,
    foreignMaterialInputIndex: 1, width: 64, height: 36, fps: 8,
  });
  assert.equal(result.evidence.sourceRole, "motion-mask");
  assert.equal(result.evidence.prefilter, "adjacent-frame-luma-difference-v1");
  assert.equal(result.evidence.samplingPolicy, policies[0]);
});

test("real FFmpeg: all nine paths keep duration, once releases, stretch reaches later source frames", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ht-phrasing-"));
  const source = path.join(temp, "source.mkv");
  const still = path.join(temp, "still.mkv");
  const frameBytes = 64 * 36 * 3;
  const frame = (bytes, n) => bytes.subarray(n * frameBytes, (n + 1) * frameBytes);
  const maxDelta = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  async function render(value, label) {
    const graph = value ? applyForeignMaterialToGraph({
      graph: "[0:v]format=yuv444p[vout]", foreignMaterialPlan: value,
      foreignMaterialInputIndex: 1, width: 64, height: 36, fps: 8,
    }).graph : "[0:v]format=yuv444p[vout]";
    const output = path.join(temp, `${label}.raw`);
    await runProcess(resolveFfmpeg(), [
      "-y", "-v", "error", "-filter_complex_threads", "1",
      "-f", "lavfi", "-i", "testsrc2=s=64x36:r=8:d=3",
      ...(value ? ffmpegInputArgsForForeignMaterial(value) : []),
      "-filter_complex", graph, "-map", "[vout]", "-an",
      "-frames:v", "24", "-pix_fmt", "rgb24", "-f", "rawvideo", output,
    ], { signal: AbortSignal.timeout(15000) });
    return fs.readFile(output);
  }
  try {
    for (const [file, pattern] of [[source, "testsrc2=s=64x36:r=8:d=1"], [still, "color=c=white:s=64x36:r=8:d=1"]]) {
      await runProcess(resolveFfmpeg(), ["-y", "-v", "error", "-f", "lavfi", "-i", pattern, "-c:v", "ffv1", file], { signal: AbortSignal.timeout(15000) });
    }
    const native = await render(null, "native");
    for (const digestOperatorId of operators) {
      for (const samplingPolicyId of policies) {
        const value = plan({ path: source, digestOperatorId, samplingPolicyId });
        const bytes = await render(value, `${digestOperatorId}-${samplingPolicyId}`);
        assert.equal(bytes.length, frameBytes * 24, `${digestOperatorId}/${samplingPolicyId} truncated the song`);
        if (samplingPolicyId === policies[1]) {
          assert.ok(maxDelta(frame(bytes, 20), frame(native, 20)) <= 2, `${digestOperatorId} retained video after EOF`);
        }
      }
    }
    const stillMotion = await render(plan({ path: still, digestOperatorId: operators[2], samplingPolicyId: policies[2] }), "still-motion");
    assert.ok(maxDelta(frame(stillMotion, 4), frame(native, 4)) <= 2, "static source must not invent motion");
    const moving = await render(plan({ path: source, digestOperatorId: operators[2], samplingPolicyId: policies[2] }), "moving-motion");
    assert.ok(maxDelta(frame(moving, 20), frame(native, 20)) > 2, "stretched moving source must still contribute near the end");
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
