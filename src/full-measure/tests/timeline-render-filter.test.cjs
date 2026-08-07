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
const profile = readJson("profiles/toaster-raster-1.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function timelineFixture(topology = "linear") {
  const artifact = generation.createVisualScore({
    seed: `issue-16-production-filter-${topology}`,
    constraints,
    overrides: { topology, temporalDensity: "section" },
  });
  return generation.resolve(analysis, artifact.score, constraints, profile);
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
  assert.match(compiled.graph, /\[stage0\]hue=/);
  assert.match(compiled.graph, /\[timelineFinal\]ass=/);
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
