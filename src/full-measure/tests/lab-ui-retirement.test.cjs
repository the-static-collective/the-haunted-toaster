const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const rendererHtml = fs.readFileSync(path.join(root, "src", "renderer", "index.html"), "utf8");
const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");

test("ordinary renderer never creates retired Toaster Lab furniture", () => {
  assert.doesNotMatch(rendererHtml, /lab-proposal-ui|Import Lab Proposal|Use Lab Proposal/);
  assert.doesNotMatch(preload, /labProposalScript|lab-proposal-ui|useLabProposal/);
  assert.equal(fs.existsSync(path.join(root, "src", "renderer", "lab-proposal-ui.js")), false);
  assert.equal(fs.existsSync(path.join(root, "src", "renderer", "retire-lab-ui.js")), false);
});

test("legacy Lab compatibility remains behind the retired UI", () => {
  assert.match(preload, /stageLabProposal:/);
  assert.match(preload, /importLabProposal:/);
  assert.match(preload, /candidate:stage-lab-proposal/);
  assert.match(preload, /candidate:import-lab-proposal/);
  assert.match(preload, /stageLabProposal:/);
});
