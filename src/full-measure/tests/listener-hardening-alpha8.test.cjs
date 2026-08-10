const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const foundryUi = read("src", "renderer", "lyric-foundry-ui.js");
const app = read("src", "renderer", "app.js");
const preload = read("src", "preload.cjs");
const main = read("src", "main.cjs");
const autoSync = read("src", "align", "auto-sync.cjs");
const keyboard = read("src", "renderer", "sync-keyboard.js");
const indexHtml = read("src", "renderer", "index.html");

const {
  prepareLyrics,
  summarizeLyricPreparation,
  summarizeRelistenDelta,
} = require("../src/align/lyric-foundry.cjs");

test("re-listen transports stable anchors without mutating lyric source or confirm", () => {
  assert.match(foundryUi, /lineId:/);
  assert.match(foundryUi, /mediaTimeMs:/);
  assert.match(foundryUi, /source:\s*"human-edit"/);
  assert.doesNotMatch(foundryUi, /HT_ANCHORS_V1|packAnchorEnvelope|window\.confirm/);
  assert.doesNotMatch(foundryUi, /lyricsInput\.value\s*=/);

  assert.match(app, /collectHumanAnchors/);
  assert.match(app, /runAutoSync\(\{[\s\S]*anchors/);
  assert.doesNotMatch(app, /discard these cue edits|window\.confirm/);

  assert.match(preload, /autoSyncLyrics:\s*\(config\).*lyrics:auto-sync/);
  assert.match(main, /config\?\.anchors/);
  assert.match(autoSync, /prepareLyrics\(lyrics\)/);
  assert.match(autoSync, /config\.anchors/);
  assert.doesNotMatch(autoSync, /unpackAnchorEnvelope|envelope\.anchors|envelope\.lyrics/);
});

test("preparation receipt reports actual deterministic preparation decisions", () => {
  const prepared = prepareLyrics([
    "[Verse 1]",
    "  first sung phrase  ",
    "second sung phrase",
    "   continued wrap",
    "(guitar solo)",
    "",
  ].join("\n"));

  assert.deepEqual(summarizeLyricPreparation(prepared), {
    policyVersion: "lyric-prep/v1",
    retainedPhraseCount: 2,
    removedCount: 3,
    structuralLabelsRemoved: 1,
    performanceNotesRemoved: 1,
    blankLinesRemoved: 1,
    wrapsJoined: 1,
    trimmedPhrases: 1,
  });
});

test("re-listen delta is explanatory and counts held anchors, recoveries, losses and unresolved", () => {
  const before = [
    { lineId: "a", start: 1, status: "human" },
    { lineId: "b", start: null, status: "unmatched" },
    { lineId: "c", start: 6, status: "high" },
    { lineId: "d", start: null, status: "unmatched" },
  ];
  const after = [
    { lineId: "a", start: 1, status: "human" },
    { lineId: "b", start: 3, status: "medium" },
    { lineId: "c", start: null, status: "unmatched" },
    { lineId: "d", start: null, status: "unmatched" },
  ];
  const anchors = [{ lineId: "a", mediaTimeMs: 1000, source: "human-edit" }];

  assert.deepEqual(summarizeRelistenDelta(before, after, anchors), {
    anchorsHeld: 1,
    machineRecovered: 1,
    machineLost: 1,
    unresolved: 2,
  });
});

test("Listener editor exposes preparation and re-listen evidence", () => {
  assert.match(indexHtml, /id="lyricPrepReceipt"/);
  assert.match(indexHtml, /id="relistenDelta"/);
  assert.match(app, /lyricPreparation/);
  assert.match(app, /relistenDelta/);
});

test("native audio arrows are captured by Listener while timestamp inputs retain editing authority", () => {
  assert.match(keyboard, /event\.target\s*===\s*audio/);
  assert.match(keyboard, /addEventListener\("keydown"[\s\S]*true\s*\)/);
  assert.match(keyboard, /ArrowLeft/);
  assert.match(keyboard, /ArrowRight/);
  assert.match(keyboard, /ArrowUp/);
  assert.match(keyboard, /ArrowDown/);
  assert.match(keyboard, /editingControlHasFocus/);
});
