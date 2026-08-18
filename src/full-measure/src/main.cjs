const path = require("node:path");
const fs = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
} = require("electron");
const {
  autoSyncLyrics,
  discoverLyricSidecar,
  saveLyricSidecar,
} = require("./align/auto-sync.cjs");
const {
  prepareLyrics,
  summarizeLyricPreparation,
} = require("./align/lyric-foundry.cjs");
const {
  cuesToLrc,
  extractLyricLines,
} = require("./align/matcher.cjs");
const {
  installListenerPack,
  listenerPackStatus,
} = require("./align/listener-pack.cjs");
const { createCandidateSession } = require("./candidate-session.cjs");
const { appendFieldWitnessReceipt } = require("./memory/field-witness-receipt.cjs");
const { archiveSuccessfulRender } = require("./memory/receipt-archive.cjs");
const { inspectAudio } = require("./render/analyze.cjs");
const {
  MAX_CUES,
  MAX_LYRIC_TEXT,
  parseClock,
  summarizeLyricTrack,
} = require("./render/lyrics.cjs");
const { renderVideo } = require("./render/render.cjs");
const { listToastFeels } = require("./toast-feels.cjs");
const buildInfo = require("./build-info.cjs");

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac"]);
const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
]);
const LYRIC_EXTENSIONS = new Set([
  ".lrc",
  ".srt",
  ".vtt",
  ".json",
  ".txt",
]);

let mainWindow = null;
let activeRender = null;
let activeListen = null;
let activeListenerInstall = null;
let lastFieldRender = null;
const candidateSession = createCandidateSession();

function listenerRoot() {
  return path.join(app.getPath("userData"), "listener");
}

function fieldWitnessRoot() {
  return path.join(app.getPath("userData"), "field-witness");
}

function safeBaseName(value) {
  return String(value || "full-measure")
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 96);
}

async function assertLocalFile(filePath, allowedExtensions, label) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error(`Choose a ${label} first.`);
  }
  const resolved = path.resolve(filePath);
  if (!allowedExtensions.has(path.extname(resolved).toLowerCase())) {
    throw new Error(`That ${label} format is not supported in this alpha.`);
  }
  const stat = await fs.stat(resolved);
  if (!stat.isFile()) throw new Error(`The selected ${label} is not a file.`);
  return resolved;
}

async function askFieldWitnessClaim(message, detail) {
  const result = await dialog.showMessageBox(mainWindow, {
    type: "question",
    title: "Alpha.9 field witness",
    message,
    detail,
    buttons: ["Yes", "No", "Cancel witness"],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  });
  if (result.response === 2) return null;
  return result.response === 0;
}

async function captureFieldWitness() {
  if (activeRender || activeListen || activeListenerInstall) {
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Alpha.9 field witness",
      message: "Finish the active Toaster job first.",
      detail: "Field witness evidence is only recorded after a completed accepted render.",
      buttons: ["OK"],
    });
    return null;
  }
  if (!lastFieldRender?.receiptSha256) {
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Alpha.9 field witness",
      message: "No accepted render is armed for field witness yet.",
      detail: "Complete the final render for this field session, then press Ctrl+Shift+W.",
      buttons: ["OK"],
    });
    return null;
  }

  const claims = {};
  const questions = [
    [
      "aggressiveRenderCompleted",
      "Did the aggressive render complete without the former FFmpeg/parser failure?",
      "Answer for the aggressive lane you exercised earlier in this same field session (MADD CLOWN preferred; Risky Hybrid, Wire Heat, or Burnt Halo are also valid).",
    ],
    [
      "lowAndSlowExpressiveReachPreserved",
      "Did Low & Slow preserve meaningful full-width climax expansion?",
      "The positive control should keep expressive reach rather than collapsing back into a squared-off field.",
    ],
    [
      "listenerDraftPreserved",
      "After closing and reopening Listener, were your exact human timing edits preserved?",
      "This is the close → reopen durability gate. Ordinary Listen Closer must not replace your in-progress human timing work.",
    ],
    [
      "relistenHumanAnchorsPreserved",
      "After explicit Re-listen, were your human anchors preserved?",
      "Machine-owned evidence may lawfully change; the human anchors themselves must remain authoritative.",
    ],
  ];

  for (const [key, message, detail] of questions) {
    const answer = await askFieldWitnessClaim(message, detail);
    if (answer === null) return null;
    claims[key] = answer;
  }

  const witness = await appendFieldWitnessReceipt({
    rootDir: fieldWitnessRoot(),
    renderReceiptSha256: lastFieldRender.receiptSha256,
    buildHeadSha: buildInfo.commit,
    claims,
    note: null,
  });

  await dialog.showMessageBox(mainWindow, {
    type: witness.passed ? "info" : "warning",
    title: "Alpha.9 field witness recorded",
    message: witness.passed
      ? "All four alpha.9 trust gates were witnessed PASS."
      : "Field witness recorded with at least one open gate.",
    detail: [
      `Lane bound to receipt: ${witness.laneId}`,
      `Build: ${witness.buildHeadSha}`,
      `Render receipt: ${witness.renderReceiptSha256}`,
      `Witness id: ${witness.witnessId}`,
    ].join("\n"),
    buttons: ["OK"],
  });
  return witness;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#09080b",
    title: "The Haunted Toaster",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (
      input.type === "keyDown" &&
      input.control &&
      input.shift &&
      String(input.key || "").toLowerCase() === "w"
    ) {
      event.preventDefault();
      void captureFieldWitness().catch(async (error) => {
        await dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "Field witness could not be recorded",
          message: String(error?.message || error || "Unknown field witness error."),
          detail: "The completed render remains unchanged. No field witness receipt was written.",
          buttons: ["OK"],
        });
      });
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function assertCandidateAvailable() {
  if (activeRender || activeListen || activeListenerInstall) {
    throw new Error("Finish the current render, listening, or setup job first.");
  }
}

