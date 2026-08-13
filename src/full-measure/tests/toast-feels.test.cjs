const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TOAST_FEEL_CONTRACT,
  TOAST_FEELS,
  getToastFeel,
  listToastFeels,
} = require("../src/toast-feels.cjs");

const EXPECTED_IDS = [
  "low-and-slow",
  "porch-ghost",
  "wire-heat",
  "ash-bloom",
  "burnt-halo",
  "risky-hybrid",
  "madd-clown-crazy-slots",
];

test("the canonical Toast Feel manifest has seven lawful feels in display order", () => {
  assert.equal(TOAST_FEEL_CONTRACT, "toast-feel-v1");
  assert.deepEqual(TOAST_FEELS.map(({ id }) => id), EXPECTED_IDS);
  assert.equal(TOAST_FEELS.filter(({ semanticClass }) => semanticClass === "ordinary").length, 6);
  assert.equal(TOAST_FEELS.filter(({ semanticClass }) => semanticClass === "madd-clown").length, 1);

  for (const feel of TOAST_FEELS) {
    assert.equal(feel.contractVersion, TOAST_FEEL_CONTRACT);
    assert.equal(feel.iconId, `toast-${feel.id}`);
    assert.ok(Object.isFrozen(feel));
    if (feel.semanticClass === "ordinary") {
      assert.deepEqual(Object.keys(feel.pressure), [
        "motion",
        "variance",
        "contrast",
        "imperfection",
        "camera",
        "temporal",
      ]);
      for (const value of Object.values(feel.pressure)) {
        assert.ok(Number.isFinite(value) && value >= -1 && value <= 1);
      }
    } else {
      assert.equal(feel.pressure, null);
    }
  }
});

test("Toast Feel lookup is exact and list results cannot mutate authority", () => {
  assert.equal(getToastFeel("wire-heat"), TOAST_FEELS[2]);
  assert.equal(getToastFeel("Wire Heat"), null);
  assert.equal(getToastFeel("unknown"), null);

  const first = listToastFeels();
  const second = listToastFeels();
  assert.notEqual(first, second);
  assert.deepEqual(first, second);
  first[0].name = "Nope";
  first.pop();
  assert.equal(listToastFeels().length, 7);
  assert.equal(getToastFeel("low-and-slow").name, "Low & Slow");
});
