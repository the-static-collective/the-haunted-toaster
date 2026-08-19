const {
  addressCanonical,
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const { PRNG_ID } = require("./prng.cjs");

const VISUAL_SCORE_SCHEMA = "haunted-toaster/visual-score/v1";
const CONSTRAINTS_SCHEMA = "haunted-toaster/garment-constraints/v1";
const PROFILE_SCHEMA = "haunted-toaster/renderer-profile/v1";
const ANALYSIS_SCHEMA = "haunted-toaster/audio-analysis-fixture/v1";
const TIMELINE_SCHEMA = "haunted-toaster/resolved-timeline/v1";

const TOPOLOGIES = Object.freeze(["linear", "circle", "mirrored-ring", "spiral", "quad-mirror", "elastic-spine", "split-horizon", "cathedral-fan", "echo-tunnel"]);
const MOTION_GRAMMARS = Object.freeze(["still", "drift", "pulse", "orbit", "fracture"]);
const PALETTE_LOGICS = Object.freeze(["garment", "analogous", "split-complement", "duotone"]);
const MATERIAL_TEXTURES = Object.freeze(["clean", "grain", "photocopy", "gate-weave"]);
const LYRIC_PLACEMENTS = Object.freeze(["lower-third", "center", "orbit", "ghost"]);
const CAMERA_GRAMMARS = Object.freeze(["locked", "drift", "push", "orbit"]);
const TEMPORAL_DENSITIES = Object.freeze(["frozen", "section", "phrase", "transient"]);
const PATCH_AXES = Object.freeze(["motion", "palette", "material", "lyric", "camera"]);
const BOUNDARIES = Object.freeze(["section", "phrase", "transient"]);
const TRANSITIONS = Object.freeze(["cut", "crossfade", "interpolate"]);

const SCORE_KEYS = Object.freeze([
  "schema",
  "seed",
  "prng",
  "topology",
  "motion",
  "palette",
  "material",
  "lyric",
  "camera",
  "temporalDensity",
  "influence",
]);

const FORBIDDEN_DOCUMENT_PATTERN = /(?:https?:\/\/|file:\/\/|(?:^|[\\/])\.\.?[\\/]|[A-Za-z]:[\\/]|\b(?:eval|function|shader|expression)\b)/i;

function error(path, code, message) {
  return { path, code, message };
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected, path, errors) {
  if (!isPlainObject(value)) {
    errors.push(error(path, "EXPECTED_OBJECT", "Expected a plain object."));
    return false;
  }
  const expectedSet = new Set(expected);
  for (const key of Object.keys(value)) {
    if (!expectedSet.has(key)) {
      errors.push(error(`${path}.${key}`, "UNKNOWN_FIELD", "Unknown field."));
    }
  }
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) {
      errors.push(error(`${path}.${key}`, "MISSING_FIELD", "Required field is missing."));
    }
  }
  return true;
}

function stringValue(value, path, errors, { max = 160, pattern = null, safe = true } = {}) {
  if (typeof value !== "string" || !value.length || value.length > max) {
    errors.push(error(path, "INVALID_STRING", `Expected a non-empty string up to ${max} characters.`));
    return;
  }
  if (safe && FORBIDDEN_DOCUMENT_PATTERN.test(value)) {
    errors.push(error(path, "FORBIDDEN_DOCUMENT_VALUE", "Paths, URLs, expressions, and executable source are forbidden."));
  }
  if (pattern && !pattern.test(value)) {
    errors.push(error(path, "INVALID_STRING_FORMAT", "String has an invalid format."));
  }
}

function enumValue(value, allowed, path, errors) {
  if (!allowed.includes(value)) {
    errors.push(error(path, "UNKNOWN_IDENTIFIER", `Expected one of: ${allowed.join(", ")}.`));
  }
}

