const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FIRST_BETA_LIVING_RECEIPT_PROFILE,
  buildFirstBetaLivingReceiptSpecimen,
} = require("../src/hyperfood/living-receipt-specimen.cjs");

function receipt() {
  return {
    schema: "full-measure.video-receipt.v1",
    receiptId: "first-beta",
    source: {
      sha256: "a".repeat(64),
      durationSeconds: 4.2,
    },
    canonicalExecution: {
      scoreAddress: `htvs1_${"b".repeat(64)}`,
      timelineHash: "c".repeat(64),
      topologyEvents: {
        policyVersion: "topology-events-v0.1",
        planSha256: "d".repeat(64),
        eventCount: 2,
        refusal: null,
        events: [
          {
            id: "speak-0",
            kind: "speak",
            eventSha256: "e".repeat(64),
            strikeTick: 1000,
          },
          {
            id: "grow-0",
            kind: "grow",
            eventSha256: "f".repeat(64),
            strikeTick: 3100,
          },
        ],
      },
    },
    treatment: {
      sections: [
        { index: 0, label: "Opening", startSeconds: 0, endSeconds: 2.1, energy: 0.4 },
        { index: 1, label: "Final form", startSeconds: 2.1, endSeconds: 4.2, energy: 0.8 },
      ],
      foreignVisualMaterial: {
        placement: {
          timebase: 1000,
          startTick: 0,
          endTick: 4200,
          durationTicks: 4200,
          renderDurationSeconds: 4.2,
        },
      },
    },
    output: {
      sha256: "1".repeat(64),
      durationSeconds: 4.2,
    },
    validation: { accepted: true },
  };
}

function input(overrides = {}) {
  return {
    receipt: receipt(),
    surfaceAsset: {
      id: "accepted-beta-video",
      mediaType: "video/mp4",
      sha256: "1".repeat(64),
      byteLength: 123456,
    },
    target: { width: 1920, height: 1080, fps: 30, alpha: false },
    seed: 481516,
    frameParameters: {
      depth: 4,
      stepMs: 400,
      staggerMs: 120,
      scalePerDepth: 0.86,
      rotationPerDepthDeg: 2,
      cropPerDepth: 0.05,
      pivotX: 0.5,
      pivotY: 0.5,
      opacityPerDepth: 0.9,
      entryOrder: "outer-first",
      exitOrder: "inner-first",
    },
    pulseParameters: {
      attackMs: 60,
      holdMs: 20,
      decayMs: 260,
      scaleAmount: 0.04,
      rotationDeg: 1.5,
      translateXPx: 8,
      translateYPx: -5,
      opacityAmount: 0,
      brightnessAmount: 0.08,
      blurPx: 0,
      phaseOffsetMs: 0,
    },
    ...overrides,
  };
}

test("first living receipt is a lawful FRAME-EAT-FRAME -> PULSE graph over the accepted beta video", () => {
  const result = buildFirstBetaLivingReceiptSpecimen(input());

  assert.equal(FIRST_BETA_LIVING_RECEIPT_PROFILE, "frame-eat-frame-pulse/v0");
  assert.match(result.specimenId, /^hf0_[0-9a-f]{64}$/);
  assert.deepEqual(result.spec.graph.lineage, [
    "FRAME-EAT-FRAME@0.1.0",
    "PULSE@0.1.0",
  ]);
  assert.equal(result.spec.graph.output, "pulse.surface");
  assert.deepEqual(result.spec.timing.events, [
    { tMs: 1000, strength: 1 },
    { tMs: 3100, strength: 1 },
  ]);
  assert.deepEqual(result.spec.timing.cues, [
    { text: "Opening", startMs: 0, clearMs: 2100 },
    { text: "Final form", startMs: 2100, clearMs: 4200 },
  ]);
  assert.ok(!result.spec.graph.lineage.includes("GHOST-TEXT@0.1.0"));
  assert.equal(result.evidence.authority, "descriptive-descendant-only");
  assert.equal(result.evidence.sourceReceipt.outputSha256, "1".repeat(64));
});

test("same accepted receipt, assets, graph parameters, target, and seed replay the same specimen", () => {
  const first = buildFirstBetaLivingReceiptSpecimen(input());
  const second = buildFirstBetaLivingReceiptSpecimen(input());
  assert.equal(first.specimenId, second.specimenId);
  assert.deepEqual(first.spec, second.spec);
  assert.deepEqual(first.evidence, second.evidence);
});

test("one declared organism parameter delta changes specimen identity", () => {
  const parent = input();
  const child = input({
    pulseParameters: {
      ...parent.pulseParameters,
      scaleAmount: 0.09,
    },
  });
  assert.notEqual(
    buildFirstBetaLivingReceiptSpecimen(parent).specimenId,
    buildFirstBetaLivingReceiptSpecimen(child).specimenId,
  );
});

test("accepted-video Surface bytes must agree with the receipt output identity", () => {
  const mismatched = input({
    surfaceAsset: {
      id: "accepted-beta-video",
      mediaType: "video/mp4",
      sha256: "9".repeat(64),
      byteLength: 123456,
    },
  });
  assert.throws(
    () => buildFirstBetaLivingReceiptSpecimen(mismatched),
    /output.*sha|surface.*sha|identity/i,
  );
});

test("raw receipt stays outside the semantic specimen", () => {
  const result = buildFirstBetaLivingReceiptSpecimen(input());
  assert.equal(result.spec.receipt, undefined);
  assert.equal(result.spec.sourceReceipt, undefined);
  assert.equal(result.spec.evidence, undefined);
  assert.equal(result.evidence.schema, "haunted-toaster/hyperfood-living-receipt-bridge/v0");
});
