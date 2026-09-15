const crypto = require("node:crypto");
const {
  quantizeNumber,
} = require("../generation/canonical.cjs");
const {
  normalizeHyperFoodSpec,
} = require("./schema.cjs");
const {
  specimenId,
} = require("./identity.cjs");

const HYPERFOOD_TRACE_SCHEMA = "haunted-toaster/hyperfood-transform-trace/v0";
const TRACE_RANDOM_DOMAIN = "HauntedToaster-HyperFood-Trace-v0";

function q(value) {
  return quantizeNumber(value);
}

function normalizeWitnessTimes(witnessTimesMs, durationMs) {
  if (!Array.isArray(witnessTimesMs) || witnessTimesMs.length === 0) {
    throw new TypeError("HyperFood trace witness times must be a non-empty array.");
  }
  const unique = new Set();
  for (const value of witnessTimesMs) {
    const tMs = Number(value);
    if (!Number.isSafeInteger(tMs) || tMs < 0 || tMs > durationMs) {
      throw new TypeError(
        `HyperFood trace witness time must be a safe integer in [0, ${durationMs}].`,
      );
    }
    unique.add(tMs);
  }
  return [...unique].sort((a, b) => a - b);
}

function pulseEnvelopeAt(event, tMs, parameters) {
  const attackMs = parameters.attackMs ?? 0;
  const holdMs = parameters.holdMs ?? 0;
  const decayMs = parameters.decayMs ?? 0;
  const phaseOffsetMs = parameters.phaseOffsetMs ?? 0;
  const local = tMs - (event.tMs + phaseOffsetMs);
  if (local < 0) return 0;
  if (attackMs > 0 && local < attackMs) {
    return (local / attackMs) * event.strength;
  }
  if (local < attackMs + holdMs) return event.strength;
  if (decayMs > 0 && local < attackMs + holdMs + decayMs) {
    return (
      1 - ((local - attackMs - holdMs) / decayMs)
    ) * event.strength;
  }
  if (attackMs === 0 && holdMs === 0 && decayMs === 0 && local === 0) {
    return event.strength;
  }
  return 0;
}

function evaluatePulse(spec, tMs) {
  const parameters = spec.parameters;
  let envelope = 0;
  for (const event of spec.timing.events || []) {
    envelope = Math.max(envelope, pulseEnvelopeAt(event, tMs, parameters));
  }
  envelope = q(envelope);
  return {
    tMs,
    envelope,
    scale: q(1 + envelope * (parameters.scaleAmount ?? 0)),
    rotationDeg: q(envelope * (parameters.rotationDeg ?? 0)),
    translateXPx: q(envelope * (parameters.translateXPx ?? 0)),
    translateYPx: q(envelope * (parameters.translateYPx ?? 0)),
    opacity: q(1 + envelope * (parameters.opacityAmount ?? 0)),
    brightness: q(1 + envelope * (parameters.brightnessAmount ?? 0)),
    blurPx: q(envelope * (parameters.blurPx ?? 0)),
  };
}

function hashUnit(specimenAddress, cueIndex, residueIndex, axis) {
  const hash = crypto
    .createHash("sha256")
    .update(`${TRACE_RANDOM_DOMAIN}\0`, "utf8")
    .update(
      `${specimenAddress}|cue:${cueIndex}|residue:${residueIndex}|${axis}`,
      "utf8",
    )
    .digest("hex");
  const numerator = Number.parseInt(hash.slice(0, 13), 16);
  return numerator / 0xfffffffffffff;
}

function signedHashUnit(specimenAddress, cueIndex, residueIndex, axis) {
  return hashUnit(specimenAddress, cueIndex, residueIndex, axis) * 2 - 1;
}

function ghostProgress(cue, birthMs, ageMs, lifetimeMs) {
  if (lifetimeMs > 0) return Math.min(1, ageMs / lifetimeMs);
  const available = Math.max(1, cue.clearMs - birthMs);
  return Math.min(1, ageMs / available);
}

