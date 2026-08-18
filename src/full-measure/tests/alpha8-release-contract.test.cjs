const test = require("node:test");
const assert = require("node:assert/strict");
const { deriveBuildCapabilities } = require("../src/build-capabilities.cjs");
const { TOAST_FEEL_CONTRACT, TOAST_FEELS } = require("../src/toast-feels.cjs");
const { NATIVE_COLOR_POLICY, RELATIONSHIPS } = require("../src/generation/native-color.cjs");
const { RENDER_FAILURE_EVIDENCE_SCHEMA } = require("../src/render/render-failure-evidence.cjs");
const { UI_WITNESS_POLICY } = require("../scripts/build-ui-witness.cjs");

test("alpha.9 preserves the alpha.8 release surfaces while advancing generation", () => {
  assert.equal(TOAST_FEEL_CONTRACT, "toast-feel-v2");
  assert.equal(TOAST_FEELS.length, 7);
  assert.equal(NATIVE_COLOR_POLICY, "native-color-witness-v1");
  assert.deepEqual(RELATIONSHIPS, ["echo", "counterpoint"]);
  assert.equal(RENDER_FAILURE_EVIDENCE_SCHEMA, "full-measure.render-failure.v1");
  assert.equal(UI_WITNESS_POLICY, "ui-witness-v1");
  const build = deriveBuildCapabilities();
  for (const capability of [
    "uiWitnessV1",
    "toastFeelV2",
    "mutationLatticeV1",
    "shapePackV1",
    "topologyArcV1",
    "nativeColorWitnessV1",
    "renderFailureEvidenceV1",
  ]) {
    assert.ok(build.capabilities.includes(capability), capability);
  }
});
