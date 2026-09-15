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
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.topologyEvents), true);
});

test("stale CandidateFamily address fails before forged authority fields can be trusted", () => {
  const { family, candidate } = fixture();
  for (const mutate of [
    (clone) => { clone.locks = ["topology"]; },
    (clone) => { clone.roles[0] = "forged-role"; },
    (clone) => { clone.scoreAddresses[0] = `ht1_${"0".repeat(64)}`; },
    (clone) => { clone.timelineHashes[0] = "0".repeat(64); },
  ]) {
    const forged = structuredClone(family);
    mutate(forged);
    assert.throws(
      () => generation.resolveTopologyEvents(candidate.timeline, {
        family: forged,
        candidateIndex: candidate.index,
        events: [grabRequest],
      }),
      /CandidateFamily.*address|familyHash|canonical/i,
    );
  }
});

test("a canonically accepted topology lock attaches an addressed zero-event refusal", () => {
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

  assert.notEqual(after.timelineHash, candidate.timeline.timelineHash);
  assert.equal(after.topologyEvents.eventCount, 0);
  assert.equal(after.topologyEvents.refusal.reason, "topology-lock-prohibits-topology-events");
  assert.deepEqual(after.topologyEvents.lockedAxes, family.locks);
  assert.equal(after.topologyEvents.sourceTimelineHash, candidate.timeline.timelineHash);
});

test("caller cannot smuggle locks or source topology into the resolver", () => {
  const { family, candidate } = fixture();
  assert.throws(
    () => generation.resolveTopologyEvents(candidate.timeline, {
      family,
      candidateIndex: candidate.index,
      events: [grabRequest],
      locks: [],
    }),
    /unknown or missing fields/i,
  );
  assert.throws(
    () => generation.resolveTopologyEvents(candidate.timeline, {
      family,
      candidateIndex: candidate.index,
      events: [grabRequest],
      sourceTopology: "spiral",
    }),
    /unknown or missing fields/i,
  );
});

test("selected candidate and accepted timeline must remain the same addressed specimen", () => {
  const { family, candidate } = fixture();
  const other = family.candidates[1];
  assert.throws(
    () => generation.resolveTopologyEvents(other.timeline, {
      family,
      candidateIndex: candidate.index,
      events: [grabRequest],
    }),
    /scoreAddress.*selected candidate/i,
  );

  const foreignTopology = structuredClone(candidate.timeline);
  foreignTopology.baseState.topology = candidate.timeline.baseState.topology === "linear" ? "circle" : "linear";
  assert.throws(
    () => generation.resolveTopologyEvents(foreignTopology, {
      family,
      candidateIndex: candidate.index,
      events: [grabRequest],
    }),
    /base topology.*selected candidate/i,
  );
});

test("event order and evidence refs normalize deterministically", () => {
  const { family, candidate } = fixture();
  const later = structuredClone(grabRequest);
  later.id = "grab-z";
  later.prepareTick = 8000;
  later.strikeTick = 9000;
  later.releaseTick = 9500;
  later.residueUntilTick = 11000;
  const earlier = structuredClone(grabRequest);
  earlier.id = "grab-a";
  earlier.evidenceRefs = ["fixture:z", "fixture:a", "fixture:z"];

  const timeline = generation.resolveTopologyEvents(candidate.timeline, {
    family,
    candidateIndex: candidate.index,
    events: [later, earlier],
  });
  assert.deepEqual(timeline.topologyEvents.events.map((event) => event.id), ["grab-a", "grab-z"]);
  assert.deepEqual(timeline.topologyEvents.events[0].evidenceRefs, ["fixture:a", "fixture:z"]);
});

test("candidate-level topology event authority carrier admits the exact birth timeline", () => {
  assert.equal(
    typeof generation.issueTopologyEventAuthority,
    "function",
    "candidate birth must expose an authority issuer",
  );
  assert.equal(
    typeof generation.verifyTopologyEventAuthority,
    "function",
    "topology execution must expose a carrier verifier",
  );

  const { family, candidate } = fixture();
  const authority = generation.issueTopologyEventAuthority(family, candidate.index);
  const verified = generation.verifyTopologyEventAuthority(authority);

  assert.equal(authority.schema, "haunted-toaster/topology-event-authority/v1");
  assert.equal(authority.birthFamilyHash, family.familyHash);
  assert.equal(authority.candidateIndex, candidate.index);
  assert.equal(authority.scoreAddress, candidate.scoreAddress);
  assert.equal(authority.sourceTimelineHash, candidate.timeline.timelineHash);
  assert.equal(authority.sourceTopology, candidate.timeline.baseState.topology);
  assert.deepEqual(authority.lockedAxes, family.locks);
  assert.equal(verified.authoritySha256, authority.authoritySha256);
  assert.equal(Object.isFrozen(authority), true);

  const after = generation.resolveTopologyEvents(candidate.timeline, {
    authority,
    events: [grabRequest],
  });
  assert.equal(after.topologyEvents.acceptedAuthoritySha256, authority.authoritySha256);
  assert.equal(after.topologyEvents.acceptedFamilyHash, family.familyHash);
  assert.equal(after.topologyEvents.acceptedScoreAddress, candidate.scoreAddress);
  assert.equal(after.topologyEvents.sourceTimelineHash, candidate.timeline.timelineHash);
});

test("topology event authority carrier refuses tampered birth facts", () => {
  assert.equal(typeof generation.issueTopologyEventAuthority, "function");
  assert.equal(typeof generation.verifyTopologyEventAuthority, "function");

  const { family, candidate } = fixture();
  const authority = generation.issueTopologyEventAuthority(family, candidate.index);
  for (const mutate of [
    (clone) => { clone.birthFamilyHash = "0".repeat(64); },
    (clone) => { clone.candidateIndex += 1; },
    (clone) => { clone.scoreAddress = `ht1_${"0".repeat(64)}`; },
    (clone) => { clone.sourceTimelineHash = "0".repeat(64); },
    (clone) => { clone.lockedAxes = ["topology"]; },
    (clone) => { clone.authoritySha256 = "0".repeat(64); },
  ]) {
    const forged = structuredClone(authority);
    mutate(forged);
    assert.throws(
      () => generation.verifyTopologyEventAuthority(forged),
      /authority|hash|birth|candidate|score|timeline|lock/i,
    );
  }
});
