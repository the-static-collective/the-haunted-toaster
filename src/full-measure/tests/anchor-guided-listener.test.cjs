const assert = require("node:assert/strict");
const test = require("node:test");

const {
  ANCHOR_ENVELOPE_PREFIX,
  ANCHOR_ENVELOPE_SUFFIX,
  ANCHOR_GUIDED_POLICY_VERSION,
  alignLyricsToTranscriptWithAnchors,
  unpackAnchorEnvelope,
} = require("../src/align/anchor-guided.cjs");
const { alignLyricsToTranscript } = require("../src/align/matcher.cjs");

const lyrics = [
  "silver river",
  "anchor one",
  "silver river",
  "anchor two",
  "weak ending",
].join("\n");

const transcript = [
  { text: "anchor one", start: 5.15, end: 5.9, probability: 0.99 },
  { text: "silver river", start: 8.4, end: 9.1, probability: 0.99 },
  { text: "anchor two", start: 12.48, end: 13.1, probability: 0.99 },
];

const anchors = [
  { lineIndex: 1, text: "anchor one", time: 5.123 },
  { lineIndex: 3, text: "anchor two", time: 12.456 },
];

test("anchor evidence envelope is transport-only and lossless", () => {
  const packed = `${ANCHOR_ENVELOPE_PREFIX}${encodeURIComponent(JSON.stringify(anchors))}${ANCHOR_ENVELOPE_SUFFIX}\n${lyrics}`;
  assert.deepEqual(unpackAnchorEnvelope(packed), { lyrics, anchors });
  assert.deepEqual(unpackAnchorEnvelope(lyrics), { lyrics, anchors: [] });
});

test("human anchors partition recovery and rescue a neighbor the baseline loses", () => {
  const baseline = alignLyricsToTranscript(lyrics, transcript, 20, {
    leadSeconds: 0,
  });
  assert.equal(baseline.cues[2].start, null);

  const recovered = alignLyricsToTranscriptWithAnchors(lyrics, transcript, 20, {
    leadSeconds: 0,
    anchors,
  });

  assert.equal(recovered.anchorGuided.policyVersion, ANCHOR_GUIDED_POLICY_VERSION);
  assert.equal(recovered.anchorGuided.anchorCount, 2);
  assert.equal(recovered.anchorGuided.monotonicAnchors, true);

  assert.equal(recovered.cues[1].status, "human");
  assert.equal(recovered.cues[1].start, 5.123);
  assert.equal(recovered.cues[3].status, "human");
  assert.equal(recovered.cues[3].start, 12.456);

  assert.equal(recovered.cues[0].start, null);
  assert.ok(Number.isFinite(recovered.cues[2].start));
  assert.ok(recovered.cues[2].start > 5.123);
  assert.ok(recovered.cues[2].end < 12.456);
  assert.equal(recovered.cues[4].start, null);

  assert.deepEqual(
    alignLyricsToTranscriptWithAnchors(lyrics, transcript, 20, {
      leadSeconds: 0,
      anchors,
    }),
    recovered,
  );
});

test("non-monotonic human anchors stay fixed and block machine guesses", () => {
  const conflicting = [
    { lineIndex: 1, text: "anchor one", time: 12 },
    { lineIndex: 3, text: "anchor two", time: 5 },
  ];
  const result = alignLyricsToTranscriptWithAnchors(lyrics, transcript, 20, {
    leadSeconds: 0,
    anchors: conflicting,
  });

  assert.equal(result.anchorGuided.monotonicAnchors, false);
  assert.deepEqual(result.anchorGuided.windows, []);
  assert.equal(result.cues[1].start, 12);
  assert.equal(result.cues[3].start, 5);
  assert.equal(result.cues[0].start, null);
  assert.equal(result.cues[2].start, null);
  assert.equal(result.cues[4].start, null);
});
