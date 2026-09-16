const test = require("node:test");
const assert = require("node:assert/strict");
const { hashCanonical } = require("../src/generation/canonical.cjs");
const {
  LIVING_RECEIPT_BRIDGE_POLICY,
  LIVING_RECEIPT_BRIDGE_SCHEMA,
  buildLivingReceiptEvidence,
  buildLivingReceiptSpecInputs,
} = require("../src/hyperfood/receipt-bridge.cjs");

function acceptedReceipt(overrides = {}) {
  return {
    schema: "full-measure.video-receipt.v1",
    receiptId: "first-beta-receipt",
    source: {
      filename: "Groove.wav",
      sha256: "a".repeat(64),
      durationSeconds: 210.56,
    },
    canonicalExecution: {
      scoreAddress: `htvs1_${"b".repeat(64)}`,
      timelineHash: "c".repeat(64),
      topologyEvents: {
        policyVersion: "topology-events-v0.1",
        planSha256: "d".repeat(64),
        eventCount: 3,
        refusal: null,
        events: [
          {
            id: "ordinary-speak-2-0",
            kind: "speak",
            eventSha256: "e".repeat(64),
            prepareTick: 10093,
            strikeTick: 10643,
            releaseTick: 11293,
            residueUntilTick: 12393,
          },
          {
            id: "ordinary-aperture-2-1",
            kind: "aperture",
            eventSha256: "f".repeat(64),
            prepareTick: 28541,
            strikeTick: 29091,
            releaseTick: 29741,
            residueUntilTick: 30841,
          },
          {
            id: "ordinary-grow-2-2",
            kind: "grow",
            eventSha256: "1".repeat(64),
            prepareTick: 83019,
            strikeTick: 83569,
            releaseTick: 84219,
            residueUntilTick: 85319,
          },
        ],
      },
    },
    treatment: {
      title: "Groove for Tomorrow",
      sections: [
        { index: 0, label: "Opening", startSeconds: 0, endSeconds: 28, energy: 0.3679 },
        { index: 1, label: "Lift", startSeconds: 28, endSeconds: 85, energy: 0.8094 },
        { index: 2, label: "Final form", startSeconds: 85, endSeconds: 210.56, energy: 0.8446 },
      ],
      foreignVisualMaterial: {
        placement: {
          policyVersion: "accepted-timeline-span-v1",
          startTick: 0,
          endTick: 210560,
          durationTicks: 210560,
          timebase: 1000,
          renderDurationSeconds: 210.56,
        },
      },
    },
    output: {
      filename: "Groove-full-measure.mp4",
      sha256: "2".repeat(64),
      durationSeconds: 210.5,
    },
    validation: {
      accepted: true,
      witnessWindowVerified: true,
    },
    candidateGenealogy: {
      schema: "haunted-toaster/candidate-genealogy/v1",
      familyHash: "3".repeat(64),
      phase: "initial",
      candidateIndex: 2,
      role: "toastmood:wire-heat",
      scoreAddress: `htvs1_${"b".repeat(64)}`,
      timelineHash: "c".repeat(64),
      changedAxes: ["palette", "material", "atmosphere"],
    },
    publication: {
      hauntedHaiku: {
        schema: "haunted-haiku/v1",
        authority: "descriptive-only",
        seedSha256: "4".repeat(64),
        lines: [
          "rain waiting behind the glass",
          "the horizon arrives too early",
          "the light keeps count",
        ],
      },
    },
    build: {
      version: "0.0.0-beta.0",
      commit: "5".repeat(40),
      dirty: false,
      sourceMode: false,
    },
    ...overrides,
  };
}

function bridge(receipt = acceptedReceipt(), options = {}) {
  return buildLivingReceiptEvidence(receipt, {
    timebase: 1000,
    ...options,
  });
}

