const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createOrderedEnvelope,
  pushOrderedEnvelope,
  peelOrderedEnvelope,
  replayOrderedEnvelope,
} = require("../src/lab/ordered-envelope.cjs");

test("push prepends a token while preserving the prior surface and worldline", () => {
  const seed = createOrderedEnvelope(".");
  const a = pushOrderedEnvelope(seed, "A");
  const ba = pushOrderedEnvelope(a, "B");
  const cba = pushOrderedEnvelope(ba, "C");

  assert.equal(seed.surface, ".");
  assert.deepEqual(seed.worldline, []);
  assert.equal(a.surface, "A.");
  assert.deepEqual(a.worldline, ["A"]);
  assert.equal(ba.surface, "BA.");
  assert.deepEqual(ba.worldline, ["A", "B"]);
  assert.equal(cba.surface, "CBA.");
  assert.deepEqual(cba.worldline, ["A", "B", "C"]);
});

test("peel removes exactly one latest wrap and recovers the attributable prior state", () => {
  const cba = replayOrderedEnvelope(".", ["A", "B", "C"]);
  const peeled = peelOrderedEnvelope(cba);

  assert.equal(peeled.token, "C");
  assert.equal(peeled.envelope.surface, "BA.");
  assert.deepEqual(peeled.envelope.worldline, ["A", "B"]);
});

test("replay reproduces the exact surface and worldline", () => {
  const first = replayOrderedEnvelope(".", ["A", "B", "C"]);
  const second = replayOrderedEnvelope(".", first.worldline);

  assert.deepEqual(second, first);
});

test("the same final surface can retain a different causal worldline", () => {
  const chunked = replayOrderedEnvelope(".", ["AB", "C"]);
  const stepped = replayOrderedEnvelope(".", ["B", "A", "C"]);

  assert.equal(chunked.surface, "CAB.");
  assert.equal(stepped.surface, "CAB.");
  assert.notDeepEqual(chunked.worldline, stepped.worldline);
  assert.notDeepEqual(chunked, stepped);
});

test("push refuses an envelope whose visible surface no longer matches its causal worldline", () => {
  const valid = replayOrderedEnvelope(".", ["A", "B", "C"]);
  const corrupt = { ...valid, surface: "X" + valid.surface };

  assert.throws(
    () => pushOrderedEnvelope(corrupt, "D"),
    /ordered envelope surface does not match its worldline/,
  );
});
