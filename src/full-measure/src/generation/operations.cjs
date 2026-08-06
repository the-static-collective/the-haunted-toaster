const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const { PRNG_ID, createPrng } = require("./prng.cjs");
const {
  VISUAL_SCORE_SCHEMA,
  addressVisualScore,
  parseVisualScore,
  scoreWithinConstraints,
  validateConstraints,
} = require("./schema.cjs");
const { resolve } = require("./resolver.cjs");

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

function pathLocked(locks, path) {
  return locks.has(path) || [...locks].some((lock) => path.startsWith(`${lock}.`));
}

function jitter(value, range, amount, prng) {
  const span = range.max - range.min;
  return quantized(clamp(value + (prng.nextFloat() * 2 - 1) * span * amount, range.min, range.max));
}

function mutateVisualScore(scoreInput, constraintsInput, {
  seed,
  amount = 0.18,
  locks = [],
} = {}) {
  const constraints = assertConstraints(constraintsInput);
  const parent = assertScore(scoreInput, constraints);
  const parentAddress = addressVisualScore(parent);
  const mutationSeed = String(seed ?? `${parent.seed}:mutation`);
  const prng = createPrng(mutationSeed);
  const strength = clamp(Number(amount), 0, 1);
  const locked = new Set(locks.map(String));
  const child = structuredClone(parent);
  child.seed = mutationSeed;

  const mutateEnum = (path, current, range) => {
    if (pathLocked(locked, path) || prng.nextFloat() > strength) return current;
    const choices = range.allowed.filter((value) => value !== current);
    return choices.length ? prng.pick(choices) : current;
  };
  const mutateNumber = (path, current, range) =>
    pathLocked(locked, path) ? current : jitter(current, range, strength, prng);

  child.topology = mutateEnum("topology", child.topology, constraints.topology);
  child.motion.grammar = mutateEnum("motion.grammar", child.motion.grammar, constraints.motion.grammar);
  child.motion.amplitude = mutateNumber("motion.amplitude", child.motion.amplitude, constraints.motion.amplitude);
  child.motion.variance = mutateNumber("motion.variance", child.motion.variance, constraints.motion.variance);
  child.palette.logic = mutateEnum("palette.logic", child.palette.logic, constraints.palette.logic);
  child.palette.bleed = mutateNumber("palette.bleed", child.palette.bleed, constraints.palette.bleed);
  child.palette.contrastBias = mutateNumber("palette.contrastBias", child.palette.contrastBias, constraints.palette.contrastBias);
  child.material.texture = mutateEnum("material.texture", child.material.texture, constraints.material.texture);
  child.material.imperfection = mutateNumber("material.imperfection", child.material.imperfection, constraints.material.imperfection);
  child.lyric.placement = mutateEnum("lyric.placement", child.lyric.placement, constraints.lyric.placement);
  child.lyric.densityBias = mutateNumber("lyric.densityBias", child.lyric.densityBias, constraints.lyric.densityBias);
  child.camera.grammar = mutateEnum("camera.grammar", child.camera.grammar, constraints.camera.grammar);
  child.camera.variance = mutateNumber("camera.variance", child.camera.variance, constraints.camera.variance);
  child.temporalDensity = mutateEnum("temporalDensity", child.temporalDensity, constraints.temporalDensity);
  for (const key of Object.keys(child.influence)) {
    child.influence[key] = mutateNumber(`influence.${key}`, child.influence[key], constraints.influence[key]);
  }

  const validated = assertScore(child, constraints);
  return artifact(validated, {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "mutate",
    parentScoreRefs: [parentAddress],
    policy: {
      seed: mutationSeed,
      amount: quantized(strength),
      locks: [...locked].sort(),
      prng: PRNG_ID,
    },
  });
}

function interpolate(left, right, mix) {
  return quantized(left + (right - left) * mix);
}

function inheritEnum(left, right, mix, prng) {
  if (left === right) return left;
  if (mix <= 0.25) return left;
  if (mix >= 0.75) return right;
  return prng.nextFloat() < mix ? right : left;
}

