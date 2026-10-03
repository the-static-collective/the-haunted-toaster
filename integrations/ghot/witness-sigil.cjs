#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const {
  renderWitnessSigilV01,
} = require("../../src/full-measure/src/generation/witness-sigil-projection.cjs");

function sha256Text(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function safeBasename(value) {
  const raw = String(value || "house-witness-sigil").trim();
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(raw)) {
    throw new TypeError("basename must use only letters, numbers, dot, dash, underscore");
  }
  return raw;
}

async function runWitnessSigil(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("input must be an object");
  }
  const digest = String(input.digest || "");
  const outputDir = path.resolve(String(input.output_dir || ""));
  if (!input.output_dir || outputDir === path.parse(outputDir).root) {
    throw new TypeError("output_dir must be a bounded directory path");
  }
  const basename = safeBasename(input.basename);
  const rendered = renderWitnessSigilV01(digest);

  await fs.mkdir(outputDir, { recursive: true });
  const svgPath = path.join(outputDir, basename + ".sigil.svg");
  const recipePath = path.join(outputDir, basename + ".recipe.json");
  const receiptPath = path.join(outputDir, basename + ".toaster-receipt.json");

  await fs.writeFile(svgPath, rendered.svgText, "utf8");
  await fs.writeFile(recipePath, rendered.recipeText, "utf8");

  const svgSha256 = sha256Text(rendered.svgText);
  const recipeSha256 = sha256Text(rendered.recipeText);
  const receipt = {
    schema: "haunted-toaster/ghot-witness-sigil-receipt/v0",
    instrument: "witness-sigil/v0.1",
    authority: "deterministic-projection-only",
    source_digest_sha256: digest,
    outputs: {
      svg: {
        path: svgPath,
        sha256: svgSha256,
        media_type: "image/svg+xml"
      },
      recipe: {
        path: recipePath,
        sha256: recipeSha256,
        media_type: "application/json"
      }
    },
    laws: [
      "WITNESS SIGIL != AUTHENTICATION",
      "DIGEST != INTERPRETATION",
      "PROJECTION != SOURCE AUTHORITY",
      "GHOT EXECUTION != TOASTER CONTINUATION VERDICT"
    ]
  };
  const receiptText = JSON.stringify(receipt, null, 2) + "\n";
  await fs.writeFile(receiptPath, receiptText, "utf8");

  return {
    kind: "haunted-toaster.ghot-adapter-result",
    version: "0",
    capability: "creative.toaster.witness-sigil",
    status: "ok",
    artifact: {
      svg_path: svgPath,
      svg_sha256: svgSha256,
      svg_text: rendered.svgText,
      recipe_path: recipePath,
      recipe_sha256: recipeSha256,
      recipe_text: rendered.recipeText,
      receipt_path: receiptPath,
      receipt_sha256: sha256Text(receiptText),
      receipt_text: receiptText
    },
    receipt
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw.trim()) throw new TypeError("JSON input required");
    const input = JSON.parse(raw);
    const result = await runWitnessSigil(input);
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stderr.write(JSON.stringify({
      error: error instanceof Error ? error.message : "adapter failed"
    }) + "\n");
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { runWitnessSigil };
