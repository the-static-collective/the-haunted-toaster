const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createCandidateSession } = require("../src/candidate-session.cjs");
const {
  writeRenderFailureBundle,
} = require("../src/render/render-failure-evidence.cjs");
const { receiptPathFor, writeReceipt } = require("../src/render/receipt.cjs");

const root = path.resolve(__dirname, "..");
const audioPath = path.resolve("/tmp/WALK E Candidate Genealogy Receipt.wav");

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8"));
}

async function mediaAnalysisFixture() {
  const analysis = await readJson("fixtures/analysis/sectional.v1.json");
  return Object.freeze({
    filename: "WALK E Candidate Genealogy Receipt.wav",
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
}

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
  session.noteAudio(audioPath, await mediaAnalysisFixture());
  const initialView = await session.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed,
    lyrics: "",
  });
  assert.ok(latestFamily);
  return {
    session,
    initialView,
    initialFamily: latestFamily,
    currentFamily: () => latestFamily,
  };
}

function selectExecution(session, family, preferredRole = null) {
  const candidate = (preferredRole
    ? family.candidates.find((entry) => entry.role === preferredRole)
    : null) || family.candidates.find(
    (entry) => entry.timeline?.topologyEvents?.eventCount > 0,
  ) || family.candidates[0];
  session.select({ familyHash: family.familyHash, index: candidate.index });
  const execution = session.executionForRender({
    audioPath,
    imagePath: null,
    presetId: "openField",
    toastFeelId: "low-and-slow",
  });
  assert.ok(execution.candidateGenealogy, "render handoff must expose candidate genealogy");
  assert.equal(execution.candidateGenealogy.timelineHash, execution.resolvedTimeline.timelineHash);
  return execution;
}

async function retainedReceiptForExecution(execution, candidateGenealogy = execution.candidateGenealogy) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "candidate-genealogy-receipt-"));
  try {
    const outputPath = path.join(directory, "artifact.mp4");
    const timelinePath = path.join(directory, "artifact.timeline.json");
    await fs.writeFile(timelinePath, `${JSON.stringify(execution.resolvedTimeline)}\n`, "utf8");
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      canonicalExecution: {
        scoreAddress: execution.resolvedTimeline.scoreAddress,
        timelineHash: execution.resolvedTimeline.timelineHash,
        timelineSidecar: path.basename(timelinePath),
      },
    };
    await writeReceipt(receipt, outputPath, { candidateGenealogy });
    return JSON.parse(await fs.readFile(receiptPathFor(outputPath), "utf8"));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function assertExecutionReceiptParity(execution, receipt) {
  const plan = execution.resolvedTimeline.topologyEvents;
  assert.ok(plan, "execution must retain topology plan");
  assert.ok(plan.acceptedAuthoritySha256, "execution plan must cite admitted authority");
  assert.deepEqual(
    receipt.candidateGenealogy,
    execution.candidateGenealogy,
    "retained receipt must expose the same current candidate genealogy as render input",
  );
  assert.equal(receipt.canonicalExecution.topologyEvents.planSha256, plan.planSha256);
  assert.equal(
    receipt.canonicalExecution.topologyEvents.acceptedAuthoritySha256,
    plan.acceptedAuthoritySha256,
  );
  assert.equal(
    receipt.canonicalExecution.topologyEvents.acceptedScoreAddress,
    execution.resolvedTimeline.scoreAddress,
  );
}