test("accepted receipt becomes deterministic explicit events, cues, and descendant-only lineage", () => {
  const receipt = acceptedReceipt();
  const before = structuredClone(receipt);
  const result = bridge(receipt);

  assert.equal(result.schema, LIVING_RECEIPT_BRIDGE_SCHEMA);
  assert.equal(result.policyVersion, LIVING_RECEIPT_BRIDGE_POLICY);
  assert.equal(result.authority, "descriptive-descendant-only");
  assert.equal(result.sourceReceipt.receiptSha256, hashCanonical(receipt));
  assert.equal(result.sourceReceipt.sourceSha256, receipt.source.sha256);
  assert.equal(result.sourceReceipt.scoreAddress, receipt.canonicalExecution.scoreAddress);
  assert.equal(result.sourceReceipt.timelineHash, receipt.canonicalExecution.timelineHash);
  assert.equal(result.sourceReceipt.outputSha256, receipt.output.sha256);

  assert.deepEqual(result.timing.events, [
    { tMs: 10643, strength: 1 },
    { tMs: 29091, strength: 1 },
    { tMs: 83569, strength: 1 },
  ]);
  assert.deepEqual(result.timing.cues, [
    { text: "Opening", startMs: 0, clearMs: 28000 },
    { text: "Lift", startMs: 28000, clearMs: 85000 },
    { text: "Final form", startMs: 85000, clearMs: 210560 },
  ]);
  assert.equal(result.timing.durationMs, 210560);

  assert.equal(result.lineage.candidateGenealogy.role, "toastmood:wire-heat");
  assert.deepEqual(result.lineage.hauntedHaiku.lines, [
    "rain waiting behind the glass",
    "the horizon arrives too early",
    "the light keeps count",
  ]);
  assert.equal(result.lineage.hauntedHaiku.authority, "descriptive-only");
  assert.equal(result.lineage.build.version, "0.0.0-beta.0");
  assert.equal(result.derivation.timebase, 1000);
  assert.deepEqual(receipt, before, "bridge must not mutate the accepted receipt");
  assert.deepEqual(bridge(receipt), result, "same receipt + policy must replay exactly");
});

test("bridge identity is canonical while source receipt changes remain attributable", () => {
  const receipt = acceptedReceipt();
  const reordered = Object.fromEntries(Object.entries(receipt).reverse());
  assert.equal(bridge(reordered).sourceReceipt.receiptSha256, bridge(receipt).sourceReceipt.receiptSha256);

  const changed = acceptedReceipt({
    output: { ...receipt.output, sha256: "6".repeat(64) },
  });
  assert.notEqual(bridge(changed).sourceReceipt.receiptSha256, bridge(receipt).sourceReceipt.receiptSha256);
  assert.notEqual(bridge(changed).sourceReceipt.outputSha256, bridge(receipt).sourceReceipt.outputSha256);
});

test("bridge refuses unaccepted receipts and unverifiable timeline timebase", () => {
  const unaccepted = acceptedReceipt({
    validation: { accepted: false, witnessWindowVerified: true },
  });
  assert.throws(() => bridge(unaccepted), /accepted receipt/i);

  assert.throws(
    () => bridge(acceptedReceipt(), { timebase: 24 }),
    /timebase/i,
  );

  const withoutReceiptedTimebase = acceptedReceipt();
  delete withoutReceiptedTimebase.treatment.foreignVisualMaterial.placement.timebase;
  assert.throws(
    () => buildLivingReceiptEvidence(withoutReceiptedTimebase),
    /timebase/i,
  );
});

test("bridge consumes bounded receipt evidence rather than forwarding arbitrary receipt JSON", () => {
  const receipt = acceptedReceipt({
    arbitraryInterpretation: { meaning: "the machine is conscious" },
  });
  const result = bridge(receipt);

  assert.equal(result.arbitraryInterpretation, undefined);
  assert.equal(result.lineage.arbitraryInterpretation, undefined);
  assert.ok(result.derivation.consumedPaths.includes("canonicalExecution.topologyEvents.events[].strikeTick"));
  assert.ok(result.derivation.consumedPaths.includes("treatment.sections[]"));
  assert.ok(result.derivation.unconsumedRootKeys.includes("arbitraryInterpretation"));
});

test("spec-input projection exposes only explicit HyperFood timing plus attributable bridge evidence", () => {
  const result = buildLivingReceiptSpecInputs(acceptedReceipt(), { timebase: 1000 });
  assert.deepEqual(result.timing, {
    durationMs: 210560,
    events: [
      { tMs: 10643, strength: 1 },
      { tMs: 29091, strength: 1 },
      { tMs: 83569, strength: 1 },
    ],
    cues: [
      { text: "Opening", startMs: 0, clearMs: 28000 },
      { text: "Lift", startMs: 28000, clearMs: 85000 },
      { text: "Final form", startMs: 85000, clearMs: 210560 },
    ],
  });
  assert.equal(result.evidence.schema, LIVING_RECEIPT_BRIDGE_SCHEMA);
  assert.equal(result.evidence.authority, "descriptive-descendant-only");
  assert.equal(result.receipt, undefined, "raw receipt must not cross as organism input");
});
