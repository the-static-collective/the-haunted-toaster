const crypto = require("node:crypto");

const PREP_POLICY_VERSION = "lyric-prep/v1";
const LISTENER_EVIDENCE_VERSION = "lyric-listener-evidence/v1";
const ANCHOR_VERSION = "lyric-anchor/v1";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function normalizeSource(raw) {
  return String(raw || "").replace(/\0/g, "").replace(/\r\n?/g, "\n");
}

function isStructuralLabel(text) {
  const inner = String(text || "").trim();
  if (!/^(?:\[[^\]]+\]|\([^\)]+\))$/.test(inner)) return false;
  const label = inner.slice(1, -1).trim().toLowerCase();
  return /^(?:verse|chorus|bridge|intro|outro|pre[- ]?chorus|refrain|hook|interlude|instrumental|break|solo|ending|repeat)(?:\s+\d+|\s+[ivx]+)?$/.test(label);
}

function isClearPerformanceNote(text) {
  const inner = String(text || "").trim();
  if (!/^\([^\)]+\)$/.test(inner)) return false;
  const note = inner.slice(1, -1).trim().toLowerCase();
  return /^(?:instrumental|guitar solo|drum fill|bass solo|spoken intro|spoken outro|fade out|fade|music|band enters|band drops|double tracked|background vocals?|backing vocals?|harmonies|mix note|production note)$/.test(note);
}

function cleanPhrase(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function lineIdFor(sourceLines, text) {
  return `lyric-${hashValue({ sourceLines, text }).slice(0, 16)}`;
}

function prepareLyrics(rawSource) {
  const original = normalizeSource(rawSource);
  const rawLines = original.split("\n");
  const prepared = [];
  const removed = [];

  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index];
    const sourceLine = index + 1;
    const text = cleanPhrase(raw);

    if (!text) {
      removed.push({ sourceLines: [sourceLine], raw, reason: "blank" });
      continue;
    }
    if (isStructuralLabel(text)) {
      removed.push({ sourceLines: [sourceLine], raw, reason: "structural-label" });
      continue;
    }
    if (isClearPerformanceNote(text)) {
      removed.push({ sourceLines: [sourceLine], raw, reason: "performance-note" });
      continue;
    }

    const isIndentedContinuation = /^\s+\S/.test(raw) && prepared.length > 0;
    if (isIndentedContinuation) {
      const previous = prepared[prepared.length - 1];
      previous.text = cleanPhrase(`${previous.text} ${text}`);
      previous.sourceLines.push(sourceLine);
      previous.decisions.push("merged-indented-wrap");
      previous.lineId = lineIdFor(previous.sourceLines, previous.text);
      continue;
    }

    prepared.push({
      lineId: lineIdFor([sourceLine], text),
      text,
      sourceLines: [sourceLine],
      decisions: raw === text ? ["kept"] : ["trimmed-whitespace"],
    });
  }

  return {
    policyVersion: PREP_POLICY_VERSION,
    originalSourceHash: hashValue(original),
    preparedLineSetHash: hashValue(prepared),
    original,
    prepared,
    removed,
  };
}

function summarizeLyricPreparation(preparedResult) {
  const prepared = preparedResult?.prepared || [];
  const removed = preparedResult?.removed || [];
  const removedCount = (reason) => removed.filter((entry) => entry.reason === reason).length;
  return {
    policyVersion: String(preparedResult?.policyVersion || PREP_POLICY_VERSION),
    retainedPhraseCount: prepared.length,
    removedCount: removed.length,
    structuralLabelsRemoved: removedCount("structural-label"),
    performanceNotesRemoved: removedCount("performance-note"),
    blankLinesRemoved: removedCount("blank"),
    wrapsJoined: prepared.filter((line) => line.decisions?.includes("merged-indented-wrap")).length,
    trimmedPhrases: prepared.filter((line) => line.decisions?.includes("trimmed-whitespace")).length,
  };
}

function normalizeAnchors(anchors = [], preparedLines = []) {
  const known = new Set(preparedLines.map((line) => line.lineId));
  const byLine = new Map();

  for (const anchor of anchors || []) {
    if (!anchor || !known.has(anchor.lineId)) continue;
    const mediaTimeMs = Number(anchor.mediaTimeMs);
    if (!Number.isFinite(mediaTimeMs) || mediaTimeMs < 0) continue;
    const source = anchor.source === "human-edit" ? "human-edit" : "human-tap";
    byLine.set(anchor.lineId, {
      lineId: anchor.lineId,
      mediaTimeMs: Math.round(mediaTimeMs),
      source,
      anchorVersion: String(anchor.anchorVersion || ANCHOR_VERSION),
    });
  }

  return [...byLine.values()].sort(
    (a, b) => a.mediaTimeMs - b.mediaTimeMs || a.lineId.localeCompare(b.lineId),
  );
}

function summarizeRelistenDelta(before = [], after = [], anchors = []) {
  const beforeByLine = new Map((before || []).filter((entry) => entry?.lineId).map((entry) => [entry.lineId, entry]));
  const afterByLine = new Map((after || []).filter((entry) => entry?.lineId).map((entry) => [entry.lineId, entry]));
  const placed = (entry) => Number.isFinite(Number(entry?.start));
  const human = (entry) => entry?.status === "human" || entry?.humanCorrected === true;

  let anchorsHeld = 0;
  for (const anchor of anchors || []) {
    const entry = afterByLine.get(anchor?.lineId);
    if (!entry || !placed(entry) || !human(entry)) continue;
    if (Math.abs(Number(entry.start) * 1000 - Number(anchor.mediaTimeMs)) <= 1) anchorsHeld += 1;
  }

  let machineRecovered = 0;
  let machineLost = 0;
  for (const [lineId, entry] of afterByLine) {
    const prior = beforeByLine.get(lineId);
    if (!prior) continue;
    if (!placed(prior) && placed(entry) && !human(entry)) machineRecovered += 1;
    if (placed(prior) && !human(prior) && !placed(entry)) machineLost += 1;
  }

  return {
    anchorsHeld,
    machineRecovered,
    machineLost,
    unresolved: [...afterByLine.values()].filter((entry) => !placed(entry)).length,
  };
}

function normalizeListenerEvidence(evidence = []) {
  const allowed = new Set(["aligned", "tentative", "unresolved"]);
  return (evidence || [])
    .filter((entry) => entry && entry.lineId)
    .map((entry) => ({
      lineId: String(entry.lineId),
      state: allowed.has(entry.state) ? entry.state : "unresolved",
      start: Number.isFinite(Number(entry.start)) ? Number(entry.start) : null,
      end: Number.isFinite(Number(entry.end)) ? Number(entry.end) : null,
      confidence: Number.isFinite(Number(entry.confidence)) ? Number(entry.confidence) : null,
    }))
    .sort((a, b) => a.lineId.localeCompare(b.lineId));
}

function buildResolutionState({ preparedLines = [], listenerEvidence = [], anchors = [], dispositions = {} } = {}) {
  const evidenceByLine = new Map(normalizeListenerEvidence(listenerEvidence).map((entry) => [entry.lineId, entry]));
  const normalizedAnchors = normalizeAnchors(anchors, preparedLines);
  const anchorsByLine = new Map(normalizedAnchors.map((anchor) => [anchor.lineId, anchor]));

  return preparedLines.map((line) => {
    const anchor = anchorsByLine.get(line.lineId);
    if (anchor) {
      return { ...line, state: "anchored", anchor, start: anchor.mediaTimeMs / 1000, end: null, disposition: null };
    }

    const evidence = evidenceByLine.get(line.lineId) || { state: "unresolved", start: null, end: null, confidence: null };
    const requestedDisposition = dispositions?.[line.lineId];
    const disposition = evidence.state === "unresolved" && (requestedDisposition === "composted" || requestedDisposition === "ignored")
      ? requestedDisposition
      : null;

    return {
      ...line,
      state: disposition || evidence.state,
      start: disposition ? null : evidence.start,
      end: disposition ? null : evidence.end,
      confidence: evidence.confidence,
      disposition,
    };
  });
}

function admitCanonicalCues(resolution = []) {
  return resolution
    .filter((line) => (line.state === "aligned" || line.state === "anchored") && Number.isFinite(line.start))
    .map((line) => ({
      start: Number(line.start),
      end: Number.isFinite(line.end) ? Number(line.end) : null,
      text: line.text,
      lineId: line.lineId,
      state: line.state,
    }))
    .sort((a, b) => a.start - b.start || a.lineId.localeCompare(b.lineId));
}

function countStates(resolution) {
  const counts = { aligned: 0, tentative: 0, unresolved: 0, anchored: 0, composted: 0, ignored: 0 };
  for (const line of resolution || []) {
    if (Object.prototype.hasOwnProperty.call(counts, line.state)) counts[line.state] += 1;
  }
  return counts;
}

function buildFoundryEvidence({ rawSource = "", preparedResult = null, listenerEvidence = [], anchors = [], dispositions = {} } = {}) {
  const prepared = preparedResult || prepareLyrics(rawSource);
  const normalizedEvidence = normalizeListenerEvidence(listenerEvidence);
  const normalizedAnchors = normalizeAnchors(anchors, prepared.prepared);
  const resolution = buildResolutionState({
    preparedLines: prepared.prepared,
    listenerEvidence: normalizedEvidence,
    anchors: normalizedAnchors,
    dispositions,
  });
  const canonicalCues = admitCanonicalCues(resolution);
  const composted = resolution.filter((line) => line.state === "composted").map(({ lineId, text, sourceLines }) => ({ lineId, text, sourceLines }));
  const ignored = resolution.filter((line) => line.state === "ignored").map(({ lineId, text, sourceLines }) => ({ lineId, text, sourceLines }));

  return {
    policy: {
      prep: PREP_POLICY_VERSION,
      listenerEvidence: LISTENER_EVIDENCE_VERSION,
      anchor: ANCHOR_VERSION,
    },
    hashes: {
      originalLyricSource: prepared.originalSourceHash,
      preparedLineSet: prepared.preparedLineSetHash,
      listenerEvidence: hashValue(normalizedEvidence),
      humanAnchorSet: hashValue(normalizedAnchors),
      finalCanonicalCueTrack: hashValue(canonicalCues),
      compostedFragments: hashValue(composted),
      ignoredFragments: hashValue(ignored),
    },
    counts: {
      prepared: prepared.prepared.length,
      anchors: normalizedAnchors.length,
      canonicalCues: canonicalCues.length,
      composted: composted.length,
      ignored: ignored.length,
      states: countStates(resolution),
    },
    prepared,
    resolution,
    canonicalCues,
    composted,
    ignored,
  };
}

module.exports = {
  ANCHOR_VERSION,
  LISTENER_EVIDENCE_VERSION,
  PREP_POLICY_VERSION,
  admitCanonicalCues,
  buildFoundryEvidence,
  buildResolutionState,
  hashValue,
  normalizeAnchors,
  normalizeListenerEvidence,
  prepareLyrics,
  summarizeLyricPreparation,
  summarizeRelistenDelta,
};