function numberValue(value, path, errors, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(error(path, "NON_FINITE_NUMBER", "Expected a finite number."));
    return;
  }
  if (value < minimum || value > maximum) {
    errors.push(error(path, "OUT_OF_RANGE", `Expected ${minimum}..${maximum}.`));
  }
}

function parseInput(input, errors) {
  if (typeof input !== "string") return input;
  if (Buffer.byteLength(input, "utf8") > 128_000) {
    errors.push(error("$", "DOCUMENT_TOO_LARGE", "Document exceeds 128 KB."));
    return null;
  }
  try {
    return JSON.parse(input);
  } catch (parseError) {
    errors.push(error("$", "INVALID_JSON", parseError.message));
    return null;
  }
}

function validateVisualScore(input) {
  const errors = [];
  const value = parseInput(input, errors);
  if (!value || !exactKeys(value, SCORE_KEYS, "$", errors)) return { ok: false, errors };

  if (value.schema !== VISUAL_SCORE_SCHEMA) {
    errors.push(error("$.schema", "UNKNOWN_SCHEMA", `Expected ${VISUAL_SCORE_SCHEMA}.`));
  }
  stringValue(value.seed, "$.seed", errors, { max: 256 });
  if (value.prng !== PRNG_ID) {
    errors.push(error("$.prng", "UNKNOWN_PRNG", `Expected ${PRNG_ID}.`));
  }
  enumValue(value.topology, TOPOLOGIES, "$.topology", errors);

  if (exactKeys(value.motion, ["grammar", "amplitude", "variance"], "$.motion", errors)) {
    enumValue(value.motion.grammar, MOTION_GRAMMARS, "$.motion.grammar", errors);
    numberValue(value.motion.amplitude, "$.motion.amplitude", errors, 0, 1);
    numberValue(value.motion.variance, "$.motion.variance", errors, 0, 1);
  }
  if (exactKeys(value.palette, ["logic", "bleed", "contrastBias"], "$.palette", errors)) {
    enumValue(value.palette.logic, PALETTE_LOGICS, "$.palette.logic", errors);
    numberValue(value.palette.bleed, "$.palette.bleed", errors, 0, 1);
    numberValue(value.palette.contrastBias, "$.palette.contrastBias", errors, -1, 1);
  }
  if (exactKeys(value.material, ["texture", "imperfection"], "$.material", errors)) {
    enumValue(value.material.texture, MATERIAL_TEXTURES, "$.material.texture", errors);
    numberValue(value.material.imperfection, "$.material.imperfection", errors, 0, 1);
  }
  if (exactKeys(value.lyric, ["placement", "densityBias"], "$.lyric", errors)) {
    enumValue(value.lyric.placement, LYRIC_PLACEMENTS, "$.lyric.placement", errors);
    numberValue(value.lyric.densityBias, "$.lyric.densityBias", errors, -1, 1);
  }
  if (exactKeys(value.camera, ["grammar", "variance"], "$.camera", errors)) {
    enumValue(value.camera.grammar, CAMERA_GRAMMARS, "$.camera.grammar", errors);
    numberValue(value.camera.variance, "$.camera.variance", errors, 0, 1);
  }
  enumValue(value.temporalDensity, TEMPORAL_DENSITIES, "$.temporalDensity", errors);

  const influenceKeys = [
    "energyBias",
    "transientDensity",
    "lyricDensity",
    "contrastBias",
    "motionVariance",
    "imperfection",
  ];
  if (exactKeys(value.influence, influenceKeys, "$.influence", errors)) {
    numberValue(value.influence.energyBias, "$.influence.energyBias", errors, -1, 1);
    numberValue(value.influence.transientDensity, "$.influence.transientDensity", errors, 0, 1);
    numberValue(value.influence.lyricDensity, "$.influence.lyricDensity", errors, 0, 1);
    numberValue(value.influence.contrastBias, "$.influence.contrastBias", errors, -1, 1);
    numberValue(value.influence.motionVariance, "$.influence.motionVariance", errors, 0, 1);
    numberValue(value.influence.imperfection, "$.influence.imperfection", errors, 0, 1);
  }

  if (errors.length) return { ok: false, errors };
  const score = deepFreeze(JSON.parse(canonicalStringify(value)));
  return {
    ok: true,
    value: score,
    canonicalJson: canonicalStringify(score),
    address: addressVisualScore(score),
  };
}

