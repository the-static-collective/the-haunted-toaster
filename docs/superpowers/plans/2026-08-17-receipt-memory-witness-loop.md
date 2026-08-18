# Receipt Memory + Witness Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give The Haunted Toaster a local, receipt-backed developmental memory with Past Toasts, append-only human verdicts, deterministic MemoryCapsules, explicit Re-toast ancestry, a bounded memory-influenced six-up lane, witness disposition evidence, and an inspectable Thoughtline graph.

**Architecture:** Persistent history lives in Electron main under the app-owned local data root. Successful render receipts and small execution sidecars are archived without mutating the canonical output receipt; human verdicts and witness encounter records are separate append-only receipts. A pure deterministic projection derives memory state, a bounded MemoryCapsule and one explicit generation pressure lane. Candidate generation remains authoritative only through its accepted VisualScore/ResolvedTimeline path, while Influence Trace/Thoughtline records why memory pressure was present.

**Tech Stack:** Node.js >=22, Electron 43, CommonJS, existing deterministic generation helpers, Node test runner, JSDOM where needed, Playwright UI witness, local filesystem only.

**Spec:** `docs/superpowers/specs/2026-08-17-receipt-memory-witness-loop-design.md`

## Global Constraints

- Existing `full-measure.video-receipt.v1` bytes must never be edited after render.
- Existing `VisualScore → ResolvedTimeline → renderer` authority remains unchanged.
- `witness-window-v1` remains the immutable output-boundary witness; Slice B adds separate witness disposition/encounter evidence.
- Memory is local-first, rebuildable, versioned, inspectable, and non-ML for BETA.
- No embeddings, vector database, opaque learned preference model, cloud sync, or social ratings.
- Re-toast is ancestry, not exact replay.
- Exact Replay remains deferred unless every required dependency can be honestly resolved.
- Ordinary memory pressure may steer at most one candidate lane in a six-up; memory must not capture the full family.
- Explicit Re-toast may make the generated family descendants of the selected historical score because the human explicitly requested ancestry.
- Hiding or failing Thoughtline must never change candidate data or block rendering.
- Persistent filesystem access remains in Electron main/dedicated main-process modules; sandboxed renderer receives only narrow IPC methods.
- Unknown/corrupt archive entries are reported and excluded from projection rather than silently repaired into invented history.

---

## File Structure

Create focused modules instead of expanding `main.cjs` or `app.js` into memory monoliths:

- `src/full-measure/src/memory/receipt-archive.cjs` — immutable render-bundle archival, indexing, listing, artifact resolution.
- `src/full-measure/src/memory/human-verdict.cjs` — append-only rating/disposition receipts.
- `src/full-measure/src/memory/witness-encounter.cjs` — append-only witness-disposition records after successful renders.
- `src/full-measure/src/memory/memory-projection.cjs` — pure deterministic rebuildable projection over valid archive records.
- `src/full-measure/src/memory/memory-capsule.cjs` — bounded current-session projection and explicit pressure selection.
- `src/full-measure/src/memory/influence-trace.cjs` — deterministic evidence-backed graph data.
- `src/full-measure/src/memory/witness-disposition.cjs` — non-sovereign witness-attention projection.
- `src/full-measure/src/memory/memory-service.cjs` — local-root orchestration and narrow main-process API.
- `src/full-measure/src/generation/memory-influence.cjs` — legal mapping from one MemoryCapsule pressure to one candidate mutation lane.
- `src/full-measure/src/renderer/past-toasts-ui.js` — Past Toasts drawer, verdicts, Re-toast action.
- `src/full-measure/src/renderer/thoughtline-ui.js` — bounded SVG Influence Trace visualization.
- `src/full-measure/src/renderer/memory-ui.css` — Past Toasts + Thoughtline visual rules.

Existing integration seams:

- `src/full-measure/src/candidate-session.cjs`
- `src/full-measure/src/generation/candidate-family.cjs`
- `src/full-measure/src/main.cjs`
- `src/full-measure/src/preload.cjs`
- `src/full-measure/src/renderer/candidate-ui.js`
- `src/full-measure/src/renderer/index.html`
- `src/full-measure/scripts/build-ui-witness.cjs`
- `src/full-measure/witness/witness-bridge.js`
- `src/full-measure/witness/witness-controller.js`
- `src/full-measure/tests/ui-witness.spec.cjs`

---

### Task 1: Immutable Render Receipt Archive

**Files:**
- Create: `src/full-measure/src/memory/receipt-archive.cjs`
- Create: `src/full-measure/tests/receipt-archive.test.cjs`

**Interfaces:**
- Produces: `archiveSuccessfulRender({ rootDir, renderResult }) -> Promise<ArchiveEntry>`
- Produces: `listArchivedRenders({ rootDir }) -> Promise<ArchiveEntry[]>`
- Produces: `readArchivedRender({ rootDir, receiptSha256 }) -> Promise<ArchiveEntry>`
- Produces: `resolveArchivedArtifact({ rootDir, receiptSha256, kind }) -> Promise<{ path, exists }>`
- `ArchiveEntry.receiptSha256` is the stable render-history identity used by every later task.

- [ ] **Step 1: Write the failing archive contract**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { archiveSuccessfulRender, listArchivedRenders } = require("../src/memory/receipt-archive.cjs");

