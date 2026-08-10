const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const controller = fs.readFileSync(
  path.join(root, "src", "renderer", "starting-field-controller.js"),
  "utf8",
);
const rendererHtml = fs.readFileSync(
  path.join(root, "src", "renderer", "index.html"),
  "utf8",
);
const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");

test("Open Field is default state and container, not a fourth button", () => {
  assert.match(rendererHtml, /<h2 id="garmentHeading">Starting field<\/h2>/);
  assert.match(rendererHtml, /starting-field-container/);
  assert.match(rendererHtml, /<span>Open Field<\/span>/);
  assert.match(rendererHtml, /aria-label="Optional ancestral garments"/);
  assert.doesNotMatch(rendererHtml, /data-preset="openField"/);
  assert.match(controller, /presetId: "openField", presetName: "Open Field"/);
  assert.doesNotMatch(preload, /withSelectedStartingField/);
});

test("ancestral garments are optional seeds and can return to open", () => {
  assert.match(controller, /const wasSelected = card\.classList\.contains\("is-selected"\)/);
  assert.match(controller, /if \(wasSelected\) return selectOpenField\(\)/);
  assert.match(controller, /selection = \{ presetId: card\.dataset\.preset, presetName \}/);
  assert.match(controller, /new CustomEvent\("starting-field-change"/);
});

test("the production renderer loads core controllers explicitly", () => {
  assert.match(rendererHtml, /<script src="\.\/starting-field-controller\.js"><\/script>/);
  assert.match(rendererHtml, /<script src="\.\/candidate-ui\.js"><\/script>/);
  assert.match(rendererHtml, /<script src="\.\/lyric-foundry-ui\.js"><\/script>/);
  assert.doesNotMatch(controller, /Math\.random|Date\.now|candidate:generate|render:start/);
});
