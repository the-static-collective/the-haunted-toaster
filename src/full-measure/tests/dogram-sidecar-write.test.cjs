const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { hashCanonical } = require("../src/generation/canonical.cjs");
const { writeReceipt } = require("../src/render/receipt.cjs");

test("writing a completed video receipt also writes its Dogram trace-source sidecar", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-dogram-"));
  try {
    const outputPath = path.join(temp, "song.mp4");
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      source: { sha256: "source-a" },
      canonicalExecution: {
        scoreAddress: "score-a",
        timelineHash: "timeline-a",
      },
      render: {
        visualCompiler: { graphSha256: "compiler-a" },
        transportEncoding: {
          profile: "archive-master",
          video: { codec: "h264", pixelFormat: "yuv420p" },
          audio: { codec: "aac", bitrate: 320000 },
        },
      },
      output: { sha256: "video-a" },
    };

    await writeReceipt(receipt, outputPath);

    const dogramPath = path.join(temp, "song.dogram.json");
    const sidecar = JSON.parse(await fs.readFile(dogramPath, "utf8"));
    assert.equal(sidecar.schema, "dogram.trace-source/v0");
    assert.equal(sidecar.source_schema, "full-measure.video-receipt.v1");
    assert.equal(sidecar.receipt_hash, hashCanonical(receipt));
    assert.deepEqual(sidecar.boundary_order, [
      "SOURCE",
      "ACCEPTED_SCORE",
      "RESOLVED_TIMELINE",
      "VISUAL_COMPILER",
      "TRANSPORT",
      "VIDEO_PROJECTION",
    ]);
    assert.equal(sidecar.trace.SOURCE.value, "source-a");
    assert.equal(sidecar.trace.VIDEO_PROJECTION.value, "video-a");
    assert.equal(sidecar.authority_boundary, "comparison-only");
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
