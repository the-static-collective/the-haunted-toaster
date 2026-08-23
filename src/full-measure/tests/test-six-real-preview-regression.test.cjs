const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const { renderCandidateFamilyPreviews } = require("../src/render/candidate-preview.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const constraints = readJson("constraints/open-field.v3.json");
const profile = readJson("profiles/toaster-raster-4.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");
const duration = Number(analysis.durationSeconds);

const responseWitness = generation.deriveResponseWitness({
  energySamples: [],
  sections: analysis.sections,
  durationSeconds: duration,
});

function testSixFamily() {
  return generation.generateTestSixWitnessFamily({
    analysis,
    responseWitness,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "test-6:openField:unselected:real-preview-regression",
    toastFeelId: null,
  });
}

test("TEST 6 packaged Open Field path renders all six real previews without hidden atmosphere assumptions", async () => {
  const temp = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ht-test-six-real-preview-"));
  try {
    const audioPath = path.join(temp, "test-six.wav");
    await runProcess(resolveFfmpeg(), [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=220:duration=${duration}:sample_rate=48000`,
      "-c:a",
      "pcm_s16le",
      audioPath,
    ]);

    const mediaAnalysis = {
      filename: path.basename(audioPath),
      sizeBytes: (await fsPromises.stat(audioPath)).size,
      duration,
      formatName: "wav",
      audio: {
        codec: "pcm_s16le",
        sampleRate: 48000,
        channels: 1,
      },
      energySamples: [],
      sections: analysis.sections.map((section, index) => ({
        index,
        label: section.label,
        start: section.startSeconds,
        end: section.endSeconds,
        energy: section.energy,
      })),
    };

    const preview = await renderCandidateFamilyPreviews({
      audioPath,
      analysis: mediaAnalysis,
      presetId: "openField",
      title: "TEST 6",
      artist: "field witness",
      lyrics: "",
      width: 640,
      height: 360,
      fps: 12,
    }, testSixFamily());

    assert.equal(preview.candidates.length, 6);
    for (const candidate of preview.candidates) {
      assert.match(candidate.thumbnailDataUrl, /^data:image\/png;base64,/);
    }
  } finally {
    await fsPromises.rm(temp, { recursive: true, force: true });
  }
});
