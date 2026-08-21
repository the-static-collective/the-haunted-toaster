const { TEXT_OVERLAY_SEAM } = require("./atmosphere.cjs");
const {
  RESOLUTION_FIELD_POLICY,
  compileResolutionFieldPass,
} = require("./resolution-field.cjs");

function directAtmosphereSeam(fileName) {
  if (!/^[a-z0-9][a-z0-9._-]*\.ass$/i.test(fileName || "")) {
    throw new TypeError("Atmosphere Resolution Field requires a safe .ass basename.");
  }
  return (
    `[stage0]ass=filename='${fileName}':alpha=1[atmosphereStage];\n` +
    "[atmosphereStage]ass=filename='text-overlay.ass':alpha=1,format=yuv420p[vout]"
  );
}

function applyResolutionFieldToAtmosphereGraph({
  graph,
  fileName,
  width,
  height,
  scale,
}) {
  const directSeam = directAtmosphereSeam(fileName);
  if (!String(graph).includes(directSeam)) {
    throw new Error(
      "Atmosphere Resolution Field requires the canonical Atmosphere-before-typography seam.",
    );
  }

  const resolutionField = compileResolutionFieldPass({
    sourceLabel: "atmosphereResolutionSource",
    outputLabel: "atmosphereResolutionOut",
    width,
    height,
    scale,
    filters: [`ass=filename='${fileName}':alpha=1`],
  });

  const replacement = [
    "[stage0]split=2[atmosphereBase][atmosphereCarrier]",
    "[atmosphereCarrier]format=rgba,colorchannelmixer=aa=0[atmosphereResolutionSource]",
    resolutionField.graph,
    "[atmosphereBase][atmosphereResolutionOut]overlay=shortest=1:format=auto,setsar=1[atmosphereStage]",
    TEXT_OVERLAY_SEAM.replace("[stage0]", "[atmosphereStage]"),
  ].join(";\n");

  return Object.freeze({
    graph: String(graph).replace(directSeam, replacement),
    evidence: Object.freeze({
      policyVersion: RESOLUTION_FIELD_POLICY,
      scale: resolutionField.scale,
      internalWidth: resolutionField.internalWidth,
      internalHeight: resolutionField.internalHeight,
      outputWidth: resolutionField.outputWidth,
      outputHeight: resolutionField.outputHeight,
      protectedLayer: false,
    }),
  });
}

module.exports = {
  applyResolutionFieldToAtmosphereGraph,
  directAtmosphereSeam,
};
