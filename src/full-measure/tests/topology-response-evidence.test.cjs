const assert = require("node:assert/strict");
const test = require("node:test");

const generation = require("../src/generation/index.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const { compileTimelineFilterGraph } = require("../src/render/timeline-filter.cjs");
const { buildVisualCompilerEvidence } = require("../src/render/visual-compiler-evidence.cjs");

function graph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]ass=filename='evidence.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

function state(topology = "circle") {
  return {
    topology,
    motion: { grammar: "pulse", amplitude: 0.6, variance: 0.4 },
    palette: { logic: "garment", bleed: 0.5, contrastBias: 0 },
    material: { texture: "clean", imperfection: 0.25 },
    lyric: { placement: "center", densityBias: 0 },
    camera: { grammar: "locked", variance: 0.2 },
  };
}

function execution(rendererPolicy, { withResponse = true } = {}) {
  const baseState = state();
  const timeline = {
    rendererPolicy,
    timebase: 1000,
    durationTicks: 2000,
    baseState,
    patches: [],
    ...(withResponse ? {
      nestedResponse: {
        policyVersion: "nested-response-contour-v1",
        granularity: "transient",
        knotCount: 2,
        knots: [
          { atTick: 0, sectionIndex: 0, macroEnergy: 0.25, localEnergy: 0.25, excursion: 0, slope: 0, direction: 0 },
          { atTick: 1000, sectionIndex: 0, macroEnergy: 0.9, localEnergy: 0.9, excursion: 0.15, slope: 0.1, direction: 1 },
        ],
        meterEvidenceUsed: false,
        idleMotionPolicyVersion: "topology-idle-v1",
        sourceWitnessSha256: "witness-evidence-proof",
        planSha256: "plan-evidence-proof",
      },
    } : {}),
  };
  return {
    timeline,
    timebase: timeline.timebase,
    durationTicks: timeline.durationTicks,
    segments: [{ startTick: 0, endTick: 2000, startSeconds: 0, endSeconds: 2, state: baseState }],
  };
}

const compact = {
  policyVersion: "elastic-topology-response-v1",
  nestedResponsePolicyVersion: "nested-response-contour-v1",
  planSha256: "plan-evidence-proof",
  knotCount: 2,
  granularity: "transient",
  idleMotionPolicyVersion: "topology-idle-v1",
  softOccupancyKnee: 0.72,
  meterEvidenceUsed: false,
};

test("raster-4 compiler exposes only compact accepted topology-response evidence", () => {
  const compiled = compileTimelineFilterGraph(graph(), execution(generation.MUTATION_LATTICE_RENDERER_POLICY));
  assert.deepEqual(compiled.topologyResponse, compact);
  assert.equal(Object.hasOwn(compiled.topologyResponse, "idleFloor"), false);
});

test("visual compiler receipt evidence carries the same compact accepted response plan", () => {
  const compiled = compileTimelineFilterGraph(graph(), execution(generation.MUTATION_LATTICE_RENDERER_POLICY));
  const visualCompiler = buildVisualCompilerEvidence({
    compiledTimeline: compiled,
    atmosphere: null,
    temporalSampling: "inner-23976-proof",
    witnessWindow: { policyVersion: "witness-proof" },
    graphSha256: "a".repeat(64),
  });
  assert.deepEqual(visualCompiler.topologyResponse, compact);
});

test("nested response does not add compiler evidence shape to raster-3 replay", () => {
  const compiled = compileTimelineFilterGraph(graph(), execution(generation.EXPRESSIVE_RENDERER_POLICY));
  assert.equal(Object.hasOwn(compiled, "topologyResponse"), false);
});
