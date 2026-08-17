const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const porchlight = readJson("constraints/porchlight.v2.json");
const profile = readJson("profiles/toaster-raster-3.json");
const sectional = readJson("fixtures/analysis/sectional.v1.json");

const EXPECTED_STRUCTURES = Object.freeze([
  "scope", "ribs", "lattice", "facets", "torus", "folds", "voxels", "branches",
]);
const EXPECTED_DYNAMICS = Object.freeze([
  "inertial", "wave", "orbital-decay", "snap", "oscillation", "seismic", "magnetic", "swarm", "whip", "advect",
]);

test("hidden primitive vocabulary is native and bounded", () => {
  assert.deepEqual(generation.STRUCTURE_PRIMITIVES, EXPECTED_STRUCTURES);
  assert.deepEqual(generation.FIELD_DYNAMICS, EXPECTED_DYNAMICS);
});

test("primitiveField is optional and changes identity only when present", () => {
  const legacyArtifact = generation.createVisualScore({ seed: "primitive-score-compat", constraints: porchlight, overrides: { topology: "spiral", temporalDensity: "section" } });
  const legacyAddress = generation.addressVisualScore(legacyArtifact.score);
  assert.equal(Object.hasOwn(legacyArtifact.score, "primitiveField"), false);
  assert.equal(generation.parseVisualScore(legacyArtifact.score).ok, true);
  assert.equal(generation.addressVisualScore(legacyArtifact.score), legacyAddress);
  const primitiveScore = { ...legacyArtifact.score, primitiveField: { structure: "ribs", dynamics: "magnetic" } };
  const parsed = generation.parseVisualScore(primitiveScore);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value.primitiveField, primitiveScore.primitiveField);
  assert.notEqual(generation.addressVisualScore(parsed.value), legacyAddress);
  assert.equal(generation.scoreWithinConstraints(parsed.value, porchlight).ok, true);
  assert.equal(generation.parseVisualScore({ ...legacyArtifact.score, primitiveField: { structure: "not-real", dynamics: "magnetic" } }).ok, false);
  assert.equal(generation.parseVisualScore({ ...legacyArtifact.score, primitiveField: { structure: "ribs", dynamics: "not-real" } }).ok, false);
  assert.equal(generation.parseVisualScore({ ...legacyArtifact.score, primitiveField: { structure: "ribs", dynamics: "magnetic", extra: true } }).ok, false);
});

test("ordinary six-up assigns deterministic inspectable primitive fields", () => {
  const options = { analysis: sectional, garmentConstraints: porchlight, rendererProfile: profile, rootSeed: "primitive-six-up", count: 6, phase: "initial" };
  const first = generation.generateCandidateSet(options);
  const second = generation.generateCandidateSet(options);
  assert.equal(first.candidates.length, 6);
  assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
  assert.deepEqual(first.timelineHashes, second.timelineHashes);
  assert.ok(first.candidates.every((candidate) => {
    const field = candidate.scoreArtifact.score.primitiveField;
    return field && EXPECTED_STRUCTURES.includes(field.structure) && EXPECTED_DYNAMICS.includes(field.dynamics);
  }));
  assert.ok(first.candidates.every((candidate) => candidate.timeline.baseState.primitiveField?.structure === candidate.scoreArtifact.score.primitiveField.structure && candidate.timeline.baseState.primitiveField?.dynamics === candidate.scoreArtifact.score.primitiveField.dynamics));
  assert.ok(first.candidates.every((candidate) => candidate.timeline.primitiveField?.policyVersion === "primitive-field-coverage-v1" && candidate.timeline.primitiveField?.structureCompiler && candidate.timeline.primitiveField?.dynamicsCompiler));
  const replay = generation.replayCandidateFamily(first, { analysis: sectional, garmentConstraints: porchlight, rendererProfile: profile });
  assert.equal(replay.ok, true);
});

test("topology and motion locks freeze their hidden primitive domains", () => {
  const initial = generation.generateCandidateSet({ analysis: sectional, garmentConstraints: porchlight, rendererProfile: profile, rootSeed: "primitive-lock-parent", count: 6, phase: "initial" });
  const parent = initial.candidates[5].scoreArtifact.score;
  const topologyLocked = generation.generateCandidateSet({ analysis: sectional, garmentConstraints: porchlight, rendererProfile: profile, parentScore: parent, locks: ["topology"], rootSeed: "primitive-topology-lock", count: 6, phase: "branch" });
  assert.ok(topologyLocked.candidates.every((candidate) => candidate.scoreArtifact.score.primitiveField.structure === parent.primitiveField.structure));
  const motionLocked = generation.generateCandidateSet({ analysis: sectional, garmentConstraints: porchlight, rendererProfile: profile, parentScore: parent, locks: ["motion"], rootSeed: "primitive-motion-lock", count: 6, phase: "branch" });
  assert.ok(motionLocked.candidates.every((candidate) => candidate.scoreArtifact.score.primitiveField.dynamics === parent.primitiveField.dynamics));
});

