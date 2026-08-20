const test = require("node:test");
const assert = require("node:assert/strict");

const generation = require("../src/generation/index.cjs");
const {
  ATMOSPHERE_COMPILER_V1,
  ATMOSPHERE_COMPILER_V2,
  buildAtmosphereAss,
} = require("../src/render/atmosphere.cjs");
const {
  compileTimelineFilterGraph,
} = require("../src/render/timeline-filter.cjs");
const {
  cameraSurrender,
  effectiveInternalEnergy,
} = require("../src/render/response-shaping.cjs");
const raster2 = require("../profiles/toaster-raster-2.json");
const raster3 = require("../profiles/toaster-raster-3.json");

function productionLikeGraph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]ass=filename='visual-language.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

function execution(rendererPolicy, {
  amplitude = 0.25,
  variance = 0.25,
  cameraVariance = 0.5,
  cameraGrammar = "orbit",
} = {}) {
  const state = {
    topology: "spiral",
    motion: { grammar: "still", amplitude, variance },
    palette: { logic: "garment", bleed: 0.5, contrastBias: 0 },
    material: { texture: "clean", imperfection: 0 },
    lyric: { placement: "lower-third", densityBias: 0 },
    camera: { grammar: cameraGrammar, variance: cameraVariance },
    atmosphere: "rain",
  };
  const timeline = {
    rendererPolicy,
    timebase: 1000,
    durationTicks: 10_000,
    baseState: state,
    patches: [],
  };
  return {
    timeline,
    timebase: timeline.timebase,
    durationTicks: timeline.durationTicks,
    segments: [{
      startTick: 0,
      endTick: timeline.durationTicks,
      startSeconds: 0,
      endSeconds: 10,
      state,
    }],
  };
}

function atmosphereTimeline(rendererPolicy, amplitude) {
  return {
    rendererPolicy,
    scoreAddress: "htvs1_internal-response",
    timelineHash: "timeline-internal-response",
    timebase: 1000,
    durationTicks: 12_000,
    baseState: {
      atmosphere: "rain",
      motion: { amplitude, variance: 0.25 },
    },
  };
}

test("internal response curve preserves silence, lifts low-mid energy, and retains headroom", () => {
  assert.equal(effectiveInternalEnergy(0), 0);
  assert.ok(effectiveInternalEnergy(0.01) < 0.01);
  assert.ok(effectiveInternalEnergy(0.1) >= 0.2);
  assert.ok(effectiveInternalEnergy(0.25) >= 0.36);
  assert.ok(effectiveInternalEnergy(0.45) >= 0.55);
  assert.ok(effectiveInternalEnergy(0.8) < 0.9);
  assert.equal(effectiveInternalEnergy(1), 1);

  let prior = -1;
  for (let step = 0; step <= 100; step += 1) {
    const shaped = effectiveInternalEnergy(step / 100);
    assert.ok(shaped >= 0 && shaped <= 1);
    assert.ok(shaped >= prior, `${step / 100} regressed below ${prior}`);
    prior = shaped;
  }

  assert.equal(cameraSurrender(0), 0.35);
  assert.equal(cameraSurrender(0.5), 0.575);
  assert.equal(cameraSurrender(1), 0.8);
});

test("renderer profile opt-in leaves raster-2 policy intact and advances raster-3 explicitly", () => {
  assert.equal(
    generation.rendererPolicyForProfile(raster2),
    generation.VISUAL_LANGUAGE_RENDERER_POLICY,
  );
  assert.equal(
    generation.rendererPolicyForProfile(raster3),
    generation.EXPRESSIVE_RENDERER_POLICY,
  );
});

