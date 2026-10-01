const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AXIS_TO_APERTURE,
  advanceFutureRearviewMemoryProphecy,
  closeFutureRearviewLoop,
  contextForCurrentTrack,
  createFutureRearviewMemoryProphecy,
  prepareGenerationForCurrentTrack,
} = require('../src/memory/future-rearview-memory-prophecy.cjs');

const APERTURE_TO_AXIS = Object.fromEntries(
  Object.entries(AXIS_TO_APERTURE).map(([axis, aperture]) => [aperture, axis]),
);

const sixUpSeed = {
  familyHash: 'family-memory-001',
  scoreAddresses: Array.from({ length: 6 }, (_, index) => `ht1_seed_${index}`),
};

const tracks = [
  {
    trackId: '01-opening.wav',
    mediaAnalysis: { duration: 60, sections: [{ start: 0, end: 60, energy: 0.2, label: 'opening' }] },
  },
  {
    trackId: '02-middle.wav',
    mediaAnalysis: { duration: 70, sections: [{ start: 0, end: 70, energy: 0.72, label: 'middle' }] },
  },
  {
    trackId: '03-return.wav',
    mediaAnalysis: { duration: 65, sections: [{ start: 0, end: 65, energy: 0.5, label: 'return' }] },
  },
];

function outcomeFor(state, overrides = {}) {
  return {
    trackId: state.tracks[state.cursor].trackId,
    accepted: true,
    acceptedRenderReceiptSha256: String(state.cursor + 1).repeat(64),
    familyHash: `family-${state.cursor}`,
    selectedScoreAddress: `score-${state.cursor}`,
    observedAxes: [],
    featureTokens: [],
    ...overrides,
  };
}

test('cold first track sees album genome plus future prophecy without counterfeit rearview', () => {
  const state = createFutureRearviewMemoryProphecy({ sixUpSeed, tracks });
  const context = contextForCurrentTrack(state);

  assert.equal(state.cursor, 0);
  assert.equal(context.rearview.length, 0);
  assert.equal(context.present.prophecy.role, 'OPEN');
  assert.equal(context.forwardHorizon.length, 2);
  assert.equal(context.authorityLaw.prophecy, 'imagined-non-authoritative');
  assert.equal(context.authorityLaw.resolvedTimeline, 'unchanged-authority');

  const sources = new Set(context.mutationPrism.seats.map((seat) => seat.sourceKind));
  assert.deepEqual([...sources].sort(), ['GENOME', 'PROPHECY']);
  assert.ok(context.mutationPrism.seats.every((seat) => seat.authority === 'proposal-seed-only'));
});

test('accepted practical application becomes learning and rewrites the remaining horizon', () => {
  const initial = createFutureRearviewMemoryProphecy({ sixUpSeed, tracks });
  const firstContext = contextForCurrentTrack(initial);
  const predicted = firstContext.present.prophecy.focusApertures;
  const surpriseAperture = ['BODY', 'BEHAVIOR', 'SKIN', 'COLOR', 'EYE', 'TIME']
    .find((aperture) => !predicted.includes(aperture));
  const observedAxis = APERTURE_TO_AXIS[surpriseAperture];

  const next = advanceFutureRearviewMemoryProphecy(initial, outcomeFor(initial, {
    observedAxes: [observedAxis],
  }));
  const secondContext = contextForCurrentTrack(next);

  assert.equal(next.cursor, 1);
  assert.equal(next.history.length, 1);
  assert.equal(
    next.history[0].prophecyAtExecution.prophecySha256,
    firstContext.present.prophecy.prophecySha256,
  );
  assert.ok(next.history[0].learning.surpriseApertures.includes(surpriseAperture));
  assert.notEqual(next.horizonSha256, initial.horizonSha256);
  assert.equal(secondContext.rearview.length, 1);
  assert.ok(secondContext.mutationPrism.seats.some((seat) => seat.sourceKind === 'REARVIEW'));
  assert.ok(secondContext.mutationPrism.seats.some((seat) => seat.sourceKind === 'PROPHECY'));
});

test('generation bridge preserves ordinary Toaster memory while salting generation from temporal context', () => {
  const state = createFutureRearviewMemoryProphecy({ sixUpSeed, tracks });
  const memoryPrism = { schema: 'haunted-toaster/memory-prism/v1', prismSha256: 'a'.repeat(64) };
  const prepared = prepareGenerationForCurrentTrack({
    state,
    baseOptions: {
      rootSeed: 'ordinary-root-seed',
      memoryPrism,
      count: 6,
    },
  });

  assert.notEqual(prepared.generationOptions.rootSeed, 'ordinary-root-seed');
  assert.deepEqual(prepared.generationOptions.memoryPrism, memoryPrism);
  assert.equal(prepared.evidence.memoryPrismPreserved, true);
  assert.equal(prepared.evidence.authority, 'generation-seed-only');
});

test('same seed, manifest, and accepted outcomes replay exactly', () => {
  function run() {
    let state = createFutureRearviewMemoryProphecy({ sixUpSeed, tracks });
    while (!state.complete) {
      const context = contextForCurrentTrack(state);
      const axis = APERTURE_TO_AXIS[context.present.prophecy.focusApertures[0]];
      state = advanceFutureRearviewMemoryProphecy(state, outcomeFor(state, { observedAxes: [axis] }));
    }
    return { state, retrospective: closeFutureRearviewLoop(state) };
  }

  assert.deepEqual(run(), run());
});

test('the completed album can invite the ending to haunt an earlier miss without rewriting history', () => {
  const twoTracks = tracks.slice(0, 2);
  let state = createFutureRearviewMemoryProphecy({ sixUpSeed, tracks: twoTracks });
  const firstContext = contextForCurrentTrack(state);
  const missedAperture = firstContext.present.prophecy.focusApertures[0];

  state = advanceFutureRearviewMemoryProphecy(state, outcomeFor(state, { observedAxes: [] }));
  state = advanceFutureRearviewMemoryProphecy(state, outcomeFor(state, {
    observedAxes: [APERTURE_TO_AXIS[missedAperture]],
  }));

  const retrospective = closeFutureRearviewLoop(state);
  assert.equal(state.complete, true);
  assert.ok(retrospective.revisitInvitations.some((item) =>
    item.earlierTrackIndex === 0 &&
    item.laterTrackIndex === 1 &&
    item.aperture === missedAperture &&
    item.authority === 'invitation-only'));
  assert.equal(retrospective.authorityLaw.revisitInvitation, 'never-automatic-retoast');
});