test("archives identical successful render receipt idempotently and preserves sidecars", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-memory-"));
  const outputDir = path.join(rootDir, "output");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "song.mp4");
  const receiptPath = path.join(outputDir, "song.video-receipt.json");
  const scorePath = path.join(outputDir, "song.score.json");
  const timelinePath = path.join(outputDir, "song.timeline.json");
  await fs.writeFile(outputPath, "video");
  await fs.writeFile(scorePath, JSON.stringify({ schema: "haunted-toaster/visual-score/v1", seed: "x" }));
  await fs.writeFile(timelinePath, JSON.stringify({ schema: "haunted-toaster/resolved-timeline/v1" }));
  const receipt = {
    schema: "full-measure.video-receipt.v1",
    createdAt: "2026-08-17T20:00:00.000Z",
    treatment: { title: "Song", artist: null, sections: [] },
    render: { witnessWindow: { policyVersion: "witness-window-v1" }, visualCompiler: {} },
    output: { filename: "song.mp4", sha256: "abc", sizeBytes: 5 },
    validation: { accepted: true },
  };
  await fs.writeFile(receiptPath, JSON.stringify(receipt));

  const renderResult = { outputPath, receiptPath, scorePath, timelinePath, srtPath: null, vttPath: null, receipt };
  const first = await archiveSuccessfulRender({ rootDir, renderResult });
  const second = await archiveSuccessfulRender({ rootDir, renderResult });
  assert.equal(first.receiptSha256, second.receiptSha256);
  assert.deepEqual(await listArchivedRenders({ rootDir }), [first]);
  assert.equal(await fs.readFile(first.artifacts.receipt.path, "utf8"), JSON.stringify(receipt));
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/receipt-archive.test.cjs`

Expected: FAIL because `../src/memory/receipt-archive.cjs` does not exist.

- [ ] **Step 3: Implement the archive module**

Use raw receipt bytes as the archive identity and copy only the small evidence bundle; do not copy the MP4.

```js
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const ARCHIVE_SCHEMA = "haunted-toaster/render-archive-entry/v1";
const ALLOWED_KINDS = Object.freeze(["receipt", "score", "timeline", "srt", "vtt", "video"]);

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function archiveDir(rootDir, receiptSha256) {
  return path.join(rootDir, "Receipts", "render", receiptSha256);
}

async function existing(filePath) {
  if (!filePath) return false;
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}
```

`archiveSuccessfulRender()` must:

1. read exact `receiptPath` bytes;
2. parse and require `schema === "full-measure.video-receipt.v1"` and `validation.accepted === true`;
3. derive `receiptSha256` from exact bytes;
4. write `receipt.json` once with `flag: "wx"`, accepting `EEXIST` only when existing bytes hash identically;
5. copy score/timeline/SRT/VTT when available into the same immutable archive directory;
6. write canonical `entry.json` containing display metadata, original observed video path, and archived artifact paths;
7. return the same semantic entry when called repeatedly.

`listArchivedRenders()` must sort by `createdAt`, then `receiptSha256`, never filesystem order.

- [ ] **Step 4: Add corruption and missing-video tests**

Add tests proving:

```js
await assert.rejects(
  archiveSuccessfulRender({ rootDir, renderResult: { ...renderResult, receipt: { ...receipt, validation: { accepted: false } } } }),
  /accepted successful render receipt/i,
);

await fs.unlink(outputPath);
const [entry] = await listArchivedRenders({ rootDir });
assert.equal(entry.availability.video, false);
assert.equal(entry.availability.receipt, true);
assert.equal(entry.availability.score, true);
```

- [ ] **Step 5: Run GREEN and commit**

Run: `node --test tests/receipt-archive.test.cjs`

Expected: PASS.

Commit:

```bash
git add src/full-measure/src/memory/receipt-archive.cjs src/full-measure/tests/receipt-archive.test.cjs
git commit -m "feat: add immutable toaster receipt archive"
```

---

### Task 2: Append-Only Human Verdict Receipts

**Files:**
- Create: `src/full-measure/src/memory/human-verdict.cjs`
- Create: `src/full-measure/tests/human-verdict.test.cjs`

**Interfaces:**
- Produces: `appendHumanVerdict({ rootDir, renderReceiptSha256, rating, disposition, wouldReToast, now, uuid })`
- Produces: `listHumanVerdicts({ rootDir, renderReceiptSha256? })`
- Consumes: valid `receiptSha256` from Task 1.

- [ ] **Step 1: Write RED tests for bounds and append-only behavior**

```js
test("changing a rating creates a second verdict and never edits render history", async () => {
  const first = await appendHumanVerdict({
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    rating: 5,
    disposition: "keep",
    wouldReToast: true,
    now: () => new Date("2026-08-17T20:10:00.000Z"),
    uuid: () => "verdict-1",
  });
  const second = await appendHumanVerdict({
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    rating: 3,
    disposition: "weird",
    wouldReToast: false,
    now: () => new Date("2026-08-17T20:11:00.000Z"),
    uuid: () => "verdict-2",
  });
  assert.notEqual(first.verdictId, second.verdictId);
  assert.equal((await listHumanVerdicts({ rootDir, renderReceiptSha256: archived.receiptSha256 })).length, 2);
});
```

Also assert ratings `0` and `6`, invalid dispositions, and unknown receipt identities refuse.

- [ ] **Step 2: Run RED**

Run: `node --test tests/human-verdict.test.cjs`

Expected: FAIL because module is absent.

- [ ] **Step 3: Implement schema and storage**

Use exactly:

```js
const VERDICT_SCHEMA = "haunted-toaster/human-verdict/v1";
const DISPOSITIONS = new Set(["keep", "weird", "compost"]);

