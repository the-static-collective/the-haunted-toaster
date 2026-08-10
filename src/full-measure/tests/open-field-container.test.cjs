const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const hierarchy = fs.readFileSync(
  path.join(root, "src", "renderer", "starting-field-ui.js"),
  "utf8",
);
const keyboard = fs.readFileSync(
  path.join(root, "src", "renderer", "sync-keyboard.js"),
  "utf8",
);
const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");

test("Open Field is default state and container, not a fourth button", () => {
  assert.match(hierarchy, /heading\.textContent = "Starting field"/);
  assert.match(
    hierarchy,
    /Open by default\. Choose an ancestor only when you want one to seed the field\./,
  );
  assert.match(hierarchy, /stateMarker\.hidden = true/);
  assert.match(hierarchy, /stateMarker\.dataset\.preset = "openField"/);
  assert.match(hierarchy, /starting-field-container/);
  assert.match(hierarchy, /<span>Open Field<\/span>/);
  assert.match(hierarchy, /Default container/);
  assert.match(hierarchy, /<span>Ancestors<\/span><strong>Optional<\/strong>/);
  assert.match(hierarchy, /list\.setAttribute\("aria-label", "Optional ancestral garments"\)/);
  assert.doesNotMatch(hierarchy, /createElement\("button"\)/);
  assert.doesNotMatch(preload, /installOpenFieldDoor|card\.dataset\.preset = "openField"/);
});

test("ancestral garments are optional seeds and can return to open", () => {
  assert.match(hierarchy, /ancestor\.classList\.remove\("is-selected"\)/);
  assert.match(hierarchy, /ancestor\.dataset\.startingFieldSelected = "false"/);
  assert.match(hierarchy, /const wasSelected = ancestor\.dataset\.startingFieldSelected === "true"/);
  assert.match(hierarchy, /if \(wasSelected\) \{\s*showOpenField\(\)/);
  assert.match(hierarchy, /showAncestor\(ancestor\)/);
  assert.match(hierarchy, /Open Field · \$\{name\} ancestor/);
});

test("the production renderer loads the hierarchy without replacing generation law", () => {
  assert.match(keyboard, /script\.src = "\.\/starting-field-ui\.js"/);
  assert.match(keyboard, /loadStartingFieldHierarchy\(\);/);
  assert.doesNotMatch(hierarchy, /Math\.random|Date\.now|candidate:generate|render:start/);
});
