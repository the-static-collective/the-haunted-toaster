const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const { createPrng } = require("./prng.cjs");
const {
  TIMELINE_SCHEMA,
  addressVisualScore,
  parseVisualScore,
  scoreWithinConstraints,
  validateAnalysis,
  validateConstraints,
  validateRendererProfile,
} = require("./schema.cjs");

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function quantized(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}

function assertResult(result, label) {
  if (!result.ok) {
    const detail = result.errors.map((item) => `${item.path}: ${item.message}`).join("; ");
    throw new TypeError(`${label} validation failed: ${detail}`);
  }
  return result.value;
}

function stateFromScore(score) {
  return {
    topology: score.topology,
    motion: structuredClone(score.motion),
    palette: structuredClone(score.palette),
    material: structuredClone(score.material),
    lyric: structuredClone(score.lyric),
    camera: structuredClone(score.camera),
  };
}

function boundariesFor(analysis, density) {
  if (density === "frozen") return [];
  if (density === "section") {
    return analysis.sections.slice(1).map((section) => ({
      atSeconds: section.startSeconds,
      boundary: "section",
      energy: section.energy,
    }));
  }
  if (density === "phrase") {
    return analysis.phrases.map((phrase) => ({
      atSeconds: phrase.atSeconds,
      boundary: "phrase",
      energy: phrase.energy,
    }));
  }
  return analysis.transients.map((transient) => ({
    atSeconds: transient.atSeconds,
    boundary: "transient",
    energy: transient.energy,
  }));
}

function boundedJitter(current, range, scale, prng, bias = 0) {
  const span = range.max - range.min;
  const centered = prng.nextFloat() * 2 - 1;
  return quantized(clamp(current + centered * span * scale + bias * span * scale * 0.25, range.min, range.max));
}

function patchForAxis(axis, state, score, constraints, energy, prng) {
  const energyBias = score.influence.energyBias * (energy - 0.5);
  if (axis === "motion") {
    return {
      motion: {
        ...state.motion,
        amplitude: boundedJitter(
          state.motion.amplitude,
          constraints.motion.amplitude,
          0.12 + score.motion.variance * 0.2,
          prng,
          energyBias,
        ),
        variance: boundedJitter(
          state.motion.variance,
          constraints.motion.variance,
          0.08 + score.influence.motionVariance * 0.16,
          prng,
        ),
      },
    };
  }
  if (axis === "palette") {
    return {
      palette: {
        ...state.palette,
        bleed: boundedJitter(state.palette.bleed, constraints.palette.bleed, 0.12, prng, energyBias),
        contrastBias: boundedJitter(
          state.palette.contrastBias,
          constraints.palette.contrastBias,
          0.1,
          prng,
          score.influence.contrastBias,
        ),
      },
    };
  }
  if (axis === "material") {
    return {
      material: {
        ...state.material,
        imperfection: boundedJitter(
          state.material.imperfection,
          constraints.material.imperfection,
          0.1 + score.influence.imperfection * 0.14,
          prng,
          energyBias,
        ),
      },
    };
  }
  if (axis === "lyric") {
    return {
      lyric: {
        ...state.lyric,
        densityBias: boundedJitter(
          state.lyric.densityBias,
          constraints.lyric.densityBias,
          0.1 + score.influence.lyricDensity * 0.12,
          prng,
        ),
      },
    };
  }
  return {
    camera: {
      ...state.camera,
      variance: boundedJitter(
        state.camera.variance,
        constraints.camera.variance,
        0.08 + score.influence.motionVariance * 0.16,
        prng,
        energyBias,
      ),
    },
  };
}

function applyPatch(state, patch) {
  const next = structuredClone(state);
  for (const [axis, value] of Object.entries(patch.to)) next[axis] = structuredClone(value);
  return next;
}

