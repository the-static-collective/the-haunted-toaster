const test = require("node:test");
const assert = require("node:assert/strict");

const {
  deriveFullSongForm,
} = require("../src/nextgen/full-song-form.cjs");
const {
  deriveListeningField,
  validateListeningField,
} = require("../src/nextgen/listening-field.cjs");

function form() {
  return deriveFullSongForm({
    durationSeconds: 120,
    fps: 24,
    sections: [
      { start: 0, end: 31, label: "Opening", energy: 0.2 },
      { start: 31, end: 78, label: "Bloom", energy: 0.8 },
      { start: 78, end: 120, label: "Return", energy: 0.6 },
    ],
  });
}

function input() {
  const fullSongForm = form();
  return {
    fullSongForm,
    songRef: {
      sourceSha256: "a".repeat(64),
      durationSeconds: 120,
    },
    alignment: {
      schema: "full-measure.lyric-alignment.v1",
      cues: [
        {
          lineId: "line-1",
          text: "The house takes attendance",
          start: 4.25,
          end: 6.1,
          status: "high",
          confidence: 0.91,
          humanCorrected: false,
        },
        {
          lineId: "line-2",
          text: "We play where we arrive",
          start: 32.5,
          end: 35,
          status: "human",
          confidence: 1,
          humanCorrected: true,
        },
        {
          lineId: "line-3",
          text: "Still unresolved",
          start: null,
          end: null,
          status: "unmatched",
          confidence: 0,
          humanCorrected: false,
        },
      ],
    },
    landmarks: [
      {
        kind: "phrase",
        label: "existing Listening Eye landmark",
        compositionFrame: 1000,
      },
    ],
  };
}

test("ListeningFieldV0 binds testimony to the exact admitted song and full-song form", () => {
  const field = deriveListeningField(input());

  assert.equal(field.schema, "static-collective/listening-field/v0");
  assert.equal(field.authority, "testimony-only");
  assert.equal(field.songRef.sourceSha256, "a".repeat(64));
  assert.equal(field.formRef.formHash, input().fullSongForm.formHash);
  assert.match(field.fieldHash, /^[a-f0-9]{64}$/);

  const kinds = field.lanes.flatMap((lane) =>
    lane.witnesses.map((witness) => witness.kind),
  );
  assert.ok(kinds.includes("section-span"));
  assert.ok(kinds.includes("section-boundary"));
  assert.ok(kinds.includes("lyric-cue"));
  assert.ok(kinds.includes("human-anchor"));
  assert.ok(kinds.includes("phrase"));

  const unresolved = field.lanes
    .flatMap((lane) => lane.witnesses)
    .find((witness) => witness.label === "Still unresolved");
  assert.equal(unresolved, undefined);

  const anchor = field.lanes
    .flatMap((lane) => lane.witnesses)
    .find((witness) => witness.kind === "human-anchor");
  assert.equal(anchor.evidenceClass, "human-authoritative-timing");
  assert.equal(anchor.authority, "testimony-only");
});

test("ListeningFieldV0 replay is deterministic", () => {
  const left = deriveListeningField(input());
  const right = deriveListeningField(input());
  assert.deepEqual(left, right);
  assert.equal(left.fieldHash, right.fieldHash);
});

test("changing song identity changes field identity without changing FullSongForm", () => {
  const base = input();
  const left = deriveListeningField(base);
  const right = deriveListeningField({
    ...base,
    songRef: {
      ...base.songRef,
      sourceSha256: "b".repeat(64),
    },
  });
  assert.equal(left.formRef.formHash, right.formRef.formHash);
  assert.notEqual(left.fieldHash, right.fieldHash);
});

test("field validation refuses changed witness bytes", () => {
  const field = structuredClone(deriveListeningField(input()));
  field.lanes[0].witnesses[0].label = "forged section";
  assert.throws(
    () => validateListeningField(field),
    /hash mismatch/,
  );
});

test("field rejects song duration that does not match the full-song form", () => {
  const bad = input();
  bad.songRef.durationSeconds = 118;
  assert.throws(
    () => deriveListeningField(bad),
    /duration must match/,
  );
});
