const {
  normalizeByteLength,
  normalizeSha256,
} = require("../video-pantry/schema.cjs");
const {
  getOrganismDefinition,
} = require("./registry.cjs");

const HYPERFOOD_SPEC_SCHEMA = "haunted-toaster/hyperfood-spec/v0.1";
const MAX_CUE_TEXT_LENGTH = 1000;

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new TypeError(`${label} must be a safe integer in [${min}, ${max}].`);
  }
  return number;
}

function finite(value, label, { min = -Infinity, max = Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  }
  return number;
}

function oneOf(value, label, allowed) {
  const normalized = String(value || "").trim();
  if (!allowed.includes(normalized)) {
    throw new TypeError(`${label} must be one of: ${allowed.join(", ")}.`);
  }
  return normalized;
}

function normalizeEventGrid(events, durationMs) {
  if (!Array.isArray(events)) {
    throw new TypeError("HyperFood events must be an array.");
  }
  const byTime = new Map();
  for (const event of events) {
    const tMs = integer(event?.tMs, "HyperFood event time");
    if (tMs > durationMs) {
      throw new RangeError("HyperFood event time exceeds duration.");
    }
    const strength = finite(event?.strength, "HyperFood event strength", {
      min: 0,
      max: 1,
    });
    byTime.set(tMs, Math.max(byTime.get(tMs) ?? 0, strength));
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tMs, strength]) => ({ tMs, strength }));
}

function normalizeTextCues(cues, durationMs) {
  if (!Array.isArray(cues)) {
    throw new TypeError("HyperFood text cues must be an array.");
  }
  return cues
    .map((cue) => {
      const text = String(cue?.text ?? "").trim();
      if (!text || text.length > MAX_CUE_TEXT_LENGTH) {
        throw new TypeError(
          `HyperFood cue text must contain 1..${MAX_CUE_TEXT_LENGTH} characters.`,
        );
      }
      const startMs = integer(cue?.startMs, "HyperFood cue startMs");
      const clearMs = integer(cue?.clearMs, "HyperFood cue clearMs");
      if (startMs > clearMs) {
        throw new RangeError("HyperFood cue startMs must not exceed clearMs.");
      }
      if (clearMs > durationMs) {
        throw new RangeError("HyperFood cue clearMs exceeds duration.");
      }
      return { text, startMs, clearMs };
    })
    .sort(
      (a, b) =>
        a.startMs - b.startMs
        || a.clearMs - b.clearMs
        || a.text.localeCompare(b.text),
    );
}

