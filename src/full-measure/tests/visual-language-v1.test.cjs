const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const {
  compileTimelineFilterGraph,
  rendererPolicyForTimeline,
} = require("../src/render/timeline-filter.cjs");
const { compileVisualLanguageOperators } = require("../src/render/visual-language.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const legacyConstraints = readJson("constraints/wire-orchard.v1.json");
const constraints = readJson("constraints/wire-orchard.v2.json");
const legacyProfile = readJson("profiles/toaster-raster-1.json");
const profile = readJson("profiles/toaster-raster-2.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

const BASE_STATE = Object.freeze({
  topology: "linear",
  motion: Object.freeze({ grammar: "still", amplitude: 0.58, variance: 0.47 }),
  material: Object.freeze({ texture: "clean", imperfection: 0.52 }),
  camera: Object.freeze({ grammar: "locked", variance: 0.46 }),
  palette: Object.freeze({ logic: "garment", bleed: 0.61, contrastBias: 0.32 }),
  lyric: Object.freeze({ placement: "center", densityBias: 0 }),
});

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

function artifact(overrides = {}, seed = "visual-language-v1") {
  return generation.createVisualScore({ seed, constraints, overrides });
}

function statePlan(overrides = {}) {
  const state = structuredClone(BASE_STATE);
  for (const [axis, value] of Object.entries(overrides)) {
    state[axis] = value && typeof value === "object" && !Array.isArray(value)
      ? { ...state[axis], ...value }
      : value;
  }
  return compileVisualLanguageOperators("stage0", state, {
    width: 320,
    height: 180,
    fps: 12,
  });
}

test("toaster-raster-2 opts into visual-language-v1 without changing legacy timelines", () => {
  const legacyArtifact = generation.createVisualScore({
    seed: "renderer-policy-replay-law",
    constraints: legacyConstraints,
    overrides: { topology: "circle", temporalDensity: "section" },
  });
  const legacyTimeline = generation.resolve(
    analysis,
    legacyArtifact.score,
    legacyConstraints,
    legacyProfile,
  );
  assert.equal(Object.hasOwn(legacyTimeline, "rendererPolicy"), false);
  assert.equal(rendererPolicyForTimeline(legacyTimeline), generation.LEGACY_RENDERER_POLICY);

  const nextArtifact = artifact({ topology: "circle", temporalDensity: "section" }, "renderer-policy-v2");
  const nextTimeline = generation.resolve(analysis, nextArtifact.score, constraints, profile);
  assert.equal(nextTimeline.rendererPolicy, generation.VISUAL_LANGUAGE_RENDERER_POLICY);
  assert.equal(rendererPolicyForTimeline(nextTimeline), generation.VISUAL_LANGUAGE_RENDERER_POLICY);
});

test("spiral and quad-mirror validate, resolve, and compile through the static topology registry", () => {
  for (const topology of ["spiral", "quad-mirror"]) {
    const scoreArtifact = artifact({ topology, temporalDensity: "section" }, `new-topology-${topology}`);
    const parsed = generation.parseVisualScore(scoreArtifact.score);
    assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
    const timeline = generation.resolve(analysis, scoreArtifact.score, constraints, profile);
    assert.equal(timeline.baseState.topology, topology);
    assert.equal(timeline.rendererPolicy, generation.VISUAL_LANGUAGE_RENDERER_POLICY);

    const compiled = compileTimelineFilterGraph(
      productionLikeGraph(),
      createTimelineExecution(timeline),
    );
    assert.equal(compiled.topology, topology);
    assert.equal(compiled.fieldEnvelope.policy, "bounded-full-height-v1");
    assert.equal(compiled.fieldEnvelope.envelope.height, 180);
    assert.match(compiled.topologyCompiler, topology === "spiral" ? /spiral/ : /quad-mirror/);
  }
});

test("motion, material, camera, and palette categories compile to distinct structural laws", () => {
  const axes = [
    ["motion", ["still", "drift", "pulse", "orbit", "fracture"], (value) => ({ motion: { grammar: value } })],
    ["material", ["clean", "grain", "photocopy", "gate-weave"], (value) => ({ material: { texture: value } })],
    ["camera", ["locked", "drift", "push", "orbit"], (value) => ({ camera: { grammar: value } })],
    ["palette", ["garment", "analogous", "split-complement", "duotone"], (value) => ({ palette: { logic: value } })],
  ];

  for (const [axis, values, overrideFor] of axes) {
    const signatures = values.map((value) => {
      const first = statePlan(overrideFor(value));
      const second = statePlan(overrideFor(value));
      assert.deepEqual(first, second);
      const evidence = first.operators.find((operator) => operator.axis === axis);
      assert.equal(evidence.value, value);
      return `${evidence.compiler}\n${first.lines.join(";\n")}`;
    });
    assert.equal(new Set(signatures).size, values.length, `${axis} categories collapsed to one graph`);
  }

  const fracture = statePlan({ motion: { grammar: "fracture" } }).lines.join("\n");
  assert.match(fracture, /split=2/);
  assert.match(fracture, /hstack/);

  const duotone = statePlan({ palette: { logic: "duotone" } }).lines.join("\n");
  assert.match(duotone, /format=gray/);
  assert.match(duotone, /lutrgb/);
});

test("new topology values are ordinary categorical distance and exact locks stay exact", () => {
  const circle = artifact({ topology: "circle" }, "distance-circle").score;
  const spiral = structuredClone(circle);
  spiral.topology = "spiral";
  assert.deepEqual(generation.categoricalBreaks(circle, spiral), ["topology"]);
  assert.equal(generation.visibleSemanticDistance(circle, spiral, constraints), 8);

  const parent = artifact({ topology: "spiral" }, "locked-spiral").score;
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    parentScore: parent,
    locks: ["topology"],
    rootSeed: "locked-topology-family",
    count: 6,
    phase: "branch",
  });
  assert.ok(family.candidates.length > 0);
  assert.ok(family.candidates.every((candidate) => candidate.scoreArtifact.score.topology === "spiral"));
});

test("initial six-up can lawfully inhabit the new topology space", () => {
  const newTopologyConstraints = structuredClone(constraints);
  newTopologyConstraints.id = "wire-orchard-new-topologies-test";
  newTopologyConstraints.topology.allowed = ["spiral", "quad-mirror"];
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: newTopologyConstraints,
    rendererProfile: profile,
    rootSeed: "new-topology-six-up",
    count: 6,
    phase: "initial",
  });
  assert.equal(family.producedCount, 6);
  assert.ok(
    family.candidates.every((candidate) => ["spiral", "quad-mirror"].includes(candidate.scoreArtifact.score.topology)),
  );
  assert.ok(new Set(family.candidates.map((candidate) => candidate.scoreArtifact.score.topology)).size >= 2);
});

test("same accepted state produces the same compiled graph and compiler evidence", () => {
  const scoreArtifact = artifact({
    topology: "spiral",
    motion: { grammar: "fracture" },
    material: { texture: "photocopy" },
    camera: { grammar: "orbit" },
    palette: { logic: "duotone" },
    temporalDensity: "section",
  }, "deterministic-compiler-evidence");
  const timeline = generation.resolve(analysis, scoreArtifact.score, constraints, profile);
  const execution = createTimelineExecution(timeline);
  const first = compileTimelineFilterGraph(productionLikeGraph(), execution);
  const second = compileTimelineFilterGraph(productionLikeGraph(), execution);
  assert.equal(first.graph, second.graph);
  assert.deepEqual(first.operators, second.operators);
  assert.equal(first.topologyCompiler, second.topologyCompiler);
  assert.equal(first.rendererPolicy, second.rendererPolicy);
});