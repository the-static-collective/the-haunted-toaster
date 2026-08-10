const CATEGORICAL_FIELDS = Object.freeze([
  Object.freeze({ key: "topology", weight: 8, read: (score) => score.topology }),
  Object.freeze({ key: "motion", weight: 8, read: (score) => score.motion.grammar }),
  Object.freeze({ key: "material", weight: 8, read: (score) => score.material.texture }),
  Object.freeze({ key: "camera", weight: 5, read: (score) => score.camera.grammar }),
  Object.freeze({ key: "palette", weight: 5, read: (score) => score.palette.logic }),
  Object.freeze({ key: "temporalDensity", weight: 5, read: (score) => score.temporalDensity }),
  Object.freeze({ key: "primitiveStructure", weight: 4, read: (score) => score.primitiveField?.structure || "scope" }),
  Object.freeze({ key: "primitiveDynamics", weight: 4, read: (score) => score.primitiveField?.dynamics || "inertial" }),
  Object.freeze({ key: "lyric", weight: 3, read: (score) => score.lyric.placement }),
]);

const NUMERIC_FIELDS = Object.freeze([
  Object.freeze({ key: "motion.amplitude", weight: 1, read: (score) => score.motion.amplitude, range: (constraints) => constraints.motion.amplitude }),
  Object.freeze({ key: "motion.variance", weight: 1, read: (score) => score.motion.variance, range: (constraints) => constraints.motion.variance }),
  Object.freeze({ key: "palette.bleed", weight: 0.75, read: (score) => score.palette.bleed, range: (constraints) => constraints.palette.bleed }),
  Object.freeze({ key: "palette.contrastBias", weight: 0.75, read: (score) => score.palette.contrastBias, range: (constraints) => constraints.palette.contrastBias }),
  Object.freeze({ key: "material.imperfection", weight: 1, read: (score) => score.material.imperfection, range: (constraints) => constraints.material.imperfection }),
  Object.freeze({ key: "camera.variance", weight: 0.75, read: (score) => score.camera.variance, range: (constraints) => constraints.camera.variance }),
  Object.freeze({ key: "lyric.densityBias", weight: 0.5, read: (score) => score.lyric.densityBias, range: (constraints) => constraints.lyric.densityBias }),
]);

function normalizedDelta(left, right, range) {
  if (!range || range.max === range.min) return 0;
  return Math.min(1, Math.abs(left - right) / (range.max - range.min));
}

function categoricalWeight(axis) {
  return CATEGORICAL_FIELDS.find((field) => field.key === axis)?.weight || 0;
}

function visibleSemanticDistance(left, right, constraints) {
  let distance = 0;
  for (const field of CATEGORICAL_FIELDS) {
    if (field.read(left) !== field.read(right)) distance += field.weight;
  }
  for (const field of NUMERIC_FIELDS) {
    distance += field.weight * normalizedDelta(field.read(left), field.read(right), field.range(constraints));
  }
  return Number(distance.toFixed(6));
}

function categoricalBreaks(left, right) {
  return CATEGORICAL_FIELDS
    .filter((field) => field.read(left) !== field.read(right))
    .map((field) => field.key);
}

function minimumSiblingDistance(score, acceptedScores, constraints) {
  if (!acceptedScores.length) return Infinity;
  return Math.min(...acceptedScores.map((other) => visibleSemanticDistance(score, other, constraints)));
}

function categoricalCoverage(scores) {
  const readUnique = (read) => new Set(scores.map(read)).size;
  return Object.freeze({
    topology: readUnique((score) => score.topology),
    motion: readUnique((score) => score.motion.grammar),
    material: readUnique((score) => score.material.texture),
    camera: readUnique((score) => score.camera.grammar),
    palette: readUnique((score) => score.palette.logic),
    temporalDensity: readUnique((score) => score.temporalDensity),
    primitiveStructure: readUnique((score) => score.primitiveField?.structure || "scope"),
    primitiveDynamics: readUnique((score) => score.primitiveField?.dynamics || "inertial"),
    lyric: readUnique((score) => score.lyric.placement),
  });
}

module.exports = {
  CATEGORICAL_FIELDS,
  NUMERIC_FIELDS,
  categoricalBreaks,
  categoricalCoverage,
  categoricalWeight,
  minimumSiblingDistance,
  visibleSemanticDistance,
};
