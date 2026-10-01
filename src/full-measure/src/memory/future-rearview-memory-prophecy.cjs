const {
  deepFreeze,
  hashCanonical,
} = require('../generation/canonical.cjs');
const {
  MEMORY_PRISM_APERTURES,
  summarizeCurrentSongEvidence,
} = require('./memory-capsule.cjs');

const FUTURE_REARVIEW_SCHEMA = 'haunted-toaster/future-rearview-memory-prophecy/v1';
const FUTURE_REARVIEW_POLICY = 'future-rearview-memory-prophecy-v1';
const TRACK_CONTEXT_SCHEMA = 'haunted-toaster/future-rearview-track-context/v1';
const PROPHECY_SCHEMA = 'haunted-toaster/future-rearview-prophecy/v1';
const LEARNING_SCHEMA = 'haunted-toaster/future-rearview-learning/v1';
const MUTATION_PRISM_SCHEMA = 'haunted-toaster/future-rearview-mutation-prism/v1';
const RETROSPECTIVE_SCHEMA = 'haunted-toaster/future-rearview-retrospective/v1';
const GENERATION_BRIDGE_SCHEMA = 'haunted-toaster/future-rearview-generation-bridge/v1';

const MIDDLE_ROLES = Object.freeze(['DEEPEN', 'RUPTURE', 'RECOMBINE', 'RETURN']);
const APERTURE_NAMES = Object.freeze(MEMORY_PRISM_APERTURES.map((entry) => entry.aperture));
const AXIS_TO_APERTURE = Object.freeze({
  topology: 'BODY',
  motion: 'BEHAVIOR',
  material: 'SKIN',
  palette: 'COLOR',
  camera: 'EYE',
  temporalDensity: 'TIME',
});

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function stableIndex(hash, size, offset = 0) {
  if (!Number.isInteger(size) || size <= 0) throw new TypeError('stableIndex requires a positive size.');
  const start = Math.max(0, Number(offset) || 0) % Math.max(1, hash.length - 7);
  const slice = hash.slice(start, start + 8).padEnd(8, '0');
  return Number.parseInt(slice, 16) % size;
}

function normalizeSixUpSeed(sixUpSeed = {}) {
  const familyHash = assertNonEmptyString(sixUpSeed.familyHash, 'sixUpSeed.familyHash');
  if (!Array.isArray(sixUpSeed.scoreAddresses) || sixUpSeed.scoreAddresses.length !== 6) {
    throw new TypeError('sixUpSeed.scoreAddresses must contain exactly six score addresses.');
  }
  const scoreAddresses = sixUpSeed.scoreAddresses.map((value, index) =>
    assertNonEmptyString(value, `sixUpSeed.scoreAddresses[${index}]`));
  return deepFreeze({
    schema: 'haunted-toaster/album-six-up-genome/v1',
    familyHash,
    scoreAddresses,
    genomeSha256: hashCanonical({ familyHash, scoreAddresses }, 'HauntedToaster-AlbumSixUpGenome-v1'),
  });
}

function normalizeTrack(track = {}, index) {
  const trackId = assertNonEmptyString(track.trackId, `tracks[${index}].trackId`);
  let evidence;
  if (track.songEvidence?.evidenceHash && track.songEvidence?.energyClass) {
    evidence = {
      evidenceHash: assertNonEmptyString(track.songEvidence.evidenceHash, `tracks[${index}].songEvidence.evidenceHash`),
      energyClass: assertNonEmptyString(track.songEvidence.energyClass, `tracks[${index}].songEvidence.energyClass`),
    };
  } else {
    evidence = summarizeCurrentSongEvidence(track.mediaAnalysis || {});
  }
  return deepFreeze({
    trackIndex: index,
    trackId,
    songEvidenceHash: evidence.evidenceHash,
    energyClass: evidence.energyClass,
  });
}

function normalizeTracks(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new TypeError('Future Rearview Memory Prophecy requires at least one ordered track.');
  }
  const normalized = tracks.map(normalizeTrack);
  const ids = normalized.map((track) => track.trackId);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError('Future Rearview track ids must be unique within the batch.');
  }
  return deepFreeze(normalized);
}

function historySha256(history = []) {
  return hashCanonical(
    history.map((entry) => ({
      trackIndex: entry.trackIndex,
      trackId: entry.trackId,
      prophecySha256: entry.prophecyAtExecution.prophecySha256,
      outcomeSha256: entry.outcome.outcomeSha256,
      learningSha256: entry.learning.learningSha256,
    })),
    'HauntedToaster-FutureRearviewHistory-v1',
  );
}

function recentLearningBias(history = []) {
  const ordered = [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const learning = history[index]?.learning;
    for (const aperture of learning?.surpriseApertures || []) {
      if (!ordered.includes(aperture)) ordered.push(aperture);
    }
    for (const aperture of learning?.confirmedFocusApertures || []) {
      if (!ordered.includes(aperture)) ordered.push(aperture);
    }
  }
  return ordered;
}

function roleForTrack({ track, trackIndex, trackCount, genomeSha256, priorHistorySha256 }) {
  if (trackIndex === 0) return 'OPEN';
  if (trackIndex === trackCount - 1) return 'CLOSE';
  const hash = hashCanonical({
    trackId: track.trackId,
    trackIndex,
    trackCount,
    songEvidenceHash: track.songEvidenceHash,
    genomeSha256,
    priorHistorySha256,
  }, 'HauntedToaster-FutureRearviewRole-v1');
  return MIDDLE_ROLES[stableIndex(hash, MIDDLE_ROLES.length)];
}

function focusForTrack({ track, trackIndex, genomeSha256, priorHistorySha256, history }) {
  const chosen = [];
  const bias = recentLearningBias(history);
  if (bias.length) chosen.push(bias[trackIndex % bias.length]);

  const hash = hashCanonical({
    trackId: track.trackId,
    trackIndex,
    songEvidenceHash: track.songEvidenceHash,
    genomeSha256,
    priorHistorySha256,
  }, 'HauntedToaster-FutureRearviewFocus-v1');

  for (let offset = 0; chosen.length < 2 && offset < APERTURE_NAMES.length * 2; offset += 1) {
    const aperture = APERTURE_NAMES[stableIndex(hash, APERTURE_NAMES.length, offset * 5)];
    if (!chosen.includes(aperture)) chosen.push(aperture);
  }
  return chosen.slice(0, 2).sort();
}

function prophecyForTrack({ track, trackIndex, trackCount, albumGenome, history }) {
  const priorHistorySha256 = historySha256(history);
  const core = {
    schema: PROPHECY_SCHEMA,
    policy: FUTURE_REARVIEW_POLICY,
    trackIndex,
    trackId: track.trackId,
    role: roleForTrack({
      track,
      trackIndex,
      trackCount,
      genomeSha256: a