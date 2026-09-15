const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createCandidateSession } = require("../src/candidate-session.cjs");
const { buildPostWalkAxisRecipe } = require("../src/generation/post-walk-axis-grammar.cjs");
const {
  candidatePreviewPlan,
  postWalkAxisRecipeForCandidate,
} = require("../src/render/candidate-preview.cjs");

const root = path.resolve(__dirname, "..");
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, "fixtures/analysis/sectional.v1.json"), "utf8"),
);

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const audioPath = path.resolve("/tmp/Stage A Human Witness.wav");
const mediaAnalysis = Object.freeze({
  filename: "Stage A Human Witness.wav",
  sizeBytes: 35_067_052,
  duration: fixture.durationSeconds,
  formatName: "wav",
  audio: Object.freeze({ codec: "pcm_s16le", sampleRate: 48_000, channels: 2 }),
  energySamples: Object.freeze([]),
  sections: Object.freeze(
    fixture.sections.map((section, index) =>
      Object.freeze({
        index,
        label: section.label,
        start: section.startSeconds,
        end: section.endSeconds,
        energy: section.energy,
      }),
    ),
  ),
});

function sessionHarness() {
  const session = createCandidateSession({
    async renderCandidateFamilyPreviews(_config, family) {
      return {
        familyHash: family.familyHash,
        producedCount: family.candidates.length,
        requestedCount: 6,
        candidates: family.candidates.map((candidate) => ({
          ...candidatePreviewPlan(candidate),
          thumbnailDataUrl: "data:image/png;base64,",
        })),
      };
    },
  });
  session.noteAudio(audioPath, mediaAnalysis);
  return session;
}

const baseGenerateConfig = Object.freeze({
  presetId: "openField",
  toastFeelId: "low-and-slow",
  rootSeed: "stage-a-human-witness-bridge",
  title: "",
  artist: "",
  lyrics: "",
});

test("Stage A candidate view carries canonical recipe witness data across the existing preview bridge", async () => {
  const session = sessionHarness();
  const view = await session.generate({
    ...baseGenerateConfig,
    postWalkAxisGrammar: true,
  });

  assert.equal(view.candidates.length, 6);
  for (const candidate of view.candidates) {
    const recipe = buildPostWalkAxisRecipe(candidate.index);
    assert.deepEqual(candidate.postWalkAxisRecipe, {
      schema: recipe.schema,
      policyVersion: recipe.policyVersion,
      recipeHash: recipe.recipeHash,
      response: recipe.response,
      scope: recipe.scope,
      consequence: recipe.consequence,
    });
  }
});

test("ordinary candidate view stays ordinary when Stage A was not admitted", async () => {
  const session = sessionHarness();
  const view = await session.generate({
    ...baseGenerateConfig,
    postWalkAxisGrammar: false,
  });

  assert.equal(view.candidates.length, 6);
  assert.equal(
    view.candidates.some((candidate) => Object.hasOwn(candidate, "postWalkAxisRecipe")),
    false,
  );
});

test("Stage A preview witness refuses partial or mismatched carriers", () => {
  const recipe = buildPostWalkAxisRecipe(0);
  assert.throws(
    () => postWalkAxisRecipeForCandidate({
      postWalkAxisRecipeHash: recipe.recipeHash,
      postWalkAxisRecipe: recipe,
    }),
    /does not match its accepted candidate timeline/,
  );
  assert.throws(
    () => postWalkAxisRecipeForCandidate({
      timeline: { postWalkAxis: { recipeHash: recipe.recipeHash } },
      postWalkAxisRecipeHash: recipe.recipeHash,
      postWalkAxisRecipe: { ...recipe, recipeHash: "foreign-recipe" },
    }),
    /does not match its accepted candidate timeline/,
  );
});

test("existing six-up owns one explicit Stage A opt-in and never reconstructs recipe meaning in the renderer", () => {
  const ui = source("src/renderer/candidate-ui.js");
  const preview = source("src/render/candidate-preview.cjs");

  assert.match(ui, /id="candidateStageA"/);
  assert.match(ui, /postWalkAxisGrammar:\s*stageAOptIn\.checked\s*===\s*true/);
  assert.match(ui, /candidate\.postWalkAxisRecipe/);
  assert.match(ui, /recipe\.response/);
  assert.match(ui, /recipe\.scope/);
  assert.match(ui, /recipe\.consequence/);
  assert.match(ui, /Stage A changed · generate six again/);
  assert.doesNotMatch(ui, /buildPostWalkAxisRecipe|POST_WALK_AXIS_RECIPES/);
  assert.doesNotMatch(preview, /buildPostWalkAxisRecipe|POST_WALK_AXIS_RECIPES/);
});

test("Stage A witness furniture is bounded to the existing candidate toolbar and cards", () => {
  const css = source("src/renderer/candidate-ui.css");

  assert.match(css, /\.candidate-stage-a\s*\{/);
  assert.match(css, /\.candidate-stage-a-recipe\s*\{/);
});
