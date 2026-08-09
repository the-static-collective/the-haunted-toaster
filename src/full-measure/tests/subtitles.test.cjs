const assert = require("node:assert/strict");
const test = require("node:test");
const {
  canonicalSubtitleCues,
  formatSubtitleTimestamp,
  serializeSrt,
  serializeWebVtt,
} = require("../src/render/subtitles.cjs");

test("formats subtitle timestamps at millisecond precision", () => {
  assert.equal(formatSubtitleTimestamp(0, ","), "00:00:00,000");
  assert.equal(formatSubtitleTimestamp(61.2346, ","), "00:01:01,235");
  assert.equal(formatSubtitleTimestamp(3661.007, "."), "01:01:01.007");
});

test("serializes normalized cues identically from the canonical lyric timing law", () => {
  const cues = [
    { start: 1, end: 2.5, text: "first line" },
    { start: 4, end: null, text: "second line" },
    { start: 8, end: 12, text: "third line" },
  ];

  assert.deepEqual(canonicalSubtitleCues(cues, 10), [
    { start: 1, end: 2.5, text: "first line" },
    { start: 4, end: 5.66, text: "second line" },
    { start: 8, end: 10, text: "third line" },
  ]);

  assert.equal(
    serializeSrt(cues, 10),
    "1\n00:00:01,000 --> 00:00:02,500\nfirst line\n\n2\n00:00:04,000 --> 00:00:05,660\nsecond line\n\n3\n00:00:08,000 --> 00:00:10,000\nthird line\n",
  );
});

test("preserves multiline Unicode subtitle text", () => {
  const cues = [{ start: 0.125, end: 2, text: "holy ghost\n雪・שלום" }];
  assert.equal(
    serializeWebVtt(cues, 3),
    "WEBVTT\n\n00:00:00.125 --> 00:00:02.000\nholy ghost\n雪・שלום\n",
  );
});

test("empty lyric tracks emit deterministic empty sidecars", () => {
  assert.equal(serializeSrt([], 30), "");
  assert.equal(serializeWebVtt([], 30), "WEBVTT\n");
});

test("same cues always produce byte-identical SRT and VTT", () => {
  const cues = [
    { start: 0.3333, end: 1.7777, text: "A" },
    { start: 1.7777, end: 3.0004, text: "B" },
  ];
  assert.equal(serializeSrt(cues, 4), serializeSrt(cues, 4));
  assert.equal(serializeWebVtt(cues, 4), serializeWebVtt(cues, 4));
});
