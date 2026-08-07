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

function timelineFixture() {
  const artifact = generation.createVisualScore({
    seed: "issue-16-production-filter",
    constraints,
    overrides: { topology: "linear", temporalDensity: "section" },
  });
  return generation.resolve(analysis, artifact.score, constraints, profile);
}

test("timeline execution segments drive production filter compilation", () => {
  const timeline = timelineFixture();
  const execution = createTimelineExecution(timeline);
  const base = "[stage0]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]";
  const compiled = compileTimelineFilterGraph(base, execution);

  assert.equal(compiled.segments.length, execution.segments.length);
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

test("production compilation is deterministic and read-only", () => {
  const timeline = timelineFixture();
  const before = generation.canonicalStringify(timeline);
  const execution = createTimelineExecution(timeline);
  const base = "[stage0]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]";

  const first = compileTimelineFilterGraph(base, execution);
  const second = compileTimelineFilterGraph(base, execution);

  assert.deepEqual(first, second);
  assert.equal(generation.canonicalStringify(timeline), before);
});

test("renderer values come from canonical timeline state", () => {
  const timeline = timelineFixture();
  const execution = createTimelineExecution(timeline);
  const first = execution.segments[0];
  const changed = structuredClone(first.state);
  changed.palette.contrastBias = Math.max(-1, Math.min(1, changed.palette.contrastBias + 0.25));

  assert.notDeepEqual(rendererValues(changed), rendererValues(first.state));
});