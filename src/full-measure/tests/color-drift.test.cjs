const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const legacyResolver = require("../src/generation/resolver.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const { compileTimelineFilterGraph } = require("../src/render/timeline-filter.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const constraints = readJson("constraints/open-field.v1.json");
const stompConstraints = readJson("constraints/porchlight.v2.json");
const expressiveProfile = readJson("profiles/toaster-raster-3.json");
const legacyProfile = readJson("profiles/toaster-raster-2.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function productionBaseGraph() {
  return [
    "[waveAudio]showwaves=s=640x96:mode=cline:rate=30:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=640:360:0:239:color=black@0.0[waveFull]",
    "[stage0]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

function garmentScore(seed = "color-drift") {
  return generation.createVisualScore({
    seed,
    constraints,
    overrides: {
      palette: {
        logic: "garment",
        bleed: 0.5,
        contrastBias: 0,
      },
      temporalDensity: "section",
    },
  }).score;
}

test("color drift is expressive-policy opt-in and deterministic", () => {
  const score = garmentScore();
  const base = legacyResolver.resolve(analysis, score, constraints, expressiveProfile);
  const first = generation.applyColorDrift(base, { analysis });
  const second = generation.applyColorDrift(base, { analysis });

  assert.equal(first.colorDrift.policyVersion, generation.COLOR_DRIFT_POLICY);
  assert.equal(first.colorDrift.stopCount, analysis.sections.length - 1);
  assert.equal(first.colorDrift.planSha256, second.colorDrift.planSha256);
  assert.deepEqual(first.colorDrift.stops, second.colorDrift.stops);
  assert.ok(first.colorDrift.stops.some((stop) => Math.abs(stop.hueOffset) >= 8));
  assert.ok(first.colorDrift.stops.some((stop) => stop.saturationMultiplier !== 1));
});

test("raster-2 timelines keep legacy palette meaning", () => {
  const score = garmentScore("color-drift-legacy");
  const legacy = legacyResolver.resolve(analysis, score, constraints, legacyProfile);
  const drifted = generation.applyColorDrift(legacy, { analysis });

  assert.equal(drifted, legacy);
  assert.equal(Object.hasOwn(drifted, "colorDrift"), false);
});

test("candidate generation binds drift into expressive timeline identity", () => {
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: expressiveProfile,
    rootSeed: "color-drift-family",
    count: 6,
  });
  const replay = generation.replayCandidateFamily(family, {
    analysis,
    garmentConstraints: constraints,
    rendererProfile: expressiveProfile,
  });

  assert.ok(family.candidates.every((candidate) => candidate.timeline.colorDrift?.policyVersion === generation.COLOR_DRIFT_POLICY));
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.actualTimelineHashes, family.timelineHashes);
});

test("primitive and STOMP wrappers preserve color drift on final timelines", () => {
  const ordinary = generation.generateCandidateSet({
    analysis,
    garmentConstraints: stompConstraints,
    rendererProfile: expressiveProfile,
    rootSeed: "color-drift-primitive-parent",
    count: 6,
  });

  assert.ok(ordinary.candidates.every((candidate) => candidate.scoreArtifact.score.primitiveField));
  assert.ok(ordinary.candidates.every((candidate) =>
    candidate.timeline.colorDrift?.policyVersion === generation.COLOR_DRIFT_POLICY));

  const parent = ordinary.candidates[2];
  const stomp = generation.generateStompCandidateSet({
    analysis,
    garmentConstraints: stompConstraints,
    rendererProfile: expressiveProfile,
    parentScore: parent.scoreArtifact.score,
    locks: [],
    rootSeed: "color-drift-stomp",
    count: 6,
  });

  assert.ok(stomp.candidates.every((candidate) => candidate.scoreArtifact.score.primitiveField));
  assert.ok(stomp.candidates.every((candidate) =>
    candidate.timeline.colorDrift?.policyVersion === generation.COLOR_DRIFT_POLICY));
});

test("production compiler makes garment palette chromatically non-static", () => {
  const score = garmentScore("color-drift-render");
  const base = legacyResolver.resolve(analysis, score, constraints, expressiveProfile);
  const timeline = generation.applyColorDrift(base, { analysis });
  const execution = createTimelineExecution(timeline);
  const compiled = compileTimelineFilterGraph(productionBaseGraph(), execution);

  assert.equal(compiled.semanticGrammar.palette, "garment");
  assert.equal(compiled.semanticGrammar.colorDrift.policyVersion, generation.COLOR_DRIFT_POLICY);
  assert.ok(compiled.operators.some((operator) => operator.axis === "colorDrift"));
  assert.ok(new Set(compiled.segments.map((segment) => segment.renderer.hue)).size >= 2);
  assert.ok(new Set(compiled.segments.map((segment) => segment.renderer.saturation)).size >= 2);
});

test("color drift composes with possession arc segment palette authority", () => {
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: expressiveProfile,
    rootSeed: "color-drift-possession",
    count: 6,
  });
  const candidate = family.candidates.find((item) => item.timeline.possessionArc?.transitions?.length) || family.candidates[0];
  const timeline = candidate.timeline;
  const execution = createTimelineExecution(timeline);
  const compiled = compileTimelineFilterGraph(productionBaseGraph(), execution);

  assert.equal(compiled.semanticGrammar.colorDrift.policyVersion, generation.COLOR_DRIFT_POLICY);
  assert.ok(compiled.segments.every((segment) => typeof segment.semanticGrammar?.palette === "string"));
  assert.ok(compiled.segments.every((segment) => Number.isFinite(segment.colorDrift.hueOffset)));
  const paletteTransition = timeline.possessionArc?.transitions?.find((transition) => transition.axis === "palette");
  if (paletteTransition) {
    const state = generation.stateAtTick(timeline, paletteTransition.atTick);
    assert.equal(state.palette.logic, paletteTransition.to.palette.logic);
  }
});
