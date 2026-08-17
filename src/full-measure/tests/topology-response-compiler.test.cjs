const assert = require("node:assert/strict");
const test = require("node:test");

const generation = require("../src/generation/index.cjs");
const { compileProductionTopology } = require("../src/render/topology-compilers.cjs");

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

function nestedResponse() {
  const knots = [
    knot(0, { macroEnergy: 0.2 }),
    knot(1000, { macroEnergy: 0.75, excursion: 0.1, slope: 0.08, direction: 1 }),
    knot(2000, { macroEnergy: 1, excursion: 0.08, slope: 0.06, direction: 1 }),
    knot(3000, { macroEnergy: 1 }),
    knot(4000, { macroEnergy: 1 }),
    knot(5000, { macroEnergy: 0.5, excursion: -0.12, slope: -0.1, direction: -1 }),
  ];
  return {
    policyVersion: "nested-response-contour-v1",
    granularity: "transient",
    knotCount: knots.length,
    knots,
    meterEvidenceUsed: false,
    idleMotionPolicyVersion: "topology-idle-v1",
    sourceWitnessSha256: "witness-proof",
    planSha256: "plan-proof",
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

function execution(rendererPolicy, topology, withResponse = true) {
  const state = {
    topology,
    motion: { grammar: "pulse", amplitude: 0.6, variance: 0.5 },
    palette: { logic: "garment", bleed: 0.5, contrastBias: 0 },
    material: { texture: "clean", imperfection: 0.25 },
    lyric: { placement: "center", densityBias: 0 },
    camera: { grammar: "locked", variance: 0.2 },
  };
  const timeline = {
    rendererPolicy,
    timebase: 1000,
    durationTicks: 6000,
    baseState: state,
    patches: [],
    ...(withResponse ? { nestedResponse: nestedResponse() } : {}),
  };
  return {
    timeline,
    timebase: timeline.timebase,
    durationTicks: timeline.durationTicks,
    segments: [{ startTick: 0, endTick: 6000, startSeconds: 0, endSeconds: 6, state }],
  };
}

test("raster-4 Cathedral Fan consumes response in rib angles and bounded extent", () => {
  const compiled = compileProductionTopology(
    productionGraph(),
    execution(generation.MUTATION_LATTICE_RENDERER_POLICY, "cathedral-fan"),
  );
  assert.equal(compiled.topologyCompiler, "cathedral-fan-v3");
  assert.equal(compiled.topologyResponse.policyVersion, "elastic-topology-response-v1");
  assert.match(compiled.graph, /shapeFanBr.*rotate='[^']*t[^']*'/s);
  assert.match(compiled.graph, /pow\([^;]+,6\)/);
  assert.doesNotMatch(compiled.graph, /blend=all_mode=screen/);
});

test("raster-4 Echo Tunnel moves its vanishing axis with accepted response", () => {
  const compiled = compileProductionTopology(
    productionGraph(),
    execution(generation.MUTATION_LATTICE_RENDERER_POLICY, "echo-tunnel"),
  );
  assert.equal(compiled.topologyCompiler, "echo-tunnel-v3");
  assert.equal(compiled.topologyResponse.policyVersion, "elastic-topology-response-v1");
  assert.match(compiled.graph, /shapeTunnelBm[^;]*t/s);
  assert.doesNotMatch(compiled.graph, /blend=all_mode=screen/);
});

test("Linear stays the current positive control even with response evidence", () => {
  const graph = productionGraph();
  const compiled = compileProductionTopology(
    graph,
    execution(generation.MUTATION_LATTICE_RENDERER_POLICY, "linear"),
  );
  assert.equal(compiled.topologyCompiler, "linear-v1");
  assert.equal(compiled.topologyResponse, null);
  assert.equal(compiled.graph, graph);
});

test("nested response cannot reinterpret raster-2 or raster-3 topology graphs", () => {
  for (const policy of [generation.VISUAL_LANGUAGE_RENDERER_POLICY, generation.EXPRESSIVE_RENDERER_POLICY]) {
    const withResponse = compileProductionTopology(productionGraph(), execution(policy, "spiral", true));
    const historical = compileProductionTopology(productionGraph(), execution(policy, "spiral", false));
    assert.equal(withResponse.graph, historical.graph);
    assert.equal(withResponse.topologyCompiler, historical.topologyCompiler);
    assert.equal(withResponse.topologyResponse || null, historical.topologyResponse || null);
  }
});
