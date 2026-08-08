const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const {
  compileTimelineFilterGraph,
  rendererValues,
} = require("../src/render/timeline-filter.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const constraints = readJson("constraints/wire-orchard.v1.json");
const porchlightConstraints = readJson("constraints/porchlight.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function timelineFixture(topology = "linear", overrides = {}, constraintPack = constraints) {
  const artifact = generation.createVisualScore({
    seed: `issue-gengar-production-filter-${topology}-${constraintPack.id}`,
    constraints: constraintPack,
    overrides: {
      topology,
      temporalDensity: "section",
      ...overrides,
    },
  });
  return generation.resolve(analysis, artifact.score, constraintPack, profile);
}

function productionBaseGraph() {
  return [
    "[waveAudio]showwaves=s=640x96:mode=cline:rate=30:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=640:360:0:239:color=black@0.0[waveFull]",
    "[stage0]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

test("timeline execution segments drive production filter compilation", () => {
  const timeline = timelineFixture();
  const execution = createTimelineExecution(timeline);
  const compiled = compileTimelineFilterGraph(productionBaseGraph(), execution);

  assert.equal(compiled.topology, "linear");
  assert.equal(compiled.segments.length, execution.segments.length);
  assert.match(compiled.graph, /\[waveAudio\]showwaves=/);
  assert.match(compiled.graph, /hue=h=/);
  assert.match(compiled.graph, /\[timelineFinal\]ass=/);
  assert.equal(compiled.semanticGrammar.motion, execution.timeline.baseState.motion.grammar);
  assert.equal(compiled.semanticGrammar.palette, execution.timeline.baseState.palette.logic);
  assert.equal(compiled.semanticGrammar.material, execution.timeline.baseState.material.texture);
  assert.equal(compiled.semanticGrammar.camera, execution.timeline.baseState.camera.grammar);
  for (const segment of compiled.segments) {
    assert.deepEqual(segment.state, execution.stateAtTick(segment.startTick));
    assert.deepEqual(segment.renderer, rendererValues(segment.state));
    assert.match(
      compiled.graph,
      new RegExp(`between\\(t,${segment.startSeconds},${segment.endSeconds}\\)`),
    );
  }
});

test("circle and mirrored-ring are compiled from timeline-owned topology", () => {
  for (const topology of ["circle", "mirrored-ring"]) {
    const timeline = timelineFixture(topology);
    const execution = createTimelineExecution(timeline);
    const compiled = compileTimelineFilterGraph(productionBaseGraph(), execution);

    assert.equal(compiled.topology, topology);
    assert.doesNotMatch(compiled.graph, /\[waveAudio\]showwaves=/);
    assert.match(compiled.graph, /avectorscope=/);
    assert.match(compiled.graph, /\[waveFull\]/);
    if (topology === "mirrored-ring") {
      assert.match(compiled.graph, /\[waveAudio\]asplit=2/);
      assert.match(compiled.graph, /hflip/);
      assert.match(compiled.graph, /blend=all_mode=screen/);
    } else {
      assert.doesNotMatch(compiled.graph, /\[waveAudio\]asplit=2/);
    }
  }
});

test("existing categorical score grammars compile into visibly distinct programs", () => {
  const neutralTimeline = timelineFixture(
    "linear",
    {
      motion: { grammar: "still" },
      palette: { logic: "garment" },
      material: { texture: "clean" },
      camera: { grammar: "locked" },
    },
    porchlightConstraints,
  );
  const neutral = compileTimelineFilterGraph(
    productionBaseGraph(),
    createTimelineExecution(neutralTimeline),
  );

  assert.deepEqual(neutral.semanticGrammar.filters, []);
  assert.doesNotMatch(neutral.graph, /\[semanticStage\]/);

  const expressiveTimeline = timelineFixture(
    "linear",
    {
      motion: { grammar: "drift" },
      palette: { logic: "analogous" },
      material: { texture: "grain" },
      camera: { grammar: "drift" },
    },
    porchlightConstraints,
  );
  const expressive = compileTimelineFilterGraph(
    productionBaseGraph(),
    createTimelineExecution(expressiveTimeline),
  );

  assert.match(expressive.graph, /\[semanticStage\]/);
  assert.match(expressive.graph, /sin\(t\*0\.73\)/);
  assert.match(expressive.graph, /hue=h=8:s=1\.08/);
  assert.match(expressive.graph, /noise=alls=/);
  assert.notDeepEqual(expressive.semanticGrammar.filters, neutral.semanticGrammar.filters);
});

test("aggressive grammars enact fracture, duotone, photocopy, and orbit", () => {
  const timeline = timelineFixture("linear", {
    motion: { grammar: "fracture" },
    palette: { logic: "duotone" },
    material: { texture: "photocopy" },
    camera: { grammar: "orbit" },
  });
  const compiled = compileTimelineFilterGraph(
    productionBaseGraph(),
    createTimelineExecution(timeline),
  );

  assert.equal(compiled.semanticGrammar.motion, "fracture");
  assert.equal(compiled.semanticGrammar.palette, "duotone");
  assert.equal(compiled.semanticGrammar.material, "photocopy");
  assert.equal(compiled.semanticGrammar.camera, "orbit");
  assert.match(compiled.graph, /sin\(t\*6\.2\)/);
  assert.match(compiled.graph, /sin\(t\*0\.24\)/);
  assert.match(compiled.graph, /hue=s=0\.28/);
  assert.match(compiled.graph, /unsharp=5:5:0\.8:3:3:0\.2/);
});

test("gate-weave and camera push produce deterministic physical motion", () => {
  const timeline = timelineFixture("linear", {
    motion: { grammar: "pulse" },
    palette: { logic: "split-complement" },
    material: { texture: "gate-weave" },
    camera: { grammar: "push" },
  });
  const execution = createTimelineExecution(timeline);
  const first = compileTimelineFilterGraph(productionBaseGraph(), execution);
  const second = compileTimelineFilterGraph(productionBaseGraph(), execution);

  assert.deepEqual(first, second);
  assert.match(first.graph, /min\(t\//);
  assert.match(first.graph, /sin\(t\*8\.1\)/);
  assert.match(first.graph, /hue=h=-18:s=1\.28/);
});

test("production compilation refuses topology drift inside a timeline", () => {
  const timeline = structuredClone(timelineFixture("linear"));
  timeline.patches = [
    {
      atTick: 1,
      boundary: "section",
      axis: "topology",
      priorStateHash: "tampered",
      to: { topology: "circle" },
      entropyCost: 1,
      transition: "cut",
    },
  ];
  const execution = createTimelineExecution(timeline);

  assert.throws(
    () => compileTimelineFilterGraph(productionBaseGraph(), execution),
    /topology must remain frozen/,
  );
});

test("production compilation refuses categorical semantic drift inside a timeline", () => {
  const timeline = structuredClone(timelineFixture("linear"));
  timeline.patches = [
    {
      atTick: 1,
      boundary: "section",
      axis: "motion",
      priorStateHash: "tampered",
      to: {
        motion: {
          ...timeline.baseState.motion,
          grammar: timeline.baseState.motion.grammar === "fracture" ? "orbit" : "fracture",
        },
      },
      entropyCost: 1,
      transition: "cut",
    },
  ];
  const execution = createTimelineExecution(timeline);

  assert.throws(
    () => compileTimelineFilterGraph(productionBaseGraph(), execution),
    /categorical renderer semantics must remain frozen/,
  );
});

test("production compilation is deterministic and read-only", () => {
  for (const topology of ["linear", "circle", "mirrored-ring"]) {
    const timeline = timelineFixture(topology);
    const before = generation.canonicalStringify(timeline);
    const execution = createTimelineExecution(timeline);

    const first = compileTimelineFilterGraph(productionBaseGraph(), execution);
    const second = compileTimelineFilterGraph(productionBaseGraph(), execution);

    assert.deepEqual(first, second);
    assert.equal(generation.canonicalStringify(timeline), before);
  }
});

test("renderer values come from canonical timeline state", () => {
  const timeline = timelineFixture();
  const execution = createTimelineExecution(timeline);
  const first = execution.segments[0];
  const changed = structuredClone(first.state);
  changed.palette.contrastBias = Math.max(-1, Math.min(1, changed.palette.contrastBias + 0.25));

  assert.notDeepEqual(rendererValues(changed), rendererValues(first.state));
});
