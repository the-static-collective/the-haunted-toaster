const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { createTimelinePreview } = require("../src/render/timeline-preview.cjs");
const {
  candidatePreviewPlan,
  previewSampleFor,
  semanticSignature,
} = require("../src/render/candidate-preview.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const constraints = readJson("constraints/wire-orchard.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function family() {
  return generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "issue-15-slice-b-preview",
    count: 6,
  });
}

test("candidate preview plans consume exact accepted timelines without resolving again", () => {
  const generated = family();
  assert.equal(generated.candidates.length, 6);

  for (const candidate of generated.candidates) {
    const timelineBefore = generation.canonicalStringify(candidate.timeline);
    const plan = candidatePreviewPlan(candidate);
    const exactPreview = createTimelinePreview(candidate.timeline);

    assert.equal(plan.scoreAddress, candidate.scoreAddress);
    assert.equal(plan.timelineHash, candidate.timelineHash);
    assert.deepEqual(
      plan.sample,
      exactPreview.sampleAtSeconds(plan.sample.seconds),
    );
    assert.equal(
      generation.canonicalStringify(candidate.timeline),
      timelineBefore,
      "preview planning must not mutate or replace the accepted timeline",
    );
  }
});

test("candidate preview identity refuses a mismatched timeline hash", () => {
  const candidate = family().candidates[0];
  assert.throws(
    () => previewSampleFor({ ...candidate, timelineHash: "not-the-accepted-hash" }),
    /timelineHash does not match/,
  );
});

test("candidate semantic signature stays terse and score-derived", () => {
  const candidate = family().candidates[0];
  const score = candidate.scoreArtifact.score;
  assert.equal(
    semanticSignature(score),
    [score.topology, score.motion.grammar, score.palette.logic, score.material.texture].join(" · "),
  );
});
