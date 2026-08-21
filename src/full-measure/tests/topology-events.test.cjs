const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const constraints = readJson("constraints/wire-orchard.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function fixture(overrides = {}) {
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "topology-events-grab-v0.1",
    count: 2,
    ...overrides,
  });
  return { family, candidate: family.candidates[0] };
}

const grabRequest = {
  id: "grab-1",
  kind: "grab",
  prepareTick: 3000,
  strikeTick: 4000,
  releaseTick: 5000,
  residueUntilTick: 7000,
  parameters: {
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
  },
  evidenceRefs: ["fixture:grab-1"],
};

test("topology events freeze the four-verb v0.1 contract", () => {
  assert.equal(generation.TOPOLOGY_EVENT_POLICY, "topology-events-v0.1");
  assert.equal(
    generation.TOPOLOGY_EVENT_PLAN_SCHEMA,
    "haunted-toaster/topology-event-plan/v0.1",
  );
  assert.deepEqual(generation.TOPOLOGY_EVENT_KINDS, ["aperture", "speak", "grab", "grow"]);
});

test("GRAB attaches deterministic addressed evidence without changing score or base topology identity", () => {
  const { family, candidate } = fixture();
  const first = generation.resolveTopologyEvents(candidate.timeline, {
    family,
    candidateIndex: candidate.index,
    events: [grabRequest],
  });
  const second = generation.resolveTopologyEvents(candidate.timeline, {
    family,
    candidateIndex: candidate.index,
    events: [structuredClone(grabRequest)],
  });

  assert.equal(first.scoreAddress, candidate.scoreAddress);
  assert.equal(first.baseState.topology, candidate.timeline.baseState.topology);
  assert.equal(first.topologyEvents.acceptedFamilyHash, family.familyHash);
  assert.equal(first.topologyEvents.acceptedScoreAddress, candidate.scoreAddress);
  assert.equal(first.topologyEvents.sourceTimelineHash, candidate.timeline.timelineHash);
  assert.equal(first.topologyEvents.sourceTopology, candidate.timeline.baseState.topology);
  assert.equal(first.topologyEvents.eventCount, 1);
  assert.equal(first.topologyEvents.events[0].kind, "grab");
  assert.notEqual(first.timelineHash, candidate.timeline.timelineHash);
  assert.equal(first.timelineHash, second.timelineHash);
  assert.equal(first.topologyEvents.planSha256, second.topologyEvents.planSha256);
  assert.match(first.canonicalJson, /topologyEvents/);
});

test("stale CandidateFamily address fails before forged locks can be trusted", () => {
  const parent = generation.createVisualScore({
    seed: "topology-events-locked-parent",
    constraints,
    overrides: { topology: "circle" },
  });
  const { family, candidate } = fixture({ parentScore: parent, locks: ["topology"] });
  const forged = structuredClone(family);
  forged.locks = [];

  assert.throws(
    () => generation.resolveTopologyEvents(candidate.timeline, {
      family: forged,
      candidateIndex: candidate.index,
      events: [grabRequest],
    }),
    /CandidateFamily.*address|familyHash|canonical/i,
  );
});

test("a canonically accepted topology lock refuses topology events", () => {
  const parent = generation.createVisualScore({
    seed: "topology-events-refusal-parent",
    constraints,
    overrides: { topology: "circle" },
  });
  const { family, candidate } = fixture({ parentScore: parent, locks: ["topology"] });
  const after = generation.resolveTopologyEvents(candidate.timeline, {
    family,
    candidateIndex: candidate.index,
    events: [grabRequest],
  });

  assert.equal(after.timelineHash, candidate.timeline.timelineHash);
  assert.equal(after.topologyEvents, undefined);
  assert.equal(after.topologyEventRefusal.reason, "topology-lock-prohibits-topology-events");
  assert.deepEqual(after.topologyEventRefusal.lockedAxes, family.locks);
});