function validateRating(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new TypeError("Human verdict rating must be an integer from 1 through 5.");
  }
  return rating;
}
```

Persist one file per event under `Receipts/verdict/`. Sort reads by `createdAt`, then `verdictId`. Never replace a prior event.

- [ ] **Step 4: Run GREEN and commit**

Run: `node --test tests/human-verdict.test.cjs`

Expected: PASS.

Commit:

```bash
git add src/full-measure/src/memory/human-verdict.cjs src/full-measure/tests/human-verdict.test.cjs
git commit -m "feat: add append-only toaster verdict receipts"
```

---

### Task 3: Deterministic Memory Projection v1

**Files:**
- Create: `src/full-measure/src/memory/memory-projection.cjs`
- Create: `src/full-measure/tests/memory-projection.test.cjs`

**Interfaces:**
- Produces: `extractReceiptFeatures(receipt) -> string[]`
- Produces: `buildMemoryProjection({ renders, verdicts, witnessEncounters? }) -> MemoryProjection`
- Produces: `rebuildMemoryProjection({ rootDir }) -> Promise<MemoryProjection>`

- [ ] **Step 1: Write RED deterministic rebuild tests**

Create two archive fixtures in opposite input orders and require identical projection hashes.

```js
const first = buildMemoryProjection({ renders: [renderA, renderB], verdicts: [verdictA] });
const second = buildMemoryProjection({ renders: [renderB, renderA], verdicts: [verdictA] });
assert.equal(first.projectionSha256, second.projectionSha256);
assert.deepEqual(first, second);
assert.equal(first.latestVerdicts[renderA.receiptSha256].rating, 5);
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/memory-projection.test.cjs`

Expected: FAIL because module is absent.

- [ ] **Step 3: Implement attributable feature extraction**

Use only evidence already present in receipts. Required feature token forms:

```text
songEnergy:quiet|mixed|dense
garment:<id>
toastFeel:<id>
nativeColor:<relationship>
topology:<stable-token>
operator:<stable-token>
witnessWindow:<policyVersion>
```

Mean section energy determines `songEnergy`:

```js
function songEnergyClass(sections = []) {
  const values = sections.map((section) => Number(section.energy)).filter(Number.isFinite);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.5;
  if (mean < 0.34) return "quiet";
  if (mean > 0.67) return "dense";
  return "mixed";
}
```

When topology/operator evidence is an object, use a short canonical hash token rather than inventing a human label.

- [ ] **Step 4: Implement relationship reinforcement and saturation**

For each render, pair `songEnergy:*` with visual tokens. The latest applicable verdict contributes:

```js
function verdictWeight(verdict) {
  if (!verdict) return 0;
  const ratingWeight = (verdict.rating - 3) / 2;
  const dispositionWeight = verdict.disposition === "keep"
    ? 0.5
    : verdict.disposition === "compost"
      ? -0.5
      : 0;
  const reToastWeight = verdict.wouldReToast ? 0.25 : 0;
  return ratingWeight + dispositionWeight + reToastWeight;
}
```

Keep `relationshipWeights` separate from `recentFeatureCounts`. High rating strengthens relationships; recent repetition independently raises saturation pressure even when highly rated.

Projection shape must contain:

```js
{
  schema: "haunted-toaster/memory-projection/v1",
  policy: "receipt-memory-projection-v1",
  archiveCut,
  renderCount,
  featureCounts,
  recentFeatureCounts,
  relationshipWeights,
  latestVerdicts,
  projectionSha256,
}
```

Use the existing generation canonical hash helper with a new domain string; do not add another JSON canonicalization implementation.

- [ ] **Step 5: Add anti-collapse proof**

Add a fixture with four highly-rated repeated topology tokens and prove both facts are true:

```js
assert.ok(projection.relationshipWeights["songEnergy:dense|topology:echo-tunnel"] > 0);
assert.equal(projection.recentFeatureCounts["topology:echo-tunnel"], 4);
```

This proves affection and saturation coexist instead of collapsing into a popularity score.

- [ ] **Step 6: Run GREEN and commit**

Run: `node --test tests/memory-projection.test.cjs`

Expected: PASS.

Commit:

```bash
git add src/full-measure/src/memory/memory-projection.cjs src/full-measure/tests/memory-projection.test.cjs
git commit -m "feat: derive deterministic toaster memory projection"
```

---

### Task 4: MemoryCapsule, Influence Trace, and Witness Disposition

**Files:**
- Create: `src/full-measure/src/memory/memory-capsule.cjs`
- Create: `src/full-measure/src/memory/influence-trace.cjs`
- Create: `src/full-measure/src/memory/witness-disposition.cjs`
- Create: `src/full-measure/tests/memory-capsule.test.cjs`
- Create: `src/full-measure/tests/influence-trace.test.cjs`

**Interfaces:**
- Produces: `summarizeCurrentSongEvidence(mediaAnalysis)`
- Produces: `allowedFeatureUniverse(constraints)`
- Produces: `deriveMemoryCapsule({ projection, currentSongEvidence, allowedFeatures, explicitAncestorReceiptSha256 })`
- Produces: `deriveGenerationPressure(capsule) -> MemoryInfluencePlan|null`
- Produces: `deriveWitnessDisposition(capsule)`
- Produces: `buildInfluenceTrace({ capsule, familyHash, candidates })`

- [ ] **Step 1: Write RED capsule determinism and bounds tests**

```js
const capsule = deriveMemoryCapsule({
  projection,
  currentSongEvidence: { energyClass: "dense", evidenceHash: "song-hash" },
  allowedFeatures: ["topology:echo-tunnel", "topology:split-horizon", "materialTexture:photocopy"],
  explicitAncestorReceiptSha256: null,
});
assert.equal(capsule.schema, "haunted-toaster/memory-capsule/v1");
assert.ok(capsule.pressures.length <= 12);
assert.match(capsule.capsuleSha256, /^[a-f0-9]{64}$/);
```

Build the same capsule from differently ordered projection maps and require the same hash.

- [ ] **Step 2: Run RED**

Run: `node --test tests/memory-capsule.test.cjs tests/influence-trace.test.cjs`

Expected: FAIL because modules are absent.

- [ ] **Step 3: Implement bounded pressure policy**

Required pressure kinds:

- `relationship-favor` — positive attributable relation for the current song class;
- `coverage-explore` — legal allowed feature with the lowest historical count;
- `saturation-avoid` — repeated recent feature; this pressure must resolve to an alternative legal target, not merely say “avoid”.

Each pressure contains `kind`, `target`, numeric `weight`, and explicit `evidenceRefs`. Sort by descending absolute weight, then target, and cap at 12.

`deriveGenerationPressure()` chooses one legal target in this order:

1. strongest `coverage-explore` target;
2. strongest positive `relationship-favor` target;
3. legal alternative generated by strongest `saturation-avoid` pressure.

Return:

```js
{
  policy: "toaster-memory-influence-v1",
  capsuleSha256,
  target: "topology:split-horizon",
  reason: "coverage-explore",
  evidenceRefs: ["render:<sha>", "verdict:<id>"],
}
```

- [ ] **Step 4: Implement witness disposition**

Map capsule pressures to at most three non-sovereign dispositions:

```js
{
  policy: "toaster-witness-disposition-v1",
  capsuleSha256,
  dispositions: [
    { kind: "attention", target: "topology:split-horizon", evidenceRefs: ["render:<sha>"] },
    { kind: "fatigue", target: "topology:echo-tunnel", evidenceRefs: ["render:<sha>"] },
  ],
}
```

No disposition may contain renderer commands or mutate `witness-window-v1` fields.

- [ ] **Step 5: Implement Influence Trace**

Use a maximum of 24 nodes and 36 edges. Every edge must include `evidenceRefs.length >= 1`.

Required trace shape:

```js
{
  schema: "haunted-toaster/influence-trace/v1",
  policy: "toaster-influence-trace-v1",
  capsuleSha256,
  nodes,
  edges,
  traceSha256,
}
```

Allowed relations are exactly `recalled`, `favored`, `inhibited`, `underexplored`, `saturated`, `inherited`, `counterexampled`, and `witnessed`.

- [ ] **Step 6: Add evidence-backed edge test**

```js
for (const edge of trace.edges) {
  assert.ok(edge.evidenceRefs.length > 0);
}
assert.ok(trace.nodes.length <= 24);
assert.ok(trace.edges.length <= 36);
```

- [ ] **Step 7: Run GREEN and commit**

Run: `node --test tests/memory-capsule.test.cjs tests/influence-trace.test.cjs`

Expected: PASS.

Commit:

```bash
git add src/full-measure/src/memory src/full-measure/tests/memory-capsule.test.cjs src/full-measure/tests/influence-trace.test.cjs
git commit -m "feat: derive bounded toaster memory capsules and traces"
```

---

### Task 5: One Bounded Memory Influence Lane + Explicit Re-toast Ancestry

**Files:**
- Create: `src/full-measure/src/generation/memory-influence.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Modify: `src/full-measure/src/generation/candidate-family.cjs`
- Modify: `src/full-measure/src/candidate-session.cjs`
- Create: `src/full-measure/tests/memory-influence.test.cjs`
- Create: `src/full-measure/tests/retoast-ancestry.test.cjs`

