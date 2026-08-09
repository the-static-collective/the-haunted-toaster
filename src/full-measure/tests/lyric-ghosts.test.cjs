const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  GHOST_POLICY_VERSION,
  TREATMENTS,
  extractCompostedFragments,
  resolveLyricGhostPlan,
} = require("../src/render/lyric-ghosts.cjs");
const { buildFilterGraph } = require("../src/render/render-legacy.cjs");
const { getPreset } = require("../src/render/presets.cjs");

test("extracts only explicit composted lyric material from rich lyric state", () => {
  const source = JSON.stringify({
    resolution: [
      { lineId: "a", state: "aligned", start: 1, text: "timed truth" },
      { lineId: "b", state: "composted", start: null, text: "lost in the house", sourceLines: [2] },
      { lineId: "c", state: "ignored", start: null, text: "do not render" },
    ],
  });

  assert.deepEqual(extractCompostedFragments(source), [
    { lineId: "b", text: "lost in the house", sourceLines: [2] },
  ]);
});

test("same compost and musical evidence resolve to the exact same ghost plan", () => {
  const input = {
    composted: [{ lineId: "ghost-line", text: "lost words still wander" }],
    duration: 42,
    sections: [
      { start: 0, end: 12, energy: 0.2 },
      { start: 12, end: 29, energy: 0.8 },
      { start: 29, end: 42, energy: 0.4 },
    ],
    scoreIdentity: "score:abc",
    profileIdentity: "renderer:def",
  };
  const first = resolveLyricGhostPlan(input);
  const second = resolveLyricGhostPlan(input);

  assert.equal(first.policyVersion, GHOST_POLICY_VERSION);
  assert.equal(first.semanticTimingAuthority, "none");
  assert.equal(first.hash, second.hash);
  assert.deepEqual(first, second);
  assert.ok(first.apparitions.length >= 1);
  for (const apparition of first.apparitions) {
    assert.equal(apparition.semanticTimingAuthority, "none");
    assert.ok(TREATMENTS.includes(apparition.treatmentId));
    assert.ok(apparition.start >= 0 && apparition.end <= 42);
    assert.ok(apparition.end > apparition.start);
    assert.ok(apparition.x >= 0.08 && apparition.x <= 0.92);
    assert.ok(apparition.y >= 0.08 && apparition.y <= 0.8);
  }
});

test("ghost timing changes only when recorded inputs change", () => {
  const base = {
    composted: [{ lineId: "x", text: "memory" }],
    duration: 30,
    sections: [{ start: 0, end: 30, energy: 0.5 }],
    scoreIdentity: "score:a",
  };
  const a = resolveLyricGhostPlan(base);
  const b = resolveLyricGhostPlan({ ...base, scoreIdentity: "score:b" });
  assert.notEqual(a.hash, b.hash);
});

test("plain lyrics do not silently become compost", () => {
  const plan = resolveLyricGhostPlan({ lyrics: "ordinary lyric line", duration: 10 });
  assert.equal(plan.apparitions.length, 0);
  assert.equal(plan.fragments.length, 0);
});

test("shared ASS overlay renders compost as Ghost events without admitting subtitle cues", async () => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "lyric-ghost-test-"));
  try {
    const lyrics = JSON.stringify({
      resolution: [
        { lineId: "truth", state: "aligned", start: 1, end: 2, text: "timed truth" },
        { lineId: "lost", state: "composted", start: null, text: "lost in the house" },
      ],
    });
    const filter = await buildFilterGraph({
      tempDirectory,
      analysis: {
        filename: "fixture.wav",
        duration: 12,
        sections: [{ index: 0, label: "whole", start: 0, end: 12, energy: 0.5 }],
      },
      preset: getPreset("porchlight"),
      title: "",
      artist: "",
      lyrics,
      hasImage: false,
      width: 1920,
      height: 1080,
      fps: 30,
    });
    const overlay = await fs.readFile(path.join(tempDirectory, "text-overlay.ass"), "utf8");

    assert.equal(filter.lyricTrack.cues.some((cue) => cue.text === "lost in the house"), false);
    assert.equal(filter.lyricGhostPlan.semanticTimingAuthority, "none");
    assert.ok(filter.lyricGhostPlan.apparitions.length > 0);
    assert.match(overlay, /Style: Ghost/);
    assert.match(overlay, /,Ghost,/);
    assert.match(overlay, /lost|house/);
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
});
