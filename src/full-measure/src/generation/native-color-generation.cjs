const { canonicalStringify, deepFreeze, hashCanonical } = require("./canonical.cjs");
const toastGeneration = require("./toast-feel-generation.cjs");
const schema = require("./schema.cjs");
const { stripPrimitiveField } = require("./primitive-field-score.cjs");
const { getToastFeel } = require("../toast-feels.cjs");
const {
  NATIVE_COLOR_POLICY,
  RELATIONSHIPS,
  resolveNativeColorPlan,
} = require("./native-color.cjs");

function preferredRelationship(toastFeelId) {
  const feel = getToastFeel(toastFeelId);
  if (!feel) throw new TypeError(`Unknown Toast Feel: ${String(toastFeelId)}.`);
  return Number(feel.pressure?.contrast) > 0.25 ? "counterpoint" : "echo";
}

function relationshipSequence(preferred, count) {
  const other = preferred === "echo" ? "counterpoint" : "echo";
  return Array.from({ length: count }, (_, index) => index % 2 ? other : preferred);
}

function decorateFamilyWithNativeColor(baseFamily, options = {}) {
  const profile = options.nativeChromaticProfile;
  if (!profile) return baseFamily;
  const preferred = preferredRelationship(options.toastFeelId || baseFamily.toastFeel?.id);
  const lockedRelationship = (options.locks || []).includes("palette") &&
    RELATIONSHIPS.includes(options.parentNativeColorPlan?.relationship)
    ? options.parentNativeColorPlan.relationship
    : null;
  const sequence = relationshipSequence(preferred, baseFamily.candidates.length);
  const candidates = baseFamily.candidates.map((candidate, index) => {
    const timeline = resolveNativeColorPlan(candidate.timeline, {
      profile,
      analysis: options.analysis,
      relationship: lockedRelationship || sequence[index],
    });
    if (timeline === candidate.timeline) return candidate;
    return deepFreeze({
      ...candidate,
      timeline,
      timelineHash: timeline.timelineHash,
    });
  });
  const nativeColor = deepFreeze({
    policyVersion: NATIVE_COLOR_POLICY,
    profileSha256: profile.profileSha256,
    relationships: [...RELATIONSHIPS],
    preferredRelationship: preferred,
  });
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    timelineHashes: _timelineHashes,
    nativeColor: _nativeColor,
    ...stableCore
  } = baseFamily;
  const familyCore = {
    ...structuredClone(stableCore),
    timelineHashes: candidates.map(({ timelineHash }) => timelineHash),
    nativeColor,
  };
  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCandidateSet(options = {}) {
  return decorateFamilyWithNativeColor(
    toastGeneration.generateCandidateSet(options),
    options,
  );
}

function generateStompCandidateSet(options = {}) {
  return decorateFamilyWithNativeColor(
    toastGeneration.generateStompCandidateSet(options),
    options,
  );
}

function restoreConvergeSeedParentRef(family, parentScore) {
  if (!family?.converge?.enabled || !parentScore) return family;
  const candidateIndex = family.candidates?.findIndex((item) => item.role === "converge-frontier");
  if (!Number.isInteger(candidateIndex) || candidateIndex < 0) return family;
  const candidate = family.candidates[candidateIndex];
  const policy = candidate?.scoreArtifact?.derivation?.policy;
  if (!policy?.derivedSeed || !policy?.parentScoreRef) return family;

  const seedParentScoreRef = schema.addressVisualScore(stripPrimitiveField(parentScore));
  if (policy.parentScoreRef === seedParentScoreRef) return family;

  const derivation = structuredClone(candidate.scoreArtifact.derivation);
  derivation.policy.parentScoreRef = seedParentScoreRef;
  const scoreArtifact = deepFreeze({
    ...candidate.scoreArtifact,
    derivation: deepFreeze(derivation),
  });
  const repairedCandidate = deepFreeze({ ...candidate, scoreArtifact });
  const candidates = family.candidates.map((item, index) =>
    index === candidateIndex ? repairedCandidate : item,
  );
  return deepFreeze({ ...family, candidates });
}

function replaceFinalCandidateWithConverge(family, options = {}) {
  const nextOptions = {
    ...options,
    toastFeelId: options.toastFeelId || family.toastFeel?.id,
  };
  const converged = toastGeneration.replaceFinalCandidateWithConverge(family, nextOptions);
  return decorateFamilyWithNativeColor(
    restoreConvergeSeedParentRef(converged, nextOptions.parentScore),
    nextOptions,
  );
}

function replayCandidateFamily(family, options = {}) {
  const replayed = generateCandidateSet({
    ...options,
    toastFeelId: options.toastFeelId || family.toastFeel?.id,
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
  decorateFamilyWithNativeColor,
  generateCandidateSet,
  generateStompCandidateSet,
  preferredRelationship,
  relationshipSequence,
  replaceFinalCandidateWithConverge,
  replayCandidateFamily,
};