**Interfaces:**
- Produces: `applyMemoryInfluence(score, constraints, influencePlan) -> { score, applied }`
- `generateCandidateSet()` gains optional `memoryInfluence = null`.
- `createCandidateSession()` gains optional `memoryProvider` with `contextForGeneration()` and `resolveReToastAncestor()`.
- Candidate session gains `armReToast(receiptSha256)`, `clearReToast()`, `currentInfluenceTrace()`.

- [ ] **Step 1: Write RED candidate-memory contract**

Construct a constraints fixture where `split-horizon` is legal and generate the same family twice: once without memory, once with an influence target `topology:split-horizon`.

Require:

```js
assert.notEqual(withMemory.familyHash, withoutMemory.familyHash);
assert.equal(withMemory.candidates.length, withoutMemory.candidates.length);
assert.equal(withMemory.candidates.slice(0, 5).map((c) => c.scoreAddress).join("|"), withoutMemory.candidates.slice(0, 5).map((c) => c.scoreAddress).join("|"));
assert.equal(withMemory.candidates[5].memoryInfluence.applied, true);
assert.equal(withMemory.candidates[5].scoreArtifact.score.topology, "split-horizon");
```

This is the core BETA law: ordinary memory may steer one lane, not capture all six.

- [ ] **Step 2: Run RED**

