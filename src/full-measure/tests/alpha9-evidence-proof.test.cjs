const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { writeReceipt, receiptPathFor } = require("../src/render/receipt.cjs");
const { writeRenderFailureBundle } = require("../src/render/render-failure-evidence.cjs");

function topologyArcEvidence() {
  return {
    policyVersion: "topology-arc-v1",
    planSha256: "a".repeat(64),
    windowCount: 1,
    windows: [{
      windowSha256: "b".repeat(64),
      sourceTopology: "circle",
      sourceCompiler: "circle-v2",
      ghostTopology: "echo-tunnel",
      ghostCompiler: "echo-tunnel-v3",
      entranceTick: 19000,
      peakTick: 20000,
      releaseTick: 22000,
      overlapPolicy: "shared-stage-screen-v1",
      outcome: "dissolve",
      scar: null,
    }],
  };
}

test("successful receipt and abnormal-exit bundle preserve the same topology-arc compiler evidence", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ht-alpha9-evidence-"));
  const outputPath = path.join(temp, "alpha9.mp4");
  const filterPath = path.join(temp, "render.ffgraph");
  const topologyArc = topologyArcEvidence();
  const visualCompiler = {
    policy: "visual-language-v3",
    topology: "circle",
    topologyCompiler: "circle-v2",
    topologyArc,
    graphSha256: "c".repeat(64),
  };
  const timeline = {
    schema: "haunted-toaster/resolved-timeline/v1",
    scoreAddress: "htvs1_test",
    timelineHash: "d".repeat(64),
    rendererPolicy: "visual-language-v3",
    topologyArc: {
      policyVersion: topologyArc.policyVersion,
      planSha256: topologyArc.planSha256,
      windowCount: topologyArc.windowCount,
      windows: topologyArc.windows,
    },
  };

  try {
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      render: { visualCompiler },
      validation: { accepted: true },
    };
    await writeReceipt(receipt, outputPath);
    const writtenReceipt = JSON.parse(await fs.readFile(receiptPathFor(outputPath), "utf8"));
    assert.deepEqual(writtenReceipt.render.visualCompiler.topologyArc, topologyArc);

    await fs.writeFile(filterPath, "[0:v]null[vout]\n", "utf8");
    const error = new Error("synthetic ffmpeg abnormal exit");
    error.processFailure = {
      binary: "/tmp/ffmpeg.exe",
      code: 3221225477,
      signal: null,
      stderr: "synthetic crash evidence",
    };
    const failure = await writeRenderFailureBundle({
      outputPath,
      error,
      filterPath,
      ffmpegArgs: ["-filter_complex_script", filterPath],
      visualScore: { schema: "fixture", topology: "circle" },
      resolvedTimeline: timeline,
      buildInfo: { version: "0.5.0-alpha.9", commit: "e".repeat(40), dirty: false },
      sourceAudio: { filename: "fixture.wav", sha256: "f".repeat(64) },
      sourceImage: null,
      visualCompiler,
      jobId: "alpha9-evidence-proof",
      startedAt: new Date("2026-08-14T00:00:00.000Z"),
      lastProgress: { frame: 79, renderedSeconds: 4.2, ratio: 0.035 },
    });
    const failureJson = JSON.parse(await fs.readFile(failure.failurePath, "utf8"));
    assert.deepEqual(failureJson.render.visualCompiler.topologyArc, topologyArc);
    assert.equal(
      failureJson.render.visualCompiler.topologyArc.planSha256,
      writtenReceipt.render.visualCompiler.topologyArc.planSha256,
    );
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
