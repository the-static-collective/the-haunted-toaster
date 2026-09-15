const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { writeReceipt } = require("../src/render/receipt.cjs");

test("beta receipt composes WALK evidence, Dogram trace, and descriptive Haunted Haiku", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-beta-receipt-"));
  try {
    const outputPath = path.join(temp, "beta-song.mp4");
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      source: { sha256: "source-beta" },
      canonicalExecution: {
        scoreAddress: "score-beta",
        timelineHash: "timeline-beta",
      },
      render: {
        visualCompiler: { graphSha256: "compiler-beta" },
        transportEncoding: {
          profile: "archive-master",
          video: { codec: "h264", pixelFormat: "yuv420p" },
          audio: { codec: "aac", bitrate: 320000 },
        },
      },
      output: {
        filename: "beta-song.mp4",
        sha256: "video-beta",
      },
      treatment: {
        title: "Beta Song",
        artist: "The Static Collective",
        garment: { id: "garment-beta" },
        toastFeel: { id: "risky-hybrid" },
      },
      validation: { accepted: true },
    };

    const receiptPath = await writeReceipt(receipt, outputPath);
    const persisted = JSON.parse(await fs.readFile(receiptPath, "utf8"));
    const dogram = JSON.parse(
      await fs.readFile(path.join(temp, "beta-song.dogram.json"), "utf8"),
    );

    assert.equal(persisted.canonicalExecution.scoreAddress, "score-beta");
    assert.equal(dogram.schema, "dogram.trace-source/v0");
    assert.equal(dogram.authority_boundary, "comparison-only");
    assert.equal(
      persisted.publication?.hauntedHaiku?.authority,
      "descriptive-only",
    );
    assert.equal(persisted.publication.hauntedHaiku.lines.length, 3);
    assert.match(
      persisted.publication.hauntedHaiku.youtubeDescription,
      /#HauntedToaster/,
    );
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
