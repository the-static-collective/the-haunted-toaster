const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const base = require("./beta-candidate-ecology-compat.cjs");
const primitiveGeneration = require("./primitive-field-generation.cjs");
const toastFeelGeneration = require("./toast-feel-generation.cjs");
const { resolveNativeColorPlan } = require("./native-color.cjs");
const { attachTopologyArc } = require("./topology-arc.cjs");
const { attachNestedResponse } = require("./nested-response.cjs");
const {
  applyMemoryInfluence,
  memoryInfluenceAxis,
} = require("./memory-influence.cjs");

const MEMORY_PRISM_FAMILY_POLICY = "toaster-memory-prism-family-v1";
const MEMORY_PRISM_SCHEMA = "haunted-toaster/memory-prism/v1";

function assertPrism(prism) {
  if (!prism || prism.schema !== MEMORY_PRISM_SCHEMA || !prism.prismSha256) {
    throw new TypeError(`Expected ${MEMORY_PRISM_SCHEMA}.`);
  }
  if (!Array.isArray(prism.seats) || prism.seats.length !== 6) {
    throw new TypeError("Memory Prism requires exactly six aperture seats.");
  }
  const indexes = prism.seats.map((seat) => Number(seat.seatIndex));
  if (new Set(indexes).size !== 6 || indexes.some((index) => !Number.isInteger(index) || index < 0 || index > 5)) {
    throw new TypeError("Memory Prism seat indexes must be exactly 0..5.");
  }
  return prism;
}

function memoryApplication(score, constraints, locks, influence) {
  if (!influence) {
    return {
      score: structuredClone(score),
      application: deepFreeze({
        applied: false,
        reason: "no-pressure",
        axis: null,
        target: null,
      }),
    };
  }
  const axis = memoryInfluenceAxis(influence);
  if (axis && locks.includes(axis)) {
    return {
      score: structuredClone(score),
      application: deepFreeze({
        applied: false,
        reason: "axis-locked",
        axis,
        target: String(influence.target || ""),
      }),
    };
  }
  const result = applyMemoryInfluence(score, constraints, influence);
  return {
    score: result.score,
    application: deepFreeze({
      applied: result.applied,
      reason: result.reason,
      axis: result.axis,
      target: result.target,
    }),
  };
}

function resolveMemoryTimeline(candidate, scoreArtifact, options, baseFamily) {
  const constraints = options.garmentConstraints || options.constraints;
  const locks = [...new Set((baseFamily.locks || options.locks || []).map(String))].sort();
  let timeline = toastFeelGeneration.resolvePressuredTimeline({
    analysis: options.analysis,
    score: scoreArtifact.score,
    constraints,
    rendererProfile: options.rendererProfile,
    locks,
    lyricTrack: options.lyricTrack || null,
  });

  const relationship = candidate.timeline?.nativeColor?.relationship;
  if (relationship && options.nativeChromaticProfile) {
    timeline = resolveNativeColorPlan(timeline, {
      profile: options.nativeChromaticProfile,
      analysis: options.analysis,
      relationship,
    });
  }

  timeline = attachTopologyArc(timeline, {
    analysis: options.analysis,
    score: scoreArtifact.score,
    constraints,
    locks,
    rootSeed: `${String(options.rootSeed)}:memory-prism-topology-arc:${scoreArtifact.address}`,
    toastFeelId: candidate.toastmoodLane?.id || options.toastFeelId || baseFamily.toastFeel?.id || null,
  });

  if (options.responseWitness) {
    timeline = attachNestedResponse(timeline, {
      responseWitness: options.responseWitness,
      score: scoreArtifact.score,
    });
  }
  return timeline;
}

function candidateWithMemorySeat(candidate, seat, prism, options, baseFamily) {
  const constraints = options.garmentConstraints || options.constraints;
  const locks = [...new Set((baseFamily.locks || options.locks || []).map(String))].sort();
  const applied = memoryApplication(
    candidate.scoreArtifact.score,
    constraints,
    locks,
    seat.influence || null,
  );
  const derivation = structuredClone(candidate.scoreArtifact.derivation || {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "candidate-family",
    parentScoreRefs: [],
    policy: {},
  });
  derivation.policy = {
    ...(derivation.policy || {}),
    memoryPrism: {
      policyVersion: MEMORY_PRISM_FAMILY_POLICY,
      prismSha256: prism.prismSha256,
      capsuleSha256: prism.capsuleSha256,
      seatIndex: seat.seatIndex,
      aperture: seat.aperture,
      targetPrefix: seat.targetPrefix,
      influence: seat.influence ? structuredClone(seat.influence) : null,
      application: structuredClone(applied.application),
    },
  };
  const scoreArtifact = primitiveGeneration.artifact(applied.score, derivation);
  const timeline = applied.application.applied
    ? resolveMemoryTimeline(candidate, scoreArtifact, options, baseFamily)
    : candidate.timeline;
  const changedAxes = applied.application.applied && applied.application.axis
    ? [...new Set([...(candidate.changedAxes || []), applied.application.axis])]
    : [...(candidate.changedAxes || [])];
  const next = {
    ...candidate,
    scoreAddress: scoreArtifact.address,
    scoreArtifact,
    changedAxes,
    timeline,
    timelineHash: timeline.timelineHash,
    memoryPrismSeat: deepFreeze({
      policyVersion: MEMORY_PRISM_FAMILY_POLICY,
      prismSha256: prism.prismSha256,
      capsuleSha256: prism.capsuleSha256,
      seatIndex: seat.seatIndex,
      aperture: seat.aperture,
      targetPrefix: seat.targetPrefix,
      influence: seat.influence ? structuredClone(seat.influence) : null,
      application: structuredClone(applied.application),
    }),
  };
  if (typeof base.startingChromaticIdentity === "function") {
    next.startingChromaticIdentity = base.startingChromaticIdentity(next);
  }
  return deepFreeze(next);
}

