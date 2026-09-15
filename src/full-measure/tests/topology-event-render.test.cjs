const test = require("node:test");
const assert = require("node:assert/strict");
const {
  compileTopologyEvents,
  sampleGrabEvent,
} = require("../src/render/topology-events.cjs");
const { applyTopologyEventSeam } = require("../src/render/topology-event-seam.cjs");

const event = Object.freeze({
  id: "grab-1",
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
  evidenceRefs: Object.freeze(["fixture:grab-1"]),
  eventSha256: "a".repeat(64),
});

function timeline() {
  return {
    timebase: 1000,
    durationTicks: 10000,
    baseState: { topology: "circle" },
    topologyEvents: {
      schema: "haunted-toaster/topology-event-plan/v0.1",
      policyVersion: "topology-events-v0.1",
      acceptedFamilyHash: "b".repeat(64),
      acceptedScoreAddress: `ht1_${"c".repeat(64)}`,
      sourceTimelineHash: "d".repeat(64),
      sourceTopology: "circle",
      lockedAxes: [],
      eventCount: 1,
      events: [event],
      refusal: null,
      planSha256: "e".repeat(64),
    },
  };
}

test("GRAB samples neutral → pull → recoil → residual → settle", () => {
  const before = sampleGrabEvent(event, 2500);
  const anticipation = sampleGrabEvent(event, 3500);
  const contact = sampleGrabEvent(event, 4000);
  const recoil = sampleGrabEvent(event, 4500);
  const residual = sampleGrabEvent(event, 6000);
  const settled = sampleGrabEvent(event, 7000);

  assert.deepEqual([before.vectorX, before.vectorY, before.stretch], [0, 0, 0]);
  assert.ok(Math.abs(anticipation.vectorX) < Math.abs(contact.vectorX));
  assert.ok(Math.abs(recoil.vectorX) < Math.abs(contact.vectorX));
  assert.notEqual(residual.vectorX, 0);
  assert.notEqual(residual.stretch, 0);
  assert.deepEqual([settled.vectorX, settled.vectorY, settled.stretch], [0, 0, 0]);
  assert.equal(contact.radiusX, event.parameters.radiusX);
  assert.equal(contact.radiusY, event.parameters.radiusY);
});

test("compiled event evidence exposes one local deformation recipe and no global transform", () => {
  const compiled = compileTopologyEvents(timeline());
  assert.equal(compiled.evidence.policyVersion, "topology-events-v0.1");
  assert.equal(compiled.evidence.eventCount, 1);
  assert.deepEqual(compiled.evidence.renderedKinds, ["grab"]);
  assert.equal(compiled.localDeformation.kind, "grab");
  assert.equal(compiled.localDeformation.radiusX, 0.22);
  assert.equal(compiled.localDeformation.radiusY, 0.18);
  assert.ok(compiled.localDeformation.expressions.vectorX.includes("t"));
  assert.ok(compiled.localDeformation.expressions.stretch.includes("t"));
  assert.equal("offsetX" in compiled.localDeformation, false);
  assert.equal("offsetY" in compiled.localDeformation, false);
  assert.equal("scale" in compiled.localDeformation, false);
  assert.doesNotMatch(JSON.stringify(compiled.localDeformation.expressions), /random|rand\(/i);
});

test("shared seam deforms only bounded topology patches before the base composite", () => {
  const source = [
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=white[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]null[vout]",
  ].join(";\n");
  const compiled = applyTopologyEventSeam(
    {
      graph: source,
      geometry: { width: 320, height: 180, fps: 12 },
      topology: "circle",
      topologyCompiler: "circle-v1",
    },
    { timeline: timeline() },
  );

  assert.match(compiled.graph, /\[waveFull\]split=3\[grabTopologyBase\]/);
  assert.match(compiled.graph, /\[grabOuterSource\]crop=/);
  assert.match(compiled.graph, /\[grabInnerSource\]crop=/);
  assert.match(compiled.graph, /scale=w='max\(2,trunc\(iw\*/);
  assert.match(compiled.graph, /\[base\]\[grabTopologyFinal\]overlay=0:0:shortest=1\[stage0\]/);
  assert.doesNotMatch(compiled.graph, /\[base\]scale=|\[base\]crop=/);
  assert.equal(compiled.topology, "circle");
  assert.equal(compiled.topologyEvents.planSha256, "e".repeat(64));
});

test("no event plan is byte-compatible and foreign topology is refused", () => {
  assert.equal(compileTopologyEvents({ baseState: { topology: "circle" } }), null);
  const historical = {
    graph: "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    geometry: { width: 320, height: 180, fps: 12 },
  };
  assert.equal(
    applyTopologyEventSeam(historical, { timeline: { baseState: { topology: "circle" } } }),
    historical,
  );

  const foreign = timeline();
  foreign.topologyEvents = { ...foreign.topologyEvents, sourceTopology: "spiral" };
  assert.throws(() => compileTopologyEvents(foreign), /sourceTopology.*base topology/i);
});
