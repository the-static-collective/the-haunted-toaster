const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const legacySchema = require("./schema.cjs");
const primitiveGeneration = require("./primitive-field-generation.cjs");
const primitiveScore = require("./primitive-field-score.cjs");
const {
  categoricalBreaks,
  minimumSiblingDistance,
  visibleSemanticDistance,
} = require("./visible-distance.cjs");

const STOMP_POLICY = "visible-outcome-stomp-v1";
const STOMP_POOL_POLICY = "stomp-lawful-pool-v1";
const STOMP_ATTEMPTS = 8;

const STOMP_SLOT_POLICIES = Object.freeze([
  Object.freeze({ role: "structure-break", minParentDistance: 10, minSiblingDistance: 6, requiredBreaks: 1 }),
  Object.freeze({ role: "dynamics-break", minParentDistance: 10, minSiblingDistance: 6, requiredBreaks: 1 }),
  Object.freeze({ role: "field-break", minParentDistance: 14, minSiblingDistance: 7, requiredBreaks: 2 }),
  Object.freeze({ role: "categorical-break", minParentDistance: 20, minSiblingDistance: 8, requiredBreaks: 3 }),
  Object.freeze({ role: "compound-mutant", minParentDistance: 24, minSiblingDistance: 9, requiredBreaks: 3 }),
  Object.freeze({ role: "rail-rider", minParentDistance: 34, minSiblingDistance: 10, requiredBreaks: 5 }),
]);

