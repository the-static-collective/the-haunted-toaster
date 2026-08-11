const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const buildInfo = require("../build-info.cjs");
const legacy = require("./render-legacy.cjs");
const { createProceduralPpm } = require("./artwork.cjs");
const { inspectAudio, probeMedia } = require("./analyze.cjs");
const { getPreset } = require("./presets.cjs");
const { hashFile, writeReceipt } = require("./receipt.cjs");
const {
  buildHauntedFilterGraph,
  typographyContextForTimeline,
} = require("./haunted-typography-render.cjs");
const {
  getOutputProfile,
  resolveProfileAudioPlan,
  transportReceipt,
} = require("./output-profiles.cjs");
const {
  removeRenderFailureBundle,
  writeRenderFailureBundle,
} = require("./render-failure-evidence.cjs");
const { resolveFfmpeg, runProcess } = require("./tooling.cjs");
const {
  assertTimelineDuration,
  createTimelineExecution,
} = require("./timeline-execution.cjs");
const { compileTimelineFilterGraph } = require("./timeline-filter.cjs");
const {
  INNER_CADENCE_23976,
  applyTemporalSamplingToGraph,
} = require("./temporal-sampling.cjs");
const { applyWitnessWindowToGraph } = require("./witness-window.cjs");
const {
  assertScoreTimelineBinding,
  removeCanonicalExecutionSidecars,
  removeSubtitleSidecars,
  writeCanonicalExecutionSidecars,
  writeSubtitleSidecars,
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
  const outputProfile = getOutputProfile(config.outputProfileId);
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
  await removeRenderFailureBundle(outputPath);
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "full-measure-"));
  const jobId = crypto.randomUUID();
  const startedAt = new Date();
  let failureEvidenceContext = null;
  let lastProgress = null;

  try {
    hooks.onPhase?.("analysis", "Listening for the song's shape…");
    const analysis = config.analysis || (await inspectAudio(audioPath));
    if (!analysis.audio) throw new Error("No audio stream was found.");

    // Score-driven execution has exactly one semantic authority: the accepted timeline.
    // Validation/resolution remain outside render; these checks only bind accepted artifacts.
    const execution = createTimelineExecution(config.resolvedTimeline);
    assertTimelineDuration(execution.timeline, analysis.duration);
    const scoreAddress = assertScoreTimelineBinding(config.visualScore, execution.timeline);
    const typographyContext = typographyContextForTimeline(
      scoreAddress,
      execution.timeline,
    );

    const sourceHash = await hashFile(audioPath);
    const proceduralPath = path.join(tempDirectory, "garment.ppm");
    await createProceduralPpm(proceduralPath, preset);

    hooks.onPhase?.("weaving", "Weaving the resolved visual timeline…");
    const baseFilter = await buildHauntedFilterGraph({
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
      ...typographyContext,
    });
    const compiledTimeline = compileTimelineFilterGraph(baseFilter.graph, execution);
    const temporalSampling = applyTemporalSamplingToGraph(
      compiledTimeline.graph,
      INNER_CADENCE_23976,
      `${fps}/1`,
    );
    const witnessWindow = applyWitnessWindowToGraph(temporalSampling.graph, {
      width,
      height,
      pixelFormat: outputProfile.video.pixelFormat,
    });
    const visualCompiler = Object.freeze({
      policy: compiledTimeline.rendererPolicy,
      topology: compiledTimeline.topology,
      topologyCompiler: compiledTimeline.topologyCompiler,
      fieldEnvelopePolicy: compiledTimeline.fieldEnvelope?.policy || null,
      operators: compiledTimeline.operators,
      atmosphere: baseFilter.atmosphereEvidence,
      temporalSampling: temporalSampling.policy,
      witnessWindow: witnessWindow.evidence,
      graphSha256: crypto
        .createHash("sha256")
        .update(witnessWindow.graph, "utf8")
        .digest("hex"),
    });
    const filter = {
      ...baseFilter,
      graph: witnessWindow.graph,
      timelineSegments: compiledTimeline.segments,
      witnessWindowEvidence: witnessWindow.evidence,
      visualCompiler,
    };
    const filterPath = path.join(tempDirectory, "render.ffgraph");
    await fs.writeFile(filterPath, `${filter.graph}\n`, "utf8");

    const sourceAudioPlan = legacy.audioPlan(analysis.audio.codec);
    const encodeAudioPlan = resolveProfileAudioPlan(outputProfile, sourceAudioPlan);
    const ffmpegArgs = [
      "-y", "-hide_banner", "-nostdin", "-i", audioPath,
      "-loop", "1", "-framerate", String(fps), "-i", proceduralPath,
    ];

    if (imagePath) {
      ffmpegArgs.push("-loop", "1", "-framerate", String(fps), "-i", imagePath);
    }

    ffmpegArgs.push(
      "-filter_complex_script", filterPath,
      "-map", `[${witnessWindow.outputLabel}]`,
      "-map", "0:a:0",
      "-c:v", outputProfile.video.encoder,
      "-preset", outputProfile.video.preset,
      "-crf", String(outputProfile.video.crf),
      "-profile:v", outputProfile.video.profile,
      "-level", outputProfile.video.level,
      "-pix_fmt", outputProfile.video.pixelFormat,
      ...encodeAudioPlan.ffmpegArgs,
      "-movflags", outputProfile.movflags,
      "-shortest",
      "-max_interleave_delta", "0",
      "-progress", "pipe:1",
      "-stats_period", "0.5",
      outputPath,
    );

    const ffmpegBinary = resolveFfmpeg();
    lastProgress = {
      ratio: 0,
      renderedSeconds: 0,
      frame: 0,
      duration: analysis.duration,
    };
    failureEvidenceContext = {
      filterPath,
      ffmpegArgs,
      visualScore: config.visualScore,
      resolvedTimeline: execution.timeline,
      sourceAudio: {
        path: audioPath,
        filename: analysis.filename,
        sha256: sourceHash,
        sizeBytes: analysis.sizeBytes,
        duration: analysis.duration,
        formatName: analysis.formatName,
        bitrate: analysis.bitrate,
        audio: analysis.audio,
      },
      sourceImage: imagePath
        ? { path: imagePath, filename: path.basename(imagePath) }
        : null,
      visualCompiler: filter.visualCompiler,
    };

    hooks.onPhase?.("rendering", `Rendering the resolved timeline · ${outputProfile.label}…`);
    let progressBuffer = "";
    await runProcess(ffmpegBinary, ffmpegArgs, {
      cwd: tempDirectory,
      signal,
      collectStdout: false,
      onStdout(chunk) {
        progressBuffer += chunk;
        const lines = progressBuffer.split(/\r?\n/);
        progressBuffer = lines.pop() || "";
        for (const line of lines) {
          const frameMatch = line.match(/^frame=(\d+)$/);
          if (frameMatch) {
            lastProgress = {
              ...lastProgress,
              frame: Number(frameMatch[1]),
            };
            continue;
          }

          const match = line.match(/^out_time_(?:us|ms)=(\d+)$/);
          if (!match) continue;
          const renderedSeconds = Number(match[1]) / 1_000_000;
          const ratio = Math.max(0, Math.min(0.995, renderedSeconds / analysis.duration));
          lastProgress = {
            ...lastProgress,
            ratio,
            renderedSeconds,
          };
          hooks.onProgress?.({ ratio, renderedSeconds, duration: analysis.duration });
        }
      },
    });

    hooks.onPhase?.("validating", "Reading the finished receipt…");
    const outputMedia = await probeRenderedOutput(outputPath);
    if (!outputMedia.video || !outputMedia.audio) {
      throw new Error("The rendered file is missing a video or audio stream.");
    }
    if (
      outputMedia.video.width !== witnessWindow.evidence.width ||
      outputMedia.video.height !== witnessWindow.evidence.height
    ) {
      throw new Error(
        `Witness Window expected ${witnessWindow.evidence.width}x${witnessWindow.evidence.height} but transport contains ${outputMedia.video.width}x${outputMedia.video.height}.`,
      );
    }
    if (outputMedia.video.pixelFormat !== witnessWindow.evidence.pixelFormat) {
      throw new Error(
        `Witness Window expected pixel format ${witnessWindow.evidence.pixelFormat} but transport contains ${String(outputMedia.video.pixelFormat)}.`,
      );
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
    const subtitleSidecars = await writeSubtitleSidecars({
      outputPath,
      cues: filter.lyricTrack.cues,
      mediaDuration: analysis.duration,
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
        rendererPolicy: execution.timeline.rendererPolicy || null,
        scoreSidecar: path.basename(sidecars.scorePath),
        timelineSidecar: path.basename(sidecars.timelinePath),
      },
      treatment: {
        title: title || path.parse(analysis.filename).name,
        artist: artist || null,
        garment: { id: preset.id, name: preset.name },
        typography: filter.typographyEvidence,
        userImage: imagePath ? path.basename(imagePath) : null,
        wordsIncluded: filter.lyricTrack.cues.length > 0 || filter.lyricGhostPlan.apparitions.length > 0,
        wordLineCount: filter.lyricTrack.lines.length,
        lyricGhosts: filter.lyricGhostPlan.apparitions.length
          ? {
              policyVersion: filter.lyricGhostPlan.policyVersion,
              semanticTimingAuthority: filter.lyricGhostPlan.semanticTimingAuthority,
              fragmentCount: filter.lyricGhostPlan.fragments.length,
              apparitionCount: filter.lyricGhostPlan.apparitions.length,
              planSha256: filter.lyricGhostPlan.hash,
            }
          : null,
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
        witnessWindow: filter.witnessWindowEvidence,
        visualCompiler: filter.visualCompiler,
        transportEncoding: transportReceipt(outputProfile, encodeAudioPlan),
        sourceAudioHandling: {
          mode: encodeAudioPlan.mode,
          codec: encodeAudioPlan.codec,
          statement: encodeAudioPlan.statement,
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
        subtitles: {
          language: "en",
          cueCount: subtitleSidecars.cueCount,
          srt: {
            filename: path.basename(subtitleSidecars.srtPath),
            sha256: subtitleSidecars.srtSha256,
          },
          vtt: {
            filename: path.basename(subtitleSidecars.vttPath),
            sha256: subtitleSidecars.vttSha256,
          },
        },
      },
      validation: {
        playableStreamsPresent: true,
        fullTimelineCovered: true,
        continuousFilterGraph: true,
        witnessWindowVerified: true,
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
      srtPath: subtitleSidecars.srtPath,
      vttPath: subtitleSidecars.vttPath,
      receipt,
      analysis,
    };
  } catch (error) {
    if (error?.processFailure && failureEvidenceContext) {
      try {
        let sourceImage = failureEvidenceContext.sourceImage;
        if (imagePath) {
          const [imageHashResult, imageProbeResult] = await Promise.allSettled([
            hashFile(imagePath),
            probeMedia(imagePath),
          ]);
          sourceImage = {
            path: imagePath,
            filename: path.basename(imagePath),
            sha256:
              imageHashResult.status === "fulfilled"
                ? imageHashResult.value
                : null,
            ...(imageProbeResult.status === "fulfilled"
              ? imageProbeResult.value
              : {}),
          };
        }

        await writeRenderFailureBundle({
          outputPath,
          error,
          ...failureEvidenceContext,
          sourceImage,
          buildInfo,
          jobId,
          startedAt,
          lastProgress,
        });
      } catch (failureEvidenceError) {
        error.failureEvidenceError =
          failureEvidenceError instanceof Error
            ? failureEvidenceError.message
            : String(failureEvidenceError);
      }
    }

    await Promise.all([
      safeUnlink(outputPath),
      removeCanonicalExecutionSidecars(outputPath),
      removeSubtitleSidecars(outputPath),
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
  applyWitnessWindowToGraph,
  renderVideo,
  renderResolvedTimelineVideo,
};
