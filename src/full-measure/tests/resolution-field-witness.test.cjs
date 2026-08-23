const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { probeMedia } = require("../src/render/analyze.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

const root = path.resolve(__dirname, "..");
const source = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("media probe reports observed video sample aspect ratio", async () => {
  const tempDirectory = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "toaster-resolution-promotion-sar-"),
  );
  const outputPath = path.join(tempDirectory, "square-pixel.mp4");

  try {
    await runProcess(resolveFfmpeg(), [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=320x180:r=12:d=0.25",
      "-vf",
      "setsar=1",
      "-frames:v",
      "2",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    ]);

    const media = await probeMedia(outputPath);
    assert.equal(media.video.sampleAspectRatio, "1:1");
  } finally {
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
  }
});

test("production preload does not expose Resolution Field observation furniture", () => {
  const preload = source("src/preload.cjs");

  assert.doesNotMatch(preload, /RESOLUTION_WITNESS_SCALES/);
  assert.doesNotMatch(preload, /resolutionWitnessScale/);
  assert.doesNotMatch(preload, /installResolutionFieldWitness/);
  assert.doesNotMatch(preload, /withResolutionFieldWitness/);
  assert.doesNotMatch(preload, /reportResolutionFieldWitness/);
});
