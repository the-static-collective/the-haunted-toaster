const { TIMELINE_SCHEMA, validateRendererProfile } = require("./schema.cjs");

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function buildTopologyFilterGraph(
  timeline,
  profileInput,
  {
    audioLabel = "waveAudio",
    outputLabel = "visualScoreWave",
  } = {},
) {
  if (!timeline || timeline.schema !== TIMELINE_SCHEMA) {
    throw new TypeError(`Expected ${TIMELINE_SCHEMA}.`);
  }
  const profileResult = validateRendererProfile(profileInput);
  if (!profileResult.ok) {
    throw new TypeError(profileResult.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  const profile = profileResult.value;
  const { width, height, fps } = profile.canvas;
  const topology = timeline.baseState.topology;
  const motion = timeline.baseState.motion;
  const duration = Math.max(0.1, timeline.durationTicks / timeline.timebase);
  const opacity = Math.round(clamp(0.38 + motion.amplitude * 0.5, 0.2, 0.95) * 1000) / 1000;

  if (topology === "linear") {
    const waveHeight = Math.max(96, Math.round(height * (0.2 + motion.variance * 0.08)));
    const waveY = Math.max(0, height - waveHeight - Math.round(height * 0.07));
    return {
      topology,
      outputLabel,
      filters: [
        `[${audioLabel}]showwaves=s=${width}x${waveHeight}:mode=cline:rate=${fps}:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=${opacity},pad=${width}:${height}:0:${waveY}:color=black@0.0[${outputLabel}]`,
      ],
    };
  }

  const scope = Math.max(64, Math.round(Math.min(width, height) * 0.82));
  const x = Math.floor((width - scope) / 2);
  const y = Math.floor((height - scope) / 2);
  const zoom = Math.round((1.25 + motion.amplitude * 1.15) * 1000) / 1000;
  const turns = topology === "mirrored-ring" ? 0.55 + motion.variance : 0.25 + motion.variance * 0.5;
  const radians = Math.round(turns * 2 * Math.PI * 1_000_000) / 1_000_000;
  const scopeFilter = `aformat=channel_layouts=stereo,avectorscope=s=${scope}x${scope}:mode=lissajous_xy:draw=line:scale=sqrt:zoom=${zoom}:rate=${fps},format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=${opacity}`;
  const finish = `rotate='${radians}*t/${duration}':ow=iw:oh=ih:c=black@0,pad=${width}:${height}:${x}:${y}:color=black@0.0`;

  if (topology === "mirrored-ring") {
    return {
      topology,
      outputLabel,
      filters: [
        `[${audioLabel}]asplit=2[scoreScopeA][scoreScopeB]`,
        `[scoreScopeA]${scopeFilter}[scoreRingA]`,
        `[scoreScopeB]${scopeFilter},hflip[scoreRingB]`,
        `[scoreRingA][scoreRingB]blend=all_mode=screen,${finish}[${outputLabel}]`,
      ],
    };
  }

  return {
    topology,
    outputLabel,
    filters: [`[${audioLabel}]${scopeFilter},${finish}[${outputLabel}]`],
  };
}

module.exports = {
  buildTopologyFilterGraph,
};
