const MAX_CUES = 256;
const MAX_LYRIC_TEXT = 250_000;

function cleanLyricInput(value, maxLength = MAX_LYRIC_TEXT) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function cleanCueText(value) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/<[^>]{1,160}>/g, "")
    .replace(/\{\\[^}]{1,160}\}/g, "")
    .replace(/\\N/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1_000);
}

function isSectionHeading(value) {
  return /^\[[^\]]{1,64}\]$/.test(String(value || "").trim());
}

function normalizeLyrics(lyrics, limit = 64) {
  return cleanLyricInput(lyrics)
    .split("\n")
    .map(cleanCueText)
    .filter((line) => line && !isSectionHeading(line))
    .slice(0, limit);
}

function parseClock(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const normalized = String(value || "")
    .trim()
    .replace(",", ".")
    .split(/\s+/)[0];
  if (!normalized) return null;
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    const seconds = Number(normalized);
    return Number.isFinite(seconds) ? seconds : null;
  }

  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const numbers = parts.map(Number);
  if (numbers.some((part) => !Number.isFinite(part) || part < 0)) return null;

  if (parts.length === 2) {
    return numbers[0] * 60 + numbers[1];
  }
  return numbers[0] * 3600 + numbers[1] * 60 + numbers[2];
}

function parseLrcClock(minutes, seconds, fraction = "") {
  const base = Number(minutes) * 60 + Number(seconds);
  if (!fraction) return base;
  return base + Number(fraction) / 10 ** fraction.length;
}

function parseLrc(input) {
  const offsetMatch = input.match(/^\s*\[offset:([+-]?\d+)\]\s*$/im);
  const offsetSeconds = offsetMatch ? Number(offsetMatch[1]) / 1_000 : 0;
  const cues = [];

  for (const rawLine of input.split("\n")) {
    const matches = [
      ...rawLine.matchAll(/\[(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g),
    ];
    if (!matches.length) continue;

    const last = matches[matches.length - 1];
    const text = cleanCueText(
      rawLine
        .slice((last.index || 0) + last[0].length)
        .replace(/<\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?>/g, ""),
    );
    if (!text || isSectionHeading(text)) continue;

    for (const match of matches) {
      cues.push({
        start:
          parseLrcClock(match[1], match[2], match[3]) + offsetSeconds,
        end: null,
        text,
        explicitEnd: false,
      });
    }
  }

  return cues;
}

function parseSubtitleBlocks(input) {
  const cues = [];
  const blocks = input
    .replace(/^\uFEFF?WEBVTT[^\n]*\n/i, "")
    .split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;

    const timing = lines[timingIndex].match(
      /(\d{1,3}:\d{2}(?::\d{2})?[.,]\d{1,3})\s*-->\s*(\d{1,3}:\d{2}(?::\d{2})?[.,]\d{1,3})/,
    );
    if (!timing) continue;

    const text = cleanCueText(lines.slice(timingIndex + 1).join(" "));
    const start = parseClock(timing[1]);
    const end = parseClock(timing[2]);
    if (
      !text ||
      isSectionHeading(text) ||
      start === null ||
      end === null
    ) {
      continue;
    }
    cues.push({ start, end, text, explicitEnd: true });
  }

  return cues;
}

function firstDefined(object, keys) {
  for (const key of keys) {
    if (object && object[key] !== undefined && object[key] !== null) {
      return object[key];
    }
  }
  return null;
}

function jsonTime(entry, side) {
  const directKeys =
    side === "start"
      ? ["start", "startSeconds", "start_time", "from", "time", "timestamp"]
      : ["end", "endSeconds", "end_time", "to"];
  const millisecondKeys =
    side === "start"
      ? ["startMs", "start_ms", "fromMs"]
      : ["endMs", "end_ms", "toMs"];
  const timestampKey = side === "start" ? "from" : "to";

  const timestampValue = entry?.timestamps?.[timestampKey];
  const timestamp = parseClock(timestampValue);
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

function jsonText(entry) {
  const direct = firstDefined(entry, [
    "text",
    "lyric",
    "line",
    "content",
    "value",
    "word",
  ]);
  if (direct !== null && typeof direct !== "object") {
    return cleanCueText(direct);
  }
  if (Array.isArray(entry?.words)) {
    return cleanCueText(
      entry.words
        .map((word) =>
          firstDefined(word, ["word", "text", "value", "content"]),
        )
        .filter((word) => word !== null)
        .join(" "),
    );
  }
  return "";
}

function looksWordLevel(cues) {
  if (cues.length < 6) return false;
  const wordLike = cues.filter(
    (cue) =>
      !/\s/.test(cue.text) &&
      cue.end !== null &&
      cue.end - cue.start <= 2.5,
  ).length;
  return wordLike / cues.length >= 0.7;
}

function groupWordCues(words) {
  const groups = [];
  let current = [];

  function flush() {
    if (!current.length) return;
    groups.push({
      start: current[0].start,
      end: current[current.length - 1].end,
      text: cleanCueText(current.map((word) => word.text).join(" ")),
      explicitEnd: true,
    });
    current = [];
  }

  for (const word of words) {
    const previous = current[current.length - 1];
    const currentText = current.map((item) => item.text).join(" ");
    const gap = previous ? word.start - previous.end : 0;
    if (
      current.length &&
      (gap > 0.85 ||
        current.length >= 8 ||
        currentText.length + word.text.length + 1 > 52 ||
        word.start - current[0].start > 4.8)
    ) {
      flush();
    }

    current.push(word);
    if (/[.!?;:]$/.test(word.text)) flush();
  }
  flush();
  return groups;
}

function parseJson(input) {
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }

  let entries = null;
  if (Array.isArray(parsed)) {
    entries = parsed;
  } else {
    entries =
      parsed?.cues ||
      parsed?.segments ||
      parsed?.lines ||
      parsed?.transcription ||
      parsed?.lyrics?.cues ||
      parsed?.lyrics?.lines ||
      parsed?.words ||
      null;
  }
  if (!Array.isArray(entries)) return [];

  let cues = entries
    .map((entry) => {
      const start = jsonTime(entry, "start");
      const end = jsonTime(entry, "end");
      const text = jsonText(entry);
      return {
        start,
        end,
        text,
        explicitEnd: end !== null,
      };
    })
    .filter(
      (cue) =>
        cue.start !== null &&
        cue.text &&
        !isSectionHeading(cue.text),
    );

  if (looksWordLevel(cues)) {
    cues = groupWordCues(cues);
  }
  return cues;
}

function readingDuration(text) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.min(6.5, Math.max(1.5, 0.62 + words * 0.52));
}

function finalizeTimedCues(cues, duration) {
  const songDuration = Math.max(0, Number(duration) || 0);
  const sorted = cues
    .filter(
      (cue) =>
        Number.isFinite(cue.start) &&
        cue.start < songDuration &&
        cue.start >= -5 &&
        cue.text,
    )
    .map((cue) => ({
      ...cue,
      start: Math.max(0, cue.start),
      end: Number.isFinite(cue.end) ? cue.end : null,
      text: cleanCueText(cue.text),
    }))
    .sort((a, b) => a.start - b.start)
    .slice(0, MAX_CUES);

  const unique = sorted.filter(
    (cue, index) =>
      index === 0 ||
      Math.abs(cue.start - sorted[index - 1].start) > 0.01 ||
      cue.text !== sorted[index - 1].text,
  );

  return unique.map((cue, index) => {
    return {
      start: Number(cue.start.toFixed(3)),
      end: Number.isFinite(cue.end) ? Number(cue.end.toFixed(3)) : null,
      text: cue.text,
    };
  });
}

