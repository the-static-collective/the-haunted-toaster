const fs = require("node:fs/promises");
const path = require("node:path");
const {
  deepFreeze,
  hashCanonical,
} = require("../generation/canonical.cjs");
const { inspectAudio } = require("../render/analyze.cjs");
const {
  advanceFutureRearviewMemoryProphecy,
  closeFutureRearviewLoop,
  contextForCurrentTrack,
  createFutureRearviewMemoryProphecy,
  prepareGenerationForCurrentTrack,
} = require("../memory/future-rearview-memory-prophecy.cjs");
const { summarizeCurrentSongEvidence } = require("../memory/memory-capsule.cjs");
const { hashFile } = require("../video-pantry/admit.cjs");
const { VIDEO_SOURCE_SCHEMA } = require("../video-pantry/schema.cjs");

const BATCH_MANIFEST_SCHEMA = "haunted-toaster/folder-batch-manifest/v1";
const BATCH_STATE_SCHEMA = "haunted-toaster/folder-batch-state/v1";
const BATCH_CONTEXT_SCHEMA = "haunted-toaster/folder-batch-track-context/v1";
const BATCH_PREPARED_SCHEMA = "haunted-toaster/folder-batch-prepared-track/v1";
const BATCH_RETROSPECTIVE_SCHEMA = "haunted-toaster/folder-batch-retrospective/v1";
const BATCH_POLICY = "folder-batch-controller-v1";

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a", ".aac", ".flac"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);
const DEFAULT_MAX_DEPTH = 4;
const DEFAULT_MAX_FILES = 4096;

function compareText(left, right) {
  const a = String(left);
  const b = String(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizeRelative(root, filePath) {
  const relative = path.relative(root, filePath).split(path.sep).join("/");
  if (!relative || relative === "." || relative.startsWith("../") || relative.includes("/../")) {
    throw new Error("Batch material escaped the selected folder boundary.");
  }
  return relative;
}

function leadingNumber(value) {
  const match = path.basename(String(value)).match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

function compareTrackPaths(left, right) {
  const leftNumber = leadingNumber(left);
  const rightNumber = leadingNumber(right);
  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }
  if (leftNumber !== null && rightNumber === null) return -1;
  if (leftNumber === null && rightNumber !== null) return 1;
  return compareText(String(left).toLowerCase(), String(right).toLowerCase())
    || compareText(left, right);
}

async function walkFiles(root, {
  maxDepth = DEFAULT_MAX_DEPTH,
  maxFiles = DEFAULT_MAX_FILES,
  readdirImpl = fs.readdir,
} = {}) {
  const output = [];
  async function visit(current, depth) {
    if (depth > maxDepth) return;
    const entries = await readdirImpl(current, { withFileTypes: true });
    entries.sort((a, b) => compareText(a.name.toLowerCase(), b.name.toLowerCase()) || compareText(a.name, b.name));
    for (const entry of entries) {
      if (output.length >= maxFiles) {
        throw new Error(`Batch folder exceeds the ${maxFiles} file safety limit.`);
      }
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute, depth + 1);
      } else if (entry.isFile()) {
        output.push(absolute);
      }
    }
  }
  await visit(root, 0);
  return output;
}

async function assertFolder(folderPath, statImpl = fs.stat) {
  if (!folderPath || typeof folderPath !== "string") throw new Error("Choose an album folder first.");
  const resolved = path.resolve(folderPath);
  const stat = await statImpl(resolved);
  if (!stat.isDirectory()) throw new Error("The selected batch path is not a directory.");
  return resolved;
}

async function fileIdentity(filePath, hashFileImpl) {
  const result = await hashFileImpl(filePath);
  if (!result?.sha256 || !Number.isFinite(Number(result.byteLength))) {
    throw new TypeError("Batch file identity requires sha256 and byteLength.");
  }
  return {
    sourceSha256: String(result.sha256).toLowerCase(),
    byteLength: Number(result.byteLength),
  };
}

function imageAssetId({ relativePath, sourceSha256, byteLength }) {
  return hashCanonical(
    { relativePath, sourceSha256, byteLength },
    "HauntedToaster-FolderBatchImage-v1",
  );
}

function trackIdentityCore(track) {
  return {
    trackIndex: track.trackIndex,
    trackId: track.trackId,
    relativePath: track.relativePath,
    sourceSha256: track.sourceSha256,
    byteLength: track.byteLength,
    songEvidence: track.songEvidence,
  };
}

