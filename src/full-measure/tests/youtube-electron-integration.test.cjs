const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const main = read("src", "main.cjs");
const youtubeMain = read("src", "publish", "youtube-main.cjs");
const preload = read("src", "preload.cjs");
const html = read("src", "renderer", "index.html");
const renderer = read("src", "renderer", "youtube-publish-ui.js");

test("Electron main delegates YouTube publication to a purpose-specific main-process boundary", () => {
  assert.match(main, /safeStorage/);
  assert.match(main, /createYouTubePublishing/);
  assert.match(main, /youtubePublishing\.registerIpc\(\)/);
  assert.match(main, /youtubePublishing\.noteCompletedRender\(result\)/);
  assert.match(main, /youtubePublishing\.abort\(\)/);

  assert.match(youtubeMain, /createYouTubeCredentialStore/);
  assert.match(youtubeMain, /buildAuthorizationUrl/);
  assert.match(youtubeMain, /createPkcePair/);
  assert.match(youtubeMain, /parseOAuthCallback/);
  assert.match(youtubeMain, /beginResumableUpload/);
  assert.match(youtubeMain, /uploadResumableFile/);
  assert.match(youtubeMain, /writePublicationReceipt/);
  assert.match(youtubeMain, /studioEditUrl/);
  assert.match(youtubeMain, /let lastCompletedRender = null/);
  assert.match(youtubeMain, /let activeYouTubePublish = null/);

  assert.match(youtubeMain, /ipcMain\.handle\("youtube:status"/);
  assert.match(youtubeMain, /ipcMain\.handle\("youtube:configure"/);
  assert.match(youtubeMain, /ipcMain\.handle\("youtube:publish"/);
  assert.match(youtubeMain, /ipcMain\.handle\("youtube:cancel"/);
  assert.match(youtubeMain, /ipcMain\.handle\("youtube:open-studio"/);
  assert.match(youtubeMain, /event\.sender\.send\("youtube:progress"/);

  assert.match(youtubeMain, /const outputPath = lastCompletedRender\.outputPath/);
  assert.match(youtubeMain, /sourceSha256:\s*lastCompletedRender\.receipt\.output\.sha256/);
  assert.match(youtubeMain, /lastCompletedRender = result/);
  assert.doesNotMatch(youtubeMain, /config\?\.outputPath/);
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
