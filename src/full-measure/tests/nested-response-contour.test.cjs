const assert = require("node:assert/strict");
const test = require("node:test");

const generation = require("../src/generation/index.cjs");
const { createCandidateSession } = require("../src/candidate-session.cjs");

function timeline(overrides = {}) {
  return {
    schema: "haunted-toaster/resolved-timeline/v1",
    rendererPolicy: "visual-language-v3",
    timebase: 1000,
    durationTicks: 9000,
    accounting: { patchCount: 2, entropySpent: 3, entropyBudget: 120 },
    ...overrides,
  };
}

function score(overrides = {}) {
  return {
    topology: "spiral",
    temporalDensity: "phrase",
    motion: { amplitude: 0.5, variance: 0.25, grammar: "pulse" },
    ...overrides,
  };
}

test("response witness and signed local contour are deterministic", () => {
  const energySamples = [
    { time: 0, db: -28 }, { time: 1, db: -25 }, { time: 2, db: -21 },
    { time: 3, db: -20 }, { time: 4, db: -21 }, { time: 5, db: -26 },
    { time: 6, db: -29 }, { time: 7, db: -24 }, { time: 8, db: -20 },
  ];
  const sections = [{ startSeconds: 0, endSeconds: 9, energy: 0.5, label: "Steady" }];
  const left = generation.deriveResponseWitness({ energySamples, sections, durationSeconds: 9 });
  const right = generation.deriveResponseWitness({ energySamples, sections, durationSeconds: 9 });
  assert.deepEqual(left, right);
  assert.equal(left.policyVersion, "response-witness-v1");
  assert.equal(left.witnessSha256, right.witnessSha256);
  const plan = generation.resolveNestedResponse({ responseWitness: left, score: score(), timeline: timeline() });
  assert.equal(plan.policyVersion, "nested-response-contour-v1");
  assert.equal(plan.meterEvidenceUsed, false);
  assert.equal(plan.granularity, "phrase");
  assert.ok(plan.knotCount > 0);
  const directions = plan.knots.map((item) => item.direction);
  assert.ok(directions.includes(1));
  assert.ok(directions.includes(0));
  assert.ok(directions.includes(-1));
});

test("timeline attachment preserves ordinary patch accounting", () => {
  const responseWitness = generation.deriveResponseWitness({
    energySamples: [{ time: 0, db: -30 }, { time: 1, db: -22 }, { time: 2, db: -27 }],
    sections: [{ startSeconds: 0, endSeconds: 3, energy: 0.6, label: "Lift" }],
    durationSeconds: 3,
  });
  const before = timeline({ durationTicks: 3000 });
  const after = generation.attachNestedResponse(before, { responseWitness, score: score({ temporalDensity: "transient" }) });
  assert.deepEqual(after.accounting, before.accounting);
  assert.equal(after.nestedResponse.sourceWitnessSha256, responseWitness.witnessSha256);
  assert.notEqual(after.timelineHash, before.timelineHash);
});

test("true silence records zero signal-driven excursion", () => {
  const responseWitness = generation.deriveResponseWitness({
    energySamples: [{ time: 0, db: -120 }, { time: 1, db: -120 }, { time: 2, db: -120 }],
    sections: [{ startSeconds: 0, endSeconds: 3, energy: 0, label: "Silence" }],
    durationSeconds: 3,
  });
  const plan = generation.resolveNestedResponse({ responseWitness, score: score({ temporalDensity: "transient" }), timeline: timeline({ durationTicks: 3000 }) });
  assert.equal(plan.idleMotionPolicyVersion, "topology-idle-v1");
  for (const knot of plan.knots) {
    assert.equal(knot.localEnergy, 0);
    assert.equal(knot.excursion, 0);
    assert.equal(knot.direction, 0);
  }
});

test("hysteresis prevents tiny alternating deviations from flipping direction each sample", () => {
  const responseWitness = generation.deriveResponseWitness({
    energySamples: [
      { time: 0, db: -24 }, { time: 1, db: -23.9 }, { time: 2, db: -24.1 },
      { time: 3, db: -23.9 }, { time: 4, db: -24.1 }, { time: 5, db: -18 }, { time: 6, db: -17 },
    ],
    sections: [{ startSeconds: 0, endSeconds: 7, energy: 0.5, label: "Plateau" }],
    durationSeconds: 7,
  });
  const plan = generation.resolveNestedResponse({ responseWitness, score: score({ temporalDensity: "transient" }), timeline: timeline({ durationTicks: 7000 }) });
  const early = plan.knots.slice(0, 5).map((item) => item.direction);
  const flips = early.slice(1).filter((value, index) => value && early[index] && value !== early[index]).length;
  assert.equal(flips, 0);
  assert.ok(plan.knots.slice(5).some((item) => item.direction === 1));
});

test("response witness rejects unsorted and non-finite measurements", () => {
  assert.throws(() => generation.deriveResponseWitness({ energySamples: [{ time: 1, db: -20 }, { time: 0, db: -21 }], sections: [], durationSeconds: 2 }), /sorted/i);
  assert.throws(() => generation.deriveResponseWitness({ energySamples: [{ time: 0, db: Number.NaN }], sections: [], durationSeconds: 1 }), /finite/i);
});

test("candidate session binds real media energy samples into raster-4 timelines", async () => {
  const energySamples = [
    { time: 0, db: -28 }, { time: 1, db: -24 }, { time: 2, db: -21 },
    { time: 3, db: -25 }, { time: 4, db: -29 }, { time: 5, db: -22 },
    { time: 6, db: -20 }, { time: 7, db: -26 }, { time: 8, db: -23 },
  ];
  const sections = [{ start: 0, end: 9, energy: 0.5, label: "Steady" }];
  const expectedWitness = generation.deriveResponseWitness({
    energySamples,
    sections: [{ startSeconds: 0, endSeconds: 9, energy: 0.5, label: "Steady" }],
    durationSeconds: 9,
  });
  const session = createCandidateSession({
    renderCandidateFamilyPreviews: async (_input, family) => ({ familyHash: family.familyHash, candidates: family.candidates }),
  });
  session.noteAudio("/tmp/nested-response-media.wav", { duration: 9, sections, energySamples });
  const family = await session.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed: "task2-real-media-witness",
    title: "",
    artist: "",
    lyrics: "",
  });
  assert.ok(family.candidates.length > 0);
  assert.ok(family.candidates.some((candidate) => candidate.scoreArtifact.score.temporalDensity !== "frozen"));
  for (const candidate of family.candidates) {
    const density = candidate.scoreArtifact.score.temporalDensity;
    assert.equal(candidate.timeline.nestedResponse.policyVersion, "nested-response-contour-v1");
    assert.equal(candidate.timeline.nestedResponse.sourceWitnessSha256, expectedWitness.witnessSha256);
    assert.equal(candidate.timeline.nestedResponse.meterEvidenceUsed, false);
    if (density === "frozen") assert.equal(candidate.timeline.nestedResponse.knotCount, 0);
    else assert.ok(candidate.timeline.nestedResponse.knotCount > 0);
  }
});
