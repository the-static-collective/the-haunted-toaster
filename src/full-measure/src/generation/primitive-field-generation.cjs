const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const legacyResolver = require("./resolver.cjs");
const legacySchema = require("./schema.cjs");
const atmosphereGeneration = require("./atmosphere-generation.cjs");
const possessionArc = require("./possession-arc.cjs");
const {
  FIELD_DYNAMICS,
  STRUCTURE_PRIMITIVES,
  hasPrimitiveField,
  parseVisualScore,
  scoreWithinConstraints,
  stripPrimitiveField,
} = require("./primitive-field-score.cjs");

const PRIMITIVE_FIELD_POLICY = "primitive-field-coverage-v1";
const PRIMITIVE_FIELD_DOMAIN = "HauntedToaster-PrimitiveField-v1";

const STRUCTURE_COMPILERS = Object.freeze({
  scope: "structure-scope-v1",
  ribs: "structure-ribs-v1",
  lattice: "structure-lattice-v1",
  facets: "structure-facets-v1",
  torus: "structure-torus-v1",
  folds: "structure-folds-v1",
  voxels: "structure-voxels-v1",
  branches: "structure-branches-v1",
});

const DYNAMICS_COMPILERS = Object.freeze({
  inertial: "dynamics-inertial-v1",
  wave: "dynamics-wave-v1",
  "orbital-decay": "dynamics-orbital-decay-v1",
  snap: "dynamics-snap-v1",
  oscillation: "dynamics-oscillation-v1",
  seismic: "dynamics-seismic-v1",
  magnetic: "dynamics-magnetic-v1",
  swarm: "dynamics-swarm-v1",
  whip: "dynamics-whip-v1",
  advect: "dynamics-advect-v1",
});

const NEUTRAL_FIELD = Object.freeze({ structure: "scope", dynamics: "inertial" });
const RARE_STRUCTURES = Object.freeze(["branches", "torus", "voxels", "lattice"]);
const RARE_DYNAMICS = Object.freeze(["magnetic", "swarm", "whip", "seismic", "snap"]);
const MOTION_DYNAMICS = Object.freeze(["wave", "orbital-decay", "oscillation", "advect", "seismic"]);
const MATERIAL_STRUCTURES = Object.freeze(["folds", "voxels", "ribs", "lattice"]);

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

function artifact(score, derivation = null) {
  const validated = assertScore(score);
  return deepFreeze({
    schema: "haunted-toaster/score-artifact/v1",
    address: legacySchema.addressVisualScore(validated),
    canonicalJson: canonicalStringify(validated),
    score: validated,
    derivation,
  });
}

function compilerEvidence(field) {
  return deepFreeze({
    policyVersion: PRIMITIVE_FIELD_POLICY,
    structure: field.structure,
    dynamics: field.dynamics,
    structureCompiler: STRUCTURE_COMPILERS[field.structure],
    dynamicsCompiler: DYNAMICS_COMPILERS[field.dynamics],
  });
}

function createVisualScore({ seed, constraints, overrides = {} }) {
  if (!Object.hasOwn(overrides, "primitiveField")) {
    return atmosphereGeneration.createVisualScore({ seed, constraints, overrides });
  }
  const coreOverrides = { ...overrides };
  const primitiveField = coreOverrides.primitiveField;
  delete coreOverrides.primitiveField;
  const base = atmosphereGeneration.createVisualScore({
    seed,
    constraints,
    overrides: coreOverrides,
  });
  const scoreArtifact = artifact(
    { ...base.score, primitiveField },
    {
      ...structuredClone(base.derivation),
      policy: {
        ...structuredClone(base.derivation?.policy || {}),
        primitiveField: structuredClone(primitiveField),
        primitiveFieldPolicy: PRIMITIVE_FIELD_POLICY,
      },
    },
  );
  return scoreArtifact;
}

