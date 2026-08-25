const assert = require("node:assert/strict");
const test = require("node:test");

const { hashCanonical } = require("../src/generation/canonical.cjs");
const { buildLaneBank } = require("../src/generation/l-branch.cjs");
const {
  buildAxisGrabRequest,
  buildPostWalkAxisRecipe,
  composePostWalkAxisRecipe,
} = require("../src/generation/post-walk-axis-grammar.cjs");
const {
  issueTopologyEventAuthority,
} = require("../src/generation/topology-event-authority.cjs");
const {
  compactPostWalkAxisEvidence,
} = require("../src/render/receipt.cjs");

function timeline(durationTicks = 12000) {
  return {
    schema: "haunted-toaster/resolved-timeline/v1",
    scoreAddress: `htvs1_${"a".repeat(64)}`,
    timebase: 1000,
    durationTicks,
    analysisHash: "1".repeat(64),
    constraintsHash: "2".repeat(64),
    rendererProfileHash: "3".repeat(64),
    baseState: { topology: "linear" },
    patches: [],
    timelineHash: "4".repeat(64),
    canonicalJson: "{}",
  };
}

function familyWithTimeline(rootSeed = "axis-crucible-fixture", sourceTimeline = timeline()) {
  const candidate = {
    index: 0,
    role: "slot-0",
    scoreAddress: sourceTimeline.scoreAddress,
    timelineHash: sourceTimeline.timelineHash,
    timeline: sourceTimeline,
  };
  const familyCore = {
    schema: "haunted-toaster/candidate-family/v1",
    policy: "candidate-family-v1",
    scoreSchema: "haunted-toaster/visual-score/v1",
    prng: "xoshiro256**/splitmix64-v1",
    rootSeed,
    parentScoreRef: null,
    baselineScoreRef: null,
    constraintPackId: "fixture",
    analysisHash: sourceTimeline.analysisHash,
    constraintsHash: sourceTimeline.constraintsHash,
    rendererProfileHash: sourceTimeline.rendererProfileHash,
    locks: [],
    requestedCount: 1,
    producedCount: 1,
    roles: [candidate.role],
    scoreAddresses: [candidate.scoreAddress],
    timelineHashes: [candidate.timelineHash],
    shortfall: null,
  };
  const family = {
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates: [candidate],
  };
  return { family, candidate };
}

function responseWitness() {
  return {
    policyVersion: "response-witness-v1",
    witnessSha256: "5".repeat(64),
    durationSeconds: 12,
    knots: [
      { atSeconds: 0, localEnergy: 0.2, slope: 0, excursion: 0 },
      { atSeconds: 6, localEnergy: 0.8, slope: 0.3, excursion: 0.2 },
      { atSeconds: 12, localEnergy: 0.4, slope: -0.1, excursion: 0.1 },
    ],
  };
}

function compose(recipeIndex, specimen = familyWithTimeline()) {
  const recipe = buildPostWalkAxisRecipe(recipeIndex);
  const authority = issueTopologyEventAuthority(specimen.family, 0);
  const laneBank = buildLaneBank({ responseWitness: responseWitness() });
  return composePostWalkAxisRecipe({
    family: specimen.family,
    candidate: specimen.candidate,
    authority,
    laneBank,
    recipe,
    rootSeed: "axis-crucible-fixture",
    slotIndex: 0,
  });
}

test("Stage A directly rejects a shape-field attempt instead of canonicalizing it away", () => {
  const recipe = {
    ...buildPostWalkAxisRecipe(0),
    shape: "aperture",
  };

  assert.throws(
    () => buildAxisGrabRequest({
      timeline: timeline(),
      rootSeed: "axis-shape-smuggle",
      slotIndex: 0,
      recipe,
    }),
    /Post-WALK axis recipe.*shape/i,
  );
});

test("Stage A directly rejects the wrong addressed recipe hash", () => {
  const recipe = {
    ...buildPostWalkAxisRecipe(0),
    recipeHash: "f".repeat(64),
  };

  assert.throws(
    () => buildAxisGrabRequest({
      timeline: timeline(),
      rootSeed: "axis-wrong-recipe",
      slotIndex: 0,
      recipe,
    }),
    /recipe hash does not match/i,
  );
});

test("Stage A refuses foreign topology authority without appending to the source timeline", () => {
  const specimen = familyWithTimeline("axis-right-family");
  const foreign = familyWithTimeline("axis-foreign-family");
  const authority = issueTopologyEventAuthority(foreign.family, 0);
  const laneBank = buildLaneBank({ responseWitness: responseWitness() });
  const recipe = buildPostWalkAxisRecipe(0);
  const before = structuredClone(specimen.candidate.timeline);

  assert.throws(
    () => composePostWalkAxisRecipe({
      family: specimen.family,
      candidate: specimen.candidate,
      authority,
      laneBank,
      recipe,
      rootSeed: "axis-right-family",
      slotIndex: 0,
    }),
    /authority|family|birth/i,
  );
  assert.deepEqual(specimen.candidate.timeline, before);
});

test("Stage A receipt projection accepts canonical whole-layer and GRAB scoped recipes", () => {
  const whole = compose(0);
  const grab = compose(3);

  assert.equal(whole.ok, true);
  assert.equal(grab.ok, true);
  assert.equal(compactPostWalkAxisEvidence(whole.timeline).recipeHash, whole.recipe.recipeHash);
  assert.equal(compactPostWalkAxisEvidence(grab.timeline).recipeHash, grab.recipe.recipeHash);
});
