const assert = require("node:assert/strict");
const test = require("node:test");

const generation = require("../src/generation/index.cjs");
const { compileProductionTopology } = require("../src/render/topology-compilers.cjs");
const {
  ELASTIC_TOPOLOGY_POLICY,
  SOFT_OCCUPANCY_KNEE,
  compileTopologyResponse,
  piecewiseLinearExpression,
  projectResponseKnots,
} = require("../src/render/topology-response.cjs");

function responseTimeline(knots, { granularity = "transient" } = {}) {
  return {
    rendererPolicy: "visual-language-v3",
    timebase: 1000,
    durationTicks: Math.max(1000, knots.at(-1)?.atTick || 1000),
    nestedResponse: {
      policyVersion: "nested-response-contour-v1",
      granularity,
      knotCount: knots.length,
      knots,
      meterEvidenceUsed: false,
      idleMotionPolicyVersion: "topology-idle-v1",
      sourceWitnessSha256: "witness-proof",
      planSha256: "plan-proof",
    },
  };
}

function knot(atTick, overrides = {}) {
  return {
    atTick,
    sectionIndex: 0,
    macroEnergy: 0.5,
    localEnergy: 0.5,
    excursion: 0,
    slope: 0,
    direction: 0,
    ...overrides,
  };
}

function productionGraph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
  ].join(";\n");
}

function topologyExecution(rendererPolicy, topology, withResponse = true) {
  const state = {
    topology,
    motion: { grammar: "pulse", amplitude: 0.6, variance: 0.5 },
    palette: { logic: "garment", bleed: 0.5, contrastBias: 0 },
    material: { texture: "clean", imperfection: 0.25 },
    lyric: { placement: "center", densityBias: 0 },
    camera: { grammar: "locked", variance: 0.2 },
  };
  const nestedResponse = responseTimeline([
    knot(0, { macroEnergy: 0.2 }),
    knot(1000, { macroEnergy: 0.75, excursion: 0.1, slope: 0.08, direction: 1 }),
    knot(2000, { macroEnergy: 1, excursion: 0.08, slope: 0.06, direction: 1 }),
    knot(3000, { macroEnergy: 1 }),
    knot(4000, { macroEnergy: 1 }),
    knot(5000, { macroEnergy: 0.5, excursion: -0.12, slope: -0.1, direction: -1 }),
  ]).nestedResponse;
  const timeline = {
    rendererPolicy,
    timebase: 1000,
    durationTicks: 6000,
    baseState: state,
    patches: [],
    ...(withResponse ? { nestedResponse } : {}),
  };
  return {
    timeline,
    timebase: timeline.timebase,
    durationTicks: timeline.durationTicks,
    segments: [{ startTick: 0, endTick: 6000, startSeconds: 0, endSeconds: 6, state }],
  };
}

test("soft occupancy law preserves headroom, permits true peak, and sheds sustained high area", () => {
  const projected = projectResponseKnots([
    knot(0, { macroEnergy: 0.5 }),
    knot(1000, { macroEnergy: 1, excursion: 0.08, slope: 0.08, direction: 1 }),
    knot(2000, { macroEnergy: 1 }),
    knot(3000, { macroEnergy: 1 }),
    knot(4000, { macroEnergy: 1 }),
  ]);

  assert.ok(projected[0].extent < 0.72);
  assert.equal(projected[1].extent, 1);
  assert.equal(projected[2].extent, 1);
  assert.ok(projected[3].extent < 1);
  assert.ok(projected[4].extent < projected[3].extent);
  assert.ok(projected[4].articulation > projected[2].articulation);
  assert.ok(projected[4].openness > projected[2].openness);
});

test("recoil is signed local response and silence keeps signal activity at zero", () => {
  const recoil = projectResponseKnots([
    knot(0, { macroEnergy: 0.45, excursion: -0.12, slope: -0.08, direction: -1 }),
  ])[0];
  assert.ok(recoil.recoil > 0);

  const silent = projectResponseKnots([
    knot(0, { macroEnergy: 0, localEnergy: 0, excursion: 0, slope: 0, direction: 0 }),
  ])[0];
  assert.equal(silent.extent, 0);
  assert.equal(silent.articulation, 0);
  assert.equal(silent.openness, 0);
  assert.equal(silent.recoil, 0);
});

