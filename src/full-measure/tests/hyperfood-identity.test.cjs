const test = require("node:test");
const assert = require("node:assert/strict");
const {
  specimenId,
  canonicalSpecimenJson,
} = require("../src/hyperfood/identity.cjs");
const {
  HYPERFOOD_SPEC_SCHEMA,
} = require("../src/hyperfood/schema.cjs");

function baseSpec(path, events) {
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism: { id: "PULSE", version: "0.1.0" },
    assets: [{
      id: "primary",
      mediaType: "image/png",
      sha256: "a".repeat(64),
      byteLength: 10,
      path,
    }],
    inputs: {
      surface: { asset: "primary" },
      events: { timingField: "events" },
    },
    timing: { durationMs: 1000, events },
    parameters: { attackMs: 20, decayMs: 100, scaleAmount: 0.1 },
    seed: 7,
    target: { width: 640, height: 360, fps: 30, alpha: false },
  };
}

test("path and authoring-order changes do not change HyperFood specimen identity", () => {
  const a = baseSpec("C:/one.png", [
    { tMs: 500, strength: 0.2 },
    { tMs: 0, strength: 1 },
  ]);
  const b = baseSpec("D:/renamed.png", [
    { tMs: 0, strength: 1 },
    { tMs: 500, strength: 0.2 },
  ]);
  assert.equal(specimenId(a), specimenId(b));
  assert.equal(canonicalSpecimenJson(a), canonicalSpecimenJson(b));
});

test("one semantic parameter delta changes specimen identity", () => {
  const a = baseSpec("x", [{ tMs: 0, strength: 1 }]);
  const b = structuredClone(a);
  b.parameters.scaleAmount = 0.11;
  assert.notEqual(specimenId(a), specimenId(b));
});

test("specimen IDs are domain separated hf0 addresses", () => {
  assert.match(specimenId(baseSpec("x", [])), /^hf0_[0-9a-f]{64}$/);
});
