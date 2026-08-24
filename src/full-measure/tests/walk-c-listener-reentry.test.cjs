const assert = require("node:assert/strict");
const test = require("node:test");

const {
  alignLyricsToTranscript,
} = require("../src/align/matcher.cjs");
const {
  alignLyricsToTranscriptWithAnchors,
} = require("../src/align/anchor-guided.cjs");

function segment(text, start, end, probability = 0.99) {
  return { text, start, end, probability };
}

test("Opening Backfill recovers only bounded opening evidence before the first trusted landmark", () => {
  const lyrics = [
    "leave the light on",
    "the chair stayed",
    "we stay here",
  ].join("\n");
  const transcript = [
    segment("leave light burning", 1, 1.5, 0.93),
    segment("chair was there", 3, 3.5, 0.93),
    segment("we stay here", 7, 7.5),
  ];

  const result = alignLyricsToTranscript(lyrics, transcript, 12, {
    leadSeconds: 0,
  });

  assert.equal(result.cues[0].text, "leave the light on");
  assert.ok(Number.isFinite(result.cues[0].start));
  assert.ok(result.cues[0].end <= 7);
  assert.equal(result.cues[1].status, "unmatched");
  assert.equal(result.cues[2].status, "high");
  assert.equal(result.cues[2].start, 7);
});

test("Opening Backfill keeps weak bounded evidence unresolved", () => {
  const lyrics = [
    "the chair stayed",
    "we stay here",
  ].join("\n");
  const transcript = [
    segment("chair was there", 3, 3.5, 0.93),
    segment("we stay here", 7, 7.5),
  ];

  const result = alignLyricsToTranscript(lyrics, transcript, 12, {
    leadSeconds: 0,
  });

  assert.equal(result.cues[0].status, "unmatched");
  assert.equal(result.cues[0].start, null);
  assert.equal(result.cues[1].start, 7);
});

test("anchor islands preserve human timestamps and keep machine recovery inside nearest boundaries", () => {
  const lyrics = [
    "opening echo",
    "first anchor",
    "middle echo",
    "second anchor",
    "closing echo",
  ].join("\n");
  const transcript = [
    segment("opening echo", 1, 1.5),
    segment("first anchor", 5.1, 5.6),
    segment("middle echo", 8, 8.5),
    segment("second anchor", 12.5, 13),
    segment("closing echo", 16, 16.5),
  ];
  const anchors = [
    { lineIndex: 1, text: "first anchor", time: 5.123 },
    { lineIndex: 3, text: "second anchor", time: 12.456 },
  ];

  const result = alignLyricsToTranscriptWithAnchors(lyrics, transcript, 20, {
    leadSeconds: 0,
    anchors,
  });

  assert.equal(result.cues[1].status, "human");
  assert.equal(result.cues[1].start, 5.123);
  assert.equal(result.cues[3].status, "human");
  assert.equal(result.cues[3].start, 12.456);
  assert.ok(result.cues[0].end < 5.123);
  assert.ok(result.cues[2].start > 5.123);
  assert.ok(result.cues[2].end < 12.456);
  assert.ok(result.cues[4].start > 12.456);
});

test("repeated-section recovery stays on the correct side of human anchor islands", () => {
  const lyrics = [
    "silver river",
    "first anchor",
    "silver river",
    "second anchor",
    "silver river",
  ].join("\n");
  const transcript = [
    segment("silver river", 2, 2.5),
    segment("first anchor", 5, 5.5),
    segment("silver river", 9, 9.5),
    segment("second anchor", 13, 13.5),
    segment("silver river", 17, 17.5),
  ];
  const anchors = [
    { lineIndex: 1, text: "first anchor", time: 5.111 },
    { lineIndex: 3, text: "second anchor", time: 13.222 },
  ];

  const result = alignLyricsToTranscriptWithAnchors(lyrics, transcript, 20, {
    leadSeconds: 0,
    anchors,
  });

  assert.ok(result.cues[0].start < 5.111);
  assert.ok(result.cues[2].start > 5.111 && result.cues[2].end < 13.222);
  assert.ok(result.cues[4].start > 13.222);
  assert.equal(result.cues[1].start, 5.111);
  assert.equal(result.cues[3].start, 13.222);
});
