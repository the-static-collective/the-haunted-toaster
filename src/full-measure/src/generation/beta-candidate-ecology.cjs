const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const base = require("./nested-response-generation.cjs");
const { listToastFeels } = require("../toast-feels.cjs");

const TOASTMOOD_FIELD_POLICY = "toastmood-field-v1";
const CROSS_POLICY = "two-parent-cross-v1";
const CROSS_SCHEMA = "haunted-toaster/two-parent-cross/v1";
const FIELD_DOMAIN = "HauntedToaster-ToastmoodField-v1";
const CROSS_DOMAIN = "HauntedToaster-TwoParentCross-v1";

const CROSS_PLANS = Object.freeze([
  Object.freeze({ id: "a-body-b-skin", dominant: "A", inheritedFromOther: ["palette", "material"] }),
  Object.freeze({ id: "b-body-a-motion", dominant: "B", inheritedFromOther: ["motion", "camera"] }),
  Object.freeze({ id: "a-motion-b-structure", dominant: "A", inheritedFromOther: ["topology", "lyric", "primitiveField"] }),
  Object.freeze({ id: "b-structure-a-time", dominant: "B", inheritedFromOther: ["palette", "temporalDensity"] }),
  Object.freeze({ id: "a-recessive-b-gesture", dominant: "A", inheritedFromOther: ["motion", "material", "camera"] }),
  Object.freeze({ id: "b-recessive-a-composition", dominant: "B", inheritedFromOther: ["topology", "palette", "lyric", "temporalDensity", "primitiveField"] }),
]);

function ordinaryToastFeels() {
  return listToastFeels().filter((feel) => feel.semanticClass === "ordinary");
}

function regime(value, low, high) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "unknown";
  if (numeric <= low) return "low";
  if (numeric >= high) return "high";
  return "mid";
}

function startingChromaticIdentity(candidate) {
  const score = candidate?.scoreArtifact?.score || {};
  const palette = score.palette || {};
  const nativeColorRelationship = candidate?.timeline?.nativeColor?.relationship || "none";
  const identity = {
    paletteLogic: palette.logic || "unknown",
    nativeColorRelationship,
    contrastRegime: regime(palette.contrastBias, -0.25, 0.25),
    bleedRegime: regime(palette.bleed, 0.33, 0.67),
  };
  return deepFreeze({
    ...identity,
    topologyChromaticPair: `${score.topology || "unknown"}::${canonicalStringify(identity)}`,
  });
}

function chromaticKey(candidate) {
  const identity = startingChromaticIdentity(candidate);
  return canonicalStringify({
    paletteLogic: identity.paletteLogic,
    nativeColorRelationship: identity.nativeColorRelationship,
    contrastRegime: identity.contrastRegime,
    bleedRegime: identity.bleedRegime,
  });
}

function baseIdentityKey(candidate) {
  const score = candidate?.scoreArtifact?.score || {};
  return canonicalStringify({
    topology: score.topology || null,
    structure: score.primitiveField?.structure || "scope",
    dynamics: score.primitiveField?.dynamics || "inertial",
  });
}

function toastmoodFieldCoverage(candidates = []) {
  const laneIds = new Set();
  const chromatic = new Set();
  const pairs = new Set();
  const baseIdentities = new Set();
  const topologies = new Set();
  for (const candidate of candidates) {
    if (candidate?.toastmoodLane?.id) laneIds.add(candidate.toastmoodLane.id);
    const identity = startingChromaticIdentity(candidate);
    chromatic.add(chromaticKey(candidate));
    pairs.add(identity.topologyChromaticPair);
    baseIdentities.add(baseIdentityKey(candidate));
    if (candidate?.scoreArtifact?.score?.topology) topologies.add(candidate.scoreArtifact.score.topology);
  }
  return deepFreeze({
    laneCount: laneIds.size,
    chromaticIdentityCount: chromatic.size,
    topologyChromaticPairCount: pairs.size,
    baseIdentityCount: baseIdentities.size,
    topologyCount: topologies.size,
  });
}

function laneSeed(rootSeed, laneId) {
  return `ht-toastmood-field:${hashCanonical({ rootSeed: String(rootSeed), laneId }, FIELD_DOMAIN)}`;
}

function candidateNovelty(candidate, selected) {
  const chromatic = chromaticKey(candidate);
  const pair = startingChromaticIdentity(candidate).topologyChromaticPair;
  const baseIdentity = baseIdentityKey(candidate);
  const topology = candidate.scoreArtifact.score.topology;
  const existingChromatic = new Set(selected.map(chromaticKey));
  const existingPairs = new Set(selected.map((item) => startingChromaticIdentity(item).topologyChromaticPair));
  const existingBases = new Set(selected.map(baseIdentityKey));
  const existingTopologies = new Set(selected.map((item) => item.scoreArtifact.score.topology));
  return (
    (existingChromatic.has(chromatic) ? 0 : 16) +
    (existingPairs.has(pair) ? 0 : 12) +
    (existingBases.has(baseIdentity) ? 0 : 8) +
    (existingTopologies.has(topology) ? 0 : 4)
  );
}

function annotateLane(candidate, lane, sourceFamilyHash, sourceRootSeed) {
  const laneEvidence = deepFreeze({
    id: lane.id,
    name: lane.name,
    contractVersion: lane.contractVersion,
    semanticClass: lane.semanticClass,
    sourceFamilyHash,
    sourceRootSeed,
  });
  const derivation = structuredClone(candidate.scoreArtifact.derivation || {});
  derivation.policy = {
    ...(derivation.policy || {}),
    toastmoodFieldPolicy: TOASTMOOD_FIELD_POLICY,
    toastmoodLaneId: lane.id,
    toastmoodSourceFamilyHash: sourceFamilyHash,
  };
  const scoreArtifact = typeof base.artifact === "function"
    ? base.artifact(candidate.scoreArtifact.score, derivation)
    : candidate.scoreArtifact;
  return deepFreeze({
    ...candidate,
    scoreArtifact,
    scoreAddress: scoreArtifact.address,
    toastmoodLane: laneEvidence,
    startingChromaticIdentity: startingChromaticIdentity(candidate),
  });
}

function chooseLaneCandidate(sourceFamily, lane, selected, sourceRootSeed) {
  const ranked = sourceFamily.candidates
    .map((candidate) => annotateLane(candidate, lane, sourceFamily.familyHash, sourceRootSeed))
    .map((candidate) => ({ candidate, merit: candidateNovelty(candidate, selected) }))
    .sort((left, right) => {
      if (left.merit !== right.merit) return right.merit - left.merit;
      return left.candidate.scoreAddress.localeCompare(right.candidate.scoreAddress);
    });
  return ranked[0].candidate;
}

function reindexCandidate(candidate, index) {
  return deepFreeze({ ...candidate, index });
}

