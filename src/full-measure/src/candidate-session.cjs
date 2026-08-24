const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("./generation/index.cjs");
const { admitLabProposal, parseLabProposalTransfer } = require("./lab-proposal.cjs");
const { renderCandidateFamilyPreviews } = require("./render/candidate-preview.cjs");
const { createLyricTrack } = require("./render/lyrics.cjs");
const { getToastFeel } = require("./toast-feels.cjs");
const { registerVideoPantryIpc } = require("./video-pantry/electron-ipc.cjs");
const {
  analyzeNativeChromaticProfile: defaultAnalyzeNativeChromaticProfile,
} = require("./native-color-analysis.cjs");
const openField = require("../constraints/open-field.v3.json");
const porchlight = require("../constraints/porchlight.v3.json");
const wireOrchard = require("../constraints/wire-orchard.v3.json");
const absoluteResidual = require("../constraints/absolute-residual.v3.json");
const rendererProfile = require("../profiles/toaster-raster-4.json");

const CONSTRAINTS_BY_PRESET = Object.freeze({
  openField,
  porchlight,
  wireOrchard,
  absoluteResidual,
});
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const HASH_CHUNK_BYTES = 1024 * 1024;

function normalizeSourceSha256(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SHA256_PATTERN.test(normalized) ? normalized : null;
}

function hashFileSha256Sync(filePath) {
  const hash = crypto.createHash("sha256");
  const descriptor = fs.openSync(path.resolve(filePath), "r");
  const buffer = Buffer.allocUnsafe(HASH_CHUNK_BYTES);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest("hex");
}

function sourceSha256ForAudio(filePath, analysis = null) {
  const declared = normalizeSourceSha256(analysis?.sourceSha256);
  if (declared) return declared;
  try {
    return hashFileSha256Sync(filePath);
  } catch {
    return null;
  }
}

function toGenerationAnalysis(mediaAnalysis) {
  if (!mediaAnalysis || !Number.isFinite(Number(mediaAnalysis.duration))) {
    throw new TypeError("Inspected media analysis is required.");
  }
  const durationSeconds = Number(mediaAnalysis.duration);
  const sections = (mediaAnalysis.sections || []).map((section, index) => ({
    startSeconds: Number(section.start),
    endSeconds: Number(section.end),
    energy: Number(section.energy),
    label: String(section.label || `section-${index + 1}`),
  }));
  if (!sections.length) {
    sections.push({
      startSeconds: 0,
      endSeconds: durationSeconds,
      energy: 0.5,
      label: "whole-song",
    });
  }
  return {
    schema: generation.ANALYSIS_SCHEMA,
    durationSeconds,
    sections,
    phrases: [],
    transients: [],
  };
}

function responseWitnessFor(mediaAnalysis, analysis = toGenerationAnalysis(mediaAnalysis)) {
  return generation.deriveResponseWitness({
    energySamples: mediaAnalysis.energySamples || [],
    sections: analysis.sections,
    durationSeconds: Number(mediaAnalysis.duration),
  });
}

function timedLyricTrack(lyrics, durationSeconds) {
  const track = createLyricTrack(lyrics, durationSeconds);
  return track.timed === true ? track : null;
}

function sameOptionalPath(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return path.resolve(left) === path.resolve(right);
}

function sameVideoBinding(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  if (left.specimenId && right.specimenId) return left.specimenId === right.specimenId;
  if (left.path && right.path) return path.resolve(left.path) === path.resolve(right.path);
  return false;
}

