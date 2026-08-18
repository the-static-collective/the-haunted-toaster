const path = require("node:path");
const generation = require("./generation/index.cjs");
const { buildInfluenceTrace } = require("./memory/influence-trace.cjs");
const { admitLabProposal, parseLabProposalTransfer } = require("./lab-proposal.cjs");
const { renderCandidateFamilyPreviews } = require("./render/candidate-preview.cjs");
const { createLyricTrack } = require("./render/lyrics.cjs");
const { getToastFeel } = require("./toast-feels.cjs");
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

function receiptIdentity(value) {
  const identity = String(value || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(identity)) {
    throw new TypeError("Re-toast requires an archived render receipt SHA-256 identity.");
  }
  return identity;
}

function createCandidateSession({
  renderCandidateFamilyPreviews: renderPreviews = renderCandidateFamilyPreviews,
  analyzeNativeChromaticProfile: analyzeProfile = defaultAnalyzeNativeChromaticProfile,
  memoryProvider = null,
} = {}) {
  let audioPath = null;
  let mediaAnalysis = null;
  let imagePath = null;
  let nativeChromaticProfile = null;
  let family = null;
  let familyBinding = null;
  let selection = null;
  let stagedLabProposal = null;
  let acceptedHistory = [];
  let pendingReToastReceiptSha256 = null;
  let busy = false;

  function clearCandidates() {
    family = null;
    familyBinding = null;
    selection = null;
  }

  function noteAudio(nextAudioPath, nextMediaAnalysis) {
    const resolved = path.resolve(nextAudioPath);
    if (audioPath !== resolved) {
      clearCandidates();
      acceptedHistory = [];
    }
    audioPath = resolved;
    mediaAnalysis = nextMediaAnalysis;
  }

  function noteImage(nextImagePath) {
    const resolved = nextImagePath ? path.resolve(nextImagePath) : null;
    if (!sameOptionalPath(imagePath, resolved)) {
      clearCandidates();
      nativeChromaticProfile = null;
    }
    imagePath = resolved;
  }

  async function ensureNativeChromaticProfile() {
    if (!imagePath) return null;
    if (!nativeChromaticProfile) nativeChromaticProfile = await analyzeProfile(imagePath);
    return nativeChromaticProfile;
  }

  function stageLabProposal(transfer) {
    if (pendingReToastReceiptSha256) {
      throw new Error("Re-toast ancestry and Lab Proposal ancestry cannot coexist; clear one first.");
    }
    const parsed = parseLabProposalTransfer(transfer);
    stagedLabProposal = parsed;
    clearCandidates();
    return {
      schema: parsed.schema,
      proposalId: parsed.proposal?.id || null,
      title: parsed.proposal?.title || "Lab proposal",
    };
  }

  async function armReToast(receiptSha256) {
    if (stagedLabProposal) {
      throw new Error("Re-toast ancestry and Lab Proposal ancestry cannot coexist; clear the Lab Proposal first.");
    }
    pendingReToastReceiptSha256 = receiptIdentity(receiptSha256);
    clearCandidates();
    return { receiptSha256: pendingReToastReceiptSha256 };
  }

  function clearReToast() {
    if (!pendingReToastReceiptSha256) return null;
    const previous = { receiptSha256: pendingReToastReceiptSha256 };
    pendingReToastReceiptSha256 = null;
    return previous;
  }

  function currentInfluenceTrace() {
    return familyBinding?.memoryContext?.influenceTrace
      ? structuredClone(familyBinding.memoryContext.influenceTrace)
      : null;
  }

  function currentConstraints(presetId) {
    const constraints = CONSTRAINTS_BY_PRESET[presetId];
    if (!constraints) throw new TypeError(`Unknown garment preset: ${String(presetId)}.`);
    return constraints;
  }

  function currentToastFeel(toastFeelId) {
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

  function memoryContextForFamily(nextFamily, memoryContext) {
    if (!memoryContext?.capsule) return memoryContext ? structuredClone(memoryContext) : null;
    const influenceTrace = buildInfluenceTrace({
      capsule: memoryContext.capsule,
      familyHash: nextFamily.familyHash,
      candidates: nextFamily.candidates,
    });
    return {
      ...structuredClone(memoryContext),
      influenceTrace,
    };
  }

  async function materialize(
    nextFamily,
    config,
    signal,
    influence = null,
    memoryContext = null,
    reToastAncestor = null,
  ) {
    const feel = currentToastFeel(config.toastFeelId);
    if (nextFamily.toastFeel?.id !== feel.id) {
      throw new Error("Candidate family Toast Feel does not match the requested appliance state.");
    }
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
    const boundMemoryContext = memoryContextForFamily(nextFamily, memoryContext);
    family = nextFamily;
    familyBinding = {
      audioPath,
      imagePath,
      presetId: config.presetId,
      toastFeelId: feel.id,
      toastFeel: structuredClone(nextFamily.toastFeel),
      labInfluence: influence,
      memoryContext: boundMemoryContext,
      reToastAncestor: reToastAncestor ? structuredClone(reToastAncestor) : null,
    };
    selection = null;
    return {
      ...previewView,
      toastFeel: structuredClone(nextFamily.toastFeel),
      labInfluence: influence,
      reToastAncestor: reToastAncestor ? structuredClone(reToastAncestor) : null,
      influenceTrace: boundMemoryContext?.influenceTrace
        ? structuredClone(boundMemoryContext.influenceTrace)
        : null,
    };
  }

  async function resolveReToastAncestor() {
    if (!pendingReToastReceiptSha256) return null;
    if (!memoryProvider?.resolveReToastAncestor) {
      throw new Error("Re-toast ancestry is armed but no local memory provider is available.");
    }
    const resolved = await memoryProvider.resolveReToastAncestor(pendingReToastReceiptSha256);
    if (!resolved?.score) {
      throw new Error(`Re-toast ancestor ${pendingReToastReceiptSha256} has no recoverable VisualScore.`);
    }
    const scoreAddress = generation.addressVisualScore(resolved.score);
    if (resolved.scoreAddress && resolved.scoreAddress !== scoreAddress) {
      throw new Error("Re-toast ancestor score identity does not match its archived evidence.");
    }
    return {
      receiptSha256: pendingReToastReceiptSha256,
      scoreAddress,
      score: resolved.score,
    };
  }

  async function generationMemoryContext(constraints) {
    if (!memoryProvider?.contextForGeneration) return null;
    return memoryProvider.contextForGeneration({
      mediaAnalysis,
      constraints,
      explicitAncestorReceiptSha256: pendingReToastReceiptSha256,
    });
  }

  async function generate(config = {}, signal) {
    assertReady();
    const feel = currentToastFeel(config.toastFeelId);
    busy = true;
    try {
      const constraints = currentConstraints(config.presetId);
      const profile = await ensureNativeChromaticProfile();
      const lyricTrack = lyricTrackFor(config);
      const analysis = toGenerationAnalysis(mediaAnalysis);
      const responseWitness = responseWitnessFor(mediaAnalysis, analysis);
      const useLabProposal = config.useLabProposal === true;
      if (useLabProposal && pendingReToastReceiptSha256) {
        throw new Error("Re-toast ancestry and Lab Proposal ancestry cannot coexist; clear one first.");
      }
      if (useLabProposal && !stagedLabProposal) {
        throw new Error("Use Lab Proposal is on, but no Lab proposal is staged.");
      }
      const ancestor = await resolveReToastAncestor();
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
      const memoryContext = await generationMemoryContext(constraints);
      const reToastAncestor = ancestor
        ? { receiptSha256: ancestor.receiptSha256, scoreAddress: ancestor.scoreAddress }
        : null;
      const nextFamily = generation.generateCandidateSet({
        analysis,
        responseWitness,
        garmentConstraints: constraints,
        rendererProfile,
        parentScore: ancestor?.score || admitted?.scoreArtifact.score || null,
        rootSeed: config.rootSeed,
        count: 6,
        phase: "initial",
        lyricTrack,
        toastFeelId: feel.id,
        nativeChromaticProfile: profile,
        memoryInfluence: memoryContext?.influencePlan || null,
      });
      const view = await materialize(
        nextFamily,
        config,
        signal,
        influence,
        memoryContext,
        reToastAncestor,
      );
      if (ancestor) pendingReToastReceiptSha256 = null;
      return view;
    } finally {
      busy = false;
    }
  }

  async function importLabProposal(config = {}, signal) {
    if (pendingReToastReceiptSha256) {
      throw new Error("Re-toast ancestry and Lab Proposal ancestry cannot coexist; clear one first.");
    }
    stageLabProposal(config.transfer);
    return generate({ ...config, useLabProposal: true }, signal);
  }

  async function mutate(config = {}, signal) {
    assertReady();
    const feel = currentToastFeel(config.toastFeelId);
    if (!family || family.familyHash !== config.familyHash) {
      throw new Error("Candidate family is no longer current; generate six again.");
    }
    const parent = family.candidates[Number(config.parentIndex)];
    if (!parent) throw new TypeError("Choose a current candidate before mutating.");
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
        toastFeelId: feel.id,
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
          toastFeelId: feel.id,
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
        config,
        signal,
        familyBinding?.labInfluence || null,
        familyBinding?.memoryContext || null,
        familyBinding?.reToastAncestor || null,
      );
    } finally {
      busy = false;
    }
  }

  async function stomp(config = {}, signal) {
    assertReady();
    const feel = currentToastFeel(config.toastFeelId);
    if (!family || family.familyHash !== config.familyHash) {
      throw new Error("Candidate family is no longer current; generate six again.");
    }
    const parent = family.candidates[Number(config.parentIndex)];
    if (!parent) throw new TypeError("Choose a current candidate before stomping.");
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
        config,
        signal,
        familyBinding?.labInfluence || null,
        familyBinding?.memoryContext || null,
        familyBinding?.reToastAncestor || null,
      );
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
    if (!acceptedHistory.some((score) => generation.addressVisualScore(score) === candidate.scoreAddress)) {
      acceptedHistory.push(candidate.scoreArtifact.score);
    }
    return {
      familyHash: family.familyHash,
      index: candidate.index,
      scoreAddress: candidate.scoreAddress,
      timelineHash: candidate.timelineHash,
      frontierEvidence: candidate.frontierEvidence || null,
      acceptedHistoryCount: acceptedHistory.length,
      labInfluence: familyBinding?.labInfluence || { enabled: false },
      reToastAncestor: familyBinding?.reToastAncestor
        ? structuredClone(familyBinding.reToastAncestor)
        : null,
      influenceTrace: currentInfluenceTrace(),
    };
  }

  function executionForRender(config = {}) {
    if (!selection || !familyBinding) return null;
    if (path.resolve(config.audioPath) !== familyBinding.audioPath) return null;
    if (config.presetId !== familyBinding.presetId) return null;
    if (config.toastFeelId !== familyBinding.toastFeelId) return null;
    if (!sameOptionalPath(config.imagePath, familyBinding.imagePath)) return null;
    return {
      visualScore: selection.scoreArtifact.score,
      resolvedTimeline: selection.timeline,
      analysis: mediaAnalysis,
      labInfluence: familyBinding.labInfluence || { enabled: false },
      memoryContext: familyBinding.memoryContext
        ? structuredClone(familyBinding.memoryContext)
        : null,
      reToastAncestor: familyBinding.reToastAncestor
        ? structuredClone(familyBinding.reToastAncestor)
        : null,
      toastFeel: structuredClone(familyBinding.toastFeel),
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
  }

  return {
    armReToast,
    clearCandidates,
    clearReToast,
    currentInfluenceTrace,
    executionForRender,
    generate,
    importLabProposal,
    mutate,
    noteAudio,
    noteImage,
    registerIpc,
    select,
    stageLabProposal,
    stomp,
  };
}

module.exports = {
  CONSTRAINTS_BY_PRESET,
  rendererProfile,
  createCandidateSession,
  responseWitnessFor,
  timedLyricTrack,
  toGenerationAnalysis,
};
