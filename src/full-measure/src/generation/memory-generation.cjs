const { canonicalStringify, deepFreeze, hashCanonical } = require("./canonical.cjs");
const base = require("./nested-response-generation.cjs");

const MEMORY_SEAT_POLICY = "toaster-memory-seat-v1";
const MAX_MEMORY_SEAT_ATTEMPTS = 4;

function isApplied(candidate) {
  return candidate?.memoryInfluence?.applied === true;
}

function memoryAttemptSeed(options, attempt) {
  if (attempt === 0) return String(options.rootSeed);
  return `ht-memory-seat:${hashCanonical({
    rootSeed: String(options.rootSeed),
    capsuleSha256: options.memoryInfluence?.capsuleSha256 || null,
    target: options.memoryInfluence?.target || null,
    attempt,
  }, "HauntedToaster-MemorySeatSeed-v1")}`;
}

function reindexCandidate(candidate, index) {
  return deepFreeze({
    ...candidate,
    index,
  });
}

function rebuildMemoryFamily(baselineFamily, candidates, options, sampling) {
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    scoreAddresses: _scoreAddresses,
    timelineHashes: _timelineHashes,
    roles: _roles,
    producedCount: _producedCount,
    shortfall: _shortfall,
    mutationLattice: priorLattice,
    memoryInfluence: _memoryInfluence,
    memorySampling: _memorySampling,
    ...stableCore
  } = baselineFamily;

  const selected = candidates.map(reindexCandidate);
  const prePlanCore = {
    ...structuredClone(stableCore),
    producedCount: selected.length,
    roles: selected.map((candidate) => candidate.role),
    scoreAddresses: selected.map((candidate) => candidate.scoreAddress),
    timelineHashes: selected.map((candidate) => candidate.timelineHash),
    shortfall: selected.length < 6
      ? {
          requested: 6,
          produced: selected.length,
          reason: "memory-seat-could-not-preserve-six-distinct-lawful-candidates",
        }
      : null,
    memoryInfluence: structuredClone(options.memoryInfluence),
    memorySampling: {
      policyVersion: MEMORY_SEAT_POLICY,
      baselineFamilyHash: baselineFamily.familyHash,
      attemptedRootSeeds: [...sampling.attemptedRootSeeds],
      sourceFamilyHashes: [...sampling.sourceFamilyHashes],
      admittedScoreAddress: sampling.admittedScoreAddress || null,
    },
  };
  const prePlanFamily = {
    ...prePlanCore,
    familyHash: hashCanonical(prePlanCore, "HauntedToaster-CandidateFamily-v1"),
    candidates: selected,
  };
  const plan = base.buildMutationLatticePlan({
    family: prePlanFamily,
    constraints: options.garmentConstraints || options.constraints,
    rendererProfile: options.rendererProfile,
    toastFeelId: options.toastFeelId || baselineFamily.toastFeel?.id || null,
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
    candidates: selected,
  });
}

function generateCandidateSet(options = {}) {
  if (!options.memoryInfluence) return base.generateCandidateSet(options);

  const baselineFamily = base.generateCandidateSet({
    ...options,
    memoryInfluence: null,
  });
  if (baselineFamily.candidates.length < 6) {
    return rebuildMemoryFamily(baselineFamily, baselineFamily.candidates, options, {
      attemptedRootSeeds: [],
      sourceFamilyHashes: [],
      admittedScoreAddress: null,
    });
  }

  const firstFive = baselineFamily.candidates.slice(0, 5);
  const occupied = new Set(firstFive.map((candidate) => candidate.scoreAddress));
  const attemptedRootSeeds = [];
  const sourceFamilyHashes = [];
  let admitted = null;

  for (let attempt = 0; attempt < MAX_MEMORY_SEAT_ATTEMPTS; attempt += 1) {
    const rootSeed = memoryAttemptSeed(options, attempt);
    attemptedRootSeeds.push(rootSeed);
    const sourceFamily = base.generateCandidateSet({
      ...options,
      rootSeed,
      memoryInfluence: options.memoryInfluence,
    });
    sourceFamilyHashes.push(sourceFamily.familyHash);
    admitted = sourceFamily.candidates.find(
      (candidate) => isApplied(candidate) && !occupied.has(candidate.scoreAddress),
    ) || null;
    if (admitted) break;
  }

  const combined = admitted
    ? [...firstFive, admitted]
    : baselineFamily.candidates;
  return rebuildMemoryFamily(baselineFamily, combined, options, {
    attemptedRootSeeds,
    sourceFamilyHashes,
    admittedScoreAddress: admitted?.scoreAddress || null,
  });
}

function replayCandidateFamily(family, options = {}) {
  if (!family?.memoryInfluence) return base.replayCandidateFamily(family, options);
  const replayed = generateCandidateSet({
    ...options,
    toastFeelId: options.toastFeelId || family.toastFeel?.id,
    parentScore: options.parentScore || null,
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
  MAX_MEMORY_SEAT_ATTEMPTS,
  MEMORY_SEAT_POLICY,
  generateCandidateSet,
  replayCandidateFamily,
};