function normalizeAssets(assets) {
  if (!Array.isArray(assets)) {
    throw new TypeError("HyperFood assets must be an array.");
  }
  const ids = new Set();
  return assets
    .map((asset) => {
      const id = String(asset?.id || "").trim();
      if (!id || ids.has(id)) {
        throw new TypeError(`HyperFood asset id is missing or duplicated: ${id}`);
      }
      ids.add(id);
      const mediaType = String(asset?.mediaType || "").trim().toLowerCase();
      if (!mediaType) {
        throw new TypeError(`HyperFood asset ${id} requires mediaType.`);
      }
      return {
        id,
        mediaType,
        sha256: normalizeSha256(asset?.sha256),
        byteLength: normalizeByteLength(asset?.byteLength),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

const PARAMETER_RULES = Object.freeze({
  "PULSE@0.1.0": Object.freeze({
    attackMs: (value) => integer(value, "HyperFood PULSE attackMs", { max: 60000 }),
    holdMs: (value) => integer(value, "HyperFood PULSE holdMs", { max: 60000 }),
    decayMs: (value) => integer(value, "HyperFood PULSE decayMs", { max: 60000 }),
    phaseOffsetMs: (value) => integer(value, "HyperFood PULSE phaseOffsetMs", { max: 60000 }),
    scaleAmount: (value) => finite(value, "HyperFood PULSE scaleAmount", { min: -1, max: 4 }),
    rotationDeg: (value) => finite(value, "HyperFood PULSE rotationDeg", { min: -360, max: 360 }),
    translateXPx: (value) => finite(value, "HyperFood PULSE translateXPx", { min: -10000, max: 10000 }),
    translateYPx: (value) => finite(value, "HyperFood PULSE translateYPx", { min: -10000, max: 10000 }),
    opacityAmount: (value) => finite(value, "HyperFood PULSE opacityAmount", { min: -1, max: 1 }),
    brightnessAmount: (value) => finite(value, "HyperFood PULSE brightnessAmount", { min: -1, max: 4 }),
    blurPx: (value) => finite(value, "HyperFood PULSE blurPx", { min: 0, max: 1000 }),
  }),
  "GHOST-TEXT@0.1.0": Object.freeze({
    ghostCount: (value) => integer(value, "HyperFood GHOST-TEXT ghostCount", { max: 128 }),
    ghostIntervalMs: (value) => integer(value, "HyperFood GHOST-TEXT ghostIntervalMs", { max: 60000 }),
    ghostLifetimeMs: (value) => integer(value, "HyperFood GHOST-TEXT ghostLifetimeMs", { max: 60000 }),
    xDriftPx: (value) => finite(value, "HyperFood GHOST-TEXT xDriftPx", { min: -10000, max: 10000 }),
    yDriftPx: (value) => finite(value, "HyperFood GHOST-TEXT yDriftPx", { min: -10000, max: 10000 }),
    scaleDrift: (value) => finite(value, "HyperFood GHOST-TEXT scaleDrift", { min: -4, max: 4 }),
    rotationDriftDeg: (value) => finite(value, "HyperFood GHOST-TEXT rotationDriftDeg", { min: -360, max: 360 }),
    blurGrowthPx: (value) => finite(value, "HyperFood GHOST-TEXT blurGrowthPx", { min: 0, max: 1000 }),
    opacityDecay: (value) => finite(value, "HyperFood GHOST-TEXT opacityDecay", { min: 0, max: 1 }),
    blendMode: (value) => oneOf(value, "HyperFood GHOST-TEXT blendMode", [
      "normal",
      "screen",
      "multiply",
      "difference",
      "overlay",
    ]),
    clearMode: (value) => oneOf(value, "HyperFood GHOST-TEXT clearMode", ["hard", "fade"]),
  }),
  "FRAME-EAT-FRAME@0.1.0": Object.freeze({
    depth: (value) => integer(value, "HyperFood FRAME-EAT-FRAME depth", { min: 1, max: 64 }),
    stepMs: (value) => integer(value, "HyperFood FRAME-EAT-FRAME stepMs", { max: 60000 }),
    staggerMs: (value) => integer(value, "HyperFood FRAME-EAT-FRAME staggerMs", { max: 60000 }),
    scalePerDepth: (value) => finite(value, "HyperFood FRAME-EAT-FRAME scalePerDepth", { min: 0.01, max: 4 }),
    rotationPerDepthDeg: (value) => finite(value, "HyperFood FRAME-EAT-FRAME rotationPerDepthDeg", { min: -360, max: 360 }),
    cropPerDepth: (value) => finite(value, "HyperFood FRAME-EAT-FRAME cropPerDepth", { min: 0, max: 0.95 }),
    pivotX: (value) => finite(value, "HyperFood FRAME-EAT-FRAME pivotX", { min: 0, max: 1 }),
    pivotY: (value) => finite(value, "HyperFood FRAME-EAT-FRAME pivotY", { min: 0, max: 1 }),
    opacityPerDepth: (value) => finite(value, "HyperFood FRAME-EAT-FRAME opacityPerDepth", { min: 0, max: 1 }),
    entryOrder: (value) => oneOf(value, "HyperFood FRAME-EAT-FRAME entryOrder", ["outer-first", "inner-first"]),
    exitOrder: (value) => oneOf(value, "HyperFood FRAME-EAT-FRAME exitOrder", ["outer-first", "inner-first"]),
  }),
});

function normalizeOrganismParameters(definition, parameters) {
  if (parameters === undefined) return {};
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    throw new TypeError("HyperFood parameters must be an object.");
  }
  const key = `${definition.id}@${definition.version}`;
  const rules = PARAMETER_RULES[key];
  const output = {};
  for (const name of Object.keys(parameters).sort()) {
    if (!definition.parameterKeys.includes(name) || !rules[name]) {
      throw new TypeError(`Unsupported HyperFood parameter for ${key}: ${name}`);
    }
    output[name] = rules[name](parameters[name]);
  }
  return output;
}

function surfaceMediaType(mediaType) {
  return mediaType.startsWith("image/") || mediaType.startsWith("video/");
}

function fontMediaType(mediaType) {
  return mediaType.startsWith("font/") || mediaType.startsWith("application/font-");
}

function resolveAssetBinding(binding, portName, expectedType, assetsById) {
  const assetId = String(binding?.asset || "").trim();
  const asset = assetsById.get(assetId);
  if (!asset) {
    throw new TypeError(`HyperFood input binding ${portName} references missing asset: ${assetId}`);
  }
  if (expectedType === "Surface" && !surfaceMediaType(asset.mediaType)) {
    throw new TypeError(`HyperFood input binding ${portName} requires a Surface asset.`);
  }
  if (expectedType === "FontAsset" && !fontMediaType(asset.mediaType)) {
    throw new TypeError(`HyperFood input binding ${portName} requires a FontAsset.`);
  }
  return { asset: assetId };
}

function resolveTimingBinding(binding, portName, expectedType, timing) {
  const field = String(binding?.timingField || "").trim();
  const expectedField = expectedType === "EventGrid" ? "events" : "cues";
  if (field !== expectedField || !hasOwn(timing, expectedField)) {
    throw new TypeError(
      `HyperFood input binding ${portName} must reference timingField ${expectedField}.`,
    );
  }
  return { timingField: expectedField };
}

function resolveSingleOrganismInputs(spec) {
  const definition = getOrganismDefinition(spec?.organism?.id, spec?.organism?.version);
  const inputs = spec?.inputs;
  if (!inputs || typeof inputs !== "object" || Array.isArray(inputs)) {
    throw new TypeError("HyperFood single-organism inputs must be an object.");
  }
  for (const name of Object.keys(inputs)) {
    if (!hasOwn(definition.inputs, name)) {
      throw new TypeError(`Unknown HyperFood input binding: ${name}`);
    }
  }

  const assetsById = new Map((spec.assets || []).map((asset) => [asset.id, asset]));
  const output = {};
  for (const [portName, rawType] of Object.entries(definition.inputs)) {
    const optional = rawType.endsWith("?");
    const expectedType = optional ? rawType.slice(0, -1) : rawType;
    if (!hasOwn(inputs, portName)) {
      if (optional) continue;
      throw new TypeError(`HyperFood input binding ${portName} is required.`);
    }
    if (expectedType === "Surface" || expectedType === "FontAsset") {
      output[portName] = resolveAssetBinding(inputs[portName], portName, expectedType, assetsById);
    } else if (expectedType === "EventGrid" || expectedType === "TextCue[]") {
      output[portName] = resolveTimingBinding(inputs[portName], portName, expectedType, spec.timing);
    } else {
      throw new TypeError(`Unsupported HyperFood input type: ${expectedType}`);
    }
  }
  return output;
}

function normalizeTiming(inputTiming, durationMs) {
  const timing = { durationMs };
  if (hasOwn(inputTiming, "events")) {
    timing.events = normalizeEventGrid(inputTiming.events, durationMs);
  }
  if (hasOwn(inputTiming, "cues")) {
    timing.cues = normalizeTextCues(inputTiming.cues, durationMs);
  }
  for (const key of Object.keys(inputTiming)) {
    if (!["durationMs", "events", "cues"].includes(key)) {
      throw new TypeError(`Unsupported HyperFood timing field: ${key}`);
    }
  }
  return timing;
}

function normalizeHyperFoodSpec(input) {
  if (!input || typeof input !== "object" || input.schema !== HYPERFOOD_SPEC_SCHEMA) {
    throw new TypeError(`Expected ${HYPERFOOD_SPEC_SCHEMA}.`);
  }
  if (!input.timing || typeof input.timing !== "object" || Array.isArray(input.timing)) {
    throw new TypeError("HyperFood timing must be an object.");
  }

  const durationMs = integer(input.timing.durationMs, "HyperFood durationMs", { min: 1 });
  const assets = normalizeAssets(input.assets || []);
  const timing = normalizeTiming(input.timing, durationMs);
  const target = {
    width: integer(input.target?.width, "HyperFood target width", { min: 1 }),
    height: integer(input.target?.height, "HyperFood target height", { min: 1 }),
    fps: integer(input.target?.fps, "HyperFood target fps", { min: 1 }),
    alpha: Boolean(input.target?.alpha),
  };
  const seed = integer(input.seed ?? 0, "HyperFood seed");

  if (input.graph !== undefined) {
    if (input.organism !== undefined || input.inputs !== undefined || input.parameters !== undefined) {
      throw new TypeError(
        "HyperFood graph specs cannot also declare top-level organism, inputs, or parameters.",
      );
    }
    const { normalizeHyperFoodGraph } = require("./graph.cjs");
    const graph = normalizeHyperFoodGraph(input.graph, { assets, timing });
    return {
      schema: HYPERFOOD_SPEC_SCHEMA,
      assets,
      timing,
      seed,
      target,
      graph,
    };
  }

  const definition = getOrganismDefinition(input.organism?.id, input.organism?.version);
  const organism = { id: definition.id, version: definition.version };
  const parameters = normalizeOrganismParameters(definition, input.parameters);
  const partiallyNormalized = {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism,
    assets,
    inputs: input.inputs,
    timing,
    parameters,
    seed,
    target,
  };
  const inputs = resolveSingleOrganismInputs(partiallyNormalized);
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism,
    assets,
    inputs,
    timing,
    parameters,
    seed,
    target,
  };
}

module.exports = {
  HYPERFOOD_SPEC_SCHEMA,
  normalizeEventGrid,
  normalizeHyperFoodSpec,
  normalizeOrganismParameters,
  normalizeTextCues,
  resolveSingleOrganismInputs,
};