test("primitive structure and dynamics contribute to visible semantic distance", () => {
  const base = generation.createVisualScore({ seed: "primitive-distance", constraints: porchlight }).score;
  const neutral = { ...base, primitiveField: { structure: "scope", dynamics: "inertial" } };
  const structureBreak = { ...base, primitiveField: { structure: "lattice", dynamics: "inertial" } };
  const dynamicsBreak = { ...base, primitiveField: { structure: "scope", dynamics: "seismic" } };
  assert.ok(generation.visibleSemanticDistance(neutral, structureBreak, porchlight) >= 4);
  assert.ok(generation.visibleSemanticDistance(neutral, dynamicsBreak, porchlight) >= 4);
  const coverage = generation.categoricalCoverage([neutral, structureBreak, dynamicsBreak]);
  assert.equal(coverage.primitiveStructure, 2);
  assert.equal(coverage.primitiveDynamics, 2);
});

test("primitive renderer is a legacy no-op and compiles accepted evidence before stage0", () => {
  const { applyPrimitiveFieldToGraph } = require("../src/render/primitive-field.cjs");
  const graph = [
    "[wave]pad=640:360:0:0:color=black@0.0[waveFull]",
    "[spectral][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
  const legacy = applyPrimitiveFieldToGraph({ graph, timeline: { baseState: {} }, width: 640, height: 360 });
  assert.equal(legacy.graph, graph);
  assert.equal(legacy.evidence, null);
  const timeline = {
    baseState: { primitiveField: { structure: "ribs", dynamics: "magnetic" } },
    primitiveField: { policyVersion: "primitive-field-coverage-v1", structure: "ribs", dynamics: "magnetic", structureCompiler: "structure-ribs-v1", dynamicsCompiler: "dynamics-magnetic-v1" },
  };
  const compiled = applyPrimitiveFieldToGraph({ graph, timeline, width: 640, height: 360 });
  assert.match(compiled.graph, /primitiveStructure/);
  assert.match(compiled.graph, /primitiveField/);
  assert.match(compiled.graph, /\[spectral\]\[primitiveField\]overlay=0:0:shortest=1\[stage0\]/);
  assert.equal(compiled.evidence.structure.compiler, "structure-ribs-v1");
  assert.equal(compiled.evidence.dynamics.compiler, "dynamics-magnetic-v1");
});

test("nested response changes Primitive Field motion without changing categorical identity", () => {
  const { applyPrimitiveFieldToGraph } = require("../src/render/primitive-field.cjs");
  const graph = [
    "[wave]pad=640:360:0:0:color=black@0.0[waveFull]",
    "[spectral][waveFull]overlay=0:0:shortest=1[stage0]",
  ].join(";\n");
  function timeline(planSha256, second) {
    return {
      rendererPolicy: generation.MUTATION_LATTICE_RENDERER_POLICY,
      timebase: 1000,
      durationTicks: 2000,
      baseState: {
        topology: "spiral",
        primitiveField: { structure: "ribs", dynamics: "magnetic" },
      },
      primitiveField: {
        policyVersion: "primitive-field-coverage-v1",
        structure: "ribs",
        dynamics: "magnetic",
        structureCompiler: "structure-ribs-v1",
        dynamicsCompiler: "dynamics-magnetic-v1",
      },
      nestedResponse: {
        policyVersion: "nested-response-contour-v1",
        granularity: "transient",
        knotCount: 2,
        knots: [
          { atTick: 0, sectionIndex: 0, macroEnergy: 0.25, localEnergy: 0.25, excursion: 0, slope: 0, direction: 0 },
          { atTick: 1000, sectionIndex: 0, macroEnergy: second, localEnergy: second, excursion: second > 0.5 ? 0.15 : 0, slope: second > 0.5 ? 0.1 : 0, direction: second > 0.5 ? 1 : 0 },
        ],
        meterEvidenceUsed: false,
        idleMotionPolicyVersion: "topology-idle-v1",
        sourceWitnessSha256: `witness-${planSha256}`,
        planSha256,
      },
    };
  }
  const low = applyPrimitiveFieldToGraph({ graph, timeline: timeline("low-plan", 0.3), width: 640, height: 360 });
  const high = applyPrimitiveFieldToGraph({ graph, timeline: timeline("high-plan", 0.95), width: 640, height: 360 });
  const replay = applyPrimitiveFieldToGraph({ graph, timeline: timeline("high-plan", 0.95), width: 640, height: 360 });
  assert.deepEqual(low.evidence, high.evidence);
  assert.equal(high.evidence.structure.value, "ribs");
  assert.equal(high.evidence.dynamics.value, "magnetic");
  assert.notEqual(low.graph, high.graph);
  assert.equal(high.graph, replay.graph);
  assert.match(high.graph, /\bt\b/);
});
