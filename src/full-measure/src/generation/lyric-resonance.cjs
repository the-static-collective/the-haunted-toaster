const { deepFreeze } = require("./canonical.cjs");

const LYRIC_RESONANCE_SCHEMA = "haunted-toaster/lyric-resonance/v1";
const LYRIC_RESONANCE_POLICY = "lyric-resonance-atmosphere-v1";

const EXACT_SMOKE_TERMS = new Set(["smoke", "smokes", "smoking"]);

function tokensOf(value) {
  return String(value || "")
    .toLowerCase()
    .match(/[a-z0-9']+/g) || [];
}

function resolveLyricResonance(track, { timebase, durationTicks } = {}) {
  if (!track?.timed || !Array.isArray(track.cues) || !track.cues.length) {
    return null;
  }
  if (!Number.isInteger(timebase) || timebase <= 0) {
    throw new TypeError("Lyric resonance requires a positive integer timebase.");
  }
  if (!Number.isInteger(durationTicks) || durationTicks < 0) {
    throw new TypeError("Lyric resonance requires non-negative durationTicks.");
  }

  const events = [];
  for (const [cueIndex, cue] of track.cues.entries()) {
    if (!Number.isFinite(cue?.start)) continue;
    const matchedTerms = tokensOf(cue.text).filter((term) => EXACT_SMOKE_TERMS.has(term));
    if (!matchedTerms.length) continue;

    const startTick = Math.max(
      0,
      Math.min(durationTicks, Math.round(Number(cue.start) * timebase)),
    );
    const durationSeconds = 4.8;
    const endTick = Math.min(
      durationTicks,
      Math.max(startTick + 1, Math.round((Number(cue.start) + durationSeconds) * timebase)),
    );
    if (endTick <= startTick) continue;

    events.push({
      family: "smoke",
      startTick,
      endTick,
      intensity: 1,
      cueIndices: [cueIndex],
      matchedTerms: [...new Set(matchedTerms)],
    });
  }

  if (!events.length) return null;
  return deepFreeze({
    schema: LYRIC_RESONANCE_SCHEMA,
    policy: LYRIC_RESONANCE_POLICY,
    sourceMode: String(track.mode || "timestamped"),
    events,
  });
}

module.exports = {
  LYRIC_RESONANCE_POLICY,
  LYRIC_RESONANCE_SCHEMA,
  resolveLyricResonance,
  tokensOf,
};
