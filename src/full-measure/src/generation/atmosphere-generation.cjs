const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const legacySchema = require("./schema.cjs");
const legacyOperations = require("./operations.cjs");
const legacyResolver = require("./resolver.cjs");
const legacyCandidates = require("./candidate-family.cjs");
const currentCandidates = require("./visible-diversity-engine.cjs");
const legacyConverge = require("./converge-frontier.cjs");
const {
  ATMOSPHERES,
  hasAtmosphere,
  parseVisualScore,
  scoreWithinConstraints,
  stripAtmosphere,
} = require("./atmosphere-score.cjs");

const ATMOSPHERE_POLICY = "atmosphere-coverage-v1";
const LOCKABLE_AXES = Object.freeze([
  ...legacyCandidates.LOCKABLE_AXES,
  "atmosphere",
]);

function assertScore(input, constraints = null) {
  const source = input && input.score ? input.score : input;
  const result = parseVisualScore(source);
  if (!result.ok) {
    throw new TypeError(result.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  if (constraints) {
    const bounded = scoreWithinConstraints(result.value, constraints);
    if (!bounded.ok) {
      throw new TypeError(bounded.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
    }
  }
  return result.value;
}

function normalizeLocks(locks, hasParent) {
  const normalized = [...new Set((locks || []).map(String))].sort();
  for (const lock of normalized) {
    if (!LOCKABLE_AXES.includes(lock)) {
      throw new TypeError(`Unknown candidate lock: ${lock}`);
    }
  }
  if (normalized.length && !hasParent) {
    throw new TypeError("Candidate locks require parentScore.");
  }
  return normalized;
}

function atmosphereOf(score) {
  return hasAtmosphere(score) ? score.atmosphere : "none";
}

function artifact(score, derivation = null) {
  const validated = assertScore(score);
  const address = legacySchema.addressVisualScore(validated);
  return deepFreeze({
    schema: "haunted-toaster/score-artifact/v1",
    address,
    canonicalJson: canonicalStringify(validated),
    score: validated,
    derivation,
  });
}

function createVisualScore({ seed, constraints, overrides = {} }) {
  if (!Object.hasOwn(overrides, "atmosphere")) {
    return legacyOperations.createVisualScore({ seed, constraints, overrides });
  }

  const coreOverrides = { ...overrides };
  const atmosphere = coreOverrides.atmosphere;
  delete coreOverrides.atmosphere;
  if (!ATMOSPHERES.includes(atmosphere)) {
    throw new TypeError(`Unknown atmosphere: ${String(atmosphere)}.`);
  }
  const base = legacyOperations.createVisualScore({
    seed,
    constraints,
    overrides: coreOverrides,
  });
  return artifact(
    { ...base.score, atmosphere },
    {
      ...structuredClone(base.derivation),
      policy: {
        ...structuredClone(base.derivation?.policy || {}),
        atmosphere,
        atmospherePolicy: ATMOSPHERE_POLICY,
      },
    },
  );
}

function resolve(analysisInput, scoreInput, constraintsInput, profileInput) {
  const score = assertScore(scoreInput, constraintsInput);
  if (!hasAtmosphere(score)) {
    return legacyResolver.resolve(analysisInput, scoreInput, constraintsInput, profileInput);
  }

  const coreTimeline = legacyResolver.resolve(
    analysisInput,
    stripAtmosphere(score),
    constraintsInput,
    profileInput,
  );
  const initialState = {
    ...structuredClone(coreTimeline.baseState),
    atmosphere: score.atmosphere,
  };
  let state = structuredClone(initialState);
  const patches = coreTimeline.patches.map((legacyPatch) => {
    const patch = {
      ...structuredClone(legacyPatch),
      priorStateHash: hashCanonical(state, "HauntedToaster-ResolvedState-v1"),
    };
    state = legacyResolver.applyPatch(state, patch);
    return patch;
  });
  const body = {
    schema: coreTimeline.schema,
    scoreAddress: legacySchema.addressVisualScore(score),
    analysisHash: coreTimeline.analysisHash,
    constraintsHash: coreTimeline.constraintsHash,
    rendererProfileHash: coreTimeline.rendererProfileHash,
    ...(coreTimeline.rendererPolicy
      ? { rendererPolicy: coreTimeline.rendererPolicy }
      : {}),
    timebase: coreTimeline.timebase,
    durationTicks: coreTimeline.durationTicks,
    baseState: initialState,
    patches,
    accounting: structuredClone(coreTimeline.accounting),
  };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

function coverageOrder(rootSeed, anchor) {
  const digest = hashCanonical(
    { anchor: String(anchor || ""), rootSeed: String(rootSeed) },
    "HauntedToaster-AtmosphereCoverageOrder-v1",
  );
  const offset = Number.parseInt(digest.slice(0, 8), 16) % ATMOSPHERES.length;
  return [
    ...ATMOSPHERES.slice(offset),
    ...ATMOSPHERES.slice(0, offset),
  ];
}

function atmosphereForCandidate({
  index,
  rootSeed,
  anchor,
  parentAtmosphere,
  locked,
}) {
  if (locked) return parentAtmosphere;
  const order = coverageOrder(rootSeed, anchor);
  if (parentAtmosphere !== null) {
    if (index === 0) return parentAtmosphere;
    const alternatives = order.filter((kind) => kind !== parentAtmosphere);
    return alternatives[(index - 1) % alternatives.length];
  }
  return order[index % order.length];
}

function extendDerivation(
  derivation,
  atmosphere,
  locked,
  parentScoreRef = null,
) {
  const next = structuredClone(derivation || {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "candidate-family",
    parentScoreRefs: [],
    policy: {},
  });
  if (parentScoreRef) {
    next.parentScoreRefs = [parentScoreRef];
  }
  next.policy = {
    ...(next.policy || {}),
    ...(parentScoreRef
      ? { parentScoreRef, baselineScoreRef: parentScoreRef }
      : {}),
    atmosphere,
    atmosphereLocked: Boolean(locked),
    atmospherePolicy: ATMOSPHERE_POLICY,
  };
  return next;
}

function transformCandidate({
  candidate,
  analysis,
  constraints,
  rendererProfile,
  atmosphere,
  baselineAtmosphere,
  atmosphereLocked,
  parentScoreRef = null,
}) {
  const scoreArtifact = artifact(
    { ...candidate.scoreArtifact.score, atmosphere },
    extendDerivation(
      candidate.scoreArtifact.derivation,
      atmosphere,
      atmosphereLocked,
      parentScoreRef,
    ),
  );
  const timeline = resolve(
    analysis,
    scoreArtifact.score,
    constraints,
    rendererProfile,
  );
  const changedAxes = [...(candidate.changedAxes || [])];
  if (atmosphere !== baselineAtmosphere && !changedAxes.includes("atmosphere")) {
    changedAxes.push("atmosphere");
  }
  return deepFreeze({
    ...candidate,
    scoreAddress: scoreArtifact.address,
    scoreArtifact,
    changedAxes,
    timeline,
    timelineHash: timeline.timelineHash,
  });
}

function rebuildFamily(baseFamily, {
  candidates,
  locks,
  parentScoreRef,
  baselineScoreRef,
  converge = undefined,
}) {
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    scoreAddresses: _scoreAddresses,
    timelineHashes: _timelineHashes,
    locks: _locks,
    parentScoreRef: _parentScoreRef,
    baselineScoreRef: _baselineScoreRef,
    analysisHash: _analysisHash,
    constraintsHash: _constraintsHash,
    rendererProfileHash: _rendererProfileHash,
    converge: baseConverge,
    ...stableBase
  } = baseFamily;
  const familyCore = {
    ...stableBase,
    parentScoreRef,
    baselineScoreRef,
    analysisHash: candidates[0].timeline.analysisHash,
    constraintsHash: candidates[0].timeline.constraintsHash,
    rendererProfileHash: candidates[0].timeline.rendererProfileHash,
    locks,
    scoreAddresses: candidates.map((candidate) => candidate.scoreAddress),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    ...(converge === undefined && baseConverge === undefined
      ? {}
      : { converge: converge ?? baseConverge }),
  };
  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCandidateSet({
  analysis,
  garmentConstraints,
  constraints: constraintsAlias,
  rendererProfile,
  parentScore = null,
  locks = [],
  rootSeed,
  count = 6,
  phase,
}) {
  const constraints = garmentConstraints || constraintsAlias;
  const parent = parentScore ? assertScore(parentScore, constraints) : null;
  const normalizedLocks = normalizeLocks(locks, Boolean(parent));
  const baseLocks = normalizedLocks.filter((axis) => axis !== "atmosphere");
  const parentCore = parent ? stripAtmosphere(parent) : null;
  const baseFamily = currentCandidates.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile,
    parentScore: parentCore,
    locks: baseLocks,
    rootSeed,
    count,
    phase,
  });
  const parentAtmosphere = parent ? atmosphereOf(parent) : null;
  const baselineAtmosphere = parentAtmosphere ?? "none";
  const atmosphereLocked = normalizedLocks.includes("atmosphere");
  const fullParentScoreRef = parent
    ? legacySchema.addressVisualScore(parent)
    : null;
  const anchor = fullParentScoreRef || baseFamily.baselineScoreRef;
  const candidates = baseFamily.candidates.map((candidate, index) =>
    transformCandidate({
      candidate,
      analysis,
      constraints,
      rendererProfile,
      atmosphere: atmosphereForCandidate({
        index,
        rootSeed,
        anchor,
        parentAtmosphere,
        locked: atmosphereLocked,
      }),
      baselineAtmosphere,
      atmosphereLocked,
      parentScoreRef: fullParentScoreRef,
    }),
  );

  return rebuildFamily(baseFamily, {
    candidates,
    locks: normalizedLocks,
    parentScoreRef: fullParentScoreRef,
    baselineScoreRef: fullParentScoreRef || baseFamily.baselineScoreRef,
  });
}

function replayCandidateFamily(family, {
  analysis,
  garmentConstraints,
  constraints: constraintsAlias,
  rendererProfile,
  parentScore = null,
} = {}) {
  if (!family || family.schema !== legacyCandidates.CANDIDATE_FAMILY_SCHEMA) {
    throw new TypeError(`Expected ${legacyCandidates.CANDIDATE_FAMILY_SCHEMA}.`);
  }
  const replayed = generateCandidateSet({
    analysis,
    garmentConstraints: garmentConstraints || constraintsAlias,
    rendererProfile,
    parentScore,
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

function computeCoverageFrontier(options = {}) {
  return legacyConverge.computeCoverageFrontier({
    ...options,
    history: (options.history || []).map((score) => stripAtmosphere(score)),
    parentScore: stripAtmosphere(options.parentScore),
    locks: (options.locks || []).filter((axis) => axis !== "atmosphere"),
  });
}

function replaceFinalCandidateWithConverge(family, options = {}) {
  const constraints = options.constraints;
  const parent = assertScore(options.parentScore, constraints);
  const normalizedLocks = normalizeLocks(options.locks || [], true);
  const baseResult = legacyConverge.replaceFinalCandidateWithConverge(family, {
    ...options,
    history: (options.history || []).map((score) => stripAtmosphere(score)),
    parentScore: stripAtmosphere(parent),
    locks: normalizedLocks.filter((axis) => axis !== "atmosphere"),
  });
  const slotIndex = Math.min(5, baseResult.candidates.length - 1);
  const baselineAtmosphere = atmosphereOf(parent);
  const transformed = transformCandidate({
    candidate: baseResult.candidates[slotIndex],
    analysis: options.analysis,
    constraints,
    rendererProfile: options.rendererProfile,
    atmosphere: baselineAtmosphere,
    baselineAtmosphere,
    atmosphereLocked: normalizedLocks.includes("atmosphere"),
    parentScoreRef: legacySchema.addressVisualScore(parent),
  });
  const frontierEvidence = transformed.frontierEvidence
    ? deepFreeze({
        ...structuredClone(transformed.frontierEvidence),
        locks: normalizedLocks,
      })
    : null;
  const convergeCandidate = deepFreeze({
    ...transformed,
    ...(frontierEvidence ? { frontierEvidence } : {}),
  });
  const candidates = family.candidates.map((candidate, index) =>
    index === slotIndex ? convergeCandidate : candidate,
  );

  return rebuildFamily({
    ...baseResult,
    ...(family.distancePolicy ? { distancePolicy: family.distancePolicy } : {}),
    ...(family.phase ? { phase: family.phase } : {}),
  }, {
    candidates,
    locks: normalizedLocks,
    parentScoreRef: legacySchema.addressVisualScore(parent),
    baselineScoreRef: family.baselineScoreRef,
    converge: baseResult.converge,
  });
}

module.exports = {
  ATMOSPHERE_POLICY,
  LOCKABLE_AXES,
  artifact,
  computeCoverageFrontier,
  createVisualScore,
  generateCandidateSet,
  replaceFinalCandidateWithConverge,
  replayCandidateFamily,
  resolve,
};
