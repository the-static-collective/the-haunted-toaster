const fs = require("node:fs/promises");
const path = require("node:path");
const { createProceduralPpm } = require("../src/render/artwork.cjs");
const { inspectAudio } = require("../src/render/analyze.cjs");
const { getPreset } = require("../src/render/presets.cjs");
const { renderVideo } = require("../src/render/render.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

async function main() {
  const root = path.resolve(__dirname, "..");
  const artifacts = path.join(root, "test-artifacts");
  const audioPath = path.join(artifacts, "full-measure-smoke.wav");
  const outputPath = path.join(artifacts, "full-measure-smoke.mp4");
  const mp3Path = path.join(artifacts, "full-measure-copy-smoke.mp3");
  const imagePpmPath = path.join(artifacts, "image-weave-seed.ppm");
  const imagePath = path.join(artifacts, "image-weave-seed.png");
  const imageOutputPath = path.join(
    artifacts,
    "full-measure-image-copy-smoke.mp4",
  );
  await fs.mkdir(artifacts, { recursive: true });

  process.stdout.write("Creating a 12-second multi-section song fixture…\n");
  await runProcess(resolveFfmpeg(), [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=110:duration=3:sample_rate=48000",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=165:duration=3:sample_rate=48000",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=220:duration=3:sample_rate=48000",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=147:duration=3:sample_rate=48000",
    "-filter_complex",
    "[0:a]volume=0.10[a0];[1:a]volume=0.28[a1];[2:a]volume=0.72[a2];[3:a]volume=0.16[a3];[a0][a1][a2][a3]concat=n=4:v=0:a=1,afade=t=in:st=0:d=0.25,afade=t=out:st=11.5:d=0.5[out]",
    "-map",
    "[out]",
    "-c:a",
    "pcm_s16le",
    audioPath,
  ]);

  const analysis = await inspectAudio(audioPath);
  process.stdout.write(
    `Detected ${analysis.sections.length} phases: ${analysis.sections
      .map((section) => section.label)
      .join(" → ")}\n`,
  );

  let lastReported = -1;
  const result = await renderVideo(
    {
      audioPath,
      outputPath,
      presetId: "porchlight",
      title: "THE TOASTER LIVES",
      artist: "The Static Collective",
      lyrics: [
        "[00:00.650]The spoon remembers",
        "[00:03.000]The porch light stays",
        "[00:06.100]Song goes in",
        "[00:08.700]Full measure comes out",
      ].join("\n"),
      lyricProvenance: {
        mode: "auto-synced-local",
        engine: {
          name: "Full Measure Listener",
          whisperCppVersion: "1.9.1",
          modelId: "base.en-q5_1",
          language: "en",
        },
        alignment: {
          lineCount: 4,
          matchedCount: 4,
          reviewCount: 0,
          humanCorrectedCount: 0,
        },
        sidecarFilename: "full-measure-smoke.lrc",
      },
      width: 1920,
      height: 1080,
      fps: 30,
      encoderPreset: "veryfast",
      crf: 23,
      analysis,
    },
    {
      onPhase(_phase, message) {
        process.stdout.write(`${message}\n`);
      },
      onProgress(progress) {
        const bucket = Math.floor(progress.ratio * 10) * 10;
        if (bucket !== lastReported) {
          lastReported = bucket;
          process.stdout.write(`Render ${bucket}%\n`);
        }
      },
    },
  );

  if (!result.receipt.validation.accepted) {
    throw new Error("Smoke receipt was not accepted.");
  }
  if (
    !result.receipt.treatment.lyricTiming?.synchronized ||
    result.receipt.treatment.lyricTiming?.sourceFormat !== "lrc" ||
    result.receipt.treatment.lyricTiming?.cueCount !== 4 ||
    result.receipt.treatment.lyricTiming?.provenance?.mode !==
      "auto-synced-local"
  ) {
    throw new Error("The timestamped-lyrics smoke receipt was not accepted.");
  }

  process.stdout.write(
    "Proving the optional-image and MP3 stream-copy path…\n",
  );
  await createProceduralPpm(imagePpmPath, getPreset("wireOrchard"), {
    width: 960,
    height: 540,
  });
  await runProcess(resolveFfmpeg(), [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    imagePpmPath,
    "-frames:v",
    "1",
    imagePath,
  ]);
  await runProcess(resolveFfmpeg(), [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    audioPath,
    "-t",
    "4",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    mp3Path,
  ]);

  const mp3Analysis = await inspectAudio(mp3Path);
  const imageResult = await renderVideo({
    audioPath: mp3Path,
    imagePath,
    outputPath: imageOutputPath,
    presetId: "wireOrchard",
    title: "IMAGE WEAVE",
    artist: "Full Measure",
    width: 640,
    height: 360,
    fps: 30,
    encoderPreset: "ultrafast",
    crf: 26,
    analysis: mp3Analysis,
  });

  if (
    !imageResult.receipt.validation.accepted ||
    imageResult.receipt.render.sourceAudioHandling.mode !== "stream-copy" ||
    imageResult.receipt.treatment.userImage !== path.basename(imagePath)
  ) {
    throw new Error("The image/stream-copy smoke receipt was not accepted.");
  }

  process.stdout.write(
    [
      "Full Measure smoke render passed.",
      `Video: ${result.outputPath}`,
      `Receipt: ${result.receiptPath}`,
      `Duration delta: ${result.receipt.validation.durationDeltaMilliseconds} ms`,
      `Audio: ${result.receipt.render.sourceAudioHandling.mode}`,
      `Lyrics: ${result.receipt.treatment.lyricTiming.mode}`,
      `Image/MP3 proof: ${imageResult.outputPath}`,
      `Image/MP3 audio: ${imageResult.receipt.render.sourceAudioHandling.mode}`,
    ].join("\n") + "\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
