const { canonicalStringify, deepFreeze, hashCanonical } = require("./canonical.cjs");
const nativeColorGeneration = require("./native-color-generation.cjs");
const schema = require("./schema.cjs");
const { CONVERGE_POLICY, COVERAGE_PROJECTION_ID } = require("./converge-frontier.cjs");
const { STOMP_POLICY } = require("./stomp-generation.cjs");
const { MADD_CLOWN_POLICY } = require("./toast-feel-generation.cjs");
const {
  MUTATION_LATTICE_RENDERER_PROFILE_ID,
  MUTATION_LATTICE_RENDERER_POLICY,
} = require("./renderer-policy.cjs");
const { getToastFeel } = require("../toast-feels.cjs");
const {
  SHAPE_PACK_TOPOLOGIES,
  attachTopologyArc,
} = require("./topology-arc.cjs");

const MUTATION_LATTICE_POLICY = "mutation-lattice-v1";
const MUTATION_LATTICE_SCHEMA = "haunted-toaster/mutation-lattice-plan/v1";
const MUTATION_LATTICE_REFUSAL_SCHEMA = "haunted-toaster/mutation-lattice-refusal/v1";
const MUTATION_LATTICE_POOL_POLICY = "mutation-lattice-pool-v1";
const LATTICE_LAYERS = Object.freeze(["skeleton", "body", "frame", "skin", "weather", "time"]);
const TARGET_TOPOLOGY_COUNT = 4;
const TARGET_SIGNATURE_COUNT = 4;
const POOL_ATTEMPTS = 4;

function isV3(options = {}) {
  return options.rendererProfile?.id === MUTATION_LATTICE_RENDERER_PROFILE_ID;
}

function normalizeLocks(locks = []) {
  return [...new Set(locks.map(String))].sort();
}

function exactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return canonicalStringify(actual) === canonicalStringify([...keys].sort());
}

function fieldEnvelopePolicy(topology) {
  if (topology === "linear") return "legacy-linear";
  if (topology === "elastic-spine") return "shape-pack-elastic-spine-v1";
  if (topology === "split-horizon") return "shape-pack-split-horizon-v1";
  if (topology === "cathedral-fan") return "shape-pack-cathedral-fan-v1";
  if (topology === "echo-tunnel") return "shape-pack-echo-tunnel-v1";
  return "bounded-full-height-v1";
}

function stripExtendedScore(score) {
  const core = structuredClone(score);
  delete core.primitiveField;
  delete core.atmosphere;
  return core;
}

