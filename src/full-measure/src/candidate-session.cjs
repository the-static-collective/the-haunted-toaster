const path = require("node:path");
const base = require("./candidate-session-base.cjs");
const { registerVideoPantryIpc } = require("./video-pantry/electron-ipc.cjs");

function sameVideoBinding(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  if (left.specimenId && right.specimenId) return left.specimenId === right.specimenId;
  if (left.path && right.path) return path.resolve(left.path) === path.resolve(right.path);
  return false;
}

function createCandidateSession(options = {}) {
  const session = base.createCandidateSession(options);
  let video = null;

  function noteVideo(binding) {
    if (!binding) return clearVideo();
    const next = structuredClone(binding);
    if (!sameVideoBinding(video, next)) session.clearCandidates();
    video = next;
    return structuredClone(video);
  }

  function clearVideo() {
    if (video) session.clearCandidates();
    video = null;
    return null;
  }

  function state() {
    return {
      video: video ? structuredClone(video) : null,
    };
  }

  function registerIpc(ipcMain, assertAvailable = () => {}) {
    session.registerIpc(ipcMain, assertAvailable);
    if (!process.versions?.electron) return;

    const { app, BrowserWindow, dialog } = require("electron");
    registerVideoPantryIpc({
      app,
      dialog,
      ipcMain,
      getMainWindow: () => BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null,
      candidateSession: { noteVideo, clearVideo },
    });
  }

  return {
    ...session,
    clearVideo,
    noteVideo,
    registerIpc,
    state,
  };
}

module.exports = {
  ...base,
  createCandidateSession,
};
