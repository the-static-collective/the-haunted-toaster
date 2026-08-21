const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { JSDOM } = require("jsdom");
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

test("packaged render slate exposes only the bounded Resolution Field witness scales", () => {
  const dom = new JSDOM(source("src/renderer/index.html"));
  try {
    const select = dom.window.document.querySelector("#resolutionWitnessScale");
    assert.ok(select, "field build must expose one Resolution Field witness selector");
    assert.deepEqual(
      [...select.options].map((option) => option.value),
      ["", "1", "0.5", "0.25"],
    );
  } finally {
    dom.window.close();
  }
});

test("field witness forwards the selected scale and reports only receipt-derived measurements", () => {
  const app = source("src/renderer/app.js");

  assert.match(app, /resolutionWitnessScale:\s*null/);
  assert.match(
    app,
    /atmosphereResolutionScale:\s*state\.resolutionWitnessScale/,
  );
  assert.match(app, /receipt\.render\.elapsedSeconds/);
  assert.match(app, /receipt\.output\.sizeBytes/);
  assert.match(app, /receipt\.output\.video\.width/);
  assert.match(app, /receipt\.output\.video\.height/);
  assert.match(app, /receipt\.output\.video\.sampleAspectRatio/);
  assert.match(
    app,
    /receipt\.render\.visualCompiler\.atmosphere\.resolutionField/,
  );
});
