const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { rendererProfile, CONSTRAINTS_BY_PRESET } = require("../src/candidate-session.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const {
  EXPRESSIVE_TOPOLOGY_COMPILERS,
  SEMANTIC_COMPILER_REGISTRIES,
  TOPOLOGY_COMPILERS,
  compileTimelineFilterGraph,
} = require("../src/render/timeline-filter.cjs");
const { deriveBuildCapabilities } = require("../src/build-capabilities.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const legacyConstraints = readJson("constraints/wire-orchard.v1.json");
const legacyProfile = readJson("profiles/toaster-raster-1.json");
const visualLanguageProfile = readJson("profiles/toaster-raster-2.json");
const expressiveProfile = readJson("profiles/toaster-raster-3.json");
const expressiveConstraints = readJson("constraints/wire-orchard.v2.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function productionLikeGraph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]ass=filename='visual-language.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

test("candidate session advances to raster-4 while raster-1 through raster-3 remain replayable", () => {
  assert.equal(rendererProfile.id, "toaster-raster-4");
  assert.equal(CONSTRAINTS_BY_PRESET.porchlight.id, "porchlight-v3");
  assert.equal(CONSTRAINTS_BY_PRESET.wireOrchard.id, "wire-orchard-v3");
  assert.equal(CONSTRAINTS_BY_PRESET.absoluteResidual.id, "absolute-residual-v3");

  const legacyArtifact = generation.createVisualScore({
    seed: "legacy-policy-proof",
    constraints: legacyConstraints,
    overrides: { topology: "circle", temporalDensity: "section" },
  });
  const legacyTimeline = generation.resolve(analysis, legacyArtifact.score, legacyConstraints, legacyProfile);
  assert.equal(Object.hasOwn(legacyTimeline, "rendererPolicy"), false);

  const visualLanguageTimeline = generation.resolve(
    analysis,
    legacyArtifact.score,
    legacyConstraints,
    visualLanguageProfile,
  );
  assert.equal(
    visualLanguageTimeline.rendererPolicy,
    generation.VISUAL_LANGUAGE_RENDERER_POLICY,
  );
});

test("raster-3 spiral and quad-mirror remain exact visual-language-v2 ancestors", () => {
  const constraints = expressiveConstraints;
  for (const topology of ["spiral", "quad-mirror"]) {
    const scoreArtifact = generation.createVisualScore({
      seed: `visual-language-v2-${topology}`,
      constraints,
      overrides: {
        topology,
        temporalDensity: "section",
        motion: { grammar: "fracture" },
        palette: { logic: "duotone" },
        material: { texture: "photocopy" },
        camera: { grammar: "orbit" },
      },
    });
    const timeline = generation.resolve(analysis, scoreArtifact.score, constraints, expressiveProfile);
    assert.equal(timeline.rendererPolicy, generation.EXPRESSIVE_RENDERER_POLICY);
    const execution = createTimelineExecution(timeline);
    const first = compileTimelineFilterGraph(productionLikeGraph(), execution);
    const second = compileTimelineFilterGraph(productionLikeGraph(), execution);

    assert.equal(first.graph, second.graph);
    assert.deepEqual(first.operators, second.operators);
    assert.equal(first.topology, topology);
    assert.equal(first.fieldEnvelope.policy, "bounded-full-height-v1");
    assert.equal(first.operators.length, 5);
    assert.equal(first.operators[0].axis, "colorDrift");
    assert.equal(first.operators[0].compiler, generation.COLOR_DRIFT_POLICY);
    assert.equal(first.semanticGrammar.motion, "fracture");
    assert.equal(first.semanticGrammar.palette, "duotone");
    assert.equal(first.semanticGrammar.material, "photocopy");
    assert.equal(first.semanticGrammar.camera, "orbit");
    assert.equal(first.topologyCompiler, EXPRESSIVE_TOPOLOGY_COMPILERS[topology].id);
  }

  assert.equal(TOPOLOGY_COMPILERS.spiral.id, "spiral-polar-v1");
  assert.equal(TOPOLOGY_COMPILERS["quad-mirror"].id, "quad-mirror-v1");
});

test("Build Info capability claims are derived from the active profile and registries", () => {
  const derived = deriveBuildCapabilities();
  assert.equal(derived.rendererProfileGeneration, rendererProfile.id);
  assert.equal(derived.topologyCompilers.spiral, "spiral-polar-v2");
  assert.equal(derived.topologyCompilers["quad-mirror"], "quad-mirror-v2");
  assert.equal(derived.topologyCompilers["elastic-spine"], "elastic-spine-v3");
  assert.equal(derived.topologyCompilers["echo-tunnel"], "echo-tunnel-v3");
  assert.equal(derived.semanticCompilers.motion.fracture, SEMANTIC_COMPILER_REGISTRIES.motion.fracture);
  assert.equal(derived.semanticCompilers.camera.orbit, "camera-orbit-v2");
  assert.ok(derived.capabilities.includes("labProposalInfluenceToggle"));
  assert.ok(derived.capabilities.includes("deliveryProfile"));
  assert.ok(derived.capabilities.includes("boundedFieldEnvelopeV1"));
  assert.ok(derived.capabilities.includes("visualLanguageV2"));
  assert.ok(derived.capabilities.includes("internalResponseV1"));
  assert.ok(derived.capabilities.includes("toastFeelV2"));
  assert.ok(derived.capabilities.includes("mutationLatticeV1"));
  assert.ok(derived.capabilities.includes("shapePackV1"));
  assert.ok(derived.capabilities.includes("topologyArcV1"));
});