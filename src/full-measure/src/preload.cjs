const { contextBridge, ipcRenderer, webUtils } = require("electron");

const PRODUCT_NAME = "The Haunted Toaster";

window.addEventListener("DOMContentLoaded", () => {
  document.title = PRODUCT_NAME;

  const brandHeading = document.querySelector(".brand-line h1");
  if (brandHeading) brandHeading.textContent = PRODUCT_NAME;

  const listenerKicker = document.querySelector(".sync-kicker");
  if (listenerKicker) listenerKicker.textContent = "HAUNTED TOASTER LISTENER";

  const renderHeading = document.querySelector("#renderHeading");
  if (renderHeading) renderHeading.textContent = "Make the full video";

  const candidateStyle = document.createElement("link");
  candidateStyle.rel = "stylesheet";
  candidateStyle.href = "./candidate-ui.css";
  document.head.append(candidateStyle);

  const candidateScript = document.createElement("script");
  candidateScript.src = "./candidate-ui.js";
  document.body.append(candidateScript);

  const labProposalScript = document.createElement("script");
  labProposalScript.src = "./lab-proposal-ui.js";
  document.body.append(labProposalScript);
});

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("fullMeasure", {
  chooseAudio: () => ipcRenderer.invoke("dialog:choose-audio"),
  chooseImage: () => ipcRenderer.invoke("dialog:choose-image"),
  chooseLyrics: () => ipcRenderer.invoke("dialog:choose-lyrics"),
  chooseOutput: (suggestedName) =>
    ipcRenderer.invoke("dialog:choose-output", suggestedName),
  inspectAudio: (filePath) => ipcRenderer.invoke("media:inspect", filePath),
  fileUrl: (filePath) => ipcRenderer.invoke("media:file-url", filePath),
  inspectLyrics: (value, duration) =>
    ipcRenderer.invoke("lyrics:inspect", value, duration),
  discoverLyricSidecar: (audioPath) =>
    ipcRenderer.invoke("lyrics:discover-sidecar", audioPath),
  saveLyricSidecar: (audioPath, content) =>
    ipcRenderer.invoke("lyrics:save-sidecar", { audioPath, content }),
  formatLrc: (config) => ipcRenderer.invoke("lyrics:format-lrc", config),
  manualLyricTrack: (value) =>
    ipcRenderer.invoke("lyrics:manual-track", value),
  listenerStatus: () => ipcRenderer.invoke("listener:status"),
  installListener: () => ipcRenderer.invoke("listener:install"),
  cancelListenerInstall: () =>
    ipcRenderer.invoke("listener:cancel-install"),
  autoSyncLyrics: (config) => ipcRenderer.invoke("lyrics:auto-sync", config),
  cancelLyricSync: () => ipcRenderer.invoke("lyrics:cancel-sync"),
  generateCandidates: (config) => ipcRenderer.invoke("candidate:generate", config),
  stageLabProposal: (transfer) => ipcRenderer.invoke("candidate:stage-lab-proposal", transfer),
  importLabProposal: (config) => ipcRenderer.invoke("candidate:import-lab-proposal", config),
  mutateCandidates: (config) => ipcRenderer.invoke("candidate:mutate", config),
  selectCandidate: (config) => ipcRenderer.invoke("candidate:select", config),
  clearCandidates: () => ipcRenderer.invoke("candidate:clear"),
  clearCandidateImage: () => ipcRenderer.invoke("candidate:clear-image"),
  startRender: (config) => ipcRenderer.invoke("render:start", config),
  cancelRender: () => ipcRenderer.invoke("render:cancel"),
  revealFile: (filePath) => ipcRenderer.invoke("shell:reveal", filePath),
  openFile: (filePath) => ipcRenderer.invoke("shell:open", filePath),
  getVersion: () => ipcRenderer.invoke("app:version"),
  pathForFile: (file) => webUtils.getPathForFile(file),
  onProgress: (callback) => subscribe("render:progress", callback),
  onPhase: (callback) => subscribe("render:phase", callback),
  onListenerInstallProgress: (callback) =>
    subscribe("listener:install-progress", callback),
  onLyricSyncProgress: (callback) =>
    subscribe("lyrics:sync-progress", callback),
  onLyricSyncPhase: (callback) =>
    subscribe("lyrics:sync-phase", callback),
});
