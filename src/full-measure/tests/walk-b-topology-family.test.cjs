const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const { compileTopologyEvents } = require("../src/render/topology-events.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const constraints = readJson("constraints/wire-orchard.v3.json");
const profile = readJson("profiles/toaster-raster-4.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function fixture(rootSeed = "walk-b-topology-family") {
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed,
    count: 2,
  });
  return { family, candidate: family.candidates[0] };
}

function event(kind, id, prepareTick, strikeTick, releaseTick, residueUntilTick, parameters) {
  return {
    id,
    kind,
    prepareTick,
    strikeTick,
    releaseTick,
    residueUntilTick,
    parameters,
    evidenceRefs: [`fixture:${id}`],
  };
}

const aperture = event("aperture", "aperture-1", 1000, 1800, 2600, 3400, {
  anchorX: 0.48,
  anchorY: 0.42,
  radiusX: 0.24,
  radiusY: 0.22,
  focus: 0.82,
  peripheralCompression: 0.34,
  orbit: 0.18,
});

const speak = event("speak", "speak-1", 3500, 4200, 5000, 5900, {
  anchorX: 0.52,
  anchorY: 0.54,
  radiusX: 0.28,
  radiusY: 0.14,
  seamWidth: 0.18,
  emission: 0.72,
  residue: 0.31,
});

const grab = event("grab", "grab-1", 6000, 6700, 7400, 8300, {
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
});

const grow = event("grow", "grow-1", 8400, 9000, 9600, 11000, {
  anchorX: 0.58,
  anchorY: 0.46,
  radiusX: 0.18,
  radiusY: 0.2,
  branchCount: 3,
  growth: 0.76,
  persistence: 0.68,
  ageBias: 0.42,
});

function resolve(events, rootSeed) {
  const { family, candidate } = fixture(rootSeed);
  return generation.resolveTopologyEvents(candidate.timeline, {
    family,
    candidateIndex: candidate.index,
    events,
  });
}

for (const [kind, specimen] of [
  ["aperture", aperture],
  ["speak", speak],
  ["grow", grow],
]) {
  test(`${kind.toUpperCase()} is a native deterministic primitive with addressed evidence`, () => {
    const first = resolve([specimen], `walk-b-${kind}`);
    const second = resolve([structuredClone(specimen)], `walk-b-${kind}`);

    assert.equal(first.topologyEvents.refusal, null);
    assert.equal(first.topologyEvents.eventCount, 1);
    assert.equal(first.topologyEvents.events[0].kind, kind);
    assert.match(first.topologyEvents.events[0].eventSha256, /^[0-9a-f]{64}$/);
    assert.equal(first.timelineHash, second.timelineHash);
    assert.equal(first.topologyEvents.planSha256, second.topologyEvents.planSha256);

    const compiled = compileTopologyEvents(first);
    assert.equal(compiled.evidence.eventCount, 1);
    assert.deepEqual(compiled.evidence.renderedKinds, [kind]);
    assert.equal(compiled.effects.length, 1);
    assert.equal(compiled.effects[0].kind, kind);
    assert.deepEqual(compiled.effects[0].phases, ["prepare", "strike", "release", "residue"]);
  });
}

test("BODY is choreography over APERTURE → SPEAK → GRAB → GROW, never a fifth event kind", () => {
  assert.deepEqual(generation.TOPOLOGY_EVENT_KINDS, ["aperture", "speak", "grab", "grow"]);
  assert.equal(generation.TOPOLOGY_EVENT_KINDS.includes("body"), false);

  const first = resolve([grow, grab, aperture, speak], "walk-b-body");
  const second = resolve([aperture, speak, grab, grow], "walk-b-body");

  assert.equal(first.topologyEvents.eventCount, 4);
  assert.deepEqual(
    first.topologyEvents.events.map((entry) => entry.kind),
    ["aperture", "speak", "grab", "grow"],
  );
  assert.equal(first.timelineHash, second.timelineHash);
  assert.equal(first.topologyEvents.planSha256, second.topologyEvents.planSha256);

  const compiled = compileTopologyEvents(first);
  assert.deepEqual(compiled.evidence.renderedKinds, ["aperture", "speak", "grab", "grow"]);
  assert.deepEqual(compiled.effects.map((entry) => entry.kind), ["aperture", "speak", "grab", "grow"]);
  assert.equal(compiled.effects.some((entry) => entry.kind === "body"), false);
});

test("GROW makes surviving ancestry and age ordering mechanically inspectable", () => {
  const timeline = resolve([grow], "walk-b-grow-age");
  const compiled = compileTopologyEvents(timeline);
  const effect = compiled.effects[0];

  assert.equal(effect.kind, "grow");
  assert.ok(effect.persistence > 0);
  assert.ok(Array.isArray(effect.ageLayers));
  assert.ok(effect.ageLayers.length >= 2);
  for (let index = 1; index < effect.ageLayers.length; index += 1) {
    assert.ok(effect.ageLayers[index].age > effect.ageLayers[index - 1].age);
  }
});

test("walking TEST 6 summons exactly APERTURE, SPEAK, GRAB, GROW, BODY, KITCHEN SINK", () => {
  const family = generation.generateTestSixWitnessFamily({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "walk-b-test-six",
  });

  assert.deepEqual(
    family.candidates.map((candidate) => candidate.fixtureLabel),
    ["APERTURE", "SPEAK", "GRAB", "GROW", "BODY", "KITCHEN SINK"],
  );
  assert.deepEqual(
    family.candidates.map((candidate) => candidate.fixtureSlot),
    ["aperture", "speak", "grab", "grow", "body", "kitchen-sink"],
  );

  const body = family.candidates[4];
  assert.deepEqual(
    body.timeline.topologyEvents.events.map((entry) => entry.kind),
    ["aperture", "speak", "grab", "grow"],
  );
  assert.equal(body.timeline.topologyEvents.events.some((entry) => entry.kind === "body"), false);

  const ordinary = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "walk-b-test-six-ordinary-control",
    count: 6,
  });
  assert.notEqual(family.schema, ordinary.schema);
  assert.notEqual(family.policy, ordinary.policy);
  assert.equal(family.forcedWitness, true);
});
