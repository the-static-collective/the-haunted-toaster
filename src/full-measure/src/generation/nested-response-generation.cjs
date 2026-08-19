const { canonicalStringify, deepFreeze, hashCanonical } = require("./canonical.cjs");
const { attachNestedResponse } = require("./nested-response.cjs");
const base = require("./mutation-lattice-generation.cjs");
const { STOMP_POLICY } = require("./stomp-generation.cjs");
const { MUTATION_LATTICE_RENDERER_PROFILE_ID } = require("./renderer-policy.cjs");

function isV3(options = {}) {
  return options.rendererProfile?.id === MUTATION_LATTICE_RENDERER_PROFILE_ID;
}

function normalizeRequestedCount(baseFamily, options = {}) {
  if (!isV3(options)) return baseFamily;
  const requestedCount = Number(options.count || baseFamily.requestedCount || 6);
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || baseFamily.candidates.length <= requestedCount) {
    return baseFamily;
  }

  const constraints = options.garmentConstraints || options.constraints;
  const candidates = baseFamily.candidates.slice(0, requestedCount);
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    scoreAddresses: _scoreAddresses,
    timelineHashes: _timelineHashes,
    roles: _roles,
    producedCount: _producedCount,
    shortfall: _shortfall,
    mutationLattice: priorLattice,
    ...stableCore
  } = baseFamily;
  const prePlanCore = {
    ...structuredClone(stableCore),
    requestedCount,
    producedCount: candidates.length,
    roles: candidates.map((candidate) => candidate.role),
    scoreAddresses: candidates.map((candidate) => candidate.scoreAddress),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    shortfall: null,
  };
  const prePlanFamily = {
    ...prePlanCore,
    familyHash: hashCanonical(prePlanCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  };
  const plan = base.buildMutationLatticePlan({
    family: prePlanFamily,
    constraints,
    rendererProfile: options.rendererProfile,
    toastFeelId: options.toastFeelId || baseFamily.toastFeel?.id || null,
    analysis: options.analysis,
    priorPlanSha256: priorLattice?.priorPlanSha256 || null,
  });
  const core = {
    ...prePlanCore,
    mutationLattice: plan,
  };
  return deepFreeze({
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function bindResponseToFamily(baseFamily, options = {}) {
  if (!isV3(options) || !options.responseWitness) return baseFamily;
  const constraints = options.garmentConstraints || options.constraints;
  const candidates = baseFamily.candidates.map((candidate) => {
    const timeline = attachNestedResponse(candidate.timeline, {
      responseWitness: options.responseWitness,
      score: candidate.scoreArtifact.score,
    });
    return deepFreeze({ ...candidate, timeline, timelineHash: timeline.timelineHash });
  });

  const {
    familyHash: _familyHash,
    candidates: _candidates,
    timelineHashes: _timelineHashes,
    mutationLattice: priorLattice,
    ...stableCore
  } = baseFamily;
  const prePlanCore = {
    ...structuredClone(stableCore),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
  };
  const prePlanFamily = {
    ...prePlanCore,
    familyHash: hashCanonical(prePlanCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  };
  const plan = base.buildMutationLatticePlan({
    family: prePlanFamily,
    constraints,
    rendererProfile: options.rendererProfile,
    toastFeelId: options.toastFeelId || baseFamily.toastFeel?.id || null,
    analysis: options.analysis,
    priorPlanSha256: priorLattice?.priorPlanSha256 || null,
  });
  const core = {
    ...prePlanCore,
    mutationLattice: plan,
  };
  return deepFreeze({
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCandidateSet(options = {}) {
  return bindResponseToFamily(normalizeRequestedCount(base.generateCandidateSet(options), options), options);
}

function generateStompCandidateSet(options = {}) {
  return bindResponseToFamily(base.generateStompCandidateSet(options), options);
}

function replaceFinalCandidateWithConverge(family, options = {}) {
  return bindResponseToFamily(base.replaceFinalCandidateWithConverge(family, options), options);
}

function replayCandidateFamily(family, options = {}) {
  if (!isV3(options) || !options.responseWitness) {
    return base.replayCandidateFamily(family, options);
  }
  if (family?.mutationLattice) {
    const validation = base.validateMutationLatticeEvidence(family.mutationLattice);
    if (!validation.ok) throw new Error(`Cannot replay invalid Mutation Lattice evidence: ${validation.reason}.`);
  }
  const familyType = base.deriveAuthoritativeFamilyType(family);
  let replayed;
  if (familyType === "stomp" && family.policy === STOMP_POLICY) {
    replayed = generateStompCandidateSet({
      ...options,
      toastFeelId: options.toastFeelId || family.toastFeel?.id,
      locks: family.locks,
      rootSeed: family.rootSeed,
      count: family.requestedCount,
    });
  } else {
    replayed = generateCandidateSet({
      ...options,
      toastFeelId: options.toastFeelId || family.toastFeel?.id,
      locks: family.locks,
      rootSeed: family.rootSeed,
      count: family.requestedCount,
      phase: family.phase,
    });
    if (familyType === "converge") {
      replayed = replaceFinalCandidateWithConverge(replayed, {
        ...options,
        toastFeelId: options.toastFeelId || family.toastFeel?.id,
        locks: family.locks,
        rootSeed: family.rootSeed,
      });
    }
  }
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
  bindResponseToFamily,
  generateCandidateSet,
  generateStompCandidateSet,
  normalizeRequestedCount,
  replaceFinalCandidateWithConverge,
  replayCandidateFamily,
};
