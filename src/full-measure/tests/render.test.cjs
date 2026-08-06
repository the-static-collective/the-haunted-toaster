const test = require("node:test");
const assert = require("node:assert/strict");
const {
  audioPlan,
  cleanLyricProvenance,
  cleanText,
  normalizeLyrics,
  buildFilterGraph,
  assTimestamp,
  assEvent,
} = require("../src/render/render.cjs");

test("copies MP3 and AAC streams but protects portable WAV output", () => {
  assert.equal(audioPlan("mp3").mode, "stream-copy");
  assert.equal(audioPlan("aac").mode, "stream-copy");
  assert.equal(audioPlan("pcm_s16le").mode, "high-quality-container-encode");
  assert.deepEqual(audioPlan("pcm_s16le").ffmpegArgs, [
    "-c:a",
    "aac",
    "-b:a",
    "320k",
  ]);
});

test("keeps compact lyric-sync provenance without accepting arbitrary paths", () => {
  assert.deepEqual(
    cleanLyricProvenance({
      mode: "auto-synced-local",
      engine: {
        name: "Full Measure Listener",
        whisperCppVersion: "1.9.1",
        modelId: "base.en-q5_1",
        language: "en",
      },
      alignment: {
        lineCount: 22,
        matchedCount: 22,
        reviewCount: 3,
        humanCorrectedCount: 1,
      },
      sidecarFilename: "C:\\private\\Receipt Song.lrc",
      ignoredPayload: "not part of the receipt",
    }),
    {
      mode: "auto-synced-local",
      engine: {
        name: "Full Measure Listener",
        whisperCppVersion: "1.9.1",
        modelId: "base.en-q5_1",
        language: "en",
      },
      alignment: {
        lineCount: 22,
        matchedCount: 22,
        reviewCount: 3,
        humanCorrectedCount: 1,
      },
      sidecarFilename: "Receipt Song.lrc",
    },
  );
});

test("keeps lyric content while omitting section headings", () => {
  const lines = normalizeLyrics(`
    [Verse 1]
    The spoon remembers

    [Chorus]
    The porch light stays
    [not a heading because this bracket is deliberately far too long to be treated as one]
  `);

  assert.deepEqual(lines, [
    "The spoon remembers",
    "The porch light stays",
    "[not a heading because this bracket is deliberately far too long to be treated as one]",
  ]);
});

test("removes null bytes and obeys a hard text boundary", () => {
  assert.equal(cleanText("  hello\0 world  "), "hello world");
  assert.equal(cleanText("abcdef", 4), "abcd");
});


test("assTimestamp creates standard bounds accurately without floating point accumulation", () => {
  assert.equal(assTimestamp(12.345), "0:00:12.35");
  assert.equal(assTimestamp(3661.999), "1:01:02.00");
  assert.equal(assTimestamp(0), "0:00:00.00");
});

test("assEvent ensures monotonic, minimum one-centisecond duration without arbitrary extension", () => {
  const event = assEvent(1.0, 1.001, "Style", "text");
  assert.ok(event.includes("0:00:01.00,0:00:01.01")); // Minimum 1 centisecond forced
  const normalEvent = assEvent(1.0, 2.0, "Style", "text");
  assert.ok(normalEvent.includes("0:00:01.00,0:00:02.00")); // No 0.18s extension
});

test("preview/render cue selection parity across bounds with exact match", async () => {
  const lyrics = require("../src/render/lyrics.cjs");
  const cues = [
    { start: 1, end: 2, text: 'a' },
    { start: 2, end: null, text: 'b' },
    { start: 3, end: null, text: 'c' },
  ];

  const timeline = lyrics.normalizeCueTimeline(cues, 4);
  assert.equal(lyrics.selectCueForTime(timeline, 0.99), null);
  assert.equal(lyrics.selectCueForTime(timeline, 1.0).text, "a");
  assert.equal(lyrics.selectCueForTime(timeline, 1.99).text, "a");
  assert.equal(lyrics.selectCueForTime(timeline, 2.0).text, "b");

  const cuesWithGap = [
    { start: 1, end: 1.5, text: 'a' },
    { start: 2, end: null, text: 'b' },
  ];
  const timelineGap = lyrics.normalizeCueTimeline(cuesWithGap, 4);
  assert.equal(lyrics.selectCueForTime(timelineGap, 1.75), null);
});

test("buildFilterGraph builds frame-rate independent zoompan at 60fps", async () => {
  const fg = await buildFilterGraph({
    tempDirectory: ".",
    analysis: { duration: 10, sections: [] },
    preset: { waveColors: ["red", "blue"], grain: 7, blendMode: "screen", imageOpacity: 0.54, hueDrift: 14 },
    title: "Title",
    artist: "Artist",
    lyrics: "one\ntwo",
    hasImage: true,
    width: 640,
    height: 480,
    fps: 60
  });

  assert.ok(fg.graph.includes("in_time"));
  assert.ok(!fg.graph.includes("on/150"));
});
