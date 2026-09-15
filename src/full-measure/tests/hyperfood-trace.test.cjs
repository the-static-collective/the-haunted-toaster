const test = require("node:test");
const assert = require("node:assert/strict");
const {
  HYPERFOOD_TRACE_SCHEMA,
  evaluateHyperFoodTrace,
} = require("../src/hyperfood/trace.cjs");
const {
  HYPERFOOD_SPEC_SCHEMA,
} = require("../src/hyperfood/schema.cjs");

const IMAGE_SHA = "a".repeat(64);
const FONT_SHA = "b".repeat(64);

function imageAsset() {
  return {
    id: "primary",
    mediaType: "image/png",
    sha256: IMAGE_SHA,
    byteLength: 10,
  };
}

function pulseSpec(scaleAmount = 0.1) {
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism: { id: "PULSE", version: "0.1.0" },
    assets: [imageAsset()],
    inputs: {
      surface: { asset: "primary" },
      events: { timingField: "events" },
    },
    timing: {
      durationMs: 500,
      events: [{ tMs: 100, strength: 1 }],
    },
    parameters: {
      attackMs: 100,
      holdMs: 50,
      decayMs: 100,
      scaleAmount,
    },
    seed: 7,
    target: { width: 640, height: 360, fps: 30, alpha: false },
  };
}

function ghostSpec() {
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism: { id: "GHOST-TEXT", version: "0.1.0" },
    assets: [{
      id: "font",
      mediaType: "font/woff2",
      sha256: FONT_SHA,
      byteLength: 20,
    }],
    inputs: {
      cues: { timingField: "cues" },
      font: { asset: "font" },
    },
    timing: {
      durationMs: 1000,
      cues: [{ text: "KEEP THE TRACE", startMs: 100, clearMs: 800 }],
    },
    parameters: {
      ghostCount: 2,
      ghostIntervalMs: 100,
      ghostLifetimeMs: 300,
      xDriftPx: 20,
      yDriftPx: 10,
      scaleDrift: 0.2,
      rotationDriftDeg: 12,
      blurGrowthPx: 4,
      opacityDecay: 0.8,
    },
    seed: 11,
    target: { width: 640, height: 360, fps: 30, alpha: true },
  };
}

function frameEatFrameSpec() {
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism: { id: "FRAME-EAT-FRAME", version: "0.1.0" },
    assets: [imageAsset()],
    inputs: { surface: { asset: "primary" } },
    timing: { durationMs: 500 },
    parameters: {
      depth: 3,
      stepMs: 100,
      scalePerDepth: 0.8,
      rotationPerDepthDeg: 10,
      cropPerDepth: 0.1,
      pivotX: 0.5,
      pivotY: 0.5,
      opacityPerDepth: 0.8,
      staggerMs: 100,
      entryOrder: "outer-first",
      exitOrder: "inner-first",
    },
    seed: 13,
    target: { width: 640, height: 360, fps: 30, alpha: false },
  };
}

test("PULSE trace resolves the exact attack-hold-decay envelope at canonical witness times", () => {
  const trace = evaluateHyperFoodTrace(pulseSpec(), [350, 100, 200, 150, 250, 300, 100]);
  assert.equal(trace.schema, HYPERFOOD_TRACE_SCHEMA);
  assert.equal(trace.organism, "PULSE@0.1.0");
  assert.deepEqual(trace.witnessTimesMs, [100, 150, 200, 250, 300, 350]);
  assert.deepEqual(trace.states.map((state) => state.envelope), [0, 0.5, 1, 1, 0.5, 0]);
  assert.deepEqual(trace.states.map((state) => state.scale), [1, 1.05, 1.1, 1.1, 1.05, 1]);
});

test("PULSE parameter mutation changes the intended channel without changing event envelope", () => {
  const a = evaluateHyperFoodTrace(pulseSpec(0.1), [200]);
  const b = evaluateHyperFoodTrace(pulseSpec(0.2), [200]);
  assert.equal(a.states[0].envelope, b.states[0].envelope);
  assert.equal(a.states[0].scale, 1.1);
  assert.equal(b.states[0].scale, 1.2);
});

test("GHOST-TEXT residue births and age-governed state are deterministic", () => {
  const first = evaluateHyperFoodTrace(ghostSpec(), [50, 150, 250, 450]);
  const second = evaluateHyperFoodTrace(structuredClone(ghostSpec()), [50, 150, 250, 450]);
  assert.deepEqual(first, second);
  assert.equal(first.states[0].residues.length, 0);
  assert.deepEqual(first.states[1].residues.map((r) => [r.residueIndex, r.birthMs, r.ageMs]), [
    [0, 100, 50],
  ]);
  assert.deepEqual(first.states[2].residues.map((r) => [r.residueIndex, r.birthMs, r.ageMs]), [
    [0, 100, 150],
    [1, 200, 50],
  ]);
  assert.equal(first.states[3].residues.length, 1);
  assert.equal(first.states[3].residues[0].residueIndex, 1);
});

test("FRAME-EAT-FRAME trace is structural recursion with deterministic level activation", () => {
  const trace = evaluateHyperFoodTrace(frameEatFrameSpec(), [50, 150, 250]);
  assert.deepEqual(trace.states.map((state) => state.levels.length), [1, 2, 3]);
  assert.equal(trace.states[0].levels[0].entryProgress, 0.5);
  assert.equal(trace.states[1].levels[0].entryProgress, 1);
  assert.equal(trace.states[1].levels[1].entryProgress, 0.5);
  assert.deepEqual(trace.states[2].levels.map((level) => level.level), [1, 2, 3]);
  assert.equal(trace.states[2].levels[2].scale, 0.512);
});

test("Slice A trace refuses graph composition rather than inventing renderer semantics", () => {
  const spec = pulseSpec();
  delete spec.organism;
  delete spec.inputs;
  delete spec.parameters;
  spec.graph = {
    nodes: [
      { id: "asset", op: "ASSET", version: "0.1.0", outputType: "Surface", assetId: "primary" },
      { id: "events", op: "EVENT-GRID", version: "0.1.0", field: "events" },
      { id: "pulse", op: "PULSE", version: "0.1.0", parameters: { attackMs: 100, holdMs: 50, decayMs: 100, scaleAmount: 0.1 } },
    ],
    edges: [
      { from: "asset.surface", to: "pulse.surface" },
      { from: "events.events", to: "pulse.events" },
    ],
    output: "pulse.surface",
  };
  assert.throws(() => evaluateHyperFoodTrace(spec, [100]), /graph.*slice a|slice a.*graph/i);
});