function resolve(analysisInput, scoreInput, constraintsInput, profileInput) {
  const analysisResult = validateAnalysis(analysisInput);
  const scoreResult = parseVisualScore(scoreInput);
  const constraintsResult = validateConstraints(constraintsInput);
  const profileResult = validateRendererProfile(profileInput);
  const analysis = assertResult(analysisResult, "AudioAnalysis");
  const score = assertResult(scoreResult, "VisualScore");
  const constraints = assertResult(constraintsResult, "GarmentConstraints");
  const profile = assertResult(profileResult, "RendererProfile");
  const constraintCheck = scoreWithinConstraints(score, constraints);
  if (!constraintCheck.ok) {
    const detail = constraintCheck.errors.map((item) => `${item.path}: ${item.message}`).join("; ");
    throw new TypeError(`VisualScore violates ${constraints.id}: ${detail}`);
  }

  const scoreAddress = addressVisualScore(score);
  const analysisHash = analysisResult.hash;
  const constraintsHash = constraintsResult.hash;
  const profileHash = profileResult.hash;
  const durationTicks = Math.round(analysis.durationSeconds * profile.timebase);
  const prng = createPrng(`${score.seed}|${scoreAddress}|${analysisHash}|resolver-v1`);
  let state = stateFromScore(score);
  let entropySpent = 0;
  const patches = [];
  const candidates = boundariesFor(analysis, score.temporalDensity);

  for (const candidate of candidates) {
    if (patches.length >= constraints.patchPolicy.maxPatches) break;
    const legalAxes = Object.entries(constraints.patchPolicy.axes)
      .filter(([, policy]) => policy.boundaries.includes(candidate.boundary))
      .map(([axis]) => axis);
    if (!legalAxes.length) continue;
    const axis = prng.pick(legalAxes);
    const policy = constraints.patchPolicy.axes[axis];
    if (entropySpent + policy.entropyCost > constraints.patchPolicy.entropyBudget) break;
    const priorStateHash = hashCanonical(state, "HauntedToaster-ResolvedState-v1");
    const to = patchForAxis(axis, state, score, constraints, candidate.energy, prng);
    const patch = {
      atTick: Math.max(0, Math.min(durationTicks, Math.round(candidate.atSeconds * profile.timebase))),
      boundary: candidate.boundary,
      axis,
      priorStateHash,
      to,
      entropyCost: policy.entropyCost,
      transition: policy.transition,
    };
    patches.push(patch);
    entropySpent += policy.entropyCost;
    state = applyPatch(state, patch);
  }

  const body = {
    schema: TIMELINE_SCHEMA,
    scoreAddress,
    analysisHash,
    constraintsHash,
    rendererProfileHash: profileHash,
    timebase: profile.timebase,
    durationTicks,
    baseState: stateFromScore(score),
    patches,
    accounting: {
      patchCount: patches.length,
      entropySpent,
      entropyBudget: constraints.patchPolicy.entropyBudget,
    },
  };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

function stateAtTick(timeline, tick) {
  if (!timeline || timeline.schema !== TIMELINE_SCHEMA) {
    throw new TypeError(`Expected ${TIMELINE_SCHEMA}.`);
  }
  const target = Math.max(0, Math.round(Number(tick)));
  let state = structuredClone(timeline.baseState);
  for (const patch of timeline.patches) {
    if (patch.atTick > target) break;
    state = applyPatch(state, patch);
  }
  return state;
}

function verifyReplay(expectedTimeline, analysis, score, constraints, profile) {
  const actual = resolve(analysis, score, constraints, profile);
  return {
    ok: expectedTimeline?.timelineHash === actual.timelineHash,
    expectedTimelineHash: expectedTimeline?.timelineHash || null,
    actualTimelineHash: actual.timelineHash,
    scoreAddressMatches: expectedTimeline?.scoreAddress === actual.scoreAddress,
    analysisHashMatches: expectedTimeline?.analysisHash === actual.analysisHash,
    constraintsHashMatches: expectedTimeline?.constraintsHash === actual.constraintsHash,
    rendererProfileHashMatches:
      expectedTimeline?.rendererProfileHash === actual.rendererProfileHash,
    timeline: actual,
  };
}

module.exports = {
  applyPatch,
  boundariesFor,
  resolve,
  stateAtTick,
  verifyReplay,
};
