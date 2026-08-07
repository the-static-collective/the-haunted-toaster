const {
  canonicalStringify,
  deepFreeze,
} = require("./canonical.cjs");
const { PRNG_ID, createPrng } = require("./prng.cjs");
const {
  VISUAL_SCORE_SCHEMA,
  addressVisualScore,
  parseVisualScore,
  scoreWithinConstraints,
  validateConstraints,
} = require("./schema.cjs");

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function quantized(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

function assertConstraints(input) {
  const result = validateConstraints(input);
  if (!result.ok) {
    throw new TypeError(result.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  return result.value;
}

function assertScore(input, constraints = null) {
  const result = parseVisualScore(input);
  if (!result.ok) {
    throw new TypeError(result.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  if (constraints) {
    const check = scoreWithinConstraints(result.value, constraints);
    if (!check.ok) throw new TypeError(check.errors.map((item) => `${item.path}: ${item.message}`).join("; "));
  }
  return result.value;
}

function ranged(prng, range) {
  return quantized(range.min + prng.nextFloat() * (range.max - range.min));
}

function choose(prng, enumRange) {
  return prng.pick(enumRange.allowed);
}

function mergeKnown(base, overrides = {}) {
  const next = structuredClone(base);
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value) && next[key] && typeof next[key] === "object") {
      next[key] = { ...next[key], ...value };
    } else {
      next[key] = value;
    }
  }
  return next;
}

function artifact(score, derivation = null) {
  const validated = assertScore(score);
  const address = addressVisualScore(validated);
  return deepFreeze({
    schema: "haunted-toaster/score-artifact/v1",
    address,
    canonicalJson: canonicalStringify(validated),
    score: validated,
    derivation,
  });
}

function createVisualScore({ seed, constraints: constraintsInput, overrides = {} }) {
  const constraints = assertConstraints(constraintsInput);
  const prng = createPrng(seed);
  const base = {
    schema: VISUAL_SCORE_SCHEMA,
    seed: String(seed),
    prng: PRNG_ID,
    topology: choose(prng, constraints.topology),
    motion: {
      grammar: choose(prng, constraints.motion.grammar),
      amplitude: ranged(prng, constraints.motion.amplitude),
      variance: ranged(prng, constraints.motion.variance),
    },
    palette: {
      logic: choose(prng, constraints.palette.logic),
      bleed: ranged(prng, constraints.palette.bleed),
      contrastBias: ranged(prng, constraints.palette.contrastBias),
    },
    material: {
      texture: choose(prng, constraints.material.texture),
      imperfection: ranged(prng, constraints.material.imperfection),
    },
    lyric: {
      placement: choose(prng, constraints.lyric.placement),
      densityBias: ranged(prng, constraints.lyric.densityBias),
    },
    camera: {
      grammar: choose(prng, constraints.camera.grammar),
      variance: ranged(prng, constraints.camera.variance),
    },
    temporalDensity: choose(prng, constraints.temporalDensity),
    influence: Object.fromEntries(
      Object.entries(constraints.influence).map(([key, range]) => [key, ranged(prng, range)]),
    ),
  };
  const score = assertScore(mergeKnown(base, overrides), constraints);
  return artifact(score, {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "create",
    parentScoreRefs: [],
    policy: {
      constraintPackId: constraints.id,
      seed: String(seed),
      prng: PRNG_ID,
    },
  });
}

module.exports = {
  artifact,
  createVisualScore,
};
