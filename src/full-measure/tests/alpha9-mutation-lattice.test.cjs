const test = require("node:test");
const assert = require("node:assert/strict");

const schema = require("../src/generation/schema.cjs");
const rendererPolicy = require("../src/generation/renderer-policy.cjs");
const { listToastFeels } = require("../src/toast-feels.cjs");
const {
  MUTATION_LATTICE_POLICY,
  buildMutationLatticePlan,
  deriveAuthoritativeFamilyType,
  validateMutationLatticeEvidence,
} = require("../src/generation/mutation-lattice-generation.cjs");
const {
  SHAPE_PACK_TOPOLOGIES,
  topologyRegistryForExecution,
} = require("../src/render/topology-compilers.cjs");
const { resolveFieldEnvelope } = require("../src/render/field-envelope.cjs");
const {
  TOPOLOGY_ARC_POLICY,
  planTopologyArc,
} = require("../src/generation/topology-arc.cjs");

const SHAPES = ["elastic-spine", "split-horizon", "cathedral-fan", "echo-tunnel"];
const LAYERS = ["skeleton", "body", "frame", "skin", "weather", "time"];

function score(overrides = {}) {
  return {
    schema: schema.VISUAL_SCORE_SCHEMA,
    seed: "alpha9-contract-seed",
    prng: "xoshiro256**/splitmix64-v1",
    topology: "circle",
    motion: { grammar: "drift", amplitude: 0.5, variance: 0.4 },
    palette: { logic: "analogous", bleed: 0.5, contrastBias: 0.1 },
    material: { texture: "grain", imperfection: 0.3 },
    lyric: { placement: "center", densityBias: 0 },
    camera: { grammar: "drift", variance: 0.3 },
    temporalDensity: "section",
    influence: {
      energyBias: 0,
      transientDensity: 0.4,
      lyricDensity: 0.3,
      contrastBias: 0,
      motionVariance: 0.4,
      imperfection: 0.3,
    },
    ...overrides,
  };
}

function constraints(topologies = [...schema.TOPOLOGIES]) {
  return {
    schema: schema.CONSTRAINTS_SCHEMA,
    id: "alpha9-contract",
    topology: { allowed: topologies },
    motion: {
      grammar: { allowed: ["still", "drift", "pulse", "orbit", "fracture"] },
      amplitude: { min: 0, max: 1 },
      variance: { min: 0, max: 1 },
    },
    palette: {
      logic: { allowed: ["garment", "analogous", "split-complement", "duotone"] },
      bleed: { min: 0, max: 1 },
      contrastBias: { min: -1, max: 1 },
    },
    material: {
      texture: { allowed: ["clean", "grain", "photocopy", "gate-weave"] },
      imperfection: { min: 0, max: 1 },
    },
    lyric: {
      placement: { allowed: ["lower-third", "center", "orbit", "ghost"] },
      densityBias: { min: -1, max: 1 },
    },
    camera: {
      grammar: { allowed: ["locked", "drift", "push", "orbit"] },
      variance: { min: 0, max: 1 },
    },
    temporalDensity: { allowed: ["frozen", "section", "phrase", "transient"] },
    influence: {
      energyBias: { min: -1, max: 1 },
      transientDensity: { min: 0, max: 1 },
      lyricDensity: { min: 0, max: 1 },
      contrastBias: { min: -1, max: 1 },
      motionVariance: { min: 0, max: 1 },
      imperfection: { min: 0, max: 1 },
    },
    patchPolicy: {
      maxPatches: 0,
      entropyBudget: 0,
      axes: {
        motion: { boundaries: [], transition: "interpolate", entropyCost: 4 },
        palette: { boundaries: [], transition: "crossfade", entropyCost: 6 },
        material: { boundaries: [], transition: "cut", entropyCost: 3 },
        lyric: { boundaries: [], transition: "cut", entropyCost: 2 },
        camera: { boundaries: [], transition: "interpolate", entropyCost: 5 },
      },
    },
  };
}

