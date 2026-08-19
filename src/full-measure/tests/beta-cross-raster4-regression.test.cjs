const test = require("node:test");
const assert = require("node:assert/strict");

const generation = require("../src/generation/index.cjs");
const {
  CONSTRAINTS_BY_PRESET,
  rendererProfile,
  toGenerationAnalysis,
} = require("../src/candidate-session.cjs");

function mediaAnalysis() {
  return {
    duration: 60,
    sections: [
      { start: 0, end: 20, energy: 0.25, label: "opening" },
      { start: 20, end: 42, energy: 0.72, label: "lift" },
      { start: 42, end: 60, energy: 0.48, label: "return" },
    ],
    energySamples: [],
  };
}

function generationContext() {
  const media = mediaAnalysis();
  const analysis = toGenerationAnalysis(media);
  return {
    analysis,
    responseWitness: generation.deriveResponseWitness({
      energySamples: media.energySamples,
      sections: analysis.sections,
      durationSeconds: media.duration,
    }),
    garmentConstraints: CONSTRAINTS_BY_PRESET.openField,
    rendererProfile,
  };
}

test("raster-4 branch generation honors count: 1 for each bounded CROSS child", () => {
  const context = generationContext();
  const parents = generation.generateCandidateSet({
    ...context,
    rootSeed: "cross-count-parent-family",
    count: 6,
    phase: "initial",
    toastFeelId: "wire-heat",
  });
  const parent = parents.candidates[0];

  const child = generation.generateCandidateSet({
    ...context,
    parentScore: parent.scoreArtifact.score,
    parentNativeColorPlan: parent.timeline?.nativeColor || null,
    rootSeed: "cross-count-single-child",
    count: 1,
    phase: "branch",
    toastFeelId: null,
  });

  assert.equal(child.requestedCount, 1);
  assert.equal(child.producedCount, 1);
  assert.equal(child.candidates.length, 1);
});
