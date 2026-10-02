const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");
const primitiveGeneration = require("./primitive-field-generation.cjs");
const toastGeneration = require("./toast-feel-generation.cjs");
const {
  LISTENING_EYE_POLICY,
  buildListeningEye,
} = require("./listening-eye.cjs");

const LISTENING_EYE_RENDER_POLICY = "listening-eye-score-pressure-v0";
const LISTENING_EYE_FAMILY_SCHEMA = "haunted-toaster/listening-eye-family/v0";
const TEMPORAL_ORDER = Object.freeze(["frozen", "section", "phrase", "transient"]);
const FRACTION = Object.freeze({
  amplitude: 0.08,
  variance: 0.10,
  imperfection: 0.10,
  camera: 0.10,
});

const LENS_AXIS_BIAS = deepFreeze({
  landscape: {
    amplitude: -0.30,
    variance: -0.18,
    imperfection: 0.05,
    camera: -0.28,
    temporal: -0.24,
  },
  architecture: {
    amplitude: -0.38,
    variance: -0.28,
    imperfection: -0.12,
    camera: -0.36,
    temporal: -0.16,
  },
  organism: {
    amplitude: 0.22,
    variance: 0.36,
    imperfection: 0.24,
    camera: 0.06,
    temporal: 0.22,
  },
  sigil: {
    amplitude: -0.08,
    variance: 0.18,
    imperfection: 0.28,
    camera: -0.16,
    temporal: 0.38,
  },
  weather: {
    amplitude: 0.34,
    variance: 0.52,
    imperfection: 0.52,
    camera: 0.26,
    temporal: 0.52,
  },
  "dimensional-space": {
    amplitude: 0.12,
    variance: 0.28,
    imperfection: -0.16,
    camera: 0.52,
    temporal: 0.12,
  },
});

function pressureNumber(current, range, pressure, fraction) {
  const span = Number(range.max) - Number(range.min);
  return quantizeNumber(Math.min(
    Number(range.max),
    Math.max(Number(range.min), Number(current) + span * Number(pressure) * fraction),
  ));
}

function pressureTemporal(current, constraints, pressure) {
  if (Math.abs(Number(pressure)) < 0.24) return current;
  const legal = TEMPORAL_ORDER.filter((value) => constraints.temporalDensity.allowed.includes(value));
  const currentIndex = legal.indexOf(current);
  if (currentIndex < 0) return current;
  const direction = Number(pressure) > 0 ? 1 : -1;
  return legal[Math.min(legal.length - 1, Math.max(0, currentIndex + direction))];
}

function scaledBias(base, signal, lens) {
  const albumTilt = 1 + 0.18 * (Number(lens.pressures.arrival) - Number(lens.pressures.foreshadow));
  const scaled = Number(base) * (0.5 + 0.5 * Number(signal)) * albumTilt;
  return Math.min(1, Math.max(-1, scaled));
}

function applyListeningEyePressure(scoreInput, constraints, lens, locks = []) {
  const bias = LENS_AXIS_BIAS[lens?.id];
  if (!bias) throw new TypeError(`Unknown Listening Eye lens: ${String(lens?.id)}.`);
  const locked = new Set((locks || []).map(String));
  const score = structuredClone(scoreInput);

  if (!locked.has("motion")) {
    score.motion.amplitude = pressureNumber(
      score.motion.amplitude,
      constraints.motion.amplitude,
      scaledBias(bias.amplitude, lens.pressures.motion, lens),
      FRACTION.amplitude,
    );
    score.motion.variance = pressureNumber(
      score.motion.variance,
      constraints.motion.variance,
      scaledBias(bias.variance, lens.pressures.density, lens),
      FRACTION.variance,
    );
  }

  if (!locked.has("material")) {
    score.material.imperfection = pressureNumber(
      score.material.imperfection,
      constraints.material.imperfection,
      scaledBias(bias.imperfection, lens.pressures.persistence, lens),
      FRACTION.imperfection,
    );
  }

  if (!locked.has("camera")) {
    score.camera.variance = pressureNumber(
      score.camera.variance,
      constraints.camera.variance,
      scaledBias(bias.camera, lens.pressures.motion, lens),
      FRACTION.camera,
    );
  }

  if (!locked.has("temporalDensity")) {
    score.temporalDensity = pressureTemporal(
      score.temporalDensity,
      constraints,
      scaledBias(bias.temporal, lens.pressures.density, lens),
    );
  }

  return deepFreeze(score);
}

function changedAxes(before, after) {
  const axes = [];
  for (const axis of ["motion", "material", "camera", "temporalDensity"]) {
    if (canonicalStringify(before[axis]) !== canonicalStringify(after[axis])) axes.push(axis);
  }
  return axes;
}

function lensHash(lens) {
  return hashCanonical(lens, "HauntedToaster-ListeningEyeLens-v0");
}

