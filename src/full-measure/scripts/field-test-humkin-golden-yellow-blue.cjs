#!/usr/bin/env node
"use strict";

// HUMKIN / Golden Yellow Blue — experimental real-song field runner.
// This is an adapter for the existing Haunted Toaster modules, not a new renderer.
// Assets remain local; no media files are checked into Git.

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { createCandidateSession } = require("../src/candidate-session.cjs");
const { inspectAudio } = require("../src/render/analyze.cjs");
const { renderVideo } = require("../src/render/render.cjs");

const PRESET = "wireOrchard";
const FEEL = "wire-heat";
const TITLE = "Golden Yellow Blue";
const ARTIST = "HUMKIN";

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || !argv[i + 1]) {
      throw new Error("Use --audio FILE [--image FILE] --out FILE [--keep 1..6]");
    }
    opts[argv[i].slice(2)] = argv[i + 1];
  }
  if (!opts.audio || !opts.out) {
    throw new Error("Usage: node scripts/field-test-humkin-golden-yellow-blue.cjs --audio SONG.mp3 --image COVER.png --out VIDEO.mp4 [--keep 1..6]");
  }
  if (opts.keep !== undefined && !/^[1-6]$/.test(opts.keep)) {
    throw new Error("--keep must be an explicit number from 1 to 6");
  }
  return opts;
}
async function fileHash(p) {
  return crypto.createHash("sha256").update(await fs.readFile(p)).digest("hex");
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const audioPath = path.resolve(args.audio);
  const imagePath = args.image ? path.resolve(args.image) : null;
  const outputPath = path.resolve(args.out);
  const outDir = path.dirname(outputPath);
  await fs.access(audioPath);
  if (imagePath) await fs.access(imagePath);
  await fs.mkdir(outDir, { recursive: true });
  const audioSha = await fileHash(audioPath);

  const analysis = await inspectAudio(audioPath);
  const session = createCandidateSession();
  session.noteAudio(audioPath, analysis);

  // Source audio hash is part of the stable family-seed, so retries are reproducible.
  const family = await session.generate({
    rootSeed: "humkin-golden-yellow-blue-field-" + audioSha.slice(0, 20),
    presetId: PRESET,
    toastFeelId: FEEL,
    title: TITLE,
    artist: ARTIST,
    lyrics: "",
  });
  if (family.producedCount !== 6 || family.candidates.length !== 6) {
    throw new Error("The expected exact six-up was not produced.");
  }

  const thumbs = [];
  for (let i = 0; i < 6; i++) {
    const png = family.candidates[i].thumbnailDataUrl;
    if (!png || !png.startsWith("data:image/png;base64,")) {
      throw new Error("Candidate " + (i + 1) + " lacks PNG preview evidence.");
    }
    const thumbnail = path.join(outDir, "candidate-" + (i + 1) + ".png");
    await fs.writeFile(thumbnail, Buffer.from(png.slice("data:image/png;base64,".length), "base64"));
    thumbs.push(thumbnail);
  }
  const initial = {
    field_test: "HUMKIN / Golden Yellow Blue",
    source_audio_sha256: audioSha,
    source_art_sha256: imagePath ? await fileHash(imagePath) : null,
    familyHash: family.familyHash,
    preview_paths: thumbs,
    preview_score_addresses: family.candidates.map(x => x.scoreAddress),
    runtime: "the-haunted-toaster experimental source; official renderer, not third-party imitation",
    authority: "No automatic KEEP. Human selection required to render.",
  };
  await fs.writeFile(path.join(outDir, "field-test-six-up.json"), JSON.stringify(initial, null, 2) + "\n");
  if (!args.keep) {
    process.stdout.write("Six official candidate previews saved to " + outDir + "\nRun again with --keep N to authorize a particular creature and render it.\n");
    return;
  }

  const index = Number(args.keep) - 1;
  const focused = session.select({ familyHash: family.familyHash, index });
  const kept = session.keep({ familyHash: family.familyHash, index });
  if (focused.scoreAddress !== kept.scoreAddress || focused.timelineHash !== kept.timelineHash) {
    throw new Error("KEEP did not preserve exact candidate identity.");
  }
  const execution = session.executionForRender({
    audioPath, imagePath, presetId: PRESET, toastFeelId: FEEL,
  });
  if (!execution || execution.resolvedTimeline.timelineHash !== kept.timelineHash) {
    throw new Error("Unbound kept timeline. Refusing final render.");
  }
  const result = await renderVideo({
    ...execution,
    audioPath,
    imagePath,
    outputPath,
    title: TITLE,
    artist: ARTIST,
    presetId: PRESET,
    width: 720,
    height: 900,
    fps: 24,
    encoderPreset: "veryfast",
    crf: 23,
  });
  if (!result.receipt?.validation?.accepted) {
    throw new Error("Official render receipt did not validate.");
  }
  if (result.receipt.canonicalExecution?.timelineHash !== kept.timelineHash) {
    throw new Error("Final render consumed a different timeline.");
  }
  process.stdout.write(JSON.stringify({
    output: result.outputPath,
    receipt: result.receiptPath,
    selected: index + 1,
    kept_score: kept.scoreAddress,
    timeline: kept.timelineHash,
    audioSha,
  }, null, 2) + "\n");
}

run().catch(err => {
  process.stderr.write((err.stack || err.message) + "\n");
  process.exitCode = 1;
});
