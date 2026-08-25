const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createCandidateSession } = require("../src/candidate-session.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const analysis = readJson("fixtures/analysis/sectional.v1.json");
const audioPath = path.resolve("/tmp/WALK E Transition Wiring.wav");

const mediaAnalysis = Object.freeze({
  filename: "WALK E Transition Wiring.wav",
  sizeBytes: 35_067_052,
  duration: analysis.durationSeconds,
  formatName: "wav",
  audio: Object.freeze({ codec: "pcm_s16le", sampleRate: 48_000, channels: 2 }),
  energySamples: Object.freeze([
    Object.freeze({ atSeconds: 0, db: -44 }),
    Object.freeze({ atSeconds: 10, db: -40 }),
    Object.freeze({ atSeconds: 20, db: -31 }),
    Object.freeze({ atSeconds: 32, db: -25 }),
    Object.freeze({ atSeconds: 44, db: -22 }),
    Object.freeze({ atSeconds: 55, db: -15 }),
    Object.freeze({ atSeconds: 68.5, db: -13 }),
    Object.freeze({ atSeconds: 82, db: -29 }),
    Object.freeze({ atSeconds: 91, db: -35 }),
    Object.freeze({ atSeconds: analysis.durationSeconds, db: -42 }),
  ]),
  sections: Object.freeze(
    analysis.sections.map((section, index) =>
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

function previewResult(family) {
  return {
    familyHash: family.familyHash,
    candidates: family.candidates.map((candidate) => ({
      index: candidate.index,
      scoreAddress: candidate.scoreAddress,
      timelineHash: candidate.timelineHash,
    })),
  };
}

async function sessionWithInitialFamily(rootSeed) {
  let latestFamily = null;
  const session = createCandidateSession({
    async renderCandidateFamilyPreviews(_config, nextFamily) {
      latestFamily = nextFamily;
      return previewResult(nextFamily);
    },
  });
  session.noteAudio(audioPath, mediaAnalysis);
  const view = await session.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed,
    lyrics: "",
  });
  assert.ok(latestFamily);
  return {
    session,
    initialFamily: latestFamily,
    initialView: view,
    currentFamily: () => latestFamily,
  };
}

function assertWalkEEnrichment(candidate) {
  assert.ok(candidate.timeline.topologyEvents, "ordinary transition must carry topologyEvents");
  assert.ok(
    candidate.timeline.topologyEvents.eventCount > 0,
    "ordinary transition should retain event-rich topology activity",
  );
  assert.ok(candidate.timeline.lBranch, "ordinary transition must carry L BRANCH");
  assert.match(candidate.timeline.lBranch.mixPlan?.planHash || "", /^[0-9a-f]{64}$/);
  assert.match(candidate.timeline.lBranch.execution?.executionHash || "", /^[0-9a-f]{64}$/);
}

async function selectAndAssertRenderable(session, family) {
  const candidate = family.candidates.find(
    (entry) => entry.timeline?.topologyEvents?.eventCount > 0,
  ) || family.candidates[0];
  session.select({ familyHash: family.familyHash, index: candidate.index });
  const execution = session.executionForRender({
    audioPath,
    imagePath: null,
    presetId: "openField",
    toastFeelId: "low-and-slow",
  });
  assert.equal(execution.resolvedTimeline.timelineHash, candidate.timelineHash);
  assertWalkEEnrichment(execution.resolvedTimeline ? { timeline: execution.resolvedTimeline } : candidate);
}

test("ordinary MUTATE keeps topology activity and L BRANCH in the accepted render timeline", async () => {
  const { session, initialView, currentFamily } = await sessionWithInitialFamily(
    "walk-e-transition-mutate-source",
  );
  await session.mutate({
    familyHash: initialView.familyHash,
    parentIndex: 0,
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed: "walk-e-transition-mutate-child",
    lyrics: "",
  });
  const family = currentFamily();
  assertWalkEEnrichment(family.candidates[0]);
  await selectAndAssertRenderable(session, family);
});

test("ordinary CROSS keeps topology activity and L BRANCH in the accepted render timeline", async () => {
  const { session, initialView, currentFamily } = await sessionWithInitialFamily(
    "walk-e-transition-cross-source",
  );
  await session.cross({
    familyHash: initialView.familyHash,
    parentIndexes: [0, 1],
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed: "walk-e-transition-cross-child",
    lyrics: "",
  });
  const family = currentFamily();
  assertWalkEEnrichment(family.candidates[0]);
  await selectAndAssertRenderable(session, family);
});

test("ordinary STOMP keeps topology activity and L BRANCH in the accepted render timeline", async () => {
  const { session, initialView, currentFamily } = await sessionWithInitialFamily(
    "walk-e-transition-stomp-source",
  );
  await session.stomp({
    familyHash: initialView.familyHash,
    parentIndex: 0,
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed: "walk-e-transition-stomp-child",
    lyrics: "",
  });
  const family = currentFamily();
  assertWalkEEnrichment(family.candidates[0]);
  await selectAndAssertRenderable(session, family);
});
