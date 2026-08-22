const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const packageJson = require("../package.json");

test("dedicated sigil smoke remains separate and emits two six-utterance proof specimens", () => {
  assert.equal(packageJson.scripts["sigil:smoke"], "node scripts/smoke-sigil-grammar.cjs");
  assert.equal(packageJson.scripts.smoke.includes("smoke-sigil-grammar"), false);

  const script = path.join(__dirname, "..", "scripts", "smoke-sigil-grammar.cjs");
  const output = execFileSync(process.execPath, [script], { encoding: "utf8" });
  const lines = output.trim().split(/\r?\n/);
  assert.equal(lines.length, 1);

  const proof = JSON.parse(lines[0]);
  assert.equal(proof.schema, "haunted-toaster/sigil-grammar-smoke/v0");
  assert.deepEqual(proof.freeSigil.roles, ["turn", "mirror", "echo", "scar", "aperture", "branch"]);
  assert.equal(proof.freeSigil.expressionHashes.length, 6);
  assert.equal(new Set(proof.freeSigil.expressionHashes).size, 6);
  assert.equal(new Set(proof.freeSigil.planHashes).size, 6);

  assert.equal(
    proof.witnessLocked.digest,
    "2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881",
  );
  assert.equal(proof.witnessLocked.projectionVersion, "witness-sigil/v0.1");
  assert.deepEqual(proof.witnessLocked.roles, ["turn", "mirror", "echo", "scar", "aperture", "branch"]);
  assert.equal(proof.witnessLocked.expressionHashes.length, 6);
  assert.equal(new Set(proof.witnessLocked.expressionHashes).size, 6);
  assert.equal(new Set(proof.witnessLocked.planHashes).size, 6);
});
