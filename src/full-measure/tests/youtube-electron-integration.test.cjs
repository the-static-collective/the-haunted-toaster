const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const main = read("src", "main.cjs");
const preload = read("src", "preload.cjs");
const html = read("src", "renderer", "index.html");
const renderer = read("src", "renderer", "youtube-publish-ui.js");

test("Electron main owns YouTube credentials, browser auth, and last-render publication authority", () => {
  assert.match(main, /safeStorage/);
  assert.match(main, /createYouTubeCredentialStore/);
  assert.match(main, /buildAuthorizationUrl/);
  assert.match(main, /createPkcePair/);
  assert.match(main, /parseOAuthCallback/);
  assert.match(main, /beginResumableUpload/);
  assert.match(main, /uploadResumableFile/);
  assert.match(main, /writePublicationReceipt/);
  assert.match(main, /studioEditUrl/);
  assert.match(main, /let lastCompletedRender = null/);
  assert.match(main, /let activeYouTubePublish = null/);

  assert.match(main, /ipcMain\.handle\("youtube:status"/);
  assert.match(main, /ipcMain\.handle\("youtube:configure"/);
  assert.match(main, /ipcMain\.handle\("youtube:publish"/);
  assert.match(main, /ipcMain\.handle\("youtube:cancel"/);
  assert.match(main, /ipcMain\.handle\("youtube:open-studio"/);
  assert.match(main, /event\.sender\.send\("youtube:progress"/);

  assert.match(main, /const outputPath = lastCompletedRender\.outputPath/);
  assert.match(main, /sourceSha256:\s*lastCompletedRender\.receipt\.output\.sha256/);
  assert.match(main, /lastCompletedRender = result/);
  assert.doesNotMatch(main, /config\?\.outputPath/);
});

test("sandbox preload exposes only purpose-specific YouTube publication calls", () => {
  assert.match(preload, /getYouTubeStatus:\s*\(\) => ipcRenderer\.invoke\("youtube:status"\)/);
  assert.match(preload, /configureYouTube:\s*\(clientId\) =>\s*ipcRenderer\.invoke\("youtube:configure", \{ clientId \}\)/);
  assert.match(preload, /publishToYouTube:\s*\(config\) => ipcRenderer\.invoke\("youtube:publish", config\)/);
  assert.match(preload, /cancelYouTubePublish:\s*\(\) => ipcRenderer\.invoke\("youtube:cancel"\)/);
  assert.match(preload, /openYouTubeStudio:\s*\(videoId\) =>\s*ipcRenderer\.invoke\("youtube:open-studio", videoId\)/);
  assert.match(preload, /onYouTubeProgress:\s*\(callback\) => subscribe\("youtube:progress", callback\)/);
  assert.doesNotMatch(preload, /openExternal/);
});

test("production renderer makes private YouTube delivery explicit after a completed toast", () => {
  for (const id of [
    "youtubePublishCard",
    "youtubeClientSetup",
    "youtubeClientId",
    "youtubeSaveClientId",
    "youtubePublishButton",
    "youtubeCancelButton",
    "youtubeProgress",
    "youtubeProgressFill",
    "youtubeProgressText",
    "youtubeStatusText",
    "youtubeStudioButton",
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  assert.match(html, /youtube-publish-ui\.js/);
  assert.match(html, /Publish privately to YouTube/i);
  assert.match(html, /Public|Unlisted/i);
  assert.match(html, /YouTube Studio/i);
  assert.match(html, /API approval|API project|approval/i);
  assert.match(html, /Publishing is optional/i);

  assert.match(renderer, /api\.getYouTubeStatus\(/);
  assert.match(renderer, /api\.configureYouTube\(/);
  assert.match(renderer, /api\.publishToYouTube\(\{[\s\S]*?title:[\s\S]*?description:/);
  assert.doesNotMatch(renderer, /publishToYouTube\(\{[\s\S]*?outputPath:/);
  assert.match(renderer, /api\.cancelYouTubePublish\(/);
  assert.match(renderer, /api\.openYouTubeStudio\(state\.youtube\.videoId\)/);
  assert.match(renderer, /api\.onYouTubeProgress\(/);
  assert.match(renderer, /youtubePublishCard\.classList\.remove\("is-hidden"\)/);
  assert.match(renderer, /Uploaded privately/i);
});
