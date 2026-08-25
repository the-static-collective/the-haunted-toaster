const { compileTopologyEvents } = require("./topology-events.cjs");

const TOPOLOGY_COMPOSITE_SEAM = /\[(base|spectral)\]\[(waveFull|primitiveField)\]overlay=([^;\n]+)\[stage0\]/;
const ALLOWED_TOPOLOGY_COMPOSITES = Object.freeze(new Set([
  "base:waveFull",
  "spectral:waveFull",
  "spectral:primitiveField",
]));
const ALLOWED_GRAB_CARRIERS = Object.freeze(new Set(["waveFull", "primitiveField"]));

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function evenDimension(value, maximum) {
  const bounded = clamp(Math.round(Number(value)), 2, maximum);
  const even = Math.max(2, Math.round(bounded / 2) * 2);
  return Math.min(maximum - (maximum % 2), even);
}

function patchGeometry(local, geometry) {
  const width = Number(geometry?.width);
  const height = Number(geometry?.height);
  if (!Number.isSafeInteger(width) || width < 2 || !Number.isSafeInteger(height) || height < 2) {
    throw new TypeError("Topology events require accepted production frame geometry.");
  }

  const outerWidth = evenDimension(Math.max(16, width * local.radiusX * 2), width);
  const outerHeight = evenDimension(Math.max(16, height * local.radiusY * 2), height);
  const innerWidth = evenDimension(Math.max(12, outerWidth * 0.55), outerWidth);
  const innerHeight = evenDimension(Math.max(12, outerHeight * 0.55), outerHeight);
  const centerX = clamp(local.anchorX, 0, 1) * width;
  const centerY = clamp(local.anchorY, 0, 1) * height;
  const outerX = Math.round(clamp(centerX - outerWidth / 2, 0, width - outerWidth));
  const outerY = Math.round(clamp(centerY - outerHeight / 2, 0, height - outerHeight));
  const innerX = Math.round(clamp(centerX - innerWidth / 2, 0, width - innerWidth));
  const innerY = Math.round(clamp(centerY - innerHeight / 2, 0, height - innerHeight));

  return Object.freeze({
    width,
    height,
    outerWidth,
    outerHeight,
    outerX,
    outerY,
    innerWidth,
    innerHeight,
    innerX,
    innerY,
  });
}

function ff(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError("Topology event seam value must be finite.");
  return String(Math.round(number * 1e6) / 1e6);
}

function scaleExpression(stretch, xGain, yGain) {
  return `scale=w='max(2,trunc(iw*(1+${ff(xGain)}*abs(${stretch}))/2)*2)':h='max(2,trunc(ih*(1+${ff(yGain)}*abs(${stretch}))/2)*2)':eval=frame,setsar=1`;
}

function staticScale(scaleX, scaleY) {
  return `scale=w='max(2,trunc(iw*${ff(scaleX)}/2)*2)':h='max(2,trunc(ih*${ff(scaleY)}/2)*2)':eval=frame,setsar=1`;
}

function eventEnable(effect, timebase, startKey = "prepareTick", endKey = "residueUntilTick") {
  return `between(t,${ff(effect[startKey] / timebase)},${ff(effect[endKey] / timebase)})`;
}