function decorateMemoryPrism(baseFamily, options = {}) {
  const prism = options.memoryPrism;
  if (!prism) return baseFamily;
  assertPrism(prism);
  if (baseFamily.requestedCount !== 6 || baseFamily.candidates.length !== 6) {
    throw new TypeError("MEMORY-001 currently requires an exact ordinary six-up.");
  }

  const seatByIndex = new Map(prism.seats.map((seat) => [Number(seat.seatIndex), seat]));
  const candidates = baseFamily.candidates.map((candidate, index) =>
    candidateWithMemorySeat(candidate, seatByIndex.get(index), prism, options, baseFamily));

  const {
    familyHash: _familyHash,
    candidates: _candidates,
    scoreAddresses: _scoreAddresses,
    timelineHashes: _timelineHashes,
    mutationLattice: priorLattice,
    memoryPrism: _memoryPrism,
    ...stableCore
  } = baseFamily;

  const memoryEvidence = deepFreeze({
    policyVersion: MEMORY_PRISM_FAMILY_POLICY,
    prismSha256: prism.prismSha256,
    capsuleSha256: prism.capsuleSha256,
    baselineFamilyHash: baseFamily.familyHash,
    prism: structuredClone(prism),
    applications: candidates.map((candidate) => ({
      seatIndex: candidate.memoryPrismSeat.seatIndex,
      aperture: candidate.memoryPrismSeat.aperture,
      targetPrefix: candidate.memoryPrismSeat.targetPrefix,
      application: structuredClone(candidate.memoryPrismSeat.application),
    })),
  });

  const prePlanCore = {
    ...structuredClone(stableCore),
    scoreAddresses: candidates.map((candidate) => candidate.scoreAddress),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    memoryPrism: memoryEvidence,
  };
  const prePlanFamily = {
    ...prePlanCore,
    familyHash: hashCanonical(prePlanCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  };
  const mutationLattice = typeof base.buildMutationLatticePlan === "function"
    ? base.buildMutationLatticePlan({
        family: prePlanFamily,
        constraints: options.garmentConstraints || options.constraints,
        rendererProfile: options.rendererProfile,
        toastFeelId: options.toastFeelId || baseFamily.toastFeel?.id || null,
        analysis: options.analysis,
        locks: baseFamily.locks || options.locks || [],
        priorPlanSha256: priorLattice?.priorPlanSha256 || null,
      })
    : null;
  const core = mutationLattice ? { ...prePlanCore, mutationLattice } : prePlanCore;

  return deepFreeze({
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCandidateSet(options = {}) {
  const { memoryPrism = null, ...baseOptions } = options;
  const baseFamily = base.generateCandidateSet(baseOptions);
  return decorateMemoryPrism(baseFamily, { ...options, memoryPrism });
}

function replayCandidateFamily(family, options = {}) {
  if (!family?.memoryPrism?.prism) return base.replayCandidateFamily(family, options);
  const replayed = generateCandidateSet({
    ...options,
    memoryPrism: family.memoryPrism.prism,
    toastFeelId: options.toastFeelId || family.toastFeel?.id || null,
    locks: family.locks,
    rootSeed: family.rootSeed,
    count: family.requestedCount,
    phase: family.phase,
  });
  const addressesMatch = canonicalStringify(replayed.scoreAddresses) === canonicalStringify(family.scoreAddresses);
  const timelinesMatch = canonicalStringify(replayed.timelineHashes) === canonicalStringify(family.timelineHashes);
  const familyHashMatches = replayed.familyHash === family.familyHash;
  return deepFreeze({
    schema: "haunted-toaster/candidate-family-replay/v1",
    ok: addressesMatch && timelinesMatch && familyHashMatches,
    addressesMatch,
    timelinesMatch,
    familyHashMatches,
    expectedFamilyHash: family.familyHash,
    actualFamilyHash: replayed.familyHash,
    expectedScoreAddresses: family.scoreAddresses,
    actualScoreAddresses: replayed.scoreAddresses,
    expectedTimelineHashes: family.timelineHashes,
    actualTimelineHashes: replayed.timelineHashes,
    replayed,
  });
}

module.exports = {
  ...base,
  MEMORY_PRISM_FAMILY_POLICY,
  MEMORY_PRISM_SCHEMA,
  decorateMemoryPrism,
  generateCandidateSet,
  replayCandidateFamily,
};
