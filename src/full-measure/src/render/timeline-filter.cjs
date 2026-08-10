const {
  EXPRESSIVE_TOPOLOGY_COMPILERS,
  PRODUCTION_WAVE_SEAM,
  TOPOLOGY_COMPILERS,
  compileProductionTopology,
  frozenTopology,
} = require("./topology-compilers.cjs");
const {
  EXPRESSIVE_RENDERER_POLICY,
  LEGACY_RENDERER_POLICY,
  VISUAL_LANGUAGE_RENDERER_POLICY,
} = require("../generation/renderer-policy.cjs");
const { COLOR_DRIFT_POLICY, driftAtTick } = require("../generation/color-drift.cjs");
const { cameraSurrender } = require("./response-shaping.cjs");

const SEMANTIC_COMPILER_REGISTRIES = Object.freeze({
  motion: Object.freeze({
    still: "motion-still-v1",
    drift: "motion-drift-v1",
    pulse: "motion-pulse-v1",
    orbit: "motion-orbit-v1",
    fracture: "motion-fracture-v1",
  }),
  palette: Object.freeze({
    garment: "palette-garment-v1",
    analogous: "palette-analogous-v1",
    "split-complement": "palette-split-complement-v1",
    duotone: "palette-duotone-v1",
  }),
  material: Object.freeze({
    clean: "material-clean-v1",
    grain: "material-grain-v1",
    photocopy: "material-photocopy-v1",
    "gate-weave": "material-gate-weave-v1",
  }),
  camera: Object.freeze({
    locked: "camera-locked-v1",
    drift: "camera-drift-v1",
    push: "camera-push-v1",
    orbit: "camera-orbit-v1",
  }),
});

const EXPRESSIVE_SEMANTIC_COMPILER_REGISTRIES = Object.freeze({
  motion: SEMANTIC_COMPILER_REGISTRIES.motion,
  palette: SEMANTIC_COMPILER_REGISTRIES.palette,
  material: SEMANTIC_COMPILER_REGISTRIES.material,
  camera: Object.freeze({
    locked: "camera-locked-v1",
    drift: "camera-drift-v2",
    push: "camera-push-v2",
    orbit: "camera-orbit-v2",
  }),
});

const SUPPORTED_MOTION_GRAMMARS = new Set(Object.keys(SEMANTIC_COMPILER_REGISTRIES.motion));
const SUPPORTED_PALETTE_LOGICS = new Set(Object.keys(SEMANTIC_COMPILER_REGISTRIES.palette));
const SUPPORTED_MATERIAL_TEXTURES = new Set(Object.keys(SEMANTIC_COMPILER_REGISTRIES.material));
const SUPPORTED_CAMERA_GRAMMARS = new Set(Object.keys(SEMANTIC_COMPILER_REGISTRIES.camera));

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

