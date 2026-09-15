const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const { listToastFeels } = require("../src/toast-feels.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const openField = readJson("constraints/open-field.v3.json");
const profile = readJson("profiles/toaster-raster-4.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function packagedResponseWitness() {
  return generation.deriveResponseWitness({
    energySamples: [],
    sections: analysis.sections,
    durationSeconds: analysis.durationSeconds,
  });
}

test("TEST 6 packaged Open Field configuration survives every current Toast Feel state", async (t) => {
  const states = [
    ["unselected", null],
    ...listToastFeels().map((feel) => [feel.id, feel.id]),
  ];

  for (const [label, toastFeelId] of states) {
    await t.test(label, () => {
      const family = generation.generateTestSixWitnessFamily({
        analysis,
        responseWitness: packagedResponseWitness(),
        garmentConstraints: openField,
        rendererProfile: profile,
        rootSeed: `test-6:openField:${toastFeelId || "unselected"}:packaged-regression`,
        toastFeelId,
      });

      assert.equal(family.producedCount, 6);
      assert.equal(family.candidates.length, 6);
    });
  }
});
