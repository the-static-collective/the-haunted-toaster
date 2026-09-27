const test = require("node:test");
const assert = require("node:assert/strict");

const generation = require("../src/generation/index.cjs");
const {
  CONSTRAINTS_BY_PRESET,
  rendererProfile,
  toGenerationAnalysis,
} = require("../src/candidate-session.cjs");

const media = {
  duration: 60,
  sections: [
    { start: 0, end: 20, energy: 0.25, label: "opening" },
    { start: 20, end: 42, energy: 0.72, label: "lift" },
    { start: 42, end: 60, energy: 0.48, label: "return" },
  ],
  energySamples: [],
};

function options(overrides = {}) {
  const analysis = toGenerationAnalysis(media);
  const responseWitness = generation.deriveResponseWitness({
    energySamples: [],
    sections: analysis.sections,
    durationSeconds: media.duration,
  });
  return {
    analysis,
    responseWitness,
    garmentConstraints: CONSTRAINTS_BY_PRESET.openField,
    rendererProfile,
    rootSeed: "memory-prism-six-up",
    count: 6,
    phase: "initial",
    lyricTrack: null,
    toastFeelId: "wire-heat",
    nativeChromaticProfile: null,
    ...overrides,
  };
}

const APERTURES = [
  { seatIndex: 0, aperture: "BODY", targetPrefix: "topology", axis: "topology",
    allowed: (c) => c.topology.allowed, current: (s) => s.topology },
  { seatIndex: 1, aperture: "BEHAVIOR", targetPrefix: "motionGrammar", axis: "motion",
    allowed: (c) => c.motion.grammar.allowed, current: (s) => s.motion.grammar },
  { seatIndex: 2, aperture: "SKIN", targetPrefix: "materialTexture", axis: "material",
    allowed: (c) => c.material.texture.allowed, current: (s) => s.material.texture },
  { seatIndex: 3, aperture: "COLOR", targetPrefix: "paletteLogic", axis: "palette",
    allowed: (c) => c.palette.logic.allowed, current: (s) => s.palette.logic },
  { seatIndex: 4, aperture: "EYE", targetPrefix: "cameraGrammar", axis: "camera",
    allowed: (c) => c.camera.grammar.allowed, current: (s) => s.camera.grammar },
  { seatIndex: 5, aperture: "TIME", targetPrefix: "temporalDensity", axis: "temporalDensity",
    allowed: (c) => c.temporalDensity.allowed, current: (s) => s.temporalDensity },
];

function alternate(values, current) {
  const found = values.find((value) => value !== current);
  if (!found) throw new Error("fixture requires a lawful alternate memory target");
  return found;
}

function prismForFamily(family) {
  const capsuleSha256 = "c".repeat(64);
  const seats = APERTURES.map((aperture) => {
    const candidate = family.candidates[aperture.seatIndex];
    const targetValue = alternate(
      aperture.allowed(CONSTRAINTS_BY_PRESET.openField),
      aperture.current(candidate.scoreArtifact.score),
    );
    return {
      seatIndex: aperture.seatIndex,
      aperture: aperture.aperture,
      targetPrefix: aperture.targetPrefix,
      influence: {
        policy: "toaster-memory-influence-v1",
        capsuleSha256,
        target: `${aperture.targetPrefix}:${targetValue}`,
        reason: "coverage-explore",
        weight: 1,
        evidenceRefs: ["archive-cut:" + "a".repeat(64), "song:memory-prism-song"],
      },
    };
  });
  const core = {
    schema: "haunted-toaster/memory-prism/v1",
    policy: "toaster-memory-prism-v1",
    capsuleSha256,
    archiveCut: "a".repeat(64),
    projectionSha256: "b".repeat(64),
    currentSongEvidenceHash: "memory-prism-song",
    seats,
  };
  return {
    ...core,
    prismSha256: generation.hashCanonical(core, "HauntedToaster-MemoryPrism-v1"),
  };
}

test("MEMORY-001 gives every six-up seat a distinct attributable aperture and replays exactly", () => {
  const baseline = generation.generateCandidateSet(options());
  const prism = prismForFamily(baseline);
  const remembered = generation.generateCandidateSet(options({ memoryPrism: prism }));

  assert.equal(remembered.candidates.length, 6);
  assert.equal(remembered.memoryPrism.prismSha256, prism.prismSha256);
  assert.equal(remembered.memoryPrism.baselineFamilyHash, baseline.familyHash);
  assert.deepEqual(
    remembered.candidates.map((candidate) => candidate.memoryPrismSeat.aperture),
    ["BODY", "BEHAVIOR", "SKIN", "COLOR", "EYE", "TIME"],
  );
  assert.deepEqual(
    remembered.candidates.map((candidate) => candidate.memoryPrismSeat.application.axis),
    ["topology", "motion", "material", "palette", "camera", "temporalDensity"],
  );
  assert.ok(remembered.candidates.every((candidate) => candidate.memoryPrismSeat.application.applied));

  for (const aperture of APERTURES) {
    const before = baseline.candidates[aperture.seatIndex].scoreArtifact.score;
    const after = remembered.candidates[aperture.seatIndex].scoreArtifact.score;
    assert.notEqual(aperture.current(after), aperture.current(before));
    assert.equal(
      remembered.candidates[aperture.seatIndex].memoryPrismSeat.influence.target,
      `${aperture.targetPrefix}:${aperture.current(after)}`,
    );
  }

  const replay = generation.replayCandidateFamily(remembered, options());
  assert.equal(replay.ok, true);
  assert.equal(replay.familyHashMatches, true);
  assert.equal(replay.addressesMatch, true);
  assert.equal(replay.timelinesMatch, true);
});

test("MEMORY-001 memory absent preserves ordinary six-up identity exactly", () => {
  const ordinary = generation.generateCandidateSet(options());
  const explicitOff = generation.generateCandidateSet(options({ memoryPrism: null }));
  assert.deepEqual(explicitOff, ordinary);
});

test("MEMORY-001 locks beat memory pressure", () => {
  const birth = generation.generateCandidateSet(options());
  const parent = birth.candidates[0].scoreArtifact.score;
  const branchBaseline = generation.generateCandidateSet(options({
    parentScore: parent,
    locks: ["topology"],
    rootSeed: "memory-prism-locked-branch",
    phase: "branch",
  }));
  const prism = prismForFamily(branchBaseline);
  const remembered = generation.generateCandidateSet(options({
    parentScore: parent,
    locks: ["topology"],
    rootSeed: "memory-prism-locked-branch",
    phase: "branch",
    memoryPrism: prism,
  }));

  assert.equal(remembered.candidates[0].memoryPrismSeat.application.applied, false);
  assert.equal(remembered.candidates[0].memoryPrismSeat.application.reason, "axis-locked");
  assert.equal(
    remembered.candidates[0].scoreArtifact.score.topology,
    branchBaseline.candidates[0].scoreArtifact.score.topology,
  );
});
