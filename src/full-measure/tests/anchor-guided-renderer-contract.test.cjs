const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const foundryUi = fs.readFileSync(
  path.join(root, "src", "renderer", "lyric-foundry-ui.js"),
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

test("Listen Again sends precise human anchors without mutating visible lyric source", () => {
  assert.match(foundryUi, /const sliderTime = Number\(row\.querySelector\("\.cue-slider"\)\?\.value\)/);
  assert.match(foundryUi, /cueIndex: Number\(row\.dataset\.cueIndex\)/);
  assert.match(foundryUi, /lineIndex: anchor\.cueIndex/);
  assert.match(foundryUi, /packAnchorEnvelope\(originalLyrics, pendingHumanAnchors\)/);
  assert.match(foundryUi, /lyricsInput\.value = originalLyrics/);
  assert.match(foundryUi, /Your human timing edits will be kept/);
  assert.match(foundryUi, /window\.confirm = \(\) => true/);
});

test("Listener unwraps anchor evidence before lyric parsing and activates bounded recovery", () => {
  assert.match(autoSync, /const envelope = unpackAnchorEnvelope\(config\.lyrics\)/);
  assert.match(autoSync, /const lyrics = envelope\.lyrics/);
  assert.match(autoSync, /envelope\.anchors\.length/);
  assert.match(autoSync, /alignLyricsToTranscriptWithAnchors/);
  assert.match(autoSync, /anchors: envelope\.anchors/);
  assert.match(guided, /entriesInsideWindow/);
  assert.match(guided, /mapped\.start < startTime/);
  assert.match(guided, /mapped\.end > endTime/);
  assert.doesNotMatch(guided, /interpolat|evenly|Math\.random|Date\.now/);
});
