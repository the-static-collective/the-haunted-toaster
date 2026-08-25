const assert = require("node:assert/strict");
const test = require("node:test");

const {
  hashCanonical,
} = require("../src/generation/canonical.cjs");
const {
  POST_WALK_AXIS_RECIPES,
  buildAxisGrabRequest,
  buildPostWalkAxisRecipe,
} = require("../src/generation/post-walk-axis-grammar.cjs");
const {
  issueTopologyEventAuthority,
} = require("../src/generation/topology-event-authority.cjs");
const {
  peelOrderedEnvelope,
  replayOrderedEnvelope,
} = require("../src/lab/ordered-envelope.cjs");
const {
  witnessPostWalkAxisRecipe,
} = require("../src/lab/post-walk-axis-envelope.cjs");

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

function familyWithTimeline(sourceTimeline = timeline()) {
  const candidate = {
    index: 0,
    role: "slot-0",
    scoreAddress: sourceTimeline.scoreAddress,
    timelineHash: sourceTimeline.timelineHash,
    timeline: sourceTimeline,
  };
  const familyCore = {
    schema: "haunted-toaster/candidate-family/v1",
    policy: "coverage-before-randomness-v1",
    scoreSchema: "haunted-toaster/visual-score/v1",
    prng: "xoshiro256**/splitmix64-v1",
    rootSeed: "axis-envelope-fixture",
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

function peelAll(envelope) {
  const tokens = [];
  let current = envelope;
  while (current.worldline.length) {
    const peeled = peelOrderedEnvelope(current);
    tokens.push(peeled.token);
    current = peeled.envelope;
  }
  return { tokens, envelope: current };
}

test("all six Stage A recipes produce exact witness envelopes without changing recipe, authority, or GRAB request identity", () => {
  assert.equal(POST_WALK_AXIS_RECIPES.length, 6);

  POST_WALK_AXIS_RECIPES.forEach((_raw, index) => {
    const recipe = buildPostWalkAxisRecipe(index);
    const recipeBefore = structuredClone(recipe);
    const repeatedBefore = buildPostWalkAxisRecipe(index);
    const specimen = familyWithTimeline();
    const authorityBefore = issueTopologyEventAuthority(specimen.family, 0);
    const requestBefore = buildAxisGrabRequest({
      timeline: specimen.candidate.timeline,
      rootSeed: specimen.family.rootSeed,
      slotIndex: index,
      recipe,
    });

    const envelope = witnessPostWalkAxisRecipe(recipe);

    const repeatedAfter = buildPostWalkAxisRecipe(index);
    const authorityAfter = issueTopologyEventAuthority(specimen.family, 0);
    const requestAfter = buildAxisGrabRequest({
      timeline: specimen.candidate.timeline,
      rootSeed: specimen.family.rootSeed,
      slotIndex: index,
      recipe,
    });

    assert.deepEqual(recipe, recipeBefore);
    assert.equal(recipe.recipeHash, recipeBefore.recipeHash);
    assert.deepEqual(repeatedAfter, repeatedBefore);
    assert.deepEqual(authorityAfter, authorityBefore);
    assert.equal(authorityAfter.authoritySha256, authorityBefore.authoritySha256);
    assert.deepEqual(requestAfter, requestBefore);

    const expectedWorldline = [
      `R:${recipe.response}|`,
      `S:${recipe.scope}|`,
      `C:${recipe.consequence}|`,
    ];
    assert.deepEqual(envelope.worldline, expectedWorldline);
    assert.equal(
      envelope.surface,
      `C:${recipe.consequence}|S:${recipe.scope}|R:${recipe.response}|.`,
    );
    assert.deepEqual(replayOrderedEnvelope(envelope.seed, envelope.worldline), envelope);

    const peeled = peelAll(envelope);
    assert.deepEqual(peeled.tokens, [...expectedWorldline].reverse());
    assert.equal(peeled.envelope.surface, ".");
    assert.deepEqual(peeled.envelope.worldline, []);
  });
});

test("Stage A envelope witness refuses a recipe without an address", () => {
  assert.throws(
    () => witnessPostWalkAxisRecipe({
      response: "follow",
      scope: "whole",
      consequence: "clean-return",
    }),
    /requires recipe\.recipeHash/,
  );
});
