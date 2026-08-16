const test = require("node:test");
const assert = require("node:assert/strict");

const { dynamicsProgram } = require("../src/render/primitive-field.cjs");

test("magnetic dynamics never shrinks below the fixed crop", () => {
  const width = 1920;
  const height = 1080;
  const program = dynamicsProgram("magnetic", width, height);
  const dimensions = program.match(
    /scale=w='(\d+)\*\(0\.94\+0\.06\*sin\(t\*0\.83\)\)':h='(\d+)\*\(0\.94\+0\.06\*sin\(t\*0\.83\)\)'/,
  );

  assert.ok(dimensions, "magnetic program must expose its animated scale dimensions");

  const minimumScale = 0.94 - 0.06;
  const minimumWidth = Number(dimensions[1]) * minimumScale;
  const minimumHeight = Number(dimensions[2]) * minimumScale;

  assert.ok(
    minimumWidth >= width,
    `magnetic minimum width ${minimumWidth} must cover crop width ${width}`,
  );
  assert.ok(
    minimumHeight >= height,
    `magnetic minimum height ${minimumHeight} must cover crop height ${height}`,
  );
});
