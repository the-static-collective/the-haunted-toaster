const { TOPOLOGIES } = require("../generation/schema.cjs");
const { EXPRESSIVE_RENDERER_POLICY, MUTATION_LATTICE_RENDERER_POLICY, isExpressiveRendererPolicy } = require("../generation/renderer-policy.cjs");
const { effectiveInternalEnergy, effectiveInternalEnergyV3 } = require("./response-shaping.cjs");
const { resolveFieldEnvelope } = require("./field-envelope.cjs");
const { compileTopologyResponse } = require("./topology-response.cjs");

const PRODUCTION_WAVE_SEAM = /\[waveAudio\]showwaves=s=(\d+)x(\d+):mode=cline:rate=([0-9.]+):[^;\n]+\[wave\];\n\[wave\]pad=(\d+):(\d+):0:(\d+):color=black@0\.0\[waveFull\]/;
const SHAPE_PACK_TOPOLOGIES = Object.freeze(["elastic-spine", "split-horizon", "cathedral-fan", "echo-tunnel"]);

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
  const rawAmplitude = clamp(Number(motion.amplitude) || 0, 0, 1);
  const rawVariance = clamp(Number(motion.variance) || 0, 0, 1);
  const expressive = isExpressiveRendererPolicy(execution.timeline.rendererPolicy);
  const energyResponse = execution.timeline.rendererPolicy === MUTATION_LATTICE_RENDERER_POLICY
    ? effectiveInternalEnergyV3
    : effectiveInternalEnergy;
  const amplitude = expressive ? energyResponse(rawAmplitude) : rawAmplitude;
  const variance = expressive ? energyResponse(rawVariance) : rawVariance;
  const duration = Math.max(0.1, execution.durationTicks / execution.timebase);
  const opacity = quantize(clamp(0.38 + amplitude * 0.5, 0.2, 0.95), 3);
  const envelope = resolveFieldEnvelope(baseState, { width, height });
  const zoom = quantize(1.25 + amplitude * 1.15, 3);
  const topologyResponse = execution.timeline.rendererPolicy === MUTATION_LATTICE_RENDERER_POLICY && execution.timeline.nestedResponse
    ? compileTopologyResponse(execution.timeline, baseState.topology)
    : null;
  return Object.freeze({
    match,
    width,
    height,
    fps,
    duration,
    timeline: execution.timeline,
    baseState,
    motion,
    rawAmplitude,
    rawVariance,
    amplitude,
    variance,
    expressive,
    opacity,
    envelope,
    zoom,
    response: topologyResponse,
  });
}

function responseContextForTopology(context, topology) {
  if (!context.response || topology === context.baseState.topology) return context;
  return Object.freeze({
    ...context,
    response: compileTopologyResponse(context.timeline, topology),
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

function responsiveFrameFilter(context) {
  if (!context.response) return [];
  const { extent, travelX, travelY } = context.response.expressions;
  const factor = `1+0.45*(${extent})+0.33*pow((${extent}),6)`;
  return [
    `scale=w='iw*(${factor})':h='ih*(${factor})':eval=frame`,
    `crop=${context.width}:${context.height}:x='(iw-ow)/2+(${travelX})*(iw-ow)*0.28':y='(ih-oh)/2+(${travelY})*(ih-oh)*0.28'`,
  ];
}

function finishFilter(context, turns) {
  const expansion = context.envelope.safeExpansion.pixels;
  const working = context.envelope.working;
  const radians = quantize(Number(turns) * 2 * Math.PI);
  if (!context.response) {
    return [
      `pad=${working.width}:${working.height}:${expansion}:${expansion}:color=black@0.0`,
      `rotate='${ffmpegNumber(radians)}*t/${ffmpegNumber(context.duration)}':ow=iw:oh=ih:c=black@0`,
      `pad=${working.stageWidth}:${working.stageHeight}:${working.stageX}:${working.stageY}:color=black@0.0`,
      `crop=${context.width}:${context.height}:${working.cropX}:${working.cropY}`,
    ].join(",");
  }
  const { phase, idle } = context.response.expressions;
  return [
    `pad=${working.width}:${working.height}:${expansion}:${expansion}:color=black@0.0`,
    `rotate='${ffmpegNumber(radians)}*t/${ffmpegNumber(context.duration)}+(${phase})*0.16+(${idle})*0.025*sin(t*0.71)':ow=iw:oh=ih:c=black@0`,
    `pad=${working.stageWidth}:${working.stageHeight}:${working.stageX}:${working.stageY}:color=black@0.0`,
    `crop=${context.width}:${context.height}:${working.cropX}:${working.cropY}`,
    ...responsiveFrameFilter(context),
  ].join(",");
}

function compileCircle(context) {
  const turns = 0.25 + context.variance * 0.5;
  return {
    replacement: `[waveAudio]${scopeFilter(context, {
      width: context.envelope.envelope.width,
      height: context.envelope.envelope.height,
    })},${finishFilter(context, turns)}[waveFull]`,
  };
}

function compileMirroredRing(context) {
  const turns = 0.55 + context.variance;
  const width = context.envelope.envelope.width;
  const height = context.envelope.envelope.height;
  const filter = scopeFilter(context, { width, height });
  if (!context.response) {
    return {
      replacement: [
        "[waveAudio]asplit=2[scoreScopeA][scoreScopeB]",
        `[scoreScopeA]${filter}[scoreRingA]`,
        `[scoreScopeB]${filter},hflip[scoreRingB]`,
        `[scoreRingA][scoreRingB]blend=all_mode=screen,${finishFilter(context, turns)}[waveFull]`,
      ].join(";\n"),
    };
  }
  const { openness } = context.response.expressions;
  return {
    replacement: [
      "[waveAudio]asplit=2[scoreScopeA][scoreScopeB]",
      `[scoreScopeA]${filter}[scoreRingA]`,
      `[scoreScopeB]${filter},hflip[scoreRingB]`,
      `[scoreRingA]scale=w='iw*1.08':h='ih*1.08':eval=frame,crop=${width}:${height}:x='(iw-ow)/2-(${openness})*(iw-ow)*0.45':y='(ih-oh)/2'[scoreRingAr]`,
      `[scoreRingB]scale=w='iw*1.08':h='ih*1.08':eval=frame,crop=${width}:${height}:x='(iw-ow)/2+(${openness})*(iw-ow)*0.45':y='(ih-oh)/2'[scoreRingBr]`,
      `[scoreRingAr][scoreRingBr]blend=all_mode=screen,${finishFilter(context, turns)}[waveFull]`,
    ].join(";\n"),
  };
}

function compileSpiral(context) {
  const turns = 1.1 + context.variance * 1.6;
  const filter = scopeFilter(context, {
    width: context.envelope.envelope.width,
    height: context.envelope.envelope.height,
    mode: "polar",
    zoom: quantize(context.zoom * 0.88, 3),
  });
  if (!context.response) {
    return { replacement: `[waveAudio]${filter},${finishFilter(context, turns)}[waveFull]` };
  }
  const { phase } = context.response.expressions;
  return {
    replacement: `[waveAudio]${filter},rotate='(${phase})*0.12':ow=iw:oh=ih:c=black@0,${finishFilter(context, turns)}[waveFull]`,
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
  if (!context.response) {
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
    };
  }
  const { openness } = context.response.expressions;
  const q = (input, output, sx, sy) => `[${input}]scale=w='iw*1.1':h='ih*1.1':eval=frame,crop=${tileWidth}:${tileHeight}:x='(iw-ow)/2+(${openness})*(iw-ow)*${sx}':y='(ih-oh)/2+(${openness})*(ih-oh)*${sy}'[${output}]`;
  return {
    replacement: [
      `[waveAudio]${filter}[scoreQuadSource]`,
      "[scoreQuadSource]split=4[scoreQ1][scoreQ2][scoreQ3][scoreQ4]",
      "[scoreQ2]hflip[scoreQ2f]",
      "[scoreQ3]vflip[scoreQ3f]",
      "[scoreQ4]hflip,vflip[scoreQ4f]",
      q("scoreQ1", "scoreQ1r", -0.45, -0.45),
      q("scoreQ2f", "scoreQ2r", 0.45, -0.45),
      q("scoreQ3f", "scoreQ3r", -0.45, 0.45),
      q("scoreQ4f", "scoreQ4r", 0.45, 0.45),
      "[scoreQ1r][scoreQ2r]hstack=inputs=2[scoreQuadTop]",
      "[scoreQ3r][scoreQ4r]hstack=inputs=2[scoreQuadBottom]",
      `[scoreQuadTop][scoreQuadBottom]vstack=inputs=2,${centering},${finishFilter(context, 0)}[waveFull]`,
    ].join(";\n"),
  };
}

function compileElasticSpine(context) {
  const width = context.envelope.envelope.width;
  const height = context.envelope.envelope.height;
  const spineWidth = Math.max(96, Math.floor(width * 0.22));
  const x = Math.floor((width - spineWidth) / 2);
  const filter = scopeFilter(context, {
    width: spineWidth,
    height,
    zoom: quantize(context.zoom * 1.18, 3),
  });
  if (!context.response) {
    return {
      replacement: `[waveAudio]${filter},pad=${width}:${height}:${x}:0:color=black@0.0,${finishFilter(context, 0.08 + context.variance * 0.18)}[waveFull]`,
    };
  }
  const { phase, recoil, travelY } = context.response.expressions;
  return {
    replacement: [
      `[waveAudio]${filter},pad=${width}:${height}:${x}:0:color=black@0.0[scoreSpineBase]`,
      `[scoreSpineBase]scale=w='iw*1.08':h='ih*1.04':eval=frame,crop=${width}:${height}:x='(iw-ow)/2+(${phase})*(iw-ow)*0.38-(${recoil})*(iw-ow)*0.12':y='(ih-oh)/2+(${travelY})*(ih-oh)*0.16'[scoreSpineResponsive]`,
      `[scoreSpineResponsive]${finishFilter(context, 0.08 + context.variance * 0.18)}[waveFull]`,
    ].join(";\n"),
  };
}

function compileSplitHorizon(context) {
  const width = context.envelope.envelope.width;
  const height = context.envelope.envelope.height;
  const halfHeight = Math.max(32, Math.floor(height / 2));
  const stackedHeight = halfHeight * 2;
  const padY = Math.floor((height - stackedHeight) / 2);
  const filter = scopeFilter(context, { width, height: halfHeight, zoom: quantize(context.zoom * 0.96, 3) });
  if (!context.response) {
    return {
      replacement: [
        "[waveAudio]asplit=2[shapeHorizonA][shapeHorizonB]",
        `[shapeHorizonA]${filter}[shapeHorizonTop]`,
        `[shapeHorizonB]${filter},vflip[shapeHorizonBottom]`,
        `[shapeHorizonTop][shapeHorizonBottom]vstack=inputs=2,pad=${width}:${height}:0:${padY}:color=black@0.0,${finishFilter(context, 0)}[waveFull]`,
      ].join(";\n"),
    };
  }
  const { openness, recoil } = context.response.expressions;
  const separation = `((${openness})-0.45*(${recoil}))`;
  return {
    replacement: [
      "[waveAudio]asplit=2[shapeHorizonA][shapeHorizonB]",
      `[shapeHorizonA]${filter}[shapeHorizonTop]`,
      `[shapeHorizonB]${filter},vflip[shapeHorizonBottom]`,
      `[shapeHorizonTop]scale=w='iw*1.04':h='ih*1.12':eval=frame,crop=${width}:${halfHeight}:x='(iw-ow)/2':y='(ih-oh)/2-${separation}*(ih-oh)*0.42'[shapeHorizonTopResponsive]`,
      `[shapeHorizonBottom]scale=w='iw*1.04':h='ih*1.12':eval=frame,crop=${width}:${halfHeight}:x='(iw-ow)/2':y='(ih-oh)/2+${separation}*(ih-oh)*0.42'[shapeHorizonBottomResponsive]`,
      `[shapeHorizonTopResponsive][shapeHorizonBottomResponsive]vstack=inputs=2,pad=${width}:${height}:0:${padY}:color=black@0.0,${finishFilter(context, 0)}[waveFull]`,
    ].join(";\n"),
  };
}

function compileCathedralFan(context) {
  const width = context.envelope.envelope.width;
  const height = context.envelope.envelope.height;
  const bladeWidth = Math.max(64, Math.floor(width * 0.22));
  const bladeX = Math.floor((width - bladeWidth) / 2);
  const filter = scopeFilter(context, {
    width: bladeWidth,
    height,
    mode: "lissajous_xy",
    zoom: quantize(context.zoom * 1.08, 3),
  });
  const angle = quantize(0.18 + context.variance * 0.12, 4);
  if (!context.response) {
    return {
      replacement: [
        `[waveAudio]${filter},pad=${width}:${height}:${bladeX}:0:color=black@0.0[shapeFanSource]`,
        "[shapeFanSource]split=3[shapeFanA][shapeFanB][shapeFanC]",
        "[shapeFanA]colorchannelmixer=aa=0.72[shapeFanCenter]",
        `[shapeFanB]rotate=${ffmpegNumber(angle)}:ow=iw:oh=ih:c=black@0,colorchannelmixer=aa=0.5[shapeFanBr]`,
        `[shapeFanC]rotate=-${ffmpegNumber(angle)}:ow=iw:oh=ih:c=black@0,colorchannelmixer=aa=0.5[shapeFanCr]`,
        "[shapeFanCenter][shapeFanBr]overlay=0:0:format=auto:eof_action=pass[shapeFanAB]",
        `[shapeFanAB][shapeFanCr]overlay=0:0:format=auto:eof_action=pass,${finishFilter(context, 0)}[waveFull]`,
      ].join(";\n"),
    };
  }
  const { openness, recoil, idle } = context.response.expressions;
  const rightAngle = `${ffmpegNumber(angle)}+(${openness})*0.22-(${recoil})*0.08+(${idle})*0.03*sin(t*0.83)`;
  const leftAngle = `-${ffmpegNumber(angle)}-(${openness})*0.22+(${recoil})*0.08-(${idle})*0.03*sin(t*0.83)`;
  return {
    replacement: [
      `[waveAudio]${filter},pad=${width}:${height}:${bladeX}:0:color=black@0.0[shapeFanSource]`,
      "[shapeFanSource]split=3[shapeFanA][shapeFanB][shapeFanC]",
      "[shapeFanA]colorchannelmixer=aa=0.72[shapeFanCenter]",
      `[shapeFanB]rotate='${rightAngle}':ow=iw:oh=ih:c=black@0,colorchannelmixer=aa=0.5[shapeFanBr]`,
      `[shapeFanC]rotate='${leftAngle}':ow=iw:oh=ih:c=black@0,colorchannelmixer=aa=0.5[shapeFanCr]`,
      "[shapeFanCenter][shapeFanBr]overlay=0:0:format=auto:eof_action=pass[shapeFanAB]",
      `[shapeFanAB][shapeFanCr]overlay=0:0:format=auto:eof_action=pass,${finishFilter(context, 0)}[waveFull]`,
    ].join(";\n"),
  };
}

function compileEchoTunnel(context) {
  const width = context.envelope.envelope.width;
  const height = context.envelope.envelope.height;
  const filter = scopeFilter(context, { width, height, zoom: quantize(context.zoom * 0.9, 3) });
  const middleWidth = Math.max(32, Math.floor(width * 0.72));
  const middleHeight = Math.max(32, Math.floor(height * 0.72));
  const innerWidth = Math.max(32, Math.floor(width * 0.48));
  const innerHeight = Math.max(32, Math.floor(height * 0.48));
  const vanishX = Math.round(width * (0.045 + context.variance * 0.025));
  const vanishY = Math.round(height * (0.025 + context.variance * 0.02));
  const middleX = Math.floor((width - middleWidth) / 2 + vanishX * 0.5);
  const middleY = Math.floor((height - middleHeight) / 2 + vanishY * 0.5);
  const innerX = Math.floor((width - innerWidth) / 2 + vanishX);
  const innerY = Math.floor((height - innerHeight) / 2 + vanishY);
  if (!context.response) {
    return {
      replacement: [
        `[waveAudio]${filter}[shapeTunnelSource]`,
        "[shapeTunnelSource]split=3[shapeTunnelA][shapeTunnelB][shapeTunnelC]",
        "[shapeTunnelA]colorchannelmixer=aa=0.74[shapeTunnelOuter]",
        `[shapeTunnelB]scale=${middleWidth}:${middleHeight},colorchannelmixer=aa=0.52,pad=${width}:${height}:${middleX}:${middleY}:color=black@0[shapeTunnelBm]`,
        `[shapeTunnelC]scale=${innerWidth}:${innerHeight},colorchannelmixer=aa=0.34,pad=${width}:${height}:${innerX}:${innerY}:color=black@0[shapeTunnelCi]`,
        "[shapeTunnelOuter][shapeTunnelBm]overlay=0:0:format=auto:eof_action=pass[shapeTunnelAB]",
        `[shapeTunnelAB][shapeTunnelCi]overlay=0:0:format=auto:eof_action=pass,${finishFilter(context, 0.03 + context.variance * 0.08)}[waveFull]`,
      ].join(";\n"),
    };
  }
  const { openness, travelX, travelY } = context.response.expressions;
  return {
    replacement: [
      `[waveAudio]${filter}[shapeTunnelSource]`,
      "[shapeTunnelSource]split=3[shapeTunnelA][shapeTunnelB][shapeTunnelC]",
      "[shapeTunnelA]colorchannelmixer=aa=0.74[shapeTunnelOuter]",
      `[shapeTunnelB]scale=${middleWidth}:${middleHeight},colorchannelmixer=aa=0.52,pad=${width}:${height}:${middleX}:${middleY}:color=black@0[shapeTunnelBm]`,
      `[shapeTunnelBm]scale=w='iw*(1+0.08*(${openness}))':h='ih*(1+0.08*(${openness}))':eval=frame,crop=${width}:${height}:x='(iw-ow)/2+(${travelX})*(iw-ow)*0.42':y='(ih-oh)/2+(${travelY})*(ih-oh)*0.42'[shapeTunnelBmResponsive]`,
      `[shapeTunnelC]scale=${innerWidth}:${innerHeight},colorchannelmixer=aa=0.34,pad=${width}:${height}:${innerX}:${innerY}:color=black@0[shapeTunnelCi]`,
      `[shapeTunnelCi]scale=w='iw*(1+0.14*(${openness}))':h='ih*(1+0.14*(${openness}))':eval=frame,crop=${width}:${height}:x='(iw-ow)/2+(${travelX})*(iw-ow)*0.48':y='(ih-oh)/2+(${travelY})*(ih-oh)*0.48'[shapeTunnelCiResponsive]`,
      "[shapeTunnelOuter][shapeTunnelBmResponsive]overlay=0:0:format=auto:eof_action=pass[shapeTunnelAB]",
      `[shapeTunnelAB][shapeTunnelCiResponsive]overlay=0:0:format=auto:eof_action=pass,${finishFilter(context, 0.03 + context.variance * 0.08)}[waveFull]`,
    ].join(";\n"),
  };
}

const TOPOLOGY_COMPILERS = Object.freeze({
  linear: Object.freeze({ id: "linear-v1", compile: null }),
  circle: Object.freeze({ id: "circle-v1", compile: compileCircle }),
  "mirrored-ring": Object.freeze({ id: "mirrored-ring-v1", compile: compileMirroredRing }),
  spiral: Object.freeze({ id: "spiral-polar-v1", compile: compileSpiral }),
  "quad-mirror": Object.freeze({ id: "quad-mirror-v1", compile: compileQuadMirror }),
});

const EXPRESSIVE_TOPOLOGY_COMPILERS = Object.freeze({
  linear: TOPOLOGY_COMPILERS.linear,
  circle: Object.freeze({ id: "circle-v2", compile: compileCircle }),
  "mirrored-ring": Object.freeze({ id: "mirrored-ring-v2", compile: compileMirroredRing }),
  spiral: Object.freeze({ id: "spiral-polar-v2", compile: compileSpiral }),
  "quad-mirror": Object.freeze({ id: "quad-mirror-v2", compile: compileQuadMirror }),
});

const MUTATION_LATTICE_TOPOLOGY_COMPILERS = Object.freeze({
  ...EXPRESSIVE_TOPOLOGY_COMPILERS,
  "elastic-spine": Object.freeze({ id: "elastic-spine-v3", compile: compileElasticSpine }),
  "split-horizon": Object.freeze({ id: "split-horizon-v3", compile: compileSplitHorizon }),
  "cathedral-fan": Object.freeze({ id: "cathedral-fan-v3", compile: compileCathedralFan }),
  "echo-tunnel": Object.freeze({ id: "echo-tunnel-v3", compile: compileEchoTunnel }),
});

function topologyRegistryForExecution(execution) {
  if (execution?.timeline?.rendererPolicy === MUTATION_LATTICE_RENDERER_POLICY) {
    return MUTATION_LATTICE_TOPOLOGY_COMPILERS;
  }
  return execution?.timeline?.rendererPolicy === EXPRESSIVE_RENDERER_POLICY
    ? EXPRESSIVE_TOPOLOGY_COMPILERS
    : TOPOLOGY_COMPILERS;
}

function replacementForTopology(topology, context, registry) {
  const entry = registry[topology];
  if (!entry) throw new TypeError(`No topology compiler is registered for ${topology}.`);
  if (topology === "linear") return context.match[0];
  return entry.compile(responseContextForTopology(context, topology)).replacement;
}

function namespaceReplacement(replacement, prefix, inputLabel, outputLabel) {
  return replacement.replace(/\[([A-Za-z0-9_]+)\]/g, (_match, label) => {
    if (label === "waveAudio") return `[${inputLabel}]`;
    if (label === "waveFull") return `[${outputLabel}]`;
    return `[${prefix}${label}]`;
  });
}

function topologyArcCompilation(context, execution, registry, sourceTopology) {
  const arc = execution?.timeline?.topologyArc;
  if (!arc?.windows?.length) return null;
  const timebase = Number(execution.timeline.timebase) || 1000;
  const splitOutputs = ["arcBaseAudio", ...arc.windows.map((_, index) => `arcGhostAudio${index}`)];
  const filters = [`[waveAudio]asplit=${splitOutputs.length}${splitOutputs.map((label) => `[${label}]`).join("")}`];
  filters.push(namespaceReplacement(
    replacementForTopology(sourceTopology, context, registry),
    "arcBase_",
    "arcBaseAudio",
    "arcBaseVideo",
  ));
  let current = "arcBaseVideo";
  const evidence = [];
  arc.windows.forEach((window, index) => {
    const ghostTopology = window.ghostTopology;
    const ghostEntry = registry[ghostTopology];
    if (!ghostEntry) throw new TypeError(`No v3 ghost topology compiler is registered for ${ghostTopology}.`);
    const ghostVideo = `arcGhostVideo${index}`;
    filters.push(namespaceReplacement(
      replacementForTopology(ghostTopology, context, registry),
      `arcGhost${index}_`,
      `arcGhostAudio${index}`,
      ghostVideo,
    ));
    const start = ffmpegNumber(window.entranceTick / timebase);
    const release = ffmpegNumber(window.releaseTick / timebase);
    const alpha = window.outcome === "succession" ? 0.92 : window.outcome === "scar" ? 0.2 : 0.48;
    const visible = `arcGhostVisible${index}`;
    filters.push(`[${ghostVideo}]colorchannelmixer=aa=${ffmpegNumber(alpha)}[${visible}]`);
    const enable = window.outcome === "dissolve" ? `between(t,${start},${release})` : `gte(t,${start})`;
    const composite = `arcComposite${index}`;
    filters.push(`[${current}][${visible}]overlay=0:0:enable='${enable}':eof_action=pass[${composite}]`);
    current = composite;
    evidence.push(Object.freeze({
      windowSha256: window.windowSha256,
      sourceTopology,
      sourceCompiler: registry[sourceTopology].id,
      ghostTopology,
      ghostCompiler: ghostEntry.id,
      entranceTick: window.entranceTick,
      peakTick: window.peakTick,
      releaseTick: window.releaseTick,
      overlapPolicy: window.overlapPolicy,
      outcome: window.outcome,
      scar: window.scar || null,
    }));
  });
  filters.push(`[${current}]null[waveFull]`);
  return Object.freeze({
    replacement: filters.join(";\n"),
    evidence: Object.freeze({
      policyVersion: arc.policyVersion,
      planSha256: arc.planSha256,
      windowCount: arc.windowCount,
      windows: Object.freeze(evidence),
    }),
  });
}

function compileProductionTopology(graph, execution) {
  const topology = frozenTopology(execution);
  const registry = topologyRegistryForExecution(execution);
  const entry = registry[topology];
  if (!entry) throw new TypeError(`No topology compiler is registered for ${topology}.`);

  const requiresContext = topology !== "linear" || execution?.timeline?.topologyArc?.windows?.length;
  if (!requiresContext) {
    const result = {
      graph,
      topology,
      topologyCompiler: entry.id,
      fieldEnvelope: null,
      geometry: productionGeometry(graph),
      topologyArc: null,
    };
    if (execution?.timeline?.rendererPolicy === MUTATION_LATTICE_RENDERER_POLICY) {
      result.topologyResponse = null;
    }
    return result;
  }

  const context = topologyContext(graph, execution);
  const arcCompiled = execution?.timeline?.rendererPolicy === MUTATION_LATTICE_RENDERER_POLICY
    ? topologyArcCompilation(context, execution, registry, topology)
    : null;
  const replacement = arcCompiled
    ? arcCompiled.replacement
    : replacementForTopology(topology, context, registry);
  const result = {
    graph: graph.replace(PRODUCTION_WAVE_SEAM, replacement),
    topology,
    topologyCompiler: entry.id,
    fieldEnvelope: context.envelope,
    geometry: Object.freeze({ width: context.width, height: context.height, fps: context.fps }),
    topologyArc: arcCompiled?.evidence || null,
  };
  if (execution?.timeline?.rendererPolicy === MUTATION_LATTICE_RENDERER_POLICY) {
    result.topologyResponse = context.response?.evidence || null;
  }
  return result;
}

module.exports = {
  EXPRESSIVE_TOPOLOGY_COMPILERS,
  MUTATION_LATTICE_TOPOLOGY_COMPILERS,
  PRODUCTION_WAVE_SEAM,
  SHAPE_PACK_TOPOLOGIES,
  TOPOLOGY_COMPILERS,
  compileProductionTopology,
  frozenTopology,
  productionGeometry,
  topologyRegistryForExecution,
};
