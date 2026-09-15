const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { attachLBranchToFamily } = require("../src/generation/l-branch.cjs");
const { receiptPathFor, writeReceipt } = require("../src/render/receipt.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");

const SHA = "a".repeat(64);

function responseWitness() {
  return {
    policyVersion: "response-witness-v1",
    durationSeconds: 12,
    sampleCount: 3,
    witnessSha256: SHA,
    knots: [
      { atSeconds: 0, localEnergy: 0.1, smoothedEnergy: 0.1, excursion: -0.1, slope: 0 },
      { atSeconds: 6, localEnergy: 0.8, smoothedEnergy: 0.7, excursion: 0.2, slope: 0.3 },
      { atSeconds: 12, localEnergy: 0.2, smoothedEnergy: 0.25, excursion: -0.1, slope: -0.2 },
    ],
  };
}

function admittedTimeline() {
  const sourceTimelineHash = "1".repeat(64);
  const timeline = {
    schema: "haunted-toaster/resolved-timeline/v1",
    scoreAddress: `ht1_${"b".repeat(64)}`,
    timebase: 1000,
    durationTicks: 12000,
    baseState: {},
    patches: [],
    timelineHash: sourceTimelineHash,
    canonicalJson: "{}",
  };
  const candidate = {
    index: 0,
    role: "slot-0",
    scoreAddress: timeline.scoreAddress,
    timelineHash: sourceTimelineHash,
    timeline,
    scoreArtifact: { score: {} },
  };
  const family = {
    schema: "haunted-toaster/candidate-family/v1",
    policy: "fixture-policy-v1",
    rootSeed: "walk-d-receipt-fixture",
    phase: "initial",
    requestedCount: 1,
    producedCount: 1,
    scoreAddresses: [candidate.scoreAddress],
    timelineHashes: [candidate.timelineHash],
    candidates: [candidate],
    familyHash: "f".repeat(64),
  };
  return attachLBranchToFamily(family, {
    responseWitness: responseWitness(),
    lyricTrack: null,
  }).candidates[0].timeline;
}

async function withFixture(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "walk-d-l-branch-receipt-"));
  try {
    const outputPath = path.join(directory, "artifact.mp4");
    const timelinePath = path.join(directory, "artifact.timeline.json");
    const timeline = admittedTimeline();
    await fs.writeFile(timelinePath, `${JSON.stringify(timeline)}\n`, "utf8");
    await run({ directory, outputPath, timelinePath, timeline });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("video receipt records L BRANCH identities from the canonical accepted timeline sidecar", async () => {
  await withFixture(async ({ outputPath, timelinePath, timeline }) => {
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      canonicalExecution: {
        timelineHash: timeline.timelineHash,
        timelineSidecar: path.basename(timelinePath),
      },
    };

    await writeReceipt(receipt, outputPath);
    const written = JSON.parse(await fs.readFile(receiptPathFor(outputPath), "utf8"));

    assert.deepEqual(written.canonicalExecution.lBranch, {
      laneBankHash: timeline.lBranch.laneBankHash,
      mixPlanHash: timeline.lBranch.mixPlan.planHash,
      executionHash: timeline.lBranch.execution.executionHash,
      sourceTimelineHash: timeline.lBranch.mixPlan.sourceTimelineHash,
    });
  });
});

test("video receipt refuses a canonical timeline sidecar whose identity disagrees with the render receipt", async () => {
  await withFixture(async ({ outputPath, timelinePath }) => {
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      canonicalExecution: {
        timelineHash: "0".repeat(64),
        timelineSidecar: path.basename(timelinePath),
      },
    };

    await assert.rejects(
      writeReceipt(receipt, outputPath),
      /canonical timeline sidecar identity mismatch/i,
    );
  });
});

test("render entry refuses a tampered L BRANCH Mix Plan before execution", () => {
  const timeline = structuredClone(admittedTimeline());
  timeline.lBranch.mixPlan.strategyId = "tampered-strategy";

  assert.throws(
    () => createTimelineExecution(timeline),
    /L BRANCH Mix Plan identity mismatch/i,
  );
});

test("render entry refuses tampered L BRANCH execution before execution", () => {
  const timeline = structuredClone(admittedTimeline());
  timeline.lBranch.execution.sends[0].gain =
    timeline.lBranch.execution.sends[0].gain === 0.5 ? 0.6 : 0.5;

  assert.throws(
    () => createTimelineExecution(timeline),
    /L BRANCH execution identity mismatch/i,
  );
});

test("render entry refuses a tampered bound ResolvedTimeline identity", () => {
  const timeline = structuredClone(admittedTimeline());
  timeline.baseState.tampered = true;

  assert.throws(
    () => createTimelineExecution(timeline),
    /ResolvedTimeline L BRANCH timeline identity mismatch/i,
  );
});
