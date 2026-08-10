const { deepFreeze } = require("./canonical.cjs");

const LYRIC_RESONANCE_SCHEMA = "haunted-toaster/lyric-resonance/v1";
const LYRIC_RESONANCE_POLICY = "lyric-resonance-atmosphere-v1";
const LYRIC_RESONANCE_FAMILIES = Object.freeze([
  "smoke",
  "rain",
  "dust",
  "firefly",
]);
const LYRIC_RESONANCE_WEIGHTS = Object.freeze({
  exact: 1,
  strong: 0.72,
  related: 0.45,
});
const LYRIC_RESONANCE_COOLDOWN_SECONDS = 1.5;

const LYRIC_RESONANCE_LEXICON = deepFreeze({
  smoke: {
    exact: ["smoke", "smokes", "smoking"],
    strong: ["haze", "hazy", "fumes", "cigarette", "cigarettes", "chimney"],
    related: ["ash", "ashes", "soot"],
  },
  rain: {
    exact: ["rain", "rains", "raining"],
    strong: ["rainy", "drizzle", "downpour", "storm", "storming"],
    related: ["wet", "thunder", "cloud", "clouds"],
  },
  dust: {
    exact: ["dust", "dusts", "dusting"],
    strong: ["dusty", "sand", "powder", "grit"],
    related: ["dirt", "earth", "soil"],
  },
  firefly: {
    exact: ["firefly", "fireflies"],
    strong: ["glowworm", "glowworms", "bioluminescent"],
    related: ["glimmer", "glimmers", "flicker", "flickers"],
  },
});

const LOOKUP = new Map();
for (const family of LYRIC_RESONANCE_FAMILIES) {
  const neighborhood = LYRIC_RESONANCE_LEXICON[family];
  for (const tier of ["exact", "strong", "related"]) {
    for (const term of neighborhood[tier]) {
      LOOKUP.set(`${family}:${term}`, LYRIC_RESONANCE_WEIGHTS[tier]);
    }
  }
}

function tokensOf(value) {
  return String(value || "")
    .toLowerCase()
    .match(/[a-z0-9']+/g) || [];
}

function stableUnion(left, right) {
  const result = [...left];
  const seen = new Set(result);
  for (const value of right) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function cueEventForFamily({ family, cue, cueIndex, timebase, durationTicks }) {
  if (!Number.isFinite(cue?.start)) return null;
  const tokens = tokensOf(cue.text);
  const hits = [];
  for (const term of tokens) {
    const weight = LOOKUP.get(`${family}:${term}`);
    if (weight !== undefined) hits.push({ term, weight });
  }
  if (!hits.length) return null;

  const cueSeconds = Number(cue.start);
  const startTick = Math.max(
    0,
    Math.min(durationTicks, Math.round(cueSeconds * timebase)),
  );
  if (startTick >= durationTicks) return null;

  const strongest = Math.max(...hits.map((hit) => hit.weight));
  const intensity = Math.min(
    1,
    Math.round((strongest + Math.max(0, hits.length - 1) * 0.08) * 100) / 100,
  );
  const durationSeconds = 2.4 + intensity * 2.4;
  const endTick = Math.min(
    durationTicks,
    Math.max(
      startTick + 1,
      Math.round((cueSeconds + durationSeconds) * timebase),
    ),
  );
  if (endTick <= startTick) return null;

  return {
    family,
    startTick,
    endTick,
    intensity,
    cueIndices: [cueIndex],
    matchedTerms: stableUnion([], hits.map((hit) => hit.term)),
  };
}

function coalesceFamilyEvents(events, timebase) {
  const cooldownTicks = Math.round(LYRIC_RESONANCE_COOLDOWN_SECONDS * timebase);
  const merged = [];
  for (const event of events) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      event.family === previous.family &&
      event.startTick <= previous.endTick + cooldownTicks
    ) {
      previous.endTick = Math.max(previous.endTick, event.endTick);
      previous.intensity = Math.max(previous.intensity, event.intensity);
      previous.cueIndices = stableUnion(previous.cueIndices, event.cueIndices);
      previous.matchedTerms = stableUnion(previous.matchedTerms, event.matchedTerms);
      continue;
    }
    merged.push(structuredClone(event));
  }
  return merged;
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

  const byFamily = new Map(LYRIC_RESONANCE_FAMILIES.map((family) => [family, []]));
  for (const [cueIndex, cue] of track.cues.entries()) {
    for (const family of LYRIC_RESONANCE_FAMILIES) {
      const event = cueEventForFamily({
        family,
        cue,
        cueIndex,
        timebase,
        durationTicks,
      });
      if (event) byFamily.get(family).push(event);
    }
  }

  const familyOrder = new Map(
    LYRIC_RESONANCE_FAMILIES.map((family, index) => [family, index]),
  );
  const events = [...byFamily.entries()]
    .flatMap(([, familyEvents]) => coalesceFamilyEvents(familyEvents, timebase))
    .sort(
      (left, right) =>
        left.startTick - right.startTick ||
        familyOrder.get(left.family) - familyOrder.get(right.family),
    );

  if (!events.length) return null;
  return deepFreeze({
    schema: LYRIC_RESONANCE_SCHEMA,
    policy: LYRIC_RESONANCE_POLICY,
    sourceMode: String(track.mode || "timestamped"),
    events,
  });
}

module.exports = {
  LYRIC_RESONANCE_COOLDOWN_SECONDS,
  LYRIC_RESONANCE_FAMILIES,
  LYRIC_RESONANCE_LEXICON,
  LYRIC_RESONANCE_POLICY,
  LYRIC_RESONANCE_SCHEMA,
  LYRIC_RESONANCE_WEIGHTS,
  cueEventForFamily,
  resolveLyricResonance,
  tokensOf,
};
