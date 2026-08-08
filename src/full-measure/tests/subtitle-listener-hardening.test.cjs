const test = require("node:test");
const assert = require("node:assert/strict");
const {
  alignLyricsToTranscript,
} = require("../src/align/matcher.cjs");
const {
  normalizeCueTimeline,
  selectCueForTime,
} = require("../src/render/lyrics.cjs");

test("a missing lyric cannot consume the following chorus match", () => {
  const result = alignLyricsToTranscript(
    [
      "Anchor line",
      "Chorus returns tonight",
      "Chorus returns",
    ].join("\n"),
    {
      segments: [
        { start: 1, end: 2, text: "anchor line", confidence: 0.94 },
        { start: 8, end: 9, text: "chorus returns", confidence: 0.94 },
      ],
    },
    12,
  );

  assert.equal(result.cues[0].start, 1);
  assert.equal(result.cues[1].status, "unmatched");
  assert.equal(result.cues[1].start, null);
  assert.equal(result.cues[2].start, 8);
  assert.equal(result.cues[2].heard, "chorus returns");
  assert.equal(result.matchedCount, 2);
});

test("noisy transcription preserves tentative placements for human review", () => {
  const result = alignLyricsToTranscript(
    [
      "The house takes attendance",
      "The porch light stays on",
      "The spoon remembers everything",
      "The compost heap joins the band",
    ].join("\n"),
    {
      segments: [
        { start: 2, end: 3, text: "house attendance", confidence: 0.25 },
        { start: 7, end: 8, text: "porch stays on", confidence: 0.3 },
        { start: 13, end: 14, text: "spoon remembers", confidence: 0.28 },
        { start: 19, end: 20, text: "compost joins band", confidence: 0.3 },
      ],
    },
    24,
  );

  const placed = result.cues.filter((cue) => Number.isFinite(cue.start));
  assert.ok(placed.length >= 3, `expected several usable anchors, got ${placed.length}`);
  assert.ok(
    placed.some((cue) => cue.status === "low" || cue.status === "medium"),
    "expected tentative placements to remain visible for review",
  );
  assert.ok(result.matchedCount >= 3);
});

test("an end-less lyric disappears before a long vocal silence", () => {
  const timeline = normalizeCueTimeline(
    [
      { start: 1, end: null, text: "The porch light stays" },
      { start: 12, end: null, text: "The chorus returns" },
    ],
    20,
  );

  assert.equal(selectCueForTime(timeline, 1.25).text, "The porch light stays");
  assert.equal(selectCueForTime(timeline, 5), null);
  assert.equal(selectCueForTime(timeline, 11.9), null);
  assert.equal(selectCueForTime(timeline, 12.25).text, "The chorus returns");
});

test("explicit vocal ends remain authoritative", () => {
  const timeline = normalizeCueTimeline(
    [
      { start: 2, end: 2.8, text: "Short sung line" },
      { start: 10, end: 11.2, text: "Next sung line" },
    ],
    15,
  );

  assert.equal(selectCueForTime(timeline, 2.79).text, "Short sung line");
  assert.equal(selectCueForTime(timeline, 2.8), null);
  assert.equal(selectCueForTime(timeline, 9), null);
});
