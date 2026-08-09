const {
  alignLyricsToTranscript,
  extractLyricLines,
  normalizeTranscript,
} = require("./matcher.cjs");

const ANCHOR_GUIDED_POLICY_VERSION = "anchor-guided-listener/v1";
const ANCHOR_ENVELOPE_PREFIX = "[[HT_ANCHORS_V1:";
const ANCHOR_ENVELOPE_SUFFIX = "]]";

function round(value, places = 4) {
  const factor = 10 ** places;
  return Math.round(Number(value) * factor) / factor;
}

function unpackAnchorEnvelope(value) {
  const source = String(value || "");
  const newline = source.indexOf("\n");
  const firstLine = newline >= 0 ? source.slice(0, newline) : source;
  if (
    !firstLine.startsWith(ANCHOR_ENVELOPE_PREFIX) ||
    !firstLine.endsWith(ANCHOR_ENVELOPE_SUFFIX)
  ) {
    return { lyrics: source, anchors: [] };
  }

  const encoded = firstLine.slice(
    ANCHOR_ENVELOPE_PREFIX.length,
    -ANCHOR_ENVELOPE_SUFFIX.length,
  );
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded));
    return {
      lyrics: newline >= 0 ? source.slice(newline + 1) : "",
      anchors: Array.isArray(parsed) ? parsed : [],
    };
  } catch {
    return { lyrics: source, anchors: [] };
  }
}

function normalizeAnchors(anchors, lines, duration) {
  const songDuration = Math.max(0, Number(duration) || 0);
  const byLine = new Map();

  for (const anchor of anchors || []) {
    const lineIndex = Number(anchor?.lineIndex ?? anchor?.cueIndex);
    const time = Number(anchor?.time ?? anchor?.start);
    if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= lines.length) {
      continue;
    }
    if (!Number.isFinite(time) || time < 0 || (songDuration && time > songDuration)) {
      continue;
    }
    if (String(anchor?.text || "") !== lines[lineIndex]) continue;

    byLine.set(lineIndex, {
      lineIndex,
      text: lines[lineIndex],
      time,
    });
  }

  return [...byLine.values()].sort(
    (left, right) => left.lineIndex - right.lineIndex || left.time - right.time,
  );
}

function unmatchedCue(lineIndex, text) {
  return {
    lineIndex,
    text,
    start: null,
    end: null,
    status: "unmatched",
    confidence: 0,
    similarity: 0,
    heard: null,
  };
}

function anchorCue(anchor) {
  return {
    lineIndex: anchor.lineIndex,
    text: anchor.text,
    start: anchor.time,
    end: null,
    status: "human",
    confidence: 1,
    similarity: 1,
    heard: anchor.text,
    humanCorrected: true,
    anchorGuided: true,
  };
}

function entriesInsideWindow(entries, startTime, endTime) {
  return entries.filter((entry) => {
    if (Number.isFinite(startTime) && entry.start < startTime) return false;
    if (Number.isFinite(endTime) && entry.end > endTime) return false;
    return true;
  });
}

function recoverWindow({
  lines,
  entries,
  startLine,
  endLine,
  startTime,
  endTime,
  duration,
  options,
}) {
  if (startLine > endLine) return [];
  if (Number.isFinite(endTime) && Number.isFinite(startTime) && endTime <= startTime) {
    return lines.slice(startLine, endLine + 1).map((text, offset) =>
      unmatchedCue(startLine + offset, text),
    );
  }

  const windowEntries = entriesInsideWindow(entries, startTime, endTime);
  const windowLyrics = lines.slice(startLine, endLine + 1).join("\n");
  const aligned = alignLyricsToTranscript(
    windowLyrics,
    windowEntries,
    duration,
    options,
  );

  return aligned.cues.map((cue) => {
    const mapped = {
      ...cue,
      lineIndex: cue.lineIndex + startLine,
    };
    if (!Number.isFinite(mapped.start)) return mapped;

    const crossesLeft = Number.isFinite(startTime) && mapped.start < startTime;
    const crossesRight = Number.isFinite(endTime) &&
      (mapped.start >= endTime || (Number.isFinite(mapped.end) && mapped.end > endTime));
    if (crossesLeft || crossesRight) {
      return unmatchedCue(mapped.lineIndex, mapped.text);
    }
    return mapped;
  });
}

