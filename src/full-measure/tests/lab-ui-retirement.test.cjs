const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const retirement = fs.readFileSync(
  path.join(root, "src", "renderer", "retire-lab-ui.js"),
  "utf8",
);
const keyboard = fs.readFileSync(
  path.join(root, "src", "renderer", "sync-keyboard.js"),
  "utf8",
);
const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");

test("ordinary renderer retires visible Toaster Lab furniture", () => {
  assert.match(retirement, /\.lab-proposal-import,/);
  assert.match(retirement, /\.lab-proposal-toggle/);
  assert.match(retirement, /display: none !important/);
  assert.match(retirement, /node\.remove\(\)/);
  assert.match(retirement, /MutationObserver/);
  assert.match(keyboard, /script\.src = "\.\/retire-lab-ui\.js"/);
  assert.match(keyboard, /loadLabUiRetirement\(\);/);
});

test("legacy Lab compatibility remains behind the retired UI", () => {
  assert.match(preload, /stageLabProposal:/);
  assert.match(preload, /importLabProposal:/);
  assert.match(preload, /candidate:stage-lab-proposal/);
  assert.match(preload, /candidate:import-lab-proposal/);
  assert.doesNotMatch(retirement, /stageLabProposal|importLabProposal|candidate:/);
});
