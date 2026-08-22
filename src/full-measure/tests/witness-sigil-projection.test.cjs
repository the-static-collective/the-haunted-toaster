const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  renderWitnessSigilV01,
} = require("../src/generation/witness-sigil-projection.cjs");

const FIXTURE_DIR = path.join(__dirname, "fixtures", "witness-sigil-v0.1");

for (const file of fs.readdirSync(FIXTURE_DIR).filter((name) => name.endsWith(".recipe.json")).sort()) {
  test(`reproduces golden witness vector ${file}`, () => {
    const recipeText = fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8");
    const expectedRecipe = JSON.parse(recipeText);
    const svgFile = file.replace(".recipe.json", ".sigil.svg");
    const svgText = fs.readFileSync(path.join(FIXTURE_DIR, svgFile), "utf8");

    const actual = renderWitnessSigilV01(expectedRecipe.digest);

    assert.equal(actual.recipeText, recipeText);
    assert.equal(actual.svgText, svgText);
    assert.deepEqual(actual.recipe, expectedRecipe);
  });
}

test("rejects non-canonical digest input", () => {
  for (const digest of [
    "ABCDEF",
    "0".repeat(63),
    "0".repeat(65),
    ` ${"0".repeat(64)}`,
    `${"0".repeat(64)}\n`,
  ]) {
    assert.throws(() => renderWitnessSigilV01(digest), /canonical lowercase SHA-256 digest/);
  }
});
