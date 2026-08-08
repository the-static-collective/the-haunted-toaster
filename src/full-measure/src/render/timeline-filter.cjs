const {
  LEGACY_RENDERER_POLICY,
  VISUAL_LANGUAGE_RENDERER_POLICY,
} = require("../generation/renderer-policy.cjs");
const { compileProductionTopology } = require("./topology-compilers.cjs");
const { compileVisualLanguageOperators } = require("./visual-language.cjs");

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

function rendererPolicyForTimeline(timeline) {
  if (!timeline?.rendererPolicy) return LEGACY_RENDERER_POLICY;
  if (timeline.rendererPolicy !== VISUAL_LANGUAGE_RENDERER_POLICY) {
    throw new TypeError(`Unsupported ResolvedTimeline renderer policy: ${String(timeline.rendererPolicy)}.`);
  }
  return timeline.rendererPolicy;
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
  const rendererPolicy = rendererPolicyForTimeline(execution.timeline);
  let input = "stage0";
  let operators = Object.freeze([]);

  if (rendererPolicy === VISUAL_LANGUAGE_RENDERER_POLICY) {
    const visualLanguage = compileVisualLanguageOperators(
      input,
      execution.timeline.baseState,
      topologyCompiled.geometry,
    );
    filters.push(...visualLanguage.lines);
    input = visualLanguage.output;
    operators = visualLanguage.operators;
  }

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

  filters.push(`[${input}]null[timelineFinal]`);

  return {
    graph: `${prefix}${filters.join(";\n")};\n${suffix}`,
    rendererPolicy,
    topology: topologyCompiled.topology,
    topologyCompiler: topologyCompiled.topologyCompiler,
    fieldEnvelope: topologyCompiled.fieldEnvelope,
    geometry: topologyCompiled.geometry,
    operators,
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
  rendererPolicyForTimeline,
  rendererValues,
};