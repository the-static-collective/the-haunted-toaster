const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildUiWitness } = require("../scripts/build-ui-witness.cjs");
const { CANONICAL_WITNESS_STATES, normalizeWitnessState } = require("../witness/witness-controller.js");

const rootDir = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(rootDir, "..", "..");

test("UI witness is generated from production renderer assets", (t) => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "toaster-ui-witness-"));
  t.after(() => fs.rmSync(outputDir, { recursive: true, force: true }));

  const result = buildUiWitness({
    rootDir,
    outputDir,
    commit: "deadbeef",
  });
  const generated = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
  const rendererDir = path.join(rootDir, "src", "renderer");
  const production = fs.readFileSync(path.join(rendererDir, "index.html"), "utf8");

  assert.equal(result.commit, "deadbeef");
  assert.equal(result.policy, "ui-witness-v1");
  assert.match(generated, /witness-bridge\.js/);
  assert.match(generated, /witness-controller\.js/);
  assert.ok(generated.indexOf("witness-bridge.js") < generated.indexOf("toast-feel-controller.js"));
  assert.match(generated, /__uiWitnessToastFeels/);
  assert.match(generated, /__uiWitnessBuildInfo/);
  assert.match(generated, /"version":"0\.5\.0-alpha\.8"/);
  for (const capability of [
    "uiWitnessV1",
    "toastFeelV1",
    "nativeColorWitnessV1",
    "renderFailureEvidenceV1",
  ]) {
    assert.match(generated, new RegExp(`"${capability}"`));
  }
  assert.equal(
    fs.readFileSync(path.join(outputDir, "styles.css"), "utf8"),
    fs.readFileSync(path.join(rendererDir, "styles.css"), "utf8"),
  );
  assert.match(generated, /data-ui-witness-commit="deadbeef"/);
  assert.ok(production.includes("./styles.css"));
});

test("Vercel publishes only the generated renderer witness", () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(repositoryRoot, "vercel.json"), "utf8"));
  assert.deepEqual(vercel, {
    buildCommand: "npm --prefix src/full-measure ci && npm --prefix src/full-measure run witness:build",
    outputDirectory: "src/full-measure/witness-dist",
  });
});

test("UI witness exposes only the bounded canonical state set", () => {
  assert.deepEqual(CANONICAL_WITNESS_STATES, [
    "empty",
    "song-ready",
    "toast-feel",
    "six-up",
    "listener",
    "rendering",
    "complete",
    "failure",
  ]);
  assert.equal(normalizeWitnessState("listener"), "listener");
  assert.equal(normalizeWitnessState("starting-field"), "toast-feel");
  assert.equal(normalizeWitnessState("invented-state"), "empty");
});
