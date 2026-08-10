const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { createProceduralPpm } = require("./artwork.cjs");
const { inspectAudio, probeMedia } = require("./analyze.cjs");
const {
  createLyricTrack,
  normalizeCueTimeline,
  normalizeLyrics,
} = require("./lyrics.cjs");
const { resolveLyricGhostPlan } = require("./lyric-ghosts.cjs");
const { getPreset } = require("./presets.cjs");
const { hashFile, writeReceipt } = require("./receipt.cjs");
const { resolveFfmpeg, runProcess } = require("./tooling.cjs");

const COPYABLE_MP4_AUDIO = new Set(["aac", "mp3", "alac", "ac3", "eac3"]);

function cleanText(value, maxLength = 8_000) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function cleanLyricProvenance(value) {
  if (!value || typeof value !== "object") return null;
  const mode = cleanText(value.mode, 64);
  if (!mode) return null;

  const engine =
    value.engine && typeof value.engine === "object"
      ? {
          name: cleanText(value.engine.name, 96) || null,
          whisperCppVersion:
            cleanText(value.engine.whisperCppVersion, 48) || null,
          modelId: cleanText(value.engine.modelId, 96) || null,
          language: cleanText(value.engine.language, 24) || null,
        }
      : null;
  const alignment =
    value.alignment && typeof value.alignment === "object"
      ? {
          lineCount: Math.max(0, Number(value.alignment.lineCount) || 0),
          matchedCount: Math.max(0, Number(value.alignment.matchedCount) || 0),
          reviewCount: Math.max(0, Number(value.alignment.reviewCount) || 0),
          humanCorrectedCount: Math.max(
            0,
            Number(value.alignment.humanCorrectedCount) || 0,
          ),
        }
      : null;

  return {
    mode,
    engine,
    alignment,
    sidecarFilename: value.sidecarFilename
      ? path.win32.basename(
          path.posix.basename(cleanText(value.sidecarFilename, 260)),
        )
      : null,
  };
}

function audioPlan(codec) {
  if (COPYABLE_MP4_AUDIO.has(codec)) {
    return {
      mode: "stream-copy",
      codec,
      ffmpegArgs: ["-c:a", "copy"],
      statement:
        "The source audio stream was copied into the MP4 without re-encoding.",
    };
  }

  return {
    mode: "high-quality-container-encode",
    codec: "aac",
    ffmpegArgs: ["-c:a", "aac", "-b:a", "320k"],
    statement:
      "The source performance and timing were preserved; the audio was encoded to 320 kbps AAC for portable MP4 playback.",
  };
}

function phaseHue(section, index, preset) {
  const energyShift = (section.energy - 0.5) * 18;
  const alternating = index % 2 === 0 ? -3 : 4;
  return Number((energyShift + alternating + preset.hueDrift * 0.3).toFixed(2));
}

function assTimestamp(seconds) {
  const centiseconds = Math.max(0, Math.round(Number(seconds) * 100));
  const hours = Math.floor(centiseconds / 360_000);
  const remainder = centiseconds - hours * 360_000;
  const minutes = Math.floor(remainder / 6_000);
  const final = remainder - minutes * 6_000;
  const wholeSeconds = Math.floor(final / 100);
  const fraction = final % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(
    wholeSeconds,
  ).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
}

function assText(value) {
  return cleanText(value, 1_000)
    .replace(/\\/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\r?\n/g, "\\N");
}

function assEvent(start, end, style, text, override = "") {
  let startCenti = Math.max(0, Math.round(Number(start) * 100));
  let endCenti = Math.max(startCenti + 1, Math.round(Number(end) * 100));

  const formatCenti = (centiseconds) => {
    const hours = Math.floor(centiseconds / 360_000);
    const remainder = centiseconds - hours * 360_000;
    const minutes = Math.floor(remainder / 6_000);
    const final = remainder - minutes * 6_000;
    const wholeSeconds = Math.floor(final / 100);
    const fraction = final % 100;
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      wholeSeconds,
    ).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
  };

  return [
    "Dialogue: 0",
    formatCenti(startCenti),
    formatCenti(endCenti),
    style,
    "",
    "0",
    "0",
    "0",
    "",
    `${override}${assText(text)}`,
  ].join(",");
}

