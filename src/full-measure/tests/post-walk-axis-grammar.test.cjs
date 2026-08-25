const assert = require('node:assert/strict');
const test = require('node:test');

const {
  hashCanonical,
} = require('../src/generation/canonical.cjs');
const {
  ORDINARY_TOPOLOGY_PARAMETERS,
} = require('../src/generation/ordinary-topology-activity.cjs');
const {
  POST_WALK_AXIS_RECIPES,
  buildAxisGrabRequest,
  buildPostWalkAxisRecipe,
} = require('../src/generation/post-walk-axis-grammar.cjs');
const {
  issueTopologyEventAuthority,
} = require('../src/generation/topology-event-authority.cjs');
const {
  resolveTopologyEvents,
} = require('../src/generation/topology-events.cjs');

function timeline(durationTicks = 12000) {
  return {
    schema: 'haunted-toaster/resolved-timeline/v1',
    scoreAddress: `htvs1_${'a'.repeat(64)}`,
    timebase: 1000,
    durationTicks,
    analysisHash: '1'.repeat(64),
    constraintsHash: '2'.repeat(64),
    rendererProfileHash: '3'.repeat(64),
    baseState: { topology: 'linear' },
    patches: [],
    timelineHash: '4'.repeat(64),
    canonicalJson: '{}',
  };
}

function familyWithTimeline(sourceTimeline = timeline()) {
  const candidate = {
    index: 0,
    role: 'slot-0',
    scoreAddress: sourceTimeline.scoreAddress,
    timelineHash: sourceTimeline.timelineHash,
    timeline: sourceTimeline,
  };
  const familyCore = {
    schema: 'haunted-toaster/candidate-family/v1',
    policy: 'candidate-family-v1',
    scoreSchema: 'haunted-toaster/visual-score/v1',
    prng: 'xoshiro256**/splitmix64-v1',
    rootSeed: 'axis-kernel-fixture',
    parentScoreRef: null,
    baselineScoreRef: null,
    constraintPackId: 'fixture',
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
    familyHash: hashCanonical(familyCore, 'HauntedToaster-CandidateFamily-v1'),
    candidates: [candidate],
  };
  return { family, candidate };
}

test('post-walk axis grammar defines exactly six balanced addressed recipes and leaves shape for #223', () => {
  assert.deepEqual(
    POST_WALK_AXIS_RECIPES.map(({ response, scope, consequence }) => ({ response, scope, consequence })),
    [
      { response: 'follow', scope: 'whole', consequence: 'clean-return' },
      { response: 'oppose', scope: 'whole', consequence: 'residue' },
      { response: 'accent', scope: 'grab', consequence: 'clean-return' },
      { response: 'follow', scope: 'grab', consequence: 'residue' },
      { response: 'oppose', scope: 'grab', consequence: 'clean-return' },
      { response: 'accent', scope: 'whole', consequence: 'residue' },
    ],
  );

  const addressed = POST_WALK_AXIS_RECIPES.map((_recipe, index) => buildPostWalkAxisRecipe(index));
  assert.equal(new Set(addressed.map((recipe) => recipe.recipeHash)).size, 6);
  assert.equal(addressed.filter((recipe) => recipe.response === 'follow').length, 2);
  assert.equal(addressed.filter((recipe) => recipe.response === 'oppose').length, 2);
  assert.equal(addressed.filter((recipe) => recipe.response === 'accent').length, 2);
  assert.equal(addressed.filter((recipe) => recipe.scope === 'whole').length, 3);
  assert.equal(addressed.filter((recipe) => recipe.scope === 'grab').length, 3);
  assert.equal(addressed.filter((recipe) => recipe.consequence === 'clean-return').length, 3);
  assert.equal(addressed.filter((recipe) => recipe.consequence === 'residue').length, 3);
  assert.equal(addressed.some((recipe) => Object.hasOwn(recipe, 'shape')), false);
});

test('clean-return and residue use the existing GRAB organ and produce distinct accepted event evidence', () => {
  const cleanRecipe = buildPostWalkAxisRecipe(0);
  const residueRecipe = buildPostWalkAxisRecipe(1);
  const clean = buildAxisGrabRequest({
    timeline: timeline(),
    rootSeed: 'axis-kernel-fixture',
    slotIndex: 0,
    recipe: cleanRecipe,
  });
  const residue = buildAxisGrabRequest({
    timeline: timeline(),
    rootSeed: 'axis-kernel-fixture',
    slotIndex: 1,
    recipe: residueRecipe,
  });

  assert.equal(clean.ok, true);
  assert.equal(residue.ok, true);
  assert.equal(clean.request.kind, 'grab');
  assert.equal(residue.request.kind, 'grab');
  assert.deepEqual(clean.request.parameters, {
    ...ORDINARY_TOPOLOGY_PARAMETERS.grab,
    recoil: 1,
    residualVectorX: 0,
    residualVectorY: 0,
    residualStretch: 0,
  });
  assert.deepEqual(residue.request.parameters, {
    ...ORDINARY_TOPOLOGY_PARAMETERS.grab,
    recoil: 0.35,
    residualVectorX: 0.08,
    residualVectorY: -0.04,
    residualStretch: 0.06,
  });

  const cleanSpecimen = familyWithTimeline();
  const residueSpecimen = familyWithTimeline();
  const cleanAuthority = issueTopologyEventAuthority(cleanSpecimen.family, 0);
  const residueAuthority = issueTopologyEventAuthority(residueSpecimen.family, 0);
  const cleanTimeline = resolveTopologyEvents(cleanSpecimen.candidate.timeline, {
    authority: cleanAuthority,
    events: [clean.request],
  });
  const residueTimeline = resolveTopologyEvents(residueSpecimen.candidate.timeline, {
    authority: residueAuthority,
    events: [residue.request],
  });
  assert.notEqual(
    cleanTimeline.topologyEvents.events[0].eventSha256,
    residueTimeline.topologyEvents.events[0].eventSha256,
  );
});

test('axis kernel refuses explicitly when no lawful event window exists', () => {
  const recipe = buildPostWalkAxisRecipe(0);
  const result = buildAxisGrabRequest({
    timeline: timeline(3),
    rootSeed: 'axis-kernel-short',
    slotIndex: 0,
    recipe,
  });

  assert.deepEqual(result, {
    ok: false,
    refusal: {
      reason: 'no-lawful-axis-event-window',
      recipeHash: recipe.recipeHash,
    },
  });
});
