const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  alignLyricsToTranscript,
  cuesToLrc,
} = require("./matcher.cjs");
const {
  alignLyricsToTranscriptWithAnchors,
} = require("./anchor-guided.cjs");
const {
  normalizeAnchors,
  prepareLyrics,
  summarizeLyricPreparation,
  summarizeRelistenDelta,
} = require("./lyric-foundry.cjs");
const {
  MODEL_ID,
  WHISPER_CPP_VERSION,
  listenerPackStatus,
} = require("./listener-pack.cjs");
const {
  resolveFfmpeg,
  runProcess,
} = require("../render/tooling.cjs");

const DEFAULT_PLACEMENT_LEAD_SECONDS = 0.22;

function recommendedThreadCount() {
  const available = os.availableParallelism?.() || os.cpus().length || 4;
  return Math.max(2, Math.min(8, available - 1));
}

function whisperProgress(text) {
  const matches = [...String(text || "").matchAll(/(\d{1,3})\s*%/g)];
  if (!matches.length) return null;
  return Math.max(
    0,
    Math.min(100, Number(matches[matches.length - 1][1])),
  );
}

async function prepareListeningAudio(audioPath, outputPath, signal) {
  await runProcess(
    resolveFfmpeg(),
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-i",
      audioPath,
      "-vn",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      outputPath,
    ],
    { signal },
  );
}

