const { TOPOLOGIES } = require("../generation/schema.cjs");
const { resolveFieldEnvelope } = require("./field-envelope.cjs");

const PRODUCTION_WAVE_SEAM = /\[waveAudio\]showwaves=s=(\d+)x(\d+):mode=cline:rate=([0-9.]+):[^;\n]+\[wave\];\n\[wave\]pad=(\d+):(\d+):0:(\d+):color=black@0\.0\[waveFull\]/;

function quantize(value, places = 6) {
  const scale = 10 ** places;
  return Math.round(Number(value) * scale) / scale;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function ffmpegNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError("Topology renderer value must be finite.");
  return String(quantize(number));
}

function frozenTopology(execution) {
  const topology = execution?.timeline?.baseState?.topology;
  if (!TOPOLOGIES.includes(topology)) {
    throw new TypeError(`Unsupported ResolvedTimeline topology: ${String(topology)}.`);
  }
  for (const segment of execution.segments || []) {
    if (segment.state?.topology !== topology) {
      throw new Error("ResolvedTimeline topology must remain frozen for production execution.");
    }
  }
  return topology;
}

function productionGeometry(graph) {
  const match = graph.match(PRODUCTION_WAVE_SEAM);
  if (!match) return null;
  return Object.freeze({
    width: Number(match[4]),
    height: Number(match[5]),
    fps: Number(match[3]),
  });
}

function topologyContext(graph, execution) {
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
  const zoom = quantize(1.25 + (Number(motion.amplitude) || 0) * 1.15, 3);
  return Object.freeze({
    match,
    width,
    height,
    fps,
    duration,
    baseState,
    motion,
    opacity,
    envelope,
    zoom,
  });
}

function scopeFilter(context, { width, height, mode = "lissajous_xy", zoom = context.zoom } = {}) {
  return [
    "aformat=channel_layouts=stereo",
    `avectorscope=s=${width}x${height}:mode=${mode}:draw=line:scale=sqrt:zoom=${ffmpegNumber(zoom)}:rate=${ffmpegNumber(context.fps)}`,
    "format=rgba",
    "colorkey=black:0.08:0.0",
    `colorchannelmixer=aa=${ffmpegNumber(context.opacity)}`,
  ].join(",");
}

function finishFilter(context, turns) {
  const expansion = context.envelope.safeExpansion.pixels;
  const working = context.envelope.working;
  const radians = quantize(Number(turns) * 2 * Math.PI);
  return [
    `pad=${working.width}:${working.height}:${expansion}:${expansion}:color=black@0.0`,
    `rotate='${ffmpegNumber(radians)}*t/${ffmpegNumber(context.duration)}':ow=iw:oh=ih:c=black@0`,
    `pad=${working.stageWidth}:${working.stageHeight}:${working.stageX}:${working.stageY}:color=black@0.0`,
    `crop=${context.width}:${context.height}:${working.cropX}:${working.cropY}`,
  ].join(",");
}

function compileCircle(context) {
  const turns = 0.25 + (Number(context.motion.variance) || 0) * 0.5;
  return {
    replacement: `[waveAudio]${scopeFilter(context, {
      width: context.envelope.envelope.width,
      height: context.envelope.envelope.height,
    })},${finishFilter(context, turns)}[waveFull]`,
    compiler: "circle-v1",
  };
}

function compileMirroredRing(context) {
  const turns = 0.55 + (Number(context.motion.variance) || 0);
  const filter = scopeFilter(context, {
    width: context.envelope.envelope.width,
    height: context.envelope.envelope.height,
  });
  return {
    replacement: [
      "[waveAudio]asplit=2[scoreScopeA][scoreScopeB]",
      `[scoreScopeA]${filter}[scoreRingA]`,
      `[scoreScopeB]${filter},hflip[scoreRingB]`,
      `[scoreRingA][scoreRingB]blend=all_mode=screen,${finishFilter(context, turns)}[waveFull]`,
    ].join(";\n"),
    compiler: "mirrored-ring-v1",
  };
}

function compileSpiral(context) {
  const turns = 1.1 + (Number(context.motion.variance) || 0) * 1.6;
  const filter = scopeFilter(context, {
    width: context.envelope.envelope.width,
    height: context.envelope.envelope.height,
    mode: "polar",
    zoom: quantize(context.zoom * 0.88, 3),
  });
  return {
    replacement: `[waveAudio]${filter},${finishFilter(context, turns)}[waveFull]`,
    compiler: "spiral-polar-v1",
  };
}

function compileQuadMirror(context) {
  const envelopeWidth = context.envelope.envelope.width;
  const envelopeHeight = context.envelope.envelope.height;
  const tileWidth = Math.max(32, Math.floor(envelopeWidth / 2));
  const tileHeight = Math.max(32, Math.floor(envelopeHeight / 2));
  const tiledWidth = tileWidth * 2;
  const tiledHeight = tileHeight * 2;
  const filter = scopeFilter(context, {
    width: tileWidth,
    height: tileHeight,
    zoom: quantize(context.zoom * 1.12, 3),
  });
  const centering = tiledWidth === envelopeWidth && tiledHeight === envelopeHeight
    ? "null"
    : `pad=${envelopeWidth}:${envelopeHeight}:${Math.floor((envelopeWidth - tiledWidth) / 2)}:${Math.floor((envelopeHeight - tiledHeight) / 2)}:color=black@0.0`;
  return {
    replacement: [
      `[waveAudio]${filter}[scoreQuadSource]`,
      "[scoreQuadSource]split=4[scoreQ1][scoreQ2][scoreQ3][scoreQ4]",
      "[scoreQ2]hflip[scoreQ2f]",
      "[scoreQ3]vflip[scoreQ3f]",
      "[scoreQ4]hflip,vflip[scoreQ4f]",
      "[scoreQ1][scoreQ2f]hstack=inputs=2[scoreQuadTop]",
      "[scoreQ3f][scoreQ4f]hstack=inputs=2[scoreQuadBottom]",
      `[scoreQuadTop][scoreQuadBottom]vstack=inputs=2,${centering},${finishFilter(context, 0)}[waveFull]`,
    ].join(";\n"),
    compiler: "quad-mirror-v1",
  };
}

const TOPOLOGY_COMPILERS = Object.freeze({
  linear: Object.freeze({ id: "linear-v1", compile: null }),
  circle: Object.freeze({ id: "circle-v1", compile: compileCircle }),
  "mirrored-ring": Object.freeze({ id: "mirrored-ring-v1", compile: compileMirroredRing }),
  spiral: Object.freeze({ id: "spiral-polar-v1", compile: compileSpiral }),
  "quad-mirror": Object.freeze({ id: "quad-mirror-v1", compile: compileQuadMirror }),
});

function compileProductionTopology(graph, execution) {
  const topology = frozenTopology(execution);
  const entry = TOPOLOGY_COMPILERS[topology];
  if (!entry) throw new TypeError(`No topology compiler is registered for ${topology}.`);

  if (topology === "linear") {
    return {
      graph,
      topology,
      topologyCompiler: entry.id,
      fieldEnvelope: null,
      geometry: productionGeometry(graph),
    };
  }

  const context = topologyContext(graph, execution);
  const compiled = entry.compile(context);
  return {
    graph: graph.replace(PRODUCTION_WAVE_SEAM, compiled.replacement),
    topology,
    topologyCompiler: compiled.compiler,
    fieldEnvelope: context.envelope,
    geometry: Object.freeze({ width: context.width, height: context.height, fps: context.fps }),
  };
}

module.exports = {
  PRODUCTION_WAVE_SEAM,
  TOPOLOGY_COMPILERS,
  compileProductionTopology,
  frozenTopology,
  productionGeometry,
};
