const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");
const rendererHtml = fs.readFileSync(
  path.join(root, "src", "renderer", "index.html"),
  "utf8",
);
const appJs = fs.readFileSync(
  path.join(root, "src", "renderer", "app.js"),
  "utf8",
);
const foundryUi = fs.readFileSync(
  path.join(root, "src", "renderer", "lyric-foundry-ui.js"),
  "utf8",
);

test("plain lyric evidence cannot enter render as synthetic canonical timing", () => {
  assert.match(preload, /const summary = await ipcRenderer\.invoke\("lyrics:inspect"/);
  assert.match(preload, /if \(summary\?\.timed\)/);
  assert.match(preload, /lyrics: ""/);
  assert.match(preload, /mode: "prepared-unresolved"/);
  assert.match(preload, /semanticTimingAuthority: "none"/);
});

test("production renderer actually activates the Lyric Foundry review policy", () => {
  assert.match(rendererHtml, /<script src="\.\/app\.js"><\/script>/);
  assert.match(rendererHtml, /<script src="\.\/lyric-foundry-ui\.js"><\/script>/);
  assert.match(rendererHtml, /<script src="\.\/sync-keyboard\.js"><\/script>/);
  assert.doesNotMatch(preload, /lyricFoundryScript\.src/);
});

test("renderer presents listening as optional precision work", () => {
  assert.match(preload, /listenCloser\.textContent = "Listen Closer"/);
  assert.match(foundryUi, /Optional · help the Toaster place lyrics more precisely/);
  assert.match(foundryUi, /Prepared · \$\{count\} phrase/);
  assert.match(foundryUi, /Timing uncertainty will not be invented/);
});

test("Listener completion admits placed cues without requiring every line", () => {
  assert.match(appJs, /elements\.syncAccept\.disabled = false/);
  assert.match(appJs, /\? "Use what we know"/);
  assert.match(
    appJs,
    /const admittedCues = cues\.filter\(\(cue\) => Number\.isFinite\(cue\.start\)\)/,
  );
  assert.match(appJs, /const unresolvedCount = cues\.length - admittedCues\.length/);
  assert.match(appJs, /cues: admittedCues/);
  assert.match(appJs, /matchedCount: admittedCues\.length/);
  assert.match(appJs, /unresolvedCount,/);
  assert.match(appJs, /Only admitted timing will render/);
  assert.match(appJs, /if \(state\.acceptingLyrics\) return/);
  assert.match(appJs, /finally \{\s*state\.acceptingLyrics = false/);
});

test("legacy all-or-nothing lyric admission cannot return", () => {
  assert.doesNotMatch(appJs, /syncAccept\.disabled = unplaced > 0/);
  assert.doesNotMatch(appJs, /if \(unplaced\.length\) return;/);
  assert.doesNotMatch(foundryUi, /acceptPartialListening/);
  assert.doesNotMatch(foundryUi, /stopImmediatePropagation/);
  assert.doesNotMatch(
    foundryUi,
    /document\.addEventListener\("click",[^\n]*syncAccept/,
  );
});

test("explicit human anchors survive re-listening", () => {
  assert.match(foundryUi, /collectHumanAnchors/);
  assert.match(foundryUi, /pendingHumanAnchors = collectHumanAnchors\(\)/);
  assert.match(foundryUi, /input\.dispatchEvent\(new Event\("change"/);
  assert.match(foundryUi, /window\.confirm = \(\) => true/);
});
