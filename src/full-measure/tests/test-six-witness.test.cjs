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

const EXPECTED_SLOTS = [
  ["big-grab", "BIG GRAB", "guaranteed-grab"],
  ["tight-grab", "TIGHT GRAB", "guaranteed-grab"],
  ["wide-grab", "WIDE GRAB", "guaranteed-grab"],
  ["scar", "SCAR", "guaranteed-scar"],
  ["succession", "SUCCESSION", "guaranteed-succession"],
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

test("the three GRAB fixtures are guaranteed, regional, and materially distinct parameter profiles", () => {
  const family = makeFamily();
  const grabs = family.candidates.slice(0, 3);

  for (const candidate of grabs) {
    const events = candidate.timeline.topologyEvents?.events || [];
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, "grab");
    assert.equal(candidate.forcedCondition, "guaranteed-grab");
    assert.ok(events[0].parameters.radiusX < 0.7, "GRAB must stay regional rather than whole-frame");
    assert.ok(events[0].parameters.radiusY < 0.7, "GRAB must stay regional rather than whole-frame");
    assert.ok(events[0].residueUntilTick > events[0].releaseTick, "GRAB must leave residual consequence");
  }

  const [big, tight, wide] = grabs.map((candidate) => candidate.timeline.topologyEvents.events[0].parameters);
  assert.ok(big.pull > tight.pull, "BIG GRAB should pull harder than TIGHT GRAB");
  assert.ok(tight.radiusX < big.radiusX && tight.radiusY < big.radiusY, "TIGHT GRAB should be the smallest locality");
  assert.ok(wide.radiusX > big.radiusX && wide.radiusY > tight.radiusY, "WIDE GRAB should affect the broadest bounded region");
});

test("SCAR and SUCCESSION force existing Topology Arc outcomes rather than inventing event kinds", () => {
  const family = makeFamily();
  const scar = family.candidates[3];
  const succession = family.candidates[4];

  assert.equal(scar.timeline.topologyEvents?.eventCount || 0, 0);
  assert.equal(succession.timeline.topologyEvents?.eventCount || 0, 0);
  assert.ok(scar.timeline.topologyArc?.windows?.some((window) => window.outcome === "scar"));
  assert.ok(succession.timeline.topologyArc?.windows?.some((window) => window.outcome === "succession"));
  assert.ok(
    scar.timeline.topologyArc.windows.some((window) => window.outcome === "scar" && window.scar),
    "SCAR fixture must carry residue/scar evidence",
  );
});

test("KITCHEN SINK combines existing lawful layers and forces the bounded Resolution Field lane", () => {
  const family = makeFamily();
  const sink = family.candidates[5];

  assert.equal(sink.timeline.topologyEvents?.events?.[0]?.kind, "grab");
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
