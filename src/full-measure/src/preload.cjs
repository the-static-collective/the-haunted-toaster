const { contextBridge, ipcRenderer, webUtils } = require("electron");

const PRODUCT_NAME = "The Haunted Toaster";
const MAX_LISTENER_EVIDENCE = 10_000;
let pendingListenerEvidence = null;

window.addEventListener("DOMContentLoaded", () => {
  document.title = PRODUCT_NAME;

  const brandHeading = document.querySelector(".brand-line h1");
  if (brandHeading) brandHeading.textContent = PRODUCT_NAME;

  const listenerKicker = document.querySelector(".sync-kicker");
  if (listenerKicker) listenerKicker.textContent = "HAUNTED TOASTER LISTENER";

  const renderHeading = document.querySelector("#renderHeading");
  if (renderHeading) renderHeading.textContent = "Make the full video";

  const listenCloser = document.querySelector("#lyricsAutoSync");
  if (listenCloser) {
    listenCloser.textContent = "Listen Closer";
    listenCloser.title = "Optional · help the Toaster place lyrics more precisely";
  }
});

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function foundryEvidenceFromDom() {
  const input = document.querySelector("#lyricsInput");
  if (!input?.dataset?.lyricFoundryMode) return null;
  return {
    mode: input.dataset.lyricFoundryMode,
    policyVersion: "lyric-prep/v1",
    placedCount: Number(input.dataset.lyricFoundryPlacedCount) || 0,
    unresolvedCount: Number(input.dataset.lyricFoundryUnresolvedCount) || 0,
    humanAnchorCount: Number(input.dataset.lyricFoundryHumanAnchorCount) || 0,
    semanticTimingAuthority: "admitted-only",
  };
}

function normalizeStagedListenerEvidence(evidence = {}) {
  const anchors = Array.isArray(evidence.anchors)
    ? evidence.anchors.slice(0, MAX_LISTENER_EVIDENCE).flatMap((anchor) => {
        const mediaTimeMs = Number(anchor?.mediaTimeMs);
        if (!anchor?.lineId || !Number.isFinite(mediaTimeMs) || mediaTimeMs < 0) return [];
        return [{
          lineId: String(anchor.lineId).slice(0, 96),
          mediaTimeMs: Math.round(mediaTimeMs),
          source: anchor.source === "human-edit" ? "human-edit" : "human-tap",
          anchorVersion: String(anchor.anchorVersion || "lyric-anchor/v1").slice(0, 64),
        }];
      })
    : [];
  const previousEvidence = Array.isArray(evidence.previousEvidence)
    ? evidence.previousEvidence.slice(0, MAX_LISTENER_EVIDENCE).flatMap((entry) => {
        if (!entry?.lineId) return [];
        const hasStart = entry.start !== null && entry.start !== undefined;
        const start = hasStart ? Number(entry.start) : NaN;
        return [{
          lineId: String(entry.lineId).slice(0, 96),
          start: Number.isFinite(start) ? start : null,
          status: String(entry.status || "unmatched").slice(0, 32),
          humanCorrected: entry.humanCorrected === true,
        }];
      })
    : [];
  return { anchors, previousEvidence };
}

async function withLyricFoundry(config = {}) {
  const lyrics = String(config.lyrics || "");
  const foundryEvidence = foundryEvidenceFromDom();
  const lyricProvenance = foundryEvidence
    ? { ...(config.lyricProvenance || {}), ...foundryEvidence }
    : config.lyricProvenance;

  if (!lyrics.trim()) {
    return { ...config, lyricProvenance };
  }

  const summary = await ipcRenderer.invoke("lyrics:inspect", lyrics, 86_400);
  if (summary?.timed) {
    return { ...config, lyricProvenance };
  }

  return {
    ...config,
    lyrics: "",
    lyricProvenance: {
      ...(lyricProvenance || {}),
      mode: "prepared-unresolved",
      policyVersion: "lyric-prep/v1",
      preparedPhraseCount: Number(summary?.cueCount) || 0,
      unresolvedCount: Number(summary?.cueCount) || 0,
      semanticTimingAuthority: "none",
    },
  };
}

