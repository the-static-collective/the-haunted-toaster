const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const constraints = readJson("constraints/wire-orchard.v3.json");
const profile = readJson("profiles/toaster-raster-4.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

const EXPECTED_SLOTS = [
  ["aperture", "APERTURE", "guaranteed-aperture"],
  ["speak", "SPEAK", "guaranteed-speak"],
  ["grab", "GRAB", "guaranteed-grab"],
  ["grow", "GROW", "guaranteed-grow"],
  ["body", "BODY", "guaranteed-body-choreography"],
  ["kitchen-sink", "KITCHEN SINK", "guaranteed-integration-stress"],
];

function makeFamily(rootSeed = "test-6-contract-v0") {
  return generation.generateTestSixWitnessFamily({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed,
  });
}

test("TEST 6 is a separate forced-witness family with six fixed fixture slots", () => {
  const family = makeFamily();

  assert.equal(family.schema, "haunted-toaster/test-six-family/v0");
  assert.equal(family.policy, "forced-witness-test-6-v0");
  assert.equal(family.forcedWitness, true);
  assert.equal(family.fixtureFamily, "test-6");
  assert.equal(family.requestedCount, 6);
  assert.equal(family.producedCount, 6);
  assert.equal(family.candidates.length, 6);

  assert.deepEqual(
    family.candidates.map((candidate) => [
      candidate.fixtureSlot,
      candidate.fixtureLabel,
      candidate.forcedCondition,
    ]),
    EXPECTED_SLOTS,
  );

  for (const candidate of family.candidates) {
    assert.equal(candidate.forcedWitness, true);
    assert.equal(candidate.fixtureFamily, "test-6");
    assert.match(candidate.role, /^test-6:/);
    assert.equal(candidate.timeline.timelineHash, candidate.timelineHash);
    assert.equal(candidate.timeline.scoreAddress, candidate.scoreAddress);
  }
});

test("APERTURE, SPEAK, GRAB, and GROW are guaranteed native one-event witnesses", () => {
  const family = makeFamily();
  const primitives = family.candidates.slice(0, 4);
  const expectedKinds = ["aperture", "speak", "grab", "grow"];

  assert.deepEqual(
    primitives.map((candidate) => candidate.timeline.topologyEvents?.events?.[0]?.kind),
    expectedKinds,
  );

  for (let index = 0; index < primitives.length; index += 1) {
    const candidate = primitives[index];
    const events = candidate.timeline.topologyEvents?.events || [];
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, expectedKinds[index]);
    assert.ok(events[0].residueUntilTick > events[0].releaseTick);
  }

  const grab = primitives[2].timeline.topologyEvents.events[0];
  assert.ok(grab.parameters.radiusX < 0.7, "GRAB must stay regional rather than whole-frame");
  assert.ok(grab.parameters.radiusY < 0.7, "GRAB must stay regional rather than whole-frame");
});

test("BODY is APERTURE → SPEAK → GRAB → GROW choreography and never a fifth event kind", () => {
  const family = makeFamily();
  const body = family.candidates[4];
  const events = body.timeline.topologyEvents?.events || [];

  assert.deepEqual(
    events.map((event) => event.kind),
    ["aperture", "speak", "grab", "grow"],
  );
  assert.equal(events.length, 4);
  assert.equal(events.some((event) => event.kind === "body"), false);
  assert.equal(generation.TOPOLOGY_EVENT_KINDS.includes("body"), false);

  for (let index = 1; index < events.length; index += 1) {
    assert.ok(
      events[index].prepareTick > events[index - 1].prepareTick,
      "BODY choreography must preserve ordered event envelopes",
    );
  }
});

test("KITCHEN SINK combines BODY choreography with existing lawful layers and bounded Resolution Field", () => {
  const family = makeFamily();
  const sink = family.candidates[5];
  const events = sink.timeline.topologyEvents?.events || [];

  assert.deepEqual(
    events.map((event) => event.kind),
    ["aperture", "speak", "grab", "grow"],
  );
  assert.equal(events.some((event) => event.kind === "body"), false);
  assert.ok(sink.timeline.topologyArc?.windowCount > 0);
  assert.ok(sink.timeline.atmosphere, "integration fixture must retain Atmosphere evidence");
  assert.deepEqual(sink.forcedRenderConfig, { atmosphereResolutionScale: 0.5 });
});

test("TEST 6 replay is exact for the same accepted inputs and fails to masquerade as ordinary ecology", () => {
  const first = makeFamily("test-6-replay-v0");
  const second = makeFamily("test-6-replay-v0");

  assert.equal(first.familyHash, second.familyHash);
  assert.deepEqual(first.timelineHashes, second.timelineHashes);
  assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
  assert.deepEqual(
    first.candidates.map((candidate) => candidate.fixtureReceipt),
    second.candidates.map((candidate) => candidate.fixtureReceipt),
  );

  assert.notEqual(first.schema, generation.CANDIDATE_FAMILY_SCHEMA);
  assert.notEqual(first.policy, generation.CANDIDATE_FAMILY_POLICY);
  assert.throws(
    () => generation.verifyCandidateFamilyAddress(first),
    /CandidateFamily v1 schema\/policy is required/i,
  );
});

test("ordinary GRAB preference is mild, explicit, and deterministic rather than a forced witness", () => {
  assert.deepEqual(generation.ORDINARY_GRAB_PREFERENCE, {
    policyVersion: "ordinary-grab-frequency-v0",
    numerator: 1,
    denominator: 4,
  });

  const decisions = Array.from({ length: 64 }, (_, index) =>
    generation.shouldPreferOrdinaryGrab({
      rootSeed: `ordinary-grab-seed-${index}`,
      slotIndex: index % 6,
    }),
  );
  const repeat = Array.from({ length: 64 }, (_, index) =>
    generation.shouldPreferOrdinaryGrab({
      rootSeed: `ordinary-grab-seed-${index}`,
      slotIndex: index % 6,
    }),
  );

  assert.deepEqual(decisions, repeat);
  const preferred = decisions.filter(Boolean).length;
  assert.ok(preferred >= 8, `expected a meaningful GRAB presence, got ${preferred}/64`);
  assert.ok(preferred <= 24, `ordinary GRAB preference must stay mild, got ${preferred}/64`);
});
