"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createOnePassSession,
  beginOnePass,
  pressLane,
  releaseLane,
  finishOnePass,
  frameAtMs,
} = require("../src/renderer/one-pass.js");

const materials = Array.from({ length: 6 }, (_, index) => ({
  slot: index + 1,
  materialId: `video-digest:lane-${index + 1}:${String(index + 1).repeat(12)}`,
  sourceDurationFrames: 240,
}));

test("ONE PASS converts unsnapped human timing into real Franken placements", () => {
  let session = createOnePassSession({ materials, fps: 24, totalFrames: 1152 });
  session = beginOnePass(session, 1000);

  assert.equal(frameAtMs(session, 2000), 24);

  session = pressLane(session, 0, 2000);
  session = releaseLane(session, 0, 2500);

  assert.equal(session.placements.length, 1);
  assert.equal(session.placements[0].materialId, materials[0].materialId);
  assert.equal(session.placements[0].sceneId, "ARRIVE");
  assert.equal(session.placements[0].startOffsetFrames, 24);
  assert.equal(session.placements[0].durationFrames, 12);
  assert.equal(session.events[0].frame, 24);
  assert.equal(session.events[1].frame, 36);
});

test("ONE PASS crosses scene boundaries by performance time, never by snap", () => {
  let session = createOnePassSession({ materials, fps: 24, totalFrames: 1152 });
  session = beginOnePass(session, 0);

  session = pressLane(session, 1, 16083);
  session = releaseLane(session, 1, 16500);

  assert.equal(session.events[0].frame, 386);
  assert.equal(session.placements[0].sceneId, "CROSS");
  assert.equal(session.placements[0].startOffsetFrames, 2);
});

test("keyboard repeat cannot counterfeit extra strikes while a lane is held", () => {
  let session = createOnePassSession({ materials, fps: 24, totalFrames: 1152 });
  session = beginOnePass(session, 0);

  session = pressLane(session, 2, 1000);
  const repeated = pressLane(session, 2, 1020);
  assert.deepEqual(repeated, session);

  session = releaseLane(session, 2, 1500);
  assert.equal(session.events.length, 2);
  assert.equal(session.placements.length, 1);
});

test("finish closes held lanes at the real end frame and seals immutable witness", () => {
  let session = createOnePassSession({ materials, fps: 24, totalFrames: 1152 });
  session = beginOnePass(session, 0);
  session = pressLane(session, 5, 47000);

  const finished = finishOnePass(session, 48000);

  assert.equal(finished.status, "finished");
  assert.equal(finished.events.at(-1).phase, "up");
  assert.equal(finished.events.at(-1).frame, 1151);
  assert.equal(finished.receipt.schema, "static-collective/one-pass-performance-receipt/v0");
  assert.equal(finished.receipt.authority, "witness-only");
  assert.equal(finished.receipt.performanceHash.length, 64);
  assert.equal(finished.receipt.placements.length, 1);
  assert.throws(() => pressLane(finished, 0, 48100), /finished/i);
});

test("same material map plus same event frames yields the same performance hash", () => {
  const perform = () => {
    let session = createOnePassSession({ materials, fps: 24, totalFrames: 1152 });
    session = beginOnePass(session, 100);
    session = pressLane(session, 0, 1100);
    session = releaseLane(session, 0, 1600);
    session = pressLane(session, 4, 8100);
    session = releaseLane(session, 4, 9000);
    return finishOnePass(session, 48100);
  };

  assert.equal(perform().receipt.performanceHash, perform().receipt.performanceHash);
});

test("ONE PASS is bounded to six admitted lanes and refuses replay of the same session", () => {
  assert.throws(
    () => createOnePassSession({ materials: materials.slice(0, 5), fps: 24, totalFrames: 1152 }),
    /six/i,
  );

  let session = createOnePassSession({ materials, fps: 24, totalFrames: 1152 });
  session = beginOnePass(session, 0);
  session = finishOnePass(session, 48000);

  assert.throws(() => beginOnePass(session, 49000), /finished|once/i);
});
