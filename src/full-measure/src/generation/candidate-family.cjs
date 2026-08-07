const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");
const { PRNG_ID, createPrng } = require("./prng.cjs");
const {
  VISUAL_SCORE_SCHEMA,
  addressVisualScore,
  parseVisualScore,
  scoreWithinConstraints,
  validateConstraints,
} = require("./schema.cjs");
const { createVisualScore, artifact } = require("./operations.cjs");
const { resolve } = require("./resolver.cjs");

const CANDIDATE_FAMILY_SCHEMA = "haunted-toaster/candidate-family/v1";
const CANDIDATE_FAMILY_POLICY = "coverage-before-randomness-v1";
const LOCKABLE_AXES = Object.freeze([
  "topology",
  "motion",
  "palette",
  "material",
  "lyric",
  "camera",
  "temporalDensity",
]);

const SLOT_POLICIES = Object.freeze([
  Object.freeze({ role: "near-parent", axes: ["motion"], intensity: "near" }),
  Object.freeze({ role: "motion-frontier", axes: ["motion", "temporalDensity", "camera"], intensity: "frontier" }),
  Object.freeze({ role: "palette-material-frontier", axes: ["palette", "material"], intensity: "frontier" }),
  Object.freeze({ role: "topology-composition-frontier", axes: ["topology", "camera", "lyric"], intensity: "frontier" }),
  Object.freeze({ role: "cross-axis-combination", axes: ["motion", "palette", "material", "camera", "temporalDensity"], intensity: "frontier" }),
  Object.freeze({ role: "foreign-body-frontier", axes: [...LOCKABLE_AXES], intensity: "frontier" }),
]);

