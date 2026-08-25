const ecology = require("./beta-candidate-ecology.cjs");
const base = require("./nested-response-generation.cjs");
const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const { MUTATION_LATTICE_RENDERER_PROFILE_ID } = require("./renderer-policy.cjs");
const toastFeelGeneration = require("./toast-feel-generation.cjs");
const { getToastFeel } = require("../toast-feels.cjs");

function normalizeFieldRoles(family) {
  if (family?.policy !== ecology.TOASTMOOD_FIELD_POLICY) return family;
  const candidates = family.candidates.map((candidate) => deepFreeze({
    ...candidate,
    role: `toastmood:${candidate.toastmoodLane.id}`,
  }));
  return deepFreeze({ ...family, candidates });
}

function generateToastmoodFieldCandidateSet(options = {}) {
  return normalizeFieldRoles(ecology.generateToastmoodFieldCandidateSet(options));
}

function generateCandidateSet(options = {}) {
  const isBetaRenderer = options.rendererProfile?.id === MUTATION_LATTICE_RENDERER_PROFILE_ID;
  if (!isBetaRenderer) return base.generateCandidateSet(options);
  return normalizeFieldRoles(ecology.generateCandidateSet(options));
}

function selectedFeelEvidence(toastFeelId) {
  if (!toastFeelId) return null;
  const feel = getToastFeel(toastFeelId);
  if (!feel) throw new TypeError(`Unknown Toast Feel: ${String(toastFeelId)}.`);
  if (feel.semanticClass === "ordinary") return toastFeelGeneration.feelEvidence(feel);
  return deepFreeze({
    contractVersion: feel.contractVersion,
    id: feel.id,
    name: feel.name,
    semanticClass: feel.semanticClass,
    pressureHash: null,
    affinityHash: null,
  });
}

function attachCrossFeel(family, toastFeelId) {
  const evidence = selectedFeelEvidence(toastFeelId);
  if (!evidence || family.toastFeel?.id === evidence.id) return family;
  const {
    familyHash: _familyHash,
    candidates,
    toastFeel: _toastFeel,
    ...stableCore
  } = family;
  const core = {
    ...structuredClone(stableCore),
    toastFeel: evidence,
  };
  return deepFreeze({
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCrossCandidateSet(options = {}) {
  return attachCrossFeel(ecology.generateCrossCandidateSet(options), options.toastFeelId);
}

function replayResult(family, replayed, expectedTimelineHashes = family.timelineHashes) {
  const addressesMatch = canonicalStringify(replayed.scoreAddresses) === canonicalStringify(family.scoreAddresses);
  const timelinesMatch = canonicalStringify(replayed.timelineHashes) === canonicalStringify(expectedTimelineHashes);
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
    expectedTimelineHashes,
    actualTimelineHashes: replayed.timelineHashes,
    replayed,
  });
}

function crossBirthTimelineHashes(family) {
  if (!Array.isArray(family?.candidates) || family.candidates.length !== family.producedCount) {
    throw new TypeError("CROSS replay requires aligned current candidates.");
  }
  return family.candidates.map((candidate, index) => {
    const carried = candidate?.topologyEventAuthority?.sourceTimelineHash;
    if (carried) return carried;
    const current = family.timelineHashes?.[index];
    if (typeof current !== "string" || current.length === 0) {
      throw new TypeError("CROSS replay requires a source timeline identity for every candidate.");
    }
    return current;
  });
}

function isCrossFamilyOrView(family) {
  return Boolean(
    family?.policy === ecology.CROSS_POLICY ||
    family?.cross?.policy === ecology.CROSS_POLICY
  );
}

function replayCandidateFamily(family, options = {}) {
  if (isCrossFamilyOrView(family)) {
    if (!Array.isArray(options.parentCandidates) || options.parentCandidates.length !== 2) {
      throw new TypeError("CROSS replay requires exactly two parent candidates.");
    }
    const replayed = generateCrossCandidateSet({
      ...options,
      parentCandidates: options.parentCandidates,
      parentFamilyHash: family.cross?.parentFamilyHash || null,
      toastFeelId: family.toastFeel?.id || options.toastFeelId || null,
      locks: family.locks,
      rootSeed: family.rootSeed,
      count: family.requestedCount,
      phase: "cross",
    });
    return replayResult(family, replayed, crossBirthTimelineHashes(family));
  }

  const replay = ecology.replayCandidateFamily(family, options);
  if (family?.policy !== ecology.TOASTMOOD_FIELD_POLICY) return replay;
  return deepFreeze({
    ...replay,
    replayed: normalizeFieldRoles(replay.replayed),
  });
}

module.exports = {
  ...ecology,
  generateCandidateSet,
  generateCrossCandidateSet,
  generateToastmoodFieldCandidateSet,
  replayCandidateFamily,
};
