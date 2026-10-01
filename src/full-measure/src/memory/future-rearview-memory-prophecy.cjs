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
      prophecy: 'imagined-non-authoritative',
      mutationPrism: 'proposal-seed-only',
      resolvedTimeline: 'unchanged-authority',
    },
  };
  return deepFreeze({
    ...core,
    contextSha256: hashCanonical(core, 'HauntedToaster-FutureRearviewTrackContext-v1'),
  });
}

function normalizeOutcome(state, outcome = {}) {
  const currentTrack = state.tracks[state.cursor];
  const trackId = assertNonEmptyString(outcome.trackId, 'outcome.trackId');
  if (trackId !== currentTrack.trackId) {
    throw new TypeError(`Outcome track ${trackId} does not match current track ${currentTrack.trackId}.`);
  }
  if (outcome.accepted !== true) {
    throw new TypeError('Future Rearview v1 advances only from accepted practical render outcomes.');
  }
  const acceptedRenderReceiptSha256 = assertNonEmptyString(
    outcome.acceptedRenderReceiptSha256,
    'outcome.acceptedRenderReceiptSha256',
  );
  if (!/^[a-f0-9]{64}$/i.test(acceptedRenderReceiptSha256)) {
    throw new TypeError('outcome.acceptedRenderReceiptSha256 must be a 64-character sha256 hex string.');
  }
  const observedAxes = [...new Set((outcome.observedAxes || []).map(String))].sort();
  for (const axis of observedAxes) {
    if (!AXIS_TO_APERTURE[axis]) throw new TypeError(`Unsupported observed axis: ${axis}.`);
  }
  const featureTokens = [...new Set((outcome.featureTokens || []).map(String).filter(Boolean))].sort();
  const core = {
    schema: 'haunted-toaster/future-rearview-outcome/v1',
    trackIndex: state.cursor,
    trackId,
    accepted: true,
    acceptedRenderReceiptSha256: acceptedRenderReceiptSha256.toLowerCase(),
    familyHash: outcome.familyHash ? String(outcome.familyHash) : null,
    selectedScoreAddress: outcome.selectedScoreAddress ? String(outcome.selectedScoreAddress) : null,
    observedAxes,
    featureTokens,
  };
  return deepFreeze({
    ...core,
    outcomeSha256: hashCanonical(core, 'HauntedToaster-FutureRearviewOutcome-v1'),
  });
}

function deriveLearning(prophecy, outcome) {
  const observedApertures = [...new Set(
    outcome.observedAxes.map((axis) => AXIS_TO_APERTURE[axis]).filter(Boolean),
  )].sort();
  const predicted = [...prophecy.focusApertures].sort();
  const confirmedFocusApertures = predicted.filter((aperture) => observedApertures.includes(aperture));
  const surpriseApertures = observedApertures.filter((aperture) => !predicted.includes(aperture));
  const unfulfilledFocusApertures = predicted.filter((aperture) => !observedApertures.includes(aperture));
  const core = {
    schema: LEARNING_SCHEMA,
    policy: FUTURE_REARVIEW_POLICY,
    trackIndex: outcome.trackIndex,
    trackId: outcome.trackId,
    sourceProphecySha256: prophecy.prophecySha256,
    sourceOutcomeSha256: outcome.outcomeSha256,
    sourceReceiptSha256: outcome.acceptedRenderReceiptSha256,
    observedApertures,
    confirmedFocusApertures,
    surpriseApertures,
    unfulfilledFocusApertures,
    authority: 'derived-from-accepted-receipt',
  };
  return deepFreeze({
    ...core,
    learningSha256: hashCanonical(core, 'HauntedToaster-FutureRearviewLearning-v1'),
  });
}

function advanceFutureRearviewMemoryProphecy(state, outcomeInput) {
  if (!state || state.schema !== FUTURE_REARVIEW_SCHEMA) {
    throw new TypeError(`Expected ${FUTURE_REARVIEW_SCHEMA}.`);
  }
  if (state.complete) throw new Error('Future Rearview batch is already complete.');
  const prophecy = state.horizon.find((entry) => entry.trackIndex === state.cursor);
  if (!prophecy) throw new Error('Current track has no prophecy entry.');
  const outcome = normalizeOutcome(state, outcomeInput);
  const learning = deriveLearning(prophecy, outcome);
  const history = [...state.history, deepFreeze({
    trackIndex: state.cursor,
    trackId: outcome.trackId,
    prophecyAtExecution: prophecy,
    outcome,
    learning,
  })];
  return finalizeState({
    batchIdentitySha256: state.batchIdentitySha256,
    albumGenome: state.albumGenome,
    tracks: state.tracks,
    cursor: state.cursor + 1,
    history,
  });
}

