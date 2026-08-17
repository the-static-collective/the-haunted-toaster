const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { writeReceipt } = require("../src/render/receipt.cjs");
const { writeRenderFailureBundle } = require("../src/render/render-failure-evidence.cjs");

const compact = Object.freeze({
  policyVersion: "elastic-topology-response-v1",
  nestedResponsePolicyVersion: "nested-response-contour-v1",
  planSha256: "receipt-plan-proof",
  knotCount: 3,
  granularity: "transient",
  idleMotionPolicyVersion: "topology-idle-v1",
  softOccupancyKnee: 0.72,
  meterEvidenceUsed: false,
});

function operatorsWithEvidence() {
  const operators = [];
  Object.defineProperty(operators, "__topologyResponse", {
    value: compact,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(operators);
}

function visualCompiler() {
  return Object.freeze({
    policy: "visual-language-v3",
    topology: "circle",
    topologyCompiler: "circle-v2",
    fieldEnvelopePolicy: "full-height-envelope-v1",
    topologyArc: null,
    operators: operatorsWithEvidence(),
    atmosphere: null,
    temporalSampling: "inner-23976-proof",
    witnessWindow: { policyVersion: "witness-proof" },
    graphSha256: "a".repeat(64),
  });
}

test("successful video receipt serializes compact topology response evidence", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ht-topology-response-receipt-"));
  try {
    const outputPath = path.join(temp, "proof.mp4");
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      render: { visualCompiler: visualCompiler() },
    };
    const receiptPath = await writeReceipt(receipt, outputPath);
    const serialized = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    assert.deepEqual(serialized.render.visualCompiler.topologyResponse, compact);
    assert.equal(Object.hasOwn(serialized.render.visualCompiler.topologyResponse, "idleFloor"), false);
    assert.deepEqual(receipt.render.visualCompiler.topologyResponse, compact);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test("render failure bundle serializes the same compact topology response evidence", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ht-topology-response-failure-"));
  try {
    const outputPath = path.join(temp, "proof.mp4");
    const filterPath = path.join(temp, "render.ffgraph");
    await fs.writeFile(filterPath, "[0:v]null[vout]\n", "utf8");
    const error = new Error("synthetic ffmpeg failure");
    error.processFailure = {
      binary: "/usr/bin/ffmpeg",
      code: 1,
      signal: null,
      stderr: "synthetic failure",
    };
    const bundle = await writeRenderFailureBundle({
      outputPath,
      error,
      filterPath,
      ffmpegArgs: ["-i", "/tmp/input.wav", outputPath],
      visualScore: { schema: "haunted-toaster/visual-score/v0.5", seed: "proof" },
      resolvedTimeline: {
        scoreAddress: "htvs1_proof",
        timelineHash: "timeline-proof",
        rendererPolicy: "visual-language-v3",
      },
      buildInfo: { version: "test", commit: "proof", dirty: false, sourceMode: true },
      sourceAudio: { path: "/tmp/input.wav", filename: "input.wav" },
      sourceImage: null,
      visualCompiler: visualCompiler(),
      jobId: "failure-proof",
      startedAt: new Date("2026-08-17T00:00:00.000Z"),
      lastProgress: { ratio: 0.5 },
    });
    const serialized = JSON.parse(await fs.readFile(bundle.failurePath, "utf8"));
    assert.deepEqual(serialized.render.visualCompiler.topologyResponse, compact);
    assert.equal(Object.hasOwn(serialized.render.visualCompiler.topologyResponse, "idleFloor"), false);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
