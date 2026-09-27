const test = require("node:test");
const assert = require("node:assert/strict");

const generation = require("../src/generation/index.cjs");
const { compileProductionTopology } = require("../src/render/topology-compilers.cjs");
const { applyPrimitiveFieldToGraph } = require("../src/render/primitive-field.cjs");

function productionGraph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
  ].join(";\n");
}

function execution(policy, structure) {
  const state = {
    topology: "linear",
    primitiveField: { structure, dynamics: "inertial" },
    motion: { grammar: "pulse", amplitude: 0.6, variance: 0.5 },
    palette: { logic: "garment", bleed: 0.5, contrastBias: 0 },
    material: { texture: "clean", imperfection: 0.25 },
    lyric: { placement: "center", densityBias: 0 },
    camera: { grammar: "locked", variance: 0.2 },
  };
  const timeline = {
    rendererPolicy: policy,
    timebase: 1000,
    durationTicks: 6000,
    baseState: state,
    primitiveField: {
      policyVersion: "primitive-field-coverage-v1",
      structure,
      dynamics: "inertial",
      structureCompiler: `structure-${structure}-v1`,
      dynamicsCompiler: "dynamics-inertial-v1",
    },
    patches: [],
  };
  return {
    timeline,
    timebase: 1000,
    durationTicks: 6000,
    segments: [{ startTick: 0, endTick: 6000, startSeconds: 0, endSeconds: 6, state }],
  };
}

test("raster-4 Linear has a dedicated v3 native-anatomy compiler", () => {
  const compiled = compileProductionTopology(
    productionGraph(),
    execution(generation.MUTATION_LATTICE_RENDERER_POLICY, "scope"),
  );
  assert.equal(compiled.topologyCompiler, "linear-v3");
  assert.match(compiled.graph, /linearSeed/);
  assert.match(compiled.graph, /linearRail/);
  assert.notEqual(compiled.graph, productionGraph());
});

test("Linear v3 primitive structures produce materially distinct native anatomy", () => {
  const structures = ["scope", "ribs", "lattice", "branches", "torus"];
  const graphs = new Map();
  for (const structure of structures) {
    const compiled = compileProductionTopology(
      productionGraph(),
      execution(generation.MUTATION_LATTICE_RENDERER_POLICY, structure),
    );
    graphs.set(structure, compiled.graph);
    assert.equal(compiled.topologyCompiler, "linear-v3");
    assert.match(compiled.graph, new RegExp(`linear-${structure}`, "i"));
  }
  assert.equal(new Set(graphs.values()).size, structures.length);
  assert.match(graphs.get("scope"), /linearRail[^\n]*linearRail/s);
  assert.match(graphs.get("ribs"), /linearRib/);
  assert.match(graphs.get("lattice"), /linearLattice/);
  assert.match(graphs.get("branches"), /linearBranch/);
  assert.match(graphs.get("torus"), /linearReturn/);
});

test("Linear v3 consumes primitive structure as anatomy instead of decorating it twice", () => {
  const exec = execution(generation.MUTATION_LATTICE_RENDERER_POLICY, "branches");
  const prepared = applyPrimitiveFieldToGraph({
    graph: productionGraph(),
    timeline: exec.timeline,
    width: 320,
    height: 180,
  });
  assert.equal(prepared.evidence.structure.value, "branches");
  assert.match(prepared.graph, /\[waveFull\]null\[primitiveStructure\]/);
  assert.doesNotMatch(prepared.graph, /primitiveBranch0/);

  const compiled = compileProductionTopology(prepared.graph, exec);
  assert.equal(compiled.topologyCompiler, "linear-v3");
  assert.match(compiled.graph, /linearBranch/);
});

test("historical Linear policies remain exact linear-v1 no-ops", () => {
  for (const policy of [
    generation.VISUAL_LANGUAGE_RENDERER_POLICY,
    generation.EXPRESSIVE_RENDERER_POLICY,
  ]) {
    const graph = productionGraph();
    const compiled = compileProductionTopology(graph, execution(policy, "branches"));
    assert.equal(compiled.topologyCompiler, "linear-v1");
    assert.equal(compiled.graph, graph);
  }
});