function prepareGenerationForCurrentTrack({ state, baseOptions = {} } = {}) {
  const context = contextForCurrentTrack(state);
  const baseRootSeed = assertNonEmptyString(baseOptions.rootSeed, 'baseOptions.rootSeed');
  const derivedRootSeed = hashCanonical({
    baseRootSeed,
    batchIdentitySha256: state.batchIdentitySha256,
    contextSha256: context.contextSha256,
    mutationPrismSha256: context.mutationPrism.mutationPrismSha256,
  }, 'HauntedToaster-FutureRearviewGenerationSeed-v1');
  const generationOptions = {
    ...structuredClone(baseOptions),
    rootSeed: derivedRootSeed,
  };
  const evidenceCore = {
    schema: GENERATION_BRIDGE_SCHEMA,
    policy: FUTURE_REARVIEW_POLICY,
    trackIndex: state.cursor,
    trackId: state.tracks[state.cursor].trackId,
    batchIdentitySha256: state.batchIdentitySha256,
    contextSha256: context.contextSha256,
    mutationPrismSha256: context.mutationPrism.mutationPrismSha256,
    baseRootSeed,
    derivedRootSeed,
    memoryPrismPreserved: Object.prototype.hasOwnProperty.call(baseOptions, 'memoryPrism'),
    authority: 'generation-seed-only',
  };
  return deepFreeze({
    generationOptions,
    evidence: {
      ...evidenceCore,
      evidenceSha256: hashCanonical(evidenceCore, 'HauntedToaster-FutureRearviewGenerationBridge-v1'),
    },
  });
}

function closeFutureRearviewLoop(state) {
  if (!state || state.schema !== FUTURE_REARVIEW_SCHEMA) {
    throw new TypeError(`Expected ${FUTURE_REARVIEW_SCHEMA}.`);
  }
  if (!state.complete) throw new Error('Future Rearview batch cannot close before every track has an accepted outcome.');

  const totals = state.history.reduce((acc, entry) => {
    acc.confirmed += entry.learning.confirmedFocusApertures.length;
    acc.surprises += entry.learning.surpriseApertures.length;
    acc.unfulfilled += entry.learning.unfulfilledFocusApertures.length;
    return acc;
  }, { confirmed: 0, surprises: 0, unfulfilled: 0 });

  const revisitInvitations = [];
  for (let earlierIndex = 0; earlierIndex < state.history.length; earlierIndex += 1) {
    const earlier = state.history[earlierIndex];
    for (const aperture of earlier.learning.unfulfilledFocusApertures) {
      const later = state.history.slice(earlierIndex + 1)
        .find((entry) => entry.learning.observedApertures.includes(aperture));
      if (!later) continue;
      revisitInvitations.push({
        earlierTrackIndex: earlier.trackIndex,
        earlierTrackId: earlier.trackId,
        laterTrackIndex: later.trackIndex,
        laterTrackId: later.trackId,
        aperture,
        reason: 'later-observation-resolves-earlier-unfulfilled-prophecy',
        authority: 'invitation-only',
      });
      if (revisitInvitations.length >= 12) break;
    }
    if (revisitInvitations.length >= 12) break;
  }

  const core = {
    schema: RETROSPECTIVE_SCHEMA,
    policy: FUTURE_REARVIEW_POLICY,
    batchIdentitySha256: state.batchIdentitySha256,
    finalStateSha256: state.stateSha256,
    trackCount: state.tracks.length,
    prophecyComparison: totals,
    revisitInvitations,
    authorityLaw: {
      retrospective: 'comparison-only',
      revisitInvitation: 'never-automatic-retoast',
      pastReceipt: 'immutable',
    },
  };
  return deepFreeze({
    ...core,
    retrospectiveSha256: hashCanonical(core, 'HauntedToaster-FutureRearviewRetrospective-v1'),
  });
}

module.exports = {
  AXIS_TO_APERTURE,
  FUTURE_REARVIEW_POLICY,
  FUTURE_REARVIEW_SCHEMA,
  GENERATION_BRIDGE_SCHEMA,
  LEARNING_SCHEMA,
  MUTATION_PRISM_SCHEMA,
  PROPHECY_SCHEMA,
  RETROSPECTIVE_SCHEMA,
  TRACK_CONTEXT_SCHEMA,
  advanceFutureRearviewMemoryProphecy,
  closeFutureRearviewLoop,
  contextForCurrentTrack,
  createFutureRearviewMemoryProphecy,
  prepareGenerationForCurrentTrack,
};