function parseVisualScore(input) {
  return validateVisualScore(input);
}

function addressVisualScore(score) {
  return addressCanonical(score, {
    domain: "HauntedToaster-VisualScore-v1",
    prefix: "htvs1_",
  });
}

function rangeObject(value, path, errors, minimum, maximum) {
  if (!exactKeys(value, ["min", "max"], path, errors)) return;
  numberValue(value.min, `${path}.min`, errors, minimum, maximum);
  numberValue(value.max, `${path}.max`, errors, minimum, maximum);
  if (Number.isFinite(value.min) && Number.isFinite(value.max) && value.min > value.max) {
    errors.push(error(path, "INVERTED_RANGE", "Range min exceeds max."));
  }
}

function enumRange(value, path, errors, universe) {
  if (!exactKeys(value, ["allowed"], path, errors)) return;
  if (!Array.isArray(value.allowed) || !value.allowed.length || value.allowed.length > universe.length) {
    errors.push(error(`${path}.allowed`, "INVALID_ENUM_RANGE", "Expected a non-empty bounded array."));
    return;
  }
  const seen = new Set();
  value.allowed.forEach((item, index) => {
    enumValue(item, universe, `${path}.allowed[${index}]`, errors);
    if (seen.has(item)) errors.push(error(`${path}.allowed[${index}]`, "DUPLICATE_VALUE", "Duplicate enum value."));
    seen.add(item);
  });
}

