const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { runProcess } = require("../src/render/tooling.cjs");
const { writeRenderFailureBundle } = require("../src/render/render-failure-evidence.cjs");

test("runProcess preserves full structured evidence for abnormal process exits", async () => {
  const script = [
    "for (let i = 1; i <= 20; i += 1) {",
    "  process.stderr.write(`failure-line-${String(i).padStart(2, '0')}\\n`);",
    "}",
    "process.exit(7);",
  ].join("\n");

  await assert.rejects(
    runProcess(process.execPath, ["-e", script]),
    (error) => {
      assert.equal(error.processFailure?.binary, path.basename(process.execPath));
      assert.equal(error.processFailure?.code, 7);
      assert.equal(error.processFailure?.signal, null);
      assert.match(error.processFailure?.stderr || "", /failure-line-01/);
      assert.match(error.processFailure?.stderr || "", /failure-line-20/);

      // Human-facing errors remain concise even though the evidence object is complete.
      assert.doesNotMatch(error.message, /failure-line-01/);
      assert.match(error.message, /failure-line-20/);
      return true;
    },
  );
});

test("writes a sanitized sibling evidence bundle for an abnormal render", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-failure-evidence-"));
  const privateDirectory = path.join(root, "private-user-folder");
  const renderTemp = path.join(root, "full-measure-private-temp");
  await fs.mkdir(privateDirectory, { recursive: true });
  await fs.mkdir(renderTemp, { recursive: true });

  const outputPath = path.join(privateDirectory, "field-song.mp4");
  const audioPath = path.join(privateDirectory, "field-song.wav");
  const imagePath = path.join(privateDirectory, "cover.png");
  const filterPath = path.join(renderTemp, "render.ffgraph");
  const graph = "[1:v]scale=1920:1080,format=yuv420p[vout]";
  await fs.writeFile(filterPath, `${graph}\n`, "utf8");

  const error = new Error("ffmpeg.exe exited with code 3221225477");
  error.processFailure = Object.freeze({
    binary: "ffmpeg.exe",
    code: 3221225477,
    signal: null,
    stdout: "",
    stderr: "first diagnostic line\nswscaler warning\nlast diagnostic line\n",
  });

  const visualScore = {
    schema: "full-measure.visual-score.v0.5",
    seed: "failure-specimen",
  };
  const resolvedTimeline = {
    schema: "full-measure.resolved-timeline.v0.5",
    scoreAddress: "score:failure-specimen",
    timelineHash: "timeline-hash",
    analysisHash: "analysis-hash",
    rendererProfileHash: "profile-hash",
    rendererPolicy: "toaster-raster-3",
  };
  const visualCompiler = {
    policy: "visual-language-v2",
    topology: "spiral",
    topologyCompiler: "spiral-v2",
    operators: { material: "photocopy", camera: "orbit" },
    temporalSampling: { policy: "inner-cadence-23976" },
    witnessWindow: { policy: "witness-window-v1", width: 1920, height: 1080 },
  };

  try {
    const bundle = await writeRenderFailureBundle({
      outputPath,
      error,
      filterPath,
      ffmpegArgs: [
        "-i", audioPath,
        "-i", imagePath,
        "-filter_complex_script", filterPath,
        "-map", "[vout]",
        outputPath,
      ],
      visualScore,
      resolvedTimeline,
      buildInfo: {
        version: "0.5.0-alpha.7",
        commit: "abc123",
        dirty: false,
        sourceMode: false,
      },
      sourceAudio: {
        path: audioPath,
        filename: "field-song.wav",
        sha256: "audio-sha",
        duration: 42.5,
        formatName: "wav",
        audio: { codec: "pcm_s16le", sampleRate: 48000, channels: 2 },
      },
      sourceImage: {
        path: imagePath,
        filename: "cover.png",
        sha256: "image-sha",
        formatName: "png_pipe",
        video: { codec: "png", width: 2048, height: 2048, pixelFormat: "rgba" },
      },
      visualCompiler,
      jobId: "job-116",
      startedAt: new Date("2026-08-11T08:50:21.000Z"),
      lastProgress: { renderedSeconds: 4.2, frame: 126, duration: 42.5 },
    });

    assert.equal(bundle.directory, `${outputPath}.render-failure`);
    const names = (await fs.readdir(bundle.directory)).sort();
    assert.deepEqual(names, [
      "failure.json",
      "ffmpeg-args.json",
      "ffmpeg.stderr.log",
      "render.ffgraph",
      "resolved-timeline.json",
      "visual-score.json",
    ]);

    const failureText = await fs.readFile(path.join(bundle.directory, "failure.json"), "utf8");
    const failure = JSON.parse(failureText);
    assert.equal(failure.schema, "full-measure.render-failure.v1");
    assert.equal(failure.jobId, "job-116");
    assert.equal(failure.build.version, "0.5.0-alpha.7");
    assert.equal(failure.process.code, 3221225477);
    assert.equal(failure.progress.renderedSeconds, 4.2);
    assert.equal(failure.source.audio.filename, "field-song.wav");
    assert.equal(failure.source.image.filename, "cover.png");
    assert.equal(failure.canonicalExecution.timelineHash, "timeline-hash");
    assert.equal(failure.canonicalExecution.rendererProfileHash, "profile-hash");
    assert.equal(failure.render.visualCompiler.topologyCompiler, "spiral-v2");
    assert.equal(
      failure.render.graphSha256,
      crypto.createHash("sha256").update(`${graph}\n`, "utf8").digest("hex"),
    );
    assert.doesNotMatch(failureText, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    const argsText = await fs.readFile(path.join(bundle.directory, "ffmpeg-args.json"), "utf8");
    const args = JSON.parse(argsText);
    assert.equal(args.binary, "ffmpeg.exe");
    assert.deepEqual(args.args, [
      "-i", "field-song.wav",
      "-i", "cover.png",
      "-filter_complex_script", "render.ffgraph",
      "-map", "[vout]",
      "field-song.mp4",
    ]);
    assert.doesNotMatch(argsText, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    assert.equal(
      await fs.readFile(path.join(bundle.directory, "ffmpeg.stderr.log"), "utf8"),
      error.processFailure.stderr,
    );
    assert.equal(
      await fs.readFile(path.join(bundle.directory, "render.ffgraph"), "utf8"),
      `${graph}\n`,
    );
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(bundle.directory, "visual-score.json"), "utf8")),
      visualScore,
    );
    assert.deepEqual(
      JSON.parse(await fs.readFile(path.join(bundle.directory, "resolved-timeline.json"), "utf8")),
      resolvedTimeline,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
