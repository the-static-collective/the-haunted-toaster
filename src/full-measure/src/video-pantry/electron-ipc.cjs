const path = require("node:path");
const { resolveToasterHome, videoPantryCatalogPath } = require("../toaster-home.cjs");
const { normalizeDigestOperatorId } = require("../render/foreign-material.cjs");
const { admitVideo } = require("./admit.cjs");
const { admitVideoFolder } = require("./import-folder.cjs");
const { loadCatalog } = require("./catalog.cjs");

function registerVideoPantryIpc({
  app,
  dialog,
  ipcMain,
  getMainWindow = () => null,
  candidateSession,
  admitVideoImpl = admitVideo,
  admitVideoFolderImpl = admitVideoFolder,
  loadCatalogImpl = loadCatalog,
} = {}) {
  if (!app || !dialog || !ipcMain || !candidateSession) {
    throw new TypeError("Video pantry IPC requires app, dialog, ipcMain, and candidateSession.");
  }

  const catalogPath = () => videoPantryCatalogPath(resolveToasterHome({ appDataPath: app.getPath("userData") }));
  let currentVideo = candidateSession.state?.().video || null;

  ipcMain.handle("dialog:choose-video", async (_event, options = {}) => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: "Choose an optional video specimen",
      properties: ["openFile"],
      filters: [{ name: "Video specimens", extensions: ["mp4", "webm"] }],
    });
    if (result.canceled) return null;
    const admitted = await admitVideoImpl(result.filePaths[0], {
      catalogPath: catalogPath(),
      persist: options?.addToPantry !== false,
    });
    currentVideo = structuredClone(admitted.binding);
    candidateSession.noteVideo(currentVideo);
    return {
      binding: structuredClone(currentVideo),
      inserted: admitted.inserted,
      pantryCount: admitted.catalog ? admitted.catalog.specimens.length : null,
    };
  });

  ipcMain.handle("dialog:choose-video-folder", async (event) => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: "Import video specimens into VSPantry",
      properties: ["openDirectory"],
    });
    if (result.canceled) return null;
    return admitVideoFolderImpl(result.filePaths[0], {
      catalogPath: catalogPath(),
      onProgress: (progress) => event?.sender?.send?.("video-pantry:import-progress", progress),
    });
  });

  ipcMain.handle("video-pantry:list", () => loadCatalogImpl(catalogPath()));

  ipcMain.handle("video:set-digest-operator", async (_event, operatorId) => {
    const admittedVideo = candidateSession.state?.().video || currentVideo;
    if (!admittedVideo) {
      const error = new Error("Video digestion requires an admitted Video specimen.");
      error.code = "VIDEO_DIGEST_REQUIRES_SOURCE";
      throw error;
    }
    const digestOperatorId = normalizeDigestOperatorId(operatorId);
    const currentOperatorId = normalizeDigestOperatorId(admittedVideo.digestOperatorId);
    const nextBinding = {
      ...structuredClone(admittedVideo),
      digestOperatorId,
    };
    if (digestOperatorId !== currentOperatorId) {
      candidateSession.clearVideo();
      candidateSession.noteVideo(nextBinding);
    }
    currentVideo = structuredClone(nextBinding);
    return structuredClone(nextBinding);
  });

  ipcMain.handle("video:clear", () => {
    currentVideo = null;
    candidateSession.clearVideo();
    return true;
  });

  return { catalogPath: catalogPath() };
}

module.exports = {
  registerVideoPantryIpc,
};