function validateConstraints(input) {
  const errors = [];
  const value = parseInput(input, errors);
  const keys = [
    "schema", "id", "topology", "motion", "palette", "material", "lyric",
    "camera", "temporalDensity", "influence", "patchPolicy",
  ];
  if (!value || !exactKeys(value, keys, "$", errors)) return { ok: false, errors };
  if (value.schema !== CONSTRAINTS_SCHEMA) errors.push(error("$.schema", "UNKNOWN_SCHEMA", `Expected ${CONSTRAINTS_SCHEMA}.`));
  stringValue(value.id, "$.id", errors, { max: 80, pattern: /^[a-z0-9][a-z0-9-]*$/ });
  enumRange(value.topology, "$.topology", errors, TOPOLOGIES);

  if (exactKeys(value.motion, ["grammar", "amplitude", "variance"], "$.motion", errors)) {
    enumRange(value.motion.grammar, "$.motion.grammar", errors, MOTION_GRAMMARS);
    rangeObject(value.motion.amplitude, "$.motion.amplitude", errors, 0, 1);
    rangeObject(value.motion.variance, "$.motion.variance", errors, 0, 1);
  }
  if (exactKeys(value.palette, ["logic", "bleed", "contrastBias"], "$.palette", errors)) {
    enumRange(value.palette.logic, "$.palette.logic", errors, PALETTE_LOGICS);
    rangeObject(value.palette.bleed, "$.palette.bleed", errors, 0, 1);
    rangeObject(value.palette.contrastBias, "$.palette.contrastBias", errors, -1, 1);
  }
  if (exactKeys(value.material, ["texture", "imperfection"], "$.material", errors)) {
    enumRange(value.material.texture, "$.material.texture", errors, MATERIAL_TEXTURES);
    rangeObject(value.material.imperfection, "$.material.imperfection", errors, 0, 1);
  }
  if (exactKeys(value.lyric, ["placement", "densityBias"], "$.lyric", errors)) {
    enumRange(value.lyric.placement, "$.lyric.placement", errors, LYRIC_PLACEMENTS);
    rangeObject(value.lyric.densityBias, "$.lyric.densityBias", errors, -1, 1);
  }
  if (exactKeys(value.camera, ["grammar", "variance"], "$.camera", errors)) {
    enumRange(value.camera.grammar, "$.camera.grammar", errors, CAMERA_GRAMMARS);
    rangeObject(value.camera.variance, "$.camera.variance", errors, 0, 1);
  }
  enumRange(value.temporalDensity, "$.temporalDensity", errors, TEMPORAL_DENSITIES);

  const influenceKeys = ["energyBias", "transientDensity", "lyricDensity", "contrastBias", "motionVariance", "imperfection"];
  if (exactKeys(value.influence, influenceKeys, "$.influence", errors)) {
    for (const key of influenceKeys) {
      const minimum = ["energyBias", "contrastBias"].includes(key) ? -1 : 0;
      rangeObject(value.influence[key], `$.influence.${key}`, errors, minimum, 1);
    }
  }

  if (exactKeys(value.patchPolicy, ["maxPatches", "entropyBudget", "axes"], "$.patchPolicy", errors)) {
    numberValue(value.patchPolicy.maxPatches, "$.patchPolicy.maxPatches", errors, 0, 128);
    numberValue(value.patchPolicy.entropyBudget, "$.patchPolicy.entropyBudget", errors, 0, 1024);
    if (!Number.isInteger(value.patchPolicy.maxPatches)) errors.push(error("$.patchPolicy.maxPatches", "EXPECTED_INTEGER", "Expected an integer."));
    if (!Number.isInteger(value.patchPolicy.entropyBudget)) errors.push(error("$.patchPolicy.entropyBudget", "EXPECTED_INTEGER", "Expected an integer."));
    if (exactKeys(value.patchPolicy.axes, PATCH_AXES, "$.patchPolicy.axes", errors)) {
      for (const axis of PATCH_AXES) {
        const policy = value.patchPolicy.axes[axis];
        if (!exactKeys(policy, ["boundaries", "transition", "entropyCost"], `$.patchPolicy.axes.${axis}`, errors)) continue;
        if (!Array.isArray(policy.boundaries) || policy.boundaries.length > BOUNDARIES.length) {
          errors.push(error(`$.patchPolicy.axes.${axis}.boundaries`, "INVALID_BOUNDARIES", "Expected a bounded boundary array."));
        } else {
          policy.boundaries.forEach((boundary, index) => enumValue(boundary, BOUNDARIES, `$.patchPolicy.axes.${axis}.boundaries[${index}]`, errors));
        }
        enumValue(policy.transition, TRANSITIONS, `$.patchPolicy.axes.${axis}.transition`, errors);
        numberValue(policy.entropyCost, `$.patchPolicy.axes.${axis}.entropyCost`, errors, 1, 128);
        if (!Number.isInteger(policy.entropyCost)) errors.push(error(`$.patchPolicy.axes.${axis}.entropyCost`, "EXPECTED_INTEGER", "Expected an integer."));
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  const constraints = deepFreeze(JSON.parse(canonicalStringify(value)));
  return {
    ok: true,
    value: constraints,
    hash: hashCanonical(constraints, "HauntedToaster-GarmentConstraints-v1"),
  };
}

function validateRendererProfile(input) {
  const errors = [];
  const value = parseInput(input, errors);
  if (!value || !exactKeys(value, ["schema", "id", "canvas", "timebase", "colorSpace", "fontAssets", "encoder"], "$", errors)) {
    return { ok: false, errors };
  }
  if (value.schema !== PROFILE_SCHEMA) errors.push(error("$.schema", "UNKNOWN_SCHEMA", `Expected ${PROFILE_SCHEMA}.`));
  stringValue(value.id, "$.id", errors, { max: 80, pattern: /^[a-z0-9][a-z0-9-]*$/ });
  if (exactKeys(value.canvas, ["width", "height", "fps"], "$.canvas", errors)) {
    numberValue(value.canvas.width, "$.canvas.width", errors, 64, 16384);
    numberValue(value.canvas.height, "$.canvas.height", errors, 64, 16384);
    numberValue(value.canvas.fps, "$.canvas.fps", errors, 1, 240);
    for (const key of ["width", "height", "fps"]) if (!Number.isInteger(value.canvas[key])) errors.push(error(`$.canvas.${key}`, "EXPECTED_INTEGER", "Expected an integer."));
  }
  numberValue(value.timebase, "$.timebase", errors, 100, 1_000_000);
  if (!Number.isInteger(value.timebase)) errors.push(error("$.timebase", "EXPECTED_INTEGER", "Expected an integer."));
  if (value.colorSpace !== "srgb") errors.push(error("$.colorSpace", "UNKNOWN_COLOR_SPACE", "Expected srgb."));
  if (!isPlainObject(value.fontAssets) || Object.keys(value.fontAssets).length > 16) {
    errors.push(error("$.fontAssets", "INVALID_ASSET_MAP", "Expected at most 16 font hash entries."));
  } else {
    for (const [name, hash] of Object.entries(value.fontAssets)) {
      stringValue(name, `$.fontAssets.${name}`, errors, { max: 80, pattern: /^[a-z0-9][a-z0-9-]*$/ });
      stringValue(hash, `$.fontAssets.${name}`, errors, { max: 64, pattern: /^[0-9a-f]{64}$/i, safe: false });
    }
  }
  if (exactKeys(value.encoder, ["codec", "profile", "pixelFormat", "crf"], "$.encoder", errors)) {
    if (value.encoder.codec !== "h264") errors.push(error("$.encoder.codec", "UNKNOWN_CODEC", "Expected h264."));
    stringValue(value.encoder.profile, "$.encoder.profile", errors, { max: 40 });
    stringValue(value.encoder.pixelFormat, "$.encoder.pixelFormat", errors, { max: 40 });
    numberValue(value.encoder.crf, "$.encoder.crf", errors, 0, 51);
    if (!Number.isInteger(value.encoder.crf)) errors.push(error("$.encoder.crf", "EXPECTED_INTEGER", "Expected an integer."));
  }
  if (errors.length) return { ok: false, errors };
  const profile = deepFreeze(JSON.parse(canonicalStringify(value)));
  return { ok: true, value: profile, hash: hashCanonical(profile, "HauntedToaster-RendererProfile-v1") };
}

function validateBoundaryArray(values, path, errors, duration, mode) {
  if (!Array.isArray(values) || values.length > 4096) {
    errors.push(error(path, "INVALID_BOUNDARY_ARRAY", "Expected an array with at most 4096 entries."));
    return;
  }
  let prior = -1;
  values.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    const keys = mode === "section" ? ["startSeconds", "endSeconds", "energy", "label"] : ["atSeconds", "energy"];
    if (!exactKeys(item, keys, itemPath, errors)) return;
    const at = mode === "section" ? item.startSeconds : item.atSeconds;
    numberValue(at, `${itemPath}.${mode === "section" ? "startSeconds" : "atSeconds"}`, errors, 0, duration);
    if (at < prior) errors.push(error(itemPath, "UNSORTED_BOUNDARY", "Boundaries must be sorted."));
    prior = at;
    numberValue(item.energy, `${itemPath}.energy`, errors, 0, 1);
    if (mode === "section") {
      numberValue(item.endSeconds, `${itemPath}.endSeconds`, errors, 0, duration);
      if (item.endSeconds <= item.startSeconds) errors.push(error(itemPath, "INVALID_INTERVAL", "Section end must exceed start."));
      stringValue(item.label, `${itemPath}.label`, errors, { max: 120 });
    }
  });
}

function validateAnalysis(input) {
  const errors = [];
  const value = parseInput(input, errors);
  if (!value || !exactKeys(value, ["schema", "durationSeconds", "sections", "phrases", "transients"], "$", errors)) {
    return { ok: false, errors };
  }
  if (value.schema !== ANALYSIS_SCHEMA) errors.push(error("$.schema", "UNKNOWN_SCHEMA", `Expected ${ANALYSIS_SCHEMA}.`));
  numberValue(value.durationSeconds, "$.durationSeconds", errors, 0.001, 86_400);
  if (Number.isFinite(value.durationSeconds)) {
    validateBoundaryArray(value.sections, "$.sections", errors, value.durationSeconds, "section");
    validateBoundaryArray(value.phrases, "$.phrases", errors, value.durationSeconds, "point");
    validateBoundaryArray(value.transients, "$.transients", errors, value.durationSeconds, "point");
  }
  if (!Array.isArray(value.sections) || !value.sections.length) errors.push(error("$.sections", "EMPTY_SECTIONS", "At least one section is required."));
  if (errors.length) return { ok: false, errors };
  const analysis = deepFreeze(JSON.parse(canonicalStringify(value)));
  return { ok: true, value: analysis, hash: hashCanonical(analysis, "HauntedToaster-AudioAnalysis-v1") };
}

function scoreWithinConstraints(score, constraints) {
  const violations = [];
  const enumCheck = (path, value, allowed) => {
    if (!allowed.includes(value)) violations.push(error(path, "CONSTRAINT_VIOLATION", `${value} is not allowed.`));
  };
  const rangeCheck = (path, value, range) => {
    if (value < range.min || value > range.max) violations.push(error(path, "CONSTRAINT_VIOLATION", `${value} is outside ${range.min}..${range.max}.`));
  };
  enumCheck("$.topology", score.topology, constraints.topology.allowed);
  enumCheck("$.motion.grammar", score.motion.grammar, constraints.motion.grammar.allowed);
  rangeCheck("$.motion.amplitude", score.motion.amplitude, constraints.motion.amplitude);
  rangeCheck("$.motion.variance", score.motion.variance, constraints.motion.variance);
  enumCheck("$.palette.logic", score.palette.logic, constraints.palette.logic.allowed);
  rangeCheck("$.palette.bleed", score.palette.bleed, constraints.palette.bleed);
  rangeCheck("$.palette.contrastBias", score.palette.contrastBias, constraints.palette.contrastBias);
  enumCheck("$.material.texture", score.material.texture, constraints.material.texture.allowed);
  rangeCheck("$.material.imperfection", score.material.imperfection, constraints.material.imperfection);
  enumCheck("$.lyric.placement", score.lyric.placement, constraints.lyric.placement.allowed);
  rangeCheck("$.lyric.densityBias", score.lyric.densityBias, constraints.lyric.densityBias);
  enumCheck("$.camera.grammar", score.camera.grammar, constraints.camera.grammar.allowed);
  rangeCheck("$.camera.variance", score.camera.variance, constraints.camera.variance);
  enumCheck("$.temporalDensity", score.temporalDensity, constraints.temporalDensity.allowed);
  for (const [key, value] of Object.entries(score.influence)) rangeCheck(`$.influence.${key}`, value, constraints.influence[key]);
  return { ok: violations.length === 0, errors: violations };
}

module.exports = {
  ANALYSIS_SCHEMA,
  BOUNDARIES,
  CAMERA_GRAMMARS,
  CONSTRAINTS_SCHEMA,
  LYRIC_PLACEMENTS,
  MATERIAL_TEXTURES,
  MOTION_GRAMMARS,
  PALETTE_LOGICS,
  PATCH_AXES,
  PROFILE_SCHEMA,
  SCORE_KEYS,
  TEMPORAL_DENSITIES,
  TIMELINE_SCHEMA,
  TOPOLOGIES,
  TRANSITIONS,
  VISUAL_SCORE_SCHEMA,
  addressVisualScore,
  parseVisualScore,
  scoreWithinConstraints,
  validateAnalysis,
  validateConstraints,
  validateRendererProfile,
  validateVisualScore,
};