function rendererValues(state, drift = null) {
  const palette = state.palette || {};
  const material = state.material || {};
  const motion = state.motion || {};
  const camera = state.camera || {};
  const hueOffset = Number(drift?.hueOffset) || 0;
  const saturationMultiplier = Number(drift?.saturationMultiplier) || 1;

  return Object.freeze({
    hue: quantize((Number(palette.contrastBias) || 0) * 18 + ((Number(palette.bleed) || 0) - 0.5) * 12 + hueOffset),
    saturation: quantize((0.94 + (Number(palette.bleed) || 0) * 0.22) * saturationMultiplier),
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

function rendererPolicyForTimeline(timeline) {
  if (!timeline?.rendererPolicy) return LEGACY_RENDERER_POLICY;
  if (
    timeline.rendererPolicy !== VISUAL_LANGUAGE_RENDERER_POLICY &&
    timeline.rendererPolicy !== EXPRESSIVE_RENDERER_POLICY
  ) {
    throw new TypeError(`Unsupported ResolvedTimeline renderer policy: ${String(timeline.rendererPolicy)}.`);
  }
  return timeline.rendererPolicy;
}

function grammarForState(state = {}) {
  const grammar = Object.freeze({
    motion: state.motion?.grammar,
    palette: state.palette?.logic,
    material: state.material?.texture,
    camera: state.camera?.grammar,
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
  return grammar;
}

function frozenSemanticGrammar(execution) {
  const grammar = grammarForState(execution?.timeline?.baseState || {});
  for (const segment of execution.segments || []) {
    const candidate = grammarForState(segment.state || {});
    if (
      candidate.motion !== grammar.motion ||
      candidate.palette !== grammar.palette ||
      candidate.material !== grammar.material ||
      candidate.camera !== grammar.camera
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
    return [geometryFilter(width, height, 1.045, "(iw-ow)/2+sin(t*0.73)*(iw-ow)*0.34", "(ih-oh)/2+cos(t*0.51)*(ih-oh)*0.34")];
  }
  if (grammar === "pulse") {
    return [`scale=w='${width}*(1.035+0.018*sin(t*2.1))':h='${height}*(1.035+0.018*sin(t*2.1))':eval=frame,crop=${width}:${height}:x='(iw-ow)/2':y='(ih-oh)/2'`];
  }
  if (grammar === "orbit") {
    return [geometryFilter(width, height, 1.08, "(iw-ow)/2+sin(t*0.57)*(iw-ow)*0.43", "(ih-oh)/2+cos(t*0.57)*(ih-oh)*0.43")];
  }
  return [geometryFilter(width, height, 1.095, "(iw-ow)/2+sin(t*6.2)*(iw-ow)*0.22+sin(t*13.7)*(iw-ow)*0.12", "(ih-oh)/2+cos(t*5.1)*(ih-oh)*0.2+sin(t*11.3)*(ih-oh)*0.13")];
}

function cameraGrammarFilters(grammar, geometry, duration, state, rendererPolicy) {
  const { width, height } = geometry;
  if (grammar === "locked") return [];

  if (rendererPolicy !== EXPRESSIVE_RENDERER_POLICY) {
    if (grammar === "drift") {
      return [geometryFilter(width, height, 1.03, "(iw-ow)/2+sin(t*0.19)*(iw-ow)*0.38", "(ih-oh)/2+cos(t*0.16)*(ih-oh)*0.38")];
    }
    if (grammar === "push") {
      const safeDuration = Math.max(0.1, Number(duration) || 0.1);
      return [`scale=w='${width}*(1.015+0.07*min(t/${ffmpegNumber(safeDuration)},1))':h='${height}*(1.015+0.07*min(t/${ffmpegNumber(safeDuration)},1))':eval=frame,crop=${width}:${height}:x='(iw-ow)/2':y='(ih-oh)/2'`];
    }
    return [geometryFilter(width, height, 1.06, "(iw-ow)/2+sin(t*0.24)*(iw-ow)*0.46", "(ih-oh)/2+cos(t*0.24)*(ih-oh)*0.46")];
  }

  const intensity = cameraSurrender(state?.camera?.variance);
  if (grammar === "drift") {
    const scale = quantize(1 + 0.03 * intensity, 4);
    const travel = ffmpegNumber(quantize(0.38 * intensity, 4));
    return [geometryFilter(width, height, scale, `(iw-ow)/2+sin(t*0.19)*(iw-ow)*${travel}`, `(ih-oh)/2+cos(t*0.16)*(ih-oh)*${travel}`)];
  }
  if (grammar === "push") {
    const safeDuration = Math.max(0.1, Number(duration) || 0.1);
    const base = ffmpegNumber(quantize(1 + 0.015 * intensity, 4));
    const growth = ffmpegNumber(quantize(0.07 * intensity, 4));
    return [`scale=w='${width}*(${base}+${growth}*min(t/${ffmpegNumber(safeDuration)},1))':h='${height}*(${base}+${growth}*min(t/${ffmpegNumber(safeDuration)},1))':eval=frame,crop=${width}:${height}:x='(iw-ow)/2':y='(ih-oh)/2'`];
  }
  const scale = quantize(1 + 0.06 * intensity, 4);
  const travel = ffmpegNumber(quantize(0.46 * intensity, 4));
  return [geometryFilter(width, height, scale, `(iw-ow)/2+sin(t*0.24)*(iw-ow)*${travel}`, `(ih-oh)/2+cos(t*0.24)*(ih-oh)*${travel}`)];
}

function paletteGrammarFilters(logic) {
  if (logic === "garment") return [];
  if (logic === "analogous") return ["hue=h=8:s=1.08"];
  if (logic === "split-complement") return ["hue=h=-18:s=1.28", "eq=contrast=1.12"];
  return ["hue=s=0.28", "eq=contrast=1.2:gamma=0.94"];
}

function materialGrammarFilters(texture, state, geometry) {
  const imperfection = clamp(Number(state?.material?.imperfection) || 0, 0, 1);
  if (texture === "clean") return [];
  if (texture === "grain") return [`noise=alls=${Math.round(4 + imperfection * 12)}:allf=t+u`];
  if (texture === "photocopy") {
    const contrast = quantize(1.28 + imperfection * 0.28, 3);
    return ["hue=s=0.18", `eq=contrast=${ffmpegNumber(contrast)}:brightness=-0.035:gamma=0.92`, "unsharp=5:5:0.8:3:3:0.2"];
  }
  const travel = quantize(1 + imperfection * 3, 3);
  const cropWidth = Math.max(2, geometry.width - 8);
  const cropHeight = Math.max(2, geometry.height - 8);
  return [
    `noise=alls=${Math.round(6 + imperfection * 10)}:allf=t+u`,
    `crop=${cropWidth}:${cropHeight}:x='4+sin(t*8.1)*${ffmpegNumber(travel)}':y='4+cos(t*6.7)*${ffmpegNumber(travel)}',scale=${geometry.width}:${geometry.height}`,
  ];
}

function semanticProgramForState(state, geometry, duration, rendererPolicy = LEGACY_RENDERER_POLICY) {
  const grammar = grammarForState(state);
  const registry = rendererPolicy === EXPRESSIVE_RENDERER_POLICY
    ? EXPRESSIVE_SEMANTIC_COMPILER_REGISTRIES
    : SEMANTIC_COMPILER_REGISTRIES;
  const filters = [
    ...motionGrammarFilters(grammar.motion, geometry),
    ...cameraGrammarFilters(grammar.camera, geometry, duration, state, rendererPolicy),
    ...paletteGrammarFilters(grammar.palette),
    ...materialGrammarFilters(grammar.material, state, geometry),
  ];
  const compilers = Object.freeze({
    motion: registry.motion[grammar.motion],
    palette: registry.palette[grammar.palette],
    material: registry.material[grammar.material],
    camera: registry.camera[grammar.camera],
  });
  const operators = Object.freeze([
    Object.freeze({ axis: "motion", value: grammar.motion, compiler: compilers.motion }),
    Object.freeze({ axis: "material", value: grammar.material, compiler: compilers.material }),
    Object.freeze({ axis: "camera", value: grammar.camera, compiler: compilers.camera }),
    Object.freeze({ axis: "palette", value: grammar.palette, compiler: compilers.palette }),
  ]);
  return Object.freeze({ ...grammar, filters: Object.freeze(filters), compilers, operators });
}

function semanticGrammarFilters(execution, geometry) {
  frozenSemanticGrammar(execution);
  const duration = Math.max(0.1, execution.durationTicks / execution.timebase);
  const rendererPolicy = rendererPolicyForTimeline(execution.timeline);
  return semanticProgramForState(execution.timeline.baseState, geometry, duration, rendererPolicy);
}

function numericFilters(state, drift = null) {
  const values = rendererValues(state, drift);
  return Object.freeze({
    values,
    filters: Object.freeze([
      `hue=h=${ffmpegNumber(values.hue)}:s=${ffmpegNumber(values.saturation)}`,
      `eq=contrast=${ffmpegNumber(values.contrast)}:brightness=${ffmpegNumber(values.brightness)}:gamma=${ffmpegNumber(values.gamma)}`,
    ]),
  });
}

function colorDriftOperator(timeline) {
  const drift = timeline?.colorDrift;
  if (!drift?.stops?.length) return null;
  return Object.freeze({
    axis: "colorDrift",
    compiler: COLOR_DRIFT_POLICY,
    planSha256: drift.planSha256,
    stopCount: drift.stopCount,
  });
}

function possessionArcCompilation(execution, geometry) {
  const arc = execution.timeline.possessionArc;
  if (!arc?.transitions?.length) return null;
  const segments = execution.segments.filter(
    (segment) => segment.endSeconds > segment.startSeconds,
  );
  if (!segments.length) return null;
  const rendererPolicy = rendererPolicyForTimeline(execution.timeline);

  const filters = [];
  const inputs = [];
  if (segments.length === 1) {
    inputs.push("stage0");
  } else {
    const splitOutputs = segments.map((_, index) => `[arcInput${index}]`).join("");
    filters.push(`[stage0]split=${segments.length}${splitOutputs}`);
    segments.forEach((_, index) => inputs.push(`arcInput${index}`));
  }

  const programs = [];
  segments.forEach((segment, index) => {
    const duration = Math.max(0.1, segment.endSeconds - segment.startSeconds);
    const semantic = semanticProgramForState(segment.state, geometry, duration, rendererPolicy);
    const drift = driftAtTick(execution.timeline, segment.startTick);
    const numeric = numericFilters(segment.state, drift);
    const output = `arcSegment${index}`;
    const chain = [
      `trim=start=${ffmpegNumber(segment.startSeconds)}:end=${ffmpegNumber(segment.endSeconds)}`,
      "setpts=PTS-STARTPTS",
      ...semantic.filters,
      ...numeric.filters,
    ];
    filters.push(`[${inputs[index]}]${chain.join(",")}[${output}]`);
    programs.push(Object.freeze({
      startTick: segment.startTick,
      endTick: segment.endTick,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      state: segment.state,
      colorDrift: drift,
      renderer: numeric.values,
      semanticGrammar: semantic,
    }));
  });

  if (segments.length === 1) {
    filters.push("[arcSegment0]null[timelineFinal]");
  } else {
    const outputs = segments.map((_, index) => `[arcSegment${index}]`).join("");
    filters.push(`${outputs}concat=n=${segments.length}:v=1:a=0[timelineFinal]`);
  }

  const arcOperator = Object.freeze({
    axis: "possessionArc",
    compiler: arc.policyVersion,
    planSha256: arc.planSha256,
    transitionCount: arc.transitionCount,
    affectedAxes: Object.freeze([...(arc.affectedAxes || [])]),
    transitionPolicy: arc.transitionPolicy,
  });
  const driftOperator = colorDriftOperator(execution.timeline);
  const operators = Object.freeze([
    arcOperator,
    ...(driftOperator ? [driftOperator] : []),
    ...programs.flatMap((program) =>
      program.semanticGrammar.operators.map((operator) => Object.freeze({
        ...operator,
        startTick: program.startTick,
        endTick: program.endTick,
      })),
    ),
  ]);
  const semanticGrammar = Object.freeze({
    mode: arc.policyVersion,
    planSha256: arc.planSha256,
    transitionCount: arc.transitionCount,
    affectedAxes: Object.freeze([...(arc.affectedAxes || [])]),
    ...(driftOperator ? {
      colorDrift: Object.freeze({
        policyVersion: execution.timeline.colorDrift.policyVersion,
        planSha256: execution.timeline.colorDrift.planSha256,
        stopCount: execution.timeline.colorDrift.stopCount,
      }),
    } : {}),
    segments: Object.freeze(programs.map((program) => Object.freeze({
      startTick: program.startTick,
      endTick: program.endTick,
      motion: program.semanticGrammar.motion,
      palette: program.semanticGrammar.palette,
      material: program.semanticGrammar.material,
      camera: program.semanticGrammar.camera,
      colorDrift: program.colorDrift,
      compilers: program.semanticGrammar.compilers,
    }))),
  });

  return Object.freeze({
    filters: Object.freeze(filters),
    operators,
    programs: Object.freeze(programs),
    semanticGrammar,
  });
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
  const arcCompilation = possessionArcCompilation(execution, geometry);

  if (arcCompilation) {
    return {
      graph: `${prefix}${arcCompilation.filters.join(";\n")};\n${suffix}`,
      rendererPolicy: rendererPolicyForTimeline(execution.timeline),
      topology: topologyCompiled.topology,
      topologyCompiler: topologyCompiled.topologyCompiler,
      fieldEnvelope: topologyCompiled.fieldEnvelope,
      geometry: topologyCompiled.geometry || geometry,
      semanticGrammar: arcCompilation.semanticGrammar,
      operators: arcCompilation.operators,
      segments: arcCompilation.programs.map((program) => ({
        startTick: program.startTick,
        endTick: program.endTick,
        startSeconds: program.startSeconds,
        endSeconds: program.endSeconds,
        state: program.state,
        colorDrift: program.colorDrift,
        renderer: program.renderer,
        semanticGrammar: {
          motion: program.semanticGrammar.motion,
          palette: program.semanticGrammar.palette,
          material: program.semanticGrammar.material,
          camera: program.semanticGrammar.camera,
        },
      })),
    };
  }

  const semanticGrammar = semanticGrammarFilters(execution, geometry);
  const filters = [];
  let input = "stage0";

  if (semanticGrammar.filters.length) {
    filters.push(`[stage0]${semanticGrammar.filters.join(",")}[semanticStage]`);
    input = "semanticStage";
  }

  execution.segments.forEach((segment, index) => {
    if (segment.endSeconds <= segment.startSeconds) return;
    const drift = driftAtTick(execution.timeline, segment.startTick);
    const values = rendererValues(segment.state, drift);
    const output = `timeline${index + 1}`;
    const enable = `between(t,${ffmpegNumber(segment.startSeconds)},${ffmpegNumber(segment.endSeconds)})`;
    filters.push(`[${input}]hue=h=${ffmpegNumber(values.hue)}:s=${ffmpegNumber(values.saturation)}:enable='${enable}',eq=contrast=${ffmpegNumber(values.contrast)}:brightness=${ffmpegNumber(values.brightness)}:gamma=${ffmpegNumber(values.gamma)}:enable='${enable}'[${output}]`);
    input = output;
  });

  if (!filters.length) filters.push("[stage0]null[timelineFinal]");
  else filters.push(`[${input}]null[timelineFinal]`);

  const driftOperator = colorDriftOperator(execution.timeline);
  return {
    graph: `${prefix}${filters.join(";\n")};\n${suffix}`,
    rendererPolicy: rendererPolicyForTimeline(execution.timeline),
    topology: topologyCompiled.topology,
    topologyCompiler: topologyCompiled.topologyCompiler,
    fieldEnvelope: topologyCompiled.fieldEnvelope,
    geometry: topologyCompiled.geometry || geometry,
    semanticGrammar: driftOperator ? Object.freeze({
      ...semanticGrammar,
      colorDrift: Object.freeze({
        policyVersion: execution.timeline.colorDrift.policyVersion,
        planSha256: execution.timeline.colorDrift.planSha256,
        stopCount: execution.timeline.colorDrift.stopCount,
      }),
    }) : semanticGrammar,
    operators: Object.freeze([
      ...(driftOperator ? [driftOperator] : []),
      ...semanticGrammar.operators,
    ]),
    segments: execution.segments.map((segment) => {
      const drift = driftAtTick(execution.timeline, segment.startTick);
      return {
        startTick: segment.startTick,
        endTick: segment.endTick,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        state: segment.state,
        colorDrift: drift,
        renderer: rendererValues(segment.state, drift),
      };
    }),
  };
}

module.exports = {
  EXPRESSIVE_SEMANTIC_COMPILER_REGISTRIES,
  EXPRESSIVE_TOPOLOGY_COMPILERS,
  SEMANTIC_COMPILER_REGISTRIES,
  TOPOLOGY_COMPILERS,
  compileProductionTopology,
  compileTimelineFilterGraph,
  frozenSemanticGrammar,
  frozenTopology,
  grammarForState,
  possessionArcCompilation,
  rendererPolicyForTimeline,
  rendererValues,
  semanticGrammarFilters,
  semanticProgramForState,
};