function countAlignment(cues, lineCount, transcriptEntryCount, anchors, windows) {
  const counts = {
    high: cues.filter((cue) => cue.status === "high").length,
    medium: cues.filter((cue) => cue.status === "medium").length,
    low: cues.filter((cue) => cue.status === "low").length,
    unmatched: cues.filter((cue) => cue.status === "unmatched").length,
    human: cues.filter((cue) => cue.status === "human").length,
  };
  const matchedCount = lineCount - counts.unmatched;
  const reviewCount = counts.medium + counts.low + counts.unmatched;
  const monotonicAnchors = anchors.every(
    (anchor, index) => index === 0 || anchor.time > anchors[index - 1].time,
  );

  return {
    cues,
    transcriptEntryCount,
    lineCount,
    matchedCount,
    reviewCount,
    coverage: lineCount ? round(matchedCount / lineCount) : 0,
    counts,
    reviewRequired: reviewCount > 0,
    anchorGuided: {
      policyVersion: ANCHOR_GUIDED_POLICY_VERSION,
      anchorCount: anchors.length,
      monotonicAnchors,
      windows,
    },
  };
}

function alignLyricsToTranscriptWithAnchors(
  lyrics,
  transcript,
  duration = 0,
  options = {},
) {
  const lines = extractLyricLines(lyrics);
  const entries = normalizeTranscript(transcript);
  const anchors = normalizeAnchors(options.anchors, lines, duration);

  if (!anchors.length) {
    return alignLyricsToTranscript(lyrics, transcript, duration, options);
  }

  const cues = Array.from({ length: lines.length }, (_, lineIndex) =>
    unmatchedCue(lineIndex, lines[lineIndex]),
  );
  for (const anchor of anchors) cues[anchor.lineIndex] = anchorCue(anchor);

  const monotonicAnchors = anchors.every(
    (anchor, index) => index === 0 || anchor.time > anchors[index - 1].time,
  );
  if (!monotonicAnchors) {
    return countAlignment(cues, lines.length, entries.length, anchors, []);
  }

  const windows = [];
  let previousLine = -1;
  let previousTime = 0;

  for (const anchor of anchors) {
    const startLine = previousLine + 1;
    const endLine = anchor.lineIndex - 1;
    windows.push({
      startLine,
      endLine,
      startTime: previousTime,
      endTime: anchor.time,
    });
    for (const cue of recoverWindow({
      lines,
      entries,
      startLine,
      endLine,
      startTime: previousTime,
      endTime: anchor.time,
      duration,
      options: { leadSeconds: options.leadSeconds },
    })) {
      cues[cue.lineIndex] = cue;
    }
    previousLine = anchor.lineIndex;
    previousTime = anchor.time;
  }

  const finalStartLine = previousLine + 1;
  const finalEndLine = lines.length - 1;
  const finalEndTime = Math.max(0, Number(duration) || 0) || Infinity;
  windows.push({
    startLine: finalStartLine,
    endLine: finalEndLine,
    startTime: previousTime,
    endTime: Number.isFinite(finalEndTime) ? finalEndTime : null,
  });
  for (const cue of recoverWindow({
    lines,
    entries,
    startLine: finalStartLine,
    endLine: finalEndLine,
    startTime: previousTime,
    endTime: finalEndTime,
    duration,
    options: { leadSeconds: options.leadSeconds },
  })) {
    cues[cue.lineIndex] = cue;
  }

  return countAlignment(cues, lines.length, entries.length, anchors, windows);
}

module.exports = {
  ANCHOR_ENVELOPE_PREFIX,
  ANCHOR_ENVELOPE_SUFFIX,
  ANCHOR_GUIDED_POLICY_VERSION,
  alignLyricsToTranscriptWithAnchors,
  normalizeAnchors,
  unpackAnchorEnvelope,
};
