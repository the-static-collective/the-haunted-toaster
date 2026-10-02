const {
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");

const LISTENING_EYE_SELECTION_POLICY = "listening-eye-candidate-selection-v0";
const LISTENING_EYE_FAMILY_SCHEMA = "haunted-toaster/listening-eye-family/v0";
const TEMPORAL_ORDER = Object.freeze(["frozen", "section", "phrase", "transient"]);

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

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function normalizeNumber(value, range) {
  const min = Number(range?.min);
  const max = Number(range?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0.5;
  return clamp01((Number(value) - min) / (max - min));
}

function normalizeTemporal(value, constraints) {
  const legal = TEMPORAL_ORDER.filter((item) =>
    constraints?.temporalDensity?.allowed?.includes(item));
  const index = legal.indexOf(value);
  if (index < 0 || legal.length <= 1) return 0.5;
  return index / (legal.length - 1);
}

function target(base, signal, lens) {
  const albumTilt =
    0.16 * (Number(lens.pressures.arrival) - Number(lens.pressures.foreshadow));
  return clamp01(0.5 + Number(base) * (0.28 + Number(signal) * 0.18) + albumTilt);
}

function candidateVector(candidate, constraints) {
  const score = candidate?.scoreArtifact?.score;
  if (!score) throw new TypeError("Listening Eye selection requires a scored candidate.");
  return {
    amplitude: normalizeNumber(score.motion?.amplitude, constraints.motion?.amplitude),
    variance: normalizeNumber(score.motion?.variance, constraints.motion?.variance),
    imperfection: normalizeNumber(
      score.material?.imperfection,
      constraints.material?.imperfection,
    ),
    camera: normalizeNumber(score.camera?.variance, constraints.camera?.variance),
    temporal: normalizeTemporal(score.temporalDensity, constraints),
  };
}

function targetVector(lens) {
  const bias = LENS_AXIS_BIAS[lens?.id];
  if (!bias) throw new TypeError(`Unknown Listening Eye lens: ${String(lens?.id)}.`);
  return {
    amplitude: target(bias.amplitude, lens.pressures.motion, lens),
    variance: target(bias.variance, lens.pressures.density, lens),
    imperfection: target(bias.imperfection, lens.pressures.persistence, lens),
    camera: target(bias.camera, lens.pressures.motion, lens),
    temporal: target(bias.temporal, lens.pressures.density, lens),
  };
}

function candidateLensMerit(candidate, lens, constraints) {
  const actual = candidateVector(candidate, constraints);
  const desired = targetVector(lens);
  const axes = Object.keys(desired);
  const distance = axes.reduce(
    (sum, axis) => sum + Math.abs(Number(actual[axis]) - Number(desired[axis])),
    0,
  ) / axes.length;
  return quantizeNumber((1 - clamp01(distance)) * 40);
}

function lensHash(lens) {
  return hashCanonical(lens, "HauntedToaster-ListeningEyeLens-v0");
}

function annotateListeningEyeCandidate(candidate, {
  listeningEye,
  lens,
  lensMerit,
  noveltyMerit,
  sourceCandidateIndex,
} = {}) {
  return deepFreeze({
    ...candidate,
    listeningEyeInfluence: {
      schema: "haunted-toaster/listening-eye-influence/v0",
      policy: LISTENING_EYE_SELECTION_POLICY,
      authority: "influence-only",
      listeningEyeSha256: listeningEye.listeningEyeSha256,
      lensId: lens.id,
      lensSlotIndex: lens.slotIndex,
      lensHash: lensHash(lens),
      lensMerit: quantizeNumber(lensMerit),
      noveltyMerit: quantizeNumber(noveltyMerit),
      sourceCandidateIndex: Number(sourceCandidateIndex),
      mode: "selection-pressure",
      changedAxes: [],
    },
  });
}

function normalizeRequest(request) {
  if (!request || request.enabled !== true) return null;
  return deepFreeze({
    enabled: true,
    albumContext: structuredClone(request.albumContext || {}),
  });
}

function buildListeningEyeFamilyEvidence(listeningEye, candidates, request) {
  const normalizedRequest = normalizeRequest(request);
  if (!normalizedRequest) return null;
  const candidateLenses = candidates.map((candidate) => ({
    slotIndex: candidate.index,
    lensId: candidate.listeningEyeInfluence?.lensId || null,
    lensHash: candidate.listeningEyeInfluence?.lensHash || null,
    lensMerit: candidate.listeningEyeInfluence?.lensMerit ?? null,
    noveltyMerit: candidate.listeningEyeInfluence?.noveltyMerit ?? null,
    sourceCandidateIndex: candidate.listeningEyeInfluence?.sourceCandidateIndex ?? null,
    mode: candidate.listeningEyeInfluence?.mode || null,
  }));
  const core = {
    schema: LISTENING_EYE_FAMILY_SCHEMA,
    policy: LISTENING_EYE_SELECTION_POLICY,
    sourcePolicy: listeningEye.policy,
    authority: "influence-only",
    listeningEyeSha256: listeningEye.listeningEyeSha256,
    analysisHash: listeningEye.analysisHash,
    album: listeningEye.album,
    summary: listeningEye.summary,
    candidateLenses,
    request: normalizedRequest,
  };
  return deepFreeze({
    ...core,
    familyEvidenceSha256: hashCanonical(
      core,
      "HauntedToaster-ListeningEyeFamily-v0",
    ),
  });
}

module.exports = {
  LENS_AXIS_BIAS,
  LISTENING_EYE_FAMILY_SCHEMA,
  LISTENING_EYE_SELECTION_POLICY,
  TEMPORAL_ORDER,
  annotateListeningEyeCandidate,
  buildListeningEyeFamilyEvidence,
  candidateLensMerit,
  candidateVector,
  normalizeRequest,
  targetVector,
};
