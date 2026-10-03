const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

const {
  runWitnessSigil,
} = require("../../../integrations/ghot/witness-sigil.cjs");

const DIGEST = "0123456789abcdef".repeat(4);

test("GHoT adapter uses the canonical Haunted Toaster witness-sigil projector", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-ghot-sigil-"));
  try {
    const result = await runWitnessSigil({
      digest: DIGEST,
      output_dir: dir,
      basename: "house-001",
    });
    assert.equal(result.status, "ok");
    assert.equal(result.capability, "creative.toaster.witness-sigil");
    assert.equal(result.receipt.source_digest_sha256, DIGEST);
    assert.equal(result.receipt.instrument, "witness-sigil/v0.1");

    const svg = await fs.readFile(result.artifact.svg_path, "utf8");
    const recipe = JSON.parse(await fs.readFile(result.artifact.recipe_path, "utf8"));
    const receipt = JSON.parse(await fs.readFile(result.artifact.receipt_path, "utf8"));
    assert.match(svg, /Witness Sigil 0123456789ab/);
    assert.equal(recipe.digest, DIGEST);
    assert.equal(receipt.outputs.svg.sha256, result.artifact.svg_sha256);
    assert.equal(receipt.outputs.recipe.sha256, result.artifact.recipe_sha256);
    assert.equal(result.artifact.svg_text, svg);
    assert.equal(result.artifact.recipe_text, await fs.readFile(result.artifact.recipe_path, "utf8"));
    assert.equal(result.artifact.receipt_text, await fs.readFile(result.artifact.receipt_path, "utf8"));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("stdin/stdout adapter bridge writes the same bounded artifact family", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-ghot-sigil-cli-"));
  try {
    const script = path.resolve(__dirname, "../../../integrations/ghot/witness-sigil.cjs");
    const child = spawn(process.execPath, [script], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const closed = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) => resolve(code));
    });
    child.stdin.end(JSON.stringify({
      digest: DIGEST,
      output_dir: dir,
      basename: "house-cli",
    }));
    const code = await closed;
    assert.equal(code, 0, stderr);
    const result = JSON.parse(stdout);
    assert.equal(result.status, "ok");
    assert.equal(result.receipt.authority, "deterministic-projection-only");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
