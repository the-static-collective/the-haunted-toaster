const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  advanceFolderBatchRun,
  availablePantryBindings,
  buildFolderBatchManifest,
  closeFolderBatchRun,
  contextForCurrentBatchTrack,
  createFolderBatchRun,
  prepareCurrentBatchTrack,
} = require("../src/batch/folder-batch-controller.cjs");

const sixUpSeed = {
  familyHash: "family-batch-001",
  scoreAddresses: Array.from({ length: 6 }, (_, index) => `ht1_batch_seed_${index}`),
};

function fakeHash(filePath) {
  const fill = path.basename(filePath).charCodeAt(0).toString(16).padStart(2, "0").slice(0, 2);
  return Promise.resolve({
    sha256: fill.repeat(32),
    byteLength: 100 + path.basename(filePath).length,
  });
}

function fakeInspect(filePath) {
  const basename = path.basename(filePath);
  const dense = basename.includes("02");
  return Promise.resolve({
    duration: dense ? 72 : 61,
    sections: [{
      start: 0,
      end: dense ? 72 : 61,
      energy: dense ? 0.78 : 0.28,
      label: dense ? "lift" : "opening",
    }],
  });
}

function pantryBinding(id, filename) {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: id,
    sourceSha256: id[0].repeat(64),
    byteLength: 2048,
    path: `/pantry/${filename}`,
    filename,
    probe: {
      durationSeconds: 12,
      width: 1920,
      height: 1080,
      frameRate: 30,
      frameCount: 360,
      hasAudio: false,
    },
    persisted: true,
  };
}

async function fixtureFolder() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ht-batch-001-"));
  await fs.mkdir(path.join(root, "art"), { recursive: true });
  await fs.mkdir(path.join(root, "notes"), { recursive: true });
  await fs.writeFile(path.join(root, "02-middle.wav"), "audio");
  await fs.writeFile(path.join(root, "01-opening.wav"), "audio");
  await fs.writeFile(path.join(root, "opening.jpg"), "image");
  await fs.writeFile(path.join(root, "art", "middle.png"), "image");
  await fs.writeFile(path.join(root, "art", "cover.webp"), "image");
  await fs.writeFile(path.join(root, "b-roll.mp4"), "video");
  await fs.writeFile(path.join(root, "notes", "ideas.txt"), "notes");
  return root;
}

