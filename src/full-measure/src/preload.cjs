const { contextBridge, ipcRenderer, webUtils } = require("electron");

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
