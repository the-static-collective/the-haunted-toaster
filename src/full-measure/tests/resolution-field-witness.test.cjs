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
    path.join(os.tmpdir(), "toaster-resolution-witness-sar-"),
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

test("packaged preload mounts only the bounded Resolution Field witness scales", () => {
  const preload = source("src/preload.cjs");

  assert.match(
    preload,
    /RESOLUTION_WITNESS_SCALES\s*=\s*Object\.freeze\(\["",\s*"1",\s*"0\.5",\s*"0\.25"\]\)/,
  );
  assert.match(preload, /resolutionWitnessScale/);
  assert.match(preload, /installResolutionFieldWitness/);
});

test("field witness forwards the selected scale and reports only receipt-derived measurements", () => {
  const preload = source("src/preload.cjs");

  assert.match(preload, /withResolutionFieldWitness/);
  assert.match(preload, /atmosphereResolutionScale/);
  assert.match(preload, /reportResolutionFieldWitness/);
  assert.match(preload, /receipt\.render\.elapsedSeconds/);
  assert.match(preload, /receipt\.output\.sizeBytes/);
  assert.match(preload, /receipt\.output\.video\.width/);
  assert.match(preload, /receipt\.output\.video\.height/);
  assert.match(preload, /receipt\.output\.video\.sampleAspectRatio/);
  assert.match(
    preload,
    /receipt\.render\.visualCompiler\.atmosphere\.resolutionField/,
  );
});
