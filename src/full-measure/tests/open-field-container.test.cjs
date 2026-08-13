const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const controller = fs.readFileSync(
  path.join(root, "src", "renderer", "toast-feel-controller.js"),
  "utf8",
);
const rendererHtml = fs.readFileSync(
  path.join(root, "src", "renderer", "index.html"),
  "utf8",
);
const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");

test("Open Field remains an internal compatibility container, not front-panel furniture", () => {
  assert.match(rendererHtml, /<h2 id="garmentHeading">Toast Feel<\/h2>/);
  assert.match(rendererHtml, /id="toastFeelChoices"/);
  assert.match(rendererHtml, /aria-label="Toast Feel"/);
  assert.doesNotMatch(rendererHtml, /starting-field-container|Optional ancestral garments/);
  assert.doesNotMatch(rendererHtml, /data-preset="openField"/);
  assert.doesNotMatch(controller, /presetId|openField/);
  assert.doesNotMatch(preload, /withSelectedStartingField/);
});

test("Toast Feel selection comes from canonical manifest evidence", () => {
  assert.match(controller, /api\.getToastFeels\(\)/);
  assert.match(controller, /new CustomEvent\("toast-feel-change"/);
  assert.match(controller, /publicEvidence\(selection\)/);
  assert.doesNotMatch(controller, /Math\.random|Date\.now|candidate:generate|render:start/);
});

test("the production renderer loads core controllers explicitly", () => {
  assert.match(rendererHtml, /<script src="\.\/toast-feel-controller\.js"><\/script>/);
  assert.match(rendererHtml, /<script src="\.\/candidate-ui\.js"><\/script>/);
  assert.match(rendererHtml, /<script src="\.\/lyric-foundry-ui\.js"><\/script>/);
  assert.doesNotMatch(controller, /Math\.random|Date\.now|candidate:generate|render:start/);
});
