"use strict";

const {
  canonicalize,
  deepFreeze,
  hashCanonical,
} = require("../generation/canonical.cjs");
const {
  validateFullSongForm,
} = require("./full-song-form.cjs");

const LISTENING_FIELD_SCHEMA = "static-collective/listening-field/v0";
const LISTENING_FIELD_POLICY = "existing-evidence-underlay/v0";
const LISTENING_FIELD_AUTHORITY = "testimony-only";

function boundedString(value, limit = 240) {
  return String(value || "").trim().slice(0, limit);
}

function finiteFrame(value, totalFrames, label) {
  const frame = Math.round(Number(value));
  if (!Number.isFinite(frame) || frame < 0 || frame >= totalFrames) {
    throw new TypeError(`${label} must be a frame inside the admitted song.`);
  }
  return frame;
}

function frameForSeconds(seconds, form) {
  if (seconds === null || seconds === undefined || seconds === "") return null;
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.max(
    0,
    Math.min(form.totalFrames - 1, Math.round(value * form.fps)),
  );
}

function endFrameForSeconds(seconds, startFrame, form) {
  const value = frameForSeconds(seconds, form);
  if (value === null) return startFrame;
  return Math.max(startFrame, value);
}

function sourceRef(kind, details = {}) {
  return canonicalize({
    kind,
    ...details,
  });
}

function sectionWitnesses(form) {
  return form.sourceSections.flatMap((section) => {
    const startFrame = finiteFrame(
      section.startFrame,
      form.totalFrames,
      "section startFrame",
    );
    const endCandidate = Math.max(startFrame, Number(section.endFrame) - 1);
    const endFrame = finiteFrame(
      Math.min(form.totalFrames - 1, endCandidate),
      form.totalFrames,
      "section endFrame",
    );
    const sectionId = `section:${section.sectionIndex}`;
    return [
      canonicalize({
        witnessId: `${sectionId}:span`,
        laneId: "sections",
        kind: "section-span",
        startFrame,
        endFrame,
        label: boundedString(section.label || `Section ${section.sectionIndex + 1}`),
        evidenceClass: "derived-observation",
        confidence: null,
        sourceRef: sourceRef("full-song-form-section", {
          formHash: form.formHash,
          sectionIndex: section.sectionIndex,
        }),
        method: form.boundaryBasis,
        authority: LISTENING_FIELD_AUTHORITY,
      }),
      canonicalize({
        witnessId: `${sectionId}:start`,
        laneId: "sections",
        kind: "section-boundary",
        startFrame,
        endFrame: startFrame,
        label: `${boundedString(section.label)} start`,
        evidenceClass: "derived-observation",
        confidence: null,
        sourceRef: sourceRef("full-song-form-section", {
          formHash: form.formHash,
          sectionIndex: section.sectionIndex,
          edge: "start",
        }),
        method: form.boundaryBasis,
        authority: LISTENING_FIELD_AUTHORITY,
      }),
    ];
  });
}

function lyricWitnesses(alignment, form) {
  if (!alignment || !Array.isArray(alignment.cues)) return [];
  const witnesses = [];

  alignment.cues.forEach((cue, index) => {
    const startFrame = frameForSeconds(cue?.start, form);
    if (startFrame === null) return;
    const endFrame = endFrameForSeconds(cue?.end, startFrame, form);
    const lineId = boundedString(cue?.lineId || `line-${index + 1}`, 96);
    const status = boundedString(cue?.status || "unknown", 32);
    const confidenceValue = Number(cue?.confidence);
    const confidence = Number.isFinite(confidenceValue)
      ? Math.max(0, Math.min(1, confidenceValue))
      : null;
    const human =
      status === "human" ||
      cue?.humanCorrected === true;

    witnesses.push(canonicalize({
      witnessId: `lyric:${lineId}`,
      laneId: "lyrics",
      kind: "lyric-cue",
      startFrame,
      endFrame,
      label: boundedString(cue?.text || lineId, 500),
      evidenceClass: human ? "human-corrected" : "machine-placement",
      confidence,
      sourceRef: sourceRef("listener-alignment", {
        schema: boundedString(alignment.schema || "full-measure.lyric-alignment.v1", 96),
        lineId,
        status,
      }),
      method: human ? "human-timing" : "listener-placement",
      authority: LISTENING_FIELD_AUTHORITY,
    }));

    if (human) {
      witnesses.push(canonicalize({
        witnessId: `anchor:${lineId}`,
        laneId: "anchors",
        kind: "human-anchor",
        startFrame,
        endFrame: startFrame,
        label: boundedString(cue?.text || lineId, 500),
        evidenceClass: "human-authoritative-timing",
        confidence: 1,
        sourceRef: sourceRef("listener-human-anchor", {
          lineId,
          mediaTimeMs: Math.round(Number(cue.start) * 1000),
        }),
        method: "explicit-human-correction",
        authority: LISTENING_FIELD_AUTHORITY,
      }));
    }
  });

  return witnesses;
}

function landmarkWitnesses(landmarks, form) {
  if (!Array.isArray(landmarks)) return [];
  return landmarks.slice(0, 512).flatMap((mark, index) => {
    const frame = Number(mark?.compositionFrame);
    if (!Number.isFinite(frame)) return [];
    const bounded = Math.max(
      0,
      Math.min(form.totalFrames - 1, Math.round(frame)),
    );
    return [canonicalize({
      witnessId: `landmark:${index}:${bounded}`,
      laneId: "landmarks",
      kind: boundedString(mark?.kind || "song-landmark", 64),
      startFrame: bounded,
      endFrame: bounded,
      label: boundedString(mark?.label || mark?.kind || `Landmark ${index + 1}`),
      evidenceClass: "admitted-landmark",
      confidence: null,
      sourceRef: sourceRef("nextgen-snap-landmark", {
        ordinal: index,
      }),
      method: "existing-editor-landmark",
      authority: LISTENING_FIELD_AUTHORITY,
    })];
  });
}