const transitions = [
  {
    name: "GENERATE",
    rootSeed: "genealogy-receipt-generate",
    async move(context) {
      return context.initialFamily;
    },
  },
  {
    name: "MUTATE",
    rootSeed: "genealogy-receipt-mutate-source",
    async move(context) {
      await context.session.mutate({
        familyHash: context.initialView.familyHash,
        parentIndex: 0,
        presetId: "openField",
        toastFeelId: "low-and-slow",
        rootSeed: "genealogy-receipt-mutate-child",
        lyrics: "",
      });
      return context.currentFamily();
    },
  },
  {
    name: "CROSS",
    rootSeed: "genealogy-receipt-cross-source",
    async move(context) {
      await context.session.cross({
        familyHash: context.initialView.familyHash,
        parentIndexes: [0, 1],
        presetId: "openField",
        toastFeelId: "low-and-slow",
        rootSeed: "genealogy-receipt-cross-child",
        lyrics: "",
      });
      return context.currentFamily();
    },
  },
  {
    name: "STOMP",
    rootSeed: "genealogy-receipt-stomp-source",
    async move(context) {
      await context.session.stomp({
        familyHash: context.initialView.familyHash,
        parentIndex: 0,
        presetId: "openField",
        toastFeelId: "low-and-slow",
        rootSeed: "genealogy-receipt-stomp-child",
        lyrics: "",
      });
      return context.currentFamily();
    },
  },
  {
    name: "CONVERGE",
    rootSeed: "genealogy-receipt-converge-source",
    preferredRole: "converge-frontier",
    async move(context) {
      await context.session.mutate({
        familyHash: context.initialView.familyHash,
        parentIndex: 0,
        presetId: "openField",
        toastFeelId: "low-and-slow",
        rootSeed: "genealogy-receipt-converge-child",
        converge: true,
        locks: [],
        lyrics: "",
      });
      return context.currentFamily();
    },
  },
];

test("transition crucible retains execution topology identity and candidate genealogy in receipts", async (t) => {
  for (const transition of transitions) {
    await t.test(transition.name, async () => {
      const context = await sessionWithInitialFamily(transition.rootSeed);
      const family = await transition.move(context);
      const execution = selectExecution(context.session, family, transition.preferredRole || null);
      const receipt = await retainedReceiptForExecution(execution);
      assertExecutionReceiptParity(execution, receipt);
    });
  }
});

test("receipt refuses candidate genealogy bound to a different accepted timeline", async () => {
  const context = await sessionWithInitialFamily("genealogy-receipt-mismatch");
  const execution = selectExecution(context.session, context.initialFamily);
  const mismatched = {
    ...execution.candidateGenealogy,
    timelineHash: "0".repeat(64),
  };
  await assert.rejects(
    retainedReceiptForExecution(execution, mismatched),
    /candidate genealogy timelineHash/i,
  );
});

test("render failure evidence retains the same candidate genealogy without manufacturing success", async () => {
  const context = await sessionWithInitialFamily("genealogy-render-failure");
  const execution = selectExecution(context.session, context.initialFamily);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "candidate-genealogy-failure-"));
  const outputPath = path.join(directory, "artifact.mp4");
  const filterPath = path.join(directory, "render.ffgraph");
  const error = new Error("ffmpeg.exe exited with code 7");
  error.processFailure = Object.freeze({
    binary: "ffmpeg.exe",
    code: 7,
    signal: null,
    stdout: "",
    stderr: "candidate genealogy render failed\n",
  });

  try {
    await fs.writeFile(filterPath, "[0:v]null[vout]\n", "utf8");
    const bundle = await writeRenderFailureBundle({
      outputPath,
      error,
      filterPath,
      ffmpegArgs: ["-filter_complex_script", filterPath, outputPath],
      visualScore: { schema: "full-measure.visual-score.v0.5", seed: "genealogy-failure" },
      resolvedTimeline: execution.resolvedTimeline,
      candidateGenealogy: execution.candidateGenealogy,
      buildInfo: {
        version: "0.5.0-alpha.8",
        commit: "genealogy-receipt-test",
        dirty: false,
        sourceMode: true,
      },
      sourceAudio: null,
      sourceImage: null,
      visualCompiler: null,
      jobId: "candidate-genealogy-render-failure",
      startedAt: new Date("2026-08-25T00:00:00.000Z"),
      lastProgress: { renderedSeconds: 4.2, frame: 126, duration: 100 },
    });
    const failure = JSON.parse(await fs.readFile(bundle.failurePath, "utf8"));
    assert.deepEqual(failure.candidateGenealogy, execution.candidateGenealogy);
    assert.equal(
      failure.canonicalExecution.topologyEvents.planSha256,
      execution.resolvedTimeline.topologyEvents.planSha256,
    );
    await assert.rejects(fs.stat(receiptPathFor(outputPath)), { code: "ENOENT" });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
