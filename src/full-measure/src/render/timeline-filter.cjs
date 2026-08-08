const { resolveFieldEnvelope } = require("./field-envelope.cjs");

const SUPPORTED_TOPOLOGIES = new Set(["linear", "circle", "mirrored-ring"]);
const SUPPORTED_MOTION_GRAMMARS = new Set(["still", "drift", "pulse", "orbit", "fracture"]);
const SUPPORTED_PALETTE_LOGICS = new Set(["garment", "analogous", "split-complement", "duotone"]);
const SUPPORTED_MATERIAL_TEXTURES = new Set(["clean", "grain", "photocopy", "gate-weave"]);
const SUPPORTED_CAMERA_GRAMMARS = new Set(["locked", "drift", "push", "orbit"]);

const PRODUCTION_WAVE_SEAM = /\[waveAudio\]showwaves=s=(\d+)x(\d+):mode=cline:rate=([0-9.]+):[^;\n]+\[wave\];\n\[wave\]pad=(\d+):(\d+):0:(\d+):color=black@0\.0\[waveFull\]/;

function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function evenDimension(value) {
  return Math.max(2, Math.ceil(Number(value) / 2) * 2);
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

function productionFrameGeometry(graph) {
  const match = graph.match(PRODUCTION_WAVE_SEAM);
  if (!match) {
    throw new Error("Production filter graph is missing the canonical wave topology seam.");
  }
  return Object.freeze({
    waveWidth: Number(match[1]),
    waveHeight: Number(match[2]),
    fps: Number(match[3]),
    width: Number(match[4]),
    height: Number(match[5]),
    waveY: Number(match[6]),
  });
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

function frozenSemanticGrammar(execution) {
  const baseState = execution?.timeline?.baseState || {};
  const grammar = Object.freeze({
    motion: baseState.motion?.grammar,
    palette: baseState.palette?.logic,
    material: baseState.material?.texture,
    camera: baseState.camera?.grammar,
  });

  if (!SUPPORTED_MOTION_GRAMMARS.has(grammar.motion)) {
    throw new TypeError(`Unsupported motion grammar: ${String(grammar.motion)}.`);
  }
  if (!SUPPORTED_PALETTE_LOGICS.has(grammar.palette)) {
    throw new TypeError(`Unsupported palette logic: ${String(grammar.palette)}.`);
  }
  if (!SUPPORTED_MATERIAL_TEXTURES.has(grammar.material)) {
    throw new TypeError(`Unsupported material texture: ${String(grammar.material)}.`);
  }
  if (!SUPPORTED_CAMERA_GRAMMARS.has(grammar.camera)) {
    throw new TypeError(`Unsupported camera grammar: ${String(grammar.camera)}.`);
  }

  for (const segment of execution.segments || []) {
    const state = segment.state || {};
    if (
      state.motion?.grammar !== grammar.motion ||
      state.palette?.logic !== grammar.palette ||
      state.material?.texture !== grammar.material ||
      state.camera?.grammar !== grammar.camera
    ) {
      throw new Error("ResolvedTimeline categorical renderer semantics must remain frozen for production execution.");
    }
  }

  return grammar;
}

function geometryFilter(width, height, scale, x, y) {
  const scaledWidth = evenDimension(width * scale);
  const scaledHeight = evenDimension(height * scale);
  return `scale=${scaledWidth}:${scaledHeight},crop=${width}:${height}:x='${x}':y='${y}'`;
}

function motionGrammarFilters(grammar, geometry) {
  const { width, height } = geometry;
  if (grammar === "still") return [];
  if (grammar === "drift") {
    return [
      geometryFilter(
        width,
        height,
        1.045,
        "(iw-ow)/2+sin(t*0.73)*(iw-ow)*0.34",
        "(ih-oh)/2+cos(t*0.51)*(ih-oh)*0.34",
      ),
    ];
  }
  if (grammar === "pulse") {
    return [
      `scale=w='${width}*(1.035+0.018*sin(t*2.1))':h='${height}*(1.035+0.018*sin(t*2.1))':eval=frame,crop=${width}:${height}:x='(iw-ow)/2':y='(ih-oh)/2'`,
    ];
  }
  if (grammar === "orbit") {
    return [
      geometryFilter(
        width,
        height,
        1.08,
        "(iw-ow)/2+sin(t*0.57)*(iw-ow)*0.43",
        "(ih-oh)/2+cos(t*0.57)*(ih-oh)*0.43",
      ),
    ];
  }
  return [
    geometryFilter(
      width,
      height,
      1.095,
      "(iw-ow)/2+sin(t*6.2)*(iw-ow)*0.22+sin(t*13.7)*(iw-ow)*0.12",
      "(ih-oh)/2+cos(t*5.1)*(ih-oh)*0.2+sin(t*11.3)*(ih-oh)*0.13",
    ),
  ];
}

function cameraGrammarFilters(grammar, geometry, duration) {
  const { width, height } = geometry;
  if (grammar === "locked") return [];
  if (grammar === "drift") {
    return [
      geometryFilter(
        width,
        height,
        1.03,
        "(iw-ow)/2+sin(t*0.19)*(iw-ow)*0.38",
        "(ih-oh)/2+cos(t*0.16)*(ih-oh)*0.38",
      ),
    ];
  }
  if (grammar === "push") {
    const safeDuration = Math.max(0.1, Number(duration) || 0.1);
    return [
      `scale=w='${width}*(1.015+0.07*min(t/${ffmpegNumber(safeDuration)},1))':h='${height}*(1.015+0.07*min(t/${ffmpegNumber(safeDuration)},1))':eval=frame,crop=${width}:${height}:x='(iw-ow)/2':y='(ih-oh)/2'`,
    ];
  }
  return [
    geometryFilter(
      width,
      height,
      1.06,
      "(iw-ow)/2+sin(t*0.24)*(iw-ow)*0.46",
      "(ih-oh)/2+cos(t*0.24)*(ih-oh)*0.46",
    ),
  ];
}

function paletteGrammarFilters(logic) {
  if (logic === "garment") return [];
  if (logic === "analogous") {
    return ["hue=h=8:s=1.08"];
  }
  if (logic === "split-complement") {
    return ["hue=h=-18:s=1.28", "eq=contrast=1.12"];
  }
  return ["hue=s=0.28", "eq=contrast=1.2:gamma=0.94"];
}

function materialGrammarFilters(texture, state, geometry) {
  const imperfection = clamp(Number(state?.material?.imperfection) || 0, 0, 1);
  if (texture === "clean") return [];
  if (texture === "grain") {
    return [`noise=alls=${Math.round(4 + imperfection * 12)}:allf=t+u`];
  }
  if (texture === "photocopy") {
    const contrast = quantize(1.28 + imperfection * 0.28, 3);
    return [
      "hue=s=0.18",
      `eq=contrast=${ffmpegNumber(contrast)}:brightness=-0.035:gamma=0.92`,
      "unsharp=5:5:0.8:3:3:0.2",
    ];
  }
  const travel = quantize(1 + imperfection * 3, 3);
  const cropWidth = Math.max(2, geometry.width - 8);
  const cropHeight = Math.max(2, geometry.height - 8);
  return [
    `noise=alls=${Math.round(6 + imperfection * 10)}:allf=t+u`,
    `crop=${cropWidth}:${cropHeight}:x='4+sin(t*8.1)*${ffmpegNumber(travel)}':y='4+cos(t*6.7)*${ffmpegNumber(travel)}',scale=${geometry.width}:${geometry.height}`,
  ];
}

function semanticGrammarFilters(execution, geometry) {
  const grammar = frozenSemanticGrammar(execution);
  const duration = Math.max(0.1, execution.durationTicks / execution.timebase);
  const state = execution.timeline.baseState;
  const filters = [
    ...motionGrammarFilters(grammar.motion, geometry),
    ...cameraGrammarFilters(grammar.camera, geometry, duration),
    ...paletteGrammarFilters(grammar.palette),
    ...materialGrammarFilters(grammar.material, state, geometry),
  ];
  return Object.freeze({
    ...grammar,
    filters: Object.freeze(filters),
  });
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

  const geometry = productionFrameGeometry(graph);
  const topologyCompiled = compileProductionTopology(graph, execution);
  const marker = "[stage0]ass=";
  const markerIndex = topologyCompiled.graph.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error("Production filter graph is missing the stage0 subtitle seam.");
  }

  const prefix = topologyCompiled.graph.slice(0, markerIndex);
  const suffix = topologyCompiled.graph.slice(markerIndex).replace(/^\[stage0\]/, "[timelineFinal]");
  const semanticGrammar = semanticGrammarFilters(execution, geometry);
  const filters = [];
  let input = "stage0";

  if (semanticGrammar.filters.length) {
    filters.push(`[stage0]${semanticGrammar.filters.join(",")}[semanticStage]`);
    input = "semanticStage";
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

  if (!filters.length) {
    filters.push("[stage0]null[timelineFinal]");
  } else {
    filters.push(`[${input}]null[timelineFinal]`);
  }

  return {
    graph: `${prefix}${filters.join(";\n")};\n${suffix}`,
    topology: topologyCompiled.topology,
    fieldEnvelope: topologyCompiled.fieldEnvelope,
    semanticGrammar,
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
  frozenSemanticGrammar,
  rendererValues,
  semanticGrammarFilters,
};
