const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");
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

test("renderer presents listening as optional precision work", () => {
  assert.match(preload, /listenCloser\.textContent = "Listen Closer"/);
  assert.match(foundryUi, /Optional · help the Toaster place lyrics more precisely/);
  assert.match(foundryUi, /Prepared · \$\{count\} phrase/);
  assert.match(foundryUi, /Timing uncertainty will not be invented/);
});

test("Listener completion admits placed cues without requiring every line", () => {
  assert.match(foundryUi, /syncAccept\.disabled = false/);
  assert.match(foundryUi, /syncAccept\.textContent = "Use what we know"/);
  assert.match(foundryUi, /\.filter\(\(cue\) => cue\.text && Number\.isFinite\(cue\.start\)\)/);
  assert.match(foundryUi, /lyricFoundryUnresolvedCount/);
  assert.match(foundryUi, /Only admitted timing will render/);
});

test("explicit human anchors survive re-listening", () => {
  assert.match(foundryUi, /collectHumanAnchors/);
  assert.match(foundryUi, /pendingHumanAnchors = collectHumanAnchors\(\)/);
  assert.match(foundryUi, /input\.dispatchEvent\(new Event\("change"/);
  assert.match(foundryUi, /window\.confirm = \(\) => true/);
});
