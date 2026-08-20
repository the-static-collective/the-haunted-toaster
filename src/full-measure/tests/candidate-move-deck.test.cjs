const test = require("node:test");
const assert = require("node:assert/strict");
const { dealCandidateMoves, MOVE_DECK_POLICY } = require("../src/candidate-move-deck.cjs");

function fixtureContext(overrides = {}) {
  return {
    familyHash: "family:sha256:field-six",
    selectedIndex: 2,
    dealIndex: 0,
    locks: ["palette", "motion"],
    candidates: Array.from({ length: 6 }, (_, index) => ({
      index,
      scoreAddress: `visual-score:sha256:candidate-${index}`,
      signature: `candidate-${index}`,
      toastmoodLane: {
        id: ["low-and-slow", "wire-heat", "ghost-bloom", "hard-light", "paper-moon", "open-window"][index],
        name: ["Low & Slow", "Wire Heat", "Ghost Bloom", "Hard Light", "Paper Moon", "Open Window"][index],
      },
    })),
    ...overrides,
  };
}

test("first deal is exactly six addressed proposals spanning the current beta mechanics", () => {
  const deal = dealCandidateMoves(fixtureContext());

  assert.equal(deal.policy, MOVE_DECK_POLICY);
  assert.equal(deal.dealIndex, 0);
  assert.match(deal.dealAddress, /^candidate-move-deal:sha256:[a-f0-9]{64}$/);
  assert.equal(deal.proposals.length, 6);
  assert.deepEqual(
    deal.proposals.map((proposal) => proposal.kind),
    ["expand", "mutate", "converge", "stomp", "cross", "cross"],
  );
  for (const proposal of deal.proposals) {
    assert.match(proposal.address, /^candidate-move:sha256:[a-f0-9]{64}$/);
    assert.equal(typeof proposal.label, "string");
    assert.ok(proposal.label.length > 0);
  }
});

test("CROSS proposals always use selected candidate plus two distinct suggested current-family partners", () => {
  const context = fixtureContext();
  const deal = dealCandidateMoves(context);
  const crosses = deal.proposals.filter((proposal) => proposal.kind === "cross");

  assert.equal(crosses.length, 2);
  const partners = crosses.map((proposal) => {
    assert.equal(proposal.action, "cross");
    assert.equal(proposal.parentIndexes.length, 2);
    assert.equal(proposal.parentIndexes[0], context.selectedIndex);
    assert.notEqual(proposal.parentIndexes[1], context.selectedIndex);
    assert.ok(context.candidates.some((candidate) => candidate.index === proposal.parentIndexes[1]));
    return proposal.parentIndexes[1];
  });
  assert.notEqual(partners[0], partners[1]);
});

test("identical proposal context reproduces the exact same deal", () => {
  const context = fixtureContext();
  assert.deepEqual(dealCandidateMoves(context), dealCandidateMoves(structuredClone(context)));
});

test("lock order is canonicalized for proposal identity", () => {
  const left = dealCandidateMoves(fixtureContext({ locks: ["palette", "motion", "camera"] }));
  const right = dealCandidateMoves(fixtureContext({ locks: ["camera", "palette", "motion"] }));
  assert.deepEqual(left, right);
});

test("re-deal changes proposal identity and rotates partner suggestions without mutating candidate context", () => {
  const context = fixtureContext();
  const before = structuredClone(context);
  const first = dealCandidateMoves(context);
  const second = dealCandidateMoves({ ...context, dealIndex: 1 });

  assert.notEqual(first.dealAddress, second.dealAddress);
  assert.notDeepEqual(
    first.proposals.filter((proposal) => proposal.kind === "cross").map((proposal) => proposal.parentIndexes[1]),
    second.proposals.filter((proposal) => proposal.kind === "cross").map((proposal) => proposal.parentIndexes[1]),
  );
  assert.deepEqual(context, before);
});

test("proposal deck refuses missing or invalid current selection", () => {
  assert.throws(
    () => dealCandidateMoves(fixtureContext({ selectedIndex: null })),
    /current candidate/i,
  );
  assert.throws(
    () => dealCandidateMoves(fixtureContext({ selectedIndex: 99 })),
    /current candidate/i,
  );
  assert.throws(
    () => dealCandidateMoves(fixtureContext({ dealIndex: -1 })),
    /dealIndex/i,
  );
});