function candidate(index, topology, body = {}) {
  const candidateScore = score({
    seed: `candidate-${index}`,
    topology,
    primitiveField: body.primitiveField,
    atmosphere: body.atmosphere,
  });
  if (!body.primitiveField) delete candidateScore.primitiveField;
  if (!body.atmosphere) delete candidateScore.atmosphere;
  return {
    index,
    slotIndex: index,
    role: body.role || `slot-${index}`,
    scoreAddress: `score-${index}`,
    scoreArtifact: {
      score: candidateScore,
      derivation: body.derivation || {
        policy: { candidatePolicy: "coverage-before-randomness-v1", rootSeed: "root" },
      },
    },
    timeline: {
      baseState: candidateScore,
      timelineHash: `timeline-${index}`,
      nativeColor: body.nativeColor || null,
      possessionArc: body.possessionArc || null,
    },
    timelineHash: `timeline-${index}`,
    frontierEvidence: body.frontierEvidence || null,
  };
}

function family(candidates, overrides = {}) {
  return {
    schema: "haunted-toaster/candidate-family/v1",
    policy: "coverage-before-randomness-v1",
    rootSeed: "root",
    locks: [],
    requestedCount: 6,
    producedCount: candidates.length,
    scoreAddresses: candidates.map((item) => item.scoreAddress),
    timelineHashes: candidates.map((item) => item.timelineHash),
    familyHash: "family-fixture",
    candidates,
    ...overrides,
  };
}

test("alpha.9 is an explicit raster-4 / visual-language-v3 opt-in", () => {
  assert.equal(rendererPolicy.rendererPolicyForProfile({ id: "toaster-raster-4" }), "visual-language-v3");
  assert.equal(rendererPolicy.rendererPolicyForProfile({ id: "toaster-raster-3" }), "visual-language-v2");
  assert.equal(rendererPolicy.MUTATION_LATTICE_RENDERER_PROFILE_ID, "toaster-raster-4");
  assert.equal(rendererPolicy.MUTATION_LATTICE_RENDERER_POLICY, "visual-language-v3");
});

test("Shape Pack v1 expands canonical topology vocabulary without renaming ancestors", () => {
  assert.deepEqual(SHAPE_PACK_TOPOLOGIES, SHAPES);
  for (const topology of SHAPES) assert.ok(schema.TOPOLOGIES.includes(topology));
  for (const topology of ["linear", "circle", "mirrored-ring", "spiral", "quad-mirror"]) {
    assert.ok(schema.TOPOLOGIES.includes(topology));
  }
  const parsed = schema.parseVisualScore(score({ topology: "elastic-spine" }));
  assert.equal(parsed.ok, true);
});

test("ordinary Toast Feels carry sparse categorical affinity over all six lattice layers", () => {
  for (const feel of listToastFeels()) {
    if (feel.semanticClass === "madd-clown") {
      assert.equal(feel.affinity, null);
      continue;
    }
    assert.equal(feel.contractVersion, "toast-feel-v2");
    assert.deepEqual(Object.keys(feel.affinity).sort(), [...LAYERS].sort());
    assert.ok(Object.values(feel.affinity).some((value) => Object.keys(value).length > 0));
  }
});

test("Shape Pack compilers and envelope policies are v3-only", () => {
  const v3 = topologyRegistryForExecution({ timeline: { rendererPolicy: "visual-language-v3" } });
  const v2 = topologyRegistryForExecution({ timeline: { rendererPolicy: "visual-language-v2" } });
  for (const topology of SHAPES) {
    assert.match(v3[topology].id, /-v3$/);
    assert.equal(v2[topology], undefined);
    const envelope = resolveFieldEnvelope(score({ topology }), { width: 1920, height: 1080 });
    assert.match(envelope.policy, /^shape-pack-/);
  }
});

test("family type is derived from authoritative family evidence, never a caller label", () => {
  const ordinary = family([candidate(0, "linear")]);
  assert.equal(deriveAuthoritativeFamilyType(ordinary), "ordinary");

  const stomp = family([candidate(0, "circle")], { policy: "visible-outcome-stomp-v1", phase: "stomp" });
  assert.equal(deriveAuthoritativeFamilyType(stomp), "stomp");

  const convergeCandidate = candidate(0, "spiral", {
    role: "converge-frontier",
    derivation: { policy: { candidatePolicy: "converge-frontier-v1", rootSeed: "root" } },
    frontierEvidence: { policy: "converge-frontier-v1", selectedFrontierTarget: { topology: "spiral" } },
  });
  const converge = family([convergeCandidate], {
    converge: { enabled: true, policy: "converge-frontier-v1" },
  });
  assert.equal(deriveAuthoritativeFamilyType(converge), "converge");
  assert.equal(deriveAuthoritativeFamilyType(converge, { familyType: "ordinary" }), "converge");
});