function compileGrabLocalStep(local, geometry, inputLabel, prefix, outputLabel, labelOverrides = {}) {
  const g = patchGeometry(local, geometry);
  const { vectorX, vectorY, stretch, enable } = local.expressions;
  const falloff = clamp(local.falloff, 0, 1);
  const outerAlpha = ff(0.18 + falloff * 0.28);
  const innerAlpha = ff(0.62 + falloff * 0.25);
  const outerTravel = ff(0.48 + falloff * 0.16);
  const labels = {
    base: `${prefix}Base`,
    outerSource: `${prefix}OuterSource`,
    innerSource: `${prefix}InnerSource`,
    outerPatch: `${prefix}OuterPatch`,
    innerPatch: `${prefix}InnerPatch`,
    outerComposite: `${prefix}OuterComposite`,
    ...labelOverrides,
  };

  return [
    `[${inputLabel}]split=3[${labels.base}][${labels.outerSource}][${labels.innerSource}]`,
    `[${labels.outerSource}]crop=${g.outerWidth}:${g.outerHeight}:${g.outerX}:${g.outerY},${scaleExpression(stretch, 0.22, 0.12)},colorchannelmixer=aa=${outerAlpha}[${labels.outerPatch}]`,
    `[${labels.innerSource}]crop=${g.innerWidth}:${g.innerHeight}:${g.innerX}:${g.innerY},${scaleExpression(stretch, 0.46, 0.24)},colorchannelmixer=aa=${innerAlpha}[${labels.innerPatch}]`,
    `[${labels.base}][${labels.outerPatch}]overlay=x='${g.outerX}+(${vectorX})*main_w*${outerTravel}-(overlay_w-${g.outerWidth})/2':y='${g.outerY}+(${vectorY})*main_h*${outerTravel}-(overlay_h-${g.outerHeight})/2':enable='${enable}':format=auto:eof_action=pass[${labels.outerComposite}]`,
    `[${labels.outerComposite}][${labels.innerPatch}]overlay=x='${g.innerX}+(${vectorX})*main_w-(overlay_w-${g.innerWidth})/2':y='${g.innerY}+(${vectorY})*main_h-(overlay_h-${g.innerHeight})/2':enable='${enable}':format=auto:eof_action=pass[${outputLabel}]`,
  ].join(";\n");
}

function compileGrabSeam(eventResponse, geometry, carrierLabel = "waveFull") {
  if (!ALLOWED_GRAB_CARRIERS.has(carrierLabel)) {
    throw new TypeError(`Unsupported GRAB topology carrier: ${String(carrierLabel)}.`);
  }
  const local = eventResponse.localDeformation;
  if (!local || local.kind !== "grab") {
    throw new TypeError("Topology event seam requires a compiled GRAB local deformation.");
  }
  return compileGrabLocalStep(
    local,
    geometry,
    carrierLabel,
    "grabTopology",
    "grabTopologyFinal",
    {
      base: "grabTopologyBase",
      outerSource: "grabOuterSource",
      innerSource: "grabInnerSource",
      outerPatch: "grabOuterPatch",
      innerPatch: "grabInnerPatch",
      outerComposite: "grabOuterComposite",
    },
  );
}

function compileApertureStep(effect, geometry, inputLabel, prefix, outputLabel, timebase) {
  const g = patchGeometry(effect, geometry);
  const focus = clamp(effect.focus, 0, 1);
  const compression = clamp(effect.peripheralCompression, 0, 1);
  const orbit = clamp(effect.orbit, 0, 1);
  const scaleX = 1 + focus * (0.18 + 0.08 * (1 - compression));
  const scaleY = 1 + focus * (0.12 + 0.06 * (1 - compression));
  const alpha = ff(0.34 + focus * 0.42);
  const orbitX = ff(orbit * 0.018);
  const orbitY = ff(orbit * 0.012);
  const enable = eventEnable(effect, timebase);

  return [
    `[${inputLabel}]split=2[${prefix}Base][${prefix}Source]`,
    `[${prefix}Source]crop=${g.outerWidth}:${g.outerHeight}:${g.outerX}:${g.outerY},${staticScale(scaleX, scaleY)},colorchannelmixer=aa=${alpha}[${prefix}Patch]`,
    `[${prefix}Base][${prefix}Patch]overlay=x='${g.outerX}+sin(2*PI*t)*main_w*${orbitX}-(overlay_w-${g.outerWidth})/2':y='${g.outerY}+cos(2*PI*t)*main_h*${orbitY}-(overlay_h-${g.outerHeight})/2':enable='${enable}':format=auto:eof_action=pass[${outputLabel}]`,
  ].join(";\n");
}