async function readWhisperOutput(prefix) {
  const candidates = [`${prefix}.json`, prefix];
  for (const candidate of candidates) {
    try {
      return JSON.parse(await fs.readFile(candidate, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) {
        throw error;
      }
    }
  }
  throw new Error("The local listener finished without a readable timing record.");
}

function anchorsForGuidedMatcher(preparedLines, anchors) {
  const byId = new Map(preparedLines.map((line, lineIndex) => [line.lineId, { line, lineIndex }]));
  return anchors.flatMap((anchor) => {
    const resolved = byId.get(anchor.lineId);
    if (!resolved) return [];
    return [{
      lineIndex: resolved.lineIndex,
      text: resolved.line.text,
      time: anchor.mediaTimeMs / 1000,
    }];
  });
}

function attachLineIds(alignment, preparedLines) {
  return {
    ...alignment,
    cues: (alignment.cues || []).map((cue, index) => ({
      ...cue,
      lineId: preparedLines[Number.isInteger(cue.lineIndex) ? cue.lineIndex : index]?.lineId || null,
    })),
  };
}

async function autoSyncLyrics(config, hooks = {}) {
  const audioPath = path.resolve(config.audioPath);
  const lyrics = String(config.lyrics || "");
  const preparedResult = prepareLyrics(lyrics);
  const preparedLines = preparedResult.prepared;
  const preparedLyrics = preparedLines.map((line) => line.text).join("\n");
  if (!preparedLines.length) {
    throw new Error("Paste the known lyrics before asking the toaster to listen.");
  }

  const anchors = normalizeAnchors(
    Array.isArray(config.anchors) ? config.anchors : [],
    preparedLines,
  );
  const guidedAnchors = anchorsForGuidedMatcher(preparedLines, anchors);

  const pack =
    config.pack ||
    (await listenerPackStatus(config.listenerRoot));
  if (!pack.ready || !pack.binaryPath || !pack.modelPath) {
    const error = new Error(
      pack.installSupported
        ? "Install the optional local Listener pack before auto-syncing."
        : "The local Listener is not configured on this system.",
    );
    error.code = "LISTENER_PACK_REQUIRED";
    error.listenerStatus = pack;
    throw error;
  }

  const temporary = await fs.mkdtemp(
    path.join(os.tmpdir(), "full-measure-listen-"),
  );
  const preparedAudioPath = path.join(temporary, "song-listening.wav");
  const outputPrefix = path.join(temporary, "whisper-timing");

  try {
    hooks.onPhase?.("preparing", "Preparing a private listening copy…");
    hooks.onProgress?.({
      phase: "preparing",
      ratio: 0.03,
      percent: 3,
    });
    await (hooks.prepareAudio || prepareListeningAudio)(
      audioPath,
      preparedAudioPath,
      hooks.signal,
    );

    hooks.onPhase?.("listening", "Listening for the sung words…");
    let lastPercent = -1;
    const onWhisperOutput = (chunk) => {
      const percent = whisperProgress(chunk);
      if (percent === null || percent === lastPercent) return;
      lastPercent = percent;
      hooks.onProgress?.({
        phase: "listening",
        ratio: 0.05 + (percent / 100) * 0.82,
        percent,
      });
    };

    await (hooks.runListener || runProcess)(
      pack.binaryPath,
      [
        "-m",
        pack.modelPath,
        "-f",
        preparedAudioPath,
        "-l",
        config.language || "en",
        "-t",
        String(config.threads || recommendedThreadCount()),
        "-ojf",
        "-of",
        outputPrefix,
        "-ml",
        "1",
        "-sow",
        "-np",
        "-pp",
      ],
      {
        signal: hooks.signal,
        collectStdout: false,
        onStdout: onWhisperOutput,
        onStderr: onWhisperOutput,
      },
    );

    hooks.onPhase?.("matching", "Matching the written lyrics to the witness…");
    hooks.onProgress?.({
      phase: "matching",
      ratio: 0.9,
      percent: 90,
    });
    const transcript = await readWhisperOutput(outputPrefix);
    const placementLeadSeconds = Number.isFinite(
      Number(config.placementLeadSeconds),
    )
      ? Math.max(-2, Math.min(2, Number(config.placementLeadSeconds)))
      : DEFAULT_PLACEMENT_LEAD_SECONDS;
    const rawAlignment = guidedAnchors.length
      ? alignLyricsToTranscriptWithAnchors(
          preparedLyrics,
          transcript,
          Number(config.duration) || 0,
          {
            leadSeconds: placementLeadSeconds,
            anchors: guidedAnchors,
          },
        )
      : alignLyricsToTranscript(
          preparedLyrics,
          transcript,
          Number(config.duration) || 0,
          { leadSeconds: placementLeadSeconds },
        );
    const alignment = attachLineIds(rawAlignment, preparedLines);
    if (!alignment.transcriptEntryCount) {
      throw new Error(
        "The listener did not detect usable vocals in this mix. Keep the lyrics, use tap-sync, or try a vocal stem.",
      );
    }

    const note = alignment.reviewRequired
      ? `${alignment.reviewCount} of ${alignment.lineCount} lines need review`
      : `${alignment.lineCount} lines aligned locally`;
    const lrc = cuesToLrc(alignment.cues, {
      title: config.title,
      artist: config.artist,
      note,
    });
    const lyricPreparation = {
      ...summarizeLyricPreparation(preparedResult),
      prepared: preparedLines.map(({ lineId, text, sourceLines, decisions }) => ({ lineId, text, sourceLines, decisions })),
      removed: preparedResult.removed,
    };
    const relistenDelta = summarizeRelistenDelta(
      Array.isArray(config.previousEvidence) ? config.previousEvidence : [],
      alignment.cues,
      anchors,
    );

    hooks.onProgress?.({
      phase: "ready",
      ratio: 1,
      percent: 100,
    });
    hooks.onPhase?.(
      "ready",
      alignment.reviewRequired
        ? `Listening pass complete · ${alignment.reviewCount} lines need a human ear`
        : "Listening pass complete · every line placed",
    );

    return {
      schema: "full-measure.lyric-alignment.v1",
      createdAt: new Date().toISOString(),
      engine: {
        name: "Full Measure Listener",
        whisperCppVersion:
          pack.whisperCppVersion || WHISPER_CPP_VERSION,
        modelId: pack.modelId || MODEL_ID,
        language: config.language || "en",
        source: pack.source,
        placementLeadSeconds,
      },
      ...alignment,
      humanAnchors: anchors,
      lyricPreparation,
      relistenDelta,
      lrc,
    };
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

function sidecarPathForAudio(audioPath) {
  const parsed = path.parse(path.resolve(audioPath));
  return path.join(parsed.dir, `${parsed.name}.lrc`);
}

async function discoverLyricSidecar(audioPath) {
  const sidecarPath = sidecarPathForAudio(audioPath);
  try {
    const stat = await fs.stat(sidecarPath);
    if (!stat.isFile() || stat.size > 2_000_000) return null;
    return {
      path: sidecarPath,
      filename: path.basename(sidecarPath),
      content: await fs.readFile(sidecarPath, "utf8"),
    };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function saveLyricSidecar(audioPath, lrc, options = {}) {
  const sidecarPath = sidecarPathForAudio(audioPath);
  const temporaryPath = `${sidecarPath}.full-measure-${process.pid}.tmp`;
  const backupPath = `${sidecarPath}.full-measure-backup-${Date.now()}`;
  if (!options.overwrite) {
    try {
      await fs.access(sidecarPath);
      return {
        saved: false,
        exists: true,
        path: sidecarPath,
      };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  await fs.writeFile(temporaryPath, String(lrc || ""), {
    encoding: "utf8",
    flag: "wx",
  });
  let backupCreated = false;
  try {
    if (options.overwrite) {
      try {
        await fs.rename(sidecarPath, backupPath);
        backupCreated = true;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    await fs.rename(temporaryPath, sidecarPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    if (backupCreated) {
      await fs.rename(backupPath, sidecarPath).catch(() => {});
    }
    throw error;
  }
  if (backupCreated) await fs.rm(backupPath, { force: true }).catch(() => {});
  return {
    saved: true,
    exists: false,
    path: sidecarPath,
  };
}

module.exports = {
  DEFAULT_PLACEMENT_LEAD_SECONDS,
  anchorsForGuidedMatcher,
  attachLineIds,
  autoSyncLyrics,
  discoverLyricSidecar,
  prepareListeningAudio,
  readWhisperOutput,
  recommendedThreadCount,
  saveLyricSidecar,
  sidecarPathForAudio,
  whisperProgress,
};
