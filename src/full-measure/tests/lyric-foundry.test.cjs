const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PREP_POLICY_VERSION,
  prepareLyrics,
  normalizeAnchors,
  buildResolutionState,
  admitCanonicalCues,
  buildFoundryEvidence,
} = require("../src/align/lyric-foundry.cjs");
const { serializeSrt, serializeWebVtt } = require("../src/render/subtitles.cjs");

test("deterministic cleanup preserves lyric words and source provenance", () => {
  const raw = "[Verse 1]\r\n  Keep these actual words  \r\n( guitar solo )\r\nNext sung phrase\r\n   continued by paste wrap\r\n\r\n[Chorus]";
  const first = prepareLyrics(raw);
  const second = prepareLyrics(raw);

  assert.equal(first.policyVersion, PREP_POLICY_VERSION);
  assert.equal(first.preparedLineSetHash, second.preparedLineSetHash);
  assert.deepEqual(first.prepared.map((line) => line.text), [
    "Keep these actual words",
    "Next sung phrase continued by paste wrap",
  ]);
  assert.deepEqual(first.prepared[1].sourceLines, [4, 5]);
  assert.ok(first.prepared[1].decisions.includes("merged-indented-wrap"));
  assert.deepEqual(first.removed.map((item) => item.reason), [
    "structural-label",
    "performance-note",
    "blank",
    "structural-label",
  ]);
});

test("human anchors are first-class, fixed evidence and override listener timing", () => {
  const prepared = prepareLyrics("alpha\nbeta\ngamma").prepared;
  const beta = prepared[1];
  const anchors = normalizeAnchors([
    { lineId: beta.lineId, mediaTimeMs: 4200, source: "human-tap" },
  ], prepared);
  const resolution = buildResolutionState({
    preparedLines: prepared,
    anchors,
    listenerEvidence: [
      { lineId: prepared[0].lineId, state: "aligned", start: 1.0, end: 2.0 },
      { lineId: beta.lineId, state: "aligned", start: 99.0, end: 100.0 },
      { lineId: prepared[2].lineId, state: "tentative", start: 7.0, end: 8.0 },
    ],
  });

  assert.equal(resolution[1].state, "anchored");
  assert.equal(resolution[1].start, 4.2);
  assert.equal(resolution[1].anchor.source, "human-tap");
  assert.equal(resolution[2].state, "tentative");
});

test("unresolved lines become composted or ignored without acquiring timestamps", () => {
  const prepared = prepareLyrics("known\nghost me\nleave me").prepared;
  const resolution = buildResolutionState({
    preparedLines: prepared,
    listenerEvidence: [
      { lineId: prepared[0].lineId, state: "aligned", start: 1, end: 2 },
      { lineId: prepared[1].lineId, state: "unresolved", start: null },
      { lineId: prepared[2].lineId, state: "unresolved", start: null },
    ],
    dispositions: {
      [prepared[1].lineId]: "composted",
      [prepared[2].lineId]: "ignored",
    },
  });

  assert.equal(resolution[1].state, "composted");
  assert.equal(resolution[1].start, null);
  assert.equal(resolution[2].state, "ignored");
  assert.equal(resolution[2].start, null);
  assert.deepEqual(admitCanonicalCues(resolution).map((cue) => cue.text), ["known"]);
});

test("SRT/VTT contain aligned and anchored truth only; compost never leaks", () => {
  const cues = [
    { state: "aligned", start: 1, end: 2, text: "truth one" },
    { state: "tentative", start: 2, end: 3, text: "maybe no" },
    { state: "anchored", start: 3, end: 4, text: "human truth" },
    { state: "composted", disposition: "composted", start: 4, end: 5, text: "ghost words" },
    { state: "ignored", disposition: "ignored", start: 5, end: 6, text: "ignored words" },
  ];
  const srt = serializeSrt(cues, 10);
  const vtt = serializeWebVtt(cues, 10);

  for (const output of [srt, vtt]) {
    assert.match(output, /truth one/);
    assert.match(output, /human truth/);
    assert.doesNotMatch(output, /maybe no/);
    assert.doesNotMatch(output, /ghost words/);
    assert.doesNotMatch(output, /ignored words/);
  }
});

test("receipt evidence hashes reproduce and separate canonical cues from compost", () => {
  const rawSource = "one\ntwo\nthree";
  const prepared = prepareLyrics(rawSource);
  const anchors = [{ lineId: prepared.prepared[0].lineId, mediaTimeMs: 1000, source: "human-edit" }];
  const listenerEvidence = [
    { lineId: prepared.prepared[1].lineId, state: "aligned", start: 2, end: 3, confidence: 0.9 },
    { lineId: prepared.prepared[2].lineId, state: "unresolved" },
  ];
  const dispositions = { [prepared.prepared[2].lineId]: "composted" };

  const first = buildFoundryEvidence({ rawSource, preparedResult: prepared, listenerEvidence, anchors, dispositions });
  const second = buildFoundryEvidence({ rawSource, preparedResult: prepared, listenerEvidence, anchors, dispositions });

  assert.deepEqual(first.hashes, second.hashes);
  assert.equal(first.counts.anchors, 1);
  assert.equal(first.counts.canonicalCues, 2);
  assert.equal(first.counts.composted, 1);
  assert.notEqual(first.hashes.finalCanonicalCueTrack, first.hashes.compostedFragments);
  assert.deepEqual(first.canonicalCues.map((cue) => cue.text), ["one", "two"]);
  assert.deepEqual(first.composted.map((fragment) => fragment.text), ["three"]);
});

test("legacy canonical subtitle cues remain backward compatible when no Foundry state is present", () => {
  const srt = serializeSrt([{ start: 0, end: 1, text: "legacy cue" }], 2);
  assert.match(srt, /legacy cue/);
});
