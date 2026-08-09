const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { rendererProfile, CONSTRAINTS_BY_PRESET } = require("../src/candidate-session.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const {
  SEMANTIC_COMPILER_REGISTRIES,
  TOPOLOGY_COMPILERS,
  compileTimelineFilterGraph,
} = require("../src/render/timeline-filter.cjs");
const { deriveBuildCapabilities } = require("../src/build-capabilities.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const legacyConstraints = readJson("constraints/wire-orchard.v1.json");
const legacyProfile = readJson("profiles/toaster-raster-1.json");
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

test("candidate session opts into v2 packs and toaster-raster-2 while v1 stays replayable", () => {
  assert.equal(rendererProfile.id, "toaster-raster-2");
  assert.equal(CONSTRAINTS_BY_PRESET.porchlight.id, "porchlight-v2");
  assert.equal(CONSTRAINTS_BY_PRESET.wireOrchard.id, "wire-orchard-v2");
  assert.equal(CONSTRAINTS_BY_PRESET.absoluteResidual.id, "absolute-residual-v2");

  const legacyArtifact = generation.createVisualScore({
    seed: "legacy-policy-proof",
    constraints: legacyConstraints,
    overrides: { topology: "circle", temporalDensity: "section" },
  });
  const legacyTimeline = generation.resolve(analysis, legacyArtifact.score, legacyConstraints, legacyProfile);
  assert.equal(Object.hasOwn(legacyTimeline, "rendererPolicy"), false);
});

test("spiral and quad-mirror compile through fixed registries without replacing #43 semantics", () => {
  const constraints = CONSTRAINTS_BY_PRESET.wireOrchard;
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
    const timeline = generation.resolve(analysis, scoreArtifact.score, constraints, rendererProfile);
    assert.equal(timeline.rendererPolicy, generation.VISUAL_LANGUAGE_RENDERER_POLICY);
    const execution = createTimelineExecution(timeline);
    const first = compileTimelineFilterGraph(productionLikeGraph(), execution);
    const second = compileTimelineFilterGraph(productionLikeGraph(), execution);

    assert.equal(first.graph, second.graph);
    assert.deepEqual(first.operators, second.operators);
    assert.equal(first.topology, topology);
    assert.equal(first.fieldEnvelope.policy, "bounded-full-height-v1");
    assert.equal(first.operators.length, 4);
    assert.equal(first.semanticGrammar.motion, "fracture");
    assert.equal(first.semanticGrammar.palette, "duotone");
    assert.equal(first.semanticGrammar.material, "photocopy");
    assert.equal(first.semanticGrammar.camera, "orbit");
    assert.equal(first.topologyCompiler, TOPOLOGY_COMPILERS[topology].id);
  }
});

test("Build Info capability claims are derived from the active profile and registries", () => {
  const derived = deriveBuildCapabilities();
  assert.equal(derived.rendererProfileGeneration, rendererProfile.id);
  assert.equal(derived.topologyCompilers.spiral, "spiral-polar-v1");
  assert.equal(derived.topologyCompilers["quad-mirror"], "quad-mirror-v1");
  assert.equal(derived.semanticCompilers.motion.fracture, SEMANTIC_COMPILER_REGISTRIES.motion.fracture);
  assert.ok(derived.capabilities.includes("labProposalInfluenceToggle"));
  assert.ok(derived.capabilities.includes("deliveryProfile"));
  assert.ok(derived.capabilities.includes("boundedFieldEnvelopeV1"));
  assert.ok(derived.capabilities.includes("visualLanguageV2"));
});
