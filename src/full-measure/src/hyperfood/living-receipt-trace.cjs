const {
  HYPERFOOD_SPEC_SCHEMA,
} = require("./schema.cjs");
const {
  specimenId,
} = require("./identity.cjs");
const {
  evaluateHyperFoodTrace,
  normalizeWitnessTimes,
} = require("./trace.cjs");
const {
  FIRST_BETA_LIVING_RECEIPT_PROFILE,
} = require("./living-receipt-specimen.cjs");

const LIVING_RECEIPT_TRACE_SCHEMA = "haunted-toaster/hyperfood-living-receipt-trace/v0";
const LIVING_RECEIPT_TRACE_AUTHORITY = "descriptive-descendant-only";

const EXPECTED_LINEAGE = Object.freeze([
  "FRAME-EAT-FRAME@0.1.0",
  "PULSE@0.1.0",
]);
const EXPECTED_EDGES = Object.freeze([
  "accepted-beta-video.surface->frame-eat-frame.surface",
  "frame-eat-frame.surface->pulse.surface",
  "receipt-events.events->pulse.events",
]);

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function assertFirstBetaGraph(spec) {
  const graph = object(spec.graph, "First beta living receipt graph");
  if (graph.output !== "pulse.surface") {
    throw new TypeError("First beta living receipt trace refuses graph output drift.");
  }
  if (
    !Array.isArray(graph.lineage)
    || graph.lineage.length !== EXPECTED_LINEAGE.length
    || graph.lineage.some((value, index) => value !== EXPECTED_LINEAGE[index])
  ) {
    throw new TypeError("First beta living receipt trace refuses graph lineage drift.");
  }
  if (!Array.isArray(graph.nodes) || graph.nodes.length !== 4) {
    throw new TypeError("First beta living receipt trace requires the exact four-node graph.");
  }
  if (!Array.isArray(graph.edges) || graph.edges.length !== EXPECTED_EDGES.length) {
    throw new TypeError("First beta living receipt trace requires the exact graph edges.");
  }

  const expectedNodes = new Map([
    ["accepted-beta-video", "ASSET@0.1.0"],
    ["frame-eat-frame", "FRAME-EAT-FRAME@0.1.0"],
    ["receipt-events", "EVENT-GRID@0.1.0"],
    ["pulse", "PULSE@0.1.0"],
  ]);
  const nodeById = new Map();
  for (const node of graph.nodes) {
    const id = String(node?.id || "");
    const signature = `${String(node?.op || "")}@${String(node?.version || "")}`;
    if (!expectedNodes.has(id) || expectedNodes.get(id) !== signature || nodeById.has(id)) {
      throw new TypeError("First beta living receipt trace refuses graph node drift.");
    }
    nodeById.set(id, node);
  }
  if (nodeById.size !== expectedNodes.size) {
    throw new TypeError("First beta living receipt trace requires every expected graph node.");
  }

  const edgeKeys = graph.edges
    .map((edge) => `${String(edge?.from || "")}->${String(edge?.to || "")}`)
    .sort();
  const expectedEdgeKeys = [...EXPECTED_EDGES].sort();
  if (edgeKeys.some((value, index) => value !== expectedEdgeKeys[index])) {
    throw new TypeError("First beta living receipt trace refuses graph edge drift.");
  }

  return nodeById;
}

function validateLivingSpecimen(living) {
  object(living, "Living receipt trace input");
  if (living.profile !== FIRST_BETA_LIVING_RECEIPT_PROFILE) {
    throw new TypeError(
      `Living receipt trace profile must be ${FIRST_BETA_LIVING_RECEIPT_PROFILE}.`,
    );
  }
  const spec = object(living.spec, "Living receipt semantic specimen");
  const computedSpecimenId = specimenId(spec);
  if (living.specimenId !== computedSpecimenId) {
    throw new TypeError("Living receipt trace specimen identity does not match semantic specimen.");
  }
  const nodeById = assertFirstBetaGraph(spec);
  return { spec, nodeById, specimenId: computedSpecimenId };
}

function baseSingleOrganismSpec(spec) {
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    assets: spec.assets,
    timing: { durationMs: spec.timing.durationMs },
    seed: spec.seed,
    target: spec.target,
  };
}

function frameTraceSpec(spec, nodeById) {
  const frame = nodeById.get("frame-eat-frame");
  return {
    ...baseSingleOrganismSpec(spec),
    organism: { id: "FRAME-EAT-FRAME", version: "0.1.0" },
    inputs: { surface: { asset: "accepted-beta-video" } },
    parameters: frame.parameters,
  };
}

function pulseTraceSpec(spec, nodeById) {
  const pulse = nodeById.get("pulse");
  return {
    ...baseSingleOrganismSpec(spec),
    timing: {
      durationMs: spec.timing.durationMs,
      events: spec.timing.events,
    },
    organism: { id: "PULSE", version: "0.1.0" },
    inputs: {
      surface: { asset: "accepted-beta-video" },
      events: { timingField: "events" },
    },
    parameters: pulse.parameters,
  };
}

function evaluateFirstBetaLivingReceiptTrace(living, witnessTimesMs) {
  const {
    spec,
    nodeById,
    specimenId: livingSpecimenId,
  } = validateLivingSpecimen(living);
  const witnessTimes = normalizeWitnessTimes(witnessTimesMs, spec.timing.durationMs);
  const frameTrace = evaluateHyperFoodTrace(
    frameTraceSpec(spec, nodeById),
    witnessTimes,
  );
  const pulseTrace = evaluateHyperFoodTrace(
    pulseTraceSpec(spec, nodeById),
    witnessTimes,
  );

  return {
    schema: LIVING_RECEIPT_TRACE_SCHEMA,
    profile: FIRST_BETA_LIVING_RECEIPT_PROFILE,
    specimenId: livingSpecimenId,
    authority: LIVING_RECEIPT_TRACE_AUTHORITY,
    graph: {
      output: spec.graph.output,
      lineage: [...spec.graph.lineage],
    },
    witnessTimesMs: witnessTimes,
    states: witnessTimes.map((tMs, index) => ({
      tMs,
      frameEatFrame: frameTrace.states[index],
      pulse: pulseTrace.states[index],
    })),
  };
}

module.exports = {
  LIVING_RECEIPT_TRACE_SCHEMA,
  evaluateFirstBetaLivingReceiptTrace,
};
