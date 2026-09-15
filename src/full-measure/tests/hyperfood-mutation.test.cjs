const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyHyperFoodDelta,
  reconstructHyperFoodMutation,
} = require("../src/hyperfood/mutation.cjs");
const {
  HYPERFOOD_SPEC_SCHEMA,
} = require("../src/hyperfood/schema.cjs");
const {
  specimenId,
} = require("../src/hyperfood/identity.cjs");

function baseSpec() {
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism: { id: "PULSE", version: "0.1.0" },
    assets: [{
      id: "primary",
      mediaType: "image/png",
      sha256: "a".repeat(64),
      byteLength: 10,
    }],
    inputs: {
      surface: { asset: "primary" },
      events: { timingField: "events" },
    },
    timing: {
      durationMs: 1000,
      events: [{ tMs: 0, strength: 1 }],
    },
    parameters: { attackMs: 20, decayMs: 100, scaleAmount: 0.1 },
    seed: 7,
    target: { width: 640, height: 360, fps: 30, alpha: false },
  };
}

test("one-field mutation reconstructs the declared child specimen exactly", () => {
  const parent = baseSpec();
  const delta = [{ op: "replace", path: "/parameters/scaleAmount", value: 0.25 }];
  const child = applyHyperFoodDelta(parent, delta);
  const expectedChildId = specimenId(child);
  const proof = reconstructHyperFoodMutation({ parentSpec: parent, delta, expectedChildId });

  assert.equal(child.parameters.scaleAmount, 0.25);
  assert.equal(proof.parentSpecimenId, specimenId(parent));
  assert.equal(proof.childSpecimenId, expectedChildId);
  assert.deepEqual(proof.childSpec, child);
  assert.deepEqual(proof.delta, delta);
});

test("mutation refuses unstable array-index paths", () => {
  assert.throws(
    () => applyHyperFoodDelta(baseSpec(), [
      { op: "replace", path: "/timing/events/0/strength", value: 0.5 },
    ]),
    /array index|unstable/i,
  );
});

test("mutation proof refuses a child identity that reconstruction does not produce", () => {
  assert.throws(
    () => reconstructHyperFoodMutation({
      parentSpec: baseSpec(),
      delta: [{ op: "replace", path: "/parameters/scaleAmount", value: 0.25 }],
      expectedChildId: `hf0_${"f".repeat(64)}`,
    }),
    /child specimen/i,
  );
});
