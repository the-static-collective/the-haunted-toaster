const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ELASTIC_TOPOLOGY_POLICY,
  SOFT_OCCUPANCY_KNEE,
  compileTopologyResponse,
  piecewiseLinearExpression,
  projectResponseKnots,
} = require("../src/render/topology-response.cjs");

function responseTimeline(knots, { granularity = "transient" } = {}) {
  return {
    rendererPolicy: "visual-language-v3",
    timebase: 1000,
    durationTicks: Math.max(1000, knots.at(-1)?.atTick || 1000),
    nestedResponse: {
      policyVersion: "nested-response-contour-v1",
      granularity,
      knotCount: knots.length,
      knots,
      meterEvidenceUsed: false,
      idleMotionPolicyVersion: "topology-idle-v1",
      sourceWitnessSha256: "witness-proof",
      planSha256: "plan-proof",
    },
  };
}

function knot(atTick, overrides = {}) {
  return {
    atTick,
    sectionIndex: 0,
    macroEnergy: 0.5,
    localEnergy: 0.5,
    excursion: 0,
    slope: 0,
    direction: 0,
    ...overrides,
  };
}

test("soft occupancy law preserves headroom, permits true peak, and sheds sustained high area", () => {
  const projected = projectResponseKnots([
    knot(0, { macroEnergy: 0.5 }),
    knot(1000, { macroEnergy: 1, excursion: 0.08, slope: 0.08, direction: 1 }),
    knot(2000, { macroEnergy: 1 }),
    knot(3000, { macroEnergy: 1 }),
    knot(4000, { macroEnergy: 1 }),
  ]);

  assert.ok(projected[0].extent < 0.72);
  assert.equal(projected[1].extent, 1);
  assert.equal(projected[2].extent, 1);
  assert.ok(projected[3].extent < 1);
  assert.ok(projected[4].extent < projected[3].extent);
  assert.ok(projected[4].articulation > projected[2].articulation);
  assert.ok(projected[4].openness > projected[2].openness);
});

test("recoil is signed local response and silence keeps signal activity at zero", () => {
  const recoil = projectResponseKnots([
    knot(0, { macroEnergy: 0.45, excursion: -0.12, slope: -0.08, direction: -1 }),
  ])[0];
  assert.ok(recoil.recoil > 0);

  const silent = projectResponseKnots([
    knot(0, { macroEnergy: 0, localEnergy: 0, excursion: 0, slope: 0, direction: 0 }),
  ])[0];
  assert.equal(silent.extent, 0);
  assert.equal(silent.articulation, 0);
  assert.equal(silent.openness, 0);
  assert.equal(silent.recoil, 0);
});

test("compiled response records idle separately and leaves Linear at zero idle floor", () => {
  const timeline = responseTimeline([
    knot(0, { macroEnergy: 0 }),
    knot(1000, { macroEnergy: 0.6, excursion: 0.08, slope: 0.08, direction: 1 }),
  ]);
  const fan = compileTopologyResponse(timeline, "cathedral-fan");
  const linear = compileTopologyResponse(timeline, "linear");

  assert.equal(ELASTIC_TOPOLOGY_POLICY, "elastic-topology-response-v1");
  assert.equal(SOFT_OCCUPANCY_KNEE, 0.72);
  assert.equal(fan.evidence.idleMotionPolicyVersion, "topology-idle-v1");
  assert.equal(fan.evidence.idleFloor, 0.08);
  assert.equal(fan.expressions.idle, "0.08");
  assert.equal(linear.evidence.idleFloor, 0);
  assert.equal(linear.expressions.idle, "0");
  assert.notEqual(fan.expressions.extent, fan.expressions.articulation);
});

test("piecewise interpolation is deterministic and depends only on accepted knots", () => {
  const knots = [
    { atTick: 0, extent: 0.2 },
    { atTick: 1000, extent: 0.6 },
    { atTick: 2500, extent: 0.4 },
  ];
  const left = piecewiseLinearExpression(knots, "extent", 1000);
  const right = piecewiseLinearExpression(structuredClone(knots), "extent", 1000);
  assert.equal(left, right);
  assert.match(left, /\bt\b/);
  assert.match(left, /max\(0,min\(1,/);
});

test("signed phase and travel are deterministic without ambient entropy", () => {
  const timeline = responseTimeline([
    knot(0, { macroEnergy: 0.5, excursion: -0.1, slope: -0.08, direction: -1 }),
    knot(1000, { macroEnergy: 0.6, excursion: 0.12, slope: 0.1, direction: 1 }),
  ]);
  const left = compileTopologyResponse(timeline, "spiral");
  const right = compileTopologyResponse(structuredClone(timeline), "spiral");
  assert.deepEqual(left, right);
  assert.notEqual(left.expressions.phase, "0");
  assert.notEqual(left.expressions.travelX, "0");
  assert.notEqual(left.expressions.travelY, "0");
});
