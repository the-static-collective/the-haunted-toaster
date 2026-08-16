const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const generation = require("../src/generation/index.cjs");
const { candidatePreviewPlan } = require("../src/render/candidate-preview.cjs");
const { compileTimelineFilterGraph } = require("../src/render/timeline-filter.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const {
  effectiveInternalEnergy,
  effectiveInternalEnergyV3,
} = require("../src/render/response-shaping.cjs");

const root = path.resolve(__dirname, "..");
const rendererRoot = path.join(root, "src", "renderer");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const constraints = readJson("constraints/wire-orchard.v3.json");
const profile = readJson("profiles/toaster-raster-4.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function productionLikeGraph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]ass=filename='range-calibration.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

function scoreAndTimeline(topology, overrides = {}) {
  const scoreArtifact = generation.createVisualScore({
    seed: `range-calibration-${topology}`,
    constraints,
    overrides: {
      topology,
      temporalDensity: "section",
      ...overrides,
    },
  });
  return {
    score: scoreArtifact.score,
    timeline: generation.resolve(analysis, scoreArtifact.score, constraints, profile),
  };
}

function generatedFamily(rootSeed = "range-calibration-family") {
  return generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed,
    count: 6,
    phase: "initial",
    toastFeelId: "risky-hybrid",
  });
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test("raster-4 Mutation Lattice records and prefers base creature coverage", () => {
  const family = generatedFamily();
  const coverage = family.mutationLattice.coverage;

  assert.ok(coverage.authoritativeBaseIdentityCount >= 4);
  assert.ok(coverage.primitiveStructureCount >= 3);
  assert.ok(coverage.primitiveDynamicsCount >= 3);
  assert.ok(family.mutationLattice.signatures.every((signature) =>
    signature.baseIdentity &&
    signature.baseIdentity.topology === signature.topology &&
    typeof signature.baseIdentity.structure === "string" &&
    typeof signature.baseIdentity.dynamics === "string"));
});

test("raster-4 preview metadata exposes authoritative topology, structure, and dynamics", () => {
  const candidate = generatedFamily("range-preview").candidates[0];
  const plan = candidatePreviewPlan(candidate);
  const field = candidate.scoreArtifact.score.primitiveField;

  assert.deepEqual(plan.baseIdentity, {
    topology: candidate.scoreArtifact.score.topology,
    structure: field.structure,
    dynamics: field.dynamics,
  });
});

test("six-up card visibly names the base creature so magnetic can be selected before render", async () => {
  const html = fs.readFileSync(path.join(rendererRoot, "index.html"), "utf8");
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "file:///haunted-toaster/index.html",
  });
  const { window } = dom;
  const { document } = window;
  document.querySelector("#songFacts").classList.remove("is-hidden");
  document.querySelector("#audioDropTitle").textContent = "Specimen";
  window.toastFeel = { getToastFeelId: () => "risky-hybrid" };
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.fullMeasure = {
    generateCandidates: async () => ({
      schema: "haunted-toaster/candidate-family/v1",
      familyHash: "range-family",
      producedCount: 1,
      requestedCount: 6,
      shortfall: true,
      candidates: [{
        index: 0,
        role: "base-break",
        signature: "cathedral-fan · pulse · garment · grain",
        baseIdentity: {
          topology: "cathedral-fan",
          structure: "lattice",
          dynamics: "magnetic",
        },
        scoreAddress: "htvs1_range",
        thumbnailDataUrl: "data:image/png;base64,",
        changedAxes: ["topology", "motion"],
      }],
    }),
    mutateCandidates: async () => { throw new Error("unused"); },
    stompCandidates: async () => { throw new Error("unused"); },
    selectCandidate: async () => ({}),
    clearCandidates: async () => {},
    clearCandidateImage: async () => {},
  };

  try {
    window.eval(fs.readFileSync(path.join(rendererRoot, "candidate-ui.js"), "utf8"));
    document.querySelector(".candidate-launch").click();
    await tick();
    await tick();
    const card = document.querySelector(".candidate-card");
    assert.ok(card);
    assert.match(card.textContent, /cathedral-fan/i);
    assert.match(card.textContent, /lattice/i);
    assert.match(card.textContent, /magnetic/i);
  } finally {
    dom.window.close();
  }
});

test("Cathedral Fan has a non-polar source while Spiral retains its polar identity", () => {
  const spiral = scoreAndTimeline("spiral");
  const fan = scoreAndTimeline("cathedral-fan");
  const spiralCompiled = compileTimelineFilterGraph(
    productionLikeGraph(),
    createTimelineExecution(spiral.timeline),
  );
  const fanCompiled = compileTimelineFilterGraph(
    productionLikeGraph(),
    createTimelineExecution(fan.timeline),
  );

  assert.match(spiralCompiled.graph, /mode=polar/);
  assert.doesNotMatch(fanCompiled.graph, /mode=polar/);
  assert.match(fanCompiled.graph, /mode=lissajous_xy/);
  assert.equal(fanCompiled.topologyCompiler, "cathedral-fan-v3");
});

test("visual-language-v3 preserves middle values and exact endpoints without changing the v2 lift", () => {
  assert.equal(effectiveInternalEnergy(0.5) > 0.6, true, "visual-language-v2 lift is compatibility authority");
  assert.equal(effectiveInternalEnergyV3(0), 0);
  assert.equal(effectiveInternalEnergyV3(1), 1);
  for (const value of [0.25, 0.5, 0.75]) {
    assert.ok(
      Math.abs(effectiveInternalEnergyV3(value) - value) <= 0.03,
      `${value} should retain headroom instead of being lifted toward the ceiling`,
    );
  }

  const { timeline } = scoreAndTimeline("spiral", {
    motion: { grammar: "still", amplitude: 0.5, variance: 0.5 },
  });
  const compiled = compileTimelineFilterGraph(
    productionLikeGraph(),
    createTimelineExecution(timeline),
  );
  assert.match(compiled.graph, /mode=polar:draw=line:scale=sqrt:zoom=1\.606:/);
});

test("raster-4 STOMP composes semantic distance across a restrained-to-peak intensity contour", () => {
  const parent = generatedFamily("range-stomp-parent").candidates[0];
  const options = {
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    parentScore: parent.scoreArtifact.score,
    locks: [],
    rootSeed: "range-stomp",
    count: 6,
  };
  const first = generation.generateStompCandidateSet(options);
  const second = generation.generateStompCandidateSet(options);
  const expectedTargets = [0.25, 0.38, 0.52, 0.66, 0.82, 0.98];
  const evidence = first.candidates.map((candidate) =>
    candidate.scoreArtifact.derivation.policy.stompIntensity);

  assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
  assert.deepEqual(evidence.map((item) => item.target), expectedTargets);
  assert.ok(evidence.every((item) => item.policyVersion === "stomp-intensity-contour-v1"));
  assert.ok(evidence.every((item) => item.observed >= 0 && item.observed <= 1));
  assert.ok(evidence[0].observed <= 0.5, "first rail should permit a quiet mutant");
  assert.ok(first.candidates[0].visibleDistanceFromParent >= 10);
  assert.ok(evidence.at(-1).target > evidence[0].target);
});
