# Creative Context Table v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable Creative Context Table so Haunted Toaster candidate generation can deterministically know what creative evidence is available, let different candidates consume or ignore lawful subsets, and record an inspectable Influence Diet without widening renderer authority.

**Architecture:** Add a small generation-side contract layer for typed creative-context entries and per-candidate diets, then adapt existing song/source, Native Color, and receipt-memory seams into that table. Candidate-family artifacts carry the table identity and diet evidence; accepted `VisualScore` and `ResolvedTimeline` remain the only production execution authority, and `executionForRender()` never receives the full table. Existing Native Color and memory behavior are migrated behind table entries rather than duplicated.

**Tech Stack:** Node.js >=22, CommonJS, `node:test`, existing Haunted Toaster canonical hashing/deep-freeze helpers, existing candidate-family / Native Color / receipt-memory generation seams.

**Spec:** `docs/superpowers/specs/2026-08-18-creative-context-table-v1-design.md`

## Global Constraints

- Do not execute behavior-changing Tasks 4–6 until the renderer-trust gate inherited from PR #155 has passed and the #147 candidate-ecology implementation is the selected ancestor for the beta line.
- The Table affects proposal/search/derivation only.
- Accepted `VisualScore -> ResolvedTimeline -> preview -> render -> receipt` authority remains unchanged.
- Full Creative Context Table state must not cross `executionForRender()` as ambient renderer decision state.
- Influence-only evidence cannot become parentage, timing authority, accepted score/timeline authority, or renderer authority.
- Locks and constraints remain absolute.
- Availability never implies mandatory consumption.
- Missing optional evidence is absent/unavailable rather than fabricated.
- Historical accepted artifacts retain their meaning; compatibility behavior must be explicit.
- No raw VSPantry video, ToastPack assimilation, Semantic Attractors, unresolved-lyric semantic features, new renderer operators, cloud context registry, winner ranking, or provider checkbox UI in this founding proof.
- Repository command door is the root `package.json`; application manifest/version authority is `src/full-measure/package.json`.
- UI impact for this plan is `none`; no packaged UI witness is required unless execution discovers an unexpected UI/bridge change, in which case stop and apply `docs/UI_CHANGE_PROTOCOL.md` before proceeding.

---

## File Structure

Create these focused units:

- `src/full-measure/src/generation/creative-context-table.cjs` — validates, normalizes, addresses, freezes, and queries Creative Context Table v1. It knows nothing about Electron, memory storage, or rendering.
- `src/full-measure/src/generation/influence-diet.cjs` — builds and validates per-candidate derivation evidence from an already-normalized Table.
- `src/full-measure/src/creative-context-providers.cjs` — session-level adapter that converts currently available song/source, Native Color, constraints, and receipt-memory evidence into typed provider entries.

Modify these existing seams only where the Table must travel:

- `src/full-measure/src/generation/index.cjs` — export the new generation contracts.
- `src/full-measure/src/generation/candidate-family.cjs` — record Table identity/diets in candidate-family derivation evidence and route the existing memory influence through the memory provider entry.
- `src/full-measure/src/generation/native-color-generation.cjs` — read Native Color evidence from the Table for the new beta path while preserving the legacy direct-option compatibility path.
- `src/full-measure/src/candidate-session.cjs` — construct one Table before generation, pass it into family generation, expose only proof summaries to preview/UI, and keep the full Table out of `executionForRender()`.

Add focused tests:

- `src/full-measure/tests/creative-context-table.test.cjs`
- `src/full-measure/tests/influence-diet.test.cjs`
- `src/full-measure/tests/creative-context-providers.test.cjs`

Extend existing tests rather than creating duplicate integration harnesses:

- `src/full-measure/tests/candidate-family.test.cjs` or its #147 successor on the selected beta ancestor.
- the existing candidate-session test file on the selected beta ancestor; if the #147/#166 stack renames or splits it, use the file that directly exercises `createCandidateSession()` and document that exact path in the implementation PR before changing code.

---

### Task 1: Creative Context Table contract

**Files:**
- Create: `src/full-measure/src/generation/creative-context-table.cjs`
- Create: `src/full-measure/tests/creative-context-table.test.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`

**Interfaces:**
- Consumes: `hashCanonical`, `canonicalStringify`, `deepFreeze` from `src/full-measure/src/generation/canonical.cjs`.
- Produces:
  - `CREATIVE_CONTEXT_TABLE_SCHEMA = "haunted-toaster/creative-context-table/v1"`
  - `CREATIVE_CONTEXT_PROVIDER_POLICY = "creative-context-provider-v1"`
  - `CREATIVE_CONTEXT_AUTHORITY_CLASSES`
  - `buildCreativeContextTable({ entries }) -> frozen CreativeContextTable`
  - `assertCreativeContextTable(table) -> frozen CreativeContextTable`
  - `findCreativeContextEntry(table, providerId) -> entry | null`

- [ ] **Step 1: Write the RED contract tests**

Create `src/full-measure/tests/creative-context-table.test.cjs` with explicit tests for deterministic normalization, order independence, duplicate refusal, authority-class refusal, required-unavailable refusal, and optional-unavailable omission/recording.

Use this shape:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const generation = require("../src/generation/index.cjs");

function entry(overrides = {}) {
  return {
    providerId: "source/song",
    policyVersion: "song-source-v1",
    evidenceRef: "sha256:" + "1".repeat(64),
    authorityClass: "source-truth",
    ancestryClass: "none",
    allowedDecisions: ["family-composition"],
    required: true,
    availability: "available",
    payload: { analysisHash: "a".repeat(64) },
    ...overrides,
  };
}

test("Creative Context Table normalization is deterministic and provider-order independent", () => {
  const source = entry();
  const memory = entry({
    providerId: "memory/receipt-v1",
    policyVersion: "toaster-memory-influence-v1",
    evidenceRef: "sha256:" + "2".repeat(64),
    authorityClass: "influence-only",
    required: false,
    allowedDecisions: ["coverage", "palette"],
    payload: { policy: "toaster-memory-influence-v1", target: "paletteLogic:duotone" },
  });
  const first = generation.buildCreativeContextTable({ entries: [source, memory] });
  const second = generation.buildCreativeContextTable({ entries: [memory, source] });

  assert.equal(first.schema, generation.CREATIVE_CONTEXT_TABLE_SCHEMA);
  assert.equal(first.tableHash, second.tableHash);
  assert.deepEqual(first.entries, second.entries);
  assert.deepEqual(first.entries.map((item) => item.providerId), ["memory/receipt-v1", "source/song"]);
  assert.equal(Object.isFrozen(first), true);
});

