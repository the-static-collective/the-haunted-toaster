const {
  cleanCueText,
  cleanLyricInput,
  isSectionHeading,
  parseClock,
} = require("../render/lyrics.cjs");

const MAX_ALIGNMENT_LINES = 256;
const MIN_ACCEPTED_SCORE = 0.39;

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(Number(value) * factor) / factor;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function extractLyricLines(value, limit = MAX_ALIGNMENT_LINES) {
  return cleanLyricInput(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !isSectionHeading(line))
    .map(cleanCueText)
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function levenshteinDistance(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  let current = new Array(b.length + 1);

  for (let row = 1; row <= a.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= b.length; column += 1) {
      const substitution = previous[column - 1] +
        (a[row - 1] === b[column - 1] ? 0 : 1);
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        substitution,
      );
    }
    [previous, current] = [current, previous];
  }
  return previous[b.length];
}

function stringSimilarity(left, right) {
  const a = normalizeComparable(left);
  const b = normalizeComparable(right);
  const longest = Math.max(a.length, b.length);
  if (!longest) return 1;
  return clamp(1 - levenshteinDistance(a, b) / longest, 0, 1);
}

function firstDefined(object, keys) {
  for (const key of keys) {
    if (object && object[key] !== undefined && object[key] !== null) {
      return object[key];
    }
  }
  return null;
}

function timeFromEntry(entry, side) {
  const timestampKey = side === "start" ? "from" : "to";
  const directKeys = side === "start"
    ? ["start", "startSeconds", "start_time", "from", "time"]
    : ["end", "endSeconds", "end_time", "to"];
  const millisecondKeys = side === "start"
    ? ["startMs", "start_ms", "fromMs"]
    : ["endMs", "end_ms", "toMs"];

  const timestamp = parseClock(entry?.timestamps?.[timestampKey]);
  if (timestamp !== null) return timestamp;

  const direct = parseClock(firstDefined(entry, directKeys));
  if (direct !== null) return direct;

  const millisecondValue = firstDefined(entry, millisecondKeys);
  const milliseconds = Number(millisecondValue);
  if (
    millisecondValue !== null &&
    Number.isFinite(milliseconds) &&
    milliseconds >= 0
  ) {
    return milliseconds / 1_000;
  }

  const offset = Number(entry?.offsets?.[timestampKey]);
  if (Number.isFinite(offset) && offset >= 0) {
    return offset / 1_000;
  }
  return null;
}

function probabilityFromEntry(entry) {
  const directValue = firstDefined(
    entry,
    ["p", "probability", "confidence", "score"],
  );
  const direct = Number(directValue);
  if (directValue !== null && Number.isFinite(direct)) {
    return clamp(direct, 0, 1);
  }

  if (Array.isArray(entry?.tokens)) {
    const probabilities = entry.tokens
      .map((token) =>
        Number(firstDefined(token, ["p", "probability", "confidence"])),
      )
      .filter(Number.isFinite)
      .map((value) => clamp(value, 0, 1));
    if (probabilities.length) {
      return probabilities.reduce((sum, value) => sum + value, 0) /
        probabilities.length;
    }
  }
  return 0.62;
}

function transcriptEntries(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.transcription ||
    payload?.segments ||
    payload?.words ||
    payload?.result?.transcription ||
    [];
}

function normalizeTranscript(payload) {
  return transcriptEntries(payload)
    .map((entry, index) => {
      const text = cleanCueText(
        firstDefined(entry, ["text", "word", "value", "content"]),
      );
      const start = timeFromEntry(entry, "start");
      const end = timeFromEntry(entry, "end");
      return {
        index,
        text,
        comparable: normalizeComparable(text),
        start,
        end,
        probability: probabilityFromEntry(entry),
      };
    })
    .filter(
      (entry) =>
        entry.text &&
        entry.comparable &&
        entry.start !== null &&
        entry.end !== null &&
        entry.end > entry.start &&
        !/^<\|.*\|>$/.test(entry.text),
    )
    .sort((left, right) => left.start - right.start || left.index - right.index)
    .map((entry, index) => ({ ...entry, index }));
}

function scoreWindow(line, entries, startIndex, endIndex) {
  const window = entries.slice(startIndex, endIndex + 1);
  const heard = window.map((entry) => entry.text).join(" ");
  const targetComparable = normalizeComparable(line);
  const heardComparable = normalizeComparable(heard);
  const similarity = stringSimilarity(targetComparable, heardComparable);
  const shorter = Math.min(targetComparable.length, heardComparable.length);
  const longer = Math.max(targetComparable.length, heardComparable.length, 1);
  const lengthFit = shorter / longer;
  const asrProbability =
    window.reduce((sum, entry) => sum + entry.probability, 0) / window.length;
  const containsBonus =
    targetComparable.includes(heardComparable) ||
    heardComparable.includes(targetComparable)
      ? 0.035
      : 0;
  const score = clamp(
    similarity * 0.78 +
      lengthFit * 0.13 +
      asrProbability * 0.09 +
      containsBonus,
    0,
    1,
  );

  return {
    startIndex,
    endIndex,
    start: window[0].start,
    end: window[window.length - 1].end,
    heard,
    similarity,
    lengthFit,
    asrProbability,
    score,
  };
}

