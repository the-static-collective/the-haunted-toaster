const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readSource = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("packaged renderer exposes a visible TEST 6 action through a dedicated bridge", () => {
  const ui = readSource("src/renderer/candidate-ui.js");
  const preload = readSource("src/preload.cjs");
  const session = readSource("src/candidate-session.cjs");

  assert.match(ui, /TEST 6/);
  assert.match(ui, /generateTestCandidates/);
  assert.match(preload, /generateTestCandidates:\s*\(config\)\s*=>\s*ipcRenderer\.invoke\("candidate:test-6", config\)/);
  assert.match(session, /ipcMain\.handle\("candidate:test-6"/);
  assert.match(session, /generateTestSixWitnessFamily/);
});

test("TEST 6 does not reuse ordinary click-sequence entropy or ordinary generate IPC", () => {
  const ui = readSource("src/renderer/candidate-ui.js");
  const testFunction = ui.match(/async function generateTestSix[\s\S]*?\n  }/)?.[0] || "";

  assert.ok(testFunction, "TEST 6 must have a dedicated renderer function");
  assert.doesNotMatch(testFunction, /nextRootSeed/);
  assert.doesNotMatch(testFunction, /generateCandidates/);
  assert.match(testFunction, /generateTestCandidates/);
});

test("forced witness receipt evidence is compact, typed, and refuses arbitrary provenance", () => {
  const { compactForcedWitnessEvidence } = require("../src/render/render.cjs");
  const evidence = compactForcedWitnessEvidence({
    forcedWitness: true,
    fixtureFamily: "test-6",
    fixtureSlot: "big-grab",
    forcedCondition: "guaranteed-grab",
    policyVersion: "forced-witness-test-6-v0",
    ignored: "must-not-cross",
  });

  assert.deepEqual(evidence, {
    forcedWitness: true,
    fixtureFamily: "test-6",
    fixtureSlot: "big-grab",
    forcedCondition: "guaranteed-grab",
    policyVersion: "forced-witness-test-6-v0",
  });
  assert.equal(compactForcedWitnessEvidence(null), null);
  assert.throws(
    () => compactForcedWitnessEvidence({
      forcedWitness: true,
      fixtureFamily: "ordinary",
      fixtureSlot: "big-grab",
      forcedCondition: "guaranteed-grab",
      policyVersion: "forced-witness-test-6-v0",
    }),
    /TEST[ -]6/i,
  );
});

test("selected TEST 6 execution carries fixture provenance and bounded render overrides without changing score authority", () => {
  const session = readSource("src/candidate-session.cjs");

  assert.match(session, /forcedWitnessEvidence/);
  assert.match(session, /forcedRenderConfig/);
  assert.match(session, /resolvedTimeline:\s*selection\.timeline/);
  assert.match(session, /visualScore:\s*selection\.scoreArtifact\.score/);
});

test("forced witness identity crosses the preview surface and the final video receipt", () => {
  const preview = readSource("src/render/candidate-preview.cjs");
  const render = readSource("src/render/render.cjs");

  assert.match(preview, /fixtureLabel:\s*candidate\.fixtureLabel/);
  assert.match(preview, /fixtureSlot:\s*candidate\.fixtureSlot/);
  assert.match(preview, /forcedCondition:\s*candidate\.forcedCondition/);
  assert.match(preview, /forcedWitness:\s*candidate\.forcedWitness\s*===\s*true/);
  assert.match(render, /forcedWitness:\s*compactForcedWitnessEvidence\(config\.forcedWitnessEvidence\)/);
});

test("ordinary six-up applies the mild deterministic GRAB session projection without turning it into a forced witness", () => {
  const session = readSource("src/candidate-session.cjs");

  assert.match(session, /projectOrdinaryGrabView/);
  assert.match(session, /forcedWitness:\s*false/);
});