function compileSpeakStep(effect, geometry, inputLabel, prefix, outputLabel, timebase) {
  const g = patchGeometry(effect, geometry);
  const seamWidth = clamp(effect.seamWidth, 0, 1);
  const emission = clamp(effect.emission, 0, 1);
  const residue = clamp(effect.residue, 0, 1);
  const scaleX = 1 + emission * 0.22;
  const scaleY = 0.58 + seamWidth * 0.72;
  const alphaA = ff(0.22 + emission * 0.42);
  const alphaB = ff(0.12 + residue * 0.36);
  const travel = ff(0.012 + emission * 0.028);
  const prepareEnable = eventEnable(effect, timebase, "prepareTick", "releaseTick");
  const residueEnable = eventEnable(effect, timebase, "strikeTick", "residueUntilTick");

  return [
    `[${inputLabel}]split=3[${prefix}Base][${prefix}SourceA][${prefix}SourceB]`,
    `[${prefix}SourceA]crop=${g.outerWidth}:${g.outerHeight}:${g.outerX}:${g.outerY},${staticScale(scaleX, scaleY)},colorchannelmixer=aa=${alphaA}[${prefix}PatchA]`,
    `[${prefix}SourceB]crop=${g.outerWidth}:${g.outerHeight}:${g.outerX}:${g.outerY},${staticScale(scaleX, scaleY)},colorchannelmixer=aa=${alphaB}[${prefix}PatchB]`,
    `[${prefix}Base][${prefix}PatchA]overlay=x='${g.outerX}-main_w*${travel}-(overlay_w-${g.outerWidth})/2':y='${g.outerY}-(overlay_h-${g.outerHeight})/2':enable='${prepareEnable}':format=auto:eof_action=pass[${prefix}Mid]`,
    `[${prefix}Mid][${prefix}PatchB]overlay=x='${g.outerX}+main_w*${travel}-(overlay_w-${g.outerWidth})/2':y='${g.outerY}-(overlay_h-${g.outerHeight})/2':enable='${residueEnable}':format=auto:eof_action=pass[${outputLabel}]`,
  ].join(";\n");
}

function compileGrowStep(effect, geometry, inputLabel, prefix, outputLabel, timebase) {
  const g = patchGeometry(effect, geometry);
  const growth = clamp(effect.growth, 0, 1);
  const persistence = clamp(effect.persistence, 0, 1);
  const ageBias = clamp(effect.ageBias, 0, 1);
  const branchCount = clamp(effect.branchCount, 1, 16);
  const direction = branchCount % 2 === 0 ? -1 : 1;
  const scaleA = 1 + growth * 0.18;
  const scaleB = 1 + growth * 0.36;
  const alphaA = ff(0.2 + persistence * 0.42);
  const alphaB = ff(0.12 + persistence * 0.34);
  const travelX = ff(direction * (0.012 + growth * 0.018) * (1 + branchCount / 16));
  const travelY = ff((ageBias - 0.5) * (0.016 + growth * 0.012));
  const youngEnable = eventEnable(effect, timebase, "strikeTick", "residueUntilTick");
  const oldEnable = eventEnable(effect, timebase, "releaseTick", "residueUntilTick");

  return [
    `[${inputLabel}]split=3[${prefix}Base][${prefix}YoungSource][${prefix}OldSource]`,
    `[${prefix}YoungSource]crop=${g.outerWidth}:${g.outerHeight}:${g.outerX}:${g.outerY},${staticScale(scaleA, scaleA)},colorchannelmixer=aa=${alphaA}[${prefix}YoungPatch]`,
    `[${prefix}OldSource]crop=${g.outerWidth}:${g.outerHeight}:${g.outerX}:${g.outerY},${staticScale(scaleB, scaleB)},colorchannelmixer=aa=${alphaB}[${prefix}OldPatch]`,
    `[${prefix}Base][${prefix}YoungPatch]overlay=x='${g.outerX}+main_w*${travelX}-(overlay_w-${g.outerWidth})/2':y='${g.outerY}+main_h*${travelY}-(overlay_h-${g.outerHeight})/2':enable='${youngEnable}':format=auto:eof_action=pass[${prefix}Mid]`,
    `[${prefix}Mid][${prefix}OldPatch]overlay=x='${g.outerX}+main_w*${ff(Number(travelX) * 1.8)}-(overlay_w-${g.outerWidth})/2':y='${g.outerY}+main_h*${ff(Number(travelY) * 1.8)}-(overlay_h-${g.outerHeight})/2':enable='${oldEnable}':format=auto:eof_action=pass[${outputLabel}]`,
  ].join(";\n");
}

