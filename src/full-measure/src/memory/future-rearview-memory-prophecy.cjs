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
      genomeSha256: albumGenome.genomeSha256,
      priorHistorySha256,
    }),
    focusApertures: focusForTrack({
      track,
      trackIndex,
      genomeSha256: albumGenome.genomeSha256,
      priorHistorySha256,
      history,
    }),
    songEvidenceHash: track.songEvidenceHash,
    energyClass: track.energyClass,
    priorHistorySha256,
    authority: 'imagined-non-authoritative',
    evidenceRefs: [
      `album-genome:${albumGenome.genomeSha256}`,
      `song:${track.songEvidenceHash}`,
      `rearview-history:${priorHistorySha256}`,
    ].sort(),
  };
  return deepFreeze({
    ...core,
    prophecySha256: hashCanonical(core, 'HauntedToaster-FutureRearviewProphecy-v1'),
  });
}

function buildHorizon({ tracks, cursor, albumGenome, history }) {
  const horizon = [];
  for (let index = cursor; index < tracks.length; index += 1) {
    horizon.push(prophecyForTrack({
      track: tracks[index],
      trackIndex: index,
      trackCount: tracks.length,
      albumGenome,
      history,
    }));
  }
  return deepFreeze(horizon);
}

function finalizeState({ batchIdentitySha256, albumGenome, tracks, cursor, history }) {
  const horizon = buildHorizon({ tracks, cursor, albumGenome, history });
  const core = {
    schema: FUTURE_REARVIEW_SCHEMA,
    policy: FUTURE_REARVIEW_POLICY,
    batchIdentitySha256,
    albumGenome,
    tracks,
    cursor,
    history,
    historySha256: historySha256(history),
    horizon,
    horizonSha256: hashCanonical(horizon, 'HauntedToaster-FutureRearviewHorizon-v1'),
    complete: cursor >= tracks.length,
  };
  return deepFreeze({
    ...core,
    stateSha256: hashCanonical(core, 'HauntedToaster-FutureRearviewState-v1'),
  });
}

function createFutureRearviewMemoryProphecy({ sixUpSeed, tracks } = {}) {
  const albumGenome = normalizeSixUpSeed(sixUpSeed);
  const normalizedTracks = normalizeTracks(tracks);
  const batchIdentitySha256 = hashCanonical({
    albumGenomeSha256: albumGenome.genomeSha256,
    tracks: normalizedTracks.map((track) => ({
      trackIndex: track.trackIndex,
      trackId: track.trackId,
      songEvidenceHash: track.songEvidenceHash,
      energyClass: track.energyClass,
    })),
  }, 'HauntedToaster-FutureRearviewBatch-v1');
  return finalizeState({
    batchIdentitySha256,
    albumGenome,
    tracks: normalizedTracks,
    cursor: 0,
    history: [],
  });
}

function sourceEvidenceForSeat({ state, prophecy, aperture, scoreAddress, sourceKind }) {
  if (sourceKind === 'GENOME') {
    return [
      `album-genome:${state.albumGenome.genomeSha256}`,
      `seed-family:${state.albumGenome.familyHash}`,
      `seed-score:${scoreAddress}`,
    ].sort();
  }
  if (sourceKind === 'REARVIEW') {
    const latest = state.history.at(-1);
    if (!latest) return [`album-genome:${state.albumGenome.genomeSha256}`];
    return [
      `receipt:${latest.outcome.acceptedRenderReceiptSha256}`,
      `learning:${latest.learning.learningSha256}`,
      `rearview-history:${state.historySha256}`,
    ].sort();
  }
  return [
    `prophecy:${prophecy.prophecySha256}`,
    `future-horizon:${state.horizonSha256}`,
    `song:${prophecy.songEvidenceHash}`,
    `aperture:${aperture.aperture}`,
  ].sort();
}

function buildMutationPrism(state, prophecy) {
  const sourceCycle = state.history.length > 0
    ? ['GENOME', 'REARVIEW', 'PROPHECY']
    : ['GENOME', 'PROPHECY'];
  const seats = MEMORY_PRISM_APERTURES.map((aperture, seatIndex) => {
    const sourceKind = sourceCycle[(seatIndex + state.cursor) % sourceCycle.length];
    const scoreAddress = state.albumGenome.scoreAddresses[seatIndex];
    const evidenceRefs = sourceEvidenceForSeat({
      state,
      prophecy,
      aperture,
      scoreAddress,
      sourceKind,
    });
    const seatCore = {
      seatIndex,
      aperture: aperture.aperture,
      targetPrefix: aperture.targetPrefix,
      sourceKind,
      evidenceRefs,
      authority: 'proposal-seed-only',
    };
    return deepFreeze({
      ...seatCore,
      mutationKey: hashCanonical({
        batchIdentitySha256: state.batchIdentitySha256,
        stateSha256: state.stateSha256,
        trackIndex: state.cursor,
        seat: seatCore,
      }, 'HauntedToaster-FutureRearviewMutationSeat-v1'),
    });
  });
  const core = {
    schema: MUTATION_PRISM_SCHEMA,
    policy: FUTURE_REARVIEW_POLICY,
    batchIdentitySha256: state.batchIdentitySha256,
    stateSha256: state.stateSha256,
    trackIndex: state.cursor,
    trackId: prophecy.trackId,
    horizonSha256: state.horizonSha256,
    seats,
    authority: 'proposal-seed-only',
  };
  return deepFreeze({
    ...core,
    mutationPrismSha256: hashCanonical(core, 'HauntedToaster-FutureRearviewMutationPrism-v1'),
  });
}

function contextForCurrentTrack(state) {
  if (!state || state.schema !== FUTURE_REARVIEW_SCHEMA) {
    throw new TypeError(`Expected ${FUTURE_REARVIEW_SCHEMA}.`);
  }
  if (state.complete || state.cursor >= state.tracks.length) {
    throw new Error('Future Rearview batch is already complete.');
  }
  const prophecy = state.horizon.find((entry) => entry.trackIndex === state.cursor);
  if (!prophecy) throw new Error('Current track has no prophecy entry.');
  const mutationPrism = buildMutationPrism(state, prophecy);
  const core = {
    schema: TRACK_CONTEXT_SCHEMA,
    policy: FUTURE_REARVIEW_POLICY,
    batchIdentitySha256: state.batchIdentitySha256,
    stateSha256: state.stateSha256,
    cursor: state.cursor,
    albumGenome: state.albumGenome,
    rearview: state.history.map((entry) => ({
      trackIndex: entry.trackIndex,
      trackId: entry.trackId,
      acceptedRenderReceiptSha256: entry.outcome.acceptedRenderReceiptSha256,
      learningSha256: entry.learning.learningSha256,
    })),
    present: {
      track: state.tracks[state.cursor],
      prophecy,
    },
    forwardHorizon: state.horizon.filter((entry) => entry.trackIndex > state.cursor),
    mutationPrism,
    authorityLaw: {
      receipt: 'fact',
      learning: 'derived-from-fact',
      prophecy: 'imagined-non-authoritative'