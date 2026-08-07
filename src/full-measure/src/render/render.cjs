const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const legacy = require("./render-legacy.cjs");
const { createProceduralPpm } = require("./artwork.cjs");
const { inspectAudio, probeMedia } = require("./analyze.cjs");
const { getPreset } = require("./presets.cjs");
const { hashFile, writeReceipt } = require("./receipt.cjs");
const { resolveFfmpeg, runProcess } = require("./tooling.cjs");
const {
  assertTimelineDuration,
  createTimelineExecution,
} = require("./timeline-execution.cjs");
const { compileTimelineFilterGraph } = require("./timeline-filter.cjs");
const {
  assertScoreTimelineBinding,
  removeCanonicalExecutionSidecars,
  writeCanonicalExecutionSidecars,
} = require("./sidecars.cjs");

async function safeUnlink(filePath) {
  try {
    await fs.unlink(filePath);
  } catch {
    // An absent or locked partial file needs no further cleanup attempt.
  }
}

async function probeRenderedOutput(filePath, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await probeMedia(filePath);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 180 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function renderResolvedTimelineVideo(config, hooks = {}) {
  const audioPath = path.resolve(config.audioPath);
  const outputPath = path.resolve(config.outputPath);
  const imagePath = config.imagePath ? path.resolve(config.imagePath) : null;
  const width = Number(config.width) || 1920;
  const height = Number(config.height) || 1080;
  const fps = Number(config.fps) || 30;
  const preset = getPreset(config.presetId);
  const title = legacy.cleanText(config.title, 160);
  const artist = legacy.cleanText(config.artist, 160);
  const lyrics = legacy.cleanText(config.lyrics, 250_000);
  const lyricProvenance = legacy.cleanLyricProvenance(config.lyricProvenance);
  const signal = hooks.signal;

  if (path.extname(outputPath).toLowerCase() !== ".mp4") {
    throw new Error("Full Measure currently renders MP4 files.");
  }

  const [audioStat, imageStat] = await Promise.all([
    fs.stat(audioPath),
    imagePath ? fs.stat(imagePath) : Promise.resolve(null),
  ]);
  if (!audioStat.isFile()) throw new Error("The selected song is not a file.");
  if (imageStat && !imageStat.isFile()) {
    throw new Error("The selected image is not a file.");
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "full-measure-"));
  const jobId = crypto.randomUUID();
  const startedAt = new Date();

  try {
    hooks.onPhase?.("analysis", "Listening for the song's shape…");
    const analysis = config.analysis || (await inspectAudio(audioPath));
    if (!analysis.audio) throw new Error("No audio stream was found.");

    // Score-driven execution has exactly one semantic authority: the accepted timeline.
    // Validation/resolution remain outside render; these checks only bind accepted artifacts.
    const execution = createTimelineExecution(config.resolvedTimeline);
    assertTimelineDuration(execution.timeline, analysis.duration);
    const scoreAddress = assertScoreTimelineBinding(config.visualScore, execution.timeline);

    const sourceHash = await hashFile(audioPath);
    const proceduralPath = path.join(tempDirectory, "garment.ppm");
    await createProceduralPpm(proceduralPath, preset);

    hooks.onPhase?.("weaving", "Weaving the resolved visual timeline…");
    const baseFilter = await legacy.buildFilterGraph({
      tempDirectory,
      analysis,
      preset,
      title,
      artist,
      lyrics,
      hasImage: Boolean(imagePath),
      width,
      height,
      fps,
    });
    const compiledTimeline = compileTimelineFilterGraph(baseFilter.graph, execution);
    const filter = {
      ...baseFilter,
      graph: compiledTimeline.graph,
      timelineSegments: compiledTimeline.segments,
    };
    const filterPath = path.join(tempDirectory, "render.ffgraph");
    await fs.writeFile(filterPath, `${filter.graph}\n`, "utf8");

    const sourceAudioPlan = legacy.audioPlan(analysis.audio.codec);
    const ffmpegArgs = [
      "-y", "-hide_banner", "-nostdin", "-i", audioPath,
      "-loop", "1", "-framerate", String(fps), "-i", proceduralPath,
    ];

    if (imagePath) {
      ffmpegArgs.push("-loop", "1", "-framerate", String(fps), "-i", imagePath);
    }

    ffmpegArgs.push(
      "-filter_complex_script", filterPath,
      "-map", "[vout]",
      "-map", "0:a:0",
      "-c:v", "libx264",
      "-preset", config.encoderPreset || "medium",
      "-crf", String(config.crf || 19),
      "-profile:v", "high",
      "-level", "4.2",
      "-pix_fmt", "yuv420p",
      ...sourceAudioPlan.ffmpegArgs,
      "-movflags", "+faststart",
      "-shortest",
      "-max_interleave_delta", "0",
      "-progress", "pipe:1",
      "-stats_period", "0.5",
      outputPath,
    );

    hooks.onPhase?.("rendering", "Rendering the resolved timeline…");
    let progressBuffer = "";
    await runProcess(resolveFfmpeg(), ffmpegArgs, {
      cwd: tempDirectory,
      signal,
      collectStdout: false,
      onStdout(chunk) {
        progressBuffer += chunk;
        const lines = progressBuffer.split(/\r?\n/);
        progressBuffer = lines.pop() || "";
        for (const line of lines) {
          const match = line.match(/^out_time_(?:us|ms)=(\d+)$/);
          if (!match) continue;
          const renderedSeconds = Number(match[1]) / 1_000_000;
          const ratio = Math.max(0, Math.min(0.995, renderedSeconds / analysis.duration));
          hooks.onProgress?.({ ratio, renderedSeconds, duration: analysis.duration });
        }
      },
    });

    hooks.onPhase?.("validating", "Reading the finished receipt…");
    const outputMedia = await probeRenderedOutput(outputPath);
    if (!outputMedia.video || !outputMedia.audio) {
      throw new Error("The rendered file is missing a video or audio stream.");
    }

    const durationDeltaMs = Math.round(Math.abs(outputMedia.duration - analysis.duration) * 1_000);
    if (durationDeltaMs > 250) {
      throw new Error(`The output differs from the song by ${durationDeltaMs} ms; the render was not accepted.`);
    }

    const outputHash = await hashFile(outputPath);
    const sidecars = await writeCanonicalExecutionSidecars({
      outputPath,
      score: config.visualScore,
      timeline: execution.timeline,
    });
    const finishedAt = new Date();
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      receiptId: jobId,
      product: "Full Measure",
      artifact: "Video Receipt",
      createdAt: finishedAt.toISOString(),
      source: {
        filename: analysis.filename,
        sha256: sourceHash,
        sizeBytes: analysis.sizeBytes,
        durationSeconds: analysis.duration,
        format: analysis.formatName,
        audio: analysis.audio,
      },
      canonicalExecution: {
        scoreAddress,
        timelineHash: execution.timelineHash,
        analysisHash: execution.timeline.analysisHash || null,
        constraintsHash: execution.timeline.constraintsHash || null,
        rendererProfileHash: execution.timeline.rendererProfileHash || null,
        scoreSidecar: path.basename(sidecars.scorePath),
        timelineSidecar: path.basename(sidecars.timelinePath),
      },
      treatment: {
        title: title || path.parse(analysis.filename).name,
        artist: artist || null,
        garment: { id: preset.id, name: preset.name },
        userImage: imagePath ? path.basename(imagePath) : null,
        wordsIncluded: filter.lyricTrack.cues.length > 0,
        wordLineCount: filter.lyricTrack.lines.length,
        wordTiming:
          filter.lyricTrack.mode === "evenly-distributed"
            ? "evenly-distributed-alpha-cues"
            : filter.lyricTrack.timed
              ? `${filter.lyricTrack.mode}-cues`
              : null,
        lyricTiming: filter.lyricTrack.cues.length
          ? {
              mode: filter.lyricTrack.mode,
              sourceFormat: filter.lyricTrack.sourceFormat,
              synchronized: filter.lyricTrack.timed,
              cueCount: filter.lyricTrack.cues.length,
              firstCueSeconds: filter.lyricTrack.cues[0].start,
              lastCueSeconds: filter.lyricTrack.cues[filter.lyricTrack.cues.length - 1].end,
              warningCount: filter.lyricTrack.warnings.length,
              provenance: lyricProvenance,
            }
          : null,
        sections: analysis.sections.map((section) => ({
          index: section.index,
          label: section.label,
          startSeconds: Number(section.start.toFixed(3)),
          endSeconds: Number(section.end.toFixed(3)),
          energy: Number(section.energy.toFixed(4)),
        })),
      },
      render: {
        width,
        height,
        framesPerSecond: fps,
        videoCodec: outputMedia.video.codec,
        pixelFormat: outputMedia.video.pixelFormat,
        sourceAudioHandling: {
          mode: sourceAudioPlan.mode,
          codec: sourceAudioPlan.codec,
          statement: sourceAudioPlan.statement,
        },
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        elapsedSeconds: Number(((finishedAt.getTime() - startedAt.getTime()) / 1_000).toFixed(3)),
      },
      output: {
        filename: path.basename(outputPath),
        sha256: outputHash,
        sizeBytes: outputMedia.sizeBytes,
        durationSeconds: outputMedia.duration,
        video: outputMedia.video,
        audio: outputMedia.audio,
      },
      validation: {
        playableStreamsPresent: true,
        fullTimelineCovered: true,
        continuousFilterGraph: true,
        sourceDurationSeconds: analysis.duration,
        outputDurationSeconds: outputMedia.duration,
        durationDeltaMilliseconds: durationDeltaMs,
        accepted: true,
      },
    };

    const receiptPath = await writeReceipt(receipt, outputPath);
    hooks.onProgress?.({ ratio: 1, renderedSeconds: analysis.duration, duration: analysis.duration });

    return {
      jobId,
      outputPath,
      receiptPath,
      scorePath: sidecars.scorePath,
      timelinePath: sidecars.timelinePath,
      receipt,
      analysis,
    };
  } catch (error) {
    await Promise.all([
      safeUnlink(outputPath),
      removeCanonicalExecutionSidecars(outputPath),
    ]);
    throw error;
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

async function renderVideo(config, hooks = {}) {
  if (!config?.resolvedTimeline) {
    return legacy.renderVideo(config, hooks);
  }
  return renderResolvedTimelineVideo(config, hooks);
}

module.exports = {
  ...legacy,
  renderVideo,
  renderResolvedTimelineVideo,
};