function lane(laneId, kind, witnesses) {
  return canonicalize({
    laneId,
    kind,
    authority: LISTENING_FIELD_AUTHORITY,
    witnesses: witnesses
      .filter((witness) => witness.laneId === laneId)
      .sort(
        (left, right) =>
          left.startFrame - right.startFrame ||
          left.endFrame - right.endFrame ||
          left.witnessId.localeCompare(right.witnessId),
      ),
  });
}

function validateSongRef(songRef, form) {
  if (!songRef || typeof songRef !== "object" || Array.isArray(songRef)) {
    throw new TypeError("ListeningField requires an admitted song reference.");
  }
  const sourceSha256 = String(songRef.sourceSha256 || "").trim();
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) {
    throw new TypeError("ListeningField song reference requires a SHA-256 digest.");
  }
  const durationSeconds = Number(songRef.durationSeconds);
  if (
    !Number.isFinite(durationSeconds) ||
    Math.abs(durationSeconds - form.durationSeconds) > 1 / form.fps
  ) {
    throw new TypeError("ListeningField song duration must match FullSongFormV0.");
  }
  return canonicalize({
    sourceSha256,
    durationSeconds: form.durationSeconds,
  });
}

function validateListeningField(field) {
  if (!field || typeof field !== "object" || Array.isArray(field)) {
    throw new TypeError("ListeningField must be an object.");
  }
  if (
    field.schema !== LISTENING_FIELD_SCHEMA ||
    field.policy !== LISTENING_FIELD_POLICY ||
    field.authority !== LISTENING_FIELD_AUTHORITY
  ) {
    throw new TypeError("Unsupported ListeningField contract.");
  }
  if (!field.formRef || !/^[a-f0-9]{64}$/.test(String(field.formRef.formHash || ""))) {
    throw new TypeError("ListeningField requires a valid FullSongForm hash.");
  }
  if (!field.songRef || !/^[a-f0-9]{64}$/.test(String(field.songRef.sourceSha256 || ""))) {
    throw new TypeError("ListeningField requires a valid song digest.");
  }
  if (!Array.isArray(field.lanes)) {
    throw new TypeError("ListeningField lanes must be an array.");
  }
  for (const item of field.lanes) {
    if (item.authority !== LISTENING_FIELD_AUTHORITY || !Array.isArray(item.witnesses)) {
      throw new TypeError("ListeningField lane authority must remain testimony-only.");
    }
    for (const witness of item.witnesses) {
      if (witness.authority !== LISTENING_FIELD_AUTHORITY) {
        throw new TypeError("ListeningField witness authority must remain testimony-only.");
      }
      finiteFrame(witness.startFrame, field.formRef.totalFrames, "witness startFrame");
      finiteFrame(witness.endFrame, field.formRef.totalFrames, "witness endFrame");
      if (witness.endFrame < witness.startFrame) {
        throw new TypeError("ListeningField witness endFrame precedes startFrame.");
      }
    }
  }
  const { fieldHash, ...body } = field;
  const expected = hashCanonical(
    canonicalize(body),
    "HauntedToaster-ListeningField-v0",
  );
  if (fieldHash !== expected) {
    throw new TypeError("ListeningField hash mismatch.");
  }
  return deepFreeze(canonicalize(field));
}

function deriveListeningField({
  fullSongForm,
  songRef,
  alignment = null,
  landmarks = [],
} = {}) {
  const form = validateFullSongForm(fullSongForm);
  const admittedSong = validateSongRef(songRef, form);
  const witnesses = [
    ...sectionWitnesses(form),
    ...lyricWitnesses(alignment, form),
    ...landmarkWitnesses(landmarks, form),
  ];
  const lanes = [
    lane("sections", "section-geometry", witnesses),
    lane("lyrics", "lyric-timing", witnesses),
    lane("anchors", "human-anchor", witnesses),
    lane("landmarks", "existing-song-landmark", witnesses),
  ].filter((item) => item.witnesses.length > 0);

  const body = canonicalize({
    schema: LISTENING_FIELD_SCHEMA,
    policy: LISTENING_FIELD_POLICY,
    authority: LISTENING_FIELD_AUTHORITY,
    songRef: admittedSong,
    formRef: {
      formHash: form.formHash,
      fps: form.fps,
      totalFrames: form.totalFrames,
      durationSeconds: form.durationSeconds,
    },
    lanes,
    witnessCount: lanes.reduce((sum, item) => sum + item.witnesses.length, 0),
    laws: [
      "AUDIO CLOCK = COMMON ADDRESS",
      "LISTENING FIELD != SONG MEANING",
      "HEARING != EDIT",
      "EDIT != HEARING",
      "HUMAN EDIT != HUMAN ANCHOR",
      "WITNESS != SNAP TARGET",
      "SNAP TARGET != PLACEMENT AUTHORITY",
      "LISTENER != RENDERER",
      "RENDERER MUST NOT RE-LISTEN",
    ],
  });

  return deepFreeze(canonicalize({
    ...body,
    fieldHash: hashCanonical(body, "HauntedToaster-ListeningField-v0"),
  }));
}

module.exports = {
  LISTENING_FIELD_AUTHORITY,
  LISTENING_FIELD_POLICY,
  LISTENING_FIELD_SCHEMA,
  deriveListeningField,
  frameForSeconds,
  validateListeningField,
};