function assertCandidateAuthority(candidate, constraints = null) {
  if (!candidate?.scoreArtifact?.score || !candidate?.timeline) {
    throw new TypeError("Mutation Lattice requires candidate score and timeline authority.");
  }
  const parsed = schema.parseVisualScore(stripExtendedScore(candidate.scoreArtifact.score));
  if (!parsed.ok) {
    throw new TypeError(parsed.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  if (constraints && !constraints.topology?.allowed?.includes(candidate.scoreArtifact.score.topology)) {
    throw new TypeError(`Candidate topology ${candidate.scoreArtifact.score.topology} is outside authoritative constraints.`);
  }
  if (candidate.scoreArtifact.address && candidate.scoreArtifact.address !== candidate.scoreAddress) {
    throw new Error("Candidate scoreAddress disagrees with score artifact authority.");
  }
  if (candidate.timelineHash && candidate.timeline.timelineHash && candidate.timelineHash !== candidate.timeline.timelineHash) {
    throw new Error("Candidate timelineHash disagrees with accepted timeline authority.");
  }
  return candidate.scoreArtifact.score;
}

function signatureForCandidate(candidate, constraints = null) {
  const score = assertCandidateAuthority(candidate, constraints);
  const field = score.primitiveField || { structure: "scope", dynamics: "inertial" };
  const layers = deepFreeze({
    skeleton: { topology: score.topology },
    body: { structure: field.structure, dynamics: field.dynamics },
    frame: { fieldEnvelope: fieldEnvelopePolicy(score.topology), camera: score.camera.grammar },
    skin: {
      material: score.material.texture,
      palette: score.palette.logic,
      nativeColor: candidate.timeline.nativeColor?.relationship || "none",
    },
    weather: { atmosphere: score.atmosphere || "none" },
    time: {
      temporalDensity: score.temporalDensity,
      possessionArc: candidate.timeline.possessionArc?.planSha256 || null,
    },
  });
  const skeletonBodyFrame = hashCanonical({
    skeleton: layers.skeleton,
    body: layers.body,
    frame: layers.frame,
  }, "HauntedToaster-MutationLattice-SBF-v1");
  const crossLayerSignature = hashCanonical(layers, "HauntedToaster-MutationLattice-Signature-v1");
  return deepFreeze({
    index: candidate.index,
    scoreAddress: candidate.scoreAddress,
    timelineHash: candidate.timelineHash,
    topology: score.topology,
    shapePack: SHAPE_PACK_TOPOLOGIES.includes(score.topology),
    layers,
    skeletonBodyFrame,
    crossLayerSignature,
    topologyArcPlanSha256: candidate.timeline.topologyArc?.planSha256 || null,
    apparitionCount: candidate.timeline.topologyArc?.windowCount || 0,
  });
}

function validateConvergeAuthority(family) {
  const converge = family?.converge;
  if (!converge?.enabled) return false;
  if (converge.policy !== CONVERGE_POLICY) throw new Error("CONVERGE family policy evidence is invalid.");
  const candidate = family.candidates?.find((item) => item.role === "converge-frontier") || family.candidates?.at(-1);
  const policy = candidate?.scoreArtifact?.derivation?.policy;
  const frontier = candidate?.frontierEvidence;
  if (!candidate || policy?.candidatePolicy !== CONVERGE_POLICY || frontier?.policy !== CONVERGE_POLICY) {
    throw new Error("CONVERGE family is missing authoritative candidate/frontier evidence.");
  }
  if (policy.selectedFrontierTarget && frontier.selectedFrontierTarget &&
      canonicalStringify(policy.selectedFrontierTarget) !== canonicalStringify(frontier.selectedFrontierTarget)) {
    throw new Error("CONVERGE frontier target disagrees with score derivation authority.");
  }
  const canRecompute = policy.rootSeed && policy.parentScoreRef && policy.historySetHash &&
    policy.coverageProjectionId && policy.selectedFrontierTarget && policy.derivedSeed;
  if (canRecompute) {
    const expectedSeed = `ht-converge:${hashCanonical({
      rootSeed: String(policy.rootSeed),
      parentScoreRef: policy.parentScoreRef,
      historySetHash: policy.historySetHash,
      coverageProjectionId: policy.coverageProjectionId,
      selectedFrontierTarget: policy.selectedFrontierTarget,
    }, "HauntedToaster-ConvergeCandidateSeed-v1")}`;
    if (policy.coverageProjectionId !== COVERAGE_PROJECTION_ID || policy.derivedSeed !== expectedSeed) {
      throw new Error("CONVERGE derived seed/frontier provenance does not recompute.");
    }
  }
  return true;
}

function deriveAuthoritativeFamilyType(family) {
  if (!family || !Array.isArray(family.candidates)) throw new TypeError("Candidate family evidence is required.");
  if (family.policy === STOMP_POLICY || family.phase === "stomp") return "stomp";
  if (family.policy === MADD_CLOWN_POLICY && family.toastFeel?.stompPolicy === STOMP_POLICY) return "stomp";
  if (family.converge?.enabled) {
    validateConvergeAuthority(family);
    return "converge";
  }
  return "ordinary";
}

function coverageFor(signatures) {
  const topologies = new Set(signatures.map((item) => item.topology));
  const cross = new Set(signatures.map((item) => item.crossLayerSignature));
  const sbf = new Set(signatures.map((item) => item.skeletonBodyFrame));
  return deepFreeze({
    authoritativeTopologyCount: topologies.size,
    crossLayerSignatureCount: cross.size,
    skeletonBodyFrameSignatureCount: sbf.size,
    duplicateSkeletonBodyFrameCount: signatures.length - sbf.size,
    hasShapePackTopology: signatures.some((item) => item.shapePack),
    hasApparition: signatures.some((item) => item.apparitionCount > 0),
  });
}

function makeRefusal({ unmetTargets, locks, constraints, candidateCount }) {
  const core = {
    schema: MUTATION_LATTICE_REFUSAL_SCHEMA,
    reason: "coverage-impossible-under-authoritative-locks-or-constraints",
    unmetTargets: [...unmetTargets].sort(),
    locks: normalizeLocks(locks),
    constraintTopologyCount: new Set(constraints?.topology?.allowed || []).size,
    availableCandidateCount: candidateCount,
  };
  return deepFreeze({
    ...core,
    refusalSha256: hashCanonical(core, "HauntedToaster-MutationLatticeRefusal-v1"),
  });
}

function buildMutationLatticePlan({
  family,
  constraints,
  rendererProfile,
  toastFeelId = null,
  analysis = null,
  priorPlanSha256 = null,
  locks = undefined,
} = {}) {
  if (rendererProfile?.id !== MUTATION_LATTICE_RENDERER_PROFILE_ID) {
    throw new TypeError("Mutation Lattice is a toaster-raster-4 / visual-language-v3 contract.");
  }
  const authoritativeLocks = normalizeLocks(family?.locks || []);
  if (locks !== undefined && canonicalStringify(normalizeLocks(locks)) !== canonicalStringify(authoritativeLocks)) {
    throw new Error("Caller locks disagree with authoritative family locks.");
  }
  const familyType = deriveAuthoritativeFamilyType(family);
  const signatures = family.candidates.map((candidate) => signatureForCandidate(candidate, constraints));
  const coverage = coverageFor(signatures);
  const topologyTarget = Math.min(TARGET_TOPOLOGY_COUNT, new Set(constraints?.topology?.allowed || []).size || TARGET_TOPOLOGY_COUNT);
  const signatureTarget = Math.min(TARGET_SIGNATURE_COUNT, signatures.length);
  const shapeEligible = (constraints?.topology?.allowed || []).some((topology) => SHAPE_PACK_TOPOLOGIES.includes(topology));
  const apparitionEligible = !authoritativeLocks.includes("topology") && Boolean(
    family.candidates.some((candidate) => candidate.timeline?.topologyArc) ||
    (Array.isArray(analysis?.sections) && analysis.sections.length > 1)
  );
  const unmetTargets = [];
  if (coverage.authoritativeTopologyCount < topologyTarget) unmetTargets.push("authoritative-topology-coverage");
  if (coverage.crossLayerSignatureCount < signatureTarget) unmetTargets.push("cross-layer-signature-coverage");
  if (coverage.duplicateSkeletonBodyFrameCount > 0) unmetTargets.push("duplicate-skeleton-body-frame-signature");
  if (shapeEligible && !coverage.hasShapePackTopology) unmetTargets.push("shape-pack-topology");
  if (apparitionEligible && !coverage.hasApparition) unmetTargets.push("eligible-apparition");
  const refusal = unmetTargets.length ? makeRefusal({
    unmetTargets,
    locks: authoritativeLocks,
    constraints,
    candidateCount: signatures.length,
  }) : null;
  const core = {
    schema: MUTATION_LATTICE_SCHEMA,
    policyVersion: MUTATION_LATTICE_POLICY,
    familyType,
    locks: authoritativeLocks,
    toastFeelId,
    candidateCount: signatures.length,
    targets: {
      authoritativeTopologyCount: topologyTarget,
      crossLayerSignatureCount: signatureTarget,
      uniqueSkeletonBodyFrame: true,
      shapePackTopology: shapeEligible,
      apparition: apparitionEligible,
    },
    signatures,
    coverage,
    refusal,
    priorPlanSha256: priorPlanSha256 || null,
  };
  return deepFreeze({
    ...core,
    planSha256: hashCanonical(core, "HauntedToaster-MutationLatticePlan-v1"),
  });
}

function validateMutationLatticeEvidence(plan) {
  try {
    const planKeys = [
      "schema", "policyVersion", "familyType", "locks", "toastFeelId", "candidateCount",
      "targets", "signatures", "coverage", "refusal", "priorPlanSha256", "planSha256",
    ];
    if (!exactKeys(plan, planKeys)) return { ok: false, reason: "plan-keys" };
    if (plan.schema !== MUTATION_LATTICE_SCHEMA || plan.policyVersion !== MUTATION_LATTICE_POLICY) {
      return { ok: false, reason: "plan-identity" };
    }
    if (plan.refusal) {
      const refusalKeys = [
        "schema", "reason", "unmetTargets", "locks", "constraintTopologyCount",
        "availableCandidateCount", "refusalSha256",
      ];
      if (!exactKeys(plan.refusal, refusalKeys)) return { ok: false, reason: "refusal-keys" };
      const { refusalSha256, ...refusalCore } = plan.refusal;
      if (plan.refusal.schema !== MUTATION_LATTICE_REFUSAL_SCHEMA ||
          hashCanonical(refusalCore, "HauntedToaster-MutationLatticeRefusal-v1") !== refusalSha256) {
        return { ok: false, reason: "refusal-hash" };
      }
    }
    const { planSha256, ...core } = plan;
    if (hashCanonical(core, "HauntedToaster-MutationLatticePlan-v1") !== planSha256) {
      return { ok: false, reason: "plan-hash" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

function preliminarySignature(candidate, constraints) {
  return signatureForCandidate(candidate, constraints);
}

function samplingSeeds(rootSeed, attempts) {
  return Array.from({ length: attempts }, (_, index) => index === 0
    ? String(rootSeed)
    : `ht-lattice:${hashCanonical({ rootSeed: String(rootSeed), attempt: index }, "HauntedToaster-MutationLatticeSamplingSeed-v1")}`);
}

function affinityMerit(signature, feel) {
  const affinity = feel?.affinity;
  if (!affinity) return 0;
  let score = 0;
  const layers = signature.layers;
  if (affinity.skeleton?.topologies?.includes(layers.skeleton.topology)) score += 12;
  if (affinity.body?.structures?.includes(layers.body.structure)) score += 5;
  if (affinity.body?.dynamics?.includes(layers.body.dynamics)) score += 5;
  if (affinity.frame?.cameras?.includes(layers.frame.camera)) score += 4;
  if (affinity.skin?.materials?.includes(layers.skin.material)) score += 4;
  if (affinity.skin?.palettes?.includes(layers.skin.palette)) score += 4;
  if (affinity.skin?.nativeColor?.includes(layers.skin.nativeColor)) score += 3;
  if (affinity.weather?.atmospheres?.includes(layers.weather.atmosphere)) score += 4;
  if (affinity.time?.temporalDensity?.includes(layers.time.temporalDensity)) score += 4;
  return score;
}

function selectFromPool(pool, constraints, rootSeed, count = 6, toastFeelId = null) {
  const feel = toastFeelId ? getToastFeel(toastFeelId) : null;
  const unique = new Map();
  for (const candidate of pool) if (!unique.has(candidate.scoreAddress)) unique.set(candidate.scoreAddress, candidate);
  const remaining = [...unique.values()];
  const selected = [];
  while (selected.length < count && remaining.length) {
    const selectedSignatures = selected.map((candidate) => preliminarySignature(candidate, constraints));
    const usedTopologies = new Set(selectedSignatures.map((item) => item.topology));
    const usedCross = new Set(selectedSignatures.map((item) => item.crossLayerSignature));
    const usedSbf = new Set(selectedSignatures.map((item) => item.skeletonBodyFrame));
    const hasShape = selectedSignatures.some((item) => item.shapePack);
    remaining.sort((left, right) => {
      function merit(candidate) {
        const signature = preliminarySignature(candidate, constraints);
        let value = 0;
        if (!hasShape && signature.shapePack) value += 2000;
        if (!usedTopologies.has(signature.topology) && usedTopologies.size < TARGET_TOPOLOGY_COUNT) value += 1200;
        if (!usedSbf.has(signature.skeletonBodyFrame)) value += 600;
        if (!usedCross.has(signature.crossLayerSignature)) value += 300;
        value += affinityMerit(signature, feel) * 10;
        const tie = hashCanonical({ rootSeed: String(rootSeed), scoreAddress: candidate.scoreAddress }, "HauntedToaster-MutationLatticeSelectionTie-v1");
        return { value, tie };
      }
      const a = merit(left);
      const b = merit(right);
      return b.value - a.value || a.tie.localeCompare(b.tie);
    });
    selected.push(remaining.shift());
  }
  return selected.map((candidate, index) => deepFreeze({ ...candidate, index, slotIndex: index }));
}

function rebuildSelectedFamily(sourceFamily, selected, { rootSeed, seeds, sourceFamilyHashes }) {
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    scoreAddresses: _scoreAddresses,
    timelineHashes: _timelineHashes,
    rootSeed: _rootSeed,
    roles: _roles,
    producedCount: _producedCount,
    shortfall: _shortfall,
    mutationLattice: _mutationLattice,
    latticeSampling: _latticeSampling,
    ...stableCore
  } = sourceFamily;
  const core = {
    ...structuredClone(stableCore),
    rootSeed: String(rootSeed),
    producedCount: selected.length,
    roles: selected.map((candidate) => candidate.role),
    scoreAddresses: selected.map((candidate) => candidate.scoreAddress),
    timelineHashes: selected.map((candidate) => candidate.timelineHash),
    shortfall: selected.length < 6 ? {
      requested: 6,
      produced: selected.length,
      reason: "mutation-lattice-pool-exhausted-lawful-distinct-candidates",
    } : null,
    latticeSampling: {
      policyVersion: MUTATION_LATTICE_POOL_POLICY,
      seeds,
      sourceFamilyHashes,
    },
  };
  return deepFreeze({
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates: selected,
  });
}

function pooledFamily(options, generator = nativeColorGeneration.generateCandidateSet) {
  const feel = options.toastFeelId ? getToastFeel(options.toastFeelId) : null;
  const attempts = feel?.semanticClass === "madd-clown" ? 1 : POOL_ATTEMPTS;
  const seeds = samplingSeeds(options.rootSeed, attempts);
  const families = seeds.map((rootSeed) => generator({ ...options, rootSeed }));
  if (families.length === 1) return families[0];
  const selected = selectFromPool(
    families.flatMap((family) => family.candidates),
    options.garmentConstraints || options.constraints,
    options.rootSeed,
    6,
    options.toastFeelId || null,
  );
  return rebuildSelectedFamily(families[0], selected, {
    rootSeed: options.rootSeed,
    seeds,
    sourceFamilyHashes: families.map((family) => family.familyHash),
  });
}

function attachArcsToFamily(baseFamily, options, priorPlanSha256 = null) {
  if (baseFamily.mutationLattice) {
    const validation = validateMutationLatticeEvidence(baseFamily.mutationLattice);
    if (!validation.ok) throw new Error(`Existing Mutation Lattice evidence is invalid: ${validation.reason}.`);
  }
  const constraints = options.garmentConstraints || options.constraints;
  const locks = normalizeLocks(baseFamily.locks || []);
  const candidates = baseFamily.candidates.map((candidate) => {
    const timeline = attachTopologyArc(candidate.timeline, {
      analysis: options.analysis,
      score: candidate.scoreArtifact.score,
      constraints,
      locks,
      rootSeed: `${baseFamily.rootSeed}:topology-arc:${candidate.scoreAddress}`,
      toastFeelId: options.toastFeelId || baseFamily.toastFeel?.id || null,
    });
    return deepFreeze({ ...candidate, timeline, timelineHash: timeline.timelineHash });
  });
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    timelineHashes: _timelineHashes,
    mutationLattice: _mutationLattice,
    ...stableCore
  } = baseFamily;
  const prePlanCore = {
    ...structuredClone(stableCore),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
  };
  const prePlanFamily = {
    ...prePlanCore,
    familyHash: hashCanonical(prePlanCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  };
  const plan = buildMutationLatticePlan({
    family: prePlanFamily,
    constraints,
    rendererProfile: options.rendererProfile,
    toastFeelId: options.toastFeelId || baseFamily.toastFeel?.id || null,
    analysis: options.analysis,
    priorPlanSha256,
  });
  const core = {
    ...prePlanCore,
    mutationLattice: plan,
  };
  return deepFreeze({
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCandidateSet(options = {}) {
  if (!isV3(options)) return nativeColorGeneration.generateCandidateSet(options);
  const baseFamily = pooledFamily(options, nativeColorGeneration.generateCandidateSet);
  return attachArcsToFamily(baseFamily, options);
}

function generateStompCandidateSet(options = {}) {
  if (!isV3(options)) return nativeColorGeneration.generateStompCandidateSet(options);
  const baseFamily = nativeColorGeneration.generateStompCandidateSet(options);
  return attachArcsToFamily(baseFamily, options);
}

function replaceFinalCandidateWithConverge(family, options = {}) {
  if (!isV3(options)) return nativeColorGeneration.replaceFinalCandidateWithConverge(family, options);
  const prior = family.mutationLattice || null;
  if (!prior) throw new Error("Raster-4 CONVERGE requires recorded Mutation Lattice authority.");
  const validation = validateMutationLatticeEvidence(prior);
  if (!validation.ok) throw new Error(`Raster-4 CONVERGE refuses invalid prior lattice evidence: ${validation.reason}.`);
  const baseFamily = nativeColorGeneration.replaceFinalCandidateWithConverge(family, options);
  return attachArcsToFamily(baseFamily, options, prior.planSha256);
}

function replayCandidateFamily(family, options = {}) {
  if (family?.mutationLattice) {
    const validation = validateMutationLatticeEvidence(family.mutationLattice);
    if (!validation.ok) throw new Error(`Cannot replay invalid Mutation Lattice evidence: ${validation.reason}.`);
  }
  if (!isV3(options)) return nativeColorGeneration.replayCandidateFamily(family, options);
  const familyType = deriveAuthoritativeFamilyType(family);
  let replayed;
  if (familyType === "stomp" && family.policy === STOMP_POLICY) {
    replayed = generateStompCandidateSet({
      ...options,
      toastFeelId: options.toastFeelId || family.toastFeel?.id,
      locks: family.locks,
      rootSeed: family.rootSeed,
      count: family.requestedCount,
    });
  } else {
    replayed = generateCandidateSet({
      ...options,
      toastFeelId: options.toastFeelId || family.toastFeel?.id,
      locks: family.locks,
      rootSeed: family.rootSeed,
      count: family.requestedCount,
      phase: family.phase,
    });
    if (familyType === "converge") {
      replayed = replaceFinalCandidateWithConverge(replayed, {
        ...options,
        toastFeelId: options.toastFeelId || family.toastFeel?.id,
        locks: family.locks,
        rootSeed: family.rootSeed,
      });
    }
  }
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
  LATTICE_LAYERS,
  MUTATION_LATTICE_POLICY,
  MUTATION_LATTICE_POOL_POLICY,
  MUTATION_LATTICE_REFUSAL_SCHEMA,
  MUTATION_LATTICE_SCHEMA,
  buildMutationLatticePlan,
  deriveAuthoritativeFamilyType,
  generateCandidateSet,
  generateStompCandidateSet,
  replaceFinalCandidateWithConverge,
  replayCandidateFamily,
  signatureForCandidate,
  validateConvergeAuthority,
  validateMutationLatticeEvidence,
};
