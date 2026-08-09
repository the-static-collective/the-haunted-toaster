const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const { PRNG_ID } = require("./prng.cjs");
const {
  VISUAL_SCORE_SCHEMA,
  addressVisualScore,
  parseVisualScore,
  scoreWithinConstraints,
  validateConstraints,
} = require("./schema.cjs");
const { artifact } = require("./operations.cjs");
const { resolve } = require("./resolver.cjs");

const CONVERGE_POLICY = "converge-frontier-v1";
const COVERAGE_PROJECTION_ID = "topology×motion.grammar×material.texture/v1";
const COVERAGE_AXES = Object.freeze(["topology", "motion", "material"]);

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

function projection(score) {
  return {
    topology: score.topology,
    motionGrammar: score.motion.grammar,
    materialTexture: score.material.texture,
  };
}

function projectionKey(value) {
  return canonicalStringify(value);
}

function allLawfulTargets(constraints, parentScore, locks) {
  const out = [];
  for (const topology of constraints.topology.allowed) {
    for (const motionGrammar of constraints.motion.grammar.allowed) {
      for (const materialTexture of constraints.material.texture.allowed) {
        const target = { topology, motionGrammar, materialTexture };
        if (locks.includes("topology") && topology !== parentScore.topology) continue;
        if (locks.includes("motion") && motionGrammar !== parentScore.motion.grammar) continue;
        if (locks.includes("material") && materialTexture !== parentScore.material.texture) continue;
        out.push(target);
      }
    }
  }
  return out;
}

function normalizeHistory(history, constraints) {
  return (history || []).map((entry) => assertScore(entry, constraints));
}

