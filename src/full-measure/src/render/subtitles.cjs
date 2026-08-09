const { normalizeCueTimeline } = require("./lyrics.cjs");

function normalizeSubtitleText(value) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function formatSubtitleTimestamp(seconds, separator) {
  const milliseconds = Math.max(0, Math.round(Number(seconds) * 1_000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const remainder = milliseconds - hours * 3_600_000;
  const minutes = Math.floor(remainder / 60_000);
  const final = remainder - minutes * 60_000;
  const wholeSeconds = Math.floor(final / 1_000);
  const fraction = final % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}${separator}${String(fraction).padStart(3, "0")}`;
}

function canonicalSubtitleCues(cues, mediaDuration) {
  return normalizeCueTimeline(cues, mediaDuration).map((cue) => ({
    start: Number(cue.start),
    end: Number(cue.end),
    text: normalizeSubtitleText(cue.text),
  })).filter((cue) => cue.text && Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start);
}

function serializeSrt(cues, mediaDuration) {
  const normalized = canonicalSubtitleCues(cues, mediaDuration);
  if (!normalized.length) return "";
  return `${normalized.map((cue, index) => [
    String(index + 1),
    `${formatSubtitleTimestamp(cue.start, ",")} --> ${formatSubtitleTimestamp(cue.end, ",")}`,
    cue.text,
  ].join("\n")).join("\n\n")}\n`;
}

function serializeWebVtt(cues, mediaDuration) {
  const normalized = canonicalSubtitleCues(cues, mediaDuration);
  if (!normalized.length) return "WEBVTT\n";
  return `WEBVTT\n\n${normalized.map((cue) => [
    `${formatSubtitleTimestamp(cue.start, ".")} --> ${formatSubtitleTimestamp(cue.end, ".")}`,
    cue.text,
  ].join("\n")).join("\n\n")}\n`;
}

module.exports = {
  canonicalSubtitleCues,
  formatSubtitleTimestamp,
  serializeSrt,
  serializeWebVtt,
};
