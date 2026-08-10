const {
  canonicalStringify,
  deepFreeze,
} = require("./canonical.cjs");
const legacySchema = require("./schema.cjs");
const atmosphereScore = require("./atmosphere-score.cjs");

const STRUCTURE_PRIMITIVES = Object.freeze([
  "scope",
  "ribs",
  "lattice",
  "facets",
  "torus",
  "folds",
  "voxels",
  "branches",
]);

const FIELD_DYNAMICS = Object.freeze([
  "inertial",
  "wave",
  "orbital-decay",
  "snap",
  "oscillation",
  "seismic",
  "magnetic",
  "swarm",
  "whip",
  "advect",
]);

function hasPrimitiveField(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.hasOwn(value, "primitiveField"),
  );
}

function parseDocument(input) {
  if (typeof input !== "string") return input;
  if (Buffer.byteLength(input, "utf8") > 128_000) return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function stripPrimitiveField(score) {
  if (!hasPrimitiveField(score)) return score;
  const core = { ...score };
  delete core.primitiveField;
  return core;
}

function error(path, code, message) {
  return { path, code, message };
}

function primitiveFieldErrors(value) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [error("$.primitiveField", "EXPECTED_OBJECT", "Expected a plain object.")];
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return [error("$.primitiveField", "EXPECTED_OBJECT", "Expected a plain object.")];
  }

  const allowedKeys = new Set(["structure", "dynamics"]);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(error(`$.primitiveField.${key}`, "UNKNOWN_FIELD", "Unknown field."));
    }
  }
  for (const key of allowedKeys) {
    if (!Object.hasOwn(value, key)) {
      errors.push(error(`$.primitiveField.${key}`, "MISSING_FIELD", "Required field is missing."));
    }
  }

  if (
    Object.hasOwn(value, "structure") &&
    !STRUCTURE_PRIMITIVES.includes(value.structure)
  ) {
    errors.push(error(
      "$.primitiveField.structure",
      "UNKNOWN_IDENTIFIER",
      `Expected one of: ${STRUCTURE_PRIMITIVES.join(", ")}; received ${String(value.structure)}.`,
    ));
  }
  if (
    Object.hasOwn(value, "dynamics") &&
    !FIELD_DYNAMICS.includes(value.dynamics)
  ) {
    errors.push(error(
      "$.primitiveField.dynamics",
      "UNKNOWN_IDENTIFIER",
      `Expected one of: ${FIELD_DYNAMICS.join(", ")}; received ${String(value.dynamics)}.`,
    ));
  }
  return errors;
}

function validateVisualScore(input) {
  const parsed = parseDocument(input);
  if (!hasPrimitiveField(parsed)) {
    return atmosphereScore.validateVisualScore(input);
  }

  const coreResult = atmosphereScore.validateVisualScore(stripPrimitiveField(parsed));
  const errors = coreResult.ok ? [] : [...coreResult.errors];
  errors.push(...primitiveFieldErrors(parsed.primitiveField));
  if (errors.length) return { ok: false, errors };

  const value = deepFreeze(JSON.parse(canonicalStringify({
    ...coreResult.value,
    primitiveField: {
      structure: parsed.primitiveField.structure,
      dynamics: parsed.primitiveField.dynamics,
    },
  })));
  return {
    ok: true,
    value,
    canonicalJson: canonicalStringify(value),
    address: legacySchema.addressVisualScore(value),
  };
}

function parseVisualScore(input) {
  return validateVisualScore(input);
}

function scoreWithinConstraints(score, constraints) {
  const primitiveErrors = hasPrimitiveField(score)
    ? primitiveFieldErrors(score.primitiveField)
    : [];
  const legacyResult = atmosphereScore.scoreWithinConstraints(
    stripPrimitiveField(score),
    constraints,
  );
  return {
    ok: legacyResult.ok && primitiveErrors.length === 0,
    errors: [...legacyResult.errors, ...primitiveErrors],
  };
}

module.exports = {
  FIELD_DYNAMICS,
  STRUCTURE_PRIMITIVES,
  hasPrimitiveField,
  parseVisualScore,
  scoreWithinConstraints,
  stripPrimitiveField,
  validateVisualScore,
};
