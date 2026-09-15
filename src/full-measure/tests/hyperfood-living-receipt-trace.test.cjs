const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildFirstBetaLivingReceiptSpecimen,
} = require("../src/hyperfood/living-receipt-specimen.cjs");
const {
  LIVING_RECEIPT_TRACE_SCHEMA,
  evaluateFirstBetaLivingReceiptTrace,
} = require("../src/hyperfood/living-receipt-trace.cjs");

function receipt() {
  return {
    schema: "full-measure.video-receipt.v1",
    receiptId: "trace-beta",
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

function specimen() {
  return buildFirstBetaLivingReceiptSpecimen({
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
  });
}

test("first living receipt trace composes FRAME-EAT-FRAME and PULSE witness states", () => {
  const living = specimen();
  const trace = evaluateFirstBetaLivingReceiptTrace(living, [0, 1060, 3180, 4200]);

  assert.equal(LIVING_RECEIPT_TRACE_SCHEMA, "haunted-toaster/hyperfood-living-receipt-trace/v0");
  assert.equal(trace.schema, LIVING_RECEIPT_TRACE_SCHEMA);
  assert.equal(trace.profile, "frame-eat-frame-pulse/v0");
  assert.equal(trace.specimenId, living.specimenId);
  assert.equal(trace.authority, "descriptive-descendant-only");
  assert.deepEqual(trace.witnessTimesMs, [0, 1060, 3180, 4200]);
  assert.equal(trace.states.length, 4);
  assert.equal(trace.states[0].frameEatFrame.tMs, 0);
  assert.equal(trace.states[0].pulse.tMs, 0);
  assert.equal(trace.states[1].pulse.envelope, 1);
  assert.equal(trace.states[2].pulse.envelope, 1);
  assert.ok(trace.states[2].frameEatFrame.levels.length > 0);
});

test("same living specimen and witness times replay byte-equivalent trace structure", () => {
  const living = specimen();
  const first = evaluateFirstBetaLivingReceiptTrace(living, [3180, 0, 1060, 1060]);
  const second = evaluateFirstBetaLivingReceiptTrace(living, [0, 1060, 3180]);
  assert.deepEqual(first, second);
});

test("living trace refuses profile drift and specimen identity drift", () => {
  const living = specimen();
  assert.throws(
    () => evaluateFirstBetaLivingReceiptTrace({ ...living, profile: "future-creature/v9" }, [0]),
    /profile/i,
  );
  assert.throws(
    () => evaluateFirstBetaLivingReceiptTrace({ ...living, specimenId: `hf0_${"9".repeat(64)}` }, [0]),
    /specimen.*identity|identity.*specimen/i,
  );
});
