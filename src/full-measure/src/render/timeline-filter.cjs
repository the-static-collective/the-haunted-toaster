const base = require("./timeline-filter-base.cjs");
const { MUTATION_LATTICE_RENDERER_POLICY } = require("../generation/renderer-policy.cjs");
const { compileTopologyResponse } = require("./topology-response.cjs");
const { applyTopologyEventSeam } = require("./topology-event-seam.cjs");
const { compactTopologyResponseEvidence } = require("./visual-compiler-evidence.cjs");

function decorateOperators(operators, topologyResponse) {
  const decorated = Array.isArray(operators) ? operators.slice() : [];
  Object.defineProperty(decorated, "__topologyResponse", {
    value: topologyResponse,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return Object.freeze(decorated);
}

function compileTimelineFilterGraph(graph, execution) {
  const compiled = applyTopologyEventSeam(
    base.compileTimelineFilterGraph(graph, execution),
    execution,
  );
  if (execution?.timeline?.rendererPolicy !== MUTATION_LATTICE_RENDERER_POLICY) {
    return compiled;
  }

  let topologyResponse = null;
  const topology = execution?.timeline?.baseState?.topology;
  if (execution?.timeline?.nestedResponse && topology && topology !== "linear") {
    topologyResponse = compactTopologyResponseEvidence(
      compileTopologyResponse(execution.timeline, topology).evidence,
    );
  }

  return {
    ...compiled,
    topologyResponse,
    operators: decorateOperators(compiled.operators, topologyResponse),
  };
}

module.exports = {
  ...base,
  compileTimelineFilterGraph,
};