function assertConstraints(input) {
  const result = validateConstraints(input);
  if (!result.ok) {
    throw new TypeError(result.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  return result.value;
}

function assertScore(input, constraints) {
  const source = input && input.score ? input.score : input;
  const parsed = parseVisualScore(source);
  if (!parsed.ok) {
    throw new TypeError(parsed.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  const bounded = scoreWithinConstraints(parsed.value, constraints);
  if (!bounded.ok) {
    throw new TypeError(bounded.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  return parsed.value;
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

function deriveSeed({ rootSeed, parentScoreRef, slotIndex, attempt }) {
  const digest = hashCanonical(
    {
      attempt,
      parentScoreRef: parentScoreRef || null,
      rootSeed: String(rootSeed),
      slotIndex,
    },
    "HauntedToaster-CandidateSeed-v1",
  );
  return `ht-candidate:${digest}`;
}

function pickDifferent(prng, allowed, current) {
  const alternatives = allowed.filter((value) => value !== current);
  return alternatives.length ? prng.pick(alternatives) : current;
}

function frontierNumber(current, range, prng) {
  if (range.min === range.max) return range.min;
  const fromMin = Math.abs(current - range.min);
  const fromMax = Math.abs(range.max - current);
  if (fromMin === fromMax) return prng.nextFloat() < 0.5 ? range.min : range.max;
  return fromMin > fromMax ? range.min : range.max;
}

function nearNumber(current, range, prng) {
  if (range.min === range.max) return range.min;
  const span = range.max - range.min;
  const direction = prng.nextFloat() < 0.5 ? -1 : 1;
  const step = span * (0.035 + prng.nextFloat() * 0.035);
  return quantizeNumber(Math.min(range.max, Math.max(range.min, current + direction * step)));
}

function mutateMotion(score, constraints, prng, intensity) {
  if (intensity === "near") {
    score.motion.amplitude = nearNumber(score.motion.amplitude, constraints.motion.amplitude, prng);
    score.motion.variance = nearNumber(score.motion.variance, constraints.motion.variance, prng);
    return;
  }
  score.motion.grammar = pickDifferent(prng, constraints.motion.grammar.allowed, score.motion.grammar);
  score.motion.amplitude = frontierNumber(score.motion.amplitude, constraints.motion.amplitude, prng);
  score.motion.variance = frontierNumber(score.motion.variance, constraints.motion.variance, prng);
}

function mutatePalette(score, constraints, prng, intensity) {
  score.palette.logic = pickDifferent(prng, constraints.palette.logic.allowed, score.palette.logic);
  score.palette.bleed = intensity === "near"
    ? nearNumber(score.palette.bleed, constraints.palette.bleed, prng)
    : frontierNumber(score.palette.bleed, constraints.palette.bleed, prng);
  score.palette.contrastBias = intensity === "near"
    ? nearNumber(score.palette.contrastBias, constraints.palette.contrastBias, prng)
    : frontierNumber(score.palette.contrastBias, constraints.palette.contrastBias, prng);
}

function mutateMaterial(score, constraints, prng, intensity) {
  score.material.texture = pickDifferent(prng, constraints.material.texture.allowed, score.material.texture);
  score.material.imperfection = intensity === "near"
    ? nearNumber(score.material.imperfection, constraints.material.imperfection, prng)
    : frontierNumber(score.material.imperfection, constraints.material.imperfection, prng);
}

function mutateLyric(score, constraints, prng, intensity) {
  score.lyric.placement = pickDifferent(prng, constraints.lyric.placement.allowed, score.lyric.placement);
  score.lyric.densityBias = intensity === "near"
    ? nearNumber(score.lyric.densityBias, constraints.lyric.densityBias, prng)
    : frontierNumber(score.lyric.densityBias, constraints.lyric.densityBias, prng);
}

function mutateCamera(score, constraints, prng, intensity) {
  score.camera.grammar = pickDifferent(prng, constraints.camera.grammar.allowed, score.camera.grammar);
  score.camera.variance = intensity === "near"
    ? nearNumber(score.camera.variance, constraints.camera.variance, prng)
    : frontierNumber(score.camera.variance, constraints.camera.variance, prng);
}

function mutateAxis(score, constraints, axis, prng, intensity) {
  if (axis === "topology") {
    score.topology = pickDifferent(prng, constraints.topology.allowed, score.topology);
  } else if (axis === "motion") {
    mutateMotion(score, constraints, prng, intensity);
  } else if (axis === "palette") {
    mutatePalette(score, constraints, prng, intensity);
  } else if (axis === "material") {
    mutateMaterial(score, constraints, prng, intensity);
  } else if (axis === "lyric") {
    mutateLyric(score, constraints, prng, intensity);
  } else if (axis === "camera") {
    mutateCamera(score, constraints, prng, intensity);
  } else if (axis === "temporalDensity") {
    score.temporalDensity = pickDifferent(prng, constraints.temporalDensity.allowed, score.temporalDensity);
  }
}

function creativeState(score) {
  return {
    topology: score.topology,
    motion: score.motion,
    palette: score.palette,
    material: score.material,
    lyric: score.lyric,
    camera: score.camera,
    temporalDensity: score.temporalDensity,
  };
}

function changedAxes(left, right) {
  if (!left) return LOCKABLE_AXES.filter((axis) => Object.hasOwn(right, axis));
  return LOCKABLE_AXES.filter(
    (axis) => canonicalStringify(left[axis]) !== canonicalStringify(right[axis]),
  );
}

function makeCandidate({
  constraints,
  locks,
  parent,
  parentScoreRef,
  rootSeed,
  slotIndex,
  slot,
  attempt,
}) {
  const seed = deriveSeed({ rootSeed, parentScoreRef, slotIndex, attempt });
  const prng = createPrng(`${seed}:${slot.role}`);
  let score;

  if (parent) {
    score = structuredClone(parent);
    score.schema = VISUAL_SCORE_SCHEMA;
    score.seed = seed;
    score.prng = PRNG_ID;
  } else {
    score = structuredClone(createVisualScore({ seed, constraints }).score);
  }

  const unlockedAxes = slot.axes.filter((axis) => !locks.includes(axis));
  for (const axis of unlockedAxes) {
    mutateAxis(score, constraints, axis, prng, slot.intensity);
  }

  if (parent) {
    for (const lock of locks) score[lock] = structuredClone(parent[lock]);
  }

  const validated = assertScore(score, constraints);
  const derivation = {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "candidate-family",
    parentScoreRefs: parentScoreRef ? [parentScoreRef] : [],
    policy: {
      candidatePolicy: CANDIDATE_FAMILY_POLICY,
      rootSeed: String(rootSeed),
      derivedSeed: seed,
      slotIndex,
      role: slot.role,
      attempt,
      locks,
      intendedAxes: slot.axes,
      appliedAxes: unlockedAxes,
      prng: PRNG_ID,
      constraintPackId: constraints.id,
    },
  };
  return artifact(validated, derivation);
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
}) {
  if (rootSeed === undefined || rootSeed === null || String(rootSeed).length === 0) {
    throw new TypeError("rootSeed is required.");
  }
  if (!Number.isInteger(count) || count < 1 || count > SLOT_POLICIES.length) {
    throw new TypeError(`count must be an integer from 1 to ${SLOT_POLICIES.length}.`);
  }

  const constraints = assertConstraints(garmentConstraints || constraintsAlias);
  const parent = parentScore ? assertScore(parentScore, constraints) : null;
  const parentScoreRef = parent ? addressVisualScore(parent) : null;
  const normalizedLocks = normalizeLocks(locks, Boolean(parent));
  const candidates = [];
  const seenCreativeStates = new Set();
  const exhaustedRoles = [];

  for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
    const slot = SLOT_POLICIES[slotIndex];
    let accepted = null;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const scoreArtifact = makeCandidate({
        constraints,
        locks: normalizedLocks,
        parent,
        parentScoreRef,
        rootSeed,
        slotIndex,
        slot,
        attempt,
      });
      const key = canonicalStringify(creativeState(scoreArtifact.score));
      if (seenCreativeStates.has(key)) continue;
      accepted = scoreArtifact;
      seenCreativeStates.add(key);
      break;
    }

    if (!accepted) {
      exhaustedRoles.push(slot.role);
      continue;
    }

    const timeline = resolve(analysis, accepted.score, constraints, rendererProfile);
    candidates.push(deepFreeze({
      index: candidates.length,
      slotIndex,
      role: slot.role,
      scoreAddress: accepted.address,
      scoreArtifact: accepted,
      changedAxes: changedAxes(parent, accepted.score),
      timeline,
      timelineHash: timeline.timelineHash,
    }));
  }

  const shortfall = candidates.length < count
    ? {
        requested: count,
        produced: candidates.length,
        reason: "constraints-and-locks-exhausted-materially-distinct-creative-states",
        exhaustedRoles,
      }
    : null;

  const familyCore = {
    schema: CANDIDATE_FAMILY_SCHEMA,
    policy: CANDIDATE_FAMILY_POLICY,
    rootSeed: String(rootSeed),
    parentScoreRef,
    locks: normalizedLocks,
    requestedCount: count,
    producedCount: candidates.length,
    roles: candidates.map((candidate) => candidate.role),
    scoreAddresses: candidates.map((candidate) => candidate.scoreAddress),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    shortfall,
  };

  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function replayCandidateFamily(family, {
  analysis,
  garmentConstraints,
  constraints: constraintsAlias,
  rendererProfile,
  parentScore = null,
} = {}) {
  if (!family || family.schema !== CANDIDATE_FAMILY_SCHEMA) {
    throw new TypeError(`Expected ${CANDIDATE_FAMILY_SCHEMA}.`);
  }
  const replayed = generateCandidateSet({
    analysis,
    garmentConstraints: garmentConstraints || constraintsAlias,
    rendererProfile,
    parentScore,
    locks: family.locks,
    rootSeed: family.rootSeed,
    count: family.requestedCount,
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
  CANDIDATE_FAMILY_POLICY,
  CANDIDATE_FAMILY_SCHEMA,
  LOCKABLE_AXES,
  SLOT_POLICIES,
  generateCandidateSet,
  replayCandidateFamily,
};