contextBridge.exposeInMainWorld("fullMeasure", {
  chooseAudio: () => ipcRenderer.invoke("dialog:choose-audio"),
  chooseImage: () => ipcRenderer.invoke("dialog:choose-image"),
  chooseLyrics: () => ipcRenderer.invoke("dialog:choose-lyrics"),
  chooseOutput: (suggestedName) => ipcRenderer.invoke("dialog:choose-output", suggestedName),
  inspectAudio: (filePath) => ipcRenderer.invoke("media:inspect", filePath),
  fileUrl: (filePath) => ipcRenderer.invoke("media:file-url", filePath),
  inspectLyrics: (value, duration) => ipcRenderer.invoke("lyrics:inspect", value, duration),
  prepareListenerLyrics: (rawSource) =>
    ipcRenderer.sendSync("lyrics:prepare-listener", rawSource),
  discoverLyricSidecar: (audioPath) => ipcRenderer.invoke("lyrics:discover-sidecar", audioPath),
  saveLyricSidecar: (audioPath, content) => ipcRenderer.invoke("lyrics:save-sidecar", { audioPath, content }),
  formatLrc: (config) => ipcRenderer.invoke("lyrics:format-lrc", config),
  manualLyricTrack: (value) => ipcRenderer.invoke("lyrics:manual-track", value),
  listenerStatus: () => ipcRenderer.invoke("listener:status"),
  installListener: () => ipcRenderer.invoke("listener:install"),
  cancelListenerInstall: () => ipcRenderer.invoke("listener:cancel-install"),
  stageListenerEvidence: (evidence) => {
    pendingListenerEvidence = normalizeStagedListenerEvidence(evidence);
    return {
      anchorCount: pendingListenerEvidence.anchors.length,
      previousEvidenceCount: pendingListenerEvidence.previousEvidence.length,
    };
  },
  autoSyncLyrics: (config) => {
    const evidence = pendingListenerEvidence;
    pendingListenerEvidence = null;
    return ipcRenderer.invoke("lyrics:auto-sync", {
      ...config,
      ...(evidence || {}),
    });
  },
  cancelLyricSync: () => ipcRenderer.invoke("lyrics:cancel-sync"),
  generateCandidates: (config) => ipcRenderer.invoke("candidate:generate", config),
  stageLabProposal: (transfer) => ipcRenderer.invoke("candidate:stage-lab-proposal", transfer),
  importLabProposal: (config) => ipcRenderer.invoke("candidate:import-lab-proposal", config),
  mutateCandidates: (config) => ipcRenderer.invoke("candidate:mutate", config),
  stompCandidates: (config) => ipcRenderer.invoke("candidate:stomp", config),
  selectCandidate: (config) => ipcRenderer.invoke("candidate:select", config),
  clearCandidates: () => ipcRenderer.invoke("candidate:clear"),
  clearCandidateImage: () => ipcRenderer.invoke("candidate:clear-image"),
  startRender: async (config) => ipcRenderer.invoke("render:start", await withLyricFoundry(config)),
  cancelRender: () => ipcRenderer.invoke("render:cancel"),
  revealFile: (filePath) => ipcRenderer.invoke("shell:reveal", filePath),
  openFile: (filePath) => ipcRenderer.invoke("shell:open", filePath),
  getVersion: () => ipcRenderer.invoke("app:version"),
  getBuildInfo: () => ipcRenderer.invoke("app:build-info"),
  getToastFeels: () => ipcRenderer.invoke("app:toast-feels"),
  pathForFile: (file) => webUtils.getPathForFile(file),
  onProgress: (callback) => subscribe("render:progress", callback),
  onPhase: (callback) => subscribe("render:phase", callback),
  onListenerInstallProgress: (callback) => subscribe("listener:install-progress", callback),
  onLyricSyncProgress: (callback) => subscribe("lyrics:sync-progress", callback),
  onLyricSyncPhase: (callback) => subscribe("lyrics:sync-phase", callback),
});