function computeCoverageFrontier({
  history = [],
  parentScore,
  locks = [],
  constraints,
  rootSeed,
}) {
  if (!parentScore) throw new TypeError("CONVERGE requires parentScore.");
  if (rootSeed === undefined || rootSeed === null || String(rootSeed).length === 0) {
    throw new TypeError("CONVERGE requires rootSeed.");
  }
  const boundedConstraints = assertConstraints(constraints);
  const parent = assertScore(parentScore, boundedConstraints);
  const normalizedLocks = [...new Set((locks || []).map(String))].sort();
  const historyScores = normalizeHistory(history, boundedConstraints);
  const counts = new Map();
  for (const score of historyScores) {
    const key = projectionKey(projection(score));
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const lawfulTargets = allLawfulTargets(boundedConstraints, parent, normalizedLocks);
  if (!lawfulTargets.length) {
    throw new Error("CONVERGE found no lawful coverage targets under current locks/constraints.");
  }

  let leastCount = Infinity;
  for (const target of lawfulTargets) {
    leastCount = Math.min(leastCount, counts.get(projectionKey(target)) || 0);
  }
  const frontier = lawfulTargets.filter(
    (target) => (counts.get(projectionKey(target)) || 0) === leastCount,
  );
  frontier.sort((left, right) => {
    const leftHash = hashCanonical(
      { rootSeed: String(rootSeed), target: left },
      "HauntedToaster-ConvergeTargetTieBreak-v1",
    );
    const rightHash = hashCanonical(
      { rootSeed: String(rootSeed), target: right },
      "HauntedToaster-ConvergeTargetTieBreak-v1",
    );
    return leftHash.localeCompare(rightHash);
  });
  const selectedFrontierTarget = frontier[0];
  const historySetHash = hashCanonical(
    historyScores.map((score) => addressVisualScore(score)).sort(),
    "HauntedToaster-ConvergeHistorySet-v1",
  );

  return deepFreeze({
    schema: "haunted-toaster/frontier-evidence/v1",
    policy: CONVERGE_POLICY,
    coverageProjectionId: COVERAGE_PROJECTION_ID,
    historySetHash,
    historyCount: historyScores.length,
    locks: normalizedLocks,
    lawfulTargetCount: lawfulTargets.length,
    leastVisitedCount: leastCount,
    frontierSelectionReason: leastCount === 0
      ? "deterministic-unvisited-lawful-region"
      : "deterministic-least-visited-lawful-region",
    selectedFrontierTarget,
  });
}

function changedAxes(parent, score) {
  return ["topology", "motion", "material"].filter(
    (axis) => canonicalStringify(parent[axis]) !== canonicalStringify(score[axis]),
  );
}

function makeConvergeCandidate({
  history,
  parentScore,
  locks,
  constraints,
  analysis,
  rendererProfile,
  rootSeed,
  slotIndex = 5,
}) {
  const boundedConstraints = assertConstraints(constraints);
  const parent = assertScore(parentScore, boundedConstraints);
  const evidence = computeCoverageFrontier({
    history,
    parentScore: parent,
    locks,
    constraints: boundedConstraints,
    rootSeed,
  });
  const seed = `ht-converge:${hashCanonical({
    rootSeed: String(rootSeed),
    parentScoreRef: addressVisualScore(parent),
    historySetHash: evidence.historySetHash,
    coverageProjectionId: COVERAGE_PROJECTION_ID,
    selectedFrontierTarget: evidence.selectedFrontierTarget,
  }, "HauntedToaster-ConvergeCandidateSeed-v1")}`;
  const score = structuredClone(parent);
  score.schema = VISUAL_SCORE_SCHEMA;
  score.seed = seed;
  score.prng = PRNG_ID;

  if (!evidence.locks.includes("topology")) score.topology = evidence.selectedFrontierTarget.topology;
  if (!evidence.locks.includes("motion")) score.motion.grammar = evidence.selectedFrontierTarget.motionGrammar;
  if (!evidence.locks.includes("material")) score.material.texture = evidence.selectedFrontierTarget.materialTexture;

  for (const lock of evidence.locks) score[lock] = structuredClone(parent[lock]);
  const validated = assertScore(score, boundedConstraints);
  const parentScoreRef = addressVisualScore(parent);
  const appliedAxes = changedAxes(parent, validated);
  const scoreArtifact = artifact(validated, {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "candidate-family",
    parentScoreRefs: [parentScoreRef],
    policy: {
      candidatePolicy: CONVERGE_POLICY,
      coverageProjectionId: COVERAGE_PROJECTION_ID,
      historySetHash: evidence.historySetHash,
      parentScoreRef,
      rootSeed: String(rootSeed),
      derivedSeed: seed,
      slotIndex,
      role: "converge-frontier",
      locks: evidence.locks,
      intendedAxes: COVERAGE_AXES,
      appliedAxes,
      selectedFrontierTarget: evidence.selectedFrontierTarget,
      frontierSelectionReason: evidence.frontierSelectionReason,
      prng: PRNG_ID,
      constraintPackId: boundedConstraints.id,
    },
  });
  const timeline = resolve(analysis, scoreArtifact.score, boundedConstraints, rendererProfile);
  return deepFreeze({
    index: slotIndex,
    slotIndex,
    role: "converge-frontier",
    scoreAddress: scoreArtifact.address,
    scoreArtifact,
    changedAxes: appliedAxes,
    frontierEvidence: evidence,
    timeline,
    timelineHash: timeline.timelineHash,
  });
}

function replaceFinalCandidateWithConverge(family, options) {
  if (!family || !Array.isArray(family.candidates) || family.candidates.length < 1) {
    throw new TypeError("CONVERGE requires an ordinary candidate family.");
  }
  const slotIndex = Math.min(5, family.candidates.length - 1);
  const candidate = makeConvergeCandidate({ ...options, slotIndex });
  const candidates = family.candidates.map((item, index) => index === slotIndex ? candidate : item);
  const familyCore = {
    schema: family.schema,
    policy: family.policy,
    scoreSchema: family.scoreSchema,
    prng: family.prng,
    rootSeed: family.rootSeed,
    parentScoreRef: family.parentScoreRef,
    baselineScoreRef: family.baselineScoreRef,
    constraintPackId: family.constraintPackId,
    analysisHash: family.analysisHash,
    constraintsHash: family.constraintsHash,
    rendererProfileHash: family.rendererProfileHash,
    locks: family.locks,
    requestedCount: family.requestedCount,
    producedCount: candidates.length,
    roles: candidates.map((item) => item.role),
    scoreAddresses: candidates.map((item) => item.scoreAddress),
    timelineHashes: candidates.map((item) => item.timelineHash),
    shortfall: null,
    converge: {
      enabled: true,
      policy: CONVERGE_POLICY,
      coverageProjectionId: COVERAGE_PROJECTION_ID,
      historySetHash: candidate.frontierEvidence.historySetHash,
      selectedFrontierTarget: candidate.frontierEvidence.selectedFrontierTarget,
      frontierSelectionReason: candidate.frontierEvidence.frontierSelectionReason,
    },
  };
  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

module.exports = {
  CONVERGE_POLICY,
  COVERAGE_PROJECTION_ID,
  computeCoverageFrontier,
  makeConvergeCandidate,
  replaceFinalCandidateWithConverge,
};
