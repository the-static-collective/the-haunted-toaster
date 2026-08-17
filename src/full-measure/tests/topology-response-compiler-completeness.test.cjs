const assert = require("node:assert/strict");
const test = require("node:test");

const generation = require("../src/generation/index.cjs");
const { compileProductionTopology } = require("../src/render/topology-compilers.cjs");

function graph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
  ].join(";\n");
}

function execution(topology) {
  const state = {
    topology,
    motion: { grammar: "pulse", amplitude: 0.6, variance: 0.5 },
    palette: { logic: "garment", bleed: 0.5, contrastBias: 0 },
    material: { texture: "clean", imperfection: 0.25 },
    lyric: { placement: "center", densityBias: 0 },
    camera: { grammar: "locked", variance: 0.2 },
  };
  const knots = [
    { atTick: 0, sectionIndex: 0, macroEnergy: 0.25, localEnergy: 0.25, excursion: 0, slope: 0, direction: 0 },
    { atTick: 1000, sectionIndex: 0, macroEnergy: 0.85, localEnergy: 0.9, excursion: 0.12, slope: 0.1, direction: 1 },
    { atTick: 2000, sectionIndex: 0, macroEnergy: 0.55, localEnergy: 0.45, excursion: -0.12, slope: -0.1, direction: -1 },
  ];
  const timeline = {
    rendererPolicy: generation.MUTATION_LATTICE_RENDERER_POLICY,
    timebase: 1000,
    durationTicks: 3000,
    baseState: state,
    patches: [],
    nestedResponse: {
      policyVersion: "nested-response-contour-v1",
      granularity: "transient",
      knotCount: knots.length,
      knots,
      meterEvidenceUsed: false,
      idleMotionPolicyVersion: "topology-idle-v1",
      sourceWitnessSha256: "witness-completeness",
      planSha256: "plan-completeness",
    },
  };
  return {
    timeline,
    timebase: 1000,
    durationTicks: 3000,
    segments: [{ startTick: 0, endTick: 3000, startSeconds: 0, endSeconds: 3, state }],
  };
}

function compiled(topology) {
  return compileProductionTopology(graph(), execution(topology)).graph;
}

test("generic raster-4 response uses the approved extent and travel law", () => {
  const source = compiled("circle");
  assert.match(source, /1\+0\.45\*\([^;]+\)\+0\.33\*pow\(\([^;]+\),6\)/);
  assert.match(source, /\*\(iw-ow\)\*0\.28/);
  assert.match(source, /\*\(ih-oh\)\*0\.28/);
  assert.match(source, /\*0\.16/);
});

test("Mirrored Ring and Quad Mirror route openness into internal separation", () => {
  assert.match(compiled("mirrored-ring"), /openness|0\.45[^;]*t/s);
  assert.match(compiled("quad-mirror"), /scoreQ[1234][^;]*crop=[^;]*t/s);
});

test("Elastic Spine and Split Horizon use signed recoil/openness before the final whole-frame response", () => {
  assert.match(compiled("elastic-spine"), /scoreSpineResponsive|recoil|phase/s);
  assert.match(compiled("split-horizon"), /shapeHorizonTopResponsive|shapeHorizonBottomResponsive/);
});

test("Echo Tunnel moves nested planes independently with signed travel", () => {
  const source = compiled("echo-tunnel");
  assert.match(source, /shapeTunnelBmResponsive[^;]*crop=[^;]*t/s);
  assert.match(source, /shapeTunnelCiResponsive[^;]*crop=[^;]*t/s);
});