Run: `node --test tests/memory-influence.test.cjs`

Expected: FAIL because memory generation support is absent.

- [ ] **Step 3: Implement legal target application**

`memory-influence.cjs` maps only these token prefixes:

```text
topology:<value>            -> score.topology
motionGrammar:<value>       -> score.motion.grammar
materialTexture:<value>     -> score.material.texture
cameraGrammar:<value>       -> score.camera.grammar
paletteLogic:<value>        -> score.palette.logic
```

Validate the target against the corresponding current constraint `allowed` list. Unknown/illegal targets return `{ applied: false, reason: "target-not-legal" }`; they do not throw away the whole family.

- [ ] **Step 4: Bind memory only to the final ordinary slot**

In `candidate-family.cjs`, apply `memoryInfluence` only while building the sixth slot (`slotIndex === 5`) and only when the affected axis is not locked. Include exact memory evidence in candidate derivation policy and family hash.

Do not change output when `memoryInfluence === null`.

- [ ] **Step 5: Add exact replay proof**

Extend `replayCandidateFamily()` to consume `family.memoryInfluence`. Prove a memory-shaped family replays byte-for-byte in addresses/timeline hashes/family hash.

- [ ] **Step 6: Write RED Re-toast ancestry test**

```js
const armed = await session.armReToast("receipt-sha");
assert.equal(armed.receiptSha256, "receipt-sha");
const familyView = await session.generate(config);
assert.equal(familyView.reToastAncestor.receiptSha256, "receipt-sha");
assert.ok(familyView.candidates.every((candidate) => candidate.parentScoreRef === archivedScoreAddress));
```

Also prove Lab Proposal + Re-toast cannot silently coexist; return a clear conflict error until one ancestry source is cleared.

- [ ] **Step 7: Implement Re-toast consumption**

`armReToast()` stores only the receipt identity. On `generate()`:

1. resolve archived score through `memoryProvider.resolveReToastAncestor(receiptSha256)`;
2. validate it under current constraints through existing score parsing/admission;
3. use it as `parentScore` for the fresh family;
4. preserve `reToastAncestor: { receiptSha256, scoreAddress }` in family binding and response;
5. clear the pending arm only after successful family generation;
6. keep the lineage binding through mutate/STOMP/CONVERGE descendants.

No historical timeline is reused.

- [ ] **Step 8: Run GREEN and commit**

Run: `node --test tests/memory-influence.test.cjs tests/retoast-ancestry.test.cjs tests/candidate-family.test.cjs tests/converge-frontier.test.cjs`

Expected: PASS with legacy non-memory behavior unchanged.

Commit:

```bash
git add src/full-measure/src/generation src/full-measure/src/candidate-session.cjs src/full-measure/tests/memory-influence.test.cjs src/full-measure/tests/retoast-ancestry.test.cjs
git commit -m "feat: add bounded memory influence and re-toast ancestry"
```

---

### Task 6: Witness Encounter Receipts + Memory Service

**Files:**
- Create: `src/full-measure/src/memory/witness-encounter.cjs`
- Create: `src/full-measure/src/memory/memory-service.cjs`
- Create: `src/full-measure/tests/witness-encounter.test.cjs`
- Create: `src/full-measure/tests/memory-service.test.cjs`

**Interfaces:**
- Produces: `appendWitnessEncounter({ rootDir, renderReceiptSha256, renderReceipt, memoryContext, now, uuid })`
- Produces: `createMemoryService({ rootProvider })`.
- Service methods: `archiveSuccessfulRender`, `listPastToasts`, `getPastToast`, `submitVerdict`, `armableAncestor`, `generationContext`, `recordWitnessEncounter`, `resolveArtifact`, `currentProjection`.

- [ ] **Step 1: Write RED witness separation test**

```js
const before = await fs.readFile(renderResult.receiptPath);
const witness = await appendWitnessEncounter({
  rootDir,
  renderReceiptSha256: archived.receiptSha256,
  renderReceipt: renderResult.receipt,
  memoryContext,
  now: () => new Date("2026-08-17T21:00:00.000Z"),
  uuid: () => "witness-1",
});
const after = await fs.readFile(renderResult.receiptPath);
assert.deepEqual(after, before);
assert.deepEqual(witness.witnessWindow, renderResult.receipt.render.witnessWindow);
assert.equal(witness.memoryCapsuleSha256, memoryContext.capsule.capsuleSha256);
```

- [ ] **Step 2: Run RED**

Run: `node --test tests/witness-encounter.test.cjs tests/memory-service.test.cjs`

Expected: FAIL because modules are absent.

- [ ] **Step 3: Implement witness encounter schema**

Use:

```js
{
  schema: "haunted-toaster/witness-encounter/v1",
  witnessId,
  createdAt,
  renderReceiptSha256,
  witnessWindow,
  memoryCapsuleSha256,
  influenceTraceSha256,
  disposition,
  reToastAncestor: null,
}
```

Store under `Receipts/witness/`. The record references the immutable render witness; it never replaces it.

