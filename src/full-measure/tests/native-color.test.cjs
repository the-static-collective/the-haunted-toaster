const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const {
  NATIVE_COLOR_POLICY,
  RELATIONSHIPS,
  nativeColorAtTick,
  resolveNativeColorPlan,
} = require("../src/generation/native-color.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const analysis = readJson("fixtures/analysis/sectional.v1.json");
const constraints = readJson("constraints/open-field.v1.json");
const expressive = readJson("profiles/toaster-raster-3.json");
const legacy = readJson("profiles/toaster-raster-2.json");
const profile = Object.freeze({
  sourceSha256: "1".repeat(64),
  profileSha256: "2".repeat(64),
  hueCentroidDegrees: 24,
  saturationMean: 0.72,
  chromaWeight: 0.8,
});

function timeline(rendererProfile = expressive) {
  const score = generation.createVisualScore({ seed: "native-color-plan", constraints });
  return generation.resolve(analysis, score.score, constraints, rendererProfile);
}

test("Native Color exposes exactly two deterministic, identity-bearing relationships", () => {
  assert.deepEqual(RELATIONSHIPS, ["echo", "counterpoint"]);
  const source = timeline();
  const echo = resolveNativeColorPlan(source, { profile, analysis, relationship: "echo" });
  const repeat = resolveNativeColorPlan(source, { profile, analysis, relationship: "echo" });
  const counterpoint = resolveNativeColorPlan(source, { profile, analysis, relationship: "counterpoint" });

  assert.deepEqual(echo, repeat);
  assert.equal(echo.nativeColor.policyVersion, NATIVE_COLOR_POLICY);
  assert.equal(echo.nativeColor.relationship, "echo");
  assert.equal(echo.nativeColor.windowCount, 1);
  assert.equal(echo.nativeColor.decompressionWindows[0].startTick, 82_000);
  assert.equal(echo.nativeColor.decompressionWindows[0].endTick, 100_000);
  assert.notEqual(echo.nativeColor.planSha256, counterpoint.nativeColor.planSha256);
  assert.notEqual(echo.timelineHash, counterpoint.timelineHash);

  assert.equal(nativeColorAtTick(echo, 81_999).nativeInfluence, 0);
  assert.equal(nativeColorAtTick(echo, 82_000).nativeInfluence, 0.68);
  assert.equal(nativeColorAtTick(echo, 100_000).nativeInfluence, 0);
});

test("non-expressive timelines remain exact and single-section analysis creates no fake window", () => {
  const legacyTimeline = timeline(legacy);
  assert.equal(resolveNativeColorPlan(legacyTimeline, { profile, analysis, relationship: "echo" }), legacyTimeline);

  const oneSection = {
    ...analysis,
    sections: [analysis.sections[0]],
  };
  const source = timeline();
  const resolved = resolveNativeColorPlan(source, { profile, analysis: oneSection, relationship: "echo" });
  assert.equal(resolved.nativeColor.windowCount, 0);
  assert.deepEqual(resolved.nativeColor.decompressionWindows, []);
});
