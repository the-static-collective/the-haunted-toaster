const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveFieldEnvelope } = require("../src/render/field-envelope.cjs");

function state(overrides = {}) {
  return {
    topology: "mirrored-ring",
    motion: { amplitude: 1, variance: 0.8 },
    material: { texture: "gate-weave", imperfection: 1 },
    camera: { grammar: "orbit", variance: 0.9 },
    ...overrides,
  };
}

test("non-linear envelope reaches full 1080 height without becoming full bleed", () => {
  const resolved = resolveFieldEnvelope(state(), { width: 1920, height: 1080 });

  assert.equal(resolved.policy, "bounded-full-height-v1");
  assert.deepEqual(resolved.envelope, {
    x: 420,
    y: 0,
    width: 1080,
    height: 1080,
  });
  assert.ok(resolved.envelope.width < resolved.frame.width);
  assert.ok(resolved.safeExpansion.pixels > 0);
  assert.ok(resolved.working.height > resolved.frame.height);
});

test("same recorded state and frame replay the exact same envelope", () => {
  const first = resolveFieldEnvelope(state(), { width: 1920, height: 1080 });
  const replay = resolveFieldEnvelope(state(), { width: 1920, height: 1080 });

  assert.deepEqual(replay, first);
});

test("effect headroom grows from calm to aggressive recorded state", () => {
  const calm = resolveFieldEnvelope(state({
    motion: { amplitude: 0, variance: 0 },
    material: { texture: "clean", imperfection: 0 },
    camera: { grammar: "locked", variance: 0 },
  }), { width: 1920, height: 1080 });
  const aggressive = resolveFieldEnvelope(state(), { width: 1920, height: 1080 });

  assert.equal(calm.safeExpansion.rotationPixels, aggressive.safeExpansion.rotationPixels);
  assert.ok(aggressive.safeExpansion.displacementPixels > calm.safeExpansion.displacementPixels);
  assert.ok(aggressive.safeExpansion.pixels > calm.safeExpansion.pixels);
});

test("preview-sized frames use the same bounded full-height law", () => {
  const resolved = resolveFieldEnvelope(state(), { width: 480, height: 270 });

  assert.deepEqual(resolved.envelope, {
    x: 105,
    y: 0,
    width: 270,
    height: 270,
  });
  assert.equal(resolved.policy, "bounded-full-height-v1");
});

test("linear topology keeps the existing full-frame seam untouched", () => {
  const resolved = resolveFieldEnvelope(state({ topology: "linear" }), { width: 1920, height: 1080 });

  assert.equal(resolved.policy, "legacy-linear");
  assert.deepEqual(resolved.envelope, {
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  });
  assert.equal(resolved.safeExpansion.pixels, 0);
});
