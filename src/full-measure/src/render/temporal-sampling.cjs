const INNER_CADENCE_23976 = "24000/1001";
const HOLD_POLICY = "most-recent-inner-state";

function parsePositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError(`${label} must be a positive safe integer.`);
  }
  return number;
}

function rational(value, label = "cadence") {
  if (typeof value === "number") {
    return Object.freeze({ numerator: parsePositiveInteger(value, label), denominator: 1 });
  }
  const match = String(value || "").match(/^(\d+)\/(\d+)$/);
  if (!match) throw new TypeError(`${label} must use an exact rational N/D form.`);
  return Object.freeze({
    numerator: parsePositiveInteger(match[1], `${label} numerator`),
    denominator: parsePositiveInteger(match[2], `${label} denominator`),
  });
}

function innerStateIndexForOutputFrame(frameIndex, outerCadence, innerCadence) {
  const frame = Number(frameIndex);
  if (!Number.isSafeInteger(frame) || frame < 0) {
    throw new TypeError("Output frame index must be a non-negative safe integer.");
  }
  const outer = rational(outerCadence, "outer cadence");
  const inner = rational(innerCadence, "inner cadence");
  const numerator = BigInt(frame) * BigInt(inner.numerator) * BigInt(outer.denominator);
  const denominator = BigInt(inner.denominator) * BigInt(outer.numerator);
  return Number(numerator / denominator);
}

function resolveTemporalSampling(innerCadence, outerCadence = "30/1") {
  if (!innerCadence) return null;
  if (innerCadence !== INNER_CADENCE_23976) {
    throw new TypeError(`Unsupported inner cadence: ${String(innerCadence)}.`);
  }
  const outer = rational(outerCadence, "outer cadence");
  const inner = rational(innerCadence, "inner cadence");
  return Object.freeze({
    outerCadence: `${outer.numerator}/${outer.denominator}`,
    innerCadence: `${inner.numerator}/${inner.denominator}`,
    holdPolicy: HOLD_POLICY,
    ffmpegInnerFilter: `fps=fps=${inner.numerator}/${inner.denominator}:round=down`,
    ffmpegOuterFilter: `fps=fps=${outer.numerator}/${outer.denominator}:round=down`,
  });
}

function findPostVisualSubtitleSeam(graph) {
  const source = String(graph || "");
  const pattern = /\[([^\]\r\n;]+)\]ass=/g;
  let match = null;
  let seam = null;

  while ((match = pattern.exec(source)) !== null) {
    seam = Object.freeze({
      marker: match[0],
      markerIndex: match.index,
      inputLabel: match[1],
    });
  }

  if (!seam) {
    throw new Error("Production filter graph is missing the post-visual subtitle seam.");
  }
  return seam;
}

function applyTemporalSamplingToGraph(graph, innerCadence, outerCadence = "30/1") {
  const policy = resolveTemporalSampling(innerCadence, outerCadence);
  if (!policy) return Object.freeze({ graph, policy: null });

  // Protected typography is the final ASS consumer in the production graph. Visual
  // compilers may rename its input (for example Resolution Field ends at
  // [atmosphereStage]), so sampling must bind to the seam itself rather than a
  // historical upstream label such as [timelineFinal].
  const seam = findPostVisualSubtitleSeam(graph);
  const cadence = `[${seam.inputLabel}]${policy.ffmpegInnerFilter},${policy.ffmpegOuterFilter}[cadencedField];\n[cadencedField]ass=`;
  return Object.freeze({
    graph: `${graph.slice(0, seam.markerIndex)}${cadence}${graph.slice(seam.markerIndex + seam.marker.length)}`,
    policy,
  });
}

module.exports = {
  HOLD_POLICY,
  INNER_CADENCE_23976,
  applyTemporalSamplingToGraph,
  innerStateIndexForOutputFrame,
  rational,
  resolveTemporalSampling,
};
