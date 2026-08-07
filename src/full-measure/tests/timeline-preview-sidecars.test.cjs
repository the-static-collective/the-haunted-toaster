const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const { rendererValues } = require("../src/render/timeline-filter.cjs");
const { createTimelinePreview } = require("../src/render/timeline-preview.cjs");
const {
  assertScoreTimelineBinding,
  sidecarPathsFor,
  writeCanonicalExecutionSidecars,
} = require("../src/render/sidecars.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const constraints = readJson("constraints/wire-orchard.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function acceptedFixture(seed = "issue-16-preview-receipt") {
  const artifact = generation.createVisualScore({
    seed,
    constraints,
    overrides: { topology: "linear", temporalDensity: "transient" },
  });
  const timeline = generation.resolve(analysis, artifact.score, constraints, profile);
  return { score: artifact.score, timeline };
}

test("preview and production compilation sample identical semantic state", () => {
  const { timeline } = acceptedFixture();
  const execution = createTimelineExecution(timeline);
  const preview = createTimelinePreview(timeline);
  const ticks = new Set([0, timeline.durationTicks]);

  for (const patch of timeline.patches) ticks.add(patch.atTick);
  // Representative lyric-boundary-like canonical ticks; preview must not own a second clock.
  for (const seconds of [1.25, 3.5, 7.75]) {
    ticks.add(Math.min(timeline.durationTicks, Math.round(seconds * timeline.timebase)));
  }

  for (const tick of ticks) {
    const sample = preview.sampleAtTick(tick);
    const productionState = execution.stateAtTick(tick);
    assert.deepEqual(sample.semanticState, productionState);
    assert.deepEqual(sample.renderer, rendererValues(productionState));
    assert.equal(sample.tick, tick);
  }
});

test("preview seconds and canonical ticks share one timing model", () => {
  const { timeline } = acceptedFixture();
  const preview = createTimelinePreview(timeline);
  for (const patch of timeline.patches) {
    const seconds = patch.atTick / timeline.timebase;
    assert.deepEqual(preview.sampleAtSeconds(seconds), preview.sampleAtTick(patch.atTick));
  }
});

test("score/timeline sidecars preserve the exact accepted canonical artifacts", async () => {
  const { score, timeline } = acceptedFixture();
  const temp = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ht-sidecars-"));
  const outputPath = path.join(temp, "chosen.mp4");
  try {
    const result = await writeCanonicalExecutionSidecars({ outputPath, score, timeline });
    const expected = sidecarPathsFor(outputPath);
    assert.equal(result.scorePath, expected.scorePath);
    assert.equal(result.timelinePath, expected.timelinePath);
    assert.equal(result.scoreAddress, timeline.scoreAddress);
    assert.equal(result.timelineHash, timeline.timelineHash);
    assert.equal(
      await fsPromises.readFile(result.scorePath, "utf8"),
      `${generation.canonicalStringify(score)}\n`,
    );
    assert.equal(
      await fsPromises.readFile(result.timelinePath, "utf8"),
      `${generation.canonicalStringify(timeline)}\n`,
    );
  } finally {
    await fsPromises.rm(temp, { recursive: true, force: true });
  }
});

test("sidecars refuse a score that is not the timeline's accepted score", () => {
  const { timeline } = acceptedFixture("accepted-score");
  const { score: otherScore } = acceptedFixture("different-score");
  assert.throws(
    () => assertScoreTimelineBinding(otherScore, timeline),
    /does not match ResolvedTimeline scoreAddress/,
  );
});