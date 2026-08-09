const test = require("node:test");
const assert = require("node:assert/strict");
const {
  HOLD_POLICY,
  INNER_CADENCE_23976,
  innerStateIndexForOutputFrame,
  resolveTemporalSampling,
} = require("../src/render/temporal-sampling.cjs");

test("23.976 inner cadence maps 30fps output frames with deterministic holds", () => {
  const states = Array.from({ length: 20 }, (_, frame) =>
    innerStateIndexForOutputFrame(frame, "30/1", INNER_CADENCE_23976),
  );
  assert.deepEqual(states, [
    0, 0, 1, 2, 3,
    3, 4, 5, 6, 7,
    7, 8, 9, 10, 11,
    11, 12, 13, 14, 15,
  ]);
});

test("rational mapping remains exact over long runs without decimal drift", () => {
  const frame = 30 * 60 * 60 * 6;
  const state = innerStateIndexForOutputFrame(frame, "30/1", INNER_CADENCE_23976);
  const expected = Number((BigInt(frame) * 24000n) / (30n * 1001n));
  assert.equal(state, expected);
});

test("sampling policy records exact outer and inner cadence plus hold semantics", () => {
  assert.deepEqual(resolveTemporalSampling(INNER_CADENCE_23976), {
    outerCadence: "30/1",
    innerCadence: "24000/1001",
    holdPolicy: HOLD_POLICY,
    ffmpegInnerFilter: "fps=fps=24000/1001:round=down",
    ffmpegOuterFilter: "fps=fps=30/1:round=down",
  });
});

test("sampling policy refuses decimal cadence approximations", () => {
  assert.throws(() => resolveTemporalSampling("23.976"), /Unsupported inner cadence/);
});
