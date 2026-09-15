# HyperFood Slice A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the renderer-independent HyperFood v0 ABI: validated semantic specs, canonical specimen identity, typed acyclic composition graphs, reconstructable mutation deltas, and deterministic organism transform traces without touching production rendering or UI.

**Architecture:** Add a focused `src/full-measure/src/hyperfood/` CommonJS subsystem that depends only on Node built-ins plus the existing Haunted Toaster canonicalization helper. Keep semantic normalization/validation separate from identity, graph topology, mutation reconstruction, and trace evaluation. All renderer, VSPantry admission, HyperFrames, Remotion, receipt-writing, and UI work remain outside Slice A.

**Tech Stack:** Node.js >=22, CommonJS (`.cjs`), `node:test`, `node:assert/strict`, existing `src/generation/canonical.cjs`, no new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-15-hyperfood-v0-design.md`

## Global Constraints

- Current `main` remains product authority; this implementation is developed on an isolated branch and is not merged or promoted without an explicit request.
- Preserve the accepted execution chain: `accepted VisualScore -> canonical ResolvedTimeline -> production preview -> production render -> retained score/timeline sidecars -> receipt`.
- HyperFood remains upstream material-production logic and never becomes song-render authority.
- No hidden entropy: no `Math.random()`, `Date.now()`, wall-clock state, ambient process state, renderer-only defaults, or unseeded randomness may alter semantic output.
- Reuse `src/full-measure/src/generation/canonical.cjs`; do not introduce a competing canonical JSON implementation.
- HyperFood specimen identity is distinct from HyperFood render identity and existing VSPantry byte identity.
- Do not change `canonicalSpecimenId()` in `src/full-measure/src/video-pantry/schema.cjs`.
- Do not replace or silently invoke `lyric-ghost-plan/v1`; `GHOST-TEXT` accepts already-declared cues only.
- Do not redefine Frame Reservoir affordance IDs such as `nested-crop-v1`, `tunnel-fold-v1`, or `radial-echo-v1`.
- Slice A adds no renderer integration, no FFmpeg behavior, no HyperFrames dependency, no Remotion dependency, no UI, no IPC, no VSPantry schema change, and no Dogram authority.
- The first supported organism versions are exactly `PULSE@0.1.0`, `GHOST-TEXT@0.1.0`, and `FRAME-EAT-FRAME@0.1.0`.
- The semantic schema is exactly `haunted-toaster/hyperfood-spec/v0.1`.
- The specimen address domain is `HauntedToaster-HyperFood-Specimen-v0` with prefix `hf0_`.
- Numeric semantic values pass through existing Haunted Toaster canonicalization; timing fields use integer milliseconds.
- Tests use the existing `node --test tests/*.test.cjs` harness and must be executable independently by filename.
- UI impact: none; browser witness: not-required; visual delta: none; packaged witness required: no; packaged witness: not-required; GitBook ontology changed: no.

---

## File Structure

Create these focused modules:

```text
src/full-measure/src/hyperfood/
├── registry.cjs      # immutable organism/source-node vocabulary and port metadata
├── schema.cjs        # semantic spec normalization, scalar/asset/timing/input validation
├── identity.cjs      # canonical semantic payload + hf0_ specimen address
├── graph.cjs         # typed DAG normalization, port checks, cycle/output refusal
├── mutation.cjs      # bounded JSON-pointer-like delta application + reconstruction proof
├── trace.cjs         # renderer-independent transform-state evaluation at witness times
└── index.cjs         # stable Slice A public surface
```

Create these tests:

```text
src/full-measure/tests/hyperfood-schema.test.cjs
src/full-measure/tests/hyperfood-identity.test.cjs
src/full-measure/tests/hyperfood-graph.test.cjs
src/full-measure/tests/hyperfood-mutation.test.cjs
src/full-measure/tests/hyperfood-trace.test.cjs
src/full-measure/tests/hyperfood-slice-a-contract.test.cjs
```

Do not modify the application manifest or root manifest in Slice A; the existing wildcard test command already discovers the new tests.

---

### Task 1: Organism Registry + Semantic Spec Validation

**Files:**
- Create: `src/full-measure/src/hyperfood/registry.cjs`
- Create: `src/full-measure/src/hyperfood/schema.cjs`
- Test: `src/full-measure/tests/hyperfood-schema.test.cjs`

**Interfaces:**
- Consumes: `normalizeSha256` and `normalizeByteLength` from `src/video-pantry/schema.cjs` only for asset-content validation; plain JavaScript objects from callers.
- Produces: `HYPERFOOD_SPEC_SCHEMA`, `ORGANISM_REGISTRY`, `SOURCE_NODE_REGISTRY`, `getOrganismDefinition(id, version)`, `normalizeHyperFoodSpec(input)`, `normalizeEventGrid(events, durationMs)`, `normalizeTextCues(cues, durationMs)`, `resolveSingleOrganismInputs(spec)`.

- [ ] **Step 1: Write failing registry/schema tests**

Create `src/full-measure/tests/hyperfood-schema.test.cjs` with these cases:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  HYPERFOOD_SPEC_SCHEMA,
  normalizeHyperFoodSpec,
} = require("../src/hyperfood/schema.cjs");

const SHA = "a".repeat(64);

function pulseSpec(overrides = {}) {
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism: { id: "PULSE", version: "0.1.0" },
    assets: [{
      id: "primary",
      mediaType: "image/png",
      sha256: SHA,
      byteLength: 12345,
      path: "C:/non-semantic/source.png",
      filename: "source.png",
    }],
    inputs: {
      surface: { asset: "primary" },
      events: { timingField: "events" },
    },
    timing: {
      durationMs: 4200,
      events: [
        { tMs: 981, strength: 0.65 },
        { tMs: 487, strength: 1 },
        { tMs: 487, strength: 0.4 },
        { tMs: 0, strength: 0.8 },
      ],
    },
    parameters: {
      attackMs: 40,
      holdMs: 0,
      decayMs: 180,
      scaleAmount: 0.08,
    },
    seed: 481516,
    target: { width: 1080, height: 1920, fps: 30, alpha: true },
    ...overrides,
  };
}

test("normalization removes path metadata and canonicalizes duplicate PULSE events", () => {
  const normalized = normalizeHyperFoodSpec(pulseSpec());
  assert.equal(normalized.assets[0].path, undefined);
  assert.equal(normalized.assets[0].filename, undefined);
  assert.deepEqual(normalized.timing.events, [
    { tMs: 0, strength: 0.8 },
    { tMs: 487, strength: 1 },
    { tMs: 981, strength: 0.65 },
  ]);
});

test("normalization refuses unsupported organism versions", () => {
  assert.throws(
    () => normalizeHyperFoodSpec(pulseSpec({ organism: { id: "PULSE", version: "9.9.9" } })),
    /unsupported hyperfood organism/i,
  );
});

test("normalization refuses unresolved single-organism input bindings", () => {
  const spec = pulseSpec();
  spec.inputs.surface = { asset: "missing" };
  assert.throws(() => normalizeHyperFoodSpec(spec), /input binding.*surface/i);
});

test("normalization refuses invalid event time and strength", () => {
  const negative = pulseSpec();
  negative.timing.events = [{ tMs: -1, strength: 1 }];
  assert.throws(() => normalizeHyperFoodSpec(negative), /event.*time/i);

  const strong = pulseSpec();
  strong.timing.events = [{ tMs: 1, strength: 1.1 }];
  assert.throws(() => normalizeHyperFoodSpec(strong), /strength/i);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
cd src/full-measure
node --test tests/hyperfood-schema.test.cjs
```

Expected: FAIL because `../src/hyperfood/schema.cjs` does not exist.

- [ ] **Step 3: Implement immutable vocabulary in `registry.cjs`**

Create the registry with exact supported IDs/versions and typed ports:

```js
const ORGANISM_REGISTRY = Object.freeze({
  "PULSE@0.1.0": Object.freeze({
    id: "PULSE",
    version: "0.1.0",
    inputs: Object.freeze({ surface: "Surface", events: "EventGrid" }),
    output: "Surface",
    parameterKeys: Object.freeze([
      "attackMs", "holdMs", "decayMs", "scaleAmount", "rotationDeg",
      "translateXPx", "translateYPx", "opacityAmount", "brightnessAmount",
      "blurPx", "phaseOffsetMs",
    ]),
  }),
  "GHOST-TEXT@0.1.0": Object.freeze({
    id: "GHOST-TEXT",
    version: "0.1.0",
    inputs: Object.freeze({ surface: "Surface?", cues: "TextCue[]", font: "FontAsset" }),
    output: "Surface",
    parameterKeys: Object.freeze([
      "ghostCount", "ghostIntervalMs", "ghostLifetimeMs", "xDriftPx", "yDriftPx",
      "scaleDrift", "rotationDriftDeg", "blurGrowthPx", "opacityDecay",
      "blendMode", "clearMode",
    ]),
  }),
  "FRAME-EAT-FRAME@0.1.0": Object.freeze({
    id: "FRAME-EAT-FRAME",
    version: "0.1.0",
    inputs: Object.freeze({ surface: "Surface" }),
    output: "Surface",
    parameterKeys: Object.freeze([
      "depth", "stepMs", "scalePerDepth", "rotationPerDepthDeg", "cropPerDepth",
      "pivotX", "pivotY", "opacityPerDepth", "staggerMs", "entryOrder", "exitOrder",
    ]),
  }),
});

const SOURCE_NODE_REGISTRY = Object.freeze({
  ASSET: Object.freeze({ version: "0.1.0", outputs: Object.freeze({ surface: "Surface", font: "FontAsset" }) }),
  "TEXT-CUES": Object.freeze({ version: "0.1.0", outputs: Object.freeze({ cues: "TextCue[]" }) }),
  "EVENT-GRID": Object.freeze({ version: "0.1.0", outputs: Object.freeze({ events: "EventGrid" }) }),
});

function getOrganismDefinition(id, version) {
  const key = `${String(id || "").trim()}@${String(version || "").trim()}`;
  const definition = ORGANISM_REGISTRY[key];
  if (!definition) throw new TypeError(`Unsupported HyperFood organism: ${key}`);
  return definition;
}

module.exports = { ORGANISM_REGISTRY, SOURCE_NODE_REGISTRY, getOrganismDefinition };
```

- [ ] **Step 4: Implement semantic normalization in `schema.cjs`**

Use strict helpers and return plain normalized objects. Minimum required behavior:

```js
const { normalizeByteLength, normalizeSha256 } = require("../video-pantry/schema.cjs");
const { getOrganismDefinition } = require("./registry.cjs");

const HYPERFOOD_SPEC_SCHEMA = "haunted-toaster/hyperfood-spec/v0.1";

function integer(value, label, { min = 0 } = {}) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min) {
    throw new TypeError(`${label} must be a safe integer >= ${min}.`);
  }
  return number;
}

function finite(value, label, { min = -Infinity, max = Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  }
  return number;
}

function normalizeEventGrid(events, durationMs) {
  const byTime = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    const tMs = integer(event?.tMs, "HyperFood event time");
    if (tMs > durationMs) throw new RangeError("HyperFood event time exceeds duration.");
    const strength = finite(event?.strength, "HyperFood event strength", { min: 0, max: 1 });
    byTime.set(tMs, Math.max(byTime.get(tMs) ?? 0, strength));
  }
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tMs, strength]) => ({ tMs, strength }));
}
```

For assets, retain only semantic fields:

```js
function normalizeAssets(assets) {
  const ids = new Set();
  return (Array.isArray(assets) ? assets : []).map((asset) => {
    const id = String(asset?.id || "").trim();
    if (!id || ids.has(id)) throw new TypeError(`HyperFood asset id is missing or duplicated: ${id}`);
    ids.add(id);
    return {
      id,
      mediaType: String(asset.mediaType || "").trim().toLowerCase(),
      sha256: normalizeSha256(asset.sha256),
      byteLength: normalizeByteLength(asset.byteLength),
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
```

Implement `normalizeTextCues()` with integer `startMs`/`clearMs`, `0 <= startMs <= clearMs <= durationMs`, non-empty bounded text, and stable sort by `startMs`, then `clearMs`, then text.

Implement organism-specific parameter validation in this file. Unknown parameter keys must throw; omitted supported keys remain omitted rather than receiving renderer defaults. Enforce these Slice A bounds:

```text
PULSE:
attackMs/holdMs/decayMs/phaseOffsetMs: integer 0..60000
scaleAmount: finite -1..4
rotationDeg: finite -360..360
translateXPx/translateYPx: finite -10000..10000
opacityAmount: finite -1..1
brightnessAmount: finite -1..4
blurPx: finite 0..1000

GHOST-TEXT:
ghostCount: integer 0..128
ghostIntervalMs/ghostLifetimeMs: integer 0..60000
xDriftPx/yDriftPx: finite -10000..10000
scaleDrift: finite -4..4
rotationDriftDeg: finite -360..360
blurGrowthPx: finite 0..1000
opacityDecay: finite 0..1
blendMode: one of normal, screen, multiply, difference, overlay
clearMode: one of hard, fade

FRAME-EAT-FRAME:
depth: integer 1..64
stepMs/staggerMs: integer 0..60000
scalePerDepth: finite 0.01..4
rotationPerDepthDeg: finite -360..360
cropPerDepth: finite 0..0.95
pivotX/pivotY: finite 0..1
opacityPerDepth: finite 0..1
entryOrder/exitOrder: one of outer-first, inner-first
```

`normalizeHyperFoodSpec(input)` must:

```js
if (!input || input.schema !== HYPERFOOD_SPEC_SCHEMA) {
  throw new TypeError(`Expected ${HYPERFOOD_SPEC_SCHEMA}.`);
}
const durationMs = integer(input.timing?.durationMs, "HyperFood durationMs", { min: 1 });
const target = {
  width: integer(input.target?.width, "HyperFood target width", { min: 1 }),
  height: integer(input.target?.height, "HyperFood target height", { min: 1 }),
  fps: integer(input.target?.fps, "HyperFood target fps", { min: 1 }),
  alpha: Boolean(input.target?.alpha),
};
```

For single-organism specs, call `getOrganismDefinition()`, normalize timing/parameters/assets, then prove every required input binding resolves to a compatible semantic source. A missing optional `GHOST-TEXT.surface` is allowed; all other declared ports are required.

Graph specs are accepted structurally at this stage but delegated to Task 3 for topology/type validation.

- [ ] **Step 5: Run schema tests and full syntax check**

Run:

```bash
cd src/full-measure
node --test tests/hyperfood-schema.test.cjs
npm run check
```

Expected: both PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/full-measure/src/hyperfood/registry.cjs \
        src/full-measure/src/hyperfood/schema.cjs \
        src/full-measure/tests/hyperfood-schema.test.cjs
git commit -m "feat: add HyperFood semantic ABI"
```

---

### Task 2: Canonical Specimen Identity

**Files:**
- Create: `src/full-measure/src/hyperfood/identity.cjs`
- Test: `src/full-measure/tests/hyperfood-identity.test.cjs`

**Interfaces:**
- Consumes: `normalizeHyperFoodSpec(input)` from Task 1 and `addressCanonical(value, options)` / `canonicalStringify(value)` from `src/generation/canonical.cjs`.
- Produces: `HYPERFOOD_SPECIMEN_DOMAIN`, `HYPERFOOD_SPECIMEN_PREFIX`, `semanticPayload(input)`, `specimenId(input)`, `canonicalSpecimenJson(input)`.

- [ ] **Step 1: Write failing identity tests**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { specimenId, canonicalSpecimenJson } = require("../src/hyperfood/identity.cjs");
const { HYPERFOOD_SPEC_SCHEMA } = require("../src/hyperfood/schema.cjs");

function baseSpec(path, events) {
  return {
    schema: HYPERFOOD_SPEC_SCHEMA,
    organism: { id: "PULSE", version: "0.1.0" },
    assets: [{ id: "primary", mediaType: "image/png", sha256: "a".repeat(64), byteLength: 10, path }],
    inputs: { surface: { asset: "primary" }, events: { timingField: "events" } },
    timing: { durationMs: 1000, events },
    parameters: { attackMs: 20, decayMs: 100, scaleAmount: 0.1 },
    seed: 7,
    target: { width: 640, height: 360, fps: 30, alpha: false },
  };
}

test("path and authoring-order changes do not change HyperFood specimen identity", () => {
  const a = baseSpec("C:/one.png", [{ tMs: 500, strength: 0.2 }, { tMs: 0, strength: 1 }]);
  const b = baseSpec("D:/renamed.png", [{ tMs: 0, strength: 1 }, { tMs: 500, strength: 0.2 }]);
  assert.equal(specimenId(a), specimenId(b));
  assert.equal(canonicalSpecimenJson(a), canonicalSpecimenJson(b));
});

test("one semantic parameter delta changes specimen identity", () => {
  const a = baseSpec("x", [{ tMs: 0, strength: 1 }]);
  const b = structuredClone(a);
  b.parameters.scaleAmount = 0.11;
  assert.notEqual(specimenId(a), specimenId(b));
});

test("specimen IDs are domain separated hf0 addresses", () => {
  assert.match(specimenId(baseSpec("x", [])), /^hf0_[0-9a-f]{64}$/);
});
```

- [ ] **Step 2: Run identity test and verify RED**

```bash
cd src/full-measure
node --test tests/hyperfood-identity.test.cjs
```

Expected: FAIL because `identity.cjs` does not exist.

- [ ] **Step 3: Implement identity using existing canonicalization**

```js
const {
  addressCanonical,
  canonicalStringify,
} = require("../generation/canonical.cjs");
const { normalizeHyperFoodSpec } = require("./schema.cjs");

const HYPERFOOD_SPECIMEN_DOMAIN = "HauntedToaster-HyperFood-Specimen-v0";
const HYPERFOOD_SPECIMEN_PREFIX = "hf0_";

function semanticPayload(input) {
  return normalizeHyperFoodSpec(input);
}

function specimenId(input) {
  return addressCanonical(semanticPayload(input), {
    domain: HYPERFOOD_SPECIMEN_DOMAIN,
    prefix: HYPERFOOD_SPECIMEN_PREFIX,
  });
}

function canonicalSpecimenJson(input) {
  return canonicalStringify(semanticPayload(input));
}

module.exports = {
  HYPERFOOD_SPECIMEN_DOMAIN,
  HYPERFOOD_SPECIMEN_PREFIX,
  canonicalSpecimenJson,
  semanticPayload,
  specimenId,
};
```

Do not hash source paths, filenames, timestamps, or UI labels; Task 1 normalization already removes them.

- [ ] **Step 4: Run identity + schema tests**

```bash
cd src/full-measure
node --test tests/hyperfood-schema.test.cjs tests/hyperfood-identity.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/full-measure/src/hyperfood/identity.cjs \
        src/full-measure/tests/hyperfood-identity.test.cjs
git commit -m "feat: address HyperFood specimens canonically"
```

---

### Task 3: Typed Composition DAG Validation

**Files:**
- Create: `src/full-measure/src/hyperfood/graph.cjs`
- Modify: `src/full-measure/src/hyperfood/schema.cjs`
- Test: `src/full-measure/tests/hyperfood-graph.test.cjs`

**Interfaces:**
- Consumes: `ORGANISM_REGISTRY`, `SOURCE_NODE_REGISTRY`, Task 1 normalized enclosing assets/timing, graph objects.
- Produces: `normalizeHyperFoodGraph(graph, context)`, `topologicalNodeIds(graph)`, `portTypeForOutput(node, port)`, `portTypeForInput(node, port)`. `normalizeHyperFoodSpec()` returns a canonical normalized graph for graph specs.

- [ ] **Step 1: Write failing DAG tests**

Build a valid `GHOST-TEXT -> PULSE` graph fixture with declared source nodes:

```js
function compositionGraph() {
  return {
    nodes: [
      { id: "pulse", op: "PULSE", version: "0.1.0", parameters: { attackMs: 20, decayMs: 100, scaleAmount: 0.1 } },
      { id: "asset-a", op: "ASSET", version: "0.1.0", outputType: "Surface", assetId: "primary" },
      { id: "font-a", op: "ASSET", version: "0.1.0", outputType: "FontAsset", assetId: "font" },
      { id: "events-a", op: "EVENT-GRID", version: "0.1.0", field: "events" },
      { id: "cues-a", op: "TEXT-CUES", version: "0.1.0", field: "cues" },
      { id: "ghost", op: "GHOST-TEXT", version: "0.1.0", parameters: { ghostCount: 2, ghostIntervalMs: 80, ghostLifetimeMs: 500 } },
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
```

Test these exact laws:

```js
test("composition graph normalizes node/edge order and preserves both organism lineages", () => {
  const normalized = normalizeHyperFoodGraph(compositionGraph(), context());
  assert.deepEqual(normalized.nodes.map((node) => node.id), ["asset-a", "cues-a", "events-a", "font-a", "ghost", "pulse"]);
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
```

- [ ] **Step 2: Run graph test and verify RED**

```bash
cd src/full-measure
node --test tests/hyperfood-graph.test.cjs
```

Expected: FAIL because `graph.cjs` does not exist.

- [ ] **Step 3: Implement port parsing and type compatibility**

Use one parser for edge endpoints:

```js
function parseEndpoint(value, label) {
  const text = String(value || "").trim();
  const match = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(text);
  if (!match) throw new TypeError(`${label} must be node.port.`);
  return { nodeId: match[1], port: match[2] };
}

function compatible(outputType, inputType) {
  if (inputType.endsWith("?")) return outputType === inputType.slice(0, -1);
  return outputType === inputType;
}
```

Source-node resolution rules:

```text
ASSET outputType=Surface requires assetId whose mediaType is image/*, image/svg+xml, or video/*.
ASSET outputType=FontAsset requires assetId whose mediaType starts with font/ or is application/font-*.
TEXT-CUES field must equal cues and enclosing timing.cues must exist.
EVENT-GRID field must equal events and enclosing timing.events must exist.
```

Organism nodes use the exact registry port definitions and their own normalized parameter payload.

- [ ] **Step 4: Implement cycle/output/coverage refusal and canonical order**

Use Kahn topological validation over node IDs but serialize nodes by `id` and edges lexicographically by `from`, then `to` so authoring order cannot change specimen identity.

Require:

```text
- unique node IDs
- every edge source and target node exists
- exactly one incoming edge per required organism input port
- zero or one incoming edge for optional `Surface?`
- no unknown ports
- no duplicate edges
- acyclic graph
- declared output resolves to an existing Surface output
- lineage is unique organism IDs in topological dependency order, tie-broken lexicographically
```

Return:

```js
{
  nodes: canonicalNodes,
  edges: canonicalEdges,
  output,
  lineage,
}
```

- [ ] **Step 5: Integrate graph normalization into `normalizeHyperFoodSpec()`**

When `input.graph` exists, reject simultaneous top-level `organism`/`inputs` fields, normalize enclosing assets/timing/target/seed, then set:

```js
normalized.graph = normalizeHyperFoodGraph(input.graph, {
  assets: normalized.assets,
  timing: normalized.timing,
});
```

The resulting normalized graph enters Task 2 specimen identity unchanged.

- [ ] **Step 6: Run graph, schema, and identity tests**

```bash
cd src/full-measure
node --test tests/hyperfood-schema.test.cjs \
            tests/hyperfood-identity.test.cjs \
            tests/hyperfood-graph.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/full-measure/src/hyperfood/graph.cjs \
        src/full-measure/src/hyperfood/schema.cjs \
        src/full-measure/tests/hyperfood-graph.test.cjs
git commit -m "feat: validate HyperFood composition graphs"
```

---

### Task 4: Mutation Delta + Reconstruction Proof

**Files:**
- Create: `src/full-measure/src/hyperfood/mutation.cjs`
- Test: `src/full-measure/tests/hyperfood-mutation.test.cjs`

**Interfaces:**
- Consumes: normalized parent specs; Task 2 `specimenId()`; canonical delta array.
- Produces: `normalizeMutationDelta(delta)`, `applyHyperFoodDelta(parentSpec, delta)`, `reconstructHyperFoodMutation({ parentSpec, delta, expectedChildSpecimenId })`.

- [ ] **Step 1: Write failing mutation tests**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyHyperFoodDelta,
  reconstructHyperFoodMutation,
} = require("../src/hyperfood/mutation.cjs");
const { specimenId } = require("../src/hyperfood/identity.cjs");

// Use the same valid PULSE fixture as identity tests.

test("one-field replace reconstructs exactly one child specimen", () => {
  const parent = pulseFixture();
  const delta = [{ op: "replace", path: "/parameters/scaleAmount", value: 0.2 }];
  const child = applyHyperFoodDelta(parent, delta);
  assert.equal(child.parameters.scaleAmount, 0.2);
  assert.equal(parent.parameters.scaleAmount, 0.1);
  assert.notEqual(specimenId(parent), specimenId(child));

  const proof = reconstructHyperFoodMutation({
    parentSpec: parent,
    delta,
    expectedChildSpecimenId: specimenId(child),
  });
  assert.equal(proof.childSpecimenId, specimenId(child));
  assert.deepEqual(proof.delta, delta);
});

test("mutation refuses array-index paths", () => {
  assert.throws(
    () => applyHyperFoodDelta(pulseFixture(), [{ op: "replace", path: "/timing/events/0/strength", value: 0.5 }]),
    /array index/i,
  );
});

test("mutation reconstruction refuses a declared child-id mismatch", () => {
  assert.throws(
    () => reconstructHyperFoodMutation({
      parentSpec: pulseFixture(),
      delta: [{ op: "replace", path: "/parameters/scaleAmount", value: 0.2 }],
      expectedChildSpecimenId: `hf0_${"0".repeat(64)}`,
    }),
    /child specimen id/i,
  );
});
```

- [ ] **Step 2: Run mutation test and verify RED**

```bash
cd src/full-measure
node --test tests/hyperfood-mutation.test.cjs
```

Expected: FAIL because `mutation.cjs` does not exist.

- [ ] **Step 3: Implement bounded pointer parsing**

Support only `add`, `replace`, and `remove`. Parse RFC6901-style escaping for `~0` and `~1`, but refuse:

```text
- root replacement/removal
- empty path segments
- `__proto__`, `prototype`, or `constructor`
- any path segment that is a canonical array index (`0`, `1`, ...)
- operations outside semantic spec fields
```

Allowed top-level paths are:

```js
new Set(["organism", "assets", "inputs", "timing", "parameters", "seed", "target", "graph"])
```

Use immutable deep cloning with `structuredClone()`; never mutate the parent input.

- [ ] **Step 4: Apply then re-normalize**

After all operations:

```js
const rawChild = applyOperations(structuredClone(parentSpec), normalizedDelta);
const childSpec = normalizeHyperFoodSpec(rawChild);
```

`replace` requires an existing property; `remove` requires an existing property; `add` requires that the target property does not exist. For semantic collections such as `/timing/events` and `/timing/cues`, replace the entire collection rather than indexing into it.

- [ ] **Step 5: Implement reconstruction proof**

```js
function reconstructHyperFoodMutation({ parentSpec, delta, expectedChildSpecimenId }) {
  const normalizedDelta = normalizeMutationDelta(delta);
  const childSpec = applyHyperFoodDelta(parentSpec, normalizedDelta);
  const childSpecimenId = specimenId(childSpec);
  if (childSpecimenId !== expectedChildSpecimenId) {
    throw new Error(`HyperFood child specimen id mismatch: expected ${expectedChildSpecimenId}, got ${childSpecimenId}.`);
  }
  return {
    parentSpecimenId: specimenId(parentSpec),
    childSpecimenId,
    delta: normalizedDelta,
    childSpec,
  };
}
```

- [ ] **Step 6: Run mutation + identity tests**

```bash
cd src/full-measure
node --test tests/hyperfood-mutation.test.cjs tests/hyperfood-identity.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/full-measure/src/hyperfood/mutation.cjs \
        src/full-measure/tests/hyperfood-mutation.test.cjs
git commit -m "feat: prove HyperFood mutation deltas"
```

---

### Task 5: Pure Organism Transform Traces

**Files:**
- Create: `src/full-measure/src/hyperfood/trace.cjs`
- Test: `src/full-measure/tests/hyperfood-trace.test.cjs`

**Interfaces:**
- Consumes: Task 1 normalized single-organism specs; Task 2 specimen IDs; explicit witness times.
- Produces: `evaluateHyperFoodTrace(spec, witnessTimesMs)`, `evaluatePulseState(spec, tMs)`, `evaluateGhostTextState(spec, tMs)`, `evaluateFrameEatFrameState(spec, tMs)`, `hashUnit(key)`.

- [ ] **Step 1: Write failing PULSE trace tests**

Lock the v0.1.0 envelope semantics in executable tests:

```js
test("PULSE trace is identical for identical semantic specimens", () => {
  const spec = pulseFixture({
    timing: { durationMs: 1000, events: [{ tMs: 100, strength: 1 }] },
    parameters: { attackMs: 100, holdMs: 50, decayMs: 200, scaleAmount: 0.2 },
  });
  const times = [0, 100, 150, 200, 250, 350, 1000];
  const first = evaluateHyperFoodTrace(spec, times);
  const second = evaluateHyperFoodTrace(structuredClone(spec), times);
  assert.deepEqual(first, second);
});

test("PULSE uses attack-hold-decay with max overlap", () => {
  const spec = pulseFixture({
    timing: { durationMs: 1000, events: [{ tMs: 100, strength: 1 }] },
    parameters: { attackMs: 100, holdMs: 50, decayMs: 200, scaleAmount: 0.2 },
  });
  assert.equal(evaluatePulseState(spec, 100).envelope, 0);
  assert.equal(evaluatePulseState(spec, 150).envelope, 0.5);
  assert.equal(evaluatePulseState(spec, 200).envelope, 1);
  assert.equal(evaluatePulseState(spec, 250).envelope, 1);
  assert.equal(evaluatePulseState(spec, 350).envelope, 0.5);
  assert.equal(evaluatePulseState(spec, 450).envelope, 0);
});
```

Define PULSE event-relative envelope exactly as:

```text
local = tMs - (event.tMs + phaseOffsetMs)
local < 0                                            => 0
attackMs > 0 && local < attackMs                    => local / attackMs
local < attackMs + holdMs                           => 1
local < attackMs + holdMs + decayMs && decayMs > 0  => 1 - elapsedDecay / decayMs
otherwise                                           => 0
```

Multiply each event envelope by `strength`; combine all active events by `max`; round trace numeric values with the existing canonical quantization path when the trace is later hashed/serialized.

State fields:

```js
{
  envelope,
  scale: 1 + envelope * scaleAmount,
  rotationDeg: envelope * rotationDeg,
  translateXPx: envelope * translateXPx,
  translateYPx: envelope * translateYPx,
  opacity: 1 + envelope * opacityAmount,
  brightness: 1 + envelope * brightnessAmount,
  blurPx: envelope * blurPx,
}
```

Use zero for omitted amplitude parameters.

- [ ] **Step 2: Write failing GHOST-TEXT trace tests**

Use explicit cues; do not call `lyric-ghost-plan/v1`.

For cue `i`, residue `r` is born at:

```text
birthMs = cue.startMs + r * ghostIntervalMs
```

Residues exist only when `birthMs <= tMs`, `tMs < cue.clearMs`, and `ageMs < ghostLifetimeMs` (unless lifetime is `0`, meaning cue-clear-bound only).

Deterministic variation comes from SHA-256-derived units, not ambient randomness:

```js
function hashUnit(key) {
  const digest = crypto.createHash("sha256")
    .update("HauntedToaster-HyperFood-Trace-v0\0", "utf8")
    .update(String(key), "utf8")
    .digest("hex");
  return parseInt(digest.slice(0, 13), 16) / 0x1fffffffffffff;
}
```

Tests must prove:

```text
- identical spec/witness time yields identical residue transforms
- clearMs removes every residue at and after the clear time
- font/assets are not inferred from the system environment
- changing seed changes permitted drift but not cue timing
```

Per-residue state:

```text
progress = ghostLifetimeMs > 0 ? clamp(ageMs / ghostLifetimeMs, 0, 1) : 0
signedX = 2 * hashUnit(`${specimenId}|cue:${i}|residue:${r}|x`) - 1
signedY = 2 * hashUnit(`${specimenId}|cue:${i}|residue:${r}|y`) - 1
signedR = 2 * hashUnit(`${specimenId}|cue:${i}|residue:${r}|rotation`) - 1
xPx = signedX * xDriftPx * progress
yPx = signedY * yDriftPx * progress
rotationDeg = signedR * rotationDriftDeg * progress
scale = 1 + scaleDrift * progress
blurPx = blurGrowthPx * progress
opacity = max(0, 1 - opacityDecay * progress)
```

- [ ] **Step 3: Write failing FRAME-EAT-FRAME trace tests**

Lock structural recursion without framebuffer feedback.

For level `d` from `0` through `depth - 1`:

```text
activationMs = d * staggerMs
active = tMs >= activationMs
scale = scalePerDepth ** d
rotationDeg = rotationPerDepthDeg * d
crop = 1 - (1 - cropPerDepth) ** d
opacity = opacityPerDepth ** d
pivotX/pivotY are copied from parameters
```

If `stepMs > 0`, `entryProgress = clamp((tMs - activationMs) / stepMs, 0, 1)`; otherwise it is `1` when active. Include `entryProgress` in the trace but do not sample prior rendered frames.

Tests must prove:

```text
- exactly `depth` structural levels exist
- no trace state references t-1/framebuffer history
- deterministic level transforms are unchanged by object authoring order
- depth and stagger mutation visibly change only expected trace dimensions
```

- [ ] **Step 4: Implement `evaluateHyperFoodTrace()` dispatch**

Return one canonical-friendly object:

```js
{
  schema: "haunted-toaster/hyperfood-transform-trace/v0",
  specimenId: specimenId(normalizedSpec),
  organism: `${normalizedSpec.organism.id}@${normalizedSpec.organism.version}`,
  witnessTimesMs: normalizedTimes,
  states: normalizedTimes.map((tMs) => ({ tMs, state: evaluator(normalizedSpec, tMs) })),
}
```

Normalize witness times as unique safe integers in `[0, durationMs]`, ascending. Refuse graph specs in Slice A trace dispatch with an explicit `Graph transform tracing is not implemented in Slice A` error; graph composition trace execution belongs to the HyperFrames/portability slices after individual organism semantics are proven.

- [ ] **Step 5: Run trace tests**

```bash
cd src/full-measure
node --test tests/hyperfood-trace.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Run all HyperFood tests together**

```bash
cd src/full-measure
node --test tests/hyperfood-*.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/full-measure/src/hyperfood/trace.cjs \
        src/full-measure/tests/hyperfood-trace.test.cjs
git commit -m "feat: evaluate HyperFood transform traces"
```

---

### Task 6: Stable Slice A Public Surface + Contract Proof

**Files:**
- Create: `src/full-measure/src/hyperfood/index.cjs`
- Create: `src/full-measure/tests/hyperfood-slice-a-contract.test.cjs`
- No package export change in Slice A.

**Interfaces:**
- Consumes: all previous Slice A modules.
- Produces: one stable internal import surface for later HyperFrames/Remotion/VSPantry bridge slices.

- [ ] **Step 1: Write failing public-surface contract test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const hyperfood = require("../src/hyperfood/index.cjs");

const EXPECTED_EXPORTS = [
  "HYPERFOOD_SPEC_SCHEMA",
  "ORGANISM_REGISTRY",
  "SOURCE_NODE_REGISTRY",
  "applyHyperFoodDelta",
  "canonicalSpecimenJson",
  "evaluateHyperFoodTrace",
  "getOrganismDefinition",
  "normalizeEventGrid",
  "normalizeHyperFoodGraph",
  "normalizeHyperFoodSpec",
  "normalizeMutationDelta",
  "normalizeTextCues",
  "reconstructHyperFoodMutation",
  "semanticPayload",
  "specimenId",
];

test("Slice A exposes only the stable renderer-independent HyperFood ABI", () => {
  assert.deepEqual(Object.keys(hyperfood).sort(), EXPECTED_EXPORTS.sort());
  for (const forbidden of ["render", "ffmpeg", "hyperframes", "remotion", "admitToPantry", "receiptWriter"]) {
    assert.equal(hyperfood[forbidden], undefined);
  }
});
```

- [ ] **Step 2: Run contract test and verify RED**

```bash
cd src/full-measure
node --test tests/hyperfood-slice-a-contract.test.cjs
```

Expected: FAIL because `index.cjs` does not exist.

- [ ] **Step 3: Implement exact public surface**

Create `src/full-measure/src/hyperfood/index.cjs` by explicitly importing and re-exporting the stable functions/constants. Do not use object spreading from module namespaces; enumerate every export so later accidental renderer/bridge additions cannot leak into the ABI.

```js
const { ORGANISM_REGISTRY, SOURCE_NODE_REGISTRY, getOrganismDefinition } = require("./registry.cjs");
const {
  HYPERFOOD_SPEC_SCHEMA,
  normalizeEventGrid,
  normalizeHyperFoodSpec,
  normalizeTextCues,
} = require("./schema.cjs");
const { canonicalSpecimenJson, semanticPayload, specimenId } = require("./identity.cjs");
const { normalizeHyperFoodGraph } = require("./graph.cjs");
const {
  applyHyperFoodDelta,
  normalizeMutationDelta,
  reconstructHyperFoodMutation,
} = require("./mutation.cjs");
const { evaluateHyperFoodTrace } = require("./trace.cjs");

module.exports = {
  HYPERFOOD_SPEC_SCHEMA,
  ORGANISM_REGISTRY,
  SOURCE_NODE_REGISTRY,
  applyHyperFoodDelta,
  canonicalSpecimenJson,
  evaluateHyperFoodTrace,
  getOrganismDefinition,
  normalizeEventGrid,
  normalizeHyperFoodGraph,
  normalizeHyperFoodSpec,
  normalizeMutationDelta,
  normalizeTextCues,
  reconstructHyperFoodMutation,
  semanticPayload,
  specimenId,
};
```

- [ ] **Step 4: Run the isolated HyperFood suite**

```bash
cd src/full-measure
node --test tests/hyperfood-*.test.cjs
```

Expected: PASS with zero failures.

- [ ] **Step 5: Run repository syntax/structure check**

```bash
npm --prefix src/full-measure run check
```

Expected: PASS; `scripts/check.cjs` syntax-checks every `.cjs`/`.js` file recursively.

- [ ] **Step 6: Run the complete deterministic test suite**

```bash
npm --prefix src/full-measure test
```

Expected: PASS with zero failures.

- [ ] **Step 7: Run repository verification including smoke**

```bash
npm run verify
```

Expected: PASS. If smoke cannot execute because of environment/tooling constraints, record the exact failing command/output and do not convert that limitation into a pass claim.

- [ ] **Step 8: Inspect the final diff for scope violations**

Run:

```bash
git diff --stat <slice-a-base>...HEAD
git diff <slice-a-base>...HEAD -- src/full-measure/src/hyperfood src/full-measure/tests/hyperfood-*.test.cjs
```

Expected changed runtime paths: only `src/full-measure/src/hyperfood/*.cjs`; expected tests: only `src/full-measure/tests/hyperfood-*.test.cjs`. No renderer, UI, VSPantry, package manifest, profile, constraint, receipt, or existing canonical artifact should change.

- [ ] **Step 9: Commit Task 6**

```bash
git add src/full-measure/src/hyperfood/index.cjs \
        src/full-measure/tests/hyperfood-slice-a-contract.test.cjs
git commit -m "feat: expose HyperFood Slice A ABI"
```

- [ ] **Step 10: Prepare the implementation handoff receipt**

Report exactly:

```text
Checks run: <exact commands and PASS/FAIL>
Failures/limitations: <none or exact evidence>
Artifact impact: no generated release artifacts retained
Canonical artifact impact: HyperFood introduces new hf0_ specimen addresses only; no existing VisualScore, ResolvedTimeline, VSPantry, receipt, renderer profile, or constraint identity changed
Compatibility surface: additive internal module only
UI impact: none
browser witness: not-required
visual delta: none
packaged witness required: no
packaged witness: not-required
GitBook ontology changed: no
Remaining frontier: Slice B HyperFrames reference adapter + crucible, still gated separately
```

---

## Plan Self-Review

### Spec coverage

This plan covers every Slice A deliverable from the approved design:

- schema validation — Task 1;
- explicit input binding resolution — Tasks 1 and 3;
- organism registry metadata — Task 1;
- canonical specimen identity via existing Toaster canonicalization — Task 2;
- typed DAG validation and refusal — Task 3;
- mutation delta/reconstruction law — Task 4;
- renderer-independent transform traces — Task 5;
- fixtures/tests for identity, graph refusal, mutation law, and ABI boundary — Tasks 1–6.

Explicitly deferred according to the spec: renderer adapters, HyperFrames/Remotion packages, material-render receipts, output encoding, VSPantry admission, candidate selection, song-render execution, UI, Dogram projection, and cross-renderer portability execution.

### Placeholder scan

No implementation step uses `TBD`, `TODO`, “similar to Task N,” unspecified validation, or unnamed test behavior. Every code-bearing task provides concrete interfaces, test cases, commands, and expected outcomes.

### Type consistency

The plan consistently uses these interfaces across tasks:

```text
normalizeHyperFoodSpec(input) -> normalized semantic spec
specimenId(input) -> hf0_<64 hex>
normalizeHyperFoodGraph(graph, context) -> canonical graph + lineage
applyHyperFoodDelta(parentSpec, delta) -> normalized child spec
reconstructHyperFoodMutation(...) -> parent/child IDs + normalized delta + child spec
evaluateHyperFoodTrace(spec, witnessTimesMs) -> transform-trace object
```

No later task depends on a symbol that is absent from an earlier task or the final explicit `index.cjs` export surface.