function familyFromCandidates({ sourceFamilies, candidates, options, fieldEvidence }) {
  const first = candidates[0];
  const locks = [...new Set((options.locks || []).map(String))].sort();
  const shortfall = candidates.length < Number(options.count || 6)
    ? {
        requested: Number(options.count || 6),
        produced: candidates.length,
        reason: "toastmood-field-could-not-cover-requested-count",
      }
    : null;
  const core = {
    schema: sourceFamilies[0].schema,
    policy: TOASTMOOD_FIELD_POLICY,
    scoreSchema: sourceFamilies[0].scoreSchema,
    prng: sourceFamilies[0].prng,
    rootSeed: String(options.rootSeed),
    parentScoreRef: null,
    baselineScoreRef: null,
    constraintPackId: sourceFamilies[0].constraintPackId,
    analysisHash: first.timeline.analysisHash,
    constraintsHash: first.timeline.constraintsHash,
    rendererProfileHash: first.timeline.rendererProfileHash,
    locks,
    requestedCount: Number(options.count || 6),
    producedCount: candidates.length,
    roles: candidates.map((candidate) => `toastmood:${candidate.toastmoodLane.id}`),
    scoreAddresses: candidates.map((candidate) => candidate.scoreAddress),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    shortfall,
    phase: "initial",
    toastmoodField: fieldEvidence,
  };
  const prePlanFamily = {
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  };
  const mutationLattice = typeof base.buildMutationLatticePlan === "function"
    ? base.buildMutationLatticePlan({
        family: prePlanFamily,
        constraints: options.garmentConstraints || options.constraints,
        rendererProfile: options.rendererProfile,
        toastFeelId: null,
        analysis: options.analysis,
        locks,
      })
    : null;
  const finalCore = mutationLattice ? { ...core, mutationLattice } : core;
  return deepFreeze({
    ...finalCore,
    familyHash: hashCanonical(finalCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateToastmoodFieldCandidateSet(options = {}) {
  const count = Number(options.count || 6);
  if (count !== 6) throw new TypeError("Toastmood Field v1 currently requires exactly six candidates.");
  if (options.parentScore) {
    throw new TypeError("Toastmood Field v1 is an initial-family policy, not a parent mutation policy.");
  }
  const lanes = ordinaryToastFeels();
  if (lanes.length !== 6) {
    throw new Error(`Toastmood Field v1 requires six ordinary canonical Toast Feels; found ${lanes.length}.`);
  }
  const selected = [];
  const sourceFamilies = [];
  for (const lane of lanes) {
    const sourceRootSeed = laneSeed(options.rootSeed, lane.id);
    const sourceFamily = base.generateCandidateSet({
      ...options,
      rootSeed: sourceRootSeed,
      count: 6,
      phase: "initial",
      toastFeelId: lane.id,
    });
    sourceFamilies.push(sourceFamily);
    selected.push(chooseLaneCandidate(sourceFamily, lane, selected, sourceRootSeed));
  }
  const candidates = selected.map(reindexCandidate);
  const coverage = toastmoodFieldCoverage(candidates);
  const fieldCore = {
    policy: TOASTMOOD_FIELD_POLICY,
    mandatoryPreselection: false,
    ordinaryFeelIds: lanes.map((lane) => lane.id),
    candidateLanes: candidates.map((candidate) => ({
      id: candidate.toastmoodLane.id,
      name: candidate.toastmoodLane.name,
      contractVersion: candidate.toastmoodLane.contractVersion,
      sourceFamilyHash: candidate.toastmoodLane.sourceFamilyHash,
    })),
    sourceFamilyHashes: sourceFamilies.map((family) => family.familyHash),
    coverage,
  };
  const toastmoodField = deepFreeze({
    ...fieldCore,
    fieldSha256: hashCanonical(fieldCore, FIELD_DOMAIN),
  });
  return familyFromCandidates({ sourceFamilies, candidates, options, fieldEvidence: toastmoodField });
}

function sameValue(left, right) {
  return canonicalStringify(left ?? null) === canonicalStringify(right ?? null);
}

function assertCrossLocks(parentA, parentB, locks) {
  for (const lock of [...new Set((locks || []).map(String))].sort()) {
    if (!sameValue(parentA[lock], parentB[lock])) {
      const error = new Error(`CROSS_LOCK_CONFLICT: locked axis ${lock} differs between parents.`);
      error.code = "CROSS_LOCK_CONFLICT";
      throw error;
    }
    if (lock === "topology" && !sameValue(parentA.primitiveField?.structure, parentB.primitiveField?.structure)) {
      const error = new Error("CROSS_LOCK_CONFLICT: topology lock also protects primitive structure.");
      error.code = "CROSS_LOCK_CONFLICT";
      throw error;
    }
    if (lock === "motion" && !sameValue(parentA.primitiveField?.dynamics, parentB.primitiveField?.dynamics)) {
      const error = new Error("CROSS_LOCK_CONFLICT: motion lock also protects primitive dynamics.");
      error.code = "CROSS_LOCK_CONFLICT";
      throw error;
    }
  }
}

function hybridScore(parentA, parentB, plan) {
  const dominant = plan.dominant === "A" ? parentA : parentB;
  const other = plan.dominant === "A" ? parentB : parentA;
  const hybrid = structuredClone(dominant);
  for (const axis of plan.inheritedFromOther) {
    if (Object.hasOwn(other, axis)) hybrid[axis] = structuredClone(other[axis]);
  }
  return hybrid;
}

function crossChildSeed(rootSeed, planId, parentScoreRefs) {
  return `ht-cross:${hashCanonical({
    rootSeed: String(rootSeed),
    planId,
    parentScoreRefs,
  }, CROSS_DOMAIN)}`;
}

function lineageArtifact(candidate, lineage) {
  if (typeof base.artifact !== "function") return candidate;
  const derivation = structuredClone(candidate.scoreArtifact.derivation || {});
  derivation.operation = "two-parent-cross";
  derivation.parentScoreRefs = [...lineage.parentScoreRefs];
  derivation.policy = {
    ...(derivation.policy || {}),
    crossPolicy: CROSS_POLICY,
    crossPlanId: lineage.planId,
    dominantParent: lineage.dominantParent,
    inheritedFromOther: [...lineage.inheritedFromOther],
    boundedMutationSeed: lineage.boundedMutationSeed,
  };
  const scoreArtifact = base.artifact(candidate.scoreArtifact.score, derivation);
  return deepFreeze({
    ...candidate,
    scoreArtifact,
    scoreAddress: scoreArtifact.address,
  });
}

function generateCrossCandidateSet(options = {}) {
  const parents = Array.isArray(options.parentCandidates) ? options.parentCandidates : [];
  if (parents.length !== 2) throw new TypeError("CROSS requires exactly two current parent candidates.");
  if (parents[0].scoreAddress === parents[1].scoreAddress) {
    throw new TypeError("CROSS requires two distinct parent candidates.");
  }
  const parentScoreRefs = parents.map((candidate) => candidate.scoreAddress);
  const parentScores = parents.map((candidate) => candidate.scoreArtifact.score);
  const locks = [...new Set((options.locks || []).map(String))].sort();
  assertCrossLocks(parentScores[0], parentScores[1], locks);

  const candidates = CROSS_PLANS.map((plan, index) => {
    const inherited = hybridScore(parentScores[0], parentScores[1], plan);
    const boundedMutationSeed = crossChildSeed(options.rootSeed, plan.id, parentScoreRefs);
    const dominantIndex = plan.dominant === "A" ? 0 : 1;
    const childFamily = base.generateCandidateSet({
      ...options,
      parentCandidates: undefined,
      parentScore: inherited,
      locks,
      rootSeed: boundedMutationSeed,
      count: 1,
      phase: "branch",
      toastFeelId: options.toastFeelId || null,
      parentNativeColorPlan: parents[dominantIndex].timeline?.nativeColor || null,
    });
    const lineage = deepFreeze({
      schema: CROSS_SCHEMA,
      policy: CROSS_POLICY,
      planId: plan.id,
      parentScoreRefs,
      dominantParent: plan.dominant,
      inheritedFromOther: [...plan.inheritedFromOther],
      boundedMutationSeed,
    });
    const child = lineageArtifact(childFamily.candidates[0], lineage);
    return deepFreeze({
      ...child,
      index,
      role: `cross:${plan.id}`,
      crossLineage: lineage,
      toastmoodLane: parents[dominantIndex].toastmoodLane || null,
    });
  });

  const first = candidates[0];
  const crossCore = {
    schema: CROSS_SCHEMA,
    policy: CROSS_POLICY,
    parentScoreRefs,
    parentFamilyHash: options.parentFamilyHash || null,
    plans: CROSS_PLANS.map((plan) => ({
      id: plan.id,
      dominant: plan.dominant,
      inheritedFromOther: [...plan.inheritedFromOther],
    })),
    locks,
  };
  const cross = deepFreeze({
    ...crossCore,
    crossSha256: hashCanonical(crossCore, CROSS_DOMAIN),
  });
  const core = {
    schema: "haunted-toaster/candidate-family/v1",
    policy: CROSS_POLICY,
    scoreSchema: parents[0].scoreArtifact.score.schema,
    prng: parents[0].scoreArtifact.score.prng,
    rootSeed: String(options.rootSeed),
    parentScoreRef: null,
    parentScoreRefs,
    baselineScoreRef: null,
    constraintPackId: options.garmentConstraints?.id || options.constraints?.id || null,
    analysisHash: first.timeline.analysisHash,
    constraintsHash: first.timeline.constraintsHash,
    rendererProfileHash: first.timeline.rendererProfileHash,
    locks,
    requestedCount: 6,
    producedCount: 6,
    roles: candidates.map((candidate) => candidate.role),
    scoreAddresses: candidates.map((candidate) => candidate.scoreAddress),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    shortfall: null,
    phase: "cross",
    cross,
  };
  const prePlanFamily = {
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  };
  const mutationLattice = typeof base.buildMutationLatticePlan === "function"
    ? base.buildMutationLatticePlan({
        family: prePlanFamily,
        constraints: options.garmentConstraints || options.constraints,
        rendererProfile: options.rendererProfile,
        toastFeelId: options.toastFeelId || null,
        analysis: options.analysis,
        locks,
      })
    : null;
  const finalCore = mutationLattice ? { ...core, mutationLattice } : core;
  return deepFreeze({
    ...finalCore,
    familyHash: hashCanonical(finalCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCandidateSet(options = {}) {
  const wantsField = options.phase === "initial" && !options.parentScore && !options.toastFeelId;
  if (wantsField) return generateToastmoodFieldCandidateSet(options);
  return base.generateCandidateSet(options);
}

function replayCandidateFamily(family, options = {}) {
  if (family?.policy === TOASTMOOD_FIELD_POLICY) {
    const replayed = generateToastmoodFieldCandidateSet({
      ...options,
      rootSeed: family.rootSeed,
      count: family.requestedCount,
      phase: "initial",
      toastFeelId: null,
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
  return base.replayCandidateFamily(family, options);
}

module.exports = {
  ...base,
  CROSS_PLANS,
  CROSS_POLICY,
  CROSS_SCHEMA,
  TOASTMOOD_FIELD_POLICY,
  generateCandidateSet,
  generateCrossCandidateSet,
  generateToastmoodFieldCandidateSet,
  replayCandidateFamily,
  startingChromaticIdentity,
  toastmoodFieldCoverage,
};