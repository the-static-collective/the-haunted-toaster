const test = require("node:test");
const assert = require("node:assert/strict");
const render = require("../src/render/render.cjs");

const SAMPLE_GRAPH = [
  "[timelineFinal]fps=fps=24000/1001:round=down,fps=fps=30/1:round=down[cadencedField]",
  "[cadencedField]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]",
].join(";\n");

test("resolved production exposes an explicit Witness Window compiler boundary", () => {
  assert.equal(typeof render.applyWitnessWindowToGraph, "function");

  const result = render.applyWitnessWindowToGraph(SAMPLE_GRAPH, {
    width: 1920,
    height: 1080,
    pixelFormat: "yuv420p",
  });

  assert.match(result.graph, /\[cadencedField\]ass=.*\[preWitnessWindow\]/);
  assert.match(
    result.graph,
    /\[preWitnessWindow\]setsar=1,format=yuv420p\[witnessWindow\]$/,
  );
  assert.equal(result.outputLabel, "witnessWindow");
  assert.deepEqual(result.evidence, {
    policyVersion: "witness-window-v1",
    width: 1920,
    height: 1080,
    sampleAspectRatio: "1:1",
    pixelFormat: "yuv420p",
    alphaPolicy: "flattened-none",
    observableVideoStreams: 1,
  });
});

test("Witness Window evidence is deterministic and refuses ambiguous output seams", () => {
  assert.equal(typeof render.applyWitnessWindowToGraph, "function");

  const first = render.applyWitnessWindowToGraph(SAMPLE_GRAPH, {
    width: 640,
    height: 360,
    pixelFormat: "yuv420p",
  });
  const second = render.applyWitnessWindowToGraph(SAMPLE_GRAPH, {
    width: 640,
    height: 360,
    pixelFormat: "yuv420p",
  });

  assert.deepEqual(first, second);
  assert.throws(
    () =>
      render.applyWitnessWindowToGraph(
        `${SAMPLE_GRAPH};\n[other]null[vout]`,
        { width: 640, height: 360, pixelFormat: "yuv420p" },
      ),
    /exactly one final video output seam/i,
  );
});
