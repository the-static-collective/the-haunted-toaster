const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const candidateUi = fs.readFileSync(
  path.join(root, "src", "renderer", "candidate-ui.js"),
  "utf8",
);
const moveDeck = fs.readFileSync(
  path.join(root, "src", "renderer", "candidate-move-deck.js"),
  "utf8",
);

test("CONVERGE remains a one-parent mutation move", () => {
  assert.match(moveDeck, /kind: "converge"/);
  assert.match(moveDeck, /action: "mutate"/);
  assert.match(candidateUi, /const converge = proposal\.kind === "converge"/);
  assert.match(candidateUi, /parentIndex: proposal\.parentIndex \?\? selectedIndex/);
  assert.match(candidateUi, /converge,/);
});

test("CONVERGE is proposed only after a current creature exists", () => {
  assert.match(candidateUi, /Choose a creature above to deal moves\./);
  assert.match(moveDeck, /CONVERGE · underexplored/);
  assert.match(moveDeck, /parentIndex: context\.selectedIndex/);
});

test("CONVERGE returns to the same six-up surface with terse frontier evidence", () => {
  assert.match(candidateUi, /candidate\.role === "converge-frontier"/);
  assert.match(candidateUi, /selectedFrontierTarget/);
  assert.match(candidateUi, /CONVERGE · underexplored \$\{frontier\} · choose one\./);
});
