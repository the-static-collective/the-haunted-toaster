#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  createNextGenProfile,
  sealNextGenProfile,
} = require("../src/nextgen/profile.cjs");

function usage() {
  process.stdout.write([
    "Haunted Toaster NextGen 001",
    "",
    "Print the pinned integration profile:",
    "  node src/full-measure/scripts/nextgen-toaster.cjs --profile",
    "",
    "Seal a runtime-proof receipt:",
    "  node src/full-measure/scripts/nextgen-toaster.cjs --seal",
    "    --kernel-sha <git-sha>",
    "    --evidence <evidence.json>",
    "    [--out <receipt.json>]",
    "",
  ].join("\n"));
}

function parseArgs(argv) {
  const out = {profile:false, seal:false, kernelSha:null, evidence:null, output:null};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--profile") out.profile = true;
    else if (arg === "--seal") out.seal = true;
    else if (arg === "--kernel-sha") out.kernelSha = argv[++i];
    else if (arg === "--evidence") out.evidence = argv[++i];
    else if (arg === "--out") out.output = argv[++i];
    else if (arg === "--help" || arg === "-h") out.help = true;
    else throw new Error("Unknown argument: " + arg);
  }
  return out;
}

function write(value, outputPath) {
  const text = JSON.stringify(value, null, 2) + "\n";
  if (!outputPath) {
    process.stdout.write(text);
    return;
  }
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), {recursive:true});
  fs.writeFileSync(resolved, text, {flag:"wx"});
  process.stdout.write(resolved + "\n");
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.help || (!args.profile && !args.seal)) {
      usage();
      return;
    }
    if (args.profile && args.seal) {
      throw new Error("Choose --profile or --seal, not both.");
    }
    if (args.profile) {
      write(createNextGenProfile(), args.output);
      return;
    }
    if (!args.kernelSha) throw new Error("--seal requires --kernel-sha.");
    if (!args.evidence) throw new Error("--seal requires --evidence.");
    const evidence = JSON.parse(fs.readFileSync(path.resolve(args.evidence), "utf8"));
    write(sealNextGenProfile({kernelSha:args.kernelSha, evidence}), args.output);
  } catch (error) {
    process.stderr.write("nextgen-toaster: " + (error.stack || error.message) + "\n");
    process.exitCode = 1;
  }
}

main();