test("expressive topology lifts the same low-mid motion state without reinterpreting raster-2", () => {
  const legacy = compileTimelineFilterGraph(
    productionLikeGraph(),
    execution(generation.VISUAL_LANGUAGE_RENDERER_POLICY),
  );
  const expressive = compileTimelineFilterGraph(
    productionLikeGraph(),
    execution(generation.EXPRESSIVE_RENDERER_POLICY),
  );

  assert.equal(legacy.topologyCompiler, "spiral-polar-v1");
  assert.equal(expressive.topologyCompiler, "spiral-polar-v2");
  assert.match(legacy.graph, /mode=polar:draw=line:scale=sqrt:zoom=1\.353:/);
  assert.match(expressive.graph, /mode=polar:draw=line:scale=sqrt:zoom=1\.492:/);
  assert.match(legacy.graph, /colorchannelmixer=aa=0\.505/);
  assert.match(expressive.graph, /colorchannelmixer=aa=0\.574/);
});

test("camera surrender spends less geometric movement and binds intensity to camera variance", () => {
  const legacy = compileTimelineFilterGraph(
    productionLikeGraph(),
    execution(generation.VISUAL_LANGUAGE_RENDERER_POLICY, { cameraVariance: 0.5 }),
  );
  const subdued = compileTimelineFilterGraph(
    productionLikeGraph(),
    execution(generation.EXPRESSIVE_RENDERER_POLICY, { cameraVariance: 0.5 }),
  );
  const higher = compileTimelineFilterGraph(
    productionLikeGraph(),
    execution(generation.EXPRESSIVE_RENDERER_POLICY, { cameraVariance: 1 }),
  );

  assert.equal(legacy.semanticGrammar.compilers.camera, "camera-orbit-v1");
  assert.equal(subdued.semanticGrammar.compilers.camera, "camera-orbit-v2");
  assert.match(legacy.graph, /scale=340:192,crop=320:180/);
  assert.match(legacy.graph, /\*\(iw-ow\)\*0\.46/);
  assert.match(subdued.graph, /scale=332:188,crop=320:180/);
  assert.match(subdued.graph, /\*\(iw-ow\)\*0\.2645/);
  assert.match(higher.graph, /\*\(iw-ow\)\*0\.368/);
  assert.notEqual(subdued.graph, higher.graph);
});

test("expressive atmosphere keeps v2 lift while raster-4 preserves response headroom", () => {
  const legacy = buildAtmosphereAss({
    timeline: atmosphereTimeline(generation.VISUAL_LANGUAGE_RENDERER_POLICY, 0.25),
    width: 640,
    height: 360,
  });
  const expressive = buildAtmosphereAss({
    timeline: atmosphereTimeline(generation.EXPRESSIVE_RENDERER_POLICY, 0.25),
    width: 640,
    height: 360,
  });
  const replay = buildAtmosphereAss({
    timeline: atmosphereTimeline(generation.EXPRESSIVE_RENDERER_POLICY, 0.25),
    width: 640,
    height: 360,
  });
  const raster4 = buildAtmosphereAss({
    timeline: atmosphereTimeline(generation.MUTATION_LATTICE_RENDERER_POLICY, 0.25),
    width: 640,
    height: 360,
  });
  const raster4Replay = buildAtmosphereAss({
    timeline: atmosphereTimeline(generation.MUTATION_LATTICE_RENDERER_POLICY, 0.25),
    width: 640,
    height: 360,
  });
  const peak = buildAtmosphereAss({
    timeline: atmosphereTimeline(generation.EXPRESSIVE_RENDERER_POLICY, 1),
    width: 640,
    height: 360,
  });

  assert.equal(legacy.compiler, ATMOSPHERE_COMPILER_V1);
  assert.equal(Object.hasOwn(legacy, "responseEnergy"), false);
  assert.equal(expressive.compiler, ATMOSPHERE_COMPILER_V2);
  assert.ok(expressive.responseEnergy >= 0.36);
  assert.ok(expressive.eventCount > legacy.eventCount);
  assert.equal(expressive.content, replay.content);
  assert.equal(expressive.contentSha256, replay.contentSha256);
  assert.equal(raster4.compiler, ATMOSPHERE_COMPILER_V2);
  assert.equal(raster4.responseEnergy, 0.25);
  assert.ok(raster4.responseEnergy < expressive.responseEnergy);
  assert.equal(raster4.content, raster4Replay.content);
  assert.equal(raster4.contentSha256, raster4Replay.contentSha256);
  assert.ok(peak.eventCount > expressive.eventCount);
});
