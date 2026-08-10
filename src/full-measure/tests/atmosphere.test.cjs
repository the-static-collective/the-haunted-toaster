const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const legacyResolver = require("../src/generation/resolver.cjs");
const {
  ATMOSPHERE_COMPILER,
  TEXT_OVERLAY_SEAM,
  applyAtmosphereToGraph,
  buildAtmosphereAss,
} = require("../src/render/atmosphere.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const porchlight = readJson("constraints/porchlight.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const sectional = readJson("fixtures/analysis/sectional.v1.json");

function patchWithoutPriorHash(patch) {
  const { priorStateHash: _priorStateHash, ...rest } = patch;
  return rest;
}

test("legacy VisualScore and ResolvedTimeline artifacts remain exact when atmosphere is absent", () => {
  const scoreArtifact = generation.createVisualScore({
    seed: "atmosphere-legacy-compat",
    constraints: porchlight,
    overrides: { topology: "circle", temporalDensity: "section" },
  });
  assert.equal(Object.hasOwn(scoreArtifact.score, "atmosphere"), false);

  const wrapped = generation.resolve(
    sectional,
    scoreArtifact.score,
    porchlight,
    profile,
  );
  const legacy = legacyResolver.resolve(
    sectional,
    scoreArtifact.score,
    porchlight,
    profile,
  );
  assert.equal(wrapped.scoreAddress, legacy.scoreAddress);
  assert.equal(wrapped.timelineHash, legacy.timelineHash);
  assert.equal(wrapped.canonicalJson, legacy.canonicalJson);
});

test("atmosphere is an optional score axis outside garment constraints", () => {
  const scoreArtifact = generation.createVisualScore({
    seed: "atmosphere-smoke",
    constraints: porchlight,
    overrides: {
      atmosphere: "smoke",
      topology: "circle",
      temporalDensity: "section",
    },
  });
  assert.equal(scoreArtifact.score.atmosphere, "smoke");
  assert.equal(generation.parseVisualScore(scoreArtifact.score).ok, true);
  assert.equal(
    generation.parseVisualScore({ ...scoreArtifact.score, atmosphere: "hail" }).ok,
    false,
  );
  assert.equal(
    generation.scoreWithinConstraints(scoreArtifact.score, porchlight).ok,
    true,
  );

  const timeline = generation.resolve(
    sectional,
    scoreArtifact.score,
    porchlight,
    profile,
  );
  const coreTimeline = legacyResolver.resolve(
    sectional,
    generation.stripAtmosphere(scoreArtifact.score),
    porchlight,
    profile,
  );
  assert.equal(timeline.baseState.atmosphere, "smoke");
  assert.equal(
    generation.stateAtTick(timeline, timeline.durationTicks).atmosphere,
    "smoke",
  );
  assert.deepEqual(
    timeline.patches.map(patchWithoutPriorHash),
    coreTimeline.patches.map(patchWithoutPriorHash),
  );
  assert.notEqual(timeline.scoreAddress, coreTimeline.scoreAddress);
  assert.notEqual(timeline.timelineHash, coreTimeline.timelineHash);
});

test("six-up covers the five atmosphere states before repeating", () => {
  const family = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    rootSeed: "atmosphere-six-up",
    count: 6,
  });
  assert.equal(family.candidates.length, 6);
  const firstFive = family.candidates
    .slice(0, 5)
    .map((candidate) => candidate.scoreArtifact.score.atmosphere);
  assert.equal(new Set(firstFive).size, generation.ATMOSPHERES.length);
  assert.deepEqual(
    [...new Set(firstFive)].sort(),
    [...generation.ATMOSPHERES].sort(),
  );
  assert.ok(
    family.candidates.every(
      (candidate) =>
        candidate.timeline.baseState.atmosphere ===
        candidate.scoreArtifact.score.atmosphere,
    ),
  );

  const replay = generation.replayCandidateFamily(family, {
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
  });
  assert.equal(replay.ok, true);
});