function resolve(analysisInput, scoreInput, constraintsInput, profileInput) {
  const score = assertScore(scoreInput, constraintsInput);
  if (!hasPrimitiveField(score)) {
    return atmosphereGeneration.resolve(
      analysisInput,
      scoreInput,
      constraintsInput,
      profileInput,
    );
  }

  const coreTimeline = atmosphereGeneration.resolve(
    analysisInput,
    stripPrimitiveField(score),
    constraintsInput,
    profileInput,
  );
  const initialState = {
    ...structuredClone(coreTimeline.baseState),
    primitiveField: structuredClone(score.primitiveField),
  };
  let state = structuredClone(initialState);
  const patches = (coreTimeline.patches || []).map((legacyPatch) => {
    const patch = {
      ...structuredClone(legacyPatch),
      priorStateHash: hashCanonical(state, "HauntedToaster-ResolvedState-v1"),
    };
    state = legacyResolver.applyPatch(state, patch);
    return patch;
  });
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    ...coreBody
  } = coreTimeline;
  const body = {
    ...structuredClone(coreBody),
    scoreAddress: legacySchema.addressVisualScore(score),
    baseState: initialState,
    patches,
    primitiveField: compilerEvidence(score.primitiveField),
  };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

function primitiveFieldOf(score) {
  return hasPrimitiveField(score)
    ? score.primitiveField
    : NEUTRAL_FIELD;
}

function digestIndex(digest, length, offset = 0) {
  if (!length) throw new RangeError("Cannot choose from an empty primitive pool.");
  const start = offset % Math.max(1, digest.length - 8);
  return Number.parseInt(digest.slice(start, start + 8), 16) % length;
}

function choose(pool, digest, offset = 0) {
  return pool[digestIndex(digest, pool.length, offset)];
}

function chooseDifferent(pool, current, digest, offset = 0) {
  const alternatives = pool.filter((value) => value !== current);
  return alternatives.length ? choose(alternatives, digest, offset) : current;
}

function primitiveSeed({
  rootSeed,
  parentScoreRef,
  candidateScoreRef,
  slotIndex,
  role,
  locks,
}) {
  return hashCanonical({
    rootSeed: String(rootSeed),
    parentScoreRef: parentScoreRef || null,
    candidateScoreRef,
    slotIndex,
    role,
    locks,
  }, PRIMITIVE_FIELD_DOMAIN);
}

function primitiveForCandidate({
  candidate,
  rootSeed,
  parentScoreRef,
  parentField,
  locks,
}) {
  const digest = primitiveSeed({
    rootSeed,
    parentScoreRef,
    candidateScoreRef: candidate.scoreAddress,
    slotIndex: candidate.slotIndex,
    role: candidate.role,
    locks,
  });
  const role = String(candidate.role || "");
  let structure = parentField.structure;
  let dynamics = parentField.dynamics;

  if (role === "anchor" || role === "near-parent") {
    // Deliberately inherit the current creature for the anchor slot.
  } else if (role.includes("motion")) {
    dynamics = chooseDifferent(MOTION_DYNAMICS, parentField.dynamics, digest, 0);
  } else if (role.includes("topology")) {
    structure = chooseDifferent(STRUCTURE_PRIMITIVES, parentField.structure, digest, 8);
  } else if (role.includes("material")) {
    structure = chooseDifferent(MATERIAL_STRUCTURES, parentField.structure, digest, 16);
  } else if (role.includes("temporal") || role.includes("palette")) {
    dynamics = chooseDifferent(MOTION_DYNAMICS, parentField.dynamics, digest, 24);
  } else if (
    role === "risky-hybrid" ||
    role === "foreign-body-frontier" ||
    role === "converge-frontier"
  ) {
    structure = chooseDifferent(RARE_STRUCTURES, parentField.structure, digest, 32);
    dynamics = chooseDifferent(RARE_DYNAMICS, parentField.dynamics, digest, 40);
  } else {
    structure = chooseDifferent(STRUCTURE_PRIMITIVES, parentField.structure, digest, 8);
    dynamics = chooseDifferent(FIELD_DYNAMICS, parentField.dynamics, digest, 24);
  }

  if (locks.includes("topology")) structure = parentField.structure;
  if (locks.includes("motion")) dynamics = parentField.dynamics;
  return deepFreeze({ structure, dynamics });
}

function extendDerivation(derivation, primitiveField, parentScoreRef = null) {
  const evidence = compilerEvidence(primitiveField);
  const next = structuredClone(derivation || {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "candidate-family",
    parentScoreRefs: [],
    policy: {},
  });
  if (parentScoreRef) next.parentScoreRefs = [parentScoreRef];
  next.policy = {
    ...(next.policy || {}),
    ...(parentScoreRef
      ? { parentScoreRef, baselineScoreRef: parentScoreRef }
      : {}),
    primitiveFieldPolicy: PRIMITIVE_FIELD_POLICY,
    primitiveStructure: primitiveField.structure,
    primitiveDynamics: primitiveField.dynamics,
    structureCompiler: evidence.structureCompiler,
    dynamicsCompiler: evidence.dynamicsCompiler,
  };
  return next;
}