function ghostOverride(apparition, width, height) {
  const x = Math.round(width * apparition.x);
  const y = Math.round(height * apparition.y);
  const scale = Math.round(apparition.scale * 100);
  const alpha = Math.max(0, Math.min(255, Math.round((1 - apparition.opacity) * 255)))
    .toString(16)
    .toUpperCase()
    .padStart(2, "0");
  const common = `\\pos(${x},${y})\\frz${apparition.rotationDegrees}\\fscx${scale}\\fscy${scale}\\alpha&H${alpha}&`;
  if (apparition.treatmentId === "photocopy-flash") {
    return `{${common}\\bord3\\shad0\\blur0.2}`;
  }
  if (apparition.treatmentId === "fragment-smear") {
    return `{${common}\\fax0.18\\blur3.2\\bord0}`;
  }
  return `{${common}\\move(${x},${y},${Math.round(x + width * 0.035)},${Math.round(y - height * 0.018)})\\blur1.4}`;
}

async function writeAssOverlay({
  tempDirectory,
  analysis,
  title,
  artist,
  lyricTrack,
  lyricGhostPlan,
  width,
  height,
}) {
  const titleSize = Math.round(height * 0.044);
  const artistSize = Math.round(height * 0.021);
  const lyricSize = Math.round(height * 0.043);
  const ghostSize = Math.round(height * 0.052);
  const markSize = Math.round(height * 0.014);
  const titleEnd = Math.min(7, analysis.duration);
  const events = [
    assEvent(
      0,
      titleEnd,
      "Title",
      title || path.parse(analysis.filename).name,
      "{\\fad(220,380)}",
    ),
  ];

  if (artist && titleEnd > 0.5) {
    events.push(
      assEvent(0.5, titleEnd, "Artist", artist, "{\\fad(220,380)}"),
    );
  }

  for (const apparition of lyricGhostPlan?.apparitions || []) {
    events.push(
      assEvent(
        apparition.start,
        apparition.end,
        "Ghost",
        apparition.text,
        ghostOverride(apparition, width, height),
      ),
    );
  }

  const lyricCues = normalizeCueTimeline(lyricTrack.cues, analysis.duration);
  for (const cue of lyricCues) {
    const size =
      cue.text.length > 64
        ? Math.round(height * 0.031)
        : cue.text.length > 42
          ? Math.round(height * 0.037)
          : lyricSize;
    events.push(
      assEvent(
        cue.start,
        cue.end,
        "Lyrics",
        cue.text,
        `{\\fs${size}\\fad(140,180)}`,
      ),
    );
  }

  events.push(
    assEvent(
      0,
      analysis.duration,
      "Mark",
      "FULL MEASURE  //  VIDEO RECEIPT",
    ),
  );

  const content = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "ScaledBorderAndShadow: yes",
    "WrapStyle: 2",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Title,Arial,${titleSize},&H00FFFFFF,&H00FFFFFF,&H88000000,&H00000000,-1,0,0,0,100,100,0,0,1,1.5,2,7,${Math.round(
      width * 0.047,
    )},40,${Math.round(height * 0.072)},1`,
    `Style: Artist,Arial,${artistSize},&H3DFFFFFF,&H3DFFFFFF,&H99000000,&H00000000,0,0,0,0,100,100,0,0,1,1,1,7,${Math.round(
      width * 0.048,
    )},40,${Math.round(height * 0.13)},1`,
    `Style: Lyrics,Arial,${lyricSize},&H00FFFFFF,&H00FFFFFF,&H90000000,&H96000000,-1,0,0,0,100,100,0,0,3,1.2,1.5,2,${Math.round(
      width * 0.08,
    )},${Math.round(width * 0.08)},${Math.round(height * 0.31)},1`,
    `Style: Ghost,Arial,${ghostSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,1.6,0,1,0,0,5,0,0,0,1`,
    `Style: Mark,Arial,${markSize},&H77FFFFFF,&H77FFFFFF,&HAA000000,&H00000000,0,0,0,0,100,100,0.5,0,1,0.8,1,3,20,${Math.round(
      width * 0.026,
    )},${Math.round(height * 0.026)},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
  const fileName = "text-overlay.ass";
  await fs.writeFile(path.join(tempDirectory, fileName), content, "utf8");
  return fileName;
}

async function buildFilterGraph({
  tempDirectory,
  analysis,
  preset,
  title,
  artist,
  lyrics,
  hasImage,
  width,
  height,
  fps,
}) {
  const filters = [];
  const waveHeight = Math.max(180, Math.round(height * 0.235));
  const waveY = height - waveHeight - Math.round(height * 0.07);

  filters.push(
    `[0:a]asplit=2[waveAudio][auraAudio]`,
    `[waveAudio]showwaves=s=${width}x${waveHeight}:mode=cline:rate=${fps}:colors=${preset.waveColors.join(
      "|",
    )}:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]`,
    `[wave]pad=${width}:${height}:0:${waveY}:color=black@0.0[waveFull]`,
    `[auraAudio]showwaves=s=${width}x${height}:mode=cline:rate=${fps}:colors=0xFFFFFF:scale=cbrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.10[aura]`,
    `[1:v]noise=alls=${Math.max(
      2,
      Math.round(preset.grain * 0.55),
    )}:allf=t+u,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='1.035+0.018*sin(in_time/5)':x='iw/2-(iw/zoom/2)+sin(in_time/7)*iw*0.012':y='ih/2-(ih/zoom/2)+cos(in_time/(185/30))*ih*0.012':d=1:s=${width}x${height}:fps=${fps},format=rgba[procedural]`,
  );

  let baseLabel = "procedural";
  if (hasImage) {
    filters.push(
      `[2:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='1.025+0.022*sin(in_time/(175/30))':x='iw/2-(iw/zoom/2)+cos(in_time/(230/30))*iw*0.014':y='ih/2-(ih/zoom/2)+sin(in_time/(205/30))*ih*0.014':d=1:s=${width}x${height}:fps=${fps},format=rgba[photo]`,
      `[procedural][photo]blend=all_mode=${preset.blendMode}:all_opacity=${preset.imageOpacity}[baseImage]`,
    );
    baseLabel = "baseImage";
  }

  filters.push(
    `[${baseLabel}]hue=h='${preset.hueDrift}*sin(t*0.045)':s=1.06[drift0]`,
  );

  let phaseLabel = "drift0";
  analysis.sections.forEach((section, index) => {
    const nextLabel = `phase${index + 1}`;
    const hue = phaseHue(section, index, preset);
    filters.push(
      `[${phaseLabel}]hue=h=${hue}:enable='between(t,${section.start.toFixed(
        3,
      )},${section.end.toFixed(3)})'[${nextLabel}]`,
    );
    phaseLabel = nextLabel;
  });

  filters.push(
    `[${phaseLabel}]format=rgba[phaseRgba]`,
    `[phaseRgba][aura]overlay=0:0:shortest=1[spectral]`,
    `[spectral][waveFull]overlay=0:0:shortest=1[stage0]`,
  );

  const lyricTrack = createLyricTrack(lyrics, analysis.duration);
  const lyricGhostPlan = resolveLyricGhostPlan({
    lyrics,
    duration: analysis.duration,
    sections: analysis.sections,
  });
  const subtitleFile = await writeAssOverlay({
    tempDirectory,
    analysis,
    title,
    artist,
    lyricTrack,
    lyricGhostPlan,
    width,
    height,
  });
  filters.push(
    `[stage0]ass=filename='${subtitleFile}':alpha=1,format=yuv420p[vout]`,
  );

  return {
    graph: filters.join(";\n"),
    lyricLines: lyricTrack.lines,
    lyricTrack,
    lyricGhostPlan,
  };
}

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
        await new Promise((resolve) =>
          setTimeout(resolve, 180 * (attempt + 1)),
        );
      }
    }
  }
  throw lastError;
}