test("atmosphere can be locked independently across mutation and CONVERGE", () => {
  const initial = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    rootSeed: "atmosphere-lock-parent",
    count: 6,
  });
  const parent = initial.candidates.find(
    (candidate) => candidate.scoreArtifact.score.atmosphere !== "none",
  );
  assert.ok(parent);
  const kind = parent.scoreArtifact.score.atmosphere;

  const branch = generation.generateCandidateSet({
    analysis: sectional,
    garmentConstraints: porchlight,
    rendererProfile: profile,
    parentScore: parent.scoreArtifact.score,
    locks: ["atmosphere"],
    rootSeed: "atmosphere-lock-branch",
    count: 6,
  });
  assert.deepEqual(branch.locks, ["atmosphere"]);
  assert.ok(
    branch.candidates.every(
      (candidate) => candidate.scoreArtifact.score.atmosphere === kind,
    ),
  );
  assert.ok(
    branch.candidates.every(
      (candidate) =>
        candidate.scoreArtifact.derivation.parentScoreRefs[0] ===
        parent.scoreAddress,
    ),
  );

  const converged = generation.replaceFinalCandidateWithConverge(branch, {
    history: initial.candidates.map((candidate) => candidate.scoreArtifact.score),
    parentScore: parent.scoreArtifact.score,
    locks: ["atmosphere"],
    constraints: porchlight,
    analysis: sectional,
    rendererProfile: profile,
    rootSeed: "atmosphere-lock-converge",
  });
  const frontier = converged.candidates.find(
    (candidate) => candidate.role === "converge-frontier",
  );
  assert.ok(frontier);
  assert.equal(frontier.scoreArtifact.score.atmosphere, kind);
  assert.ok(frontier.frontierEvidence.locks.includes("atmosphere"));
});

test("all active atmosphere compilers produce deterministic ASS field events", () => {
  for (const kind of generation.ATMOSPHERES.filter((value) => value !== "none")) {
    const timeline = {
      scoreAddress: `htvs1_${kind}`,
      timelineHash: `timeline-${kind}`,
      timebase: 1000,
      durationTicks: 12_000,
      baseState: { atmosphere: kind },
    };
    const first = buildAtmosphereAss({ timeline, width: 640, height: 360 });
    const second = buildAtmosphereAss({ timeline, width: 640, height: 360 });
    assert.equal(first.compiler, ATMOSPHERE_COMPILER);
    assert.equal(first.eventCount > 0, true, kind);
    assert.equal(first.content, second.content, kind);
    assert.equal(first.contentSha256, second.contentSha256, kind);
    assert.match(first.content, /\[Events\]/);
    assert.match(first.content, /Dialogue: 0,/);
  }
});

test("atmosphere is injected before the canonical lyric overlay and none is a no-op", async () => {
  const tempDirectory = await fsp.mkdtemp(path.join(os.tmpdir(), "toaster-atmosphere-test-"));
  const graph = `[stage0]null[other];\n${TEXT_OVERLAY_SEAM}`;
  try {
    const smoke = await applyAtmosphereToGraph({
      graph,
      tempDirectory,
      width: 640,
      height: 360,
      timeline: {
        scoreAddress: "htvs1_smoke",
        timelineHash: "timeline-smoke",
        timebase: 1000,
        durationTicks: 8_000,
        baseState: { atmosphere: "smoke" },
      },
    });
    assert.match(smoke.graph, /\[stage0\]ass=filename='atmosphere\.ass'/);
    assert.match(
      smoke.graph,
      /\[atmosphereStage\]ass=filename='text-overlay\.ass'/,
    );
    assert.equal(smoke.evidence.kind, "smoke");
    assert.equal(smoke.evidence.eventCount > 0, true);
    assert.equal(
      fs.existsSync(path.join(tempDirectory, smoke.evidence.fileName)),
      true,
    );

    const none = await applyAtmosphereToGraph({
      graph,
      tempDirectory,
      width: 640,
      height: 360,
      timeline: {
        scoreAddress: "htvs1_none",
        timelineHash: "timeline-none",
        timebase: 1000,
        durationTicks: 8_000,
        baseState: { atmosphere: "none" },
      },
    });
    assert.equal(none.graph, graph);
    assert.equal(none.evidence.eventCount, 0);
  } finally {
    await fsp.rm(tempDirectory, { recursive: true, force: true });
  }
});

test("candidate UI exposes atmosphere as an independent lock", () => {
  const candidateUi = fs.readFileSync(
    path.join(root, "src", "renderer", "candidate-ui.js"),
    "utf8",
  );
  assert.match(candidateUi, /\["atmosphere", "Atmosphere"\]/);
});
