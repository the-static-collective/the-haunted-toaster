const {
  advanceFolderBatchRun,
  availablePantryBindings,
  buildFolderBatchManifest,
  closeFolderBatchRun,
  contextForCurrentBatchTrack,
  createFolderBatchRun,
  prepareCurrentBatchTrack,
} = require("./folder-batch-controller.cjs");
const { loadCatalog } = require("../video-pantry/catalog.cjs");

function registerFolderBatchIpc({
  dialog,
  ipcMain,
  getMainWindow = () => null,
  candidateSession,
  catalogPath,
  assertAvailable = () => {},
  buildManifestImpl = buildFolderBatchManifest,
  loadCatalogImpl = loadCatalog,
  availablePantryBindingsImpl = availablePantryBindings,
} = {}) {
  if (!dialog || !ipcMain || !candidateSession || typeof catalogPath !== "function") {
    throw new TypeError("Folder batch IPC requires dialog, ipcMain, candidateSession, and catalogPath.");
  }

  let manifest = null;
  let pantryBindings = [];
  let batchState = null;
  let prepared = null;

  function assertManifest() {
    if (!manifest) throw new Error("Choose a batch folder first.");
  }

  function assertBatch() {
    if (!batchState) throw new Error("Start the folder batch with an accepted six-up genome first.");
  }

  function summary() {
    if (!manifest) return null;
    return {
      manifestSha256: manifest.manifestSha256,
      folderPath: manifest.folderPath,
      folderName: manifest.folderName,
      trackCount: manifest.tracks.length,
      imageCount: manifest.images.length,
      localVideoCount: manifest.localVideos.length,
      ignoredCount: manifest.ignored.length,
      pantryVideoCount: pantryBindings.length,
      tracks: manifest.tracks.map((track) => ({
        trackIndex: track.trackIndex,
        trackId: track.trackId,
        relativePath: track.relativePath,
        songEvidence: structuredClone(track.songEvidence),
      })),
      images: manifest.images.map((image) => ({
        assetId: image.assetId,
        relativePath: image.relativePath,
      })),
      localVideos: structuredClone(manifest.localVideos),
    };
  }

  ipcMain.handle("dialog:choose-batch-folder", async () => {
    assertAvailable();
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: "Choose an album folder to batch-toast",
      properties: ["openDirectory"],
    });
    if (result.canceled) return null;

    manifest = await buildManifestImpl(result.filePaths[0]);
    const catalog = await loadCatalogImpl(catalogPath());
    pantryBindings = await availablePantryBindingsImpl(catalog);
    batchState = null;
    prepared = null;
    return summary();
  });

  ipcMain.handle("batch:manifest", () => summary());

  ipcMain.handle("batch:prime-genome", () => {
    assertAvailable();
    assertManifest();
    const track = manifest.tracks[0];
    candidateSession.clearCandidates({ resetEcology: true });
    candidateSession.noteAudio(track.path, structuredClone(track.mediaAnalysis));
    candidateSession.noteImage(null);
    candidateSession.clearVideo();
    prepared = null;
    return {
      manifestSha256: manifest.manifestSha256,
      trackIndex: track.trackIndex,
      trackId: track.trackId,
      audioPath: track.path,
      mediaAnalysis: structuredClone(track.mediaAnalysis),
      rootSeed: `album-genome:${manifest.manifestSha256}`,
      authority: "proposal-seed-only",
    };
  });

  ipcMain.handle("batch:start", (_event, config = {}) => {
    assertAvailable();
    assertManifest();
    batchState = createFolderBatchRun({
      manifest,
      sixUpSeed: config.sixUpSeed,
      pantryBindings,
    });
    prepared = null;
    return {
      stateSha256: batchState.stateSha256,
      cursor: batchState.cursor,
      complete: batchState.complete,
      context: contextForCurrentBatchTrack(batchState),
    };
  });

  ipcMain.handle("batch:context", () => {
    assertBatch();
    if (batchState.complete) {
      return {
        stateSha256: batchState.stateSha256,
        cursor: batchState.cursor,
        complete: true,
      };
    }
    return {
      stateSha256: batchState.stateSha256,
      cursor: batchState.cursor,
      complete: false,
      context: contextForCurrentBatchTrack(batchState),
    };
  });

  ipcMain.handle("batch:activate-current", (_event, config = {}) => {
    assertAvailable();
    assertBatch();
    if (batchState.complete) throw new Error("Folder batch is already complete.");

    prepared = prepareCurrentBatchTrack({
      state: batchState,
      baseOptions: config.baseOptions || {},
      materialSelection: config.materialSelection || {},
    });

    candidateSession.clearCandidates({ resetEcology: true });
    candidateSession.noteAudio(
      prepared.track.audioPath,
      prepared.track.mediaAnalysis,
    );
    candidateSession.noteImage(prepared.imagePath);
    if (prepared.videoBinding) candidateSession.noteVideo(prepared.videoBinding);
    else candidateSession.clearVideo();

    return structuredClone(prepared);
  });

  ipcMain.handle("batch:accept-current", (_event, outcome = {}) => {
    assertAvailable();
    assertBatch();
    if (!prepared) {
      throw new Error("Activate the current batch track before accepting its render.");
    }
    if (prepared.track.trackIndex !== batchState.cursor) {
      throw new Error("Prepared batch track no longer matches the current cursor.");
    }

    batchState = advanceFolderBatchRun(batchState, {
      acceptedRenderReceiptSha256: outcome.acceptedRenderReceiptSha256,
      familyHash: outcome.familyHash || null,
      selectedScoreAddress: outcome.selectedScoreAddress || null,
      observedAxes: outcome.observedAxes || [],
      featureTokens: outcome.featureTokens || [],
      materialSelection: prepared.materialSelection,
    });
    prepared = null;

    return {
      stateSha256: batchState.stateSha256,
      cursor: batchState.cursor,
      complete: batchState.complete,
      context: batchState.complete ? null : contextForCurrentBatchTrack(batchState),
    };
  });

  ipcMain.handle("batch:close", () => {
    assertBatch();
    return closeFolderBatchRun(batchState);
  });

  ipcMain.handle("batch:clear", () => {
    manifest = null;
    pantryBindings = [];
    batchState = null;
    prepared = null;
    return true;
  });

  return Object.freeze({
    summary,
    state: () => batchState ? structuredClone(batchState) : null,
  });
}

module.exports = {
  registerFolderBatchIpc,
};
