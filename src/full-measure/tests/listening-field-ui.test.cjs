const test = require("node:test");
const assert = require("node:assert/strict");

const ui = require("../src/renderer/franken-composer-ui.js");
const {
  deriveFullSongForm,
} = require("../src/nextgen/full-song-form.cjs");
const {
  deriveListeningField,
} = require("../src/nextgen/listening-field.cjs");

function fixture() {
  const fullSongForm = deriveFullSongForm({
    durationSeconds: 90,
    fps: 24,
    sections: [
      { start: 0, end: 30, label: "Opening" },
      { start: 30, end: 60, label: "Crossing" },
      { start: 60, end: 90, label: "Return" },
    ],
  });
  const listeningField = deriveListeningField({
    fullSongForm,
    songRef: {
      sourceSha256: "c".repeat(64),
      durationSeconds: 90,
    },
    alignment: {
      schema: "full-measure.lyric-alignment.v1",
      cues: [
        {
          lineId: "line-1",
          text: "The room remembers",
          start: 10,
          end: 12,
          status: "high",
          confidence: 0.9,
        },
        {
          lineId: "line-2",
          text: "Human anchor",
          start: 44,
          end: 46,
          status: "human",
          confidence: 1,
          humanCorrected: true,
        },
      ],
    },
  });
  return { fullSongForm, listeningField };
}

test("Listening Field flattening exposes testimony without inventing edit authority", () => {
  const { listeningField } = fixture();
  const marks = ui.listeningFieldMarks(listeningField);
  assert.ok(marks.length > 0);
  assert.ok(marks.every((mark) => mark.authority === "testimony-only"));
  assert.ok(marks.some((mark) => mark.kind === "lyric-cue"));
  assert.ok(marks.some((mark) => mark.kind === "human-anchor"));
});

test("012A excision: Listening Field cannot enter proposal composition inputs", () => {
  const { fullSongForm, listeningField } = fixture();
  const baselineState = ui.createBenchState();
  const contaminatedState = {
    ...baselineState,
    listeningField,
    editorObservation: {
      listeningFieldHash: listeningField.fieldHash,
      authority: "testimony-only",
    },
  };

  const baseline = ui.composeConfig(baselineState, fullSongForm);
  const withFieldPresent = ui.composeConfig(contaminatedState, fullSongForm);

  assert.deepEqual(withFieldPresent, baseline);
  assert.equal(
    JSON.stringify(withFieldPresent).includes(listeningField.fieldHash),
    false,
  );
});

test("012A excision: hearing marks are not automatic snap targets", () => {
  const { listeningField } = fixture();
  const marks = ui.listeningFieldMarks(listeningField);
  const ordinaryLandmarks = [
    { kind: "section", label: "existing guide", compositionFrame: 720 },
  ];

  const unsnapped = ui.snapFrame(245, ordinaryLandmarks, true, 14, {
    totalFrames: 2160,
    sceneSpans: [
      { sceneId: "ARRIVE", startFrame: 0, durationFrames: 720 },
      { sceneId: "CROSS", startFrame: 720, durationFrames: 720 },
      { sceneId: "ASSEMBLE", startFrame: 1440, durationFrames: 720 },
    ],
  });

  const nearHearingOnly = marks.find(
    (mark) => mark.kind === "lyric-cue" && mark.startFrame === 240,
  );
  assert.ok(nearHearingOnly);
  assert.equal(unsnapped, 245);
});
