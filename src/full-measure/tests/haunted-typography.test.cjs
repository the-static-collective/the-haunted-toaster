const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TREATMENTS,
  applyCaseMode,
  assOverride,
  resolveHauntedTypography,
} = require("../src/render/haunted-typography.cjs");

const CUES = [
  { text: "the house takes attendance" },
  { text: "a ghost keeps the receipt" },
  { text: "we play where we arrive" },
  { text: "the orchard remembers" },
];

test("same score and cue track resolve byte-identical typography plans", () => {
  const input = {
    scoreIdentity: "htvs1_example",
    profileIdentity: "toaster-raster-2",
    title: "Wire Orchard",
    artist: "The Static Collective",
    cues: CUES,
  };
  const first = resolveHauntedTypography(input);
  const second = resolveHauntedTypography(input);
  assert.deepEqual(second, first);
  assert.equal(second.hash, first.hash);
});

test("score identity participates in the treatment sequence", () => {
  const first = resolveHauntedTypography({
    scoreIdentity: "htvs1_parent-a",
    profileIdentity: "toaster-raster-2",
    cues: CUES,
  });
  const second = resolveHauntedTypography({
    scoreIdentity: "htvs1_parent-b",
    profileIdentity: "toaster-raster-2",
    cues: CUES,
  });
  assert.notEqual(first.hash, second.hash);
  assert.notDeepEqual(
    first.cues.map((cue) => cue.identityHash),
    second.cues.map((cue) => cue.identityHash),
  );
});

test("cue identity is stable and can vary treatment across one lyric track", () => {
  const plan = resolveHauntedTypography({
    scoreIdentity: "htvs1_variation-proof",
    profileIdentity: "toaster-raster-2",
    cues: CUES,
  });
  assert.equal(plan.cues.length, CUES.length);
  assert.equal(new Set(plan.cues.map((cue) => cue.identityHash)).size, CUES.length);
  for (const cue of plan.cues) {
    assert.ok(TREATMENTS.some((treatment) => treatment.id === cue.treatmentId));
  }
});

test("resolved treatments contain only bounded declarative ASS morphology", () => {
  const plan = resolveHauntedTypography({
    scoreIdentity: "htvs1_bounded",
    cues: CUES,
  });
  for (const cue of plan.cues) {
    assert.ok(cue.scaleX >= 50 && cue.scaleX <= 150);
    assert.ok(cue.scaleY >= 90 && cue.scaleY <= 140);
    assert.ok(Math.abs(cue.angle) <= 180);
    assert.ok(cue.outline >= 0 && cue.outline <= 4);
    assert.ok(cue.shadow >= 0 && cue.shadow <= 6);
    assert.match(assOverride(cue), /^\{\\fscx/);
  }
});

test("case treatment is deterministic and does not rewrite non-letter content", () => {
  assert.equal(applyCaseMode("Ghost 23!", "upper"), "GHOST 23!");
  assert.equal(applyCaseMode("Ghost 23!", "alternating"), "GhOsT 23!");
  assert.equal(applyCaseMode("Ghost 23!", "preserve"), "Ghost 23!");
});
