const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");
const { PRNG_ID, createPrng } = require("./prng.cjs");
const {
  addressVisualScore,
  parseVisualScore,
  scoreWithinConstraints,
  validateConstraints,
} = require("./schema.cjs");
const { artifact } = require("./operations.cjs");
const { resolve } = require("./resolver.cjs");
const legacy = require("./candidate-family.cjs");

const BRANCH_EXPLORATION_POLICY = "branch-exploration-v1";
const BRANCH_SLOT_POLICIES = Object.freeze([
  Object.freeze({ role: "branch-motion", axes: ["motion"] }),
  Object.freeze({ role: "branch-palette", axes: ["palette"] }),
  Object.freeze({ role: "branch-material", axes: ["material"] }),
  Object.freeze({ role: "branch-composition", axes: ["camera", "lyric"] }),
  Object.freeze({ role: "branch-temporal", axes: ["temporalDensity", "motion"] }),
  Object.freeze({ role: "branch-hybrid", axes: ["palette", "material", "camera"] }),
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

function normalizeLocks(locks) {
  const normalized = [...new Set((locks || []).map(String))].sort();
  for (const lock of normalized) {
    if (!legacy.LOCKABLE_AXES.includes(lock)) {
      throw new TypeError(`Unknown candidate lock: ${lock}`);
    }
  }
  return normalized;
}

function deriveSeed({ rootSeed, parentScoreRef, slotIndex, attempt }) {
  return `ht-branch:${hashCanonical({
    rootSeed: String(rootSeed),
    parentScoreRef,
    slotIndex,
    attempt,
  }, "HauntedToaster-BranchCandidateSeed-v1")}`;
}

function pickDifferent(prng, allowed, current) {
  const alternatives = allowed.filter((value) => value !== current);
  return alternatives.length ? prng.pick(alternatives) : current;
}

function nearNumber(current, range, prng) {
  if (range.min === range.max) return range.min;
  const span = range.max - range.min;
  const direction = prng.nextFloat() < 0.5 ? -1 : 1;
  const step = span * (0.04 + prng.nextFloat() * 0.08);
  return quantizeNumber(Math.min(range.max, Math.max(range.min, current + direction * step)));
}

function mutateAxis(score, constraints, axis, prng) {
  if (axis === "topology") {
    score.topology = pickDifferent(prng, constraints.topology.allowed, score.topology);
  } else if (axis === "motion") {
    if (prng.nextFloat() < 0.35) {
      score.motion.grammar = pickDifferent(prng, constraints.motion.grammar.allowed, score.motion.grammar);
    }
    score.motion.amplitude = nearNumber(score.motion.amplitude, constraints.motion.amplitude, prng);
    score.motion.variance = nearNumber(score.motion.variance, constraints.motion.variance, prng);
  } else if (axis === "palette") {
    if (prng.nextFloat() < 0.5) {
      score.palette.logic = pickDifferent(prng, constraints.palette.logic.allowed, score.palette.logic);
    }
    score.palette.bleed = nearNumber(score.palette.bleed, constraints.palette.bleed, prng);
    score.palette.contrastBias = nearNumber(score.palette.contrastBias, constraints.palette.contrastBias, prng);
  } else if (axis === "material") {
    if (prng.nextFloat() < 0.5) {
      score.material.texture = pickDifferent(prng, constraints.material.texture.allowed, score.material.texture);
    }
    score.material.imperfection = nearNumber(score.material.imperfection, constraints.material.imperfection, prng);
  } else if (axis === "lyric") {
    if (prng.nextFloat() < 0.4) {
      score.lyric.placement = pickDifferent(prng, constraints.lyric.placement.allowed, score.lyric.placement);
    }
    score.lyric.densityBias = nearNumber(score.lyric.densityBias, constraints.lyric.densityBias, prng);
  } else if (axis === "camera") {
    if (prng.nextFloat() < 0.4) {
      score.camera.grammar = pickDifferent(prng, constraints.camera.grammar.allowed, score.camera.grammar);
    }
    score.camera.variance = nearNumber(score.camera.variance, constraints.camera.variance, prng);
  } else if (axis === "temporalDensity") {
    score.temporalDensity = pickDifferent(prng, constraints.temporalDensity.allowed, score.temporalDensity);
  }
}

function creativeState(score) {
  return Object.fromEntries(legacy.LOCKABLE_AXES.map((axis) => [axis, score[axis]]));
}

function changedAxes(parent, child) {
  return legacy.LOCKABLE_AXES.filter(
    (axis) => canonicalStringify(parent[axis]) !== canonicalStringify(child[axis]),
  );
}

function makeBranchCandidate({ parent, parentScoreRef, constraints, locks, rootSeed, slot, slotIndex, attempt }) {
  const seed = deriveSeed({ rootSeed, parentScoreRef, slotIndex, attempt });
  const prng = createPrng(`${seed}:${slot.role}`);
  const score = structuredClone(parent);
  score.seed = seed;
  score.prng = PRNG_ID;

  const appliedAxes = slot.axes.filter((axis) => !locks.includes(axis));
  for (const axis of appliedAxes) mutateAxis(score, constraints, axis, prng);
  for (const lock of locks) score[lock] = structuredClone(parent[lock]);

  const validated = assertScore(score, constraints);
  return artifact(validated, {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "candidate-family",
    parentScoreRefs: [parentScoreRef],
    policy: {
      candidatePolicy: BRANCH_EXPLORATION_POLICY,
      rootSeed: String(rootSeed),
      derivedSeed: seed,
      slotIndex,
      role: slot.role,
      attempt,
      locks,
      intendedAxes: slot.axes,
      appliedAxes,
      prng: PRNG_ID,
      constraintPackId: constraints.id,
    },
  });
}

function generateBranchCandidateSet({
  analysis,
  garmentConstraints,
  constraints: constraintsAlias,
  rendererProfile,
  parentScore,
  locks = [],
  rootSeed,
  count = 6,
}) {
  if (!parentScore) throw new TypeError("Branch exploration requires parentScore.");
  if (rootSeed === undefined || rootSeed === null || String(rootSeed).length === 0) {
    throw new TypeError("rootSeed is required.");
  }
  if (!Number.isInteger(count) || count < 1 || count > BRANCH_SLOT_POLICIES.length) {
    throw new TypeError(`count must be an integer from 1 to ${BRANCH_SLOT_POLICIES.length}.`);
  }

  const constraints = assertConstraints(garmentConstraints || constraintsAlias);
  const parent = assertScore(parentScore, constraints);
  const parentScoreRef = addressVisualScore(parent);
  const normalizedLocks = normalizeLocks(locks);
  const candidates = [];
  const seenCreativeStates = new Set();
  const exhaustedRoles = [];

  for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
    const slot = BRANCH_SLOT_POLICIES[slotIndex];
    let accepted = null;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const scoreArtifact = makeBranchCandidate({
        parent,
        parentScoreRef,
        constraints,
        locks: normalizedLocks,
        rootSeed,
        slot,
        slotIndex,
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

  const shortfall = candidates.length < count ? {
    requested: count,
    produced: candidates.length,
    reason: "constraints-and-locks-exhausted-materially-distinct-creative-states",
    exhaustedRoles,
  } : null;
  const firstTimeline = candidates[0]?.timeline;
  if (!firstTimeline) throw new Error("Branch exploration could not produce any lawful candidate.");

  const familyCore = {
    schema: legacy.CANDIDATE_FAMILY_SCHEMA,
    policy: BRANCH_EXPLORATION_POLICY,
    phase: "branch",
    scoreSchema: acceptedScoreSchema(parent),
    prng: PRNG_ID,
    rootSeed: String(rootSeed),
    parentScoreRef,
    baselineScoreRef: parentScoreRef,
    constraintPackId: constraints.id,
    analysisHash: firstTimeline.analysisHash,
    constraintsHash: firstTimeline.constraintsHash,
    rendererProfileHash: firstTimeline.rendererProfileHash,
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

function acceptedScoreSchema(score) {
  return score.schema;
}

function generateCandidateSet(options = {}) {
  if (options.phase === "branch") return generateBranchCandidateSet(options);
  return legacy.generateCandidateSet(options);
}

function replayCandidateFamily(family, options = {}) {
  if (family?.policy !== BRANCH_EXPLORATION_POLICY) {
    return legacy.replayCandidateFamily(family, options);
  }
  const replayed = generateBranchCandidateSet({
    ...options,
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
  BRANCH_EXPLORATION_POLICY,
  BRANCH_SLOT_POLICIES,
  generateBranchCandidateSet,
  generateCandidateSet,
  replayCandidateFamily,
};