test("BATCH-001 scans a messy folder into deterministic audio/image reservoirs without silently admitting local video", async () => {
  const root = await fixtureFolder();
  try {
    const manifest = await buildFolderBatchManifest(root, {
      inspectAudioImpl: fakeInspect,
      hashFileImpl: fakeHash,
    });

    assert.equal(manifest.tracks.length, 2);
    assert.deepEqual(
      manifest.tracks.map((track) => track.trackId),
      ["01-opening.wav", "02-middle.wav"],
    );
    assert.equal(manifest.images.length, 3);
    assert.deepEqual(
      manifest.images.map((image) => image.relativePath),
      ["art/cover.webp", "art/middle.png", "opening.jpg"],
    );
    assert.deepEqual(manifest.localVideos, [{
      relativePath: "b-roll.mp4",
      status: "present-not-admitted",
      authority: "none-until-vspantry-admission",
    }]);
    assert.deepEqual(manifest.ignored, ["notes/ideas.txt"]);
    assert.equal(manifest.materialLaw.folderImages, "available-proposal-material");
    assert.equal(manifest.materialLaw.folderVideos, "not-admitted");
    assert.match(manifest.manifestSha256, /^[a-f0-9]{64}$/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("BATCH-001 proposes track-affine material first, then learns material coverage from accepted receipts", async () => {
  const root = await fixtureFolder();
  try {
    const manifest = await buildFolderBatchManifest(root, {
      inspectAudioImpl: fakeInspect,
      hashFileImpl: fakeHash,
    });
    const pantryBindings = [
      pantryBinding("vid-a", "desert-loop.mp4"),
      pantryBinding("vid-b", "porch-loop.mp4"),
    ];
    let state = createFolderBatchRun({ manifest, sixUpSeed, pantryBindings });

    const firstContext = contextForCurrentBatchTrack(state);
    const opening = manifest.images.find((image) => image.relativePath === "opening.jpg");
    assert.equal(firstContext.materialProposal.suggestedImageAssetId, opening.assetId);
    assert.equal(firstContext.authorityLaw.materialProposal, "proposal-only");

    const firstPrepared = prepareCurrentBatchTrack({
      state,
      baseOptions: { rootSeed: "batch-root", count: 6 },
    });
    assert.equal(firstPrepared.imagePath, opening.path);
    assert.notEqual(firstPrepared.generationOptions.rootSeed, "batch-root");
    assert.equal(firstPrepared.evidence.authority, "candidate-input-only");

    state = advanceFolderBatchRun(state, {
      acceptedRenderReceiptSha256: "a".repeat(64),
      familyHash: "family-track-1",
      selectedScoreAddress: "score-track-1",
      observedAxes: ["palette"],
      materialSelection: firstPrepared.materialSelection,
    });

    const secondContext = contextForCurrentBatchTrack(state);
    const middle = manifest.images.find((image) => image.relativePath === "art/middle.png");
    assert.equal(secondContext.materialProposal.suggestedImageAssetId, middle.assetId);
    assert.notEqual(
      secondContext.temporalContext.present.prophecy.priorHistorySha256,
      firstContext.temporalContext.present.prophecy.priorHistorySha256,
    );

    const secondPrepared = prepareCurrentBatchTrack({
      state,
      baseOptions: { rootSeed: "batch-root", count: 6 },
    });
    state = advanceFolderBatchRun(state, {
      acceptedRenderReceiptSha256: "b".repeat(64),
      familyHash: "family-track-2",
      selectedScoreAddress: "score-track-2",
      observedAxes: ["camera"],
      materialSelection: secondPrepared.materialSelection,
    });

    assert.equal(state.complete, true);
    const retrospective = closeFolderBatchRun(state);
    assert.equal(retrospective.trackCount, 2);
    assert.equal(retrospective.imageUse[opening.assetId], 1);
    assert.equal(retrospective.imageUse[middle.assetId], 1);
    assert.equal(retrospective.authorityLaw.materialCoverage, "descriptive-only");
    assert.match(retrospective.futureRearviewRetrospectiveSha256, /^[a-f0-9]{64}$/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("BATCH-001 material selection cannot escape the admitted reservoirs", async () => {
  const root = await fixtureFolder();
  try {
    const manifest = await buildFolderBatchManifest(root, {
      inspectAudioImpl: fakeInspect,
      hashFileImpl: fakeHash,
    });
    const state = createFolderBatchRun({
      manifest,
      sixUpSeed,
      pantryBindings: [pantryBinding("vid-a", "desert-loop.mp4")],
    });

    assert.throws(
      () => prepareCurrentBatchTrack({
        state,
        baseOptions: { rootSeed: "batch-root" },
        materialSelection: { imageAssetId: "not-in-folder" },
      }),
      /not in the folder image reservoir/,
    );
    assert.throws(
      () => prepareCurrentBatchTrack({
        state,
        baseOptions: { rootSeed: "batch-root" },
        materialSelection: { videoSpecimenId: "not-in-pantry" },
      }),
      /not in the available VSPantry reservoir/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("BATCH-001 only exposes currently reachable persisted pantry specimens", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ht-batch-pantry-"));
  try {
    const live = path.join(root, "live.mp4");
    await fs.writeFile(live, "video");
    const catalog = {
      schema: "haunted-toaster/video-pantry-catalog/v1",
      specimens: [
        {
          specimenId: "live-specimen",
          sourceSha256: "c".repeat(64),
          byteLength: 5,
          filename: "live.mp4",
          paths: [live],
          probe: { durationSeconds: 5, width: 10, height: 10, frameRate: 24, frameCount: 120, hasAudio: false },
        },
        {
          specimenId: "stale-specimen",
          sourceSha256: "d".repeat(64),
          byteLength: 5,
          filename: "gone.mp4",
          paths: [path.join(root, "gone.mp4")],
          probe: { durationSeconds: 5, width: 10, height: 10, frameRate: 24, frameCount: 120, hasAudio: false },
        },
      ],
    };

    const bindings = await availablePantryBindings(catalog);
    assert.deepEqual(bindings.map((binding) => binding.specimenId), ["live-specimen"]);
    assert.equal(bindings[0].path, path.resolve(live));
    assert.equal(bindings[0].persisted, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