async function renderVideo(config, hooks = {}) {
  const audioPath = path.resolve(config.audioPath);
  const outputPath = path.resolve(config.outputPath);
  const imagePath = config.imagePath ? path.resolve(config.imagePath) : null;
  const width = Number(config.width) || 1920;
  const height = Number(config.height) || 1080;
  const fps = Number(config.fps) || 30;
  const preset = getPreset(config.presetId);
  const title = cleanText(config.title, 160);
  const artist = cleanText(config.artist, 160);
  const lyrics = cleanText(config.lyrics, 250_000);
  const lyricProvenance = cleanLyricProvenance(config.lyricProvenance);
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
  const tempDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "full-measure-"),
  );
  const jobId = crypto.randomUUID();
  const startedAt = new Date();

  try {
    hooks.onPhase?.("analysis", "Listening for the song's shape…");
    const analysis = config.analysis || (await inspectAudio(audioPath));
    if (!analysis.audio) throw new Error("No audio stream was found.");

    const sourceHash = await hashFile(audioPath);
    const proceduralPath = path.join(tempDirectory, "garment.ppm");
    await createProceduralPpm(proceduralPath, preset);

    hooks.onPhase?.("weaving", "Weaving the visual garment…");
    const filter = await buildFilterGraph({
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
    const filterPath = path.join(tempDirectory, "render.ffgraph");
    await fs.writeFile(filterPath, `${filter.graph}\n`, "utf8");

    const sourceAudioPlan = audioPlan(analysis.audio.codec);
    const ffmpegArgs = [
      "-y",
      "-hide_banner",
      "-nostdin",
      "-i",
      audioPath,
      "-loop",
      "1",
      "-framerate",
      String(fps),
      "-i",
      proceduralPath,
    ];

    if (imagePath) {
      ffmpegArgs.push(
        "-loop",
        "1",
        "-framerate",
        String(fps),
        "-i",
        imagePath,
      );
    }

    ffmpegArgs.push(
      "-filter_complex_script",
      filterPath,
      "-map",
      "[vout]",
      "-map",
      "0:a:0",
      "-c:v",
      "libx264",
      "-preset",
      config.encoderPreset || "medium",
      "-crf",
      String(config.crf || 19),
      "-profile:v",
      "high",
      "-level",
      "4.2",
      "-pix_fmt",
      "yuv420p",
      ...sourceAudioPlan.ffmpegArgs,
      "-movflags",
      "+faststart",
      "-shortest",
      "-max_interleave_delta",
      "0",
      "-progress",
      "pipe:1",
      "-stats_period",
      "0.5",
      outputPath,
    );

    hooks.onPhase?.("rendering", "Rendering the full measure…");
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
          const ratio = Math.max(
            0,
            Math.min(0.995, renderedSeconds / analysis.duration),
          );
          hooks.onProgress?.({
            ratio,
            renderedSeconds,
            duration: analysis.duration,
          });
        }
      },
    });

    hooks.onPhase?.("validating", "Reading the finished receipt…");
    const outputMedia = await probeRenderedOutput(outputPath);
    if (!outputMedia.video || !outputMedia.audio) {
      throw new Error("The rendered file is missing a video or audio stream.");
    }

    const durationDeltaMs = Math.round(
      Math.abs(outputMedia.duration - analysis.duration) * 1_000,
    );
    if (durationDeltaMs > 250) {
      throw new Error(
        `The output differs from the song by ${durationDeltaMs} ms; the render was not accepted.`,
      );
    }

    const outputHash = await hashFile(outputPath);
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
      treatment: {
        title: title || path.parse(analysis.filename).name,
        artist: artist || null,
        garment: {
          id: preset.id,
          name: preset.name,
        },
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
              lastCueSeconds:
                filter.lyricTrack.cues[filter.lyricTrack.cues.length - 1].end,
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
        elapsedSeconds: Number(
          ((finishedAt.getTime() - startedAt.getTime()) / 1_000).toFixed(3)),
        ),
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
    hooks.onProgress?.({
      ratio: 1,
      renderedSeconds: analysis.duration,
      duration: analysis.duration,
    });

    return {
      jobId,
      outputPath,
      receiptPath,
      receipt,
      analysis,
    };
  } catch (error) {
    await safeUnlink(outputPath);
    throw error;
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

module.exports = {
  assEvent,
  assTimestamp,
  COPYABLE_MP4_AUDIO,
  audioPlan,
  buildFilterGraph,
  cleanLyricProvenance,
  cleanText,
  normalizeLyrics,
  renderVideo,
};
