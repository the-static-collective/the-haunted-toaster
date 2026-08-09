const crypto = require("node:crypto");

const GHOST_POLICY_VERSION = "lyric-ghost-plan/v1";
const TREATMENTS = Object.freeze([
  "faint-drift",
  "photocopy-flash",
  "fragment-smear",
]);

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

function unitFromHash(hash, offset = 0) {
  const slice = hash.slice(offset % 56, (offset % 56) + 8);
  return parseInt(slice, 16) / 0xffffffff;
}

function cleanText(value) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);
}

function candidateArrays(parsed) {
  if (Array.isArray(parsed)) return [parsed];
  if (!parsed || typeof parsed !== "object") return [];
  return [
    parsed.resolution,
    parsed.fragments,
    parsed.lines,
    parsed.cues,
    parsed.composted,
    parsed.lyrics?.resolution,
    parsed.lyrics?.fragments,
    parsed.lyrics?.lines,
    parsed.lyrics?.cues,
    parsed.lyrics?.composted,
  ].filter(Array.isArray);
}

function extractCompostedFragments(value) {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((entry, index) => ({
        lineId: String(entry.lineId || entry.fragmentId || `compost-${index}`),
        text: cleanText(entry.text || entry.lyric || entry.line || entry.value),
        sourceLines: Array.isArray(entry.sourceLines) ? entry.sourceLines.map(Number).filter(Number.isFinite) : [],
      }))
      .filter((entry) => entry.text);
  }

  let parsed;
  try {
    parsed = JSON.parse(String(value || ""));
  } catch {
    return [];
  }

  const seen = new Set();
  const fragments = [];
  for (const entries of candidateArrays(parsed)) {
    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;
      const state = String(entry.state || entry.status || entry.disposition || "").toLowerCase();
      if (state !== "composted") return;
      const text = cleanText(entry.text || entry.lyric || entry.line || entry.value);
      if (!text) return;
      const lineId = String(entry.lineId || entry.fragmentId || `compost-${index}`);
      const key = `${lineId}\u0000${text}`;
      if (seen.has(key)) return;
      seen.add(key);
      fragments.push({
        lineId,
        text,
        sourceLines: Array.isArray(entry.sourceLines)
          ? entry.sourceLines.map(Number).filter(Number.isFinite)
          : [],
      });
    });
  }
  return fragments;
}

function fragmentWords(fragment) {
  const words = fragment.text.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return words;
  const picks = [words[0], words[Math.floor(words.length / 2)], words[words.length - 1]];
  return [...new Set(picks)];
}

function musicalWindows(duration, sections = []) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  const lawful = (sections || [])
    .map((section) => ({
      start: Math.max(0, Number(section.start ?? section.startSeconds) || 0),
      end: Math.min(safeDuration, Number(section.end ?? section.endSeconds) || safeDuration),
      energy: Number(section.energy) || 0,
    }))
    .filter((section) => section.end - section.start >= 0.2);
  if (lawful.length) return lawful;
  if (safeDuration <= 0) return [];
  return [{ start: 0, end: safeDuration, energy: 0 }];
}

function resolveLyricGhostPlan({ composted, lyrics, duration, sections = [], scoreIdentity = null, profileIdentity = null } = {}) {
  const fragments = extractCompostedFragments(composted || lyrics);
  const windows = musicalWindows(duration, sections);
  if (!fragments.length || !windows.length) {
    const empty = {
      policyVersion: GHOST_POLICY_VERSION,
      semanticTimingAuthority: "none",
      fragments: [],
      apparitions: [],
    };
    return Object.freeze({ ...empty, hash: hashValue(empty) });
  }

  const apparitions = [];
  fragments.forEach((fragment, fragmentIndex) => {
    fragmentWords(fragment).forEach((text, wordIndex) => {
      const identity = {
        policyVersion: GHOST_POLICY_VERSION,
        lineId: fragment.lineId,
        text,
        fragmentIndex,
        wordIndex,
        scoreIdentity,
        profileIdentity,
      };
      const seed = hashValue(identity);
      const window = windows[Math.floor(unitFromHash(seed, 0) * windows.length) % windows.length];
      const treatmentId = TREATMENTS[Math.floor(unitFromHash(seed, 8) * TREATMENTS.length) % TREATMENTS.length];
      const span = Math.max(0.15, window.end - window.start);
      const start = window.start + span * (0.08 + unitFromHash(seed, 16) * 0.84);
      const durationSeconds = treatmentId === "photocopy-flash"
        ? 0.08 + unitFromHash(seed, 24) * 0.16
        : 0.65 + unitFromHash(seed, 24) * 1.75;
      const end = Math.min(Number(duration) || window.end, start + durationSeconds);
      if (!(end > start)) return;
      apparitions.push({
        apparitionId: `ghost-${seed.slice(0, 16)}`,
        fragmentId: fragment.lineId,
        text,
        start: Number(start.toFixed(3)),
        end: Number(end.toFixed(3)),
        treatmentId,
        x: Number((0.08 + unitFromHash(seed, 32) * 0.84).toFixed(4)),
        y: Number((0.08 + unitFromHash(seed, 40) * 0.72).toFixed(4)),
        rotationDegrees: Number((-14 + unitFromHash(seed, 48) * 28).toFixed(2)),
        scale: Number((0.72 + unitFromHash(seed, 4) * 0.72).toFixed(3)),
        opacity: Number((0.12 + unitFromHash(seed, 12) * 0.34).toFixed(3)),
        semanticTimingAuthority: "none",
      });
    });
  });

  apparitions.sort((a, b) => a.start - b.start || a.apparitionId.localeCompare(b.apparitionId));
  const body = {
    policyVersion: GHOST_POLICY_VERSION,
    semanticTimingAuthority: "none",
    fragments,
    apparitions,
  };
  return Object.freeze({ ...body, hash: hashValue(body) });
}

module.exports = {
  GHOST_POLICY_VERSION,
  TREATMENTS,
  extractCompostedFragments,
  hashValue,
  resolveLyricGhostPlan,
};