function imageIdentityCore(image) {
  return {
    assetId: image.assetId,
    relativePath: image.relativePath,
    sourceSha256: image.sourceSha256,
    byteLength: image.byteLength,
  };
}

async function buildFolderBatchManifest(folderPath, {
  inspectAudioImpl = inspectAudio,
  hashFileImpl = hashFile,
  statImpl = fs.stat,
  readdirImpl = fs.readdir,
  maxDepth = DEFAULT_MAX_DEPTH,
  maxFiles = DEFAULT_MAX_FILES,
} = {}) {
  const folder = await assertFolder(folderPath, statImpl);
  const files = await walkFiles(folder, { maxDepth, maxFiles, readdirImpl });
  const audioPaths = [];
  const imagePaths = [];
  const localVideoPaths = [];
  const ignoredPaths = [];

  for (const filePath of files) {
    const extension = path.extname(filePath).toLowerCase();
    if (AUDIO_EXTENSIONS.has(extension)) audioPaths.push(filePath);
    else if (IMAGE_EXTENSIONS.has(extension)) imagePaths.push(filePath);
    else if (VIDEO_EXTENSIONS.has(extension)) localVideoPaths.push(filePath);
    else ignoredPaths.push(filePath);
  }

  audioPaths.sort((a, b) => compareTrackPaths(normalizeRelative(folder, a), normalizeRelative(folder, b)));
  imagePaths.sort((a, b) => compareText(normalizeRelative(folder, a), normalizeRelative(folder, b)));

  if (!audioPaths.length) throw new Error("The selected batch folder contains no supported audio tracks.");

  const tracks = [];
  for (let trackIndex = 0; trackIndex < audioPaths.length; trackIndex += 1) {
    const filePath = audioPaths[trackIndex];
    const [identity, mediaAnalysis] = await Promise.all([
      fileIdentity(filePath, hashFileImpl),
      inspectAudioImpl(filePath),
    ]);
    const songEvidence = summarizeCurrentSongEvidence(mediaAnalysis || {});
    const relativePath = normalizeRelative(folder, filePath);
    tracks.push(deepFreeze({
      trackIndex,
      trackId: relativePath,
      relativePath,
      path: filePath,
      ...identity,
      songEvidence,
      mediaAnalysis: deepFreeze({
        ...(mediaAnalysis || {}),
        sourceSha256: identity.sourceSha256,
      }),
    }));
  }

  const images = [];
  for (const filePath of imagePaths) {
    const identity = await fileIdentity(filePath, hashFileImpl);
    const relativePath = normalizeRelative(folder, filePath);
    images.push(deepFreeze({
      assetId: imageAssetId({ relativePath, ...identity }),
      relativePath,
      path: filePath,
      ...identity,
      authority: "available-material-only",
    }));
  }

  const localVideos = localVideoPaths
    .map((filePath) => normalizeRelative(folder, filePath))
    .sort(compareText)
    .map((relativePath) => deepFreeze({
      relativePath,
      status: "present-not-admitted",
      authority: "none-until-vspantry-admission",
    }));

  const ignored = ignoredPaths
    .map((filePath) => normalizeRelative(folder, filePath))
    .sort(compareText);

  const manifestCore = {
    schema: BATCH_MANIFEST_SCHEMA,
    policy: BATCH_POLICY,
    folderName: path.basename(folder),
    tracks: tracks.map(trackIdentityCore),
    images: images.map(imageIdentityCore),
    localVideos,
    ignored,
    scanPolicy: {
      recursive: true,
      maxDepth,
      maxFiles,
      symlinks: "not-followed",
    },
    materialLaw: {
      folderImages: "available-proposal-material",
      folderVideos: "not-admitted",
      pantryVideos: "extended-admitted-reservoir",
    },
  };

  return deepFreeze({
    ...manifestCore,
    folderPath: folder,
    tracks,
    images,
    manifestSha256: hashCanonical(manifestCore, "HauntedToaster-FolderBatchManifest-v1"),
  });
}

