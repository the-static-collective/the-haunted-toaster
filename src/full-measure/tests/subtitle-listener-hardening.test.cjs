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
