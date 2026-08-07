function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
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

function compileTimelineFilterGraph(graph, execution) {
  if (!execution || !Array.isArray(execution.segments)) {
    throw new TypeError("Timeline execution adapter is required for production compilation.");
  }

  const marker = "[stage0]ass=";
  const markerIndex = graph.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error("Production filter graph is missing the stage0 subtitle seam.");
  }

  const prefix = graph.slice(0, markerIndex);
  const suffix = graph.slice(markerIndex).replace(/^\[stage0\]/, "[timelineFinal]");
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
  compileTimelineFilterGraph,
  rendererValues,
};