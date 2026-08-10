const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const primitiveGeneration = require("./primitive-field-generation.cjs");
const { resolveLyricResonance } = require("./lyric-resonance.cjs");

function attachLyricResonance(timeline, lyricTrack = null) {
  const lyricResonance = resolveLyricResonance(lyricTrack, {
    timebase: timeline.timebase,
    durationTicks: timeline.durationTicks,
  });
  if (!lyricResonance) return timeline;

  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    ...baseBody
  } = timeline;
  const body = {
    ...structuredClone(baseBody),
    lyricResonance,
  };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

function resolve(
  analysisInput,
  scoreInput,
  constraintsInput,
  profileInput,
  lyricTrack = null,
) {
  return attachLyricResonance(
    primitiveGeneration.resolve(
      analysisInput,
      scoreInput,
      constraintsInput,
      profileInput,
    ),
    lyricTrack,
  );
}

module.exports = {
  attachLyricResonance,
  resolve,
};
