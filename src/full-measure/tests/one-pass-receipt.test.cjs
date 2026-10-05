"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  beginOnePass,
  createOnePassSession,
  finishOnePass,
  pressLane,
  releaseLane,
} = require("../src/renderer/one-pass.js");
const { validateOnePassReceipt } = require("../src/franken-composer/bridge.cjs");

const materials = Array.from({ length: 6 }, (_, index) => ({
  slot: index + 1,
  roleId: `lane-${index + 1}`,
  materialId: `video-digest:lane-${index + 1}:${String(index + 1).repeat(12)}`,
  sourceDurationFrames: 240,
}));

function specimen() {
  let session = createOnePassSession({ materials, fps: 24, totalFrames: 1152 });
  session = beginOnePass(session, 0);
  session = pressLane(session, 0, 1000);
  session = releaseLane(session, 0, 1500);
  return finishOnePass(session, 48000).receipt;
}

test("privileged ONE PASS boundary accepts the sealed witness", () => {
  const receipt = specimen();
  assert.equal(validateOnePassReceipt(receipt).performanceHash, receipt.performanceHash);
});

test("privileged ONE PASS boundary refuses body or count tampering", () => {
  const receipt = specimen();
  assert.throws(
    () => validateOnePassReceipt({ ...receipt, eventCount: 99 }),
    /counts/i,
  );
  const events = receipt.events.map((event, index) =>
    index === 0 ? { ...event, frame: event.frame + 1 } : event,
  );
  assert.throws(
    () => validateOnePassReceipt({ ...receipt, events }),
    /fingerprint/i,
  );
});
