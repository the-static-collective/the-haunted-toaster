const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const primitiveGeneration = require("./primitive-field-generation.cjs");
const stompGeneration = require("./stomp-generation.cjs");
const { resolveLyricResonance } = require("./lyric-resonance.cjs");

function attachLyricResonance(timeline, lyricTrack = null) {
  const lyricResonance = resolveLyricResonance(lyricTrack, {
    timebase: timeline.timebase,
    durationTicks: timeline.durationTicks,
  });
  if (!lyricResonance) return timeline;

  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    ...baseBody
  } = timeline;
  const body = {
    ...structuredClone(baseBody),
    lyricResonance,
  };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  if (
    timeline.timelineHash === timelineHash &&
    timeline.lyricResonance &&
    canonicalStringify(timeline.lyricResonance) === canonicalStringify(lyricResonance)
  ) {
    return timeline;
  }
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

function rebuildFamilyWithLyricResonance(family, lyricTrack = null) {
  if (!lyricTrack?.timed) return family;
  const candidates = family.candidates.map((candidate) => {
    const timeline = attachLyricResonance(candidate.timeline, lyricTrack);
    if (timeline === candidate.timeline) return candidate;
    return deepFreeze({
      ...candidate,
      timeline,
      timelineHash: timeline.timelineHash,
    });
  });
  if (candidates.every((candidate, index) => candidate === family.candidates[index])) {
    return family;
  }

  const {
    familyHash: _familyHash,
    candidates: _candidates,
    timelineHashes: _timelineHashes,
    ...stableCore
  } = family;
  const familyCore = {
    ...structuredClone(stableCore),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
  };
  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function resolve(
  analysisInput,
  scoreInput,
  constraintsInput,
  profileInput,
  lyricTrack = null,
) {
  return attachLyricResonance(
    primitiveGeneration.resolve(
      analysisInput,
      scoreInput,
      constraintsInput,
      profileInput,
    ),
    lyricTrack,
  );
}

function generateCandidateSet(options = {}) {
  return rebuildFamilyWithLyricResonance(
    primitiveGeneration.generateCandidateSet(options),
    options.lyricTrack || null,
  );
}

function replayCandidateFamily(family, {
  analysis,
  garmentConstraints,
  constraints: constraintsAlias,
  rendererProfile,
  parentScore = null,
  lyricTrack = null,
} = {}) {
  const replayed = generateCandidateSet({
    analysis,
    garmentConstraints: garmentConstraints || constraintsAlias,
    rendererProfile,
    parentScore,
    locks: family.locks,
    rootSeed: family.rootSeed,
    count: family.requestedCount,
    phase: family.phase,
    lyricTrack,
  });
  const addressesMatch =
    canonicalStringify(replayed.scoreAddresses) === canonicalStringify(family.scoreAddresses);
  const timelinesMatch =
    canonicalStringify(replayed.timelineHashes) === canonicalStringify(family.timelineHashes);
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

function replaceFinalCandidateWithConverge(family, options = {}) {
  return rebuildFamilyWithLyricResonance(
    primitiveGeneration.replaceFinalCandidateWithConverge(family, options),
    options.lyricTrack || null,
  );
}

function generateStompCandidateSet(options = {}) {
  return rebuildFamilyWithLyricResonance(
    stompGeneration.generateStompCandidateSet(options),
    options.lyricTrack || null,
  );
}

module.exports = {
  attachLyricResonance,
  generateCandidateSet,
  generateStompCandidateSet,
  rebuildFamilyWithLyricResonance,
  replaceFinalCandidateWithConverge,
  replayCandidateFamily,
  resolve,
};