function registerIpc() {
  candidateSession.registerIpc(ipcMain, assertCandidateAvailable);
  ipcMain.handle("app:toast-feels", () => listToastFeels());

  ipcMain.handle("dialog:choose-audio", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose the finished song",
      properties: ["openFile"],
      filters: [
        {
          name: "Audio",
          extensions: ["mp3", "wav", "m4a", "aac", "flac"],
        },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("dialog:choose-image", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose an optional image",
      properties: ["openFile"],
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"],
        },
      ],
    });
    if (result.canceled) return null;
    const imagePath = await assertLocalFile(
      result.filePaths[0],
      IMAGE_EXTENSIONS,
      "image",
    );
    candidateSession.noteImage(imagePath);
    return imagePath;
  });

  ipcMain.handle("dialog:choose-lyrics", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose timed or plain lyrics",
      properties: ["openFile"],
      filters: [
        {
          name: "Timed lyrics and captions",
          extensions: ["lrc", "srt", "vtt", "json", "txt"],
        },
      ],
    });
    if (result.canceled) return null;

    const lyricsPath = await assertLocalFile(
      result.filePaths[0],
      LYRIC_EXTENSIONS,
      "lyrics file",
    );
    const stat = await fs.stat(lyricsPath);
    if (stat.size > 2_000_000) {
      throw new Error("That lyrics file is larger than the 2 MB safety limit.");
    }
    return {
      path: lyricsPath,
      filename: path.basename(lyricsPath),
      content: await fs.readFile(lyricsPath, "utf8"),
    };
  });

  ipcMain.handle("dialog:choose-output", async (_event, suggestedName) => {
    const videosDirectory = app.getPath("videos");
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Save the full music video",
      defaultPath: path.join(
        videosDirectory,
        `${safeBaseName(suggestedName) || "full-measure"}.mp4`,
      ),
      filters: [{ name: "MP4 video", extensions: ["mp4"] }],
      properties: ["createDirectory", "showOverwriteConfirmation"],
    });
    return result.canceled ? null : result.filePath;
  });

  ipcMain.handle("media:inspect", async (_event, filePath) => {
    const audioPath = await assertLocalFile(
      filePath,
      AUDIO_EXTENSIONS,
      "song",
    );
    const analysis = await inspectAudio(audioPath);
    candidateSession.noteAudio(audioPath, analysis);
    return analysis;
  });

  ipcMain.handle("lyrics:inspect", (_event, value, duration) =>
    summarizeLyricTrack(value, duration),
  );

  ipcMain.on("lyrics:prepare-listener", (event, rawSource) => {
    const preparedResult = prepareLyrics(
      String(rawSource || "").slice(0, MAX_LYRIC_TEXT),
    );
    event.returnValue = {
      ...summarizeLyricPreparation(preparedResult),
      prepared: preparedResult.prepared.map(
        ({ lineId, text, sourceLines, decisions }) => ({
          lineId,
          text,
          sourceLines,
          decisions,
        }),
      ),
      removed: preparedResult.removed,
    };
  });

  ipcMain.handle("lyrics:discover-sidecar", async (_event, filePath) => {
    const audioPath = await assertLocalFile(
      filePath,
      AUDIO_EXTENSIONS,
      "song",
    );
    return discoverLyricSidecar(audioPath);
  });

  ipcMain.handle("lyrics:save-sidecar", async (_event, config) => {
    const audioPath = await assertLocalFile(
      config?.audioPath,
      AUDIO_EXTENSIONS,
      "song",
    );
    const content = String(config?.content || "").slice(0, MAX_LYRIC_TEXT);
    if (!content.trim()) throw new Error("There are no timed lyrics to save.");

    let result = await saveLyricSidecar(audioPath, content);
    if (!result.exists) return result;

    const confirmation = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      title: "Replace the existing lyric sidecar?",
      message: `${path.basename(result.path)} already exists.`,
      detail:
        "Replacing it will use the reviewed Full Measure timing. Cancel keeps the existing file unchanged.",
      buttons: ["Keep existing", "Replace with reviewed timing"],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    if (confirmation.response !== 1) {
      return { ...result, cancelled: true };
    }
    result = await saveLyricSidecar(audioPath, content, { overwrite: true });
    return result;
  });

  ipcMain.handle("lyrics:format-lrc", (_event, config) => {
    const cues = Array.isArray(config?.cues)
      ? config.cues.slice(0, MAX_CUES).map((cue, lineIndex) => {
          const start = parseClock(cue?.start);
          return {
            lineIndex,
            text: String(cue?.text || "").slice(0, 1_000),
            start,
          };
        })
      : [];
    return cuesToLrc(cues, {
      title: String(config?.title || "").slice(0, 160),
      artist: String(config?.artist || "").slice(0, 160),
      note: String(config?.note || "").slice(0, 240),
    });
  });

  ipcMain.handle("lyrics:manual-track", (_event, value) => {
    const lines = extractLyricLines(
      String(value || "").slice(0, MAX_LYRIC_TEXT),
    );
    return {
      schema: "full-measure.lyric-alignment.v1",
      createdAt: new Date().toISOString(),
      engine: {
        name: "Human tap-sync",
        whisperCppVersion: null,
        modelId: null,
        language: null,
        source: "human",
      },
      cues: lines.map((text, lineIndex) => ({
        lineIndex,
        text,
        start: null,
        end: null,
        status: "unmatched",
        confidence: 0,
        similarity: 0,
        heard: null,
      })),
      transcriptEntryCount: 0,
      lineCount: lines.length,
      matchedCount: 0,
      reviewCount: lines.length,
      coverage: 0,
      counts: {
        high: 0,
        medium: 0,
        low: 0,
        unmatched: lines.length,
      },
      reviewRequired: lines.length > 0,
      lrc: "[by:Full Measure Listener]\n",
    };
  });

  ipcMain.handle("listener:status", () =>
    listenerPackStatus(listenerRoot()),
  );

  ipcMain.handle("listener:install", async (event) => {
    if (activeListenerInstall) {
      throw new Error("The Listener pack is already being installed.");
    }
    if (activeListen || activeRender) {
      throw new Error("Finish the current listening or render job first.");
    }

    const controller = new AbortController();
    activeListenerInstall = controller;
    try {
      return await installListenerPack(listenerRoot(), {
        signal: controller.signal,
        onProgress(progress) {
          if (!event.sender.isDestroyed()) {
            event.sender.send("listener:install-progress", progress);
          }
        },
      });
    } finally {
      activeListenerInstall = null;
    }
  });

  ipcMain.handle("listener:cancel-install", () => {
    if (!activeListenerInstall) return false;
    activeListenerInstall.abort();
    return true;
  });

  ipcMain.handle("lyrics:auto-sync", async (event, config) => {
    if (activeListen) {
      throw new Error("The toaster is already listening to a song.");
    }
    if (activeRender || activeListenerInstall) {
      throw new Error("Finish the current render or setup job first.");
    }

    const audioPath = await assertLocalFile(
      config?.audioPath,
      AUDIO_EXTENSIONS,
      "song",
    );
    const lyrics = String(config?.lyrics || "").slice(0, MAX_LYRIC_TEXT);
    const controller = new AbortController();
    activeListen = controller;
    try {
      return await autoSyncLyrics(
        {
          ...config,
          audioPath,
          lyrics,
          listenerRoot: listenerRoot(),
        },
        {
          signal: controller.signal,
          onPhase(phase, message) {
            if (!event.sender.isDestroyed()) {
              event.sender.send("lyrics:sync-phase", { phase, message });
            }
          },
          onProgress(progress) {
            if (!event.sender.isDestroyed()) {
              event.sender.send("lyrics:sync-progress", progress);
            }
          },
        },
      );
    } finally {
      activeListen = null;
    }
  });

  ipcMain.handle("lyrics:cancel-sync", () => {
    if (!activeListen) return false;
    activeListen.abort();
    return true;
  });

  ipcMain.handle("media:file-url", async (_event, filePath) => {
    const audioPath = await assertLocalFile(
      filePath,
      AUDIO_EXTENSIONS,
      "song",
    );
    return pathToFileURL(audioPath).href;
  });

  ipcMain.handle("render:start", async (event, config) => {
    if (activeRender) {
      throw new Error("A render is already in progress.");
    }
    if (activeListen || activeListenerInstall) {
      throw new Error("Finish the current listening or setup job first.");
    }

    const audioPath = await assertLocalFile(
      config.audioPath,
      AUDIO_EXTENSIONS,
      "song",
    );
    const imagePath = config.imagePath
      ? await assertLocalFile(config.imagePath, IMAGE_EXTENSIONS, "image")
      : null;
    const outputPath = path.resolve(config.outputPath);
    const selectedExecution = candidateSession.executionForRender({
      audioPath,
      imagePath,
      presetId: config.presetId,
      toastFeelId: config.toastFeelId,
    });
    const controller = new AbortController();
    activeRender = controller;

    try {
      const renderResult = await renderVideo(
        {
          ...config,
          ...(selectedExecution || {}),
          audioPath,
          imagePath,
          outputPath,
        },
        {
          signal: controller.signal,
          onPhase(phase, message) {
            if (!event.sender.isDestroyed()) {
              event.sender.send("render:phase", { phase, message });
            }
          },
          onProgress(progress) {
            if (!event.sender.isDestroyed()) {
              event.sender.send("render:progress", progress);
            }
          },
        },
      );

      try {
        const archived = await archiveSuccessfulRender({
          rootDir: fieldWitnessRoot(),
          renderResult,
        });
        lastFieldRender = {
          receiptSha256: archived.receiptSha256,
          laneId: archived.visualIdentity?.toastFeelId || null,
        };
      } catch (error) {
        lastFieldRender = null;
        await dialog.showMessageBox(mainWindow, {
          type: "warning",
          title: "Render completed; field witness archive unavailable",
          message: String(error?.message || error || "The accepted render could not be archived."),
          detail: "Your completed render is unchanged, but Ctrl+Shift+W cannot bind a field witness to it.",
          buttons: ["OK"],
        });
      }

      return renderResult;
    } finally {
      activeRender = null;
    }
  });

  ipcMain.handle("render:cancel", () => {
    if (!activeRender) return false;
    activeRender.abort();
    return true;
  });

  ipcMain.handle("shell:reveal", async (_event, filePath) => {
    shell.showItemInFolder(path.resolve(filePath));
    return true;
  });

  ipcMain.handle("shell:open", async (_event, filePath) => {
    const error = await shell.openPath(path.resolve(filePath));
    if (error) throw new Error(error);
    return true;
  });

  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("app:build-info", () => ({
    ...buildInfo,
    version: app.getVersion(),
  }));
}

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("org.staticcollective.fullmeasure");
  }
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