function evaluateGhostText(spec, specimenAddress, tMs) {
  const parameters = spec.parameters;
  const ghostCount = parameters.ghostCount ?? 1;
  const intervalMs = parameters.ghostIntervalMs ?? 0;
  const lifetimeMs = parameters.ghostLifetimeMs ?? 0;
  const residues = [];

  (spec.timing.cues || []).forEach((cue, cueIndex) => {
    for (let residueIndex = 0; residueIndex < ghostCount; residueIndex += 1) {
      const birthMs = cue.startMs + residueIndex * intervalMs;
      const ageMs = tMs - birthMs;
      const aliveByLifetime = lifetimeMs === 0 || ageMs < lifetimeMs;
      if (ageMs < 0 || tMs >= cue.clearMs || !aliveByLifetime) continue;
      const progress = ghostProgress(cue, birthMs, ageMs, lifetimeMs);
      const xSign = signedHashUnit(specimenAddress, cueIndex, residueIndex, "x");
      const ySign = signedHashUnit(specimenAddress, cueIndex, residueIndex, "y");
      const rotationSign = signedHashUnit(
        specimenAddress,
        cueIndex,
        residueIndex,
        "rotation",
      );
      residues.push({
        cueIndex,
        residueIndex,
        text: cue.text,
        birthMs,
        ageMs,
        progress: q(progress),
        xPx: q((parameters.xDriftPx ?? 0) * progress * xSign),
        yPx: q((parameters.yDriftPx ?? 0) * progress * ySign),
        scale: q(1 + (parameters.scaleDrift ?? 0) * progress),
        rotationDeg: q(
          (parameters.rotationDriftDeg ?? 0) * progress * rotationSign,
        ),
        blurPx: q((parameters.blurGrowthPx ?? 0) * progress),
        opacity: q(Math.max(0, 1 - (parameters.opacityDecay ?? 0) * progress)),
      });
    }
  });

  return { tMs, residues };
}

function frameLevelRank(level, depth, entryOrder) {
  return entryOrder === "inner-first" ? depth - level : level - 1;
}

function evaluateFrameEatFrame(spec, tMs) {
  const parameters = spec.parameters;
  const depth = parameters.depth ?? 1;
  const stepMs = parameters.stepMs ?? 0;
  const staggerMs = parameters.staggerMs ?? 0;
  const scalePerDepth = parameters.scalePerDepth ?? 1;
  const rotationPerDepthDeg = parameters.rotationPerDepthDeg ?? 0;
  const cropPerDepth = parameters.cropPerDepth ?? 0;
  const opacityPerDepth = parameters.opacityPerDepth ?? 1;
  const entryOrder = parameters.entryOrder ?? "outer-first";
  const exitOrder = parameters.exitOrder ?? "inner-first";
  const levels = [];

  for (let level = 1; level <= depth; level += 1) {
    const activationRank = frameLevelRank(level, depth, entryOrder);
    const activationMs = activationRank * staggerMs;
    if (tMs < activationMs) continue;
    const elapsed = tMs - activationMs;
    const entryProgress = stepMs > 0 ? Math.min(1, elapsed / stepMs) : 1;
    levels.push({
      level,
      activationMs,
      entryProgress: q(entryProgress),
      scale: q(scalePerDepth ** level),
      rotationDeg: q(rotationPerDepthDeg * level),
      crop: q(1 - ((1 - cropPerDepth) ** level)),
      pivotX: q(parameters.pivotX ?? 0.5),
      pivotY: q(parameters.pivotY ?? 0.5),
      opacity: q(opacityPerDepth ** level),
    });
  }

  return { tMs, entryOrder, exitOrder, levels };
}

function evaluateHyperFoodTrace(input, witnessTimesMs) {
  const spec = normalizeHyperFoodSpec(input);
  if (spec.graph) {
    throw new TypeError(
      "HyperFood graph tracing is outside Slice A; trace organisms independently.",
    );
  }
  const witnessTimes = normalizeWitnessTimes(
    witnessTimesMs,
    spec.timing.durationMs,
  );
  const specimenAddress = specimenId(spec);
  const organism = `${spec.organism.id}@${spec.organism.version}`;
  let evaluator;
  if (organism === "PULSE@0.1.0") {
    evaluator = (tMs) => evaluatePulse(spec, tMs);
  } else if (organism === "GHOST-TEXT@0.1.0") {
    evaluator = (tMs) => evaluateGhostText(spec, specimenAddress, tMs);
  } else if (organism === "FRAME-EAT-FRAME@0.1.0") {
    evaluator = (tMs) => evaluateFrameEatFrame(spec, tMs);
  } else {
    throw new TypeError(`Unsupported HyperFood trace organism: ${organism}`);
  }
  return {
    schema: HYPERFOOD_TRACE_SCHEMA,
    specimenId: specimenAddress,
    organism,
    witnessTimesMs: witnessTimes,
    states: witnessTimes.map(evaluator),
  };
}

module.exports = {
  HYPERFOOD_TRACE_SCHEMA,
  evaluateHyperFoodTrace,
  normalizeWitnessTimes,
};
