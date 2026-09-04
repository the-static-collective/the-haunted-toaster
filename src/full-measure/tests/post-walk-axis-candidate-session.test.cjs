const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createCandidateSession } = require("../src/candidate-session.cjs");
const { buildPostWalkAxisRecipe } = require("../src/generation/post-walk-axis-grammar.cjs");

const root = path.resolve(__dirname, "..");
const fixture = JSON.parse(
  fs.readFileSync(path.join(root, "fixtures/analysis/sectional.v1.json"), "utf8"),
);

const audioPath = path.resolve("/tmp/Breathing House.wav");
const mediaAnalysis = Object.freeze({
  filename: "Breathing House.wav",
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
  let admittedFamily = null;
  const session = createCandidateSession({
    async renderCandidateFamilyPreviews(_config, family) {
      admittedFamily = family;
      return {
        familyHash: family.familyHash,
        candidates: family.candidates.map((candidate) => ({
          index: candidate.index,
          scoreAddress: candidate.scoreAddress,
          timelineHash: candidate.timelineHash,
        })),
      };
    },
  });
  session.noteAudio(audioPath, mediaAnalysis);
  return {
    session,
    admittedFamily() {
      return admittedFamily;
    },
  };
}

const baseGenerateConfig = Object.freeze({
  presetId: "openField",
  toastFeelId: "low-and-slow",
  rootSeed: "post-walk-axis-candidate-session",
  lyrics: "",
});

test("Stage A candidate-session opt-out preserves the existing ordinary family identity", async () => {
  const absent = sessionHarness();
  const explicitFalse = sessionHarness();

  const absentView = await absent.session.generate({ ...baseGenerateConfig });
  const falseView = await explicitFalse.session.generate({
    ...baseGenerateConfig,
    postWalkAxisGrammar: false,
  });

  assert.equal(falseView.familyHash, absentView.familyHash);
  assert.equal(explicitFalse.admittedFamily().familyHash, absent.admittedFamily().familyHash);
  assert.equal(
    absent.admittedFamily().candidates.some((candidate) => candidate.timeline.postWalkAxis),
    false,
  );
});

test("Stage A candidate-session opt-in admits the six addressed recipes before preview and final render", async () => {
  const harness = sessionHarness();
  const view = await harness.session.generate({
    ...baseGenerateConfig,
    postWalkAxisGrammar: true,
  });
  const admittedFamily = harness.admittedFamily();

  assert.ok(admittedFamily, "preview must receive the Stage A admitted family");
  assert.equal(admittedFamily.candidates.length, 6);
  assert.equal(view.familyHash, admittedFamily.familyHash);

  for (const candidate of admittedFamily.candidates) {
    const recipe = buildPostWalkAxisRecipe(candidate.index);
    assert.equal(candidate.postWalkAxisRecipeHash, recipe.recipeHash);
    assert.equal(candidate.timeline.postWalkAxis?.recipeHash, recipe.recipeHash);
    assert.equal(candidate.timeline.topologyEvents?.eventCount, 1);
    assert.equal(candidate.timeline.topologyEvents?.events?.[0]?.kind, "grab");
    assert.equal(candidate.timeline.lBranch?.mixPlan?.policyVersion, "l-branch-mix-plan-v2");
    assert.equal(candidate.timeline.lBranch?.execution?.policyVersion, "l-branch-mix-execution-v2");
  }

  const selectedCandidate = admittedFamily.candidates[0];
  const selection = harness.session.select({
    familyHash: view.familyHash,
    index: selectedCandidate.index,
  });
  const execution = harness.session.executionForRender({
    audioPath,
    imagePath: null,
    presetId: "openField",
    toastFeelId: "low-and-slow",
  });

  assert.equal(selection.timelineHash, selectedCandidate.timelineHash);
  assert.equal(execution.resolvedTimeline.timelineHash, selectedCandidate.timelineHash);
  assert.equal(
    execution.resolvedTimeline.postWalkAxis?.recipeHash,
    buildPostWalkAxisRecipe(0).recipeHash,
  );
});

test("TEST 6 remains isolated even when the Stage A opt-in flag is present", async () => {
  const harness = sessionHarness();
  await harness.session.generateTestSix({
    ...baseGenerateConfig,
    postWalkAxisGrammar: true,
  });
  const admittedFamily = harness.admittedFamily();

  assert.equal(admittedFamily.forcedWitness, true);
  assert.equal(admittedFamily.fixtureFamily, "test-6");
  assert.equal(
    admittedFamily.candidates.some((candidate) => candidate.timeline.postWalkAxis),
    false,
  );
});