function assertScore(input, constraints) {
  const source = input && input.score ? input.score : input;
  const parsed = primitiveScore.parseVisualScore(source);
  if (!parsed.ok) {
    throw new TypeError(parsed.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  const bounded = primitiveScore.scoreWithinConstraints(parsed.value, constraints);
  if (!bounded.ok) {
    throw new TypeError(bounded.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  return parsed.value;
}

function normalizedLocks(locks) {
  return [...new Set((locks || []).map(String))].sort();
}

function poolSeed({ rootSeed, parentScoreRef, locks, attempt }) {
  return `ht-stomp-pool:${hashCanonical({
    rootSeed: String(rootSeed),
    parentScoreRef,
    locks,
    attempt,
    policy: STOMP_POOL_POLICY,
  }, "HauntedToaster-StompPoolSeed-v1")}`;
}

function candidateBreaks(parent, score) {
  const breaks = categoricalBreaks(parent, score);
  const parentAtmosphere = parent.atmosphere || "none";
  const nextAtmosphere = score.atmosphere || "none";
  if (parentAtmosphere !== nextAtmosphere) breaks.push("atmosphere");
  return breaks;
}

function roleAffinity(role, breaks, candidate) {
  const has = (value) => breaks.includes(value);
  const primitiveCount = Number(has("primitiveStructure")) + Number(has("primitiveDynamics"));
  const fieldCount = ["atmosphere", "material", "palette", "camera"]
    .filter((axis) => has(axis)).length;
  const broadCount = breaks.filter((axis) => !axis.startsWith("primitive")).length;
  if (role === "structure-break") {
    return Number(has("primitiveStructure")) * 40 + Number(has("topology")) * 24 + broadCount * 2;
  }
  if (role === "dynamics-break") {
    return Number(has("primitiveDynamics")) * 40 + Number(has("motion")) * 24 + broadCount * 2;
  }
  if (role === "field-break") {
    return fieldCount * 24 + primitiveCount * 3 + broadCount;
  }
  if (role === "categorical-break") {
    return breaks.length * 18 + broadCount * 5;
  }
  if (role === "compound-mutant") {
    return primitiveCount * 28 + broadCount * 10 + breaks.length * 4;
  }
  return candidate.visibleDistanceFromParent * 4 + primitiveCount * 14 + breaks.length * 7;
}

function thresholdsAtLevel(policy, level) {
  return Object.freeze({
    minParentDistance: Math.max(0, policy.minParentDistance - level * 3),
    minSiblingDistance: Math.max(0, policy.minSiblingDistance - level * 2),
    requiredBreaks: Math.max(0, policy.requiredBreaks - Math.floor(level / 3)),
  });
}

function thresholdRelaxation(policy, thresholds) {
  const applied =
    thresholds.minParentDistance !== policy.minParentDistance ||
    thresholds.minSiblingDistance !== policy.minSiblingDistance ||
    thresholds.requiredBreaks !== policy.requiredBreaks;
  return deepFreeze({
    applied,
    from: {
      minParentDistance: policy.minParentDistance,
      minSiblingDistance: policy.minSiblingDistance,
      requiredBreaks: policy.requiredBreaks,
    },
    to: { ...thresholds },
    reason: applied
      ? "locks-or-constraints-exhausted-strict-rail-target"
      : "strict-rail-target-satisfied",
  });
}

function collectPool({
  analysis,
  constraints,
  rendererProfile,
  parent,
  locks,
  rootSeed,
}) {
  const parentScoreRef = legacySchema.addressVisualScore(parent);
  const byAddress = new Map();
  const families = [];
  for (let attempt = 0; attempt < STOMP_ATTEMPTS; attempt += 1) {
    const samplingSeed = poolSeed({ rootSeed, parentScoreRef, locks, attempt });
    const family = primitiveGeneration.generateCandidateSet({
      analysis,
      garmentConstraints: constraints,
      rendererProfile,
      parentScore: parent,
      locks,
      rootSeed: samplingSeed,
      count: 6,
      phase: "branch",
    });
    families.push(family);
    for (const candidate of family.candidates) {
      if (candidate.scoreAddress === parentScoreRef) continue;
      if (!byAddress.has(candidate.scoreAddress)) {
        const breaks = candidateBreaks(parent, candidate.scoreArtifact.score);
        byAddress.set(candidate.scoreAddress, {
          candidate,
          breaks,
          samplingSeed,
          poolAttempt: attempt,
          visibleDistanceFromParent: visibleSemanticDistance(
            parent,
            candidate.scoreArtifact.score,
            constraints,
          ),
        });
      }
    }
  }
  return { pool: [...byAddress.values()], families };
}

function deterministicTie(rootSeed, role, entry) {
  return hashCanonical({
    rootSeed: String(rootSeed),
    role,
    scoreAddress: entry.candidate.scoreAddress,
  }, "HauntedToaster-StompTieBreak-v1");
}

function chooseForRole({
  policy,
  pool,
  usedAddresses,
  selectedScores,
  parent,
  constraints,
  rootSeed,
}) {
  for (let level = 0; level <= 12; level += 1) {
    const thresholds = thresholdsAtLevel(policy, level);
    const eligible = pool
      .filter((entry) => !usedAddresses.has(entry.candidate.scoreAddress))
      .map((entry) => ({
        ...entry,
        siblingDistance: minimumSiblingDistance(
          entry.candidate.scoreArtifact.score,
          selectedScores,
          constraints,
        ),
      }))
      .filter((entry) =>
        entry.visibleDistanceFromParent >= thresholds.minParentDistance &&
        entry.siblingDistance >= thresholds.minSiblingDistance &&
        entry.breaks.length >= thresholds.requiredBreaks)
      .sort((left, right) => {
        const affinityDelta = roleAffinity(policy.role, right.breaks, right) -
          roleAffinity(policy.role, left.breaks, left);
        if (affinityDelta) return affinityDelta;
        const distanceDelta = right.visibleDistanceFromParent - left.visibleDistanceFromParent;
        if (distanceDelta) return distanceDelta;
        return deterministicTie(rootSeed, policy.role, left)
          .localeCompare(deterministicTie(rootSeed, policy.role, right));
      });
    if (eligible.length) {
      return {
        entry: eligible[0],
        thresholds,
        relaxation: thresholdRelaxation(policy, thresholds),
      };
    }
  }
  throw new Error(`STOMP found no lawful descendant for ${policy.role} under current locks and constraints.`);
}

function stompDerivation(candidate, {
  role,
  rootSeed,
  parentScoreRef,
  entry,
  locks,
  relaxation,
  breaks,
  visibleDistanceFromParent,
  minimumSiblingDistance: siblingDistance,
}) {
  const derivation = structuredClone(candidate.scoreArtifact.derivation || {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "candidate-family",
    parentScoreRefs: [parentScoreRef],
    policy: {},
  });
  derivation.parentScoreRefs = [parentScoreRef];
  derivation.policy = {
    ...(derivation.policy || {}),
    candidatePolicy: STOMP_POLICY,
    sourceCandidatePolicy: candidate.scoreArtifact.derivation?.policy?.candidatePolicy || null,
    stompRole: role,
    rootSeed: String(rootSeed),
    parentScoreRef,
    locks,
    samplingSeed: entry.samplingSeed,
    poolAttempt: entry.poolAttempt,
    categoricalBreaks: breaks,
    primitiveBreaks: breaks.filter((axis) => axis.startsWith("primitive")),
    visibleDistanceFromParent,
    minimumSiblingDistance: Number.isFinite(siblingDistance) ? siblingDistance : null,
    thresholdRelaxation: relaxation,
  };
  return derivation;
}

function selectedCandidate({
  choice,
  policy,
  index,
  rootSeed,
  parentScoreRef,
  locks,
}) {
  const source = choice.entry.candidate;
  const scoreArtifact = primitiveGeneration.artifact(
    source.scoreArtifact.score,
    stompDerivation(source, {
      role: policy.role,
      rootSeed,
      parentScoreRef,
      entry: choice.entry,
      locks,
      relaxation: choice.relaxation,
      breaks: choice.entry.breaks,
      visibleDistanceFromParent: choice.entry.visibleDistanceFromParent,
      minimumSiblingDistance: choice.entry.siblingDistance,
    }),
  );
  return deepFreeze({
    ...source,
    index,
    slotIndex: index,
    role: policy.role,
    scoreArtifact,
    scoreAddress: scoreArtifact.address,
    categoricalBreaks: choice.entry.breaks,
    primitiveBreaks: choice.entry.breaks.filter((axis) => axis.startsWith("primitive")),
    visibleDistanceFromParent: choice.entry.visibleDistanceFromParent,
    minimumSiblingDistance: Number.isFinite(choice.entry.siblingDistance)
      ? choice.entry.siblingDistance
      : null,
    thresholdRelaxation: choice.relaxation,
  });
}

function generateStompCandidateSet({
  analysis,
  garmentConstraints,
  constraints: constraintsAlias,
  rendererProfile,
  parentScore,
  locks = [],
  rootSeed,
  count = 6,
}) {
  if (!parentScore) throw new TypeError("STOMP requires parentScore.");
  if (rootSeed === undefined || rootSeed === null || String(rootSeed).length === 0) {
    throw new TypeError("STOMP requires rootSeed.");
  }
  if (count !== 6) throw new TypeError("STOMP always generates exactly six candidates.");
  const constraints = garmentConstraints || constraintsAlias;
  const parent = assertScore(parentScore, constraints);
  const locksNormalized = normalizedLocks(locks);
  const parentScoreRef = legacySchema.addressVisualScore(parent);
  const { pool, families } = collectPool({
    analysis,
    constraints,
    rendererProfile,
    parent,
    locks: locksNormalized,
    rootSeed,
  });
  if (pool.length < count) {
    throw new Error("STOMP found fewer than six lawful distinct descendants under current locks and constraints.");
  }

  const selected = [];
  const selectedScores = [];
  const usedAddresses = new Set();
  for (let index = 0; index < STOMP_SLOT_POLICIES.length; index += 1) {
    const policy = STOMP_SLOT_POLICIES[index];
    const choice = chooseForRole({
      policy,
      pool,
      usedAddresses,
      selectedScores,
      parent,
      constraints,
      rootSeed,
    });
    const candidate = selectedCandidate({
      choice,
      policy,
      index,
      rootSeed,
      parentScoreRef,
      locks: locksNormalized,
    });
    selected.push(candidate);
    selectedScores.push(candidate.scoreArtifact.score);
    usedAddresses.add(candidate.scoreAddress);
  }

  const sourceFamily = families[0];
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    scoreAddresses: _scoreAddresses,
    timelineHashes: _timelineHashes,
    policy: _policy,
    rootSeed: _rootSeed,
    phase: _phase,
    roles: _roles,
    producedCount: _producedCount,
    requestedCount: _requestedCount,
    shortfall: _shortfall,
    exhaustedRoles: _exhaustedRoles,
    ...stableBase
  } = sourceFamily;
  const familyCore = {
    ...stableBase,
    policy: STOMP_POLICY,
    rootSeed: String(rootSeed),
    parentScoreRef,
    baselineScoreRef: parentScoreRef,
    locks: locksNormalized,
    phase: "stomp",
    requestedCount: 6,
    producedCount: selected.length,
    shortfall: selected.length < 6,
    roles: selected.map((candidate) => candidate.role),
    exhaustedRoles: [],
    scoreAddresses: selected.map((candidate) => candidate.scoreAddress),
    timelineHashes: selected.map((candidate) => candidate.timelineHash),
  };
  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates: selected,
  });
}

module.exports = {
  STOMP_POLICY,
  STOMP_SLOT_POLICIES,
  generateStompCandidateSet,
};
