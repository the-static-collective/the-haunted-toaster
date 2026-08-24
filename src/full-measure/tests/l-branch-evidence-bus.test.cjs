const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DESTINATIONS,
  LANE_IDS,
  MIX_PLAN_POLICY,
  RESPONSE_MODES,
  assertLBranchTimeline,
  attachLBranchToFamily,
  buildLaneBank,
  buildMixPlan,
  compileMixPlan,
  replayLBranchFamily,
} = require('../src/generation/l-branch.cjs');

const SHA = 'a'.repeat(64);

function responseWitness() {
  return {
    policyVersion: 'response-witness-v1',
    durationSeconds: 12,
    sampleCount: 5,
    witnessSha256: SHA,
    knots: [
      { atSeconds: 0, localEnergy: 0.1, smoothedEnergy: 0.1, excursion: -0.1, slope: 0 },
      { atSeconds: 2, localEnergy: 0.35, smoothedEnergy: 0.3, excursion: 0.08, slope: 0.2 },
      { atSeconds: 4, localEnergy: 0.8, smoothedEnergy: 0.72, excursion: 0.25, slope: 0.42 },
      { atSeconds: 8, localEnergy: 0.55, smoothedEnergy: 0.58, excursion: -0.05, slope: -0.14 },
      { atSeconds: 12, localEnergy: 0.2, smoothedEnergy: 0.24, excursion: -0.2, slope: -0.2 },
    ],
  };
}

function timedLyrics() {
  return {
    mode: 'timestamped-lrc',
    timed: true,
    cues: [
      { start: 1, end: 3, text: 'one' },
      { start: 5, end: 7, text: 'two' },
      { start: 9, end: 11, text: 'three' },
    ],
  };
}

function candidate(index) {
  const sourceTimelineHash = String(index + 1).padStart(64, String(index + 1));
  const grab = index === 3
    ? {
        id: 'grab-region-3',
        kind: 'grab',
        prepareTick: 2500,
        strikeTick: 3000,
        releaseTick: 6000,
        residueUntilTick: 7000,
      }
    : null;
  const timeline = {
    schema: 'haunted-toaster/resolved-timeline/v1',
    scoreAddress: `ht1_${String(index).padStart(64, 'b')}`,
    timebase: 1000,
    durationTicks: 12000,
    baseState: {},
    patches: [],
    timelineHash: sourceTimelineHash,
    canonicalJson: '{}',
    ...(grab
      ? {
          topologyEvents: {
            schema: 'haunted-toaster/topology-event-plan/v1',
            policyVersion: 'topology-event-plan-v1',
            events: [grab],
          },
        }
      : {}),
  };
  return {
    index,
    role: `slot-${index}`,
    scoreAddress: timeline.scoreAddress,
    timelineHash: sourceTimelineHash,
    timeline,
    scoreArtifact: { score: {} },
  };
}

function baseFamily() {
  const candidates = Array.from({ length: 6 }, (_, index) => candidate(index));
  return {
    schema: 'haunted-toaster/candidate-family/v1',
    policy: 'fixture-policy-v1',
    rootSeed: 'walk-d-fixture',
    phase: 'initial',
    requestedCount: 6,
    producedCount: 6,
    scoreAddresses: candidates.map((item) => item.scoreAddress),
    timelineHashes: candidates.map((item) => item.timelineHash),
    candidates,
    familyHash: 'f'.repeat(64),
  };
}

test('Lane Bank v1 is deterministic, addressed, truthful, and bounded to exactly three known lane ids', () => {
  assert.deepEqual(LANE_IDS, [
    'raw-energy-envelope',
    'transient-pressure',
    'vocal-salience',
  ]);
  assert.deepEqual(DESTINATIONS, ['topology', 'primitive-field', 'atmosphere']);
  assert.deepEqual(RESPONSE_MODES, ['follow', 'oppose', 'accent']);

  const first = buildLaneBank({ responseWitness: responseWitness(), lyricTrack: timedLyrics() });
  const second = buildLaneBank({ responseWitness: responseWitness(), lyricTrack: timedLyrics() });
  assert.equal(first.laneBankHash, second.laneBankHash);
  assert.equal(first.lanes.length, 3);
  assert.deepEqual(first.lanes.map((lane) => lane.id), LANE_IDS);
  assert.equal(first.lanes[0].evidenceClass, 'raw-observation');
  assert.equal(first.lanes[1].evidenceClass, 'inferred');
  assert.equal(first.lanes[2].evidenceClass, 'inferred');
  assert.notEqual(first.lanes[0].producerPolicy, first.lanes[1].producerPolicy);
  assert.equal(first.absentLaneIds.length, 0);
});

test('missing evidence stays absent instead of fabricating a vocal lane', () => {
  const bank = buildLaneBank({ responseWitness: responseWitness(), lyricTrack: null });
  assert.deepEqual(bank.lanes.map((lane) => lane.id), [
    'raw-energy-envelope',
    'transient-pressure',
  ]);
  assert.deepEqual(bank.absentLaneIds, ['vocal-salience']);
});

test('one fixed Lane Bank yields six materially different deterministic Mix Plans', () => {
  const bank = buildLaneBank({ responseWitness: responseWitness(), lyricTrack: timedLyrics() });
  const family = baseFamily();
  const plans = family.candidates.map((item) => buildMixPlan({ laneBank: bank, candidate: item }));
  const replayed = family.candidates.map((item) => buildMixPlan({ laneBank: bank, candidate: item }));

  assert.equal(new Set(plans.map((plan) => plan.laneBankHash)).size, 1);
  assert.equal(new Set(plans.map((plan) => plan.planHash)).size, 6);
  assert.deepEqual(plans.map((plan) => plan.planHash), replayed.map((plan) => plan.planHash));
  assert.ok(plans.every((plan) => plan.policyVersion === MIX_PLAN_POLICY));

  const available = new Set(bank.lanes.map((lane) => lane.id));
  assert.ok(plans.some((plan) => {
    const consumed = new Set(plan.sends.map((send) => send.sourceLaneId));
    return [...available].some((laneId) => !consumed.has(laneId));
  }));
  assert.ok(plans.some((plan) => plan.sends.some((send) => send.scope.kind === 'grab')));
  assert.ok(plans.some((plan) => plan.sends.some((send) => send.response === 'oppose')));
});

test('compiled GRAB sends are clipped to the accepted GRAB and cannot leak outside it', () => {
  const bank = buildLaneBank({ responseWitness: responseWitness(), lyricTrack: timedLyrics() });
  const plan = buildMixPlan({ laneBank: bank, candidate: candidate(3) });
  const execution = compileMixPlan({ laneBank: bank, mixPlan: plan, timeline: candidate(3).timeline });
  const scoped = execution.sends.filter((send) => send.scope.kind === 'grab');
  assert.ok(scoped.length > 0);
  for (const send of scoped) {
    assert.ok(send.knots.length > 0);
    assert.ok(send.knots.every((knot) => knot.atTick >= send.scope.startTick));
    assert.ok(send.knots.every((knot) => knot.atTick <= send.scope.endTick));
  }
});

test('family admission binds one Lane Bank and one accepted Mix Plan identity into each ResolvedTimeline', () => {
  const family = attachLBranchToFamily(baseFamily(), {
    responseWitness: responseWitness(),
    lyricTrack: timedLyrics(),
  });
  assert.equal(family.candidates.length, 6);
  assert.equal(new Set(family.candidates.map((item) => item.timeline.lBranch.laneBankHash)).size, 1);
  assert.equal(new Set(family.candidates.map((item) => item.timeline.lBranch.mixPlan.planHash)).size, 6);
  for (const item of family.candidates) {
    assert.equal(item.timelineHash, item.timeline.timelineHash);
    assert.equal(item.timeline.lBranch.mixPlan.planHash, item.timeline.lBranch.execution.planHash);
    assert.equal(item.timeline.lBranch.laneBankHash, family.lBranch.laneBankHash);
  }
});

test('replay reconstructs Lane Bank -> Mix Plan -> timeline -> family identity exactly', () => {
  const source = baseFamily();
  const admitted = attachLBranchToFamily(source, {
    responseWitness: responseWitness(),
    lyricTrack: timedLyrics(),
  });
  const replay = replayLBranchFamily(admitted, {
    baseFamily: source,
    responseWitness: responseWitness(),
    lyricTrack: timedLyrics(),
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.laneBankHashMatches, true);
  assert.equal(replay.mixPlanHashesMatch, true);
  assert.equal(replay.timelineHashesMatch, true);
  assert.equal(replay.familyHashMatches, true);
});

test('historical timelines without Mix Plans preserve historical semantics', () => {
  const historical = candidate(0).timeline;
  assert.equal(assertLBranchTimeline(historical), historical);
});