test("mutation lattice plan binds canonical coverage and emits explicit shortfall refusal", () => {
  const candidates = [
    candidate(0, "linear", { primitiveField: { structure: "scope", dynamics: "inertial" } }),
    candidate(1, "elastic-spine", { primitiveField: { structure: "ribs", dynamics: "wave" } }),
    candidate(2, "split-horizon", { primitiveField: { structure: "lattice", dynamics: "snap" } }),
    candidate(3, "cathedral-fan", { primitiveField: { structure: "branches", dynamics: "swarm" } }),
    candidate(4, "circle", { primitiveField: { structure: "torus", dynamics: "oscillation" } }),
    candidate(5, "echo-tunnel", { primitiveField: { structure: "voxels", dynamics: "advect" } }),
  ];
  const plan = buildMutationLatticePlan({
    family: family(candidates),
    constraints: constraints(),
    rendererProfile: { id: "toaster-raster-4" },
    toastFeelId: "porch-ghost",
  });
  assert.equal(plan.policyVersion, MUTATION_LATTICE_POLICY);
  assert.equal(plan.familyType, "ordinary");
  assert.equal(plan.coverage.authoritativeTopologyCount >= 4, true);
  assert.equal(plan.coverage.crossLayerSignatureCount >= 4, true);
  assert.equal(plan.coverage.hasShapePackTopology, true);
  assert.equal(plan.refusal, null);
  assert.match(plan.planSha256, /^[0-9a-f]{64}$/);

  const lockedFamily = family(candidates.map((item) => ({
    ...item,
    scoreArtifact: { ...item.scoreArtifact, score: { ...item.scoreArtifact.score, topology: "linear" } },
    timeline: { ...item.timeline, baseState: { ...item.timeline.baseState, topology: "linear" } },
  })), { locks: ["topology"] });
  const lockedPlan = buildMutationLatticePlan({
    family: lockedFamily,
    constraints: constraints(),
    rendererProfile: { id: "toaster-raster-4" },
    toastFeelId: "porch-ghost",
  });
  assert.ok(lockedPlan.refusal);
  assert.equal(lockedPlan.refusal.reason, "coverage-impossible-under-authoritative-locks-or-constraints");
  assert.match(lockedPlan.refusal.refusalSha256, /^[0-9a-f]{64}$/);
});

test("recorded lattice plans and refusals are tamper-evident and cannot be silently dropped", () => {
  const candidates = Array.from({ length: 6 }, (_, index) => candidate(index, "linear"));
  const plan = buildMutationLatticePlan({
    family: family(candidates, { locks: ["topology"] }),
    constraints: constraints(),
    rendererProfile: { id: "toaster-raster-4" },
    toastFeelId: "low-and-slow",
  });
  assert.equal(validateMutationLatticeEvidence(plan).ok, true);
  assert.equal(validateMutationLatticeEvidence({ ...plan, familyType: "stomp" }).ok, false);
  assert.equal(validateMutationLatticeEvidence({ ...plan, refusal: { ...plan.refusal, reason: "forged" } }).ok, false);
});

test("Topology Arc v1 is deterministic, bounded, and topology lock is absolute", () => {
  const analysis = {
    durationSeconds: 120,
    sections: [
      { startSeconds: 0, endSeconds: 30, energy: 0.2, label: "Opening" },
      { startSeconds: 30, endSeconds: 60, energy: 0.7, label: "Lift" },
      { startSeconds: 60, endSeconds: 90, energy: 0.4, label: "Release" },
      { startSeconds: 90, endSeconds: 120, energy: 0.9, label: "Peak" },
    ],
  };
  const input = {
    analysis,
    score: score({ topology: "circle" }),
    constraints: constraints(),
    rootSeed: "ghost-contract",
    toastFeelId: "risky-hybrid",
    locks: [],
  };
  const first = planTopologyArc(input);
  const second = planTopologyArc(input);
  assert.deepEqual(first, second);
  assert.equal(first.policyVersion, TOPOLOGY_ARC_POLICY);
  assert.ok(first.windows.length <= 2);
  assert.ok(first.windows.filter((window) => window.outcome === "succession").length <= 1);
  for (let index = 1; index < first.windows.length; index += 1) {
    assert.ok(first.windows[index - 1].releaseTick <= first.windows[index].entranceTick);
  }

  const locked = planTopologyArc({ ...input, locks: ["topology"] });
  assert.deepEqual(locked.windows, []);
  assert.equal(locked.refusal.reason, "topology-lock-prohibits-topology-arc");
});