function candidatesNearCursor(line, entries, cursor, remainingLines) {
  const targetLength = Math.max(1, normalizeComparable(line).length);
  const lyricWordCount = Math.max(1, line.split(/\s+/).filter(Boolean).length);
  const remainingEntries = Math.max(1, entries.length - cursor);
  const averageEntriesPerLine = remainingEntries / Math.max(1, remainingLines);
  const searchAhead = Math.ceil(
    Math.max(48, averageEntriesPerLine * 3.2, lyricWordCount * 7),
  );
  const finalStart = Math.min(entries.length - 1, cursor + searchAhead);
  const maximumWindow = Math.ceil(Math.max(16, lyricWordCount * 2.6));
  const candidates = [];

  for (let startIndex = cursor; startIndex <= finalStart; startIndex += 1) {
    let combinedLength = 0;
    const finalEnd = Math.min(entries.length - 1, startIndex + maximumWindow);
    for (let endIndex = startIndex; endIndex <= finalEnd; endIndex += 1) {
      combinedLength += entries[endIndex].comparable.length;
      if (combinedLength < Math.max(1, targetLength * 0.38)) continue;
      if (combinedLength > targetLength * 2.05 + 10) break;
      candidates.push(scoreWindow(line, entries, startIndex, endIndex));
    }
  }
  return candidates;
}

function broadCandidates(line, entries, cursor) {
  const targetWords = Math.max(1, line.split(/\s+/).filter(Boolean).length);
  const lengths = new Set([
    Math.max(1, targetWords - 2),
    Math.max(1, targetWords - 1),
    targetWords,
    targetWords + 1,
    targetWords + 2,
    Math.ceil(targetWords * 1.5),
  ]);
  const candidates = [];

  for (let startIndex = cursor; startIndex < entries.length; startIndex += 2) {
    for (const length of lengths) {
      const endIndex = Math.min(entries.length - 1, startIndex + length - 1);
      if (endIndex < startIndex) continue;
      candidates.push(scoreWindow(line, entries, startIndex, endIndex));
    }
  }
  return candidates;
}

function adjustedCandidateScore(candidate, cursor, nextLineScore = 0) {
  const skipped = Math.max(0, candidate.startIndex - cursor);
  const skipPenalty = Math.min(0.16, skipped * 0.0035);
  return candidate.score - skipPenalty + nextLineScore * 0.16;
}

function bestCandidate(
  line,
  nextLine,
  entries,
  cursor,
  remainingLines,
) {
  let candidates = candidatesNearCursor(
    line,
    entries,
    cursor,
    remainingLines,
  );
  let ranked = candidates
    .map((candidate) => ({
      candidate,
      adjusted: adjustedCandidateScore(candidate, cursor),
    }))
    .sort((left, right) => right.adjusted - left.adjusted);

  if (!ranked.length || ranked[0].candidate.score < MIN_ACCEPTED_SCORE + 0.08) {
    candidates = broadCandidates(line, entries, cursor);
    ranked = candidates
      .map((candidate) => ({
        candidate,
        adjusted: adjustedCandidateScore(candidate, cursor),
      }))
      .sort((left, right) => right.adjusted - left.adjusted);
  }

  if (!ranked.length) return null;
  const shortlist = ranked.slice(0, 7);

  if (nextLine) {
    for (const item of shortlist) {
      const nextCursor = item.candidate.endIndex + 1;
      if (nextCursor >= entries.length) continue;
      const nextCandidates = candidatesNearCursor(
        nextLine,
        entries,
        nextCursor,
        Math.max(1, remainingLines - 1),
      );
      const nextBest = nextCandidates
        .map((candidate) => adjustedCandidateScore(candidate, nextCursor))
        .sort((left, right) => right - left)[0] || 0;
      item.adjusted = adjustedCandidateScore(
        item.candidate,
        cursor,
        nextBest,
      );
    }
    shortlist.sort((left, right) => right.adjusted - left.adjusted);
  }

  const winner = shortlist[0].candidate;
  return winner.score >= MIN_ACCEPTED_SCORE ? winner : null;
}

