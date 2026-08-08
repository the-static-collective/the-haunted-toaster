const fs = require("node:fs/promises");
const path = require("node:path");
const { createCandidateSession } = require("../src/candidate-session.cjs");
const { inspectAudio } = require("../src/render/analyze.cjs");
const { renderVideo } = require("../src/render/render.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

async function main() {
  const root = path.resolve(__dirname, "..");
  const artifacts = path.join(root, "test-artifacts");
  const audioPath = path.join(artifacts, "candidate-six-up-smoke.wav");
  const outputPath = path.join(artifacts, "candidate-six-up-winner.mp4");
  await fs.mkdir(artifacts, { recursive: true });

  process.stdout.write("Creating candidate-family smoke song…\n");
  await runProcess(resolveFfmpeg(), [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=137:duration=5:sample_rate=48000",
    "-c:a",
    "pcm_s16le",
    audioPath,
  ]);

  const analysis = await inspectAudio(audioPath);
  const session = createCandidateSession();
  session.noteAudio(audioPath, analysis);

  const first = await session.generate({
    rootSeed: "issue-15-six-up-smoke-root",
    presetId: "wireOrchard",
    title: "SIX UP SMOKE",
    artist: "The Static Collective",
    lyrics: "",
  });
  if (first.producedCount !== 6 || first.candidates.length !== 6) {
    throw new Error(`Expected six exact candidate previews, received ${first.producedCount}.`);
  }
  if (first.candidates.some((candidate) => !candidate.thumbnailDataUrl.startsWith("data:image/png;base64,"))) {
    throw new Error("Candidate preview smoke did not produce six PNG thumbnails.");
  }

  const descendants = await session.mutate({
    familyHash: first.familyHash,
    parentIndex: 2,
    locks: ["palette"],
    rootSeed: "issue-15-six-up-smoke-descendants",
    presetId: "wireOrchard",
    title: "SIX UP SMOKE",
    artist: "The Static Collective",
    lyrics: "",
  });
  if (descendants.producedCount !== 6 || descendants.candidates.length !== 6) {
    throw new Error("Candidate descendant smoke did not produce six previews.");
  }

  const selected = session.select({ familyHash: descendants.familyHash, index: 1 });
  const execution = session.executionForRender({
    audioPath,
    imagePath: null,
    presetId: "wireOrchard",
  });
  if (!execution || execution.resolvedTimeline.timelineHash !== selected.timelineHash) {
    throw new Error("Selected candidate did not bind its exact timeline to production render.");
  }

  const result = await renderVideo({
    ...execution,
    audioPath,
    outputPath,
    presetId: "wireOrchard",
    title: "SIX UP WINNER",
    artist: "The Static Collective",
    width: 640,
    height: 360,
    fps: 24,
    encoderPreset: "ultrafast",
    crf: 28,
  });
  if (!result.receipt.validation.accepted) {
    throw new Error("Chosen candidate production render was not accepted.");
  }
  if (
    result.receipt.canonicalExecution.timelineHash !== selected.timelineHash ||
    result.receipt.canonicalExecution.scoreAddress !== selected.scoreAddress
  ) {
    throw new Error("Production receipt does not identify the exact six-up winner.");
  }

  process.stdout.write(
    [
      "Candidate six-up smoke passed.",
      `Family: ${descendants.familyHash}`,
      `Winner score: ${selected.scoreAddress}`,
      `Winner timeline: ${selected.timelineHash}`,
      `Video: ${result.outputPath}`,
    ].join("\n") + "\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
