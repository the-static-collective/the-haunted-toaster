#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const EVIDENCE_CLASSES = new Set(["contract-fixture", "field"]);
const ANNOTATION_DISPOSITIONS = new Set([
  "supports-candidate",
  "ambiguous",
  "no-signal",
  "conflicts",
]);
const CORRECTION_KINDS = new Set(["candidate", "other", "unresolved"]);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + canonical(value[key])
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function exactKeys(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(code);
  }
  const actual = Object.keys(value).sort().join("|");
  const expected = [...keys].sort().join("|");
  if (actual !== expected) throw new TypeError(code);
}

function assertDigest(value, code) {
  if (!/^[0-9a-f]{64}$/.test(String(value || ""))) throw new TypeError(code);
}

function normalizeHypotheses(value) {
  exactKeys(
    value,
    ["schema", "line_id", "lyric_text_sha256", "candidates"],
    "INVALID_LISTENER_HYPOTHESES",
  );
  if (value.schema !== "full-measure.listener-placement-hypotheses/v0") {
    throw new TypeError("INVALID_LISTENER_HYPOTHESES_SCHEMA");
  }
  if (typeof value.line_id !== "string" || !value.line_id.trim()) {
    throw new TypeError("INVALID_LISTENER_LINE_ID");
  }
  assertDigest(value.lyric_text_sha256, "INVALID_LISTENER_LYRIC_DIGEST");
  if (!Array.isArray(value.candidates) || value.candidates.length < 2 || value.candidates.length > 8) {
    throw new TypeError("LISTENER_LOOK_TWICE_REQUIRES_RIVAL_CANDIDATES");
  }

  const ids = new Set();
  const candidates = value.candidates.map((candidate) => {
    exactKeys(
      candidate,
      ["id", "start_ms", "end_ms", "status", "confidence"],
      "INVALID_LISTENER_CANDIDATE",
    );
    if (
      typeof candidate.id !== "string" ||
      !candidate.id.trim() ||
      ids.has(candidate.id)
    ) {
      throw new TypeError("INVALID_LISTENER_CANDIDATE_ID");
    }
    ids.add(candidate.id);
    if (
      !Number.isInteger(candidate.start_ms) ||
      !Number.isInteger(candidate.end_ms) ||
      candidate.start_ms < 0 ||
      candidate.end_ms <= candidate.start_ms
    ) {
      throw new TypeError("INVALID_LISTENER_CANDIDATE_BOUNDS");
    }
    const confidence = Number(candidate.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new TypeError("INVALID_LISTENER_CANDIDATE_CONFIDENCE");
    }
    if (typeof candidate.status !== "string" || !candidate.status.trim()) {
      throw new TypeError("INVALID_LISTENER_CANDIDATE_STATUS");
    }
    return {
      id: candidate.id,
      start_ms: candidate.start_ms,
      end_ms: candidate.end_ms,
      status: candidate.status,
      confidence,
    };
  });

  return {
    schema: value.schema,
    line_id: value.line_id.trim(),
    lyric_text_sha256: value.lyric_text_sha256,
    candidates,
  };
}

function normalizeAnnotations(value, firstResponses, hypotheses) {
  if (!Array.isArray(value) || value.length !== firstResponses.length) {
    throw new TypeError("LISTENER_LOOK_TWICE_REQUIRES_ONE_ANNOTATION_PER_LISTENER");
  }
  const responseByListener = new Map(
    firstResponses.map((sealed) => [sealed.listener.id, sealed]),
  );
  const candidateIds = new Set(hypotheses.candidates.map((candidate) => candidate.id));
  const seen = new Set();

  return value.map((annotation) => {
    exactKeys(
      annotation,
      ["listener_id", "disposition", "candidate_id", "observation_indices", "note"],
      "INVALID_LISTENER_SUPPORT_ANNOTATION",
    );
    const response = responseByListener.get(annotation.listener_id);
    if (!response || seen.has(annotation.listener_id)) {
      throw new TypeError("INVALID_LISTENER_SUPPORT_LISTENER");
    }
    seen.add(annotation.listener_id);
    if (!ANNOTATION_DISPOSITIONS.has(annotation.disposition)) {
      throw new TypeError("INVALID_LISTENER_SUPPORT_DISPOSITION");
    }
    if (annotation.disposition === "supports-candidate") {
      if (!candidateIds.has(annotation.candidate_id)) {
        throw new TypeError("INVALID_LISTENER_SUPPORT_CANDIDATE");
      }
    } else if (annotation.candidate_id !== null) {
      throw new TypeError("NON_SUPPORT_ANNOTATION_CANNOT_NAME_CANDIDATE");
    }
    if (
      !Array.isArray(annotation.observation_indices) ||
      annotation.observation_indices.some((index) =>
        !Number.isInteger(index) ||
        index < 0 ||
        index >= response.response.observations.length
      )
    ) {
      throw new TypeError("INVALID_LISTENER_SUPPORT_OBSERVATION_INDEX");
    }
    if (typeof annotation.note !== "string" || annotation.note.length > 500) {
      throw new TypeError("INVALID_LISTENER_SUPPORT_NOTE");
    }
    return {
      listener_id: annotation.listener_id,
      disposition: annotation.disposition,
      candidate_id: annotation.candidate_id,
      observation_indices: [...new Set(annotation.observation_indices)].sort((a, b) => a - b),
      note: annotation.note.trim(),
    };
  }).sort((a, b) => a.listener_id.localeCompare(b.listener_id));
}