async function availablePantryBindings(catalog, {
  statImpl = fs.stat,
} = {}) {
  const specimens = Array.isArray(catalog?.specimens) ? catalog.specimens : [];
  const bindings = [];
  for (const specimen of specimens) {
    const paths = [...new Set((specimen.paths || []).map(String).filter(Boolean))].sort(compareText);
    let availablePath = null;
    for (const candidate of paths) {
      try {
        const stat = await statImpl(candidate);
        if (stat.isFile()) {
          availablePath = path.resolve(candidate);
          break;
        }
      } catch {
        // Stale pantry paths are evidence of prior admission, not current availability.
      }
    }
    if (!availablePath) continue;
    if (!specimen.specimenId || !specimen.sourceSha256 || !specimen.probe) continue;
    bindings.push(deepFreeze({
      schema: VIDEO_SOURCE_SCHEMA,
      specimenId: String(specimen.specimenId),
      sourceSha256: String(specimen.sourceSha256).toLowerCase(),
      byteLength: Number(specimen.byteLength),
      path: availablePath,
      filename: specimen.filename || path.basename(availablePath),
      probe: structuredClone(specimen.probe),
      persisted: true,
    }));
  }
  return deepFreeze(bindings.sort((a, b) => compareText(a.specimenId, b.specimenId)));
}

