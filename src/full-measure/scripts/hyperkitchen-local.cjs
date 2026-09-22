#!/usr/bin/env node
"use strict";

// Explicit developer-only local projection. No user-media upload or song-render mutation.
const fs = require("node:fs/promises");
const { renderHyperKitchen } = require("../src/hyperfood/hyperkitchen-local-render.cjs");

function parseArgs(argv) {
  const accepted = new Set([
    "--toaster-home", "--video", "--exchange-entry", "--duration-ms", "--events", "--seed",
  ]);
  const values = {};
  if (argv.length % 2 !== 0) throw new TypeError("HyperKitchen flags require values.");
  for (let index = 0; index < argv.length; index += 2) {
    const [key, value] = [argv[index], argv[index + 1]];
    if (!accepted.has(key) || !value || value.startsWith("--") || Object.hasOwn(values, key)) {
      throw new TypeError("Unexpected or duplicated HyperKitchen flag: " + key);
    }
    values[key] = value;
  }
  if (!values["--toaster-home"] || !values["--video"]) {
    throw new TypeError(
      "Usage: node scripts/hyperkitchen-local.cjs --toaster-home DIR --video ADMITTED.mp4"
        + " [--exchange-entry ARCHIVED_ENTRY.json] [--duration-ms 1000]"
        + " [--events local-events.json] [--seed 0]",
    );
  }
  return {
    rootDir: values["--toaster-home"],
    videoPath: values["--video"],
    exchangeEntryPath: values["--exchange-entry"] || null,
    durationMs: values["--duration-ms"] === undefined ? 1000 : Number(values["--duration-ms"]),
    seed: values["--seed"] === undefined ? 0 : Number(values["--seed"]),
    eventFile: values["--events"] || null,
  };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  let events;
  if (parsed.eventFile) events = JSON.parse(await fs.readFile(parsed.eventFile, "utf8"));
  const result = await renderHyperKitchen({
    rootDir: parsed.rootDir,
    videoPath: parsed.videoPath,
    exchangeEntryPath: parsed.exchangeEntryPath,
    durationMs: parsed.durationMs,
    seed: parsed.seed,
    events,
  });
  process.stdout.write(JSON.stringify({
    status: result.receipt.status,
    renderPath: result.path,
    specimenId: result.receipt.specimenId,
    projectionId: result.receipt.projectionId,
    outputSha256: result.receipt.output.sha256,
    childSpecimenId: result.childSpecimenId || null,
    reimported: result.reused,
    renderer: result.receipt.renderer.id,
    hostedHyperFramesRendered: false,
    grantsSongRenderAuthority: false,
  }, null, 2) + "\n");
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write("HyperKitchen projection refused: " + error.message + "\n");
    process.exitCode = 1;
  });
}

module.exports = { parseArgs };
