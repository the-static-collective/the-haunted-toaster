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
const legacyDiversity = require("./diversity-engine.cjs");
const legacyFamily = require("./candidate-family.cjs");
const {
  categoricalBreaks,
  categoricalWeight,
  minimumSiblingDistance,
  visibleSemanticDistance,
} = require("./visible-distance.cjs");

const VISIBLE_BRANCH_POLICY = "visible-outcome-branch-v2";
const VISIBLE_DISTANCE_POLICY = "visible-semantic-distance-v1";
const MAX_ATTEMPTS = 48;

const VISIBLE_BRANCH_SLOT_POLICIES = Object.freeze([
  Object.freeze({ role: "anchor", axes: ["motion"], mode: "near", categoricalAxes: [], minCategoricalBreaks: 0, minParentDistance: 0, minSiblingDistance: 0 }),
  Object.freeze({ role: "motion-break", axes: ["motion"], mode: "break", categoricalAxes: ["motion"], minCategoricalBreaks: 1, minParentDistance: 8, minSiblingDistance: 7 }),
  Object.freeze({ role: "topology-composition-break", axes: ["topology", "camera", "lyric"], mode: "break", categoricalAxes: ["topology", "camera", "lyric"], minCategoricalBreaks: 1, minParentDistance: 8, minSiblingDistance: 7 }),
  Object.freeze({ role: "material-break", axes: ["material"], mode: "break", categoricalAxes: ["material"], minCategoricalBreaks: 1, minParentDistance: 8, minSiblingDistance: 7 }),
  Object.freeze({ role: "temporal-palette-break", axes: ["temporalDensity", "palette"], mode: "break", categoricalAxes: ["temporalDensity", "palette"], minCategoricalBreaks: 1, minParentDistance: 5, minSiblingDistance: 7 }),
  Object.freeze({ role: "risky-hybrid", axes: ["topology", "motion", "palette", "material", "camera", "temporalDensity"], mode: "break", categoricalAxes: ["topology", "motion", "palette", "material", "camera", "temporalDensity"], minCategoricalBreaks: 3, minParentDistance: 18, minSiblingDistance: 9 }),
]);