test("compiled response records idle separately and leaves Linear at zero idle floor", () => {
  const timeline = responseTimeline([
    knot(0, { macroEnergy: 0 }),
    knot(1000, { macroEnergy: 0.6, excursion: 0.08, slope: 0.08, direction: 1 }),
  ]);
  const fan = compileTopologyResponse(timeline, "cathedral-fan");
  const linear = compileTopologyResponse(timeline, "linear");

  assert.equal(ELASTIC_TOPOLOGY_POLICY, "elastic-topology-response-v1");
  assert.equal(SOFT_OCCUPANCY_KNEE, 0.72);
  assert.equal(fan.evidence.idleMotionPolicyVersion, "topology-idle-v1");
  assert.equal(fan.evidence.idleFloor, 0.08);
  assert.equal(fan.expressions.idle, "0.08");
  assert.equal(linear.evidence.idleFloor, 0);
  assert.equal(linear.expressions.idle, "0");
  assert.notEqual(fan.expressions.extent, fan.expressions.articulation);
});

test("piecewise interpolation is deterministic and depends only on accepted knots", () => {
  const knots = [
    { atTick: 0, extent: 0.2 },
    { atTick: 1000, extent: 0.6 },
    { atTick: 2500, extent: 0.4 },
  ];
  const left = piecewiseLinearExpression(knots, "extent", 1000);
  const right = piecewiseLinearExpression(structuredClone(knots), "extent", 1000);
  assert.equal(left, right);
  assert.match(left, /\bt\b/);
  assert.match(left, /max\(0,min\(1,/);
});

test("signed phase and travel are deterministic without ambient entropy", () => {
  const timeline = responseTimeline([
    knot(0, { macroEnergy: 0.5, excursion: -0.1, slope: -0.08, direction: -1 }),
    knot(1000, { macroEnergy: 0.6, excursion: 0.12, slope: 0.1, direction: 1 }),
  ]);
  const left = compileTopologyResponse(timeline, "spiral");
  const right = compileTopologyResponse(structuredClone(timeline), "spiral");
  assert.deepEqual(left, right);
  assert.notEqual(left.expressions.phase, "0");
  assert.notEqual(left.expressions.travelX, "0");
  assert.notEqual(left.expressions.travelY, "0");
});

test("raster-4 Cathedral Fan and Echo Tunnel consume nested response while Linear stays the control", () => {
  const fan = compileProductionTopology(
    productionGraph(),
    topologyExecution(generation.MUTATION_LATTICE_RENDERER_POLICY, "cathedral-fan"),
  );
  assert.equal(fan.topologyCompiler, "cathedral-fan-v3");
  assert.equal(fan.topologyResponse.policyVersion, "elastic-topology-response-v1");
  assert.match(fan.graph, /shapeFanBr.*rotate='[^']*t[^']*'/s);
  assert.match(fan.graph, /pow\([^;]+,6\)/);

  const tunnel = compileProductionTopology(
    productionGraph(),
    topologyExecution(generation.MUTATION_LATTICE_RENDERER_POLICY, "echo-tunnel"),
  );
  assert.equal(tunnel.topologyResponse.policyVersion, "elastic-topology-response-v1");
  assert.match(tunnel.graph, /shapeTunnelBm[^;]*t/s);

  const linear = compileProductionTopology(
    productionGraph(),
    topologyExecution(generation.MUTATION_LATTICE_RENDERER_POLICY, "linear"),
  );
  assert.equal(linear.topologyCompiler, "linear-v1");
  assert.equal(linear.topologyResponse, null);
  assert.equal(linear.graph, productionGraph());
});

test("nested response cannot reinterpret raster-2 or raster-3 topology graphs", () => {
  for (const policy of [generation.VISUAL_LANGUAGE_RENDERER_POLICY, generation.EXPRESSIVE_RENDERER_POLICY]) {
    const withResponse = compileProductionTopology(
      productionGraph(),
      topologyExecution(policy, "spiral", true),
    );
    const historical = compileProductionTopology(
      productionGraph(),
      topologyExecution(policy, "spiral", false),
    );
    assert.equal(withResponse.graph, historical.graph);
    assert.equal(withResponse.topologyCompiler, historical.topologyCompiler);
  }
});
