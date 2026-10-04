const test = require("node:test");
const assert = require("node:assert/strict");
const { buildListeningEye, LENSES } = require("../src/generation/listening-eye.cjs");

const analysis = {
  schema: "haunted-toaster/audio-analysis-fixture/v1",
  durationSeconds: 100,
  sections: [
    { startSeconds: 0, endSeconds: 20, energy: 0.2, label: "Opening" },
    { startSeconds: 20, endSeconds: 55, energy: 0.72, label: "Lift" },
    { startSeconds: 55, endSeconds: 82, energy: 0.91, label: "Peak" },
    { startSeconds: 82, endSeconds: 100, energy: 0.37, label: "Release" },
  ],
  phrases: [
    { atSeconds: 10, energy: 0.18 },
    { atSeconds: 20, energy: 0.6 },
    { atSeconds: 37.5, energy: 0.74 },
    { atSeconds: 55, energy: 0.9 },
    { atSeconds: 68.5, energy: 0.96 },
    { atSeconds: 82, energy: 0.44 },
    { atSeconds: 91, energy: 0.35 },
  ],
  transients: [
    { atSeconds: 20, energy: 0.82 },
    { atSeconds: 55, energy: 1 },
    { atSeconds: 68.5, energy: 0.94 },
    { atSeconds: 82, energy: 0.6 },
  ],
};

test("Listening Eye emits six deterministic influence-only lenses", () => {
  const input = {
    analysis,
    rootSeed: "album-a",
    albumContext: {
      albumId: "A",
      albumSeed: "seed",
      trackIndex: 2,
      trackCount: 9,
    },
  };
  const left = buildListeningEye(input);
  const right = buildListeningEye(input);
  assert.deepEqual(left, right);
  assert.equal(left.authority, "influence-only");
  assert.equal(left.lenses.length, 6);
  assert.deepEqual(left.lenses.map((lens) => lens.id), LENSES.map((lens) => lens.id));
  assert.match(left.listeningEyeSha256, /^[0-9a-f]{64}$/);
  for (const lens of left.lenses) {
    assert.equal(typeof lens.mapping.section, "string");
    for (const value of Object.values(lens.pressures)) {
      assert.ok(value >= 0 && value <= 1);
    }
  }
});

test("album position changes foreshadow/arrival without changing analysis witness", () => {
  const early = buildListeningEye({
    analysis,
    rootSeed: "x",
    albumContext: { trackIndex: 1, trackCount: 10 },
  });
  const late = buildListeningEye({
    analysis,
    rootSeed: "x",
    albumContext: { trackIndex: 10, trackCount: 10 },
  });
  assert.equal(early.analysisHash, late.analysisHash);
  assert.ok(early.album.foreshadowPressure > late.album.foreshadowPressure);
  assert.ok(early.lenses[0].pressures.foreshadow > late.lenses[0].pressures.foreshadow);
  assert.ok(late.lenses[0].pressures.arrival > early.lenses[0].pressures.arrival);
});

test("Listening Eye rejects missing structural analysis", () => {
  assert.throws(
    () => buildListeningEye({ analysis: { durationSeconds: 20, sections: [] } }),
    /at least one analysis section/,
  );
});
