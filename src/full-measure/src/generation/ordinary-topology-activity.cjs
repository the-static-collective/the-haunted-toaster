const { deepFreeze, hashCanonical } = require("./canonical.cjs");
const { resolveTopologyEvents, verifyCandidateFamilyAddress } = require("./topology-events.cjs");

const ORDINARY_TOPOLOGY_ACTIVITY_POLICY = deepFreeze({
  policyVersion: "ordinary-topology-activity-v0",
  sensitivityNumerator: 4,
  sensitivityDenominator: 5,
  opportunitySeconds: 18,
});
const ORDINARY_TOPOLOGY_ACTIVITY_VIEW_SCHEMA = "haunted-toaster/candidate-session-view/v0";
const ORDINARY_TOPOLOGY_ACTIVITY_VIEW_POLICY = "ordinary-topology-activity-session-projection-v0";
const ORDINARY_TOPOLOGY_KINDS = deepFreeze(["aperture", "speak", "grab", "grow"]);

const ORDINARY_TOPOLOGY_PARAMETERS = deepFreeze({
  aperture: {
    anchorX: 0.48,
    anchorY: 0.42,
    radiusX: 0.24,
    radiusY: 0.22,
    focus: 0.82,
    peripheralCompression: 0.34,
    orbit: 0.18,
  },
  speak: {
    anchorX: 0.52,
    anchorY: 0.54,
    radiusX: 0.28,
    radiusY: 0.14,
    seamWidth: 0.18,
    emission: 0.72,
    residue: 0.31,
  },
  grab: {
    anchorX: 0.32,
    anchorY: 0.52,
    targetX: 0.66,
    targetY: 0.46,
    radiusX: 0.21,
    radiusY: 0.17,
    pull: 0.62,
    recoil: 0.48,
    falloff: 0.74,
    residualVectorX: 0.055,
    residualVectorY: -0.025,
    residualStretch: 0.04,
  },
  grow: {
    anchorX: 0.58,
    anchorY: 0.46,
    radiusX: 0.18,
    radiusY: 0.2,
    branchCount: 3,
    growth: 0.76,
    persistence: 0.68,
    ageBias: 0.42,
  },
});

function activityDigest({ rootSeed, slotIndex, opportunityIndex }) {
  if (rootSeed === undefined || rootSeed === null || String(rootSeed).length === 0) {
    throw new TypeError("Ordinary topology activity requires rootSeed.");
  }
  for (const [label, value] of [["slotIndex", slotIndex], ["opportunityIndex", opportunityIndex]]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(`Ordinary topology activity requires a non-negative ${label}.`);
    }
  }
  return hashCanonical(
    {
      policyVersion: ORDINARY_TOPOLOGY_ACTIVITY_POLICY.policyVersion,
      rootSeed: String(rootSeed),
      slotIndex,
      opportunityIndex,
    },
    "HauntedToaster-OrdinaryTopologyActivity-v0",
  );
}

function shouldAdmitOrdinaryTopologyEvent(options = {}) {
  const digest = activityDigest(options);
  const bucket = Number.parseInt(digest.slice(0, 8), 16)
    % ORDINARY_TOPOLOGY_ACTIVITY_POLICY.sensitivityDenominator;
  return bucket < ORDINARY_TOPOLOGY_ACTIVITY_POLICY.sensitivityNumerator;
}

function ordinaryTopologyKind(options = {}) {
  const digest = activityDigest(options);
  const bucket = Number.parseInt(digest.slice(8, 16), 16) % ORDINARY_TOPOLOGY_KINDS.length;
  return ORDINARY_TOPOLOGY_KINDS[bucket];
}

function opportunityCount(timeline) {
  const durationTicks = Number(timeline?.durationTicks);
  const timebase = Number(timeline?.timebase) || 1000;
  if (!Number.isSafeInteger(durationTicks) || durationTicks < 1) {
    throw new TypeError("Ordinary topology activity requires a valid timeline duration.");
  }
  const strideTicks = Math.max(1, Math.round(ORDINARY_TOPOLOGY_ACTIVITY_POLICY.opportunitySeconds * timebase));
  return Math.max(1, Math.ceil(durationTicks / strideTicks));
}

function boundedOpportunityWindow(timeline, { rootSeed, slotIndex, opportunityIndex }) {
  const durationTicks = Number(timeline?.durationTicks);
  const timebase = Number(timeline?.timebase) || 1000;
  const strideTicks = Math.max(1, Math.round(ORDINARY_TOPOLOGY_ACTIVITY_POLICY.opportunitySeconds * timebase));
  const windowStart = opportunityIndex * strideTicks;
  const windowEnd = Math.min(durationTicks, windowStart + strideTicks);
  if (windowStart >= durationTicks || windowEnd - windowStart < 4) return null;

  const prepareSpan = Math.max(1, Math.round(timebase * 0.55));
  const releaseSpan = Math.max(1, Math.round(timebase * 0.65));
  const residueSpan = Math.max(1, Math.round(timebase * 1.1));
  const minimumStrike = windowStart + prepareSpan;
  const maximumStrike = windowEnd - releaseSpan - residueSpan;
  if (maximumStrike <= minimumStrike) return null;

  const digest = activityDigest({ rootSeed, slotIndex, opportunityIndex });
  const jitterSpan = Math.max(1, Math.round(timebase * 2));
  const signedJitter = (Number.parseInt(digest.slice(16, 24), 16) % (jitterSpan * 2 + 1)) - jitterSpan;
  const preferredStrike = Math.round(windowStart + (windowEnd - windowStart) * 0.55) + signedJitter;
  const strikeTick = Math.min(maximumStrike, Math.max(minimumStrike, preferredStrike));
  const prepareTick = strikeTick - prepareSpan;
  const releaseTick = strikeTick + releaseSpan;
  const residueUntilTick = releaseTick + residueSpan;

  return deepFreeze({ prepareTick, strikeTick, releaseTick, residueUntilTick });
}

function buildOrdinaryTopologyEventRequests(timeline, { rootSeed, slotIndex } = {}) {
  const requests = [];
  const count = opportunityCount(timeline);
  for (let opportunityIndex = 0; opportunityIndex < count; opportunityIndex += 1) {
    const options = { rootSeed, slotIndex, opportunityIndex };
    if (!shouldAdmitOrdinaryTopologyEvent(options)) continue;
    const window = boundedOpportunityWindow(timeline, options);
    if (!window) continue;
    const kind = ordinaryTopologyKind(options);
    requests.push(deepFreeze({
      id: `ordinary-${kind}-${slotIndex}-${opportunityIndex}`,
      kind,
      ...window,
      parameters: structuredClone(ORDINARY_TOPOLOGY_PARAMETERS[kind]),
      evidenceRefs: [
        `policy:${ORDINARY_TOPOLOGY_ACTIVITY_POLICY.policyVersion}`,
        `opportunity:${opportunityIndex}`,
      ],
    }));
  }
  return deepFreeze(requests);
}

function projectOrdinaryTopologyActivityView(family, { authorityForCandidate } = {}) {
  if (typeof authorityForCandidate !== "function") {
    verifyCandidateFamilyAddress(family);
  }
  const candidates = family.candidates.map((candidate) => {
    const requests = buildOrdinaryTopologyEventRequests(candidate.timeline, {
      rootSeed: family.rootSeed,
      slotIndex: candidate.index,
    });
    const authority = typeof authorityForCandidate === "function"
      ? authorityForCandidate(candidate)
      : { family, candidateIndex: candidate.index, sourceFamilyHash: family.familyHash };
    if (!authority?.family || !Number.isSafeInteger(authority.candidateIndex)) {
      throw new TypeError("Ordinary topology authority resolver returned invalid authority.");
    }
    const events = requests.map((request) => ({
      ...request,
      evidenceRefs: [
        ...request.evidenceRefs,
        `event-authority:${authority.family.familyHash}`,
        `source-family:${authority.sourceFamilyHash || family.familyHash}`,
        `field-family:${family.familyHash}`,
      ],
    }));
    const timeline = resolveTopologyEvents(candidate.timeline, {
      family: authority.family,
      candidateIndex: authority.candidateIndex,
      events,
    });
    return deepFreeze({
      ...candidate,
      timeline,
      timelineHash: timeline.timelineHash,
      topologyEventProjection: deepFreeze({
        policyVersion: ORDINARY_TOPOLOGY_ACTIVITY_POLICY.policyVersion,
        sensitivityNumerator: ORDINARY_TOPOLOGY_ACTIVITY_POLICY.sensitivityNumerator,
        sensitivityDenominator: ORDINARY_TOPOLOGY_ACTIVITY_POLICY.sensitivityDenominator,
        opportunitySeconds: ORDINARY_TOPOLOGY_ACTIVITY_POLICY.opportunitySeconds,
        opportunityCount: opportunityCount(candidate.timeline),
        admittedEventCount: timeline.topologyEvents?.eventCount || 0,
        forcedWitness: false,
      }),
    });
  });

  const {
    schema: _schema,
    policy: _policy,
    candidates: _candidates,
    timelineHashes: _timelineHashes,
    ...familyEvidence
  } = family;
  return deepFreeze({
    ...structuredClone(familyEvidence),
    schema: ORDINARY_TOPOLOGY_ACTIVITY_VIEW_SCHEMA,
    policy: ORDINARY_TOPOLOGY_ACTIVITY_VIEW_POLICY,
    sourceFamilyHash: family.familyHash,
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    candidates,
  });
}

module.exports = {
  ORDINARY_TOPOLOGY_ACTIVITY_POLICY,
  ORDINARY_TOPOLOGY_ACTIVITY_VIEW_POLICY,
  ORDINARY_TOPOLOGY_ACTIVITY_VIEW_SCHEMA,
  ORDINARY_TOPOLOGY_KINDS,
  ORDINARY_TOPOLOGY_PARAMETERS,
  boundedOpportunityWindow,
  buildOrdinaryTopologyEventRequests,
  opportunityCount,
  ordinaryTopologyKind,
  projectOrdinaryTopologyActivityView,
  shouldAdmitOrdinaryTopologyEvent,
};
