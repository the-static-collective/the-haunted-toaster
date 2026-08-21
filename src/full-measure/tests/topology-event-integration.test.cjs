const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const { compileTimelineFilterGraph } = require("../src/render/timeline-filter.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const constraints = readJson("constraints/wire-orchard.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

const grabRequest = Object.freeze({
  id: "grab-integration-1",
  kind: "grab",
  prepareTick: 3000,
  strikeTick: 4000,
  releaseTick: 5000,
  residueUntilTick: 7000,
  parameters: Object.freeze({
    anchorX: 0.25,
    anchorY: 0.5,
    targetX: 0.75,
    targetY: 0.45,
    radiusX: 0.22,
    radiusY: 0.18,
    pull: 0.8,
    recoil: 0.55,
    falloff: 0.7,
    residualVectorX: 0.08,
    residualVectorY: -0.03,
    residualStretch: 0.06,
  }),
  evidenceRefs: Object.freeze(["fixture:grab-integration-1"]),
});

function productionLikeGraph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]ass=filename='topology-grab.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

test("accepted CandidateFamily → ResolvedTimeline → production compiler carries one GRAB through the shared seam", () => {
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "topology-event-integration-v0.1",
    count: 6,
  });
  const candidate = family.candidates.find((item) => item.timeline.baseState.topology !== "linear") || family.candidates[0];
  const historicalExecution = createTimelineExecution(candidate.timeline);
  const accepted = generation.resolveTopologyEvents(candidate.timeline, {
    family,
    candidateIndex: candidate.index,
    events: [grabRequest],
  });
  const execution = createTimelineExecution(accepted);
  const compiled = compileTimelineFilterGraph(productionLikeGraph(), execution);

  assert.equal(accepted.baseState.topology, candidate.timeline.baseState.topology);
  assert.equal(accepted.scoreAddress, candidate.scoreAddress);
  assert.notEqual(accepted.timelineHash, candidate.timeline.timelineHash);
  assert.equal(compiled.topology, candidate.timeline.baseState.topology);
  assert.equal(compiled.topologyEvents.policyVersion, "topology-events-v0.1");
  assert.equal(compiled.topologyEvents.planSha256, accepted.topologyEvents.planSha256);
  assert.deepEqual(compiled.topologyEvents.renderedKinds, ["grab"]);
  assert.match(compiled.graph, /\[waveFull\]split=3\[grabTopologyBase\]/);
  assert.match(compiled.graph, /\[grabOuterSource\]crop=/);
  assert.match(compiled.graph, /\[grabInnerSource\]crop=/);
  assert.match(compiled.graph, /\[base\]\[grabTopologyFinal\]overlay=/);
  assert.deepEqual(
    execution.segments.map(({ startTick, endTick }) => [startTick, endTick]),
    historicalExecution.segments.map(({ startTick, endTick }) => [startTick, endTick]),
  );
});

test("the same accepted timeline without a topology event remains graph-compatible", () => {
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "topology-event-no-plan-v0.1",
    count: 1,
  });
  const candidate = family.candidates[0];
  const execution = createTimelineExecution(candidate.timeline);
  const compiled = compileTimelineFilterGraph(productionLikeGraph(), execution);

  assert.equal(compiled.topologyEvents, undefined);
  assert.doesNotMatch(compiled.graph, /grabTopology|grabOuter|grabInner/);
});
