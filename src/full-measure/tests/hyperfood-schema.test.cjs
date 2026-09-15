const test = require("node:test");
const assert = require("node:assert/strict");
const {
  HYPERFOOD_SPEC_SCHEMA,
  normalizeHyperFoodSpec,
} = require("../src/hyperfood/schema.cjs");

const SHA = "a".repeat(64);

function pulseSpec(overrides = {}) {
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism: { id: "PULSE", version: "0.1.0" },
    assets: [{
      id: "primary",
      mediaType: "image/png",
      sha256: SHA,
      byteLength: 12345,
      path: "C:/non-semantic/source.png",
      filename: "source.png",
    }],
    inputs: {
      surface: { asset: "primary" },
      events: { timingField: "events" },
    },
    timing: {
      durationMs: 4200,
      events: [
        { tMs: 981, strength: 0.65 },
        { tMs: 487, strength: 1 },
        { tMs: 487, strength: 0.4 },
        { tMs: 0, strength: 0.8 },
      ],
    },
    parameters: {
      attackMs: 40,
      holdMs: 0,
      decayMs: 180,
      scaleAmount: 0.08,
    },
    seed: 481516,
    target: { width: 1080, height: 1920, fps: 30, alpha: true },
    ...overrides,
  };
}

test("normalization removes path metadata and canonicalizes duplicate PULSE events", () => {
  const normalized = normalizeHyperFoodSpec(pulseSpec());
  assert.equal(normalized.assets[0].path, undefined);
  assert.equal(normalized.assets[0].filename, undefined);
  assert.deepEqual(normalized.timing.events, [
    { tMs: 0, strength: 0.8 },
    { tMs: 487, strength: 1 },
    { tMs: 981, strength: 0.65 },
  ]);
});

test("normalization refuses unsupported organism versions", () => {
  assert.throws(
    () => normalizeHyperFoodSpec(pulseSpec({ organism: { id: "PULSE", version: "9.9.9" } })),
    /unsupported hyperfood organism/i,
  );
});

test("normalization refuses unresolved single-organism input bindings", () => {
  const spec = pulseSpec();
  spec.inputs.surface = { asset: "missing" };
  assert.throws(() => normalizeHyperFoodSpec(spec), /input binding.*surface/i);
});

test("normalization refuses invalid event time and strength", () => {
  const negative = pulseSpec();
  negative.timing.events = [{ tMs: -1, strength: 1 }];
  assert.throws(() => normalizeHyperFoodSpec(negative), /event.*time/i);

  const strong = pulseSpec();
  strong.timing.events = [{ tMs: 1, strength: 1.1 }];
  assert.throws(() => normalizeHyperFoodSpec(strong), /strength/i);
});
