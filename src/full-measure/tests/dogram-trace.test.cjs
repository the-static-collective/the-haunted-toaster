const test = require("node:test");
const assert = require("node:assert/strict");
const { hashCanonical } = require("../src/generation/canonical.cjs");
const { buildDogramDeltaSpecimen } = require("../src/render/dogram-trace.cjs");

function receipt(overrides = {}) {
  return {
    schema: "full-measure.video-receipt.v1",
    source: {
      filename: "song.wav",
      sha256: "source-a",
    },
    canonicalExecution: {
      scoreAddress: "score-a",
      timelineHash: "timeline-a",
    },
    render: {
      visualCompiler: {
        graphSha256: "compiler-a",
      },
      transportEncoding: {
        profile: "archive-master",
        video: { codec: "h264", pixelFormat: "yuv420p" },
        audio: { codec: "aac", bitrate: 320000 },
      },
    },
    output: {
      filename: "song.mp4",
      sha256: "video-a",
    },
    ...overrides,
  };
}

test("lowers two video receipts to a Dogram delta specimen across semantic and render boundaries", () => {
  const left = receipt();
  const right = receipt({
    canonicalExecution: {
      scoreAddress: "score-a",
      timelineHash: "timeline-b",
    },
    render: {
      visualCompiler: { graphSha256: "compiler-b" },
      transportEncoding: {
        profile: "archive-master",
        video: { codec: "h264", pixelFormat: "yuv420p" },
        audio: { codec: "aac", bitrate: 320000 },
      },
    },
    output: { filename: "song.mp4", sha256: "video-b" },
  });

  const specimen = buildDogramDeltaSpecimen({
    specimenId: "toast-a-vs-b",
    leftReceipt: left,
    rightReceipt: right,
  });

  assert.equal(specimen.schema, "dogram.specimen/v0");
  assert.equal(specimen.operator, "delta");
  assert.deepEqual(specimen.inputs.boundary_order, [
    "SOURCE",
    "ACCEPTED_SCORE",
    "RESOLVED_TIMELINE",
    "VISUAL_COMPILER",
    "TRANSPORT",
    "VIDEO_PROJECTION",
  ]);
  assert.equal(specimen.inputs.left.SOURCE.value, "source-a");
  assert.equal(specimen.inputs.left.ACCEPTED_SCORE.value, "score-a");
  assert.equal(specimen.inputs.left.RESOLVED_TIMELINE.value, "timeline-a");
  assert.equal(specimen.inputs.right.RESOLVED_TIMELINE.value, "timeline-b");
  assert.equal(specimen.inputs.right.VISUAL_COMPILER.value, "compiler-b");
  assert.equal(
    specimen.inputs.left.TRANSPORT.value,
    hashCanonical(left.render.transportEncoding),
  );
  assert.equal(specimen.inputs.right.VIDEO_PROJECTION.value, "video-b");
  assert.equal(specimen.metadata.authority_boundary, "comparison-only");
});

test("refuses receipts that are outside the Full Measure video receipt contract", () => {
  assert.throws(
    () => buildDogramDeltaSpecimen({
      specimenId: "bad-toast",
      leftReceipt: receipt({ schema: "something-else" }),
      rightReceipt: receipt(),
    }),
    (error) => error?.code === "INVALID_DOGRAM_TRACE_RECEIPT",
  );
});
