const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const { createCandidateSession } = require("../src/candidate-session.cjs");
const { receiptPathFor, writeReceipt } = require("../src/render/receipt.cjs");

const root = path.resolve(__dirname, "..");
const readJson = async (relativePath) =>
  JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8"));

const ordinaryMediaAnalysis = Object.freeze({
  filename: "Topology Receipt.wav",
  sizeBytes: 35_067_052,
  duration: 100,
  formatName: "wav",
  audio: Object.freeze({ codec: "pcm_s16le", sampleRate: 48_000, channels: 2 }),
  energySamples: Object.freeze([
    Object.freeze({ time: 0, db: -44 }),
    Object.freeze({ time: 10, db: -40 }),
    Object.freeze({ time: 20, db: -31 }),
    Object.freeze({ time: 32, db: -25 }),
    Object.freeze({ time: 44, db: -22 }),
    Object.freeze({ time: 55, db: -15 }),
    Object.freeze({ time: 68.5, db: -13 }),
    Object.freeze({ time: 82, db: -29 }),
    Object.freeze({ time: 91, db: -35 }),
    Object.freeze({ time: 100, db: -42 }),
  ]),
  sections: Object.freeze([
    Object.freeze({ index: 0, label: "Opening", start: 0, end: 20, energy: 0.2 }),
    Object.freeze({ index: 1, label: "Lift", start: 20, end: 55, energy: 0.72 }),
    Object.freeze({ index: 2, label: "Peak", start: 55, end: 82, energy: 0.91 }),
    Object.freeze({ index: 3, label: "Release", start: 82, end: 100, energy: 0.37 }),
  ]),
});

function responseWitness(analysis) {
  return generation.deriveResponseWitness({
    energySamples: [],
    sections: analysis.sections,
    durationSeconds: analysis.durationSeconds,
  });
}

async function refusedTimeline() {
  const analysis = await readJson("fixtures/analysis/sectional.v1.json");
  const constraints = await readJson("constraints/wire-orchard.v1.json");
  const profile = await readJson("profiles/toaster-raster-1.json");
  const source = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "topology-receipt-refusal",
    count: 6,
  });
  const birth = generation.attachTopologyEventAuthorities(source);
  const candidateIndex = 0;
  const candidate = birth.candidates[candidateIndex];
  const timeline = generation.resolveTopologyEvents(candidate.timeline, {
    authority: candidate.topologyEventAuthority,
    events: [],
  });
  const reboundCandidates = birth.candidates.map((entry, index) =>
    index === candidateIndex
      ? { ...entry, timeline, timelineHash: timeline.timelineHash }
      : entry,
  );
  const rebound = {
    ...birth,
    candidates: reboundCandidates,
    timelineHashes: reboundCandidates.map((entry) => entry.timelineHash),
  };
  return generation.attachLBranchToFamily(rebound, {
    responseWitness: responseWitness(analysis),
    lyricTrack: null,
  }).candidates[candidateIndex].timeline;
}

async function naturalGrabTimeline() {
  const audioPath = path.resolve("/tmp/Topology Receipt.wav");
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let family = null;
    const session = createCandidateSession({
      async renderCandidateFamilyPreviews(_config, nextFamily) {
        family = nextFamily;
        return {
          familyHash: nextFamily.familyHash,
          candidates: nextFamily.candidates.map((candidate) => ({
            index: candidate.index,
            scoreAddress: candidate.scoreAddress,
            timelineHash: candidate.timelineHash,
          })),
        };
      },
    });
    session.noteAudio(audioPath, ordinaryMediaAnalysis);
    await session.generate({
      presetId: "openField",
      toastFeelId: "low-and-slow",
      rootSeed: `walk-e-natural-grab-scope-${attempt}`,
      lyrics: "",
    });
    const candidate = family?.candidates.find((entry) => {
      const hasGrab = (entry.timeline.topologyEvents?.events || [])
        .some((event) => event.kind === "grab");
      const hasScopedSend = (entry.timeline.lBranch?.execution?.sends || [])
        .some((send) => send.scope?.kind === "grab");
      return hasGrab && hasScopedSend;
    });
    if (candidate) return candidate.timeline;
  }
  throw new Error("Could not construct a naturally admitted GRAB-scoped L BRANCH receipt fixture.");
}

