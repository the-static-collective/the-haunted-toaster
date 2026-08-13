const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");
const lyricResonance = require("./lyric-resonance-generation.cjs");
const primitiveGeneration = require("./primitive-field-generation.cjs");
const possessionArc = require("./possession-arc.cjs");
const { STOMP_POLICY } = require("./stomp-generation.cjs");
const { getToastFeel } = require("../toast-feels.cjs");

const TOAST_FEEL_PRESSURE_POLICY = "toast-feel-pressure-v1";
const MADD_CLOWN_POLICY = "toast-feel-madd-clown-v1";
const TEMPORAL_ORDER = Object.freeze(["frozen", "section", "phrase", "transient"]);
const FRACTION = Object.freeze({
  motion: 0.12,
  variance: 0.14,
  contrast: 0.12,
  imperfection: 0.14,
  camera: 0.12,
});

function pressureNumber(current, range, pressure, fraction) {
  const span = Number(range.max) - Number(range.min);
  return quantizeNumber(Math.min(
    Number(range.max),
    Math.max(Number(range.min), Number(current) + span * Number(pressure) * fraction),
  ));
}

function pressureTemporal(current, constraints, pressure) {
  if (Math.abs(Number(pressure)) < 0.35) return current;
  const legal = TEMPORAL_ORDER.filter((value) => constraints.temporalDensity.allowed.includes(value));
  const currentIndex = legal.indexOf(current);
  if (currentIndex < 0) return current;
  const direction = Number(pressure) > 0 ? 1 : -1;
  return legal[Math.min(legal.length - 1, Math.max(0, currentIndex + direction))];
}

function applyToastFeelPressure(scoreInput, constraints, feelInput, locks = []) {
  const feel = typeof feelInput === "string" ? getToastFeel(feelInput) : feelInput;
  if (!feel) throw new TypeError(`Unknown Toast Feel: ${String(feelInput)}.`);
  if (feel.semanticClass !== "ordinary" || !feel.pressure) {
    throw new TypeError(`Toast Feel ${feel.id} does not use ordinary pressure.`);
  }
  const locked = new Set((locks || []).map(String));
  const score = structuredClone(scoreInput);
  if (!locked.has("motion")) {
    score.motion.amplitude = pressureNumber(
      score.motion.amplitude,
      constraints.motion.amplitude,
      feel.pressure.motion,
      FRACTION.motion,
    );
    score.motion.variance = pressureNumber(
      score.motion.variance,
      constraints.motion.variance,
      feel.pressure.variance,
      FRACTION.variance,
    );
  }
  if (!locked.has("palette")) {
    score.palette.contrastBias = pressureNumber(
      score.palette.contrastBias,
      constraints.palette.contrastBias,
      feel.pressure.contrast,
      FRACTION.contrast,
    );
  }
  if (!locked.has("material")) {
    score.material.imperfection = pressureNumber(
      score.material.imperfection,
      constraints.material.imperfection,
      feel.pressure.imperfection,
      FRACTION.imperfection,
    );
  }
  if (!locked.has("camera")) {
    score.camera.variance = pressureNumber(
      score.camera.variance,
      constraints.camera.variance,
      feel.pressure.camera,
      FRACTION.camera,
    );
  }
  if (!locked.has("temporalDensity")) {
    score.temporalDensity = pressureTemporal(
      score.temporalDensity,
      constraints,
      feel.pressure.temporal,
    );
  }
  return deepFreeze(score);
}

function feelEvidence(feel) {
  const pressureHash = hashCanonical(
    feel.pressure,
    "HauntedToaster-ToastFeelPressure-v1",
  );
  return deepFreeze({
    contractVersion: feel.contractVersion,
    id: feel.id,
    name: feel.name,
    semanticClass: feel.semanticClass,
    pressureHash,
  });
}

function resolvePressuredTimeline({
  analysis,
  score,
  constraints,
  rendererProfile,
  locks,
  lyricTrack,
}) {
  let timeline = primitiveGeneration.resolve(analysis, score, constraints, rendererProfile);
  timeline = possessionArc.applyPossessionArc(timeline, {
    analysis,
    score,
    constraints,
    locks,
  });
  return lyricResonance.attachLyricResonance(timeline, lyricTrack || null);
}

function pressureCandidate(candidate, options, feel, evidence) {
  if (
    candidate.scoreArtifact.derivation?.policy?.toastFeel?.id === feel.id &&
    candidate.scoreArtifact.derivation.policy.toastFeel.pressureHash === evidence.pressureHash
  ) {
    return candidate;
  }
  const constraints = options.garmentConstraints || options.constraints;
  const locks = options.locks || [];
  const score = applyToastFeelPressure(
    candidate.scoreArtifact.score,
    constraints,
    feel,
    locks,
  );
  const derivation = structuredClone(candidate.scoreArtifact.derivation || {});
  derivation.policy = {
    ...(derivation.policy || {}),
    toastFeel: {
      contractVersion: feel.contractVersion,
      id: feel.id,
      semanticClass: feel.semanticClass,
      pressureHash: evidence.pressureHash,
    },
  };
  const scoreArtifact = primitiveGeneration.artifact(score, derivation);
  const timeline = resolvePressuredTimeline({
    analysis: options.analysis,
    score: scoreArtifact.score,
    constraints,
    rendererProfile: options.rendererProfile,
    locks,
    lyricTrack: options.lyricTrack,
  });
  return deepFreeze({
    ...candidate,
    scoreAddress: scoreArtifact.address,
    scoreArtifact,
    timeline,
    timelineHash: timeline.timelineHash,
  });
}

