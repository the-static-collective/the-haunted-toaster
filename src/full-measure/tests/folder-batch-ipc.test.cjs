const test = require("node:test");
const assert = require("node:assert/strict");

const { hashCanonical } = require("../src/generation/canonical.cjs");
const { BATCH_MANIFEST_SCHEMA } = require("../src/batch/folder-batch-controller.cjs");
const { registerFolderBatchIpc } = require("../src/batch/electron-ipc.cjs");

function sixUpSeed() {
  return {
    familyHash: "family-batch-ipc",
    scoreAddresses: Array.from({ length: 6 }, (_, index) => `ht1_ipc_${index}`),
  };
}

function manifestFixture() {
  const track = {
    trackIndex: 0,
    trackId: "01-song.wav",
    relativePath: "01-song.wav",
    path: "/album/01-song.wav",
    sourceSha256: "a".repeat(64),
    byteLength: 100,
    songEvidence: {
      evidenceHash: "b".repeat(64),
      energyClass: "mixed",
    },
    mediaAnalysis: {
      duration: 60,
      sourceSha256: "a".repeat(64),
      sections: [{ start: 0, end: 60, energy: 0.5, label: "song" }],
    },
  };
  const image = {
    assetId: "image-001",
    relativePath: "cover.jpg",
    path: "/album/cover.jpg",
    sourceSha256: "c".repeat(64),
    byteLength: 50,
    authority: "available-material-only",
  };
  const core = {
    schema: BATCH_MANIFEST_SCHEMA,
    policy: "folder-batch-controller-v1",
    folderName: "album",
    tracks: [{
      trackIndex: track.trackIndex,
      trackId: track.trackId,
      relativePath: track.relativePath,
      sourceSha256: track.sourceSha256,
      byteLength: track.byteLength,
      songEvidence: track.songEvidence,
    }],
    images: [{
      assetId: image.assetId,
      relativePath: image.relativePath,
      sourceSha256: image.sourceSha256,
      byteLength: image.byteLength,
    }],
    localVideos: [],
    ignored: [],
    scanPolicy: { recursive: true, maxDepth: 4, maxFiles: 4096, symlinks: "not-followed" },
    materialLaw: {
      folderImages: "available-proposal-material",
      folderVideos: "not-admitted",
      pantryVideos: "extended-admitted-reservoir",
    },
  };
  return {
    ...core,
    folderPath: "/album",
    tracks: [track],
    images: [image],
    manifestSha256: hashCanonical(core, "HauntedToaster-FolderBatchManifest-v1"),
  };
}

function pantryBinding() {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: "video-001",
    sourceSha256: "d".repeat(64),
    byteLength: 500,
    path: "/pantry/video.mp4",
    filename: "video.mp4",
    probe: { durationSeconds: 10, width: 100, height: 100, frameRate: 30, frameCount: 300, hasAudio: false },
    persisted: true,
  };
}

test("BATCH-001 IPC stages the current track/materials and advances only after activation plus accepted receipt", async () => {
  const handlers = new Map();
  const ipcMain = {
    handle(name, fn) {
      if (handlers.has(name)) throw new Error(`duplicate handler: ${name}`);
      handlers.set(name, fn);
    },
  };
  const calls = [];
  const candidateSession = {
    noteAudio(audioPath, analysis) { calls.push(["audio", audioPath, analysis]); },
    noteImage(imagePath) { calls.push(["image", imagePath]); },
    noteVideo(video) { calls.push(["video", video?.specimenId]); },
    clearVideo() { calls.push(["video-clear"]); },
  };
  const dialog = {
    async showOpenDialog() {
      return { canceled: false, filePaths: ["/album"] };
    },
  };

  registerFolderBatchIpc({
    dialog,
    ipcMain,
    getMainWindow: () => null,
    candidateSession,
    catalogPath: () => "/catalog.json",
    buildManifestImpl: async () => manifestFixture(),
    loadCatalogImpl: async () => ({ specimens: [] }),
    availablePantryBindingsImpl: async () => [pantryBinding()],
  });

  const chosen = await handlers.get("dialog:choose-batch-folder")();
  assert.equal(chosen.trackCount, 1);
  assert.equal(chosen.imageCount, 1);
  assert.equal(chosen.pantryVideoCount, 1);

  const started = await handlers.get("batch:start")(null, { sixUpSeed: sixUpSeed() });
  assert.equal(started.cursor, 0);
  assert.equal(started.complete, false);

  assert.throws(
    () => handlers.get("batch:accept-current")(null, {
      acceptedRenderReceiptSha256: "e".repeat(64),
    }),
    /Activate the current batch track/,
  );

  const prepared = await handlers.get("batch:activate-current")(null, {
    baseOptions: { rootSeed: "batch-ipc-root", count: 6 },
  });
  assert.equal(prepared.track.audioPath, "/album/01-song.wav");
  assert.equal(prepared.imagePath, "/album/cover.jpg");
  assert.equal(prepared.videoBinding.specimenId, "video-001");
  assert.notEqual(prepared.generationOptions.rootSeed, "batch-ipc-root");
  assert.deepEqual(calls.map((entry) => entry[0]), ["audio", "image", "video"]);

  const advanced = await handlers.get("batch:accept-current")(null, {
    acceptedRenderReceiptSha256: "e".repeat(64),
    familyHash: "family-rendered",
    selectedScoreAddress: "score-rendered",
    observedAxes: ["topology"],
  });
  assert.equal(advanced.cursor, 1);
  assert.equal(advanced.complete, true);

  const retrospective = await handlers.get("batch:close")();
  assert.equal(retrospective.trackCount, 1);
  assert.equal(retrospective.imageUse["image-001"], 1);
  assert.equal(retrospective.videoUse["video-001"], 1);
});
