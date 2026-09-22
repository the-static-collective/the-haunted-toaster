#!/usr/bin/env node
"use strict";

// Explicit local-only developer door. Pass the same Toaster home used by Electron;
// no attempt is made to guess the app's OS-specific userData path.
const { importBlenderExchange } = require("../src/video-pantry/blender-exchange.cjs");

function parseArgs(argv) {
  const names = ["--toaster-home", "--manifest", "--receipt", "--video"];
  const values = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!names.includes(argv[i]) || !argv[i + 1] || argv[i + 1].startsWith("--")) {
      throw new TypeError("Usage: node scripts/import-blender-exchange.cjs --toaster-home DIR --manifest JSON --receipt JSON --video MP4");
    }
    if (Object.hasOwn(values, argv[i])) throw new TypeError("Duplicate argument: " + argv[i]);
    values[argv[i]] = argv[i + 1];
  }
  if (names.some((name) => !values[name])) {
    throw new TypeError("Usage: node scripts/import-blender-exchange.cjs --toaster-home DIR --manifest JSON --receipt JSON --video MP4");
  }
  return {
    rootDir: values["--toaster-home"],
    manifestPath: values["--manifest"],
    producerReceiptPath: values["--receipt"],
    videoPath: values["--video"],
  };
}

async function main() {
  const result = await importBlenderExchange(parseArgs(process.argv.slice(2)));
  process.stdout.write(JSON.stringify({
    status: "catalogued-for-proposal",
    specimenId: result.specimenId,
    proposalRecipeId: result.proposalRecipeId,
    exchangeEntryPath: result.exchangeEntryPath,
    rendererAuthorityGranted: false,
  }, null, 2) + "\n");
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write("Blender exchange refused: " + error.message + "\n");
    process.exitCode = 1;
  });
}

module.exports = { parseArgs };