- [ ] **Step 4: Implement memory service orchestration**

`rootProvider()` is called lazily per operation. `generationContext()` must:

1. rebuild/read current projection;
2. summarize current song evidence;
3. derive allowed feature universe from current constraints;
4. derive MemoryCapsule;
5. derive one influence plan;
6. derive witness disposition;
7. return these without filesystem paths.

`listPastToasts()` must merge archive entry + latest verdict state and return no arbitrary filesystem traversal capability.

- [ ] **Step 5: Run GREEN and commit**

Run: `node --test tests/witness-encounter.test.cjs tests/memory-service.test.cjs`

Expected: PASS.

Commit:

```bash
git add src/full-measure/src/memory src/full-measure/tests/witness-encounter.test.cjs src/full-measure/tests/memory-service.test.cjs
git commit -m "feat: add toaster memory service and witness encounters"
```

---

### Task 7: Electron Main/Preload Integration Without Render-Receipt Mutation

**Files:**
- Modify: `src/full-measure/src/main.cjs`
- Modify: `src/full-measure/src/preload.cjs`
- Modify: `src/full-measure/src/candidate-session.cjs`
- Create: `src/full-measure/tests/memory-ipc-contract.test.cjs`
- Modify: `src/full-measure/tests/sandboxed-preload-contract.test.cjs` if that is the current preload sandbox regression file on the implementation head; otherwise extend the existing preload sandbox contract file that replaced it.

**Interfaces:**
- Browser bridge gains: `listPastToasts()`, `getPastToast(receiptSha256)`, `submitToastVerdict(config)`, `armReToast(receiptSha256)`, `clearReToast()`, `getCurrentInfluenceTrace()`, `openPastToastArtifact(config)`.

- [ ] **Step 1: Write RED IPC contract**

Assert that main registers these exact channels:

```text
memory:list-past-toasts
memory:get-past-toast
memory:submit-verdict
memory:arm-retoast
memory:clear-retoast
memory:current-influence-trace
memory:open-artifact
```

And that preload exposes matching methods through `window.fullMeasure` while remaining sandbox-safe.

- [ ] **Step 2: Run RED**

Run the focused IPC/preload tests.

Expected: FAIL because channels are not present.

- [ ] **Step 3: Instantiate memory service lazily**

Add:

```js
function toasterMemoryRoot() {
  return path.join(app.getPath("userData"), "toaster-memory-v1");
}

const memoryService = createMemoryService({ rootProvider: toasterMemoryRoot });
const candidateSession = createCandidateSession({ memoryProvider: memoryService });
```

Do not read `app.getPath("userData")` at module import time; call it only after Electron is ready through service operations.

- [ ] **Step 4: Archive only after successful render**

Replace the direct `return await renderVideo(...)` inside `render:start` with:

```js
const renderResult = await renderVideo(renderConfig, hooks);
let memoryArchive = null;
try {
  memoryArchive = await memoryService.archiveSuccessfulRender(renderResult);
  if (selectedExecution?.memoryContext) {
    await memoryService.recordWitnessEncounter({
      archiveEntry: memoryArchive,
      renderReceipt: renderResult.receipt,
      memoryContext: selectedExecution.memoryContext,
    });
  }
} catch (error) {
  memoryArchive = { ok: false, error: error instanceof Error ? error.message : String(error) };
}
return { ...renderResult, memoryArchive };
```

The implementation must preserve this law: archive failure is visible but cannot invalidate a render that already passed canonical validation and emitted its receipt.

- [ ] **Step 5: Implement narrow artifact opening**

`memory:open-artifact` accepts only `{ receiptSha256, kind, reveal }`. Resolve the path through `memoryService.resolveArtifact()`. Do not accept a raw renderer-supplied path in this new IPC.

- [ ] **Step 6: Run GREEN and full preload regression**

Run:

```bash
npm test
npm run check
```

Expected: all tests/checks pass; sandbox remains `true`, `contextIsolation` remains `true`, `nodeIntegration` remains `false`.

- [ ] **Step 7: Commit**

```bash
git add src/full-measure/src/main.cjs src/full-measure/src/preload.cjs src/full-measure/src/candidate-session.cjs src/full-measure/tests
git commit -m "feat: connect toaster memory through narrow electron ipc"
```

---

### Task 8: Past Toasts UI + Human Rating + Re-toast

