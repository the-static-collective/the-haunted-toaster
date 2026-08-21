const { compileTopologyEvents } = require("./topology-events.cjs");

const TOPOLOGY_COMPOSITE_SEAM = /\[base\]\[waveFull\]overlay=([^;\n]+)\[stage0\]/;

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
    throw new TypeError("GRAB requires accepted production frame geometry.");
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
  if (!Number.isFinite(number)) throw new TypeError("GRAB seam value must be finite.");
  return String(Math.round(number * 1e6) / 1e6);
}

function scaleExpression(stretch, xGain, yGain) {
  return `scale=w='max(2,trunc(iw*(1+${ff(xGain)}*abs(${stretch}))/2)*2)':h='max(2,trunc(ih*(1+${ff(yGain)}*abs(${stretch}))/2)*2)':eval=frame`;
}

function compileGrabSeam(eventResponse, geometry) {
  const local = eventResponse.localDeformation;
  if (!local || local.kind !== "grab") {
    throw new TypeError("Topology event seam requires a compiled GRAB local deformation.");
  }
  const g = patchGeometry(local, geometry);
  const { vectorX, vectorY, stretch, enable } = local.expressions;
  const falloff = clamp(local.falloff, 0, 1);
  const outerAlpha = ff(0.18 + falloff * 0.28);
  const innerAlpha = ff(0.62 + falloff * 0.25);
  const outerTravel = ff(0.48 + falloff * 0.16);

  return [
    "[waveFull]split=3[grabTopologyBase][grabOuterSource][grabInnerSource]",
    `[grabOuterSource]crop=${g.outerWidth}:${g.outerHeight}:${g.outerX}:${g.outerY},${scaleExpression(stretch, 0.22, 0.12)},colorchannelmixer=aa=${outerAlpha}[grabOuterPatch]`,
    `[grabInnerSource]crop=${g.innerWidth}:${g.innerHeight}:${g.innerX}:${g.innerY},${scaleExpression(stretch, 0.46, 0.24)},colorchannelmixer=aa=${innerAlpha}[grabInnerPatch]`,
    `[grabTopologyBase][grabOuterPatch]overlay=x='${g.outerX}+(${vectorX})*main_w*${outerTravel}-(overlay_w-${g.outerWidth})/2':y='${g.outerY}+(${vectorY})*main_h*${outerTravel}-(overlay_h-${g.outerHeight})/2':enable='${enable}':format=auto:eof_action=pass[grabOuterComposite]`,
    `[grabOuterComposite][grabInnerPatch]overlay=x='${g.innerX}+(${vectorX})*main_w-(overlay_w-${g.innerWidth})/2':y='${g.innerY}+(${vectorY})*main_h-(overlay_h-${g.innerHeight})/2':enable='${enable}':format=auto:eof_action=pass[grabTopologyFinal]`,
  ].join(";\n");
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
  const localFilters = compileGrabSeam(eventResponse, compiled.geometry);
  const replacement = `${localFilters};\n[base][grabTopologyFinal]overlay=${seam[1]}[stage0]`;

  return Object.freeze({
    ...compiled,
    graph: compiled.graph.replace(TOPOLOGY_COMPOSITE_SEAM, replacement),
    topologyEvents: eventResponse.evidence,
    localDeformation: eventResponse.localDeformation,
  });
}

module.exports = {
  TOPOLOGY_COMPOSITE_SEAM,
  applyTopologyEventSeam,
  compileGrabSeam,
  patchGeometry,
};