function createCandidateSession({
  renderCandidateFamilyPreviews: renderPreviews = renderCandidateFamilyPreviews,
  analyzeNativeChromaticProfile: analyzeProfile = defaultAnalyzeNativeChromaticProfile,
} = {}) {
  let audioPath = null;
  let mediaAnalysis = null;
  let imagePath = null;
  let video = null;
  let nativeChromaticProfile = null;
  let family = null;
  let familyBinding = null;
  let selection = null;
  let candidateEcologyEntered = false;
  let stagedLabProposal = null;
  let acceptedHistory = [];
  let busy = false;

  function clearCandidates({ resetEcology = false } = {}) {
    family = null;
    familyBinding = null;
    selection = null;
    if (resetEcology) candidateEcologyEntered = false;
  }

  function noteAudio(nextAudioPath, nextMediaAnalysis) {
    const resolved = path.resolve(nextAudioPath);
    const priorSourceSha256 = normalizeSourceSha256(mediaAnalysis?.sourceSha256);
    const nextSourceSha256 = sourceSha256ForAudio(resolved, nextMediaAnalysis);
    if (
      audioPath !== resolved ||
      (priorSourceSha256 && nextSourceSha256 && priorSourceSha256 !== nextSourceSha256)
    ) {
      clearCandidates({ resetEcology: true });
      acceptedHistory = [];
    }
    audioPath = resolved;
    mediaAnalysis = nextMediaAnalysis && nextSourceSha256
      ? { ...nextMediaAnalysis, sourceSha256: nextSourceSha256 }
      : nextMediaAnalysis;
  }

  function noteImage(nextImagePath) {
    const resolved = nextImagePath ? path.resolve(nextImagePath) : null;
    if (!sameOptionalPath(imagePath, resolved)) {
      clearCandidates();
      nativeChromaticProfile = null;
    }
    imagePath = resolved;
  }

  function noteVideo(nextVideo) {
    if (!nextVideo) return clearVideo();
    const next = structuredClone(nextVideo);
    if (!sameVideoBinding(video, next)) clearCandidates();
    video = next;
    return structuredClone(video);
  }

  function clearVideo() {
    if (video) clearCandidates();
    video = null;
    return null;
  }

  function state() {
    return { video: video ? structuredClone(video) : null };
  }

  async function ensureNativeChromaticProfile() {
    if (!imagePath) return null;
    if (!nativeChromaticProfile) nativeChromaticProfile = await analyzeProfile(imagePath);
    return nativeChromaticProfile;
  }

  function stageLabProposal(transfer) {
    const parsed = parseLabProposalTransfer(transfer);
    stagedLabProposal = parsed;
    clearCandidates();
    return {
      schema: parsed.schema,
      proposalId: parsed.proposal?.id || null,
      title: parsed.proposal?.title || "Lab proposal",
    };
  }

  function currentConstraints(presetId) {
    const constraints = CONSTRAINTS_BY_PRESET[presetId];
    if (!constraints) throw new TypeError(`Unknown garment preset: ${String(presetId)}.`);
    return constraints;
  }

  function currentToastFeel(toastFeelId, { optional = false } = {}) {
    if ((toastFeelId === undefined || toastFeelId === null || toastFeelId === "") && optional) return null;
    const feel = getToastFeel(toastFeelId);
    if (!feel) throw new TypeError(`Unknown Toast Feel: ${String(toastFeelId)}.`);
    return feel;
  }

  function assertReady() {
    if (!audioPath || !mediaAnalysis) {
      throw new Error("Choose and inspect a song before generating candidates.");
    }
    if (busy) throw new Error("Candidate previews are already being generated.");
  }

  function lyricTrackFor(config) {
    return timedLyricTrack(config.lyrics, Number(mediaAnalysis.duration));
  }

  async function materialize(nextFamily, config, signal, influence = null) {
    const requestedFeel = currentToastFeel(config.toastFeelId, { optional: true });
    const familyFeel = nextFamily.toastFeel?.id
      ? currentToastFeel(nextFamily.toastFeel.id)
      : null;
    if (requestedFeel && familyFeel?.id !== requestedFeel.id) {
      throw new Error("Candidate family Toast Feel does not match the requested appliance state.");
    }
    const feel = requestedFeel || familyFeel;
    const previewView = await renderPreviews(
      {
        audioPath,
        imagePath,
        analysis: mediaAnalysis,
        presetId: config.presetId,
        title: config.title,
        artist: config.artist,
        lyrics: config.lyrics,
      },
      nextFamily,
      { signal },
    );
    candidateEcologyEntered = true;
    family = nextFamily;
    familyBinding = {
      audioPath,
      audioSourceSha256: normalizeSourceSha256(mediaAnalysis?.sourceSha256),
      imagePath,
      presetId: config.presetId,
      toastFeelId: feel?.id || null,
      toastFeel: feel ? structuredClone(nextFamily.toastFeel || feel) : null,
      toastmoodField: nextFamily.toastmoodField ? structuredClone(nextFamily.toastmoodField) : null,
      cross: nextFamily.cross ? structuredClone(nextFamily.cross) : null,
      labInfluence: influence,
    };
    selection = null;
    return {
      ...previewView,
      schema: nextFamily.schema,
      policy: nextFamily.policy,
      forcedWitness: nextFamily.forcedWitness === true,
      fixtureFamily: nextFamily.fixtureFamily || null,
      toastFeel: feel ? structuredClone(nextFamily.toastFeel || feel) : null,
      toastmoodField: nextFamily.toastmoodField ? structuredClone(nextFamily.toastmoodField) : null,
      cross: nextFamily.cross ? structuredClone(nextFamily.cross) : null,
      labInfluence: influence,
    };
  }

  async function generate(config = {}, signal) {
    assertReady();
    const feel = currentToastFeel(config.toastFeelId, { optional: true });
    busy = true;
    try {
      const constraints = currentConstraints(config.presetId);
      const profile = await ensureNativeChromaticProfile();
      const lyricTrack = lyricTrackFor(config);
      const analysis = toGenerationAnalysis(mediaAnalysis);
      const responseWitness = responseWitnessFor(mediaAnalysis, analysis);
      const useLabProposal = config.useLabProposal === true;
      if (useLabProposal && !stagedLabProposal) {
        throw new Error("Use Lab Proposal is on, but no Lab proposal is staged.");
      }
      const admitted = useLabProposal
        ? admitLabProposal(stagedLabProposal, constraints)
        : null;
      const influence = admitted
        ? {
            enabled: true,
            proposalId: stagedLabProposal.proposal?.id || null,
            proposalTitle: stagedLabProposal.proposal?.title || "Lab proposal",
            admittedScoreAddress: admitted.scoreArtifact.address,
          }
        : { enabled: false };
      const sourceFamily = generation.generateCandidateSet({
        analysis,
        responseWitness,
        garmentConstraints: constraints,
        rendererProfile,
        parentScore: admitted?.scoreArtifact.score || null,
        rootSeed: config.rootSeed,
        count: 6,
        phase: "initial",
        lyricTrack,
        toastFeelId: feel?.id || null,
        nativeChromaticProfile: profile,
      });
      const projected = generation.projectOrdinaryGrabView(sourceFamily, {
        authorityForCandidate(candidate) {
          return generation.canonicalAuthorityForCandidate(sourceFamily, candidate, {
            analysis,
            responseWitness,
            garmentConstraints: constraints,
            rendererProfile,
            lyricTrack,
            nativeChromaticProfile: profile,
          });
        },
      });
      const nextFamily = Object.freeze({
        ...projected,
        forcedWitness: false,
        fixtureFamily: null,
        toastFeel: sourceFamily.toastFeel || null,
        toastmoodField: sourceFamily.toastmoodField || null,
        cross: sourceFamily.cross || null,
      });
      return await materialize(
        nextFamily,
        config,
        signal,
        { ...influence, forcedWitness: false },
      );
    } finally {
      busy = false;
    }
  }

  async function generateTestSix(config = {}, signal) {
    assertReady();
    currentToastFeel(config.toastFeelId, { optional: true });
    busy = true;
    try {
      const constraints = currentConstraints(config.presetId);
      const profile = await ensureNativeChromaticProfile();
      const lyricTrack = lyricTrackFor(config);
      const analysis = toGenerationAnalysis(mediaAnalysis);
      const responseWitness = responseWitnessFor(mediaAnalysis, analysis);
      const nextFamily = generation.generateTestSixWitnessFamily({
        analysis,
        responseWitness,
        garmentConstraints: constraints,
        rendererProfile,
        rootSeed: config.rootSeed,
        lyricTrack,
        toastFeelId: null,
        nativeChromaticProfile: profile,
      });
      return await materialize(
        nextFamily,
        { ...config, toastFeelId: null },
        signal,
        { enabled: false, forcedWitness: true },
      );
    } finally {
      busy = false;
    }
  }

  async function importLabProposal(config = {}, signal) {
    stageLabProposal(config.transfer);
    return generate({ ...config, useLabProposal: true }, signal);
  }

  function assertCurrentFamily(config) {
    if (!family || family.familyHash !== config.familyHash) {
      throw new Error("Candidate family is no longer current; generate six again.");
    }
  }

  function assertOrdinaryEcology() {
    if (family?.forcedWitness === true || family?.fixtureFamily === "test-6") {
      throw new Error("TEST 6 is a forced witness and cannot enter mutation ecology.");
    }
  }

  function feelForParent(config, parent) {
    const explicit = currentToastFeel(config.toastFeelId, { optional: true });
    if (explicit) return explicit;
    if (parent?.toastmoodLane?.id) return currentToastFeel(parent.toastmoodLane.id);
    if (familyBinding?.toastFeelId) return currentToastFeel(familyBinding.toastFeelId);
    return null;
  }

  async function mutate(config = {}, signal) {
    assertReady();
    assertCurrentFamily(config);
    assertOrdinaryEcology();
    const parent = family.candidates[Number(config.parentIndex)];
    if (!parent) throw new TypeError("Choose a current candidate before mutating.");
    const feel = feelForParent(config, parent);
    busy = true;
    try {
      const constraints = currentConstraints(config.presetId);
      const profile = await ensureNativeChromaticProfile();
      const analysis = toGenerationAnalysis(mediaAnalysis);
      const responseWitness = responseWitnessFor(mediaAnalysis, analysis);
      const lyricTrack = lyricTrackFor(config);
      let nextFamily = generation.generateCandidateSet({
        analysis,
        responseWitness,
        garmentConstraints: constraints,
        rendererProfile,
        parentScore: parent.scoreArtifact.score,
        locks: config.locks || [],
        rootSeed: config.rootSeed,
        count: 6,
        phase: "branch",
        lyricTrack,
        toastFeelId: feel?.id || null,
        nativeChromaticProfile: profile,
        parentNativeColorPlan: parent.timeline?.nativeColor || null,
      });
      if (config.converge === true) {
        const parentAlreadyCounted = acceptedHistory.some(
          (score) => generation.addressVisualScore(score) === parent.scoreAddress,
        );
        const coverageHistory = parentAlreadyCounted
          ? acceptedHistory
          : [...acceptedHistory, parent.scoreArtifact.score];
        nextFamily = generation.replaceFinalCandidateWithConverge(nextFamily, {
          history: coverageHistory,
          parentScore: parent.scoreArtifact.score,
          locks: config.locks || [],
          constraints,
          analysis,
          responseWitness,
          rendererProfile,
          rootSeed: config.rootSeed,
          lyricTrack,
          toastFeelId: feel?.id || null,
          nativeChromaticProfile: profile,
          parentNativeColorPlan: parent.timeline?.nativeColor || null,
        });
        const convergeCandidate = nextFamily.candidates.find(
          (candidate) => candidate.role === "converge-frontier",
        );
        const visibleDistance = convergeCandidate
          ? generation.visibleSemanticDistance(
              parent.scoreArtifact.score,
              convergeCandidate.scoreArtifact.score,
              constraints,
            )
          : 0;
        if (!convergeCandidate || !convergeCandidate.changedAxes?.length || visibleDistance < 8) {
          const refusal = new Error(
            "CONVERGE_NO_DISTINCT_TARGET: no distinct coverage target remains under current locks/constraints.",
          );
          refusal.code = "CONVERGE_NO_DISTINCT_TARGET";
          throw refusal;
        }
      }
      return await materialize(
        nextFamily,
        { ...config, toastFeelId: feel?.id || null },
        signal,
        familyBinding?.labInfluence || null,
      );
    } finally {
      busy = false;
    }
  }

  async function cross(config = {}, signal) {
    assertReady();
    assertCurrentFamily(config);
    assertOrdinaryEcology();
    if (!Array.isArray(config.parentIndexes) || config.parentIndexes.length !== 2) {
      throw new TypeError("CROSS requires exactly two current parent candidates.");
    }
    const indexes = config.parentIndexes.map(Number);
    if (indexes[0] === indexes[1]) throw new TypeError("CROSS requires two distinct current parent candidates.");
    const parents = indexes.map((index) => family.candidates[index]);
    if (parents.some((parent) => !parent)) throw new TypeError("CROSS parents must both belong to the current family.");
    const feel = currentToastFeel(config.toastFeelId, { optional: true });
    busy = true;
    try {
      const constraints = currentConstraints(config.presetId);
      const profile = await ensureNativeChromaticProfile();
      const analysis = toGenerationAnalysis(mediaAnalysis);
      const responseWitness = responseWitnessFor(mediaAnalysis, analysis);
      const nextFamily = generation.generateCrossCandidateSet({
        analysis,
        responseWitness,
        garmentConstraints: constraints,
        rendererProfile,
        parentCandidates: parents,
        parentFamilyHash: family.familyHash,
        locks: config.locks || [],
        rootSeed: config.rootSeed,
        count: 6,
        phase: "cross",
        lyricTrack: lyricTrackFor(config),
        toastFeelId: feel?.id || null,
        nativeChromaticProfile: profile,
      });
      return await materialize(
        nextFamily,
        { ...config, toastFeelId: feel?.id || null },
        signal,
        familyBinding?.labInfluence || null,
      );
    } finally {
      busy = false;
    }
  }

  async function stomp(config = {}, signal) {
    assertReady();
    assertCurrentFamily(config);
    assertOrdinaryEcology();
    const parent = family.candidates[Number(config.parentIndex)];
    if (!parent) throw new TypeError("Choose a current candidate before stomping.");
    const feel = feelForParent(config, parent);
    if (!feel) throw new TypeError("STOMP requires a current or explicit Toast Feel.");
    busy = true;
    try {
      const constraints = currentConstraints(config.presetId);
      const profile = await ensureNativeChromaticProfile();
      const analysis = toGenerationAnalysis(mediaAnalysis);
      const responseWitness = responseWitnessFor(mediaAnalysis, analysis);
      const nextFamily = generation.generateStompCandidateSet({
        analysis,
        responseWitness,
        garmentConstraints: constraints,
        rendererProfile,
        parentScore: parent.scoreArtifact.score,
        locks: config.locks || [],
        rootSeed: config.rootSeed,
        count: 6,
        lyricTrack: lyricTrackFor(config),
        toastFeelId: feel.id,
        nativeChromaticProfile: profile,
        parentNativeColorPlan: parent.timeline?.nativeColor || null,
      });
      return await materialize(
        nextFamily,
        { ...config, toastFeelId: feel.id },
        signal,
        familyBinding?.labInfluence || null,
      );
    } finally {
      busy = false;
    }
  }

  function select(config = {}) {
    assertCurrentFamily(config);
    const candidate = family.candidates[Number(config.index)];
    if (!candidate) throw new TypeError("Choose a current candidate.");
    selection = candidate;
    if (
      candidate.forcedWitness !== true &&
      !acceptedHistory.some((score) => generation.addressVisualScore(score) === candidate.scoreAddress)
    ) {
      acceptedHistory.push(candidate.scoreArtifact.score);
    }
    if (
      candidate.forcedWitness !== true &&
      !familyBinding.toastFeelId &&
      candidate.toastmoodLane?.id
    ) {
      const inheritedFeel = currentToastFeel(candidate.toastmoodLane.id);
      familyBinding.toastFeelId = inheritedFeel.id;
      familyBinding.toastFeel = structuredClone(inheritedFeel);
    }
    return {
      familyHash: family.familyHash,
      index: candidate.index,
      scoreAddress: candidate.scoreAddress,
      timelineHash: candidate.timelineHash,
      frontierEvidence: candidate.frontierEvidence || null,
      crossLineage: candidate.crossLineage || null,
      toastmoodLane: candidate.toastmoodLane || null,
      toastFeel: familyBinding.toastFeel ? structuredClone(familyBinding.toastFeel) : null,
      forcedWitnessEvidence: candidate.forcedWitnessEvidence
        ? structuredClone(candidate.forcedWitnessEvidence)
        : null,
      acceptedHistoryCount: acceptedHistory.length,
      labInfluence: familyBinding?.labInfluence || { enabled: false },
    };
  }

  function executionForRender(config = {}) {
    if (!selection) {
      if (candidateEcologyEntered) {
        const error = new Error(
          "Candidate selection required: choose a candidate and use the selected timeline before rendering.",
        );
        error.code = "CANDIDATE_RENDER_SELECTION_REQUIRED";
        throw error;
      }
      return null;
    }
    if (!familyBinding) {
      throw new Error("Selected candidate has no accepted render binding.");
    }
    const mismatch = (detail) => {
      const error = new Error(`Selected candidate no longer matches the current render inputs: ${detail}.`);
      error.code = "CANDIDATE_RENDER_INPUT_MISMATCH";
      return error;
    };
    if (path.resolve(config.audioPath) !== familyBinding.audioPath) {
      throw mismatch("song changed");
    }
    if (familyBinding.audioSourceSha256) {
      const currentAudioSourceSha256 =
        normalizeSourceSha256(config.audioSourceSha256) ||
        sourceSha256ForAudio(config.audioPath);
      if (currentAudioSourceSha256 !== familyBinding.audioSourceSha256) {
        throw mismatch("song content changed");
      }
    }
    if (config.presetId !== familyBinding.presetId) {
      throw mismatch("garment changed");
    }
    if (!sameOptionalPath(config.imagePath, familyBinding.imagePath)) {
      throw mismatch("image changed");
    }
    const forcedRenderConfig = selection.timeline?.renderConfig
      ? structuredClone(selection.timeline.renderConfig)
      : null;
    return {
      ...(forcedRenderConfig || {}),
      visualScore: selection.scoreArtifact.score,
      resolvedTimeline: selection.timeline,
      forcedWitnessEvidence: selection.forcedWitnessEvidence
        ? structuredClone(selection.forcedWitnessEvidence)
        : null,
      forcedRenderConfig,
      analysis: mediaAnalysis,
      labInfluence: familyBinding.labInfluence || { enabled: false },
      toastFeel: familyBinding.toastFeel ? structuredClone(familyBinding.toastFeel) : null,
      nativeChromaticProfile: nativeChromaticProfile
        ? structuredClone(nativeChromaticProfile)
        : null,
    };
  }

  function registerIpc(ipcMain, assertAvailable = () => {}) {
    ipcMain.handle("candidate:generate", (_event, config) => {
      assertAvailable();
      return generate(config);
    });
    ipcMain.handle("candidate:test-6", (_event, config) => {
      assertAvailable();
      return generateTestSix(config);
    });
    ipcMain.handle("candidate:stage-lab-proposal", (_event, transfer) => {
      assertAvailable();
      return stageLabProposal(transfer);
    });
    ipcMain.handle("candidate:import-lab-proposal", (_event, config) => {
      assertAvailable();
      return importLabProposal(config);
    });
    ipcMain.handle("candidate:mutate", (_event, config) => {
      assertAvailable();
      return mutate(config);
    });
    ipcMain.handle("candidate:cross", (_event, config) => {
      assertAvailable();
      return cross(config);
    });
    ipcMain.handle("candidate:stomp", (_event, config) => {
      assertAvailable();
      return stomp(config);
    });
    ipcMain.handle("candidate:select", (_event, config) => {
      assertAvailable();
      return select(config);
    });
    ipcMain.handle("candidate:clear", () => {
      clearCandidates();
      return true;
    });
    ipcMain.handle("candidate:clear-image", () => {
      noteImage(null);
      return true;
    });
    if (process.versions?.electron) {
      const { app, BrowserWindow, dialog } = require("electron");
      registerVideoPantryIpc({
        app,
        dialog,
        ipcMain,
        getMainWindow: () => BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null,
        candidateSession: { noteVideo, clearVideo },
      });
    }
  }

  return {
    clearCandidates,
    clearVideo,
    cross,
    executionForRender,
    generate,
    generateTestSix,
    importLabProposal,
    mutate,
    noteAudio,
    noteImage,
    noteVideo,
    registerIpc,
    select,
    stageLabProposal,
    state,
    stomp,
  };
}

module.exports = {
  CONSTRAINTS_BY_PRESET,
  rendererProfile,
  createCandidateSession,
  timedLyricTrack,
  toGenerationAnalysis,
};