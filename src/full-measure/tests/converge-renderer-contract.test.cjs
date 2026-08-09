const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const candidateUi = fs.readFileSync(
  path.join(root, "src", "renderer", "candidate-ui.js"),
  "utf8",
);

test("CONVERGE remains a one-parent mutation pedal", () => {
  assert.match(candidateUi, /parentIndex: selectedIndex/);
  assert.match(candidateUi, /converge: useConverge/);
  assert.doesNotMatch(candidateUi, /partner|second parent|co-parent/i);
});

test("CONVERGE explains the missing selection instead of inventing partner selection", () => {
  assert.match(candidateUi, /Choose the creature to push into new territory\./);
  assert.match(candidateUi, /CONVERGE · push this creature/);
});

test("CONVERGE returns to the same six-up surface with terse frontier evidence", () => {
  assert.match(candidateUi, /candidate\.role === "converge-frontier"/);
  assert.match(candidateUi, /selectedFrontierTarget/);
  assert.match(candidateUi, /CONVERGE · underexplored \$\{frontier\} · choose one\./);
});
