const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const { receiptPathFor, writeReceipt } = require("../src/render/receipt.cjs");

const root = path.resolve(__dirname, "..");
const readJson = async (relativePath) =>
  JSON.parse(await fs.readFile(path.join(root, relativePath), "utf8"));

const grab = Object.freeze({
  id: "receipt-grab-1",
  kind: "grab",
  prepareTick: 3000,
  strikeTick: 4000,
  releaseTick: 5000,
  residueUntilTick: 7000,
  parameters: Object.freeze({
    anchorX: 0.25,
    anchorY: 0.5,
    targetX: 0.75,
    targetY: 0.45,
    radiusX: 0.22,
    radiusY: 0.18,
    pull: 0.8,
    recoil: 0.55,
    falloff: 0.7,
    residualVectorX: 0.08,
    residualVectorY: -0.03,
    residualStretch: 0.06,
  }),
  evidenceRefs: Object.freeze(["receipt:grab-1"]),
});

function responseWitness(analysis) {
  return generation.deriveResponseWitness({
    energySamples: [],
    sections: analysis.sections,
    durationSeconds: analysis.durationSeconds,
  });
}

async function acceptedTimeline(events, candidateIndex = 3) {
  const analysis = await readJson("fixtures/analysis/sectional.v1.json");
  const constraints = await readJson("constraints/wire-orchard.v1.json");
  const profile = await readJson("profiles/toaster-raster-1.json");
  const source = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: `topology-receipt-${events.length}`,
    count: 6,
  });
  const birth = generation.attachTopologyEventAuthorities(source);
  const candidate = birth.candidates[candidateIndex];
  const timeline = generation.resolveTopologyEvents(candidate.timeline, {
    authority: candidate.topologyEventAuthority,
    events,
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
  const timeline = await acceptedTimeline([grab]);
  assert.equal(timeline.topologyEvents.eventCount, 1);
  assert.equal(timeline.topologyEvents.events[0].kind, "grab");
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
  const timeline = await acceptedTimeline([]);
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