function stableStem(value) {
  return path.basename(String(value), path.extname(String(value)))
    .toLowerCase()
    .replace(/^\d+[\s._-]*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function affinity(track, item) {
  const trackStem = stableStem(track.relativePath);
  const itemStem = stableStem(item.relativePath || item.filename || item.specimenId);
  if (!trackStem || !itemStem) return 3;
  if (trackStem === itemStem) return 0;
  if (trackStem.includes(itemStem) || itemStem.includes(trackStem)) return 1;
  const trackWords = new Set(trackStem.split(/\s+/).filter(Boolean));
  const overlap = itemStem.split(/\s+/).some((word) => trackWords.has(word));
  return overlap ? 2 : 3;
}

function usageCounts(history, field) {
  const counts = new Map();
  for (const entry of history || []) {
    const value = entry?.materialSelection?.[field];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function rankMaterial(items, {
  track,
  batchIdentitySha256,
  history,
  identityField,
  historyField,
} = {}) {
  const counts = usageCounts(history, historyField);
  return items
    .map((item) => {
      const identity = String(item[identityField]);
      return {
        item,
        identity,
        useCount: counts.get(identity) || 0,
        affinity: affinity(track, item),
        tiebreak: hashCanonical({
          batchIdentitySha256,
          trackId: track.trackId,
          identity,
        }, "HauntedToaster-FolderBatchMaterialRank-v1"),
      };
    })
    .sort((left, right) =>
      left.useCount - right.useCount
      || left.affinity - right.affinity
      || compareText(left.tiebreak, right.tiebreak)
      || compareText(left.identity, right.identity));
}

function batchHashCore({ manifest, futureRearview, pantryBindings, materialHistory }) {
  return {
    schema: BATCH_STATE_SCHEMA,
    policy: BATCH_POLICY,
    manifestSha256: manifest.manifestSha256,
    futureRearviewStateSha256: futureRearview.stateSha256,
    pantrySpecimenIds: pantryBindings.map((binding) => binding.specimenId),
    materialHistory: materialHistory.map((entry) => ({
      trackIndex: entry.trackIndex,
      trackId: entry.trackId,
      acceptedRenderReceiptSha256: entry.acceptedRenderReceiptSha256,
      materialSelection: entry.materialSelection,
    })),
  };
}

function finalizeBatchState({ manifest, futureRearview, pantryBindings, materialHistory }) {
  const core = batchHashCore({ manifest, futureRearview, pantryBindings, materialHistory });
  return deepFreeze({
    ...core,
    manifest,
    futureRearview,
    pantryBindings,
    materialHistory,
    cursor: futureRearview.cursor,
    complete: futureRearview.complete,
    stateSha256: hashCanonical(core, "HauntedToaster-FolderBatchState-v1"),
  });
}

function createFolderBatchRun({
  manifest,
  sixUpSeed,
  pantryBindings = [],
} = {}) {
  if (!manifest || manifest.schema !== BATCH_MANIFEST_SCHEMA) {
    throw new TypeError(`Expected ${BATCH_MANIFEST_SCHEMA}.`);
  }
  const normalizedPantry = [...pantryBindings]
    .map((binding) => structuredClone(binding))
    .sort((a, b) => compareText(a.specimenId, b.specimenId));
  const futureRearview = createFutureRearviewMemoryProphecy({
    sixUpSeed,
    tracks: manifest.tracks.map((track) => ({
      trackId: track.trackId,
      songEvidence: track.songEvidence,
    })),
  });
  return finalizeBatchState({
    manifest,
    futureRearview,
    pantryBindings: normalizedPantry,
    materialHistory: [],
  });
}

function contextForCurrentBatchTrack(state) {
  if (!state || state.schema !== BATCH_STATE_SCHEMA) {
    throw new TypeError(`Expected ${BATCH_STATE_SCHEMA}.`);
  }
  if (state.complete) throw new Error("Folder batch is already complete.");

  const temporalContext = contextForCurrentTrack(state.futureRearview);
  const track = state.manifest.tracks[state.cursor];
  const rankedImages = rankMaterial(state.manifest.images, {
    track,
    batchIdentitySha256: state.futureRearview.batchIdentitySha256,
    history: state.materialHistory,
    identityField: "assetId",
    historyField: "imageAssetId",
  });
  const rankedVideos = rankMaterial(state.pantryBindings, {
    track,
    batchIdentitySha256: state.futureRearview.batchIdentitySha256,
    history: state.materialHistory,
    identityField: "specimenId",
    historyField: "videoSpecimenId",
  });

  const materialCore = {
    trackIndex: state.cursor,
    trackId: track.trackId,
    availableImageAssetIds: rankedImages.map((entry) => entry.identity),
    availableVideoSpecimenIds: rankedVideos.map((entry) => entry.identity),
    suggestedImageAssetId: rankedImages[0]?.identity || null,
    suggestedVideoSpecimenId: rankedVideos[0]?.identity || null,
    rankingPolicy: "least-used-then-track-affinity-then-deterministic-hash-v1",
    authority: "proposal-only",
  };
  const materialProposal = deepFreeze({
    ...materialCore,
    proposalSha256: hashCanonical(materialCore, "HauntedToaster-FolderBatchMaterialProposal-v1"),
  });

  const core = {
    schema: BATCH_CONTEXT_SCHEMA,
    policy: BATCH_POLICY,
    stateSha256: state.stateSha256,
    cursor: state.cursor,
    track: trackIdentityCore(track),
    temporalContext,
    materialProposal,
    authorityLaw: {
      folderImages: "available-material-only",
      pantryVideos: "available-admitted-material-only",
      materialProposal: "proposal-only",
      selectedMaterial: "candidate-input-only",
      resolvedTimeline: "unchanged-authority",
    },
  };
  return deepFreeze({
    ...core,
    contextSha256: hashCanonical(core, "HauntedToaster-FolderBatchTrackContext-v1"),
  });
}

function resolveMaterialSelection(state, context, selection = {}) {
  const imageExplicit = Object.prototype.hasOwnProperty.call(selection, "imageAssetId");
  const videoExplicit = Object.prototype.hasOwnProperty.call(selection, "videoSpecimenId");
  const imageAssetId = imageExplicit
    ? selection.imageAssetId
    : context.materialProposal.suggestedImageAssetId;
  const videoSpecimenId = videoExplicit
    ? selection.videoSpecimenId
    : context.materialProposal.suggestedVideoSpecimenId;

  const image = imageAssetId === null
    ? null
    : state.manifest.images.find((item) => item.assetId === String(imageAssetId));
  if (imageAssetId !== null && !image) throw new TypeError("Selected batch image is not in the folder image reservoir.");

  const video = videoSpecimenId === null
    ? null
    : state.pantryBindings.find((item) => item.specimenId === String(videoSpecimenId));
  if (videoSpecimenId !== null && !video) throw new TypeError("Selected batch video is not in the available VSPantry reservoir.");

  return deepFreeze({
    imageAssetId: image?.assetId || null,
    videoSpecimenId: video?.specimenId || null,
    imagePath: image?.path || null,
    videoBinding: video ? structuredClone(video) : null,
  });
}

function prepareCurrentBatchTrack({
  state,
  baseOptions = {},
  materialSelection = {},
} = {}) {
  const context = contextForCurrentBatchTrack(state);
  const selectedMaterial = resolveMaterialSelection(state, context, materialSelection);
  const temporal = prepareGenerationForCurrentTrack({
    state: state.futureRearview,
    baseOptions,
  });
  const track = state.manifest.tracks[state.cursor];
  const evidenceCore = {
    schema: BATCH_PREPARED_SCHEMA,
    policy: BATCH_POLICY,
    batchStateSha256: state.stateSha256,
    batchContextSha256: context.contextSha256,
    trackIndex: state.cursor,
    trackId: track.trackId,
    materialProposalSha256: context.materialProposal.proposalSha256,
    imageAssetId: selectedMaterial.imageAssetId,
    videoSpecimenId: selectedMaterial.videoSpecimenId,
    temporalGenerationEvidenceSha256: temporal.evidence.evidenceSha256,
    authority: "candidate-input-only",
  };
  return deepFreeze({
    schema: BATCH_PREPARED_SCHEMA,
    policy: BATCH_POLICY,
    track: {
      trackIndex: track.trackIndex,
      trackId: track.trackId,
      audioPath: track.path,
      mediaAnalysis: structuredClone(track.mediaAnalysis),
    },
    imagePath: selectedMaterial.imagePath,
    videoBinding: selectedMaterial.videoBinding,
    generationOptions: temporal.generationOptions,
    materialSelection: {
      imageAssetId: selectedMaterial.imageAssetId,
      videoSpecimenId: selectedMaterial.videoSpecimenId,
    },
    context,
    evidence: {
      ...evidenceCore,
      evidenceSha256: hashCanonical(evidenceCore, "HauntedToaster-FolderBatchPreparedTrack-v1"),
    },
  });
}

function advanceFolderBatchRun(state, {
  acceptedRenderReceiptSha256,
  familyHash = null,
  selectedScoreAddress = null,
  observedAxes = [],
  featureTokens = [],
  materialSelection = {},
} = {}) {
  if (!state || state.schema !== BATCH_STATE_SCHEMA) {
    throw new TypeError(`Expected ${BATCH_STATE_SCHEMA}.`);
  }
  const context = contextForCurrentBatchTrack(state);
  const selected = resolveMaterialSelection(state, context, materialSelection);
  const track = state.manifest.tracks[state.cursor];
  const nextFuture = advanceFutureRearviewMemoryProphecy(state.futureRearview, {
    trackId: track.trackId,
    accepted: true,
    acceptedRenderReceiptSha256,
    familyHash,
    selectedScoreAddress,
    observedAxes,
    featureTokens,
  });
  const entry = deepFreeze({
    trackIndex: track.trackIndex,
    trackId: track.trackId,
    acceptedRenderReceiptSha256: String(acceptedRenderReceiptSha256).toLowerCase(),
    materialProposalSha256: context.materialProposal.proposalSha256,
    materialSelection: {
      imageAssetId: selected.imageAssetId,
      videoSpecimenId: selected.videoSpecimenId,
    },
  });
  return finalizeBatchState({
    manifest: state.manifest,
    futureRearview: nextFuture,
    pantryBindings: state.pantryBindings,
    materialHistory: [...state.materialHistory, entry],
  });
}

function closeFolderBatchRun(state) {
  if (!state || state.schema !== BATCH_STATE_SCHEMA) {
    throw new TypeError(`Expected ${BATCH_STATE_SCHEMA}.`);
  }
  if (!state.complete) throw new Error("Folder batch cannot close before every track has an accepted render.");

  const futureRearviewRetrospective = closeFutureRearviewLoop(state.futureRearview);
  const imageUse = Object.fromEntries(
    state.manifest.images.map((image) => [
      image.assetId,
      usageCounts(state.materialHistory, "imageAssetId").get(image.assetId) || 0,
    ]),
  );
  const videoUse = Object.fromEntries(
    state.pantryBindings.map((binding) => [
      binding.specimenId,
      usageCounts(state.materialHistory, "videoSpecimenId").get(binding.specimenId) || 0,
    ]),
  );
  const core = {
    schema: BATCH_RETROSPECTIVE_SCHEMA,
    policy: BATCH_POLICY,
    finalBatchStateSha256: state.stateSha256,
    manifestSha256: state.manifest.manifestSha256,
    trackCount: state.manifest.tracks.length,
    imageUse,
    videoUse,
    futureRearviewRetrospectiveSha256: futureRearviewRetrospective.retrospectiveSha256,
    authorityLaw: {
      materialCoverage: "descriptive-only",
      retrospective: "comparison-only",
      revisitInvitation: "never-automatic-retoast",
    },
  };
  return deepFreeze({
    ...core,
    futureRearviewRetrospective,
    retrospectiveSha256: hashCanonical(core, "HauntedToaster-FolderBatchRetrospective-v1"),
  });
}

module.exports = {
  AUDIO_EXTENSIONS,
  BATCH_CONTEXT_SCHEMA,
  BATCH_MANIFEST_SCHEMA,
  BATCH_POLICY,
  BATCH_PREPARED_SCHEMA,
  BATCH_RETROSPECTIVE_SCHEMA,
  BATCH_STATE_SCHEMA,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_FILES,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  advanceFolderBatchRun,
  availablePantryBindings,
  buildFolderBatchManifest,
  closeFolderBatchRun,
  contextForCurrentBatchTrack,
  createFolderBatchRun,
  prepareCurrentBatchTrack,
};
