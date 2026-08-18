const test = require("node:test");
const assert = require("node:assert/strict");

const { PRESETS, getPreset } = require("../src/render/presets.cjs");

test("known render presets retain their exact declared identity", () => {
  for (const [presetId, preset] of Object.entries(PRESETS)) {
    assert.equal(getPreset(presetId), preset);
  }
});

test("unknown render preset refuses instead of silently becoming Porchlight", () => {
  assert.throws(
    () => getPreset("not-a-real-preset"),
    /Unknown render preset: not-a-real-preset/,
  );
});

test("missing render preset refuses instead of silently becoming Porchlight", () => {
  assert.throws(
    () => getPreset(),
    /Unknown render preset: undefined/,
  );
});