function rebuildOrdinaryFamily(baseFamily, options, feel) {
  const evidence = feelEvidence(feel);
  const candidates = baseFamily.candidates.map((candidate) =>
    pressureCandidate(candidate, options, feel, evidence));
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    scoreAddresses: _scoreAddresses,
    timelineHashes: _timelineHashes,
    toastFeel: _toastFeel,
    ...stableCore
  } = baseFamily;
  const familyCore = {
    ...structuredClone(stableCore),
    scoreAddresses: candidates.map((candidate) => candidate.scoreAddress),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    toastFeel: evidence,
  };
  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function rebuildMaddClownFamily(baseFamily, feel, {
  seedFamilyHash = null,
  seedParentScoreRef = null,
} = {}) {
  const evidence = deepFreeze({
    contractVersion: feel.contractVersion,
    id: feel.id,
    name: feel.name,
    semanticClass: feel.semanticClass,
    pressureHash: null,
    seedFamilyHash,
    seedParentScoreRef: seedParentScoreRef || baseFamily.parentScoreRef || null,
    stompPolicy: STOMP_POLICY,
  });
  const {
    familyHash: _familyHash,
    candidates,
    policy: _policy,
    toastFeel: _toastFeel,
    ...stableCore
  } = baseFamily;
  const familyCore = {
    ...structuredClone(stableCore),
    policy: MADD_CLOWN_POLICY,
    toastFeel: evidence,
  };
  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateMaddClownCandidateSet(options, feel) {
  const seedFamily = lyricResonance.generateCandidateSet({
    ...options,
    toastFeelId: undefined,
  });
  const digest = hashCanonical(
    { rootSeed: String(options.rootSeed), feel: feel.id },
    "HauntedToaster-MaddClownSeed-v1",
  );
  const seedIndex = Number.parseInt(digest.slice(0, 8), 16) % seedFamily.candidates.length;
  const seedParent = seedFamily.candidates[seedIndex];
  const stompFamily = lyricResonance.generateStompCandidateSet({
    ...options,
    toastFeelId: undefined,
    parentScore: seedParent.scoreArtifact.score,
  });
  return rebuildMaddClownFamily(stompFamily, feel, {
    seedFamilyHash: seedFamily.familyHash,
    seedParentScoreRef: seedParent.scoreAddress,
  });
}

function selectedFeel(toastFeelId) {
  if (toastFeelId === undefined || toastFeelId === null) return null;
  const feel = getToastFeel(toastFeelId);
  if (!feel) throw new TypeError(`Unknown Toast Feel: ${String(toastFeelId)}.`);
  return feel;
}

function decorateFamily(baseFamily, options) {
  const feel = selectedFeel(options.toastFeelId);
  if (!feel) return baseFamily;
  if (feel.semanticClass === "madd-clown") return rebuildMaddClownFamily(baseFamily, feel);
  return rebuildOrdinaryFamily(baseFamily, options, feel);
}

function generateCandidateSet(options = {}) {
  const feel = selectedFeel(options.toastFeelId);
  if (!feel) return lyricResonance.generateCandidateSet(options);
  if (feel.semanticClass === "madd-clown") {
    return generateMaddClownCandidateSet(options, feel);
  }
  return decorateFamily(lyricResonance.generateCandidateSet(options), options);
}

function generateStompCandidateSet(options = {}) {
  const baseFamily = lyricResonance.generateStompCandidateSet(options);
  return decorateFamily(baseFamily, options);
}

function replaceFinalCandidateWithConverge(family, options = {}) {
  const toastFeelId = options.toastFeelId || family.toastFeel?.id;
  const nextOptions = { ...options, toastFeelId };
  const baseFamily = lyricResonance.replaceFinalCandidateWithConverge(family, nextOptions);
  return decorateFamily(baseFamily, nextOptions);
}

function replayCandidateFamily(family, options = {}) {
  const toastFeelId = family.toastFeel?.id || options.toastFeelId;
  const replayed = generateCandidateSet({
    ...options,
    toastFeelId,
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
  FRACTION,
  MADD_CLOWN_POLICY,
  TEMPORAL_ORDER,
  TOAST_FEEL_PRESSURE_POLICY,
  applyToastFeelPressure,
  feelEvidence,
  generateCandidateSet,
  generateStompCandidateSet,
  pressureNumber,
  replaceFinalCandidateWithConverge,
  replayCandidateFamily,
  resolvePressuredTimeline,
};
