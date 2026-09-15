const {
  SOURCE_NODE_REGISTRY,
  getOrganismDefinition,
} = require("./registry.cjs");
const {
  normalizeOrganismParameters,
} = require("./schema.cjs");

function parseEndpoint(value, label) {
  const text = String(value || "").trim();
  const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(text);
  if (!match) throw new TypeError(`HyperFood ${label} endpoint must be node.port.`);
  return { text, nodeId: match[1], port: match[2] };
}

function isSurfaceMediaType(mediaType) {
  return String(mediaType || "").startsWith("image/")
    || String(mediaType || "").startsWith("video/");
}

function isFontMediaType(mediaType) {
  return String(mediaType || "").startsWith("font/")
    || String(mediaType || "").startsWith("application/font-");
}

function normalizeSourceNode(node, context) {
  const definition = SOURCE_NODE_REGISTRY[node.op];
  if (!definition || node.version !== definition.version) {
    throw new TypeError(`Unsupported HyperFood source node: ${node.op}@${node.version}`);
  }
  if (node.op === "ASSET") {
    if (!["Surface", "FontAsset"].includes(node.outputType)) {
      throw new TypeError(`HyperFood ASSET node ${node.id} requires Surface or FontAsset outputType.`);
    }
    const assetId = String(node.assetId || "").trim();
    const asset = context.assets.find((item) => item.id === assetId);
    if (!asset) throw new TypeError(`HyperFood ASSET node ${node.id} references missing asset: ${assetId}`);
    if (node.outputType === "Surface" && !isSurfaceMediaType(asset.mediaType)) {
      throw new TypeError(`HyperFood ASSET node ${node.id} requires a Surface-compatible asset.`);
    }
    if (node.outputType === "FontAsset" && !isFontMediaType(asset.mediaType)) {
      throw new TypeError(`HyperFood ASSET node ${node.id} requires a FontAsset-compatible asset.`);
    }
    return {
      id: node.id,
      op: node.op,
      version: node.version,
      outputType: node.outputType,
      assetId,
    };
  }
  if (node.op === "TEXT-CUES") {
    const field = String(node.field || "").trim();
    if (field !== "cues" || !Array.isArray(context.timing?.cues)) {
      throw new TypeError(`HyperFood TEXT-CUES node ${node.id} requires timing.cues.`);
    }
    return { id: node.id, op: node.op, version: node.version, field: "cues" };
  }
  if (node.op === "EVENT-GRID") {
    const field = String(node.field || "").trim();
    if (field !== "events" || !Array.isArray(context.timing?.events)) {
      throw new TypeError(`HyperFood EVENT-GRID node ${node.id} requires timing.events.`);
    }
    return { id: node.id, op: node.op, version: node.version, field: "events" };
  }
  throw new TypeError(`Unsupported HyperFood source node: ${node.op}`);
}

function normalizeNode(rawNode, context) {
  if (!rawNode || typeof rawNode !== "object" || Array.isArray(rawNode)) {
    throw new TypeError("HyperFood graph nodes must be objects.");
  }
  const id = String(rawNode.id || "").trim();
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new TypeError(`Invalid HyperFood graph node id: ${id}`);
  }
  const op = String(rawNode.op || "").trim();
  const version = String(rawNode.version || "").trim();
  const node = { ...rawNode, id, op, version };
  if (SOURCE_NODE_REGISTRY[op]) return normalizeSourceNode(node, context);
  const definition = getOrganismDefinition(op, version);
  return {
    id,
    op: definition.id,
    version: definition.version,
    parameters: normalizeOrganismParameters(definition, rawNode.parameters),
  };
}

function outputPortType(node) {
  if (node.op === "ASSET") {
    return node.outputType === "Surface"
      ? { surface: "Surface" }
      : { font: "FontAsset" };
  }
  if (node.op === "TEXT-CUES") return { cues: "TextCue[]" };
  if (node.op === "EVENT-GRID") return { events: "EventGrid" };
  const definition = getOrganismDefinition(node.op, node.version);
  return { surface: definition.output };
}

function inputPortTypes(node) {
  if (SOURCE_NODE_REGISTRY[node.op]) return {};
  return getOrganismDefinition(node.op, node.version).inputs;
}

function topologicalOrder(nodes, edges) {
  const ids = nodes.map((node) => node.id);
  const indegree = new Map(ids.map((id) => [id, 0]));
  const outgoing = new Map(ids.map((id) => [id, []]));
  for (const edge of edges) {
    if (edge.fromNode === edge.toNode) {
      throw new TypeError("HyperFood graph contains a cycle.");
    }
    indegree.set(edge.toNode, indegree.get(edge.toNode) + 1);
    outgoing.get(edge.fromNode).push(edge.toNode);
  }
  const ready = ids.filter((id) => indegree.get(id) === 0).sort();
  const ordered = [];
  while (ready.length) {
    const id = ready.shift();
    ordered.push(id);
    for (const target of [...outgoing.get(id)].sort()) {
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) {
        ready.push(target);
        ready.sort();
      }
    }
  }
  if (ordered.length !== nodes.length) {
    throw new TypeError("HyperFood graph contains a cycle.");
  }
  return ordered;
}

