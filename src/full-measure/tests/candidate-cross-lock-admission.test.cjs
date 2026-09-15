const test = require("node:test");
const assert = require("node:assert/strict");

const { dealCandidateMoves } = require("../src/renderer/candidate-move-deck.js");

function candidate(index, palette, motion = "still") {
  return {
    index,
    scoreAddress: `visual-score:sha256:cross-lock-${index}`,
    signature: `candidate-${index}`,
    toastmoodLane: { id: `lane-${index}`, name: `Lane ${index}` },
    crossLockProjection: {
      topology: "linear::scope",
      motion: `${motion}::inertial`,
      palette,
      material: "clean",
      lyric: "steady",
      camera: "locked",
      temporalDensity: "mid",
      atmosphere: "none",
    },
  };
}

function context({ locks = ["palette"], candidates } = {}) {
  return {
    familyHash: "family:sha256:cross-lock-admission",
    selectedIndex: 0,
    dealIndex: 0,
    locks,
    candidates: candidates || [
      candidate(0, "garment-a"),
      candidate(1, "garment-a"),
      candidate(2, "garment-a"),
      candidate(3, "garment-b"),
      candidate(4, "garment-b"),
      candidate(5, "garment-b"),
    ],
  };
}

function crosses(deal) {
  return deal.proposals.filter((proposal) => proposal.kind === "cross");
}

test("CROSS move deck admits only partners compatible with every selected lock", () => {
  const proposals = crosses(dealCandidateMoves(context()));

  assert.equal(proposals.length, 2);
  assert.ok(proposals.every((proposal) => proposal.available !== false));
  assert.deepEqual(
    new Set(proposals.map((proposal) => proposal.parentIndexes[1])),
    new Set([1, 2]),
  );
});

test("CROSS move deck renders a bounded refusal instead of an impossible second parent", () => {
  const proposals = crosses(dealCandidateMoves(context({
    candidates: [
      candidate(0, "garment-a"),
      candidate(1, "garment-a"),
      candidate(2, "garment-b"),
      candidate(3, "garment-b"),
      candidate(4, "garment-b"),
      candidate(5, "garment-b"),
    ],
  })));

  const admitted = proposals.filter((proposal) => proposal.available !== false);
  const refused = proposals.filter((proposal) => proposal.available === false);
  assert.equal(admitted.length, 1);
  assert.equal(admitted[0].parentIndexes[1], 1);
  assert.equal(refused.length, 1);
  assert.equal(refused[0].refusalCode, "CROSS_LOCK_CONFLICT");
  assert.equal(refused[0].parentIndexes, undefined);
});

test("CROSS remains freely pairable when no axes are locked", () => {
  const proposals = crosses(dealCandidateMoves(context({
    locks: [],
    candidates: [
      candidate(0, "garment-a"),
      candidate(1, "garment-b"),
      candidate(2, "garment-c"),
      candidate(3, "garment-d"),
      candidate(4, "garment-e"),
      candidate(5, "garment-f"),
    ],
  })));

  assert.equal(proposals.length, 2);
  assert.ok(proposals.every((proposal) => proposal.available !== false));
  assert.ok(proposals.every((proposal) => proposal.parentIndexes[0] === 0));
  assert.notEqual(proposals[0].parentIndexes[1], proposals[1].parentIndexes[1]);
});
