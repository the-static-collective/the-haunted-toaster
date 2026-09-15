const ORGANISM_REGISTRY = Object.freeze({
  "PULSE@0.1.0": Object.freeze({
    id: "PULSE",
    version: "0.1.0",
    inputs: Object.freeze({ surface: "Surface", events: "EventGrid" }),
    output: "Surface",
    parameterKeys: Object.freeze([
      "attackMs",
      "holdMs",
      "decayMs",
      "scaleAmount",
      "rotationDeg",
      "translateXPx",
      "translateYPx",
      "opacityAmount",
      "brightnessAmount",
      "blurPx",
      "phaseOffsetMs",
    ]),
  }),
  "GHOST-TEXT@0.1.0": Object.freeze({
    id: "GHOST-TEXT",
    version: "0.1.0",
    inputs: Object.freeze({ surface: "Surface?", cues: "TextCue[]", font: "FontAsset" }),
    output: "Surface",
    parameterKeys: Object.freeze([
      "ghostCount",
      "ghostIntervalMs",
      "ghostLifetimeMs",
      "xDriftPx",
      "yDriftPx",
      "scaleDrift",
      "rotationDriftDeg",
      "blurGrowthPx",
      "opacityDecay",
      "blendMode",
      "clearMode",
    ]),
  }),
  "FRAME-EAT-FRAME@0.1.0": Object.freeze({
    id: "FRAME-EAT-FRAME",
    version: "0.1.0",
    inputs: Object.freeze({ surface: "Surface" }),
    output: "Surface",
    parameterKeys: Object.freeze([
      "depth",
      "stepMs",
      "scalePerDepth",
      "rotationPerDepthDeg",
      "cropPerDepth",
      "pivotX",
      "pivotY",
      "opacityPerDepth",
      "staggerMs",
      "entryOrder",
      "exitOrder",
    ]),
  }),
});

const SOURCE_NODE_REGISTRY = Object.freeze({
  ASSET: Object.freeze({
    version: "0.1.0",
    outputs: Object.freeze({ surface: "Surface", font: "FontAsset" }),
  }),
  "TEXT-CUES": Object.freeze({
    version: "0.1.0",
    outputs: Object.freeze({ cues: "TextCue[]" }),
  }),
  "EVENT-GRID": Object.freeze({
    version: "0.1.0",
    outputs: Object.freeze({ events: "EventGrid" }),
  }),
});

function getOrganismDefinition(id, version) {
  const key = `${String(id || "").trim()}@${String(version || "").trim()}`;
  const definition = ORGANISM_REGISTRY[key];
  if (!definition) {
    throw new TypeError(`Unsupported HyperFood organism: ${key}`);
  }
  return definition;
}

module.exports = {
  ORGANISM_REGISTRY,
  SOURCE_NODE_REGISTRY,
  getOrganismDefinition,
};