function expectedTopologyEvidence(timeline) {
  const plan = timeline.topologyEvents;
  const grabLBranchBindings = (timeline.lBranch?.mixPlan?.sends || [])
    .map((send, index) => ({ send, index }))
    .filter(({ send }) => send.scope?.kind === "grab")
    .map(({ send, index }) => ({
      sourceLaneId: send.sourceLaneId,
      target: send.target,
      regionRef: send.scope.regionRef,
      startTick: send.scope.startTick,
      endTick: send.scope.endTick,
      executionIndex: index,
    }));
  return {
    policyVersion: plan.policyVersion,
    planSha256: plan.planSha256,
    acceptedFamilyHash: plan.acceptedFamilyHash,
    acceptedAuthoritySha256: plan.acceptedAuthoritySha256 || null,
    acceptedScoreAddress: plan.acceptedScoreAddress,
    sourceTimelineHash: plan.sourceTimelineHash,
    sourceTopology: plan.sourceTopology,
    eventCount: plan.eventCount,
    refusal: plan.refusal ? { reason: plan.refusal.reason } : null,
    events: plan.events.map((event) => ({
      id: event.id,
      kind: event.kind,
      eventSha256: event.eventSha256,
      prepareTick: event.prepareTick,
      strikeTick: event.strikeTick,
      releaseTick: event.releaseTick,
      residueUntilTick: event.residueUntilTick,
    })),
    grabLBranchBindings,
  };
}

async function withReceiptFixture(timeline, run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "topology-event-receipt-"));
  try {
    const outputPath = path.join(directory, "artifact.mp4");
    const timelinePath = path.join(directory, "artifact.timeline.json");
    await fs.writeFile(timelinePath, `${JSON.stringify(timeline)}\n`, "utf8");
    await run({ outputPath, timelinePath });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("video receipt promotes topology plan and GRAB binding evidence from the canonical accepted timeline sidecar", async () => {
  const timeline = await naturalGrabTimeline();
  assert.ok(timeline.topologyEvents.acceptedAuthoritySha256);
  assert.ok(
    timeline.lBranch.mixPlan.sends.some((send) => send.scope?.kind === "grab"),
    "fixture must contain a lawful GRAB-scoped L BRANCH send",
  );

  await withReceiptFixture(timeline, async ({ outputPath, timelinePath }) => {
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      canonicalExecution: {
        timelineHash: timeline.timelineHash,
        timelineSidecar: path.basename(timelinePath),
      },
    };

    await writeReceipt(receipt, outputPath);
    const written = JSON.parse(await fs.readFile(receiptPathFor(outputPath), "utf8"));

    assert.deepEqual(
      written.canonicalExecution.topologyEvents,
      expectedTopologyEvidence(timeline),
    );
  });
});

test("video receipt distinguishes an explicit no-event topology refusal from missing topology evidence", async () => {
  const timeline = await refusedTimeline();
  assert.equal(timeline.topologyEvents.eventCount, 0);
  assert.equal(timeline.topologyEvents.refusal?.reason, "no-lawful-event-window");

  await withReceiptFixture(timeline, async ({ outputPath, timelinePath }) => {
    const receipt = {
      schema: "full-measure.video-receipt.v1",
      canonicalExecution: {
        timelineHash: timeline.timelineHash,
        timelineSidecar: path.basename(timelinePath),
      },
    };

    await writeReceipt(receipt, outputPath);
    const written = JSON.parse(await fs.readFile(receiptPathFor(outputPath), "utf8"));

    assert.equal(written.canonicalExecution.topologyEvents.eventCount, 0);
    assert.deepEqual(written.canonicalExecution.topologyEvents.events, []);
    assert.deepEqual(written.canonicalExecution.topologyEvents.refusal, {
      reason: "no-lawful-event-window",
    });
  });
});
