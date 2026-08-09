const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const openField = require("../constraints/open-field.v1.json");
const porchlight = require("../constraints/porchlight.v2.json");
const wireOrchard = require("../constraints/wire-orchard.v2.json");
const absoluteResidual = require("../constraints/absolute-residual.v2.json");
const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");
const session = fs.readFileSync(path.join(root, "src", "candidate-session.cjs"), "utf8");
const presets = fs.readFileSync(path.join(root, "src", "render", "presets.cjs"), "utf8");

function union(values) {
  return [...new Set(values.flat())].sort();
}

test("Open Field contains the admitted ancestral categorical vocabulary", () => {
  assert.deepEqual(
    [...openField.topology.allowed].sort(),
    union([porchlight.topology.allowed, wireOrchard.topology.allowed, absoluteResidual.topology.allowed]),
  );
  assert.deepEqual(
    [...openField.motion.grammar.allowed].sort(),
    union([porchlight.motion.grammar.allowed, wireOrchard.motion.grammar.allowed, absoluteResidual.motion.grammar.allowed]),
  );
  assert.deepEqual(
    [...openField.material.texture.allowed].sort(),
    union([porchlight.material.texture.allowed, wireOrchard.material.texture.allowed, absoluteResidual.material.texture.allowed]),
  );
});

test("Open Field is explicit in generation and rendering instead of falling through", () => {
  assert.match(session, /const openField = require\("\.\.\/constraints\/open-field\.v1\.json"\)/);
  assert.match(session, /CONSTRAINTS_BY_PRESET = Object\.freeze\(\{\s*openField,/);
  assert.match(presets, /openField:\s*\{/);
  assert.match(presets, /name: "Open Field"/);
});

test("starting-field UX keeps named garments as optional ancestors", () => {
  assert.match(preload, /Choose a starting field/);
  assert.match(preload, /Begin open, or inherit an ancestral garment\./);
  assert.match(preload, /card\.dataset\.preset = "openField"/);
  assert.match(preload, /ancestors, not walls/);
  assert.match(preload, /withSelectedStartingField/);
});
