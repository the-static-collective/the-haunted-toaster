const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(
  path.join(root, "src", "renderer", "app.js"),
  "utf8",
);
const foundryUi = fs.readFileSync(
  path.join(root, "src", "renderer", "lyric-foundry-ui.js"),
  "utf8",
);
const preload = fs.readFileSync(
  path.join(root, "src", "preload.cjs"),
  "utf8",
);
const autoSync = fs.readFileSync(
  path.join(root, "src", "align", "auto-sync.cjs"),
  "utf8",
);
const guided = fs.readFileSync(
  path.join(root, "src", "align", "anchor-guided.cjs"),
  "utf8",
);

test("Listen Again stages stable human anchors without mutating visible lyric source", () => {
  assert.match(foundryUi, /lineId:/);
  assert.match(foundryUi, /mediaTimeMs:/);
  assert.match(foundryUi, /source:\s*"human-edit"/);
  assert.match(foundryUi, /stageListenerEvidence\?\.\(\{ anchors, previousEvidence \}\)/);
  assert.match(preload, /stageListenerEvidence/);
  assert.doesNotMatch(foundryUi, /HT_ANCHORS_V1|packAnchorEnvelope|window\.confirm/);
  assert.doesNotMatch(foundryUi, /lyricsInput\.value\s*=/);
});

test("Listener prepares lyrics, validates stable anchors, then activates bounded recovery", () => {
  assert.match(autoSync, /prepareLyrics\(lyrics\)/);
  assert.match(autoSync, /normalizeAnchors/);
  assert.match(autoSync, /config\.anchors/);
  assert.match(autoSync, /anchorsForGuidedMatcher/);
  assert.match(autoSync, /alignLyricsToTranscriptWithAnchors/);
  assert.doesNotMatch(autoSync, /unpackAnchorEnvelope|envelope\.anchors|envelope\.lyrics/);
  assert.match(guided, /entriesInsideWindow/);
  assert.match(guided, /mapped\.start < startTime/);
  assert.match(guided, /mapped\.end > endTime/);
  assert.doesNotMatch(guided, /interpolat|evenly|Math\.random|Date\.now/);
});

test("closing and reopening Listener preserves the in-progress human-edited alignment", () => {
  assert.match(app, /if \(state\.alignment\) \{\s*openSyncDialog\(\);\s*showAlignmentEditor\(state\.alignment\);\s*return;/s);
  assert.match(app, /haunted-listener-relisten/);
  assert.match(app, /state\.alignment = null;\s*state\.selectedCueIndex = null;\s*scheduleLyricInspection\(\);/s);
  assert.match(foundryUi, /haunted-listener-relisten/);
  assert.doesNotMatch(foundryUi, /listenCloser\?\.click\(\)/);
  assert.doesNotMatch(app, /function closeSyncDialog\(\)[\s\S]*?state\.alignment\s*=\s*null/);
});
