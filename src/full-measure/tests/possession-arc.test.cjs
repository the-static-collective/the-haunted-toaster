const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const legacyResolver = require("../src/generation/resolver.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const { compileTimelineFilterGraph } = require("../src/render/timeline-filter.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const constraints = readJson("constraints/open-field.v1.json");
const profile = readJson("profiles/toaster-raster-2.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function productionBaseGraph() {
  return [
    "[waveAudio]showwaves=s=640x96:mode=cline:rate=30:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=640:360:0:239:color=black@0.0[waveFull]",
    "[stage0]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

function firstCandidate(rootSeed = "possession-arc-proof") {
  return generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed,
    count: 6,
  }).candidates[0];
}

test("legacy direct resolution remains unchanged and possession arc is candidate-opt-in", () => {
  const artifact = generation.createVisualScore({
    seed: "possession-legacy",
    constraints,
    overrides: { temporalDensity: "section" },
  });
  const wrapped = generation.resolve(analysis, artifact.score, constraints, profile);
  const legacy = legacyResolver.resolve(analysis, artifact.score, constraints, profile);

  assert.equal(Object.hasOwn(wrapped, "possessionArc"), false);
  assert.equal(wrapped.timelineHash, legacy.timelineHash);
  assert.equal(wrapped.canonicalJson, legacy.canonicalJson);
});

test("a four-section song resolves a bounded deterministic categorical arc", () => {
  const candidate = firstCandidate();
  const timeline = candidate.timeline;
  const arc = timeline.possessionArc;

  assert.equal(arc.policyVersion, generation.POSSESSION_ARC_POLICY);
  assert.equal(arc.transitionPolicy, "cut");
  assert.equal(arc.transitionCount, 3);
  assert.equal(arc.dramaturgy.budget, 3);
  assert.equal(arc.dramaturgy.spent, 3);
  assert.deepEqual(arc.lockedAxes, []);
  assert.ok(arc.planSha256.length > 20);
  assert.ok(new Set(arc.affectedAxes).size >= 2);
  assert.ok(arc.transitions.every((transition) => transition.boundary === "section"));
  assert.ok(arc.transitions.every((transition) => transition.transition === "cut"));
  assert.deepEqual(
    arc.transitions.map((transition) => transition.atTick),
    analysis.sections.slice(1).map((section) => Math.round(section.startSeconds * profile.timebase)),
  );
  assert.ok(arc.transitions.every((transition) => transition.from !== transition.to[transition.axis][
    transition.axis === "material"
      ? "texture"
      : transition.axis === "palette"
        ? "logic"
        : "grammar"
  ]));
  assert.ok(timeline.patches.every((patch) => patch.axis !== "topology"));
  assert.ok(arc.transitions.every((transition) => transition.axis !== "topology"));

  const first = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "possession-arc-proof",
    count: 6,
  }).candidates[0].timeline;
  assert.equal(first.timelineHash, timeline.timelineHash);
  assert.equal(first.possessionArc.planSha256, arc.planSha256);
  assert.deepEqual(first.possessionArc.transitions, arc.transitions);
});

test("arc categories survive later numeric patches instead of snapping back", () => {
  const timeline = firstCandidate("possession-persistence").timeline;
  const transition = timeline.possessionArc.transitions[0];
  const key = transition.axis === "material"
    ? "texture"
    : transition.axis === "palette"
      ? "logic"
      : "grammar";
  const chosen = transition.to[transition.axis][key];
  const atTransition = generation.stateAtTick(timeline, transition.atTick);
  const nearEnd = generation.stateAtTick(timeline, timeline.durationTicks);

  assert.equal(atTransition[transition.axis][key], chosen);
  assert.equal(nearEnd[transition.axis][key], chosen);
});

test("Possession Arc treats candidate locks as law", () => {
  const parent = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "possession-lock-parent",
    count: 1,
  }).candidates[0];
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    parentScore: parent.scoreArtifact.score,
    locks: ["motion", "material"],
    rootSeed: "possession-lock-child",
    count: 6,
  });

  for (const candidate of family.candidates) {
    assert.deepEqual(candidate.timeline.possessionArc.lockedAxes, ["material", "motion"]);
    assert.ok(candidate.timeline.possessionArc.transitions.every(
      (transition) => !["motion", "material"].includes(transition.axis),
    ));
    assert.ok(candidate.timeline.possessionArc.affectedAxes.every(
      (axis) => !["motion", "material"].includes(axis),
    ));
  }
});

test("production compiler executes the arc as section-local categorical programs", () => {
  const timeline = firstCandidate("possession-compiler").timeline;
  const execution = createTimelineExecution(timeline);
  const compiled = compileTimelineFilterGraph(productionBaseGraph(), execution);

  assert.equal(compiled.semanticGrammar.mode, generation.POSSESSION_ARC_POLICY);
  assert.equal(compiled.semanticGrammar.planSha256, timeline.possessionArc.planSha256);
  assert.equal(compiled.semanticGrammar.transitionCount, timeline.possessionArc.transitionCount);
  assert.ok(compiled.operators.some((operator) =>
    operator.axis === "possessionArc" &&
    operator.planSha256 === timeline.possessionArc.planSha256,
  ));
  assert.match(compiled.graph, /split=/);
  assert.match(compiled.graph, /trim=start=/);
  assert.match(compiled.graph, /setpts=PTS-STARTPTS/);
  assert.match(compiled.graph, /concat=n=/);
  assert.match(compiled.graph, /\[timelineFinal\]ass=/);

  const categoricalSignatures = compiled.segments.map((segment) => [
    segment.semanticGrammar.motion,
    segment.semanticGrammar.material,
    segment.semanticGrammar.camera,
    segment.semanticGrammar.palette,
  ].join("|"));
  assert.ok(new Set(categoricalSignatures).size >= 2);
  assert.ok(compiled.segments.every((segment) => segment.state.topology === timeline.baseState.topology));
});

test("candidate-family replay includes the exact possession plan", () => {
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "possession-replay",
    count: 6,
  });
  const replay = generation.replayCandidateFamily(family, {
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
  });

  assert.equal(replay.ok, true);
  assert.deepEqual(replay.actualTimelineHashes, family.timelineHashes);
  assert.equal(replay.replayed.candidates[0].timeline.possessionArc.planSha256,
    family.candidates[0].timeline.possessionArc.planSha256);
});