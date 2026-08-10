const {
  canonicalStringify,
  deepFreeze,
} = require("./canonical.cjs");
const legacy = require("./schema.cjs");

const ATMOSPHERES = Object.freeze(["none", "smoke", "rain", "dust", "firefly"]);

function hasAtmosphere(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.hasOwn(value, "atmosphere"),
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

function stripAtmosphere(score) {
  if (!hasAtmosphere(score)) return score;
  const core = { ...score };
  delete core.atmosphere;
  return core;
}

function atmosphereError(value) {
  return {
    path: "$.atmosphere",
    code: "UNKNOWN_IDENTIFIER",
    message: `Expected one of: ${ATMOSPHERES.join(", ")}; received ${String(value)}.`,
  };
}

function validateVisualScore(input) {
  const parsed = parseDocument(input);
  if (!hasAtmosphere(parsed)) return legacy.validateVisualScore(input);

  const coreResult = legacy.validateVisualScore(stripAtmosphere(parsed));
  const errors = coreResult.ok ? [] : [...coreResult.errors];
  if (!ATMOSPHERES.includes(parsed.atmosphere)) {
    errors.push(atmosphereError(parsed.atmosphere));
  }
  if (errors.length) return { ok: false, errors };

  const value = deepFreeze(JSON.parse(canonicalStringify({
    ...coreResult.value,
    atmosphere: parsed.atmosphere,
  })));
  return {
    ok: true,
    value,
    canonicalJson: canonicalStringify(value),
    address: legacy.addressVisualScore(value),
  };
}

function parseVisualScore(input) {
  return validateVisualScore(input);
}

function scoreWithinConstraints(score, constraints) {
  const violations = [];
  if (hasAtmosphere(score) && !ATMOSPHERES.includes(score.atmosphere)) {
    violations.push(atmosphereError(score.atmosphere));
  }
  const legacyResult = legacy.scoreWithinConstraints(stripAtmosphere(score), constraints);
  return {
    ok: legacyResult.ok && violations.length === 0,
    errors: [...legacyResult.errors, ...violations],
  };
}

module.exports = {
  ATMOSPHERES,
  hasAtmosphere,
  parseVisualScore,
  scoreWithinConstraints,
  stripAtmosphere,
  validateVisualScore,
};
