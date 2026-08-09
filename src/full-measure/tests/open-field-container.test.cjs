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

test("Open Field is the default container above optional ancestral garments", () => {
  assert.match(hierarchy, /heading\.textContent = "Starting field"/);
  assert.match(hierarchy, /Open by default\. Choose an ancestor only when you want one to seed the field\./);
  assert.match(hierarchy, /list\.insertAdjacentElement\("beforebegin", openField\)/);
  assert.match(hierarchy, /<span>Ancestors<\/span><strong>Optional<\/strong>/);
  assert.match(hierarchy, /list\.setAttribute\("aria-label", "Ancestral garments"\)/);
  assert.match(hierarchy, /openField\.classList\.add\("starting-field-open", "is-selected"\)/);
  assert.match(hierarchy, /ancestor\.classList\.remove\("is-selected"\)/);
  assert.match(hierarchy, /slate\.textContent = "Open Field"/);
});

test("the production renderer loads the hierarchy without replacing generation law", () => {
  assert.match(keyboard, /script\.src = "\.\/starting-field-ui\.js"/);
  assert.match(keyboard, /loadStartingFieldHierarchy\(\);/);
  assert.doesNotMatch(hierarchy, /Math\.random|Date\.now|candidate:generate|render:start/);
});