function normalizeCorrection(value, hypotheses) {
  exactKeys(
    value,
    ["kind", "candidate_id", "start_ms", "note"],
    "INVALID_LISTENER_HUMAN_CORRECTION",
  );
  if (!CORRECTION_KINDS.has(value.kind)) {
    throw new TypeError("INVALID_LISTENER_HUMAN_CORRECTION_KIND");
  }
  const candidateIds = new Set(hypotheses.candidates.map((candidate) => candidate.id));
  if (value.kind === "candidate") {
    if (!candidateIds.has(value.candidate_id) || value.start_ms !== null) {
      throw new TypeError("INVALID_LISTENER_CANDIDATE_CORRECTION");
    }
  } else if (value.kind === "other") {
    if (value.candidate_id !== null || !Number.isInteger(value.start_ms) || value.start_ms < 0) {
      throw new TypeError("INVALID_LISTENER_OTHER_CORRECTION");
    }
  } else if (value.candidate_id !== null || value.start_ms !== null) {
    throw new TypeError("INVALID_LISTENER_UNRESOLVED_CORRECTION");
  }
  if (typeof value.note !== "string" || value.note.length > 500) {
    throw new TypeError("INVALID_LISTENER_CORRECTION_NOTE");
  }
  return {
    kind: value.kind,
    candidate_id: value.candidate_id,
    start_ms: value.start_ms,
    note: value.note.trim(),
  };
}

export function deriveDiagnosticResult(annotations, correction) {
  if (correction.kind === "unresolved") return "unresolved";

  const named = annotations.filter((item) => item.disposition === "supports-candidate");
  if (correction.kind === "other") {
    return named.length ? "candidate-only-no-direct-match" : "no-signal";
  }

  const correct = named.filter((item) => item.candidate_id === correction.candidate_id).length;
  const wrong = named.length - correct;
  if (correct >= 2 && wrong === 0) return "both-support";
  if (correct === 1 && wrong === 0) return "one-support";
  if (correct > 0 && wrong > 0) return "mixed";
  if (correct === 0 && wrong > 0) return "misdirected";
  return "no-signal";
}

export async function loadAutodiscoV20(root) {
  if (typeof root !== "string" || !root.trim()) {
    throw new TypeError("AUTODISCO_V20_ROOT_REQUIRED");
  }
  const base = path.resolve(root);
  const audioWindow = await import(
    pathToFileURL(path.join(base, "scripts", "audio-window.mjs")).href
  );
  const lookTwice = await import(
    pathToFileURL(path.join(base, "scripts", "audio-look-twice.mjs")).href
  );
  for (const [name, fn] of [
    ["verifyAudioWindow", audioWindow.verifyAudioWindow],
    ["verifyAudioPair", lookTwice.verifyAudioPair],
    ["verifyAudioFirstResponses", lookTwice.verifyAudioFirstResponses],
  ]) {
    if (typeof fn !== "function") throw new TypeError(`AUTODISCO_V20_MISSING_${name}`);
  }
  return {
    verifyAudioWindow: audioWindow.verifyAudioWindow,
    verifyAudioPair: lookTwice.verifyAudioPair,
    verifyAudioFirstResponses: lookTwice.verifyAudioFirstResponses,
  };
}

