const path = require("node:path");
const generation = require("./generation/index.cjs");
const { renderCandidateFamilyPreviews } = require("./render/candidate-preview.cjs");
const porchlight = require("../constraints/porchlight.v1.json");
const wireOrchard = require("../constraints/wire-orchard.v1.json");
const absoluteResidual = require("../constraints/absolute-residual.v1.json");
const rendererProfile = require("../profiles/toaster-raster-1.json");

const CONSTRAINTS_BY_PRESET = Object.freeze({
  porchlight,
  wireOrchard,
  absoluteResidual,
});

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

function sameOptionalPath(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return path.resolve(left) === path.resolve(right);
}

function createCandidateSession() {
  let audioPath = null;
  let mediaAnalysis = null;
  let imagePath = null;
  let family = null;
  let familyBinding = null;
  let selection = null;
  let busy = false;

  function clearCandidates() {
    family = null;
    familyBinding = null;
    selection = null;
  }

  function noteAudio(nextAudioPath, nextMediaAnalysis) {
    const resolved = path.resolve(nextAudioPath);
    if (audioPath !== resolved) clearCandidates();
    audioPath = resolved;
    mediaAnalysis = nextMediaAnalysis;
  }

  function noteImage(nextImagePath) {
    const resolved = nextImagePath ? path.resolve(nextImagePath) : null;
    if (!sameOptionalPath(imagePath, resolved)) clearCandidates();
    imagePath = resolved;
  }

  function currentConstraints(presetId) {
    const constraints = CONSTRAINTS_BY_PRESET[presetId];
    if (!constraints) throw new TypeError(`Unknown garment preset: ${String(presetId)}.`);
    return constraints;
  }

  function assertReady() {
    if (!audioPath || !mediaAnalysis) {
      throw new Error("Choose and inspect a song before generating candidates.");
    }
    if (busy) throw new Error("Candidate previews are already being generated.");
  }

  async function materialize(nextFamily, config, signal) {
    const previewView = await renderCandidateFamilyPreviews(
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
    family = nextFamily;
    familyBinding = {
      audioPath,
      imagePath,
      presetId: config.presetId,
    };
    selection = null;
    return previewView;
  }

  async function generate(config = {}, signal) {
    assertReady();
    busy = true;
    try {
      const constraints = currentConstraints(config.presetId);
      const nextFamily = generation.generateCandidateSet({
        analysis: toGenerationAnalysis(mediaAnalysis),
        garmentConstraints: constraints,
        rendererProfile,
        rootSeed: config.rootSeed,
        count: 6,
      });
      return await materialize(nextFamily, config, signal);
    } finally {
      busy = false;
    }
  }

  async function mutate(config = {}, signal) {
    assertReady();
    if (!family || family.familyHash !== config.familyHash) {
      throw new Error("Candidate family is no longer current; generate six again.");
    }
    const parent = family.candidates[Number(config.parentIndex)];
    if (!parent) throw new TypeError("Choose a current candidate before mutating.");
    busy = true;
    try {
      const constraints = currentConstraints(config.presetId);
      const nextFamily = generation.generateCandidateSet({
        analysis: toGenerationAnalysis(mediaAnalysis),
        garmentConstraints: constraints,
        rendererProfile,
        parentScore: parent.scoreArtifact.score,
        locks: config.locks || [],
        rootSeed: config.rootSeed,
        count: 6,
      });
      return await materialize(nextFamily, config, signal);
    } finally {
      busy = false;
    }
  }

  function select(config = {}) {
    if (!family || family.familyHash !== config.familyHash) {
      throw new Error("Candidate family is no longer current; generate six again.");
    }
    const candidate = family.candidates[Number(config.index)];
    if (!candidate) throw new TypeError("Choose a current candidate.");
    selection = candidate;
    return {
      familyHash: family.familyHash,
      index: candidate.index,
      scoreAddress: candidate.scoreAddress,
      timelineHash: candidate.timelineHash,
    };
  }

  function executionForRender(config = {}) {
    if (!selection || !familyBinding) return null;
    if (path.resolve(config.audioPath) !== familyBinding.audioPath) return null;
    if (config.presetId !== familyBinding.presetId) return null;
    if (!sameOptionalPath(config.imagePath, familyBinding.imagePath)) return null;
    return {
      visualScore: selection.scoreArtifact.score,
      resolvedTimeline: selection.timeline,
      analysis: mediaAnalysis,
    };
  }

  function registerIpc(ipcMain, assertAvailable = () => {}) {
    ipcMain.handle("candidate:generate", (_event, config) => {
      assertAvailable();
      return generate(config);
    });
    ipcMain.handle("candidate:mutate", (_event, config) => {
      assertAvailable();
      return mutate(config);
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
  }

  return {
    clearCandidates,
    executionForRender,
    generate,
    mutate,
    noteAudio,
    noteImage,
    registerIpc,
    select,
  };
}

module.exports = {
  CONSTRAINTS_BY_PRESET,
  createCandidateSession,
  toGenerationAnalysis,
};
