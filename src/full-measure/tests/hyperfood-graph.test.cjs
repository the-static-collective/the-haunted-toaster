const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeHyperFoodGraph,
} = require("../src/hyperfood/graph.cjs");

function context() {
  return {
    assets: [
      {
        id: "primary",
        mediaType: "image/png",
        sha256: "a".repeat(64),
        byteLength: 10,
      },
      {
        id: "font",
        mediaType: "font/woff2",
        sha256: "b".repeat(64),
        byteLength: 20,
      },
    ],
    timing: {
      durationMs: 1000,
      events: [{ tMs: 0, strength: 1 }],
      cues: [{ text: "KEEP THE TRACE", startMs: 100, clearMs: 900 }],
    },
  };
}

function compositionGraph() {
  return {
    nodes: [
      {
        id: "pulse",
        op: "PULSE",
        version: "0.1.0",
        parameters: { attackMs: 20, decayMs: 100, scaleAmount: 0.1 },
      },
      {
        id: "asset-a",
        op: "ASSET",
        version: "0.1.0",
        outputType: "Surface",
        assetId: "primary",
      },
      {
        id: "font-a",
        op: "ASSET",
        version: "0.1.0",
        outputType: "FontAsset",
        assetId: "font",
      },
      { id: "events-a", op: "EVENT-GRID", version: "0.1.0", field: "events" },
      { id: "cues-a", op: "TEXT-CUES", version: "0.1.0", field: "cues" },
      {
        id: "ghost",
        op: "GHOST-TEXT",
        version: "0.1.0",
        parameters: {
          ghostCount: 2,
          ghostIntervalMs: 80,
          ghostLifetimeMs: 500,
        },
      },
    ],
    edges: [
      { from: "events-a.events", to: "pulse.events" },
      { from: "ghost.surface", to: "pulse.surface" },
      { from: "cues-a.cues", to: "ghost.cues" },
      { from: "font-a.font", to: "ghost.font" },
      { from: "asset-a.surface", to: "ghost.surface" },
    ],
    output: "pulse.surface",
  };
}

test("composition graph normalizes node/edge order and preserves both organism lineages", () => {
  const normalized = normalizeHyperFoodGraph(compositionGraph(), context());
  assert.deepEqual(normalized.nodes.map((node) => node.id), [
    "asset-a",
    "cues-a",
    "events-a",
    "font-a",
    "ghost",
    "pulse",
  ]);
  assert.deepEqual(normalized.lineage, ["GHOST-TEXT@0.1.0", "PULSE@0.1.0"]);
  assert.equal(normalized.output, "pulse.surface");
});

test("graph refuses unresolved source nodes", () => {
  const graph = compositionGraph();
  graph.edges.push({ from: "missing.surface", to: "pulse.surface" });
  assert.throws(() => normalizeHyperFoodGraph(graph, context()), /missing node/i);
});

test("graph refuses incompatible port types", () => {
  const graph = compositionGraph();
  graph.edges = graph.edges.filter((edge) => edge.to !== "pulse.events");
  graph.edges.push({ from: "asset-a.surface", to: "pulse.events" });
  assert.throws(() => normalizeHyperFoodGraph(graph, context()), /port type/i);
});

test("graph refuses cycles", () => {
  const graph = compositionGraph();
  graph.edges.push({ from: "pulse.surface", to: "ghost.surface" });
  assert.throws(() => normalizeHyperFoodGraph(graph, context()), /cycle/i);
});