function normalizeHyperFoodGraph(graph, context = {}) {
  if (!graph || typeof graph !== "object" || Array.isArray(graph)) {
    throw new TypeError("HyperFood graph must be an object.");
  }
  if (!Array.isArray(graph.nodes) || !graph.nodes.length) {
    throw new TypeError("HyperFood graph requires at least one node.");
  }
  if (!Array.isArray(graph.edges)) {
    throw new TypeError("HyperFood graph edges must be an array.");
  }
  const normalizedContext = {
    assets: Array.isArray(context.assets) ? context.assets : [],
    timing: context.timing || {},
  };
  const nodes = graph.nodes.map((node) => normalizeNode(node, normalizedContext));
  const nodeById = new Map();
  for (const node of nodes) {
    if (nodeById.has(node.id)) throw new TypeError(`Duplicate HyperFood graph node id: ${node.id}`);
    nodeById.set(node.id, node);
  }

  const seenEdges = new Set();
  const edges = graph.edges.map((rawEdge) => {
    const from = parseEndpoint(rawEdge?.from, "edge from");
    const to = parseEndpoint(rawEdge?.to, "edge to");
    const fromNode = nodeById.get(from.nodeId);
    const toNode = nodeById.get(to.nodeId);
    if (!fromNode) throw new TypeError(`HyperFood graph edge references missing node: ${from.nodeId}`);
    if (!toNode) throw new TypeError(`HyperFood graph edge references missing node: ${to.nodeId}`);
    const sourceType = outputPortType(fromNode)[from.port];
    if (!sourceType) {
      throw new TypeError(`Unknown HyperFood output port: ${from.text}`);
    }
    const rawTargetType = inputPortTypes(toNode)[to.port];
    if (!rawTargetType) {
      throw new TypeError(`Unknown HyperFood input port: ${to.text}`);
    }
    const targetType = rawTargetType.endsWith("?") ? rawTargetType.slice(0, -1) : rawTargetType;
    if (sourceType !== targetType) {
      throw new TypeError(
        `HyperFood port type mismatch: ${from.text} is ${sourceType}, ${to.text} requires ${targetType}.`,
      );
    }
    const key = `${from.text}->${to.text}`;
    if (seenEdges.has(key)) throw new TypeError(`Duplicate HyperFood graph edge: ${key}`);
    seenEdges.add(key);
    return {
      from: from.text,
      to: to.text,
      fromNode: from.nodeId,
      toNode: to.nodeId,
    };
  });

  const topo = topologicalOrder(nodes, edges);

  const incoming = new Map(nodes.map((node) => [node.id, new Map()]));
  for (const edge of edges) {
    const port = parseEndpoint(edge.to, "edge to").port;
    const counts = incoming.get(edge.toNode);
    counts.set(port, (counts.get(port) || 0) + 1);
  }
  for (const node of nodes) {
    if (SOURCE_NODE_REGISTRY[node.op]) continue;
    const inputs = inputPortTypes(node);
    for (const [port, rawType] of Object.entries(inputs)) {
      const optional = rawType.endsWith("?");
      const count = incoming.get(node.id).get(port) || 0;
      if ((!optional && count !== 1) || (optional && count > 1)) {
        throw new TypeError(
          `HyperFood graph input ${node.id}.${port} requires ${optional ? "zero or one" : "exactly one"} edge.`,
        );
      }
    }
  }

  const output = parseEndpoint(graph.output, "output");
  const outputNode = nodeById.get(output.nodeId);
  if (!outputNode) throw new TypeError(`HyperFood graph output references missing node: ${output.nodeId}`);
  const outputType = outputPortType(outputNode)[output.port];
  if (outputType !== "Surface") {
    throw new TypeError("HyperFood graph output must resolve to a Surface port.");
  }

  const canonicalNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const canonicalEdges = edges
    .map(({ from, to }) => ({ from, to }))
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  const lineage = topo
    .map((id) => nodeById.get(id))
    .filter((node) => !SOURCE_NODE_REGISTRY[node.op])
    .map((node) => `${node.op}@${node.version}`);

  return {
    nodes: canonicalNodes,
    edges: canonicalEdges,
    output: output.text,
    lineage,
  };
}

module.exports = {
  normalizeHyperFoodGraph,
  parseEndpoint,
};
