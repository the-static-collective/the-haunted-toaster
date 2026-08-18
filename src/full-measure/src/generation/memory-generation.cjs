const { canonicalStringify, deepFreeze, hashCanonical } = require("./canonical.cjs");
const base = require("./nested-response-generation.cjs");
const primitiveGeneration = require("./primitive-field-generation.cjs");
const toastFeelGeneration = require("./toast-feel-generation.cjs");
const { resolveNativeColorPlan } = require("./native-color.cjs");
const { attachTopologyArc } = require("./topology-arc.cjs");
const { attachNestedResponse } = require("./nested-response.cjs");
const { applyMemoryInfluence, memoryInfluenceAxis } = require("./memory-influence.cjs");

const MEMORY_SEAT_POLICY = "toaster-memory-seat-v1";

function memoryApplication(score, constraints, locks, influencePlan) {
  const axis = memoryInfluenceAxis(influencePlan);
  if (axis && locks.includes(axis)) {
    return {
      score: structuredClone(score),
      application: deepFreeze({
        applied: false,
        reason: "axis-locked",
        axis,
        target: String(influencePlan?.target || ""),
      }),
    };
  }
  const result = applyMemoryInfluence(score, constraints, influencePlan);
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

function resolveMemoryTimeline(candidate, scoreArtifact, options) {
  const constraints = options.garmentConstraints || options.constraints;
  const locks = [...new Set((options.locks || []).map(String))].sort();
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
    rootSeed: `${String(options.rootSeed)}:topology-arc:${scoreArtifact.address}`,
    toastFeelId: options.toastFeelId || null,
  });

  if (options.responseWitness) {
    timeline = attachNestedResponse(timeline, {
      responseWitness: options.responseWitness,
      score: scoreArtifact.score,
    });
  }
  return timeline;
}

function decorateMemorySeat(baseFamily, options = {}) {
  const influencePlan = options.memoryInfluence;
  if (!influencePlan || !baseFamily?.candidates?.length) return baseFamily;

  const constraints = options.garmentConstraints || options.constraints;
  const locks = [...new Set((baseFamily.locks || options.locks || []).map(String))].sort();
  const seatIndex = Math.min(5, baseFamily.candidates.length - 1);
  const candidate = baseFamily.candidates[seatIndex];
  const applied = memoryApplication(
    candidate.scoreArtifact.score,
    constraints,
    locks,
    influencePlan,
  );

  const derivation = structuredClone(candidate.scoreArtifact.derivation || {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "candidate-family",
    parentScoreRefs: [],
    policy: {},
  });
  derivation.policy = {
    ...(derivation.policy || {}),
    memoryInfluence: {
      policyVersion: MEMORY_SEAT_POLICY,
      plan: structuredClone(influencePlan),
      application: structuredClone(applied.application),
    },
  };

  const scoreArtifact = primitiveGeneration.artifact(applied.score, derivation);
  const timeline = applied.application.applied
    ? resolveMemoryTimeline(candidate, scoreArtifact, {
        ...options,
        locks,
        toastFeelId: options.toastFeelId || baseFamily.toastFeel?.id || null,
      })
    : candidate.timeline;
  const memoryCandidate = deepFreeze({
    ...candidate,
    scoreAddress: scoreArtifact.address,
    scoreArtifact,
    memoryInfluence: applied.application,
    timeline,
    timelineHash: timeline.timelineHash,
  });
  const candidates = baseFamily.candidates.map((item, index) =>
    index === seatIndex ? memoryCandidate : item,
  );

  const {
    familyHash: _familyHash,
    candidates: _candidates,
    scoreAddresses: _scoreAddresses,
    timelineHashes: _timelineHashes,
    mutationLattice: priorLattice,
    memoryInfluence: _memoryInfluence,
    memorySampling: _memorySampling,
    ...stableCore
  } = baseFamily;
  const prePlanCore = {
    ...structuredClone(stableCore),
    scoreAddresses: candidates.map((item) => item.scoreAddress),
    timelineHashes: candidates.map((item) => item.timelineHash),
    memoryInfluence: structuredClone(influencePlan),
    memorySampling: {
      policyVersion: MEMORY_SEAT_POLICY,
      seatIndex,
      baselineFamilyHash: baseFamily.familyHash,
      admittedScoreAddress: applied.application.applied ? scoreArtifact.address : null,
    },
  };
  const prePlanFamily = {
    ...prePlanCore,
    familyHash: hashCanonical(prePlanCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  };
  const mutationLattice = base.buildMutationLatticePlan({
    family: prePlanFamily,
    constraints,
    rendererProfile: options.rendererProfile,
    toastFeelId: options.toastFeelId || baseFamily.toastFeel?.id || null,
    analysis: options.analysis,
    priorPlanSha256: priorLattice?.priorPlanSha256 || null,
  });
  const core = {
    ...prePlanCore,
    mutationLattice,
  };
  return deepFreeze({
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCandidateSet(options = {}) {
  const baseFamily = base.generateCandidateSet({
    ...options,
    memoryInfluence: null,
  });
  return decorateMemorySeat(baseFamily, options);
}

function replayCandidateFamily(family, options = {}) {
  if (!family?.memoryInfluence) return base.replayCandidateFamily(family, options);
  const replayed = generateCandidateSet({
    ...options,
    toastFeelId: options.toastFeelId || family.toastFeel?.id,
    locks: family.locks,
    rootSeed: family.rootSeed,
    count: family.requestedCount,
    phase: family.phase,
    memoryInfluence: family.memoryInfluence,
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
  MEMORY_SEAT_POLICY,
  decorateMemorySeat,
  generateCandidateSet,
  replayCandidateFamily,
};
