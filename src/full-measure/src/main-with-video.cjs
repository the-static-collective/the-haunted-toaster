const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { createCandidateSession } = require("./video-candidate-session.cjs");
const { registerVideoPantryIpc } = require("./video-pantry/electron-ipc.cjs");

require("./main.cjs");

const videoSession = createCandidateSession();

app.whenReady().then(() => {
  registerVideoPantryIpc({
    app,
    dialog,
    ipcMain,
    getMainWindow: () => BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null,
    candidateSession: videoSession,
  });
});