function confidenceStatus(candidate) {
  if (!candidate) {
    return { status: "unmatched", confidence: 0 };
  }
  const confidence = clamp(
    candidate.score * 0.76 +
      candidate.similarity * 0.16 +
      candidate.asrProbability * 0.08,
    0,
    1,
  );
  if (confidence >= 0.78 && candidate.similarity >= 0.7) {
    return { status: "high", confidence };
  }
  if (confidence >= 0.61 && candidate.similarity >= 0.47) {
    return { status: "medium", confidence };
  }
  return { status: "low", confidence };
}

function alignLyricsToTranscript(
  lyrics,
  transcript,
  duration = 0,
  options = {},
) {
  const lines = extractLyricLines(lyrics);
  const entries = normalizeTranscript(transcript);
  const songDuration = Math.max(0, Number(duration) || 0);
  const leadSeconds = Number.isFinite(Number(options.leadSeconds))
    ? Math.max(-2, Math.min(2, Number(options.leadSeconds)))
    : 0;
  const cues = [];
  let cursor = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const nextLine = lines[lineIndex + 1] || null;
    const candidate =
      cursor < entries.length
        ? bestCandidate(
            line,
            nextLine,
            entries,
            cursor,
            lines.length - lineIndex,
          )
        : null;
    const confidence = confidenceStatus(candidate);
    const nextLineSimilarity = candidate && nextLine
      ? stringSimilarity(nextLine, candidate.heard)
      : 0;
    const stealsNextLine = Boolean(
      candidate &&
      nextLine &&
      nextLineSimilarity >= 0.72 &&
      nextLineSimilarity >= candidate.similarity + 0.16
    );

    if (!candidate || confidence.status === "low" || stealsNextLine) {
      cues.push({
        lineIndex,
        text: line,
        start: null,
        end: null,
        status: "unmatched",
        confidence: round(confidence.confidence, 4),
        similarity: candidate ? round(candidate.similarity, 4) : 0,
        heard: candidate?.heard || null,
      });
      continue;
    }

    const start = clamp(
      candidate.start - leadSeconds,
      0,
      songDuration || candidate.start,
    );
    const end = clamp(
      Math.max(start + 0.18, candidate.end),
      start + 0.18,
      songDuration || Math.max(start + 0.18, candidate.end),
    );
    cues.push({
      lineIndex,
      text: line,
      start: round(start),
      end: round(end),
      status: confidence.status,
      confidence: round(confidence.confidence, 4),
      similarity: round(candidate.similarity, 4),
      heard: candidate.heard,
    });
    cursor = candidate.endIndex + 1;
  }

  const counts = {
    high: cues.filter((cue) => cue.status === "high").length,
    medium: cues.filter((cue) => cue.status === "medium").length,
    low: cues.filter((cue) => cue.status === "low").length,
    unmatched: cues.filter((cue) => cue.status === "unmatched").length,
  };
  const matchedCount = cues.length - counts.unmatched;
  const reviewCount = counts.medium + counts.low + counts.unmatched;

  return {
    cues,
    transcriptEntryCount: entries.length,
    lineCount: lines.length,
    matchedCount,
    reviewCount,
    coverage: lines.length ? round(matchedCount / lines.length, 4) : 0,
    counts,
    reviewRequired: reviewCount > 0,
  };
}

function formatLrcTimestamp(seconds) {
  const centiseconds = Math.max(0, Math.round(Number(seconds) * 100));
  const minutes = Math.floor(centiseconds / 6_000);
  const remainder = centiseconds - minutes * 6_000;
  const wholeSeconds = Math.floor(remainder / 100);
  const fraction = remainder % 100;
  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(
    2,
    "0",
  )}.${String(fraction).padStart(2, "0")}`;
}

function cuesToLrc(cues, metadata = {}) {
  const lines = [
    "[by:Full Measure Listener]",
    metadata.title ? `[ti:${cleanCueText(metadata.title)}]` : null,
    metadata.artist ? `[ar:${cleanCueText(metadata.artist)}]` : null,
    metadata.note ? `[re:${cleanCueText(metadata.note)}]` : null,
  ].filter(Boolean);

  for (const cue of cues) {
    if (!Number.isFinite(cue.start) || !cue.text) continue;
    lines.push(`[${formatLrcTimestamp(cue.start)}]${cleanCueText(cue.text)}`);
  }
  return `${lines.join("\n")}\n`;
}

module.exports = {
  MAX_ALIGNMENT_LINES,
  MIN_ACCEPTED_SCORE,
  alignLyricsToTranscript,
  cuesToLrc,
  extractLyricLines,
  formatLrcTimestamp,
  levenshteinDistance,
  normalizeComparable,
  normalizeTranscript,
  stringSimilarity,
};