function assertConstraints(input) {
  const result = validateConstraints(input);
  if (!result.ok) throw new TypeError(result.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  return result.value;
}

function assertScore(input, constraints) {
  const source = input && input.score ? input.score : input;
  const parsed = parseVisualScore(source);
  if (!parsed.ok) throw new TypeError(parsed.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  const bounded = scoreWithinConstraints(parsed.value, constraints);
  if (!bounded.ok) throw new TypeError(bounded.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  return parsed.value;
}

function normalizeLocks(locks) {
  const normalized = [...new Set((locks || []).map(String))].sort();
  for (const lock of normalized) {
    if (!legacyFamily.LOCKABLE_AXES.includes(lock)) throw new TypeError(`Unknown candidate lock: ${lock}`);
  }
  return normalized;
}

function deriveSeed({ rootSeed, parentScoreRef, slotIndex, attempt }) {
  return `ht-visible-branch:${hashCanonical({ rootSeed: String(rootSeed), parentScoreRef, slotIndex, attempt }, "HauntedToaster-VisibleBranchCandidateSeed-v2")}`;
}

function pickDifferent(prng, allowed, current) {
  const alternatives = allowed.filter((value) => value !== current);
  return alternatives.length ? prng.pick(alternatives) : current;
}

function nearNumber(current, range, prng) {
  if (range.min === range.max) return range.min;
  const span = range.max - range.min;
  const direction = prng.nextFloat() < 0.5 ? -1 : 1;
  const step = span * (0.025 + prng.nextFloat() * 0.05);
  return quantizeNumber(Math.min(range.max, Math.max(range.min, current + direction * step)));
}

function pushNumber(current, range, prng) {
  if (range.min === range.max) return range.min;
  const span = range.max - range.min;
  const candidates = [
    range.min,
    range.max,
    Math.max(range.min, current - span * (0.2 + prng.nextFloat() * 0.2)),
    Math.min(range.max, current + span * (0.2 + prng.nextFloat() * 0.2)),
  ];
  const separated = candidates.filter((value) => Math.abs(value - current) >= span * 0.16);
  return quantizeNumber(prng.pick(separated.length ? separated : candidates));
}

function categoricalAlternatives(constraints, axis, score) {
  if (axis === "topology") return constraints.topology.allowed.filter((value) => value !== score.topology);
  if (axis === "motion") return constraints.motion.grammar.allowed.filter((value) => value !== score.motion.grammar);
  if (axis === "palette") return constraints.palette.logic.allowed.filter((value) => value !== score.palette.logic);
  if (axis === "material") return constraints.material.texture.allowed.filter((value) => value !== score.material.texture);
  if (axis === "lyric") return constraints.lyric.placement.allowed.filter((value) => value !== score.lyric.placement);
  if (axis === "camera") return constraints.camera.grammar.allowed.filter((value) => value !== score.camera.grammar);
  if (axis === "temporalDensity") return constraints.temporalDensity.allowed.filter((value) => value !== score.temporalDensity);
  return [];
}

function mutateAxis(score, constraints, axis, prng, mode) {
  const breaking = mode === "break";
  if (axis === "topology") {
    if (breaking) score.topology = pickDifferent(prng, constraints.topology.allowed, score.topology);
    return;
  }
  if (axis === "motion") {
    if (breaking) score.motion.grammar = pickDifferent(prng, constraints.motion.grammar.allowed, score.motion.grammar);
    score.motion.amplitude = breaking ? pushNumber(score.motion.amplitude, constraints.motion.amplitude, prng) : nearNumber(score.motion.amplitude, constraints.motion.amplitude, prng);
    score.motion.variance = breaking ? pushNumber(score.motion.variance, constraints.motion.variance, prng) : nearNumber(score.motion.variance, constraints.motion.variance, prng);
    return;
  }
  if (axis === "palette") {
    if (breaking) score.palette.logic = pickDifferent(prng, constraints.palette.logic.allowed, score.palette.logic);
    score.palette.bleed = breaking ? pushNumber(score.palette.bleed, constraints.palette.bleed, prng) : nearNumber(score.palette.bleed, constraints.palette.bleed, prng);
    score.palette.contrastBias = breaking ? pushNumber(score.palette.contrastBias, constraints.palette.contrastBias, prng) : nearNumber(score.palette.contrastBias, constraints.palette.contrastBias, prng);
    return;
  }
  if (axis === "material") {
    if (breaking) score.material.texture = pickDifferent(prng, constraints.material.texture.allowed, score.material.texture);
    score.material.imperfection = breaking ? pushNumber(score.material.imperfection, constraints.material.imperfection, prng) : nearNumber(score.material.imperfection, constraints.material.imperfection, prng);
    return;
  }
  if (axis === "lyric") {
    if (breaking) score.lyric.placement = pickDifferent(prng, constraints.lyric.placement.allowed, score.lyric.placement);
    score.lyric.densityBias = breaking ? pushNumber(score.lyric.densityBias, constraints.lyric.densityBias, prng) : nearNumber(score.lyric.densityBias, constraints.lyric.densityBias, prng);
    return;
  }
  if (axis === "camera") {
    if (breaking) score.camera.grammar = pickDifferent(prng, constraints.camera.grammar.allowed, score.camera.grammar);
    score.camera.variance = breaking ? pushNumber(score.camera.variance, constraints.camera.variance, prng) : nearNumber(score.camera.variance, constraints.camera.variance, prng);
    return;
  }
  if (axis === "temporalDensity" && breaking) {
    score.temporalDensity = pickDifferent(prng, constraints.temporalDensity.allowed, score.temporalDensity);
  }
}

function creativeState(score) {
  return Object.fromEntries(legacyFamily.LOCKABLE_AXES.map((axis) => [axis, score[axis]]));
}

function changedAxes(parent, child) {
  return legacyFamily.LOCKABLE_AXES.filter((axis) => canonicalStringify(parent[axis]) !== canonicalStringify(child[axis]));
}

function applicableCategoricalAxes(slot, parent, constraints, locks) {
  return slot.categoricalAxes.filter((axis) => !locks.includes(axis) && categoricalAlternatives(constraints, axis, parent).length > 0);
}

function roleThresholds(slot, applicableAxes) {
  const availableCategoricalDistance = applicableAxes.reduce((sum, axis) => sum + categoricalWeight(axis), 0);
  const requiredBreaks = Math.min(slot.minCategoricalBreaks, applicableAxes.length);
  return {
    requiredBreaks,
    minParentDistance: requiredBreaks ? Math.min(slot.minParentDistance, availableCategoricalDistance) : 0,
    minSiblingDistance: requiredBreaks ? Math.min(slot.minSiblingDistance, availableCategoricalDistance) : 0,
  };
}

function makeVisibleBranchCandidate({ parent, parentScoreRef, constraints, locks, rootSeed, slot, slotIndex, attempt }) {
  const seed = deriveSeed({ rootSeed, parentScoreRef, slotIndex, attempt });
  const prng = createPrng(`${seed}:${slot.role}`);
  const score = structuredClone(parent);
  score.seed = seed;
  score.prng = PRNG_ID;

  const appliedAxes = slot.axes.filter((axis) => !locks.includes(axis));
  for (const axis of appliedAxes) mutateAxis(score, constraints, axis, prng, slot.mode);
  for (const lock of locks) score[lock] = structuredClone(parent[lock]);

  const validated = assertScore(score, constraints);
  const breaks = categoricalBreaks(parent, validated);
  const parentDistance = visibleSemanticDistance(parent, validated, constraints);
  return artifact(validated, {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "candidate-family",
    parentScoreRefs: [parentScoreRef],
    policy: {
      candidatePolicy: VISIBLE_BRANCH_POLICY,
      distancePolicy: VISIBLE_DISTANCE_POLICY,
      rootSeed: String(rootSeed),
      derivedSeed: seed,
      slotIndex,
      role: slot.role,
      attempt,
      locks,
      intendedAxes: slot.axes,
      appliedAxes,
      categoricalBreaks: breaks,
      visibleDistanceFromParent: parentDistance,
      prng: PRNG_ID,
      constraintPackId: constraints.id,
    },
  });
}

function generateVisibleBranchCandidateSet({ analysis, garmentConstraints, constraints: constraintsAlias, rendererProfile, parentScore, locks = [], rootSeed, count = 6 }) {
  if (!parentScore) throw new TypeError("Branch exploration requires parentScore.");
  if (rootSeed === undefined || rootSeed === null || String(rootSeed).length === 0) throw new TypeError("rootSeed is required.");
  if (!Number.isInteger(count) || count < 1 || count > VISIBLE_BRANCH_SLOT_POLICIES.length) throw new TypeError(`count must be an integer from 1 to ${VISIBLE_BRANCH_SLOT_POLICIES.length}.`);

  const constraints = assertConstraints(garmentConstraints || constraintsAlias);
  const parent = assertScore(parentScore, constraints);
  const parentScoreRef = addressVisualScore(parent);
  const normalizedLocks = normalizeLocks(locks);
  const candidates = [];
  const acceptedScores = [];
  const seenCreativeStates = new Set();
  const exhaustedRoles = [];

  for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
    const slot = VISIBLE_BRANCH_SLOT_POLICIES[slotIndex];
    const applicableBreakAxes = applicableCategoricalAxes(slot, parent, constraints, normalizedLocks);
    const thresholds = roleThresholds(slot, applicableBreakAxes);
    let accepted = null;
    let acceptedSiblingDistance = Infinity;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const scoreArtifact = makeVisibleBranchCandidate({ parent, parentScoreRef, constraints, locks: normalizedLocks, rootSeed, slot, slotIndex, attempt });
      const key = canonicalStringify(creativeState(scoreArtifact.score));
      if (seenCreativeStates.has(key)) continue;

      const breaks = categoricalBreaks(parent, scoreArtifact.score);
      const roleBreakCount = applicableBreakAxes.filter((axis) => breaks.includes(axis)).length;
      if (roleBreakCount < thresholds.requiredBreaks) continue;

      const parentDistance = visibleSemanticDistance(parent, scoreArtifact.score, constraints);
      if (parentDistance < thresholds.minParentDistance) continue;

      const siblingDistance = minimumSiblingDistance(scoreArtifact.score, acceptedScores, constraints);
      if (siblingDistance < thresholds.minSiblingDistance) continue;

      accepted = scoreArtifact;
      acceptedSiblingDistance = siblingDistance;
      seenCreativeStates.add(key);
      break;
    }

    if (!accepted) {
      exhaustedRoles.push(slot.role);
      continue;
    }

    const timeline = resolve(analysis, accepted.score, constraints, rendererProfile);
    const breaks = categoricalBreaks(parent, accepted.score);
    candidates.push(deepFreeze({
      index: candidates.length,
      slotIndex,
      role: slot.role,
      scoreAddress: accepted.address,
      scoreArtifact: accepted,
      changedAxes: changedAxes(parent, accepted.score),
      categoricalBreaks: breaks,
      visibleDistanceFromParent: visibleSemanticDistance(parent, accepted.score, constraints),
      minimumSiblingDistance: Number.isFinite(acceptedSiblingDistance) ? acceptedSiblingDistance : null,
      requiredParentDistance: thresholds.minParentDistance,
      requiredSiblingDistance: thresholds.minSiblingDistance,
      timeline,
      timelineHash: timeline.timelineHash,
    }));
    acceptedScores.push(accepted.score);
  }

  const shortfall = candidates.length < count ? {
    requested: count,
    produced: candidates.length,
    reason: "constraints-and-locks-exhausted-visible-outcomes",
    exhaustedRoles,
  } : null;
  const firstTimeline = candidates[0]?.timeline;
  if (!firstTimeline) throw new Error("Visible branch exploration could not produce any lawful candidate.");

  const familyCore = {
    schema: legacyFamily.CANDIDATE_FAMILY_SCHEMA,
    policy: VISIBLE_BRANCH_POLICY,
    distancePolicy: VISIBLE_DISTANCE_POLICY,
    phase: "branch",
    scoreSchema: parent.schema,
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

  return deepFreeze({ ...familyCore, familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"), candidates });
}

function generateCandidateSet(options = {}) {
  if (options.phase === "branch") return generateVisibleBranchCandidateSet(options);
  return legacyDiversity.generateCandidateSet(options);
}

function replayCandidateFamily(family, options = {}) {
  if (family?.policy !== VISIBLE_BRANCH_POLICY) return legacyDiversity.replayCandidateFamily(family, options);
  const replayed = generateVisibleBranchCandidateSet({ ...options, locks: family.locks, rootSeed: family.rootSeed, count: family.requestedCount });
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
  VISIBLE_BRANCH_POLICY,
  VISIBLE_BRANCH_SLOT_POLICIES,
  VISIBLE_DISTANCE_POLICY,
  generateCandidateSet,
  generateVisibleBranchCandidateSet,
  replayCandidateFamily,
};
