const MEMORY_INFLUENCE_POLICY = "toaster-memory-influence-v1";

const TARGETS = Object.freeze({
  topology: Object.freeze({ axis: "topology", allowed: (constraints) => constraints.topology?.allowed || [], get: (score) => score.topology, set: (score, value) => { score.topology = value; } }),
  motionGrammar: Object.freeze({ axis: "motion", allowed: (constraints) => constraints.motion?.grammar?.allowed || [], get: (score) => score.motion?.grammar, set: (score, value) => { score.motion.grammar = value; } }),
  materialTexture: Object.freeze({ axis: "material", allowed: (constraints) => constraints.material?.texture?.allowed || [], get: (score) => score.material?.texture, set: (score, value) => { score.material.texture = value; } }),
  cameraGrammar: Object.freeze({ axis: "camera", allowed: (constraints) => constraints.camera?.grammar?.allowed || [], get: (score) => score.camera?.grammar, set: (score, value) => { score.camera.grammar = value; } }),
  paletteLogic: Object.freeze({ axis: "palette", allowed: (constraints) => constraints.palette?.logic?.allowed || [], get: (score) => score.palette?.logic, set: (score, value) => { score.palette.logic = value; } }),
});

function parseTarget(influencePlan) {
  const target = String(influencePlan?.target || "");
  const separator = target.indexOf(":");
  if (separator <= 0 || separator === target.length - 1) {
    return { target, prefix: null, value: null, descriptor: null };
  }
  const prefix = target.slice(0, separator);
  const value = target.slice(separator + 1);
  return { target, prefix, value, descriptor: TARGETS[prefix] || null };
}

function memoryInfluenceAxis(influencePlan) {
  return parseTarget(influencePlan).descriptor?.axis || null;
}

function applyMemoryInfluence(score, constraints, influencePlan) {
  const next = structuredClone(score);
  const parsed = parseTarget(influencePlan);
  if (!influencePlan || influencePlan.policy !== MEMORY_INFLUENCE_POLICY || !parsed.descriptor) {
    return Object.freeze({
      score: next,
      applied: false,
      reason: "target-not-legal",
      axis: parsed.descriptor?.axis || null,
      target: parsed.target || null,
    });
  }
  const allowed = parsed.descriptor.allowed(constraints).map(String);
  if (!allowed.includes(parsed.value)) {
    return Object.freeze({
      score: next,
      applied: false,
      reason: "target-not-legal",
      axis: parsed.descriptor.axis,
      target: parsed.target,
    });
  }
  if (String(parsed.descriptor.get(next)) === parsed.value) {
    return Object.freeze({
      score: next,
      applied: false,
      reason: "already-target",
      axis: parsed.descriptor.axis,
      target: parsed.target,
    });
  }
  parsed.descriptor.set(next, parsed.value);
  return Object.freeze({
    score: next,
    applied: true,
    reason: String(influencePlan.reason || "memory-pressure"),
    axis: parsed.descriptor.axis,
    target: parsed.target,
  });
}

module.exports = {
  MEMORY_INFLUENCE_POLICY,
  applyMemoryInfluence,
  memoryInfluenceAxis,
};