test("contradictory duplicate provider identities are refused", () => {
  assert.throws(
    () => generation.buildCreativeContextTable({
      entries: [entry(), entry({ evidenceRef: "sha256:" + "9".repeat(64) })],
    }),
    /duplicate creative context provider source\/song/i,
  );
});

test("unknown authority classes are refused", () => {
  assert.throws(
    () => generation.buildCreativeContextTable({
      entries: [entry({ authorityClass: "wizard-authority" })],
    }),
    /unknown creative context authority class/i,
  );
});

test("required unavailable evidence refuses while optional unavailable evidence is explicit", () => {
  assert.throws(
    () => generation.buildCreativeContextTable({
      entries: [entry({ availability: "unavailable" })],
    }),
    /required creative context provider source\/song is unavailable/i,
  );

  const table = generation.buildCreativeContextTable({
    entries: [
      entry(),
      entry({
        providerId: "memory/receipt-v1",
        evidenceRef: null,
        authorityClass: "influence-only",
        required: false,
        availability: "unavailable",
        payload: null,
      }),
    ],
  });
  assert.equal(
    generation.findCreativeContextEntry(table, "memory/receipt-v1").availability,
    "unavailable",
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm --prefix src/full-measure test -- --test-name-pattern="Creative Context Table|creative context"
```

If the repository's Node test script does not forward `--test-name-pattern`, run the file directly:

```bash
node --test src/full-measure/tests/creative-context-table.test.cjs
```

Expected: FAIL because `buildCreativeContextTable` and related exports do not exist.

- [ ] **Step 3: Implement the minimal table contract**

Create `src/full-measure/src/generation/creative-context-table.cjs` with these invariants:

```js
const { canonicalStringify, deepFreeze, hashCanonical } = require("./canonical.cjs");

const CREATIVE_CONTEXT_TABLE_SCHEMA = "haunted-toaster/creative-context-table/v1";
const CREATIVE_CONTEXT_PROVIDER_POLICY = "creative-context-provider-v1";
const CREATIVE_CONTEXT_AUTHORITY_CLASSES = Object.freeze([
  "source-truth",
  "constraint",
  "ancestry",
  "influence-only",
  "creative-material",
]);
const ANCESTRY_CLASSES = Object.freeze(["none", "explicit-parent"]);
const AVAILABILITY = Object.freeze(["available", "unavailable"]);

function normalizeStringArray(value) {
  return [...new Set((value || []).map(String))].sort();
}

function normalizeEntry(input) {
  if (!input || typeof input !== "object") throw new TypeError("Creative context entry must be an object.");
  const providerId = String(input.providerId || "").trim();
  const policyVersion = String(input.policyVersion || "").trim();
  const authorityClass = String(input.authorityClass || "").trim();
  const ancestryClass = String(input.ancestryClass || "none").trim();
  const availability = String(input.availability || "available").trim();
  if (!providerId) throw new TypeError("Creative context providerId is required.");
  if (!policyVersion) throw new TypeError(`Creative context provider ${providerId} requires policyVersion.`);
  if (!CREATIVE_CONTEXT_AUTHORITY_CLASSES.includes(authorityClass)) {
    throw new TypeError(`Unknown creative context authority class: ${authorityClass}.`);
  }
  if (!ANCESTRY_CLASSES.includes(ancestryClass)) {
    throw new TypeError(`Unknown creative context ancestry class: ${ancestryClass}.`);
  }
  if (!AVAILABILITY.includes(availability)) {
    throw new TypeError(`Unknown creative context availability: ${availability}.`);
  }
  if (authorityClass === "influence-only" && ancestryClass !== "none") {
    throw new TypeError(`Influence-only provider ${providerId} cannot claim ancestry.`);
  }
  const required = input.required === true;
  if (required && availability !== "available") {
    throw new TypeError(`Required creative context provider ${providerId} is unavailable.`);
  }
  if (availability === "available" && !input.evidenceRef) {
    throw new TypeError(`Available creative context provider ${providerId} requires evidenceRef.`);
  }
  return deepFreeze({
    schema: CREATIVE_CONTEXT_PROVIDER_POLICY,
    providerId,
    policyVersion,
    evidenceRef: input.evidenceRef ? String(input.evidenceRef) : null,
    authorityClass,
    ancestryClass,
    allowedDecisions: normalizeStringArray(input.allowedDecisions),
    required,
    availability,
    payload: input.payload == null ? null : structuredClone(input.payload),
  });
}

function buildCreativeContextTable({ entries = [] } = {}) {
  const normalized = entries.map(normalizeEntry).sort((a, b) => a.providerId.localeCompare(b.providerId));
  const seen = new Map();
  for (const item of normalized) {
    const previous = seen.get(item.providerId);
    if (previous && canonicalStringify(previous) !== canonicalStringify(item)) {
      throw new TypeError(`Duplicate creative context provider ${item.providerId} has contradictory evidence.`);
    }
    if (!previous) seen.set(item.providerId, item);
  }
  const unique = [...seen.values()];
  const core = { schema: CREATIVE_CONTEXT_TABLE_SCHEMA, entries: unique };
  return deepFreeze({
    ...core,
    tableHash: hashCanonical(core, "HauntedToaster-CreativeContextTable-v1"),
  });
}

function assertCreativeContextTable(table) {
  if (!table || table.schema !== CREATIVE_CONTEXT_TABLE_SCHEMA) {
    throw new TypeError(`Expected ${CREATIVE_CONTEXT_TABLE_SCHEMA}.`);
  }
  const rebuilt = buildCreativeContextTable({ entries: table.entries });
  if (rebuilt.tableHash !== table.tableHash) throw new TypeError("Creative Context Table hash mismatch.");
  return rebuilt;
}

function findCreativeContextEntry(table, providerId) {
  const validated = assertCreativeContextTable(table);
  return validated.entries.find((item) => item.providerId === String(providerId)) || null;
}

module.exports = {
  CREATIVE_CONTEXT_AUTHORITY_CLASSES,
  CREATIVE_CONTEXT_PROVIDER_POLICY,
  CREATIVE_CONTEXT_TABLE_SCHEMA,
  assertCreativeContextTable,
  buildCreativeContextTable,
  findCreativeContextEntry,
};
```

Add `...require("./creative-context-table.cjs")` to `src/full-measure/src/generation/index.cjs`.

- [ ] **Step 4: Run focused tests and existing canonical tests**

Run:

```bash
node --test src/full-measure/tests/creative-context-table.test.cjs
node --test src/full-measure/tests/candidate-family.test.cjs
```

Expected: PASS. Existing candidate-family behavior remains byte-for-byte semantically unchanged because no caller uses the Table yet.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/full-measure/src/generation/creative-context-table.cjs \
        src/full-measure/src/generation/index.cjs \
        src/full-measure/tests/creative-context-table.test.cjs
git commit -m "feat: add Creative Context Table contract"
```

---

### Task 2: Influence Diet contract

**Files:**
- Create: `src/full-measure/src/generation/influence-diet.cjs`
- Create: `src/full-measure/tests/influence-diet.test.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`

**Interfaces:**
- Consumes: `assertCreativeContextTable(table)` from Task 1.
- Produces:
  - `INFLUENCE_DIET_SCHEMA = "haunted-toaster/influence-diet/v1"`
  - `buildInfluenceDiet({ table, consumedProviderIds, influenceOnlyProviderIds }) -> frozen diet`
  - `assertInfluenceDiet(diet, table) -> frozen diet`
- Diet fields:
  - `ate`: available provider IDs actually consumed as creative material or ancestry.
  - `ignored`: available optional provider IDs not consumed and not influence-only.
  - `influenceOnly`: available provider IDs used only as search/coverage pressure.
  - `boundaries`: all available `source-truth` and `constraint` providers; callers cannot suppress them.
  - `dietHash`: canonical hash over the four categories plus `tableHash`.

- [ ] **Step 1: Write RED diet tests**

Create tests that prove:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const generation = require("../src/generation/index.cjs");

function table() {
  return generation.buildCreativeContextTable({
    entries: [
      {
        providerId: "source/song",
        policyVersion: "song-source-v1",
        evidenceRef: "sha256:" + "1".repeat(64),
        authorityClass: "source-truth",
        ancestryClass: "none",
        allowedDecisions: ["family-composition"],
        required: true,
        availability: "available",
        payload: { analysisHash: "a".repeat(64) },
      },
      {
        providerId: "source/image-native-color",
        policyVersion: "native-color-v1",
        evidenceRef: "sha256:" + "2".repeat(64),
        authorityClass: "creative-material",
        ancestryClass: "none",
        allowedDecisions: ["native-color"],
        required: false,
        availability: "available",
        payload: { profileSha256: "b".repeat(64) },
      },
      {
        providerId: "memory/receipt-v1",
        policyVersion: "toaster-memory-influence-v1",
        evidenceRef: "sha256:" + "3".repeat(64),
        authorityClass: "influence-only",
        ancestryClass: "none",
        allowedDecisions: ["coverage", "palette"],
        required: false,
        availability: "available",
        payload: { target: "paletteLogic:duotone" },
      },
    ],
  });
}

test("diet separates eaten, ignored, influence-only, and boundary evidence", () => {
  const diet = generation.buildInfluenceDiet({
    table: table(),
    consumedProviderIds: ["source/image-native-color"],
    influenceOnlyProviderIds: ["memory/receipt-v1"],
  });
  assert.deepEqual(diet.ate, ["source/image-native-color"]);
  assert.deepEqual(diet.influenceOnly, ["memory/receipt-v1"]);
  assert.deepEqual(diet.boundaries, ["source/song"]);
  assert.deepEqual(diet.ignored, []);
});

test("an available optional provider can be ignored without disappearing", () => {
  const diet = generation.buildInfluenceDiet({ table: table() });
  assert.deepEqual(diet.boundaries, ["source/song"]);
  assert.deepEqual(diet.ignored, ["memory/receipt-v1", "source/image-native-color"]);
});

test("influence-only evidence cannot be eaten or treated as ancestry", () => {
  assert.throws(
    () => generation.buildInfluenceDiet({
      table: table(),
      consumedProviderIds: ["memory/receipt-v1"],
    }),
    /influence-only provider memory\/receipt-v1 cannot be eaten/i,
  );
});

test("diet cannot cite a provider absent from its table", () => {
  assert.throws(
    () => generation.buildInfluenceDiet({
      table: table(),
      influenceOnlyProviderIds: ["memory/missing"],
    }),
    /not present in Creative Context Table/i,
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
node --test src/full-measure/tests/influence-diet.test.cjs
```

Expected: FAIL because `buildInfluenceDiet` is undefined.

- [ ] **Step 3: Implement deterministic diet construction**

Create `src/full-measure/src/generation/influence-diet.cjs` so that:

```js
const { deepFreeze, hashCanonical } = require("./canonical.cjs");
const { assertCreativeContextTable } = require("./creative-context-table.cjs");

const INFLUENCE_DIET_SCHEMA = "haunted-toaster/influence-diet/v1";

function sortedUnique(value) {
  return [...new Set((value || []).map(String))].sort();
}

function buildInfluenceDiet({ table, consumedProviderIds = [], influenceOnlyProviderIds = [] } = {}) {
  const context = assertCreativeContextTable(table);
  const available = context.entries.filter((entry) => entry.availability === "available");
  const byId = new Map(available.map((entry) => [entry.providerId, entry]));
  const ate = sortedUnique(consumedProviderIds);
  const influenceOnly = sortedUnique(influenceOnlyProviderIds);

  for (const providerId of [...ate, ...influenceOnly]) {
    if (!byId.has(providerId)) {
      throw new TypeError(`Creative context provider ${providerId} is not present in Creative Context Table.`);
    }
  }
  for (const providerId of ate) {
    const entry = byId.get(providerId);
    if (entry.authorityClass === "influence-only") {
      throw new TypeError(`Influence-only provider ${providerId} cannot be eaten.`);
    }
  }
  for (const providerId of influenceOnly) {
    const entry = byId.get(providerId);
    if (entry.authorityClass !== "influence-only") {
      throw new TypeError(`Provider ${providerId} is not influence-only.`);
    }
  }
  const overlap = ate.filter((providerId) => influenceOnly.includes(providerId));
  if (overlap.length) throw new TypeError(`Provider ${overlap[0]} cannot occupy two Influence Diet categories.`);

  const boundaries = available
    .filter((entry) => ["source-truth", "constraint"].includes(entry.authorityClass))
    .map((entry) => entry.providerId)
    .sort();
  const optional = available
    .filter((entry) => !boundaries.includes(entry.providerId))
    .map((entry) => entry.providerId);
  const used = new Set([...ate, ...influenceOnly]);
  const ignored = optional.filter((providerId) => !used.has(providerId)).sort();
  const core = {
    schema: INFLUENCE_DIET_SCHEMA,
    tableHash: context.tableHash,
    ate,
    ignored,
    influenceOnly,
    boundaries,
  };
  return deepFreeze({
    ...core,
    dietHash: hashCanonical(core, "HauntedToaster-InfluenceDiet-v1"),
  });
}

function assertInfluenceDiet(diet, table) {
  if (!diet || diet.schema !== INFLUENCE_DIET_SCHEMA) {
    throw new TypeError(`Expected ${INFLUENCE_DIET_SCHEMA}.`);
  }
  const rebuilt = buildInfluenceDiet({
    table,
    consumedProviderIds: diet.ate,
    influenceOnlyProviderIds: diet.influenceOnly,
  });
  if (rebuilt.dietHash !== diet.dietHash) throw new TypeError("Influence Diet hash mismatch.");
  return rebuilt;
}

module.exports = { INFLUENCE_DIET_SCHEMA, assertInfluenceDiet, buildInfluenceDiet };
```

Export it from `generation/index.cjs`.

- [ ] **Step 4: Run Task 1 + Task 2 tests**

```bash
node --test src/full-measure/tests/creative-context-table.test.cjs \
            src/full-measure/tests/influence-diet.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/full-measure/src/generation/influence-diet.cjs \
        src/full-measure/src/generation/index.cjs \
        src/full-measure/tests/influence-diet.test.cjs
git commit -m "feat: add per-candidate Influence Diet evidence"
```

---

### Task 3: Session provider adapters

**Files:**
- Create: `src/full-measure/src/creative-context-providers.cjs`
- Create: `src/full-measure/tests/creative-context-providers.test.cjs`

**Interfaces:**
- Consumes:
  - normalized generation analysis already produced by `candidate-session.cjs`;
  - response witness when present on the selected beta ancestor;
  - garment constraints;
  - optional Native Color profile;
  - optional receipt-memory `influencePlan` from the PR #166 memory seam.
- Produces:
  - `buildCandidateCreativeContext({ analysis, responseWitness, constraints, nativeChromaticProfile, memoryInfluence }) -> CreativeContextTable`
- Provider IDs are stable and exact:
  - `source/song`
  - `constraint/garment`
  - `source/image-native-color`
  - `memory/receipt-v1`

- [ ] **Step 1: Write RED provider-adapter tests**

Create a focused test with a small valid analysis/constraint fixture already used by candidate-family tests. The assertions must prove:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildCandidateCreativeContext } = require("../src/creative-context-providers.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const analysis = readJson("fixtures/analysis/sectional.v1.json");
const constraints = readJson("constraints/porchlight.v3.json");

test("candidate context contains required song and garment boundaries", () => {
  const table = buildCandidateCreativeContext({ analysis, constraints });
  const ids = table.entries.map((entry) => entry.providerId);
  assert.ok(ids.includes("source/song"));
  assert.ok(ids.includes("constraint/garment"));
  assert.equal(table.entries.find((entry) => entry.providerId === "source/song").required, true);
  assert.equal(table.entries.find((entry) => entry.providerId === "constraint/garment").authorityClass, "constraint");
});

test("Native Color and receipt memory appear only when truthfully available", () => {
  const table = buildCandidateCreativeContext({
    analysis,
    constraints,
    nativeChromaticProfile: {
      schema: "haunted-toaster/native-chromatic-profile/v1",
      profileSha256: "a".repeat(64),
      dominant: [12, 34, 56],
    },
    memoryInfluence: {
      policy: "toaster-memory-influence-v1",
      target: "paletteLogic:duotone",
      reason: "positive-verdict-pressure",
    },
  });
  const image = table.entries.find((entry) => entry.providerId === "source/image-native-color");
  const memory = table.entries.find((entry) => entry.providerId === "memory/receipt-v1");
  assert.equal(image.authorityClass, "creative-material");
  assert.equal(memory.authorityClass, "influence-only");
  assert.deepEqual(memory.payload.target, "paletteLogic:duotone");
});

test("same normalized evidence produces the same table identity", () => {
  const first = buildCandidateCreativeContext({ analysis, constraints });
  const second = buildCandidateCreativeContext({ analysis: structuredClone(analysis), constraints: structuredClone(constraints) });
  assert.equal(first.tableHash, second.tableHash);
});
```

Use the constraint version present on the selected beta ancestor. PR #166 currently uses v3 constraints; if #147 moves the active profile, update only the fixture filename to match the active registry and record that exact change in the implementation PR.

- [ ] **Step 2: Run provider test and verify RED**

```bash
node --test src/full-measure/tests/creative-context-providers.test.cjs
```

Expected: FAIL because the adapter module does not exist.

- [ ] **Step 3: Implement provider normalization**

Create `src/full-measure/src/creative-context-providers.cjs` using generation's canonical hash helpers and Task 1's table builder. The important implementation shape is:

```js
const {
  buildCreativeContextTable,
  hashCanonical,
} = require("./generation/index.cjs");

function ref(domain, value) {
  return `sha256:${hashCanonical(value, domain)}`;
}

function buildCandidateCreativeContext({
  analysis,
  responseWitness = null,
  constraints,
  nativeChromaticProfile = null,
  memoryInfluence = null,
} = {}) {
  if (!analysis) throw new TypeError("Creative context requires normalized song analysis.");
  if (!constraints?.id) throw new TypeError("Creative context requires admitted garment constraints.");

  const entries = [
    {
      providerId: "source/song",
      policyVersion: "song-source-v1",
      evidenceRef: ref("HauntedToaster-CreativeContext-Song-v1", { analysis, responseWitness }),
      authorityClass: "source-truth",
      ancestryClass: "none",
      allowedDecisions: ["family-composition", "temporal-response"],
      required: true,
      availability: "available",
      payload: {
        analysisHash: hashCanonical(analysis, "HauntedToaster-CreativeContext-Analysis-v1"),
        responseWitnessHash: responseWitness
          ? hashCanonical(responseWitness, "HauntedToaster-CreativeContext-ResponseWitness-v1")
          : null,
      },
    },
    {
      providerId: "constraint/garment",
      policyVersion: String(constraints.schema || constraints.version || constraints.id),
      evidenceRef: ref("HauntedToaster-CreativeContext-Constraints-v1", constraints),
      authorityClass: "constraint",
      ancestryClass: "none",
      allowedDecisions: ["all-creative-axes"],
      required: true,
      availability: "available",
      payload: { constraintPackId: constraints.id },
    },
  ];

  if (nativeChromaticProfile) {
    entries.push({
      providerId: "source/image-native-color",
      policyVersion: String(nativeChromaticProfile.schema || "native-color-profile-v1"),
      evidenceRef: `sha256:${String(nativeChromaticProfile.profileSha256)}`,
      authorityClass: "creative-material",
      ancestryClass: "none",
      allowedDecisions: ["native-color"],
      required: false,
      availability: "available",
      payload: structuredClone(nativeChromaticProfile),
    });
  }

  if (memoryInfluence) {
    entries.push({
      providerId: "memory/receipt-v1",
      policyVersion: String(memoryInfluence.policy || "toaster-memory-influence-v1"),
      evidenceRef: ref("HauntedToaster-CreativeContext-MemoryInfluence-v1", memoryInfluence),
      authorityClass: "influence-only",
      ancestryClass: "none",
      allowedDecisions: ["coverage", "topology", "motion", "palette", "material", "camera"],
      required: false,
      availability: "available",
      payload: structuredClone(memoryInfluence),
    });
  }

  return buildCreativeContextTable({ entries });
}

module.exports = { buildCandidateCreativeContext };
```

Do not create synthetic unavailable image or memory entries just to fill the Table. Absence is lawful and simpler for v1; Task 1 retains explicit `unavailable` support for future provider diagnostics.

- [ ] **Step 4: Run provider + contract tests**

```bash
node --test src/full-measure/tests/creative-context-table.test.cjs \
            src/full-measure/tests/influence-diet.test.cjs \
            src/full-measure/tests/creative-context-providers.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/full-measure/src/creative-context-providers.cjs \
        src/full-measure/tests/creative-context-providers.test.cjs
git commit -m "feat: adapt beta evidence into creative context"
```

---

### Task 4: Table-aware candidate-family evidence and memory migration

**Execution gate:** Start this task only on the selected beta ancestor that contains the accepted #155 renderer-trust line, the #147 candidate-ecology implementation, and the receipt-memory generation seam currently represented by PR #166. If those lines have been reorganized, re-read the actual files before editing; do not port historical branches wholesale.

**Files:**
- Modify: `src/full-measure/src/generation/candidate-family.cjs` or the #147 successor that owns family assembly.
- Modify: `src/full-measure/src/generation/native-color-generation.cjs`.
- Modify: existing candidate-family tests on that ancestor.

**Interfaces:**
- Consumes: `creativeContextTable` created by Task 3.
- Produces on the candidate-family envelope:
  - `creativeContextTableHash`
  - `creativeContextTable` as normalized derivation evidence for exact replay; this is family/provenance state, not score/timeline semantics.
  - per candidate: `influenceDiet`
  - family-level `influenceDietHashes`
- Compatibility input: keep current direct `nativeChromaticProfile` / `memoryInfluence` arguments accepted for legacy tests/callers during this slice, but the ordinary beta session path must use the Table. Do not silently combine contradictory direct and Table values.

- [ ] **Step 1: Add RED family tests for differing diets and replay**

Extend the active candidate-family integration test with a helper that builds a Table containing source, constraints, image profile, and one memory influence. Assert:

```js
const context = generation.buildCreativeContextTable({
  entries: [
    /* required source/song and constraint/garment entries */
    {
      providerId: "source/image-native-color",
      policyVersion: "native-color-v1",
      evidenceRef: "sha256:" + nativeProfile.profileSha256,
      authorityClass: "creative-material",
      ancestryClass: "none",
      allowedDecisions: ["native-color"],
      required: false,
      availability: "available",
      payload: nativeProfile,
    },
    {
      providerId: "memory/receipt-v1",
      policyVersion: "toaster-memory-influence-v1",
      evidenceRef: "sha256:" + "3".repeat(64),
      authorityClass: "influence-only",
      ancestryClass: "none",
      allowedDecisions: ["coverage", "palette"],
      required: false,
      availability: "available",
      payload: {
        policy: "toaster-memory-influence-v1",
        target: "paletteLogic:duotone",
        reason: "test-memory-pressure",
      },
    },
  ],
});

const result = generation.generateCandidateSet({
  analysis: sectional,
  garmentConstraints: constraints,
  rendererProfile: profile,
  rootSeed: "creative-context-family",
  count: 6,
  creativeContextTable: context,
  /* #147-required family inputs */
});

assert.equal(result.creativeContextTableHash, context.tableHash);
assert.equal(result.influenceDietHashes.length, result.producedCount);
assert.equal(new Set(result.influenceDietHashes).size >= 2, true);

const memoryUsers = result.candidates.filter((candidate) =>
  candidate.influenceDiet.influenceOnly.includes("memory/receipt-v1"),
);
const memoryIgnorers = result.candidates.filter((candidate) =>
  candidate.influenceDiet.ignored.includes("memory/receipt-v1"),
);
assert.equal(memoryUsers.length, 1);
assert.equal(memoryIgnorers.length >= 1, true);

const replay = generation.replayCandidateFamily(result, {
  analysis: sectional,
  garmentConstraints: constraints,
  rendererProfile: profile,
  /* #147-required replay inputs */
});
assert.equal(replay.ok, true);
assert.deepEqual(replay.replayed.influenceDietHashes, result.influenceDietHashes);
assert.equal(replay.replayed.creativeContextTableHash, result.creativeContextTableHash);
```

Also add a test proving a locked memory target yields a diet that records the memory provider as `influenceOnly` only when the family policy actually consulted it; the existing memory-application evidence must still record `applied: false, reason: "axis-locked"` and locks must remain exact.

- [ ] **Step 2: Run focused candidate tests and verify RED**

Run the exact active family test file directly, for example:

```bash
node --test src/full-measure/tests/candidate-family.test.cjs
```

Expected: FAIL because `creativeContextTable` and `influenceDiet` are not yet recognized.

- [ ] **Step 3: Add a deterministic context-use policy inside family assembly**

Do not create a second random chooser. The founding policy is deliberately simple:

1. required `source-truth` and `constraint` entries are always diet boundaries;
2. `source/image-native-color` is considered consumed by candidates whose timeline is decorated from its profile;
3. `memory/receipt-v1` remains bounded to at most one ordinary six-up seat, preserving PR #166's current safety law;
4. all other available optional entries are automatically recorded as ignored by `buildInfluenceDiet()`;
5. no candidate may cite a provider absent from the Table.

Extract the memory payload using Task 1 rather than accepting it from ambient session state:

```js
const {
  assertCreativeContextTable,
  findCreativeContextEntry,
} = require("./creative-context-table.cjs");
const { buildInfluenceDiet } = require("./influence-diet.cjs");

function contextMemoryInfluence(table) {
  if (!table) return null;
  const entry = findCreativeContextEntry(table, "memory/receipt-v1");
  if (!entry || entry.availability !== "available") return null;
  if (entry.authorityClass !== "influence-only") {
    throw new TypeError("memory/receipt-v1 must remain influence-only.");
  }
  return entry.payload ? structuredClone(entry.payload) : null;
}
```

Migrate the current `count === 6 && slotIndex === 5 ? memoryInfluence : null` behavior so its source is `contextMemoryInfluence(creativeContextTable)` on the new path. Preserve the one-seat limit in this founding proof.

For each accepted candidate, build its diet after memory application evidence is known:

```js
const memoryConsulted = Boolean(slotMemoryInfluence);
const influenceDiet = creativeContextTable
  ? buildInfluenceDiet({
      table: creativeContextTable,
      consumedProviderIds: [],
      influenceOnlyProviderIds: memoryConsulted ? ["memory/receipt-v1"] : [],
    })
  : null;
```

Native Color consumption is added in the decorator in Step 4 because that is where image evidence is actually consumed. Do not claim the candidate ate image evidence before the Native Color decorator does so.

Include `creativeContextTableHash`, the normalized `creativeContextTable`, and `influenceDietHashes` in the family core so `familyHash` covers derivation context. Do not write any of these fields into `VisualScore` or `ResolvedTimeline`.

- [ ] **Step 4: Migrate Native Color consumption to the Table-aware path**

In `native-color-generation.cjs`, add a helper that prefers table evidence when a Table is supplied, and otherwise preserves the existing direct `nativeChromaticProfile` compatibility path:

```js
function nativeProfileFor(options = {}) {
  if (options.creativeContextTable) {
    const entry = findCreativeContextEntry(
      options.creativeContextTable,
      "source/image-native-color",
    );
    if (!entry || entry.availability !== "available") return null;
    if (entry.authorityClass !== "creative-material") {
      throw new TypeError("source/image-native-color must remain creative-material.");
    }
    if (options.nativeChromaticProfile &&
        canonicalStringify(options.nativeChromaticProfile) !== canonicalStringify(entry.payload)) {
      throw new TypeError("Native Color direct option contradicts Creative Context Table evidence.");
    }
    return structuredClone(entry.payload);
  }
  return options.nativeChromaticProfile || null;
}
```

After decorating a candidate timeline with Native Color, rebuild that candidate's diet with `source/image-native-color` added to `ate`, preserving any existing memory `influenceOnly` provider IDs:

```js
const influenceDiet = candidate.influenceDiet && options.creativeContextTable
  ? buildInfluenceDiet({
      table: options.creativeContextTable,
      consumedProviderIds: [
        ...candidate.influenceDiet.ate,
        "source/image-native-color",
      ],
      influenceOnlyProviderIds: candidate.influenceDiet.influenceOnly,
    })
  : candidate.influenceDiet;
```

Recompute family `influenceDietHashes` and `familyHash` in the same place Native Color already recomputes timeline hashes/family hash. This preserves one canonical family identity after all generation decorators.

- [ ] **Step 5: Make replay use recorded Table evidence, not ambient providers**

When `family.creativeContextTable` exists, `replayCandidateFamily()` must pass that recorded normalized table back to `generateCandidateSet()` / decorators. If a caller also supplies `creativeContextTable`, require the hash to match exactly. Refuse contradictory replay context rather than substituting it.

Compatibility behavior:

```text
historical family without creativeContextTable
    -> old replay path

new family with creativeContextTable
    -> recorded table is replay authority for derivation evidence

caller supplies mismatched table
    -> explicit refusal
```

- [ ] **Step 6: Run family + memory + Native Color tests**

Run the exact files present on the selected beta ancestor, including at minimum:

```bash
node --test src/full-measure/tests/creative-context-table.test.cjs \
            src/full-measure/tests/influence-diet.test.cjs \
            src/full-measure/tests/creative-context-providers.test.cjs \
            src/full-measure/tests/candidate-family.test.cjs
```

Also run the existing memory-influence and Native Color tests from the selected ancestor. Expected: PASS, with the current one-memory-seat law preserved.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/full-measure/src/generation/candidate-family.cjs \
        src/full-measure/src/generation/native-color-generation.cjs \
        src/full-measure/tests
git commit -m "feat: route candidate evidence through Creative Context Table"
```

---

### Task 5: Build the Table in candidate-session and prove renderer separation

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Modify: the active candidate-session test file on the selected beta ancestor.

**Interfaces:**
- Consumes: `buildCandidateCreativeContext()` from Task 3; existing `memoryProvider.contextForGeneration()` from the receipt-memory line; existing Native Color analyzer.
- Produces:
  - ordinary `generate()` passes `creativeContextTable` to generation;
  - preview/materialization may expose only `creativeContextTableHash` and per-candidate `influenceDiet` evidence;
  - `executionForRender()` contains no `creativeContextTable`, no `influenceDiet`, and no provider payloads.

- [ ] **Step 1: Write RED candidate-session boundary tests**

Use the active session test harness and inject a fake Native Color analyzer plus a fake memory provider. Assert the generation call receives one Table and the renderer execution does not:

```js
let generatedOptions = null;
const session = createCandidateSession({
  analyzeNativeChromaticProfile: async () => nativeProfile,
  memoryProvider: {
    contextForGeneration: async () => ({
      influencePlan: {
        policy: "toaster-memory-influence-v1",
        target: "paletteLogic:duotone",
        reason: "test-memory-pressure",
      },
    }),
  },
  generateCandidateSet: (options) => {
    generatedOptions = options;
    return fakeFamilyUsing(options.creativeContextTable);
  },
  renderCandidateFamilyPreviews: async (_source, family) => ({ familyHash: family.familyHash }),
});

/* note song + image, call generate through the existing harness */

assert.equal(generatedOptions.creativeContextTable.schema, "haunted-toaster/creative-context-table/v1");
assert.ok(generatedOptions.creativeContextTable.entries.some((entry) => entry.providerId === "source/song"));
assert.ok(generatedOptions.creativeContextTable.entries.some((entry) => entry.providerId === "source/image-native-color"));
assert.ok(generatedOptions.creativeContextTable.entries.some((entry) => entry.providerId === "memory/receipt-v1"));

/* select current candidate then ask session for render execution */
const execution = session.executionForRender(currentConfig);
assert.equal(Object.hasOwn(execution, "creativeContextTable"), false);
assert.equal(Object.hasOwn(execution, "influenceDiet"), false);
assert.equal(JSON.stringify(execution).includes("memory/receipt-v1"), false);
```

If `createCandidateSession()` on the selected ancestor does not currently support injecting `generateCandidateSet`, add exactly one dependency-injection parameter for tests rather than monkey-patching the module:

```js
createCandidateSession({
  generateCandidateSet: generateCandidates = generation.generateCandidateSet,
  ...existingDependencies
})
```

Use `generateCandidates(...)` in `generate()` / mutate paths where the current implementation calls `generation.generateCandidateSet(...)`. Do not use this refactor to redesign all generation dependencies.

- [ ] **Step 2: Run the session test and verify RED**

```bash
node --test src/full-measure/tests/<active-candidate-session-test>.test.cjs
```

Expected: FAIL because the session does not yet build/pass the Table.

- [ ] **Step 3: Construct one Table immediately before family generation**

In `generate()` after analysis, response witness, constraints, Native Color profile, and memory context are known:

```js
const creativeContextTable = buildCandidateCreativeContext({
  analysis,
  responseWitness,
  constraints,
  nativeChromaticProfile: profile,
  memoryInfluence: memoryContext?.influencePlan || null,
});

const nextFamily = generateCandidates({
  analysis,
  responseWitness,
  garmentConstraints: constraints,
  rendererProfile,
  parentScore: ancestor?.score || admitted?.scoreArtifact.score || null,
  rootSeed: config.rootSeed,
  count: 6,
  phase: "initial",
  lyricTrack,
  /* #147 family-pressure inputs */
  creativeContextTable,
});
```

Remove the ordinary beta path's direct `memoryInfluence:` and `nativeChromaticProfile:` generation arguments once the Table-aware path is proven. Keep direct-option compatibility inside generation modules only for historical tests/callers.

For mutation/CROSS branches, build a fresh Table from the same currently admitted source evidence and explicit ancestry state; do not reuse stale ambient Table objects after source/image/memory state changes. Exact branch-specific parentage rules from #147 remain authoritative.

- [ ] **Step 4: Expose proof summary without widening render execution**

`materialize()` may return:

```js
{
  ...previewView,
  creativeContextTableHash: nextFamily.creativeContextTableHash || null,
  influenceDiets: nextFamily.candidates.map((candidate) => candidate.influenceDiet || null),
  ...existingEvidence
}
```

`familyBinding` may retain only what the session needs for candidate proof/selection. `executionForRender()` must deliberately omit the Table and diets:

```js
return {
  visualScore: selection.scoreArtifact.score,
  resolvedTimeline: selection.timeline,
  analysis: mediaAnalysis,
  /* existing admitted execution evidence only */
};
```

Do not add a renderer-side lookup by `tableHash`.

- [ ] **Step 5: Run session + family tests**

Run the active session test plus all Task 1–4 focused tests. Expected: PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/full-measure/src/candidate-session.cjs \
        src/full-measure/tests
git commit -m "feat: build candidate context at the session boundary"
```

---

### Task 6: Founding proof, compatibility audit, and full verification

**Files:**
- Modify only if needed for assertions: `src/full-measure/scripts/smoke-candidates.cjs`
- No UI files.
- No canonical score/timeline schema files unless a failing test reveals an accidental dependency; if that happens, stop because the design boundary has been crossed.

**Interfaces:**
- Consumes all Tasks 1–5.
- Produces one proof that:
  - same inputs reproduce same Table/family/diets;
  - at least two candidates have different diets;
  - at most one ordinary candidate uses receipt-memory influence;
  - at least one candidate truthfully ignores available receipt-memory evidence;
  - Native Color evidence is recorded as consumed only when actually applied;
  - locks remain exact;
  - render execution contains no Table/provider payloads;
  - historical no-Table families still replay using the old path.

- [ ] **Step 1: Add one smoke assertion for the founding proof**

If `smoke-candidates.cjs` already builds a six-up with deterministic fixtures, extend it rather than adding a second smoke runner. Build a Table through `buildCandidateCreativeContext()` and assert:

```js
assert.equal(first.creativeContextTableHash, second.creativeContextTableHash);
assert.equal(first.familyHash, second.familyHash);
assert.deepEqual(first.influenceDietHashes, second.influenceDietHashes);
assert.ok(new Set(first.influenceDietHashes).size >= 2);
assert.ok(first.candidates.some((candidate) =>
  candidate.influenceDiet?.ignored?.includes("memory/receipt-v1")
));
assert.ok(first.candidates.filter((candidate) =>
  candidate.influenceDiet?.influenceOnly?.includes("memory/receipt-v1")
).length <= 1);
```

The smoke must not assert a particular candidate wins or that a named mood always occupies a fixed slot; #147 coverage policy owns family composition.

- [ ] **Step 2: Run focused RED/GREEN proof set**

```bash
node --test src/full-measure/tests/creative-context-table.test.cjs \
            src/full-measure/tests/influence-diet.test.cjs \
            src/full-measure/tests/creative-context-providers.test.cjs \
            src/full-measure/tests/candidate-family.test.cjs
```

Then run the active candidate-session, Native Color, receipt-memory, lock, and replay test files on the selected ancestor.

Expected: PASS.

- [ ] **Step 3: Run repository verification**

```bash
npm --prefix src/full-measure ci
npm run verify
```

Expected: `check`, all deterministic tests, render smoke, and candidate smoke PASS.

- [ ] **Step 4: Run compatibility-specific assertions**

Run or add tests proving:

```text
old candidate family without creativeContextTable -> replay behavior unchanged
new family with recorded table -> exact replay succeeds
new family + caller-supplied mismatched table -> explicit refusal
memory provider present + locked target -> lock stays exact, no silent override
no image provider -> Native Color decorator does not invent image evidence
no memory provider -> no candidate claims memory in its diet
```

Expected: PASS.

- [ ] **Step 5: Verify canonical/renderer boundary by code search**

Run:

```bash
git grep -n "creativeContextTable\|influenceDiet" -- src/full-measure/src
```

Expected allowed locations:

```text
generation/creative-context-table.cjs
generation/influence-diet.cjs
generation/candidate-family.cjs or #147 successor
generation/native-color-generation.cjs
creative-context-providers.cjs
candidate-session.cjs
```

No matches may appear inside production renderer compilation modules under `src/full-measure/src/render/` except candidate-preview/proof presentation code that merely serializes already-generated candidate evidence. No match may be used to make a new semantic render decision after `ResolvedTimeline` admission.

- [ ] **Step 6: Record artifact/UI disposition in the implementation PR**

Use exactly:

```text
UI impact: none
browser witness: not-required
visual delta: none
packaged witness required: no
packaged witness: not-required
GitBook ontology changed: no
```

Also record:

```text
Canonical artifact impact:
- VisualScore schema: unchanged
- ResolvedTimeline schema/authority: unchanged
- candidate-family derivation envelope: extended for Table + Influence Diet evidence
- renderer profile: unchanged
- receipt production authority: unchanged
```

- [ ] **Step 7: Commit Task 6**

```bash
git add src/full-measure/scripts/smoke-candidates.cjs src/full-measure/tests
git commit -m "test: prove Creative Context Table founding family"
```

- [ ] **Step 8: Final verification before completion claim**

Run again from the repository root:

```bash
npm run verify
```

Do not claim completion from inspection alone. Report the exact test count/output, every environmental limitation, and whether any generated artifact changed.

---

## Self-Review

### Spec coverage

- Versioned typed Table: Task 1.
- Explicit provider authority/ancestry/availability contracts: Tasks 1 and 3.
- Deterministic Table identity/replay: Tasks 1, 4, and 6.
- Missing optional evidence is not fabricated: Tasks 1 and 3.
- Required source truth / constraints cannot be ignored: Tasks 1 and 2.
- ATE / IGNORED / INFLUENCE ONLY / BOUNDARIES evidence: Task 2.
- Materially distinct candidates may carry different diets: Tasks 4 and 6.
- Availability does not imply consumption: Tasks 2, 4, and 6.
- Influence-only evidence cannot become parentage/timing/render authority: Tasks 1, 2, 4, and 5.
- Locks remain absolute: Tasks 4 and 6.
- Full Table does not cross `executionForRender()`: Task 5.
- Historical artifact compatibility: Tasks 4 and 6.
- Future provider extensibility without UI redesign: Tasks 1 and 3.
- Fake diversity is not credited from diets alone: Task 4 preserves #147's material family-coverage policy; Task 6 does not use diet count as the candidate diversity criterion.

### Placeholder scan

No `TBD`, `TODO`, generic “add error handling,” or unspecified “write tests” steps remain. The only branch-dependent path is the active candidate-session integration test file because #147/#166 may legally reorganize it before the execution gate opens; the plan requires the implementer to select the file that directly exercises `createCandidateSession()` and record the exact path before editing rather than guessing a stale filename.

### Type/name consistency

The plan uses these names consistently throughout:

```text
CREATIVE_CONTEXT_TABLE_SCHEMA
CREATIVE_CONTEXT_PROVIDER_POLICY
CREATIVE_CONTEXT_AUTHORITY_CLASSES
buildCreativeContextTable
assertCreativeContextTable
findCreativeContextEntry
INFLUENCE_DIET_SCHEMA
buildInfluenceDiet
assertInfluenceDiet
buildCandidateCreativeContext
creativeContextTable
creativeContextTableHash
influenceDiet
influenceDietHashes
```

## Execution Handoff

This plan is intentionally split by the existing beta safety gate: Tasks 1–3 are pure contract/provider work; Tasks 4–6 change ordinary family derivation and must wait for the trusted #155 + #147 beta ancestor.

Recommended execution mode after the gate is satisfied: **Subagent-Driven Development**, one fresh worker per task with review between tasks. Inline execution is also valid using `superpowers:executing-plans` if subagent capacity is unavailable.