export function buildDiagnosticReceipt(request, donorVerifier) {
  exactKeys(
    request,
    [
      "schema", "donor", "evidence_class", "window", "pair", "first_responses",
      "listener_hypotheses", "support_annotations", "human_correction",
    ],
    "INVALID_LISTENER_LOOK_TWICE_REQUEST",
  );
  if (request.schema !== "full-measure.listener-look-twice-request/v0") {
    throw new TypeError("INVALID_LISTENER_LOOK_TWICE_SCHEMA");
  }
  if (!donorVerifier) throw new TypeError("AUTODISCO_DONOR_VERIFIER_REQUIRED");
  if (!EVIDENCE_CLASSES.has(request.evidence_class)) {
    throw new TypeError("INVALID_LISTENER_LOOK_TWICE_EVIDENCE_CLASS");
  }

  exactKeys(request.donor, ["repository", "commit"], "INVALID_AUTODISCO_DONOR_REF");
  if (
    request.donor.repository !== "the-static-collective/The-AutodiscoV.20.-question-marks-" ||
    !/^[0-9a-f]{40}$/.test(request.donor.commit)
  ) {
    throw new TypeError("INVALID_AUTODISCO_DONOR_REF");
  }

  const window = donorVerifier.verifyAudioWindow(request.window);
  const pair = donorVerifier.verifyAudioPair(request.pair, window);
  const firstResponses = donorVerifier.verifyAudioFirstResponses(
    pair,
    request.first_responses,
  );

  if (request.evidence_class === "field") {
    for (const sealed of firstResponses) {
      if (/^(fixture|test|mock)/i.test(String(sealed.model_used || ""))) {
        throw new TypeError("CONTRACT_FIXTURE_CANNOT_BECOME_FIELD_EVIDENCE");
      }
    }
  }

  const hypotheses = normalizeHypotheses(request.listener_hypotheses);
  const annotations = normalizeAnnotations(
    request.support_annotations,
    firstResponses,
    hypotheses,
  );
  const correction = normalizeCorrection(request.human_correction, hypotheses);
  const diagnosticResult = deriveDiagnosticResult(annotations, correction);

  const orderedFirstResponses = [...firstResponses].sort((a, b) =>
    a.listener.id.localeCompare(b.listener.id)
  );

  const body = {
    schema: "full-measure.listener-look-twice-receipt/v0",
    donor: {
      repository: request.donor.repository,
      commit: request.donor.commit,
      verification: "donor-native",
    },
    evidence_class: request.evidence_class,
    empirical_eligible: request.evidence_class === "field",
    window_ref: {
      window_id: window.window_id,
      source_sha256: window.source.sha256,
      audio_sha256: window.canonical_audio.sha256,
      requested_bounds: window.requested_bounds,
      duration_ms: window.canonical_audio.duration_ms,
    },
    pair_id: pair.pair_id,
    sealed_first_responses: orderedFirstResponses,
    listener_hypotheses: hypotheses,
    support_annotations: annotations,
    human_correction: correction,
    diagnostic_result: diagnosticResult,
    authority: "diagnostic-only",
    laws: [
      "SAME AUDIO WINDOW != SHARED CONTEXT",
      "FIRST LISTEN PRECEDES CROSS-READ",
      "LISTENER EVIDENCE MUST NOT ENTER FIRST-LISTEN PACKETS",
      "SEALED FIRST RESPONSE != PLACEMENT AUTHORITY",
      "DIAGNOSTIC SUPPORT != HUMAN CORRECTION",
      "HUMAN ANCHOR REMAINS AUTHORITATIVE",
      "CONTRACT FIXTURE != FIELD EVIDENCE",
      "AUTODISCO SEMANTICS STAY DONOR-OWNED",
    ],
  };

  return {
    ...body,
    receipt_id: `full-measure-listener-look-twice-v0:${sha256(canonical(body))}`,
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw.trim()) throw new TypeError("JSON request required");
    const verifier = await loadAutodiscoV20(process.env.AUTODISCO_V20_ROOT || "");
    const receipt = buildDiagnosticReceipt(JSON.parse(raw), verifier);
    process.stdout.write(JSON.stringify(receipt));
  } catch (error) {
    process.stderr.write(JSON.stringify({
      error: error instanceof Error ? error.message : "listener look-twice failed",
    }) + "\n");
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
