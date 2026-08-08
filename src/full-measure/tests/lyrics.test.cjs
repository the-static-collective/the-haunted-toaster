const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createLyricTrack,
  parseClock,
  summarizeLyricTrack,
  selectCueForTime,
  evenlyDistributedCues,
  normalizeCueTimeline,
} = require("../src/render/lyrics.cjs");

test("parses clock values used by LRC, SRT, VTT, and JSON", () => {
  assert.equal(parseClock("01:02.500"), 62.5);
  assert.equal(parseClock("00:01:02,250"), 62.25);
  assert.equal(parseClock(4.75), 4.75);
  assert.equal(parseClock("not-a-time"), null);
});

test("locks LRC lines to their timestamps and honors offset metadata", () => {
  const track = createLyricTrack(
    [
      "[ti:Receipt Song]",
      "[offset:500]",
      "[00:01.00]The spoon remembers",
      "[00:04.25]The porch light stays",
    ].join("\n"),
    12,
  );

  assert.equal(track.mode, "timestamped-lrc");
  assert.equal(track.timed, true);
  assert.deepEqual(
    track.cues.map((cue) => cue.start),
    [1.5, 4.75],
  );
  assert.ok(track.cues[0].end < track.cues[1].start);
});

test("uses explicit SRT and VTT cue boundaries", () => {
  const srt = createLyricTrack(
    [
      "1",
      "00:00:01,000 --> 00:00:02,500",
      "Symbols remember their weight",
      "",
      "2",
      "00:00:03,250 --> 00:00:05,000",
      "Pass the microphone",
    ].join("\n"),
    8,
  );
  assert.equal(srt.mode, "timestamped-srt");
  assert.deepEqual(srt.cues[0], {
    start: 1,
    end: 2.5,
    text: "Symbols remember their weight",
  });

  const vtt = summarizeLyricTrack(
    [
      "WEBVTT",
      "",
      "00:01.000 --> 00:02.250 align:center",
      "<c.gold>Full measure comes out</c>",
    ].join("\n"),
    4,
  );
  assert.equal(vtt.mode, "timestamped-vtt");
  assert.equal(vtt.cueCount, 1);
  assert.equal(vtt.synchronized, undefined);
  assert.equal(vtt.timed, true);
});

test("accepts Whisper-style timestamped JSON without replacing supplied words", () => {
  const input = JSON.stringify({
    segments: [
      {
        start: 0.8,
        end: 2.2,
        text: "Song goes in",
        words: [
          { start: 0.8, end: 1.1, word: "Song" },
          { start: 1.1, end: 1.4, word: "goes" },
          { start: 1.4, end: 2.2, word: "in" },
        ],
      },
      {
        start: 3,
        end: 4.7,
        text: "Full measure comes out",
      },
    ],
  });
  const track = createLyricTrack(input, 6);

  assert.equal(track.mode, "timestamped-json");
  assert.equal(track.cues.length, 2);
  assert.equal(track.cues[0].text, "Song goes in");
  assert.equal(track.cues[1].end, 4.7);
});

test("groups word-only JSON into readable vocal-timed phrases", () => {
  const words = [
    ["The", 0.5, 0.8],
    ["house", 0.8, 1.2],
    ["takes", 1.2, 1.55],
    ["attendance.", 1.55, 2.2],
    ["The", 3.4, 3.7],
    ["porch", 3.7, 4.1],
    ["light", 4.1, 4.5],
    ["stays.", 4.5, 5.1],
  ].map(([word, start, end]) => ({ word, start, end }));
  const track = createLyricTrack(JSON.stringify({ words }), 7);

  assert.equal(track.timed, true);
  assert.equal(track.cues.length, 2);
  assert.equal(track.cues[0].text, "The house takes attendance.");
  assert.equal(track.cues[1].text, "The porch light stays.");
});

test("preserves the honest approximate fallback for plain lyrics", () => {
  const track = createLyricTrack(
    ["[Verse]", "The spoon remembers", "The porch light stays"].join("\n"),
    10,
  );

  assert.equal(track.mode, "evenly-distributed");
  assert.equal(track.timed, false);
  assert.equal(track.cues.length, 2);
  assert.deepEqual(track.lines, [
    "The spoon remembers",
    "The porch light stays",
  ]);
});

test("does not render timestamp syntax when every cue is outside the song", () => {
  const track = createLyricTrack("[99:00.00]Too late", 10);
  assert.equal(track.mode, "none");
  assert.equal(track.cues.length, 0);
  assert.equal(track.warnings.length, 1);
});


test("evenlyDistributedCues does not cause interval drift", () => {
  const lines = ["a", "b", "c"];
  const duration = 120;
  const cues = evenlyDistributedCues(lines, duration);
  assert.equal(cues.length, 3);
  assert.equal(cues[0].start, 6.5);
  assert.ok(cues[2].end <= 120);
});

test("selectCueForTime bounds inferred cue visibility while preserving explicit intervals", () => {
  const cues = [
    { start: 1, end: 2.5, text: "A" },
    { start: 2, end: null, text: "B" },
    { start: 3, end: null, text: "C" },
    { start: 3, end: null, text: "D" },
  ];

  const timeline = normalizeCueTimeline(cues, 10);
  assert.equal(selectCueForTime(timeline, 0.5), null);
  assert.equal(selectCueForTime(timeline, 1.0).text, "A");
  assert.equal(selectCueForTime(timeline, 1.99).text, "A");
  assert.equal(selectCueForTime(timeline, 2.0).text, "B");
  assert.equal(selectCueForTime(timeline, 2.99).text, "B");
  assert.equal(selectCueForTime(timeline, 3.0).text, "D");
  assert.equal(selectCueForTime(timeline, 4.49).text, "D");
  assert.equal(selectCueForTime(timeline, 4.5), null);
  assert.equal(selectCueForTime(timeline, 9.99), null);
  assert.equal(selectCueForTime(timeline, 10.0), null);
});

test("selectCueForTime long song tests", () => {
  const cues = [
    { start: 3600, end: null, text: "An hour" },
  ];
  const timeline = normalizeCueTimeline(cues, 7200);
  assert.equal(selectCueForTime(timeline, 3599.9), null);
  assert.equal(selectCueForTime(timeline, 3600.0).text, "An hour");
  assert.equal(selectCueForTime(timeline, 3601.65).text, "An hour");
  assert.equal(selectCueForTime(timeline, 3601.66), null);
  assert.equal(selectCueForTime(timeline, 7199.9), null);
  assert.equal(selectCueForTime(timeline, 7200.0), null);
});
