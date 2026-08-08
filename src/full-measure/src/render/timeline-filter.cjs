const { resolveFieldEnvelope } = require("./field-envelope.cjs");

const SUPPORTED_TOPOLOGIES = new Set(["linear", "circle", "mirrored-ring"]);

const PRODUCTION_WAVE_SEAM = /\[waveAudio\]showwaves=s=(\d+)x(\d+):mode=cline:rate=([0-9.]+):[^;\n]+\[wave\];\n\[wave\]pad=(\d+):(\d+):0:(\d+):color=black@0\.0\[waveFull\]/;

function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function rendererValues(state) {
  const palette = state.palette || {};
  const material = state.material || {};
  const motion = state.motion || {};
  const camera = state.camera || {};

  return Object.freeze({
    hue: quantize((Number(palette.contrastBias) || 0) * 18 + ((Number(palette.bleed) || 0) - 0.5) * 12),
    saturation: quantize(0.94 + (Number(palette.bleed) || 0) * 0.22),
    contrast: quantize(1 + (Number(palette.contrastBias) || 0) * 0.12 + (Number(material.imperfection) || 0) * 0.05),
    brightness: quantize(((Number(motion.amplitude) || 0) - 0.5) * 0.035),
    gamma: quantize(1 + ((Number(camera.variance) || 0) - 0.5) * 0.08),
  });
}

function ffmpegNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError("Timeline renderer value must be finite.");
  return String(quantize(number));
}

function frozenTopology(execution) {
  const topology = execution?.timeline?.baseState?.topology;
  if (!SUPPORTED_TOPOLOGIES.has(topology)) {
    throw new TypeError(`Unsupported ResolvedTimeline topology: ${String(topology)}.`);
  }
  for (const segment of execution.segments || []) {
    if (segment.state?.topology !== topology) {
      throw new Error("ResolvedTimeline topology must remain frozen for production execution.");
    }
  }
  return topology;
}

function compileProductionTopology(graph, execution) {
  const topology = frozenTopology(execution);
  if (topology === "linear") return { graph, topology, fieldEnvelope: null };

  const match = graph.match(PRODUCTION_WAVE_SEAM);
  if (!match) {
    throw new Error("Production filter graph is missing the canonical wave topology seam.");
  }

  const width = Number(match[4]);
  const height = Number(match[5]);
  const fps = Number(match[3]);
  const baseState = execution.timeline.baseState;
  const motion = baseState.motion || {};
  const duration = Math.max(0.1, execution.durationTicks / execution.timebase);
  const opacity = quantize(clamp(0.38 + (Number(motion.amplitude) || 0) * 0.5, 0.2, 0.95), 3);
  const envelope = resolveFieldEnvelope(baseState, { width, height });
  const scopeWidth = envelope.envelope.width;
  const scopeHeight = envelope.envelope.height;
  const expansion = envelope.safeExpansion.pixels;
  const working = envelope.working;
  const zoom = quantize(1.25 + (Number(motion.amplitude) || 0) * 1.15, 3);
  const turns = topology === "mirrored-ring"
    ? 0.55 + (Number(motion.variance) || 0)
    : 0.25 + (Number(motion.variance) || 0) * 0.5;
  const radians = quantize(turns * 2 * Math.PI);
  const scopeFilter = `aformat=channel_layouts=stereo,avectorscope=s=${scopeWidth}x${scopeHeight}:mode=lissajous_xy:draw=line:scale=sqrt:zoom=${ffmpegNumber(zoom)}:rate=${ffmpegNumber(fps)},format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=${ffmpegNumber(opacity)}`;
  const finish = [
    `pad=${working.width}:${working.height}:${expansion}:${expansion}:color=black@0.0`,
    `rotate='${ffmpegNumber(radians)}*t/${ffmpegNumber(duration)}':ow=iw:oh=ih:c=black@0`,
    `pad=${working.stageWidth}:${working.stageHeight}:${working.stageX}:${working.stageY}:color=black@0.0`,
    `crop=${width}:${height}:${working.cropX}:${working.cropY}`,
  ].join(",");

  const replacement = topology === "mirrored-ring"
    ? [
        "[waveAudio]asplit=2[scoreScopeA][scoreScopeB]",
        `[scoreScopeA]${scopeFilter}[scoreRingA]`,
        `[scoreScopeB]${scopeFilter},hflip[scoreRingB]`,
        `[scoreRingA][scoreRingB]blend=all_mode=screen,${finish}[waveFull]`,
      ].join(";\n")
    : `[waveAudio]${scopeFilter},${finish}[waveFull]`;

  return {
    graph: graph.replace(PRODUCTION_WAVE_SEAM, replacement),
    topology,
    fieldEnvelope: envelope,
  };
}

function compileTimelineFilterGraph(graph, execution) {
  if (!execution || !Array.isArray(execution.segments)) {
    throw new TypeError("Timeline execution adapter is required for production compilation.");
  }

  const topologyCompiled = compileProductionTopology(graph, execution);
  const marker = "[stage0]ass=";
  const markerIndex = topologyCompiled.graph.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error("Production filter graph is missing the stage0 subtitle seam.");
  }

  const prefix = topologyCompiled.graph.slice(0, markerIndex);
  const suffix = topologyCompiled.graph.slice(markerIndex).replace(/^\[stage0\]/, "[timelineFinal]");
  const filters = [];
  let input = "stage0";

  execution.segments.forEach((segment, index) => {
    if (segment.endSeconds <= segment.startSeconds) return;
    const values = rendererValues(segment.state);
    const output = `timeline${index + 1}`;
    const enable = `between(t,${ffmpegNumber(segment.startSeconds)},${ffmpegNumber(segment.endSeconds)})`;
    filters.push(
      `[${input}]hue=h=${ffmpegNumber(values.hue)}:s=${ffmpegNumber(values.saturation)}:enable='${enable}',eq=contrast=${ffmpegNumber(values.contrast)}:brightness=${ffmpegNumber(values.brightness)}:gamma=${ffmpegNumber(values.gamma)}:enable='${enable}'[${output}]`,
    );
    input = output;
  });

  if (!filters.length) {
    filters.push("[stage0]null[timelineFinal]");
  } else {
    filters.push(`[${input}]null[timelineFinal]`);
  }

  return {
    graph: `${prefix}${filters.join(";\n")};\n${suffix}`,
    topology: topologyCompiled.topology,
    fieldEnvelope: topologyCompiled.fieldEnvelope,
    segments: execution.segments.map((segment) => ({
      startTick: segment.startTick,
      endTick: segment.endTick,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      state: segment.state,
      renderer: rendererValues(segment.state),
    })),
  };
}

module.exports = {
  compileProductionTopology,
  compileTimelineFilterGraph,
  rendererValues,
};