function evenlyDistributedCues(lines, duration) {
  if (!lines.length || duration <= 0) return [];
  const availableStart = Math.min(6.5, duration * 0.08);
  const availableEnd = Math.max(
    availableStart + 0.5,
    duration - Math.min(4.5, duration * 0.055),
  );
  const slot = (availableEnd - availableStart) / lines.length;

  return lines.map((text, index) => {
    const start = availableStart + slot * index;
    const end = Math.min(
      availableEnd,
      start + Math.max(0.45, slot * 0.9),
    );
    return {
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text,
    };
  });
}

function createLyricTrack(value, duration) {
  const input = cleanLyricInput(value);
  if (!input) {
    return {
      mode: "none",
      sourceFormat: null,
      timed: false,
      cues: [],
      lines: [],
      warnings: [],
    };
  }

  const warnings = [];
  let sourceFormat = null;
  let rawCues = null;

  if (/^\s*[\[{]/.test(input)) {
    rawCues = parseJson(input);
    if (rawCues !== null) sourceFormat = "json";
  }

  if (rawCues === null && /-->\s*\d/.test(input)) {
    rawCues = parseSubtitleBlocks(input);
    sourceFormat = /^\s*\uFEFF?WEBVTT/i.test(input) ? "vtt" : "srt";
  }

  if (
    rawCues === null &&
    /\[\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?\]/.test(input)
  ) {
    rawCues = parseLrc(input);
    sourceFormat = "lrc";
  }

  if (rawCues !== null) {
    const cues = finalizeTimedCues(rawCues, duration);
    if (cues.length) {
      return {
        mode: `timestamped-${sourceFormat}`,
        sourceFormat,
        timed: true,
        cues,
        lines: cues.map((cue) => cue.text),
        warnings,
      };
    }
    warnings.push(
      "Timestamp syntax was detected, but no usable cues fell inside the song.",
    );
    return {
      mode: "none",
      sourceFormat,
      timed: false,
      cues: [],
      lines: [],
      warnings,
    };
  }

  const lines = normalizeLyrics(input);
  return {
    mode: lines.length ? "evenly-distributed" : "none",
    sourceFormat: lines.length ? "plain" : null,
    timed: false,
    cues: evenlyDistributedCues(lines, Number(duration) || 0),
    lines,
    warnings,
  };
}

function summarizeLyricTrack(value, duration) {
  const track = createLyricTrack(value, duration);
  return {
    mode: track.mode,
    sourceFormat: track.sourceFormat,
    timed: track.timed,
    cueCount: track.cues.length,
    lineCount: track.lines.length,
    firstCueSeconds: track.cues[0]?.start ?? null,
    lastCueSeconds: track.cues[track.cues.length - 1]?.end ?? null,
    warnings: track.warnings,
  };
}


function normalizeCueTimeline(cues, mediaDuration) {
  if (!cues || !cues.length) return [];
  const duration = Number.isFinite(mediaDuration) ? mediaDuration : Infinity;

  const normalized = [];
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    let end = Number.isFinite(cue.end) ? cue.end : null;

    if (end === null) {
      if (index + 1 < cues.length) {
        end = cues[index + 1].start;
      } else {
        end = duration;
      }
    }

    if (index + 1 < cues.length && end > cues[index + 1].start) {
      end = cues[index + 1].start;
    }

    if (end > cue.start) {
      normalized.push({
        ...cue,
        end
      });
    }
  }
  return normalized;
}

function selectCueForTime(normalizedCues, timestampSeconds) {
  if (!normalizedCues || !normalizedCues.length || typeof timestampSeconds !== "number" || Number.isNaN(timestampSeconds)) {
    return null;
  }

  let selected = null;
  for (const cue of normalizedCues) {
    if (timestampSeconds >= cue.start && timestampSeconds < cue.end) {
      selected = cue;
    }
  }
  return selected;
}

module.exports = {
  normalizeCueTimeline,
  selectCueForTime,
  evenlyDistributedCues,
  MAX_CUES,
  MAX_LYRIC_TEXT,
  cleanCueText,
  cleanLyricInput,
  createLyricTrack,
  isSectionHeading,
  normalizeLyrics,
  parseClock,
  summarizeLyricTrack,
};
