const RESOLUTION_FIELD_POLICY = "resolution-field-v0.1";
const SUPPORTED_RESOLUTION_SCALES = Object.freeze([1, 0.5, 0.25]);
const LABEL_RE = /^[A-Za-z][A-Za-z0-9_]*$/;

function evenDimension(value, maximum) {
  const rounded = Math.max(2, Math.round(Number(value) / 2) * 2);
  return Math.min(maximum, rounded);
}

function acceptedDimension(value, label) {
  if (!Number.isSafeInteger(value) || value < 2) {
    throw new TypeError(`${label} must be an integer >= 2.`);
  }
  return value;
}

function acceptedLabel(value, label) {
  if (typeof value !== "string" || !LABEL_RE.test(value)) {
    throw new TypeError(`${label} must be a simple FFmpeg label.`);
  }
  return value;
}

function acceptedScale(value) {
  if (!SUPPORTED_RESOLUTION_SCALES.includes(value)) {
    throw new TypeError("Resolution Field scale must be exactly 1, 0.5, or 0.25.");
  }
  return value;
}

function acceptedFilters(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("Resolution Field filters must be a non-empty array.");
  }
  return Object.freeze(value.map((filter, index) => {
    if (
      typeof filter !== "string" ||
      filter.length === 0 ||
      filter.includes(";") ||
      filter.includes("[") ||
      filter.includes("]") ||
      filter.includes("\n") ||
      filter.includes("\r")
    ) {
      throw new TypeError(`Resolution Field filter ${index} is not a bounded filter expression.`);
    }
    return filter;
  }));
}

function compileResolutionFieldPass(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("Resolution Field options are required.");
  }

  const sourceLabel = acceptedLabel(options.sourceLabel, "sourceLabel");
  const outputLabel = acceptedLabel(options.outputLabel, "outputLabel");
  const width = acceptedDimension(options.width, "width");
  const height = acceptedDimension(options.height, "height");
  const scale = acceptedScale(options.scale);
  const protectedLayer = options.protectedLayer === true;
  const filters = acceptedFilters(options.filters);

  if (protectedLayer && scale !== 1) {
    throw new Error("Protected Resolution Field material cannot be downscaled.");
  }

  const internalWidth = evenDimension(width * scale, width);
  const internalHeight = evenDimension(height * scale, height);
  const graph = [
    `[${sourceLabel}]scale=${internalWidth}:${internalHeight}:flags=bicubic,setsar=1[resolutionFieldWorking]`,
    `[resolutionFieldWorking]${filters.join(",")}[resolutionFieldEffect]`,
    `[resolutionFieldEffect]scale=${width}:${height}:flags=bicubic,setsar=1[${outputLabel}]`,
  ].join(";\n");

  return Object.freeze({
    policyVersion: RESOLUTION_FIELD_POLICY,
    scale,
    internalWidth,
    internalHeight,
    outputWidth: width,
    outputHeight: height,
    protectedLayer,
    graph,
  });
}

module.exports = {
  RESOLUTION_FIELD_POLICY,
  SUPPORTED_RESOLUTION_SCALES,
  compileResolutionFieldPass,
};