function breedVisualScores(leftInput, rightInput, constraintsInput, {
  seed,
  mix = 0.5,
} = {}) {
  const constraints = assertConstraints(constraintsInput);
  const left = assertScore(leftInput, constraints);
  const right = assertScore(rightInput, constraints);
  const ratio = clamp(Number(mix), 0, 1);
  const breedSeed = String(seed ?? `${addressVisualScore(left)}:${addressVisualScore(right)}:breed`);
  const prng = createPrng(breedSeed);
  const child = {
    schema: VISUAL_SCORE_SCHEMA,
    seed: breedSeed,
    prng: PRNG_ID,
    topology: inheritEnum(left.topology, right.topology, ratio, prng),
    motion: {
      grammar: inheritEnum(left.motion.grammar, right.motion.grammar, ratio, prng),
      amplitude: interpolate(left.motion.amplitude, right.motion.amplitude, ratio),
      variance: interpolate(left.motion.variance, right.motion.variance, ratio),
    },
    palette: {
      logic: inheritEnum(left.palette.logic, right.palette.logic, ratio, prng),
      bleed: interpolate(left.palette.bleed, right.palette.bleed, ratio),
      contrastBias: interpolate(left.palette.contrastBias, right.palette.contrastBias, ratio),
    },
    material: {
      texture: inheritEnum(left.material.texture, right.material.texture, ratio, prng),
      imperfection: interpolate(left.material.imperfection, right.material.imperfection, ratio),
    },
    lyric: {
      placement: inheritEnum(left.lyric.placement, right.lyric.placement, ratio, prng),
      densityBias: interpolate(left.lyric.densityBias, right.lyric.densityBias, ratio),
    },
    camera: {
      grammar: inheritEnum(left.camera.grammar, right.camera.grammar, ratio, prng),
      variance: interpolate(left.camera.variance, right.camera.variance, ratio),
    },
    temporalDensity: inheritEnum(left.temporalDensity, right.temporalDensity, ratio, prng),
    influence: Object.fromEntries(
      Object.keys(left.influence).map((key) => [key, interpolate(left.influence[key], right.influence[key], ratio)]),
    ),
  };
  const validated = assertScore(child, constraints);
  const policy = {
    algorithm: "typed-breed-v1",
    seed: breedSeed,
    mix: quantized(ratio),
    numericPolicy: "linear-interpolation",
    enumPolicy: "seeded-parent-inheritance",
    topologyPolicy: "seeded-parent-inheritance",
  };
  return artifact(validated, {
    schema: "haunted-toaster/score-derivation/v1",
    operation: "breed",
    parentScoreRefs: [addressVisualScore(left), addressVisualScore(right)],
    policy,
    policyHash: hashCanonical(policy, "HauntedToaster-BreedingPolicy-v1"),
  });
}

function flatten(value, prefix = "", output = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${prefix}.${index}`, output));
  } else if (value && typeof value === "object") {
    Object.keys(value).sort().forEach((key) => flatten(value[key], prefix ? `${prefix}.${key}` : key, output));
  } else {
    output.set(prefix, value);
  }
  return output;
}

function diffVisualScores(leftInput, rightInput) {
  const left = assertScore(leftInput);
  const right = assertScore(rightInput);
  const a = flatten(left);
  const b = flatten(right);
  const paths = [...new Set([...a.keys(), ...b.keys()])].sort();
  const changes = [];
  for (const path of paths) {
    const before = a.get(path);
    const after = b.get(path);
    if (Object.is(before, after)) continue;
    const change = { path, before: before ?? null, after: after ?? null };
    if (typeof before === "number" && typeof after === "number") {
      change.delta = quantized(after - before);
    }
    changes.push(change);
  }
  return deepFreeze({
    schema: "haunted-toaster/visual-score-diff/v1",
    leftScoreRef: addressVisualScore(left),
    rightScoreRef: addressVisualScore(right),
    changedLeafCount: changes.length,
    comparedLeafCount: paths.length,
    changes,
  });
}

function replayScore(score, analysis, constraints, profile) {
  return resolve(analysis, score, constraints, profile);
}

module.exports = {
  artifact,
  breedVisualScores,
  createVisualScore,
  diffVisualScores,
  mutateVisualScore,
  replayScore,
};
