function compactTopologyResponseEvidence(evidence) {
  if (!evidence) return null;
  return Object.freeze({
    policyVersion: evidence.policyVersion,
    nestedResponsePolicyVersion: evidence.nestedResponsePolicyVersion,
    planSha256: evidence.planSha256,
    knotCount: evidence.knotCount,
    granularity: evidence.granularity,
    idleMotionPolicyVersion: evidence.idleMotionPolicyVersion,
    softOccupancyKnee: evidence.softOccupancyKnee,
    meterEvidenceUsed: evidence.meterEvidenceUsed === true,
  });
}

function hiddenTopologyResponse(operators) {
  if (!operators || !Object.hasOwn(operators, "__topologyResponse")) {
    return { present: false, evidence: null };
  }
  return {
    present: true,
    evidence: operators.__topologyResponse || null,
  };
}

function promoteTopologyResponseEvidence(visualCompiler) {
  if (!visualCompiler || typeof visualCompiler !== "object") return visualCompiler;
  const hidden = hiddenTopologyResponse(visualCompiler.operators);
  if (!hidden.present) return visualCompiler;
  return Object.freeze({
    ...visualCompiler,
    topologyResponse: hidden.evidence,
  });
}

function buildVisualCompilerEvidence({
  compiledTimeline,
  atmosphere = null,
  temporalSampling = null,
  witnessWindow = null,
  graphSha256 = null,
} = {}) {
  if (!compiledTimeline || typeof compiledTimeline !== "object") {
    throw new TypeError("compiledTimeline is required.");
  }
  const core = {
    policy: compiledTimeline.rendererPolicy,
    topology: compiledTimeline.topology,
    topologyCompiler: compiledTimeline.topologyCompiler,
    fieldEnvelopePolicy: compiledTimeline.fieldEnvelope?.policy || null,
    topologyArc: compiledTimeline.topologyArc || null,
    operators: compiledTimeline.operators,
    atmosphere,
    temporalSampling,
    witnessWindow,
    graphSha256,
  };
  if (Object.hasOwn(compiledTimeline, "topologyResponse")) {
    core.topologyResponse = compiledTimeline.topologyResponse || null;
  }
  return Object.freeze(core);
}

module.exports = {
  buildVisualCompilerEvidence,
  compactTopologyResponseEvidence,
  hiddenTopologyResponse,
  promoteTopologyResponseEvidence,
};
