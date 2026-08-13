const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const { candidatePreviewPlan } = require("../src/render/candidate-preview.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const { compileTimelineFilterGraph, rendererValues } = require("../src/render/timeline-filter.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const analysis = readJson("fixtures/analysis/sectional.v1.json");
const constraints = readJson("constraints/open-field.v1.json");
const rendererProfile = readJson("profiles/toaster-raster-3.json");
const nativeChromaticProfile = Object.freeze({
  sourceSha256: "9".repeat(64),
  profileSha256: "a".repeat(64),
  hueCentroidDegrees: 28,
  saturationMean: 0.78,
  chromaWeight: 0.84,
});

function baseGraph() {
  return [
    "[waveAudio]showwaves=s=640x96:mode=cline:rate=30:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=640:360:0:239:color=black@0.0[waveFull]",
    "[stage0]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

function candidate() {
  return generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile,
    rootSeed: "native-color-render",
    count: 6,
    toastFeelId: "risky-hybrid",
    nativeChromaticProfile,
  }).candidates[0];
}

test("chromatic decompression composes after relationship and Color Drift", () => {
  const accepted = candidate();
  assert.equal(accepted.timeline.nativeColor.relationship, "counterpoint");
  const state = generation.stateAtTick(accepted.timeline, 82_000);
  const drift = generation.driftAtTick(accepted.timeline, 82_000);
  const outsideNative = generation.nativeColorAtTick(accepted.timeline, 81_999);
  const insideNative = generation.nativeColorAtTick(accepted.timeline, 82_000);
  const outside = rendererValues(state, drift, outsideNative);
  const inside = rendererValues(state, drift, insideNative);

  assert.ok(Math.abs(inside.hue) < Math.abs(outside.hue));
  assert.ok(
    Math.abs(inside.saturation - insideNative.nativeSaturationTarget) <
    Math.abs(outside.saturation - insideNative.nativeSaturationTarget),
  );
});

test("candidate preview identity and production use the same Native Color compiler seam", () => {
  const accepted = candidate();
  const preview = candidatePreviewPlan(accepted);
  const compiled = compileTimelineFilterGraph(baseGraph(), createTimelineExecution(accepted.timeline));
  assert.equal(preview.timelineHash, accepted.timelineHash);
  assert.equal(preview.timelineHash, accepted.timeline.timelineHash);
  assert.ok(compiled.operators.some((operator) =>
    operator.axis === "nativeColor" &&
    operator.planSha256 === accepted.timeline.nativeColor.planSha256));
  assert.ok(compiled.segments.some((segment) => segment.nativeColor?.nativeInfluence === 0.68));
});