function grabLocalFromEffect(effect) {
  return {
    kind: "grab",
    eventSha256: effect.eventSha256,
    anchorX: effect.anchorX,
    anchorY: effect.anchorY,
    centerX: effect.anchorX,
    centerY: effect.anchorY,
    radiusX: effect.radiusX,
    radiusY: effect.radiusY,
    falloff: effect.falloff,
    expressions: effect.expressions,
  };
}

function compileTopologyEventSeam(eventResponse, geometry, carrierLabel, timebase) {
  if (!ALLOWED_GRAB_CARRIERS.has(carrierLabel)) {
    throw new TypeError(`Unsupported topology event carrier: ${String(carrierLabel)}.`);
  }
  if (!Number.isSafeInteger(timebase) || timebase <= 0) {
    throw new TypeError("Topology event seam requires a positive timeline timebase.");
  }
  if (!Array.isArray(eventResponse.effects) || eventResponse.effects.length === 0) {
    throw new TypeError("Topology event seam requires compiled effects.");
  }

  if (eventResponse.effects.length === 1 && eventResponse.effects[0].kind === "grab") {
    return {
      filters: compileGrabSeam(eventResponse, geometry, carrierLabel),
      finalLabel: "grabTopologyFinal",
    };
  }

  const filters = [];
  const occurrences = new Map();
  let inputLabel = carrierLabel;
  let finalLabel = carrierLabel;

  for (const effect of eventResponse.effects) {
    const occurrence = (occurrences.get(effect.kind) || 0) + 1;
    occurrences.set(effect.kind, occurrence);
    const suffix = occurrence === 1 ? "" : String(occurrence);
    const prefix = `${effect.kind}Topology${suffix}`;
    finalLabel = `${prefix}Final`;

    if (effect.kind === "aperture") {
      filters.push(compileApertureStep(effect, geometry, inputLabel, prefix, finalLabel, timebase));
    } else if (effect.kind === "speak") {
      filters.push(compileSpeakStep(effect, geometry, inputLabel, prefix, finalLabel, timebase));
    } else if (effect.kind === "grab") {
      filters.push(compileGrabLocalStep(
        grabLocalFromEffect(effect),
        geometry,
        inputLabel,
        prefix,
        finalLabel,
      ));
    } else if (effect.kind === "grow") {
      filters.push(compileGrowStep(effect, geometry, inputLabel, prefix, finalLabel, timebase));
    } else {
      throw new TypeError(`Unsupported topology event effect: ${String(effect.kind)}.`);
    }
    inputLabel = finalLabel;
  }

  return {
    filters: filters.join(";\n"),
    finalLabel,
  };
}

function applyTopologyEventSeam(compiled, execution) {
  const eventResponse = compileTopologyEvents(execution?.timeline);
  if (!eventResponse) return compiled;
  if (!compiled || typeof compiled.graph !== "string") {
    throw new TypeError("Compiled timeline graph is required for topology events.");
  }
  const seam = compiled.graph.match(TOPOLOGY_COMPOSITE_SEAM);
  if (!seam) {
    throw new Error("Production filter graph is missing the post-topology composite seam.");
  }
  const [, outerLabel, carrierLabel, overlayArgs] = seam;
  if (!ALLOWED_TOPOLOGY_COMPOSITES.has(`${outerLabel}:${carrierLabel}`)) {
    throw new Error("Production filter graph exposes an unsupported topology composite seam.");
  }

  const compiledEvents = compileTopologyEventSeam(
    eventResponse,
    compiled.geometry,
    carrierLabel,
    execution.timeline.timebase,
  );
  const replacement = `${compiledEvents.filters};\n[${outerLabel}][${compiledEvents.finalLabel}]overlay=${overlayArgs}[stage0]`;

  return Object.freeze({
    ...compiled,
    graph: compiled.graph.replace(TOPOLOGY_COMPOSITE_SEAM, replacement),
    topologyEvents: eventResponse.evidence,
    topologyEffects: eventResponse.effects,
    localDeformation: eventResponse.localDeformation,
  });
}

module.exports = {
  ALLOWED_GRAB_CARRIERS,
  ALLOWED_TOPOLOGY_COMPOSITES,
  TOPOLOGY_COMPOSITE_SEAM,
  applyTopologyEventSeam,
  compileGrabSeam,
  compileTopologyEventSeam,
  patchGeometry,
};
