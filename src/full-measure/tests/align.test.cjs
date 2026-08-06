const test = require("node:test");
const assert = require("node:assert/strict");
const {
  alignLyricsToTranscript,
  cuesToLrc,
  extractLyricLines,
  formatLrcTimestamp,
  normalizeTranscript,
  stringSimilarity,
} = require("../src/align/matcher.cjs");

function heard(text, start, end, probability = 0.86) {
  return {
    timestamps: {
      from: `00:00:${start.toFixed(3)}`,
      to: `00:00:${end.toFixed(3)}`,
    },
    offsets: {
      from: Math.round(start * 1_000),
      to: Math.round(end * 1_000),
    },
    text,
    tokens: [{ text, p: probability }],
  };
}

test("keeps supplied lyric text authoritative while borrowing ASR timing", () => {
  const lyrics = [
    "[Verse 1]",
    "The spoon remembers",
    "The porch light stays",
    "Full measure comes out",
  ].join("\n");
  const transcript = {
    transcription: [
      heard("the", 1, 1.25),
      heard("spoon", 1.25, 1.7),
      heard("remembers", 1.7, 2.25),
      heard("the", 4.1, 4.32),
      heard("porch", 4.32, 4.72),
      heard("lights", 4.72, 5.08),
      heard("stay", 5.08, 5.48),
      heard("full", 7.2, 7.55),
      heard("measure", 7.55, 8.05),
      heard("comes", 8.05, 8.4),
      heard("out", 8.4, 8.8),
    ],
  };

  const result = alignLyricsToTranscript(lyrics, transcript, 10);
  assert.equal(result.lineCount, 3);
  assert.equal(result.matchedCount, 3);
  assert.deepEqual(
    result.cues.map((cue) => cue.text),
    [
      "The spoon remembers",
      "The porch light stays",
      "Full measure comes out",
    ],
  );
  assert.deepEqual(
    result.cues.map((cue) => cue.start),
    [1, 4.1, 7.2],
  );
  assert.ok(result.cues[1].similarity < 1);
  assert.notEqual(result.cues[1].heard, result.cues[1].text);
});

test("consumes repeated chorus lines in chronological order", () => {
  const lyrics = [
    "The porch light stays",
    "We are coming home",
    "The porch light stays",
  ].join("\n");
  const transcript = {
    segments: [
      { start: 2, end: 3, text: "porch light stays", confidence: 0.9 },
      { start: 4, end: 5, text: "we are coming home", confidence: 0.9 },
      { start: 12, end: 13, text: "porch light stays", confidence: 0.9 },
    ],
  };

  const result = alignLyricsToTranscript(lyrics, transcript, 15);
  assert.deepEqual(
    result.cues.map((cue) => cue.start),
    [2, 4, 12],
  );
});

test("can place Listener entrances slightly ahead without changing transcript evidence", () => {
  const result = alignLyricsToTranscript(
    "The porch light stays",
    {
      segments: [
        { start: 2, end: 3, text: "porch light stays", confidence: 0.9 },
      ],
    },
    8,
    { leadSeconds: 0.22 },
  );

  assert.equal(result.cues[0].start, 1.78);
  assert.equal(result.cues[0].end, 3);
});

test("leaves an honest gap when the singer cannot be matched", () => {
  const result = alignLyricsToTranscript(
    ["The spoon remembers", "A line no witness heard"].join("\n"),
    {
      words: [
        { start: 1, end: 1.3, word: "the", probability: 0.9 },
        { start: 1.3, end: 1.8, word: "spoon", probability: 0.9 },
        { start: 1.8, end: 2.4, word: "remembers", probability: 0.9 },
      ],
    },
    8,
  );

  assert.equal(result.matchedCount, 1);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.cues[1].status, "unmatched");
  assert.equal(result.cues[1].start, null);
});

test("reads whisper.cpp offsets and omits special tokens", () => {
  const normalized = normalizeTranscript({
    transcription: [
      {
        text: "<|startoftranscript|>",
        offsets: { from: 0, to: 200 },
      },
      {
        text: " witness ",
        offsets: { from: 1250, to: 1825 },
        tokens: [{ text: " witness", p: 0.77 }],
      },
    ],
  });

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].start, 1.25);
  assert.equal(normalized[0].end, 1.825);
  assert.equal(normalized[0].probability, 0.77);
});

test("exports only placed lines to portable LRC", () => {
  const lrc = cuesToLrc(
    [
      { start: 1.234, text: "The spoon remembers" },
      { start: null, text: "Needs a human tap" },
      { start: 65.999, text: "The porch light stays" },
    ],
    {
      title: "Receipt Song",
      artist: "The Static Collective",
      note: "1 line needs review",
    },
  );

  assert.match(lrc, /^\[by:Full Measure Listener\]/);
  assert.match(lrc, /\[00:01\.23\]The spoon remembers/);
  assert.match(lrc, /\[01:06\.00\]The porch light stays/);
  assert.doesNotMatch(lrc, /Needs a human tap/);
  assert.equal(formatLrcTimestamp(3.5), "00:03.50");
});

test("normalization tolerates punctuation and small sung substitutions", () => {
  assert.ok(stringSimilarity("We’re coming home!", "were coming home") > 0.9);
  assert.deepEqual(
    extractLyricLines("[Chorus]\nThe house takes attendance\n"),
    ["The house takes attendance"],
  );
});