function pressureCandidate(candidate, options, listeningEye, lens) {
  const constraints = options.garmentConstraints || options.constraints;
  const locks = options.locks || [];
  const priorScore = candidate.scoreArtifact.score;
  const score = applyListeningEyePressure(priorScore, constraints, lens, locks);
  const changed = changedAxes(priorScore, score);
  const derivation = structuredClone(candidate.scoreArtifact.derivation || {});
  derivation.policy = {
    ...(derivation.policy || {}),
    listeningEye: {
      policy: LISTENING_EYE_RENDER_POLICY,
      authority: "influence-only",
      listeningEyeSha256: listeningEye.listeningEyeSha256,
      lensId: lens.id,
      lensSlotIndex: lens.slotIndex,
      lensHash: lensHash(lens),
      changedAxes: [...changed],
    },
  };
  const scoreArtifact = primitiveGeneration.artifact(score, derivation);
  const timeline = toastGeneration.resolvePressuredTimeline({
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
    listeningEyeInfluence: {
      schema: "haunted-toaster/listening-eye-influence/v0",
      policy: LISTENING_EYE_RENDER_POLICY,
      authority: "influence-only",
      listeningEyeSha256: listeningEye.listeningEyeSha256,
      lensId: lens.id,
      lensSlotIndex: lens.slotIndex,
      lensHash: lensHash(lens),
      changedAxes: [...changed],
    },
  });
}

function requestFromOptions(options = {}) {
  const request = options.listeningEye;
  if (!request || request.enabled !== true) return null;
  return deepFreeze({
    enabled: true,
    albumContext: structuredClone(request.albumContext || {}),
  });
}

function decorateFamilyWithListeningEye(baseFamily, options = {}) {
  const request = requestFromOptions(options);
  if (!request) return baseFamily;
  if (!baseFamily?.candidates?.length) {
    throw new TypeError("Listening Eye admission requires a CandidateFamily.");
  }
  if (baseFamily.candidates.length !== 6) {
    throw new TypeError("Listening Eye v0 requires exactly six candidate slots.");
  }

  const listeningEye = buildListeningEye({
    analysis: options.analysis,
    rootSeed: options.rootSeed,
    albumContext: request.albumContext,
  });
  const candidates = baseFamily.candidates.map((candidate, index) =>
    pressureCandidate(candidate, options, listeningEye, listeningEye.lenses[index]));

  const candidateLenses = candidates.map((candidate) => ({
    slotIndex: candidate.index,
    lensId: candidate.listeningEyeInfluence.lensId,
    lensHash: candidate.listeningEyeInfluence.lensHash,
    changedAxes: [...candidate.listeningEyeInfluence.changedAxes],
  }));

  const familyEvidenceCore = {
    schema: LISTENING_EYE_FAMILY_SCHEMA,
    policy: LISTENING_EYE_RENDER_POLICY,
    sourcePolicy: LISTENING_EYE_POLICY,
    authority: "influence-only",
    listeningEyeSha256: listeningEye.listeningEyeSha256,
    analysisHash: listeningEye.analysisHash,
    album: listeningEye.album,
    summary: listeningEye.summary,
    candidateLenses,
    request,
  };
  const familyEvidence = deepFreeze({
    ...familyEvidenceCore,
    familyEvidenceSha256: hashCanonical(
      familyEvidenceCore,
      "HauntedToaster-ListeningEyeFamily-v0",
    ),
  });

  const {
    familyHash: _familyHash,
    candidates: _candidates,
    scoreAddresses: _scoreAddresses,
    timelineHashes: _timelineHashes,
    listeningEye: _listeningEye,
    ...stableCore
  } = baseFamily;
  const familyCore = {
    ...structuredClone(stableCore),
    scoreAddresses: candidates.map((candidate) => candidate.scoreAddress),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    listeningEye: familyEvidence,
  };
  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCandidateSet(options = {}) {
  return decorateFamilyWithListeningEye(
    toastGeneration.generateCandidateSet(options),
    options,
  );
}

function generateStompCandidateSet(options = {}) {
  return decorateFamilyWithListeningEye(
    toastGeneration.generateStompCandidateSet(options),
    options,
  );
}

function replaceFinalCandidateWithConverge(family, options = {}) {
  const nextOptions = {
    ...options,
    listeningEye: options.listeningEye || family?.listeningEye?.request || null,
  };
  return decorateFamilyWithListeningEye(
    toastGeneration.replaceFinalCandidateWithConverge(family, nextOptions),
    nextOptions,
  );
}

function replayCandidateFamily(family, options = {}) {
  const listeningEye = options.listeningEye || family?.listeningEye?.request || null;
  const replayed = generateCandidateSet({
    ...options,
    listeningEye,
    toastFeelId: options.toastFeelId || family.toastFeel?.id,
    locks: family.locks,
    rootSeed: family.rootSeed,
    count: family.requestedCount,
    phase: family.phase,
  });
  const addressesMatch =
    canonicalStringify(replayed.scoreAddresses) === canonicalStringify(family.scoreAddresses);
  const timelinesMatch =
    canonicalStringify(replayed.timelineHashes) === canonicalStringify(family.timelineHashes);
  const familyHashMatches = replayed.familyHash === family.familyHash;
  return deepFreeze({
    schema: "haunted-toaster/listening-eye-family-replay/v0",
    ok: addressesMatch && timelinesMatch && familyHashMatches,
    addressesMatch,
    timelinesMatch,
    familyHashMatches,
    expectedFamilyHash: family.familyHash,
    actualFamilyHash: replayed.familyHash,
    replayed,
  });
}

module.exports = {
  FRACTION,
  LENS_AXIS_BIAS,
  LISTENING_EYE_FAMILY_SCHEMA,
  LISTENING_EYE_RENDER_POLICY,
  TEMPORAL_ORDER,
  applyListeningEyePressure,
  decorateFamilyWithListeningEye,
  generateCandidateSet,
  generateStompCandidateSet,
  replaceFinalCandidateWithConverge,
  replayCandidateFamily,
};