function primitiveBreaks(parentField, nextField) {
  const breaks = [];
  if (parentField.structure !== nextField.structure) breaks.push("primitiveStructure");
  if (parentField.dynamics !== nextField.dynamics) breaks.push("primitiveDynamics");
  return breaks;
}

function transformCandidate({
  candidate,
  analysis,
  constraints,
  rendererProfile,
  rootSeed,
  locks,
  parentScoreRef,
  parentField,
}) {
  const primitiveField = primitiveForCandidate({
    candidate,
    rootSeed,
    parentScoreRef,
    parentField,
    locks,
  });
  const scoreArtifact = artifact(
    { ...candidate.scoreArtifact.score, primitiveField },
    extendDerivation(candidate.scoreArtifact.derivation, primitiveField, parentScoreRef),
  );
  let timeline = resolve(
    analysis,
    scoreArtifact.score,
    constraints,
    rendererProfile,
  );
  timeline = possessionArc.applyPossessionArc(timeline, {
    analysis,
    score: scoreArtifact.score,
    constraints,
    locks,
  });
  const breaks = primitiveBreaks(parentField, primitiveField);
  return deepFreeze({
    ...candidate,
    scoreAddress: scoreArtifact.address,
    scoreArtifact,
    primitiveBreaks: breaks,
    timeline,
    timelineHash: timeline.timelineHash,
  });
}

function rebuildFamily(baseFamily, {
  candidates,
  locks,
  parentScoreRef,
  baselineScoreRef,
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
  const normalizedLocks = [...new Set((locks || []).map(String))].sort();
  const parentCore = parent ? stripPrimitiveField(parent) : null;
  const baseFamily = possessionArc.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile,
    parentScore: parentCore,
    locks: normalizedLocks,
    rootSeed,
    count,
    phase,
  });
  const fullParentScoreRef = parent
    ? legacySchema.addressVisualScore(parent)
    : null;
  const parentField = primitiveFieldOf(parent);
  const candidates = baseFamily.candidates.map((candidate) => transformCandidate({
    candidate,
    analysis,
    constraints,
    rendererProfile,
    rootSeed,
    locks: normalizedLocks,
    parentScoreRef: fullParentScoreRef,
    parentField,
  }));

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

function replaceFinalCandidateWithConverge(family, options = {}) {
  const constraints = options.constraints;
  const parent = assertScore(options.parentScore, constraints);
  const normalizedLocks = [...new Set((options.locks || []).map(String))].sort();
  const baseResult = possessionArc.replaceFinalCandidateWithConverge(family, {
    ...options,
    history: (options.history || []).map((score) => stripPrimitiveField(score)),
    parentScore: stripPrimitiveField(parent),
    locks: normalizedLocks,
  });
  const slotIndex = Math.min(5, baseResult.candidates.length - 1);
  const fullParentScoreRef = legacySchema.addressVisualScore(parent);
  const transformed = transformCandidate({
    candidate: baseResult.candidates[slotIndex],
    analysis: options.analysis,
    constraints,
    rendererProfile: options.rendererProfile,
    rootSeed: options.rootSeed,
    locks: normalizedLocks,
    parentScoreRef: fullParentScoreRef,
    parentField: primitiveFieldOf(parent),
  });
  const candidates = baseResult.candidates.map((candidate, index) =>
    index === slotIndex ? transformed : candidate,
  );
  return rebuildFamily(baseResult, {
    candidates,
    locks: normalizedLocks,
    parentScoreRef: fullParentScoreRef,
    baselineScoreRef: family.baselineScoreRef,
  });
}

module.exports = {
  DYNAMICS_COMPILERS,
  PRIMITIVE_FIELD_POLICY,
  STRUCTURE_COMPILERS,
  artifact,
  compilerEvidence,
  createVisualScore,
  generateCandidateSet,
  replaceFinalCandidateWithConverge,
  replayCandidateFamily,
  resolve,
};
