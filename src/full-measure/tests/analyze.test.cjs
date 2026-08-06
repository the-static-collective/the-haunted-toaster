const test = require("node:test");
const assert = require("node:assert/strict");
const {
  detectSections,
  normalizeEnergy,
  targetSectionCount,
} = require("../src/render/analyze.cjs");

test("normalizes energy without allowing outliers to flatten the song", () => {
  const samples = [
    { time: 0, db: -120 },
    { time: 1, db: -38 },
    { time: 2, db: -31 },
    { time: 3, db: -24 },
    { time: 4, db: -17 },
    { time: 5, db: -2 },
  ];
  const normalized = normalizeEnergy(samples);

  assert.equal(normalized.length, samples.length);
  assert.equal(normalized[0].energy, 0);
  assert.ok(normalized[2].energy > normalized[1].energy);
  assert.ok(normalized[4].energy > normalized[3].energy);
  assert.equal(normalized[5].energy, 1);
});

test("detects a deterministic, gapless section map", () => {
  const samples = Array.from({ length: 180 }, (_, index) => {
    let db = -34;
    if (index >= 24 && index < 58) db = -22;
    if (index >= 58 && index < 93) db = -15;
    if (index >= 93 && index < 126) db = -27;
    if (index >= 126 && index < 162) db = -11;
    return { time: index, db };
  });

  const sections = detectSections(samples, 180);
  assert.equal(sections.length, targetSectionCount(180));
  assert.equal(sections[0].start, 0);
  assert.equal(sections.at(-1).end, 180);

  sections.forEach((section, index) => {
    assert.ok(section.end > section.start);
    assert.ok(section.energy >= 0 && section.energy <= 1);
    assert.ok(section.label.length > 0);
    if (index > 0) {
      assert.equal(section.start, sections[index - 1].end);
    }
  });
});

test("creates useful visual phases even when analysis samples are absent", () => {
  const sections = detectSections([], 43);
  assert.equal(sections.length, 4);
  assert.equal(sections[0].start, 0);
  assert.equal(sections.at(-1).end, 43);
  assert.equal(sections[0].label, "Opening");
  assert.equal(sections.at(-1).label, "Final form");
});

test("never lets sparse short-song boundaries escape the song duration", () => {
  const sections = detectSections(
    [
      { time: 0, db: -40 },
      { time: 1, db: -32 },
      { time: 2, db: -18 },
      { time: 3, db: -27 },
    ],
    4.032,
  );

  assert.equal(sections.length, 3);
  assert.equal(sections[0].start, 0);
  assert.equal(sections.at(-1).end, 4.032);
  sections.forEach((section) => {
    assert.ok(section.start >= 0);
    assert.ok(section.end <= 4.032);
  });
});
