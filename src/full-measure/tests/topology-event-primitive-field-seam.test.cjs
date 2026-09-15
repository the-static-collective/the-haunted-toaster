const test = require("node:test");
const assert = require("node:assert/strict");

const { compileGrabSeam } = require("../src/render/topology-event-seam.cjs");

function compiledGrab() {
  return {
    localDeformation: {
      kind: "grab",
      anchorX: 0.5,
      anchorY: 0.5,
      radiusX: 0.2,
      radiusY: 0.18,
      falloff: 0.7,
      expressions: {
        vectorX: "0",
        vectorY: "0",
        stretch: "0",
        enable: "1",
      },
    },
  };
}

test("GRAB seam can target the current primitive-field carrier without falling back to waveFull", () => {
  const graph = compileGrabSeam(
    compiledGrab(),
    { width: 1920, height: 1080 },
    "primitiveField",
  );

  assert.match(graph, /^\[primitiveField\]split=3/);
  assert.doesNotMatch(graph, /^\[waveFull\]split=3/);
});
