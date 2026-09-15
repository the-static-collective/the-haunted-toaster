const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  canonicalStringify,
  hashCanonical,
} = require("../src/generation/canonical.cjs");
const { buildLaneBank } = require("../src/generation/l-branch.cjs");
const {
  buildPostWalkAxisRecipe,
  composePostWalkAxisRecipe,
} = require("../src/generation/post-walk-axis-grammar.cjs");
const {
  issueTopologyEventAuthority,
} = require("../src/generation/topology-event-authority.cjs");
const {
  receiptPathFor,
  writeReceipt,
} = require("../src/render/receipt.cjs");

function timeline() {
  return {
    schema: "haunted-toaster/resolved-timeline/v1",
    scoreAddress: `htvs1_${"a".repeat(64)}`,
    timebase: 1000,
    durationTicks: 12000,
    analysisHash: "1".repeat(64),
    constraintsHash: "2".repeat(64),
    rendererProfileHash: "3".repeat(64),
    baseState: { topology: "linear" },
    patches: [],
    timelineHash: "4".repeat(64),
    canonicalJson: "{}",
  };
}

function familyWithTimeline(sourceTimeline = timeline()) {
  const candidate = {
    index: 0,
    role: "slot-0",
    scoreAddress: sourceTimeline.scoreAddress,
    timelineHash: sourceTimeline.timelineHash,
    timeline: sourceTimeline,
  };
  const familyCore = {
    schema: "haunted-toaster/candidate-family/v1",
    policy: "candidate-family-v1",
    scoreSchema: "haunted-toaster/visual-score/v1",
    prng: "xoshiro256**/splitmix64-v1",
    rootSeed: "axis-receipt-fixture",
    parentScoreRef: null,
    baselineScoreRef: null,
    constraintPackId: "fixture",
    analysisHash: sourceTimeline.analysisHash,
    constraintsHash: sourceTimeline.constraintsHash,
    rendererProfileHash: sourceTimeline.rendererProfileHash,
    locks: [],
    requestedCount: 1,
    producedCount: 1,
    roles: [candidate.role],
    scoreAddresses: [candidate.scoreAddress],
    timelineHashes: [candidate.timelineHash],
    shortfall: null,
  };
  const family = {
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates: [candidate],
  };
  return { family, candidate };
}

function responseWitness() {
  return {
    policyVersion: "response-witness-v1",
    witnessSha256: "5".repeat(64),
    durationSeconds: 12,
    knots: [
      { atSeconds: 0, localEnergy: 0.2, slope: 0, excursion: 0 },
      { atSeconds: 6, localEnergy: 0.8, slope: 0.3, excursion: 0.2 },
      { atSeconds: 12, localEnergy: 0.4, slope: -0.1, excursion: 0.1 },
    ],
  };
}

function admittedStageA() {
  const specimen = familyWithTimeline();
  const recipe = buildPostWalkAxisRecipe(3);
  const authority = issueTopologyEventAuthority(specimen.family, 0);
  const laneBank = buildLaneBank({ responseWitness: responseWitness() });
  const admitted = composePostWalkAxisRecipe({
    family: specimen.family,
    candidate: specimen.candidate,
    authority,
    laneBank,
    recipe,
    rootSeed: "axis-receipt-fixture",
    slotIndex: 0,
  });
  assert.equal(admitted.ok, true);
  return admitted;
}

function readdressTimeline(timelineValue) {
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    ...core
  } = timelineValue;
  return {
    ...core,
    timelineHash: hashCanonical(core, "HauntedToaster-ResolvedTimeline-v1"),
    canonicalJson: canonicalStringify(core),
  };
}

async function withReceiptFixture(timelineValue, run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "stage-a-receipt-"));
  try {
    const outputPath = path.join(directory, "artifact.mp4");
    const timelinePath = path.join(directory, "artifact.timeline.json");
    await fs.writeFile(timelinePath, `${JSON.stringify(timelineValue)}\n`, "utf8");
    await run({ outputPath, timelinePath });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("video receipt promotes Stage A identities from the canonical accepted timeline sidecar", async () => {
  const admitted = admittedStageA();
  const timelineValue = admitted.timeline;
  await withReceiptFixture(timelineValue, async ({ outputPath, timelinePath }) => {
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      canonicalExecution: {
        timelineHash: timelineValue.timelineHash,
        timelineSidecar: path.basename(timelinePath),
      },
    };

    await writeReceipt(receipt, outputPath);
    const written = JSON.parse(await fs.readFile(receiptPathFor(outputPath), "utf8"));

    assert.deepEqual(written.canonicalExecution.postWalkAxis, {
      policyVersion: timelineValue.postWalkAxis.policyVersion,
      recipeHash: timelineValue.postWalkAxis.recipeHash,
      candidateIndex: timelineValue.postWalkAxis.candidateIndex,
      acceptedFamilyHash: timelineValue.topologyEvents.acceptedFamilyHash,
      acceptedAuthoritySha256: timelineValue.topologyEvents.acceptedAuthoritySha256,
      topologyPlanSha256: timelineValue.topologyEvents.planSha256,
      eventRefs: timelineValue.topologyEvents.events.map((event) => ({
        id: event.id,
        eventSha256: event.eventSha256,
      })),
      mixPlanHash: timelineValue.lBranch.mixPlan.planHash,
      mixExecutionHash: timelineValue.lBranch.execution.executionHash,
      finalTimelineHash: timelineValue.timelineHash,
    });
  });
});

test("video receipt refuses a re-addressed Stage A sidecar whose cross-binding was tampered", async () => {
  const admitted = admittedStageA();
  const drifted = structuredClone(admitted.timeline);
  drifted.postWalkAxis.mixPlanHash = "f".repeat(64);
  const readdressed = readdressTimeline(drifted);

  await withReceiptFixture(readdressed, async ({ outputPath, timelinePath }) => {
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      canonicalExecution: {
        timelineHash: readdressed.timelineHash,
        timelineSidecar: path.basename(timelinePath),
      },
    };

    await assert.rejects(
      writeReceipt(receipt, outputPath),
      /Post-WALK axis mix plan identity mismatch/i,
    );
  });
});