**Files:**
- Create: `src/full-measure/src/renderer/past-toasts-ui.js`
- Create: `src/full-measure/src/renderer/memory-ui.css`
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/scripts/build-ui-witness.cjs`
- Modify: `src/full-measure/witness/witness-bridge.js`
- Modify: `src/full-measure/witness/witness-controller.js`
- Create: `src/full-measure/tests/past-toasts-ui.test.cjs`

**Interfaces:**
- `past-toasts-ui.js` owns drawer state only.
- Dispatches `toaster-retoast-armed` with `{ receiptSha256, title }` after successful arm.
- Consumes only preload methods from Task 7.

- [ ] **Step 1: Write RED DOM contract**

Using JSDOM, require:

- header button text `Past Toasts`;
- empty state;
- populated title + rating;
- accessible Receipt/Score/Timeline actions;
- `Re-toast` action;
- rating control with exactly five buttons/radio choices;
- optional `KEEP`, `WEIRD`, `COMPOST` controls.

- [ ] **Step 2: Run RED**

Run: `node --test tests/past-toasts-ui.test.cjs`

Expected: FAIL because UI module/CSS/markup are absent.

- [ ] **Step 3: Add bounded drawer furniture**

Add one header action beside the local-only badge and one dialog/drawer near the bottom of `index.html`. Do not add a second full application navigation system.

Required card copy:

```text
<title>
<date> · <rating when present>
<compact visual identity tokens>
Receipt · Score · Timeline · Video
Re-toast
```

If video is missing, show `Video unavailable`; do not hide the historical toast.

- [ ] **Step 4: Implement verdict submission**

A rating submission sends exactly:

```js
{
  renderReceiptSha256,
  rating,
  disposition: selectedDisposition || null,
  wouldReToast: Boolean(wouldReToast),
}
```

After success, refresh the one toast card from `getPastToast()` rather than synthesizing memory state in the renderer.

- [ ] **Step 5: Implement Re-toast arm behavior**

On success:

1. close Past Toasts drawer;
2. dispatch `toaster-retoast-armed`;
3. show a compact persistent ancestry badge near the six-up launcher: `Re-toast armed · <title>` with a clear action;
4. do not generate automatically.

The human still chooses when to generate the next six-up.

- [ ] **Step 6: Extend generated UI witness assets**

Add `memory-ui.css`, `past-toasts-ui.js`, and later `thoughtline-ui.js` to `RENDERER_FILES` so Vercel/Playwright witness uses production assets.

Extend `witness-bridge.js` with deterministic Past Toast fixtures and verdict/Re-toast bridge methods.

- [ ] **Step 7: Run GREEN and commit**

Run:

```bash
node --test tests/past-toasts-ui.test.cjs
npm run witness:build
```

Expected: PASS and witness bundle includes the new renderer files.

Commit:

```bash
git add src/full-measure/src/renderer src/full-measure/scripts/build-ui-witness.cjs src/full-measure/witness src/full-measure/tests/past-toasts-ui.test.cjs
git commit -m "feat: add past toasts verdicts and re-toast ui"
```

---

### Task 9: Thoughtline Evidence Visualization

**Files:**
- Create: `src/full-measure/src/renderer/thoughtline-ui.js`
- Modify: `src/full-measure/src/renderer/candidate-ui.js`
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/src/renderer/memory-ui.css`
- Create: `src/full-measure/tests/thoughtline-ui.test.cjs`

**Interfaces:**
- Candidate UI dispatches `toaster-influence-trace` with the exact trace returned from main/candidate session.
- Thoughtline consumes trace data but never modifies it.

- [ ] **Step 1: Write RED evidence-backed SVG tests**

Require that a fixture trace with three nodes/two edges renders three `[data-thoughtline-node]` elements and two `[data-thoughtline-edge]` elements, and that clicking one edge exposes its `evidenceRefs` in the inspector.

Also require:

```js
assert.equal(generateCallsAfterTogglingThoughtline, generateCallsBeforeTogglingThoughtline);
```

Hiding/showing Thoughtline must not call generation.

- [ ] **Step 2: Run RED**

Run: `node --test tests/thoughtline-ui.test.cjs`

Expected: FAIL because Thoughtline is absent.

- [ ] **Step 3: Emit the trace from candidate UI**

After every successful `renderFamily(view)`, dispatch:

```js
window.dispatchEvent(new CustomEvent("toaster-influence-trace", {
  detail: view.influenceTrace || null,
}));
```

When candidates are cleared, dispatch the same event with `detail: null`.

- [ ] **Step 4: Render a bounded SVG graph**

Use deterministic radial/column positions based on node index/type; do not add a graph-layout dependency.

Rules:

- max 24 visible nodes;
- max 36 edges;
- provisional/current nodes use lighter opacity;
- archived render/verdict nodes use durable styling;
- every edge receives `data-relation` and `data-evidence-count`;
- selected node/edge inspector shows relation and evidence refs;
- `prefers-reduced-motion: reduce` disables pulse/travel animation;
- a hidden Thoughtline panel does not change candidate state.

- [ ] **Step 5: Run GREEN and commit**

Run: `node --test tests/thoughtline-ui.test.cjs`

Expected: PASS.

Commit:

```bash
git add src/full-measure/src/renderer/candidate-ui.js src/full-measure/src/renderer/index.html src/full-measure/src/renderer/memory-ui.css src/full-measure/src/renderer/thoughtline-ui.js src/full-measure/tests/thoughtline-ui.test.cjs
git commit -m "feat: visualize toaster influence trace as thoughtline"
```

---

### Task 10: Canonical Browser Witness States

**Files:**
- Modify: `src/full-measure/witness/witness-bridge.js`
- Modify: `src/full-measure/witness/witness-controller.js`
- Modify: `src/full-measure/tests/ui-witness.spec.cjs`
- Add/update reviewed PNGs under: `src/full-measure/tests/ui-witness-baselines/`

**Interfaces:**
- New deterministic states: `past-toasts-empty`, `past-toasts`, `toast-detail`, `retoast-armed`, `thoughtline`, `past-toast-missing-media`.

- [ ] **Step 1: Add RED Playwright states without baselines**

Extend the state array and state-specific semantic assertions before updating screenshots.

For `thoughtline` require at least one evidence-backed edge:

```js
await expect(page.locator("[data-thoughtline-edge]")).toHaveCount(2);
await expect(page.locator("[data-thoughtline-edge]").first()).toHaveAttribute("data-evidence-count", /[1-9]/);
```

For `past-toast-missing-media`, require `Video unavailable` while Receipt remains actionable.

- [ ] **Step 2: Run witness test and confirm expected screenshot RED**

Run: `npm run witness:test`

Expected: semantic assertions pass; new screenshots fail because baselines do not yet exist.

- [ ] **Step 3: Review and promote only the new intentional baselines**

Generate/update the six new snapshots, inspect each image manually, and ensure existing baseline images do not change unexpectedly.

- [ ] **Step 4: Re-run witness comparison**

Run: `npm run witness:test`

Expected: PASS with console error array empty for every state.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/witness src/full-measure/tests/ui-witness.spec.cjs src/full-measure/tests/ui-witness-baselines
git commit -m "test: witness toaster memory and thoughtline ui"
```

---

### Task 11: Full Verification + Packaged Filesystem Witness

**Files:**
- Modify only if proof exposes a defect.
- Record human packaged witness in PR/issue/GitBook evidence rather than changing canonical history to manufacture success.

**Interfaces:**
- No new production interface. This task proves the whole Slice B boundary.

- [ ] **Step 1: Run consolidated local/source proof**

Run:

```bash
npm --prefix src/full-measure ci
npm run verify
```

If the repository's root `verify` command has advanced on the implementation head, use that current canonical command and record the exact command/result in the PR.

Expected:

- all source checks pass;
- all unit tests pass;
- existing render smoke passes;
- candidate smoke passes;
- UI witness passes;
- no existing receipt/replay regression fails.

- [ ] **Step 2: Prove deterministic memory rebuild from fixtures**

Delete only the derived test projection directory and rebuild twice. Require identical `projectionSha256`, `capsuleSha256`, and trace hash for the same archive cut/current song.

- [ ] **Step 3: Build the Windows package through the repository's current package workflow**

Use the current CI/manual package route already used for Toaster prerelease Windows witnesses. Do not tag or publish a BETA release from this slice alone.

- [ ] **Step 4: Human packaged witness checklist**

On the real packaged appliance, prove all of these with one or more real renders:

1. render a song successfully;
2. open Past Toasts and see the new song/title;
3. open archived receipt/score/timeline from Past Toasts;
4. rate it 1–5 and optionally mark KEEP/WEIRD/COMPOST;
5. close/reopen the app and confirm verdict persists;
6. arm Re-toast and generate a fresh six-up;
7. confirm ancestry is visible and the six-up is new rather than exact replay;
8. inspect Thoughtline and click at least one real evidence-backed edge;
9. render the descendant and confirm a new immutable render receipt plus separate witness encounter record are created;
10. temporarily move/delete the MP4 and confirm Past Toasts retains historical metadata while saying `Video unavailable`;
11. confirm ordinary non-Re-toast generation still works with memory steering no more than one lane;
12. confirm render output receipt bytes are unchanged by subsequent rating/verdict events.

- [ ] **Step 5: Final authority regression**

Inspect a completed descendant render receipt and prove:

```text
render receipt -> accepted VisualScore/ResolvedTimeline + witness-window-v1
human verdict -> separate haunted-toaster/human-verdict/v1
witness memory feedback -> separate haunted-toaster/witness-encounter/v1
Influence Trace -> proposal provenance, not render authority
```

- [ ] **Step 6: Commit only defect repairs; otherwise preserve proof externally**

If no code defect is found, do not create a meaningless “proof commit.” Attach the packaged witness result to the implementation PR and project evidence trail.

---

## Spec Coverage Self-Review

- Receipt archive/index: Tasks 1, 6, 7.
- Past Toasts and attached receipts: Tasks 1, 7, 8, 10.
- Append-only 1–5 rating + KEEP/WEIRD/COMPOST + Re-toast flag: Tasks 2, 8.
- Rebuildable deterministic Memory Projection v1: Task 3.
- Rating strengthens relationships rather than ingredient popularity: Task 3.
- Anti-collapse/saturation pressure: Tasks 3, 4.
- Bounded MemoryCapsule: Task 4.
- Ordinary memory affects one lane only: Task 5.
- Explicit Re-toast ancestry: Tasks 5, 8.
- Witness disposition without redefining Witness Window: Tasks 4, 6, 7.
- Influence Trace: Task 4.
- Thoughtline: Tasks 9, 10.
- Missing-media truth state: Tasks 1, 8, 10, 11.
- Local-only storage and narrow sandbox boundary: Tasks 6, 7.
- Exact Replay deferred: Global Constraints and Task 8 behavior.
- Browser + packaged witness: Tasks 10, 11.

## Self-Review Result

- No implementation task requires embeddings, cloud services, or opaque model state.
- No task edits a historical render receipt after creation.
- Memory-free candidate generation preserves existing behavior by contract.
- Memory-shaped candidate generation is replayable because the exact influence plan is family evidence.
- Re-toast ancestry uses a historical score as a parent but never reuses its historical timeline as a new execution.
- Thoughtline displays only explicit Influence Trace data and is not presented as private model chain-of-thought.
- The plan is split so archive/verdict/projection foundations can be reviewed independently before candidate/UI integration.
