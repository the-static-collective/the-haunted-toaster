const { deepFreeze, hashCanonical } = require("./canonical.cjs");
const { resolveTopologyEvents, verifyCandidateFamilyAddress } = require("./topology-events.cjs");

const ORDINARY_GRAB_PREFERENCE = deepFreeze({
  policyVersion: "ordinary-grab-frequency-v0",
  numerator: 1,
  denominator: 4,
});
const ORDINARY_GRAB_VIEW_SCHEMA = "haunted-toaster/candidate-session-view/v0";
const ORDINARY_GRAB_VIEW_POLICY = "ordinary-grab-session-projection-v0";

const ORDINARY_GRAB_PARAMETERS = deepFreeze({
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
});

function shouldPreferOrdinaryGrab({ rootSeed, slotIndex } = {}) {
  if (rootSeed === undefined || rootSeed === null || String(rootSeed).length === 0) {
    throw new TypeError("Ordinary GRAB preference requires rootSeed.");
  }
  if (!Number.isSafeInteger(slotIndex) || slotIndex < 0) {
    throw new TypeError("Ordinary GRAB preference requires a non-negative slotIndex.");
  }
  const digest = hashCanonical(
    {
      policyVersion: ORDINARY_GRAB_PREFERENCE.policyVersion,
      rootSeed: String(rootSeed),
      slotIndex,
    },
    "HauntedToaster-OrdinaryGrabFrequency-v0",
  );
  const bucket = Number.parseInt(digest.slice(0, 8), 16) % ORDINARY_GRAB_PREFERENCE.denominator;
  return bucket < ORDINARY_GRAB_PREFERENCE.numerator;
}

function boundedGrabWindow(timeline, salt = "grab") {
  const durationTicks = Number(timeline?.durationTicks);
  const timebase = Number(timeline?.timebase) || 1000;
  if (!Number.isSafeInteger(durationTicks) || durationTicks < 8) {
    throw new TypeError("GRAB projection requires a timeline with at least eight ticks.");
  }

  const digest = hashCanonical(
    { timelineHash: timeline.timelineHash, salt: String(salt) },
    "HauntedToaster-GrabWindow-v0",
  );
  const jitter = Number.parseInt(digest.slice(0, 8), 16) % Math.max(1, Math.round(timebase * 0.3));
  const preferredStrike = Math.round(timebase * 1.75) + jitter;
  const strikeTick = Math.min(durationTicks - 4, Math.max(2, preferredStrike));
  const prepareSpan = Math.max(1, Math.round(timebase * 0.55));
  const releaseSpan = Math.max(1, Math.round(timebase * 0.65));
  const residueSpan = Math.max(1, Math.round(timebase * 1.1));
  const prepareTick = Math.max(0, strikeTick - prepareSpan);
  const releaseTick = Math.min(durationTicks - 2, Math.max(strikeTick, strikeTick + releaseSpan));
  const residueUntilTick = Math.min(durationTicks, Math.max(releaseTick + 1, releaseTick + residueSpan));

  if (!(prepareTick < strikeTick && strikeTick <= releaseTick && releaseTick < residueUntilTick)) {
    const fallbackStrike = Math.max(1, Math.floor(durationTicks * 0.35));
    const fallbackPrepare = Math.max(0, fallbackStrike - 1);
    const fallbackRelease = Math.max(fallbackStrike, Math.floor(durationTicks * 0.55));
    const fallbackResidue = Math.max(fallbackRelease + 1, Math.floor(durationTicks * 0.8));
    return deepFreeze({
      prepareTick: fallbackPrepare,
      strikeTick: fallbackStrike,
      releaseTick: Math.min(durationTicks - 1, fallbackRelease),
      residueUntilTick: Math.min(durationTicks, fallbackResidue),
    });
  }

  return deepFreeze({ prepareTick, strikeTick, releaseTick, residueUntilTick });
}

function buildGrabRequest(timeline, {
  id,
  parameters = ORDINARY_GRAB_PARAMETERS,
  evidenceRefs,
  salt = id,
} = {}) {
  if (typeof id !== "string" || id.length === 0) {
    throw new TypeError("GRAB request requires id.");
  }
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length === 0) {
    throw new TypeError("GRAB request requires evidenceRefs.");
  }
  return deepFreeze({
    id,
    kind: "grab",
    ...boundedGrabWindow(timeline, salt),
    parameters: structuredClone(parameters),
    evidenceRefs: [...evidenceRefs],
  });
}

function projectOrdinaryGrabView(family, { authorityForCandidate } = {}) {
  if (typeof authorityForCandidate !== "function") {
    verifyCandidateFamilyAddress(family);
  }
  const candidates = family.candidates.map((candidate) => {
    if (!shouldPreferOrdinaryGrab({ rootSeed: family.rootSeed, slotIndex: candidate.index })) {
      return candidate;
    }
    const authority = typeof authorityForCandidate === "function"
      ? authorityForCandidate(candidate)
      : { family, candidateIndex: candidate.index, sourceFamilyHash: family.familyHash };
    if (!authority?.family || !Number.isSafeInteger(authority.candidateIndex)) {
      throw new TypeError("Ordinary GRAB authority resolver returned invalid authority.");
    }
    const request = buildGrabRequest(candidate.timeline, {
      id: `ordinary-grab-${candidate.index}`,
      evidenceRefs: [
        `event-authority:${authority.family.familyHash}`,
        `source-family:${authority.sourceFamilyHash || family.familyHash}`,
        `field-family:${family.familyHash}`,
        `policy:${ORDINARY_GRAB_PREFERENCE.policyVersion}`,
      ],
      salt: `${family.rootSeed}:${candidate.index}`,
    });
    const timeline = resolveTopologyEvents(candidate.timeline, {
      family: authority.family,
      candidateIndex: authority.candidateIndex,
      events: [request],
    });
    return deepFreeze({
      ...candidate,
      timeline,
      timelineHash: timeline.timelineHash,
      topologyEventProjection: deepFreeze({
        policyVersion: ORDINARY_GRAB_PREFERENCE.policyVersion,
        preferred: true,
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
    schema: ORDINARY_GRAB_VIEW_SCHEMA,
    policy: ORDINARY_GRAB_VIEW_POLICY,
    sourceFamilyHash: family.familyHash,
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    candidates,
  });
}

module.exports = {
  ORDINARY_GRAB_PARAMETERS,
  ORDINARY_GRAB_PREFERENCE,
  ORDINARY_GRAB_VIEW_POLICY,
  ORDINARY_GRAB_VIEW_SCHEMA,
  boundedGrabWindow,
  buildGrabRequest,
  projectOrdinaryGrabView,
  shouldPreferOrdinaryGrab,
};
