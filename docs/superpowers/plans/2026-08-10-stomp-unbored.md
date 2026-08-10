# STOMP / UNBORED Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-shot STOMP button that immediately generates six deterministically extreme, materially diverse descendants from the selected candidate while preserving locks, provenance, and ordinary MUTATE/CONVERGE behavior.

**Architecture:** Add a separate `visible-outcome-stomp-v1` generation policy layered on the hidden primitive field and existing visible-distance machinery. STOMP is an explicit candidate-session request with no persistent mode; it uses the selected candidate, current locks, root seed, and normal six-up materialization path. The renderer remains unchanged because STOMP only produces ordinary accepted scores/timelines under a more aggressive deterministic generation policy.

**Tech Stack:** Node.js CommonJS, deterministic candidate generation, existing candidate session IPC/preload bridge, vanilla renderer UI, Node test runner.

## Global Constraints

- Visible control label: `STOMP`.
- Product meaning: “I’m bored. Surprise me harder.”
- Helper copy: `Bored? Floor the next six.`
- One-shot action only; no armed/persistent STOMP state.
- Requires a selected current candidate and obeys stale-family protection.
- Existing locks remain absolute, including topology→hidden structure and motion→hidden dynamics.
- No effect selection, intensity slider, mood dial, or renderer-side distortion toggle.
- Ordinary MUTATE and CONVERGE remain unchanged when STOMP is not invoked.
- No version/release bump and no new dependency.

---

### Task 1: STOMP generation policy and deterministic rail roles

**Files:**
- Create: `src/full-measure/src/generation/stomp-generation.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Test: `src/full-measure/tests/stomp-generation.test.cjs`

**Interfaces:**
- Produces `STOMP_POLICY = "visible-outcome-stomp-v1"`.
- Produces `STOMP_SLOT_POLICIES` for six distinct roles.
- Produces `generateStompCandidateSet(options)` returning the normal candidate-family schema.

- [ ] **Step 1: Write failing policy tests**

```js
const family = generation.generateStompCandidateSet({
  analysis,
  garmentConstraints: constraints,
  rendererProfile,
  parentScore,
  locks: [],
  rootSeed: "bored-now",
  count: 6,
});

assert.equal(family.policy, generation.STOMP_POLICY);
assert.equal(family.producedCount, 6);
assert.deepEqual(family.roles, [
  "structure-break",
  "dynamics-break",
  "field-break",
  "categorical-break",
  "compound-mutant",
  "rail-rider",
]);
```

Also prove identical inputs replay to identical score/timeline hashes and each candidate records policy, role, distance, breaks, and relaxation evidence.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test src/full-measure/tests/stomp-generation.test.cjs`
Expected: FAIL because STOMP generation does not exist.

- [ ] **Step 3: Implement six tail-seeking slot roles**

Use the existing hidden primitive arrays and `visibleSemanticDistance()`. Define:

```js
const STOMP_SLOT_POLICIES = Object.freeze([
  { role: "structure-break", broadAxes: ["topology"], primitiveAxes: ["structure"], minBreaks: 1 },
  { role: "dynamics-break", broadAxes: ["motion"], primitiveAxes: ["dynamics"], minBreaks: 1 },
  { role: "field-break", broadAxes: ["material", "palette", "camera", "atmosphere"], primitiveAxes: [], minBreaks: 2 },
  { role: "categorical-break", broadAxes: ["topology", "motion", "material", "palette", "camera", "temporalDensity", "atmosphere"], primitiveAxes: [], minBreaks: 3 },
  { role: "compound-mutant", broadAxes: ["topology", "motion", "material", "camera"], primitiveAxes: ["structure", "dynamics"], minBreaks: 3 },
  { role: "rail-rider", broadAxes: ["topology", "motion", "palette", "material", "camera", "temporalDensity", "atmosphere"], primitiveAxes: ["structure", "dynamics"], minBreaks: 4 },
]);
```

Generate candidate seeds from root seed, parent score address, slot index, attempt, lock set, and STOMP policy. Candidate mutation may reuse existing bounded axis mutation helpers conceptually, but STOMP must have its own policy identity and thresholds rather than an undocumented boolean on ordinary generation.

- [ ] **Step 4: Add deterministic threshold relaxation**

For each role, try strict thresholds first. If locks/constraints make them impossible, reduce only the minimum parent/sibling distance and required break count in deterministic integer steps, recording:

```js
thresholdRelaxation: {
  applied: true,
  from: { minParentDistance, minSiblingDistance, requiredBreaks },
  to: { minParentDistance, minSiblingDistance, requiredBreaks },
  reason: "locks-or-constraints-exhausted-strict-rail-target"
}
```

Never relax a lock and never choose an invalid enum/value.

- [ ] **Step 5: Run focused tests**

Run: `node --test src/full-measure/tests/stomp-generation.test.cjs`
Expected: PASS for six roles, deterministic replay, stronger novelty than ordinary branch generation, and constrained relaxation.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/generation/stomp-generation.cjs src/full-measure/src/generation/index.cjs src/full-measure/tests/stomp-generation.test.cjs
git commit -m "Add deterministic STOMP candidate policy"
```

### Task 2: Candidate-session one-shot request

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Modify: `src/full-measure/src/preload.cjs`
- Test: `src/full-measure/tests/stomp-generation.test.cjs`
- Test: `src/full-measure/tests/renderer-ui-integration.test.cjs`

**Interfaces:**
- Adds candidate-session `stomp(config, signal)` using the selected parent index/family hash contract.
- Adds IPC `candidate:stomp`.
- Adds preload method `stompCandidates(config)`.

- [ ] **Step 1: Write failing session/IPC tests**

```js
await assert.rejects(
  () => session.stomp({ familyHash, parentIndex: null }),
  /Choose a current candidate/,
);
await assert.rejects(
  () => session.stomp({ familyHash: "stale", parentIndex: 0 }),
  /no longer current/,
);
```

Also prove a valid request passes selected parent, locks, root seed, analysis, constraints, and profile to `generateStompCandidateSet()` before using the existing `materialize()` path.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test src/full-measure/tests/stomp-generation.test.cjs src/full-measure/tests/renderer-ui-integration.test.cjs`
Expected: FAIL because the session/bridge action does not exist.

- [ ] **Step 3: Implement the one-shot session action**

Add a sibling to `mutate()`:

```js
async function stomp(config = {}, signal) {
  assertReady();
  if (!family || family.familyHash !== config.familyHash) {
    throw new Error("Candidate family is no longer current; generate six again.");
  }
  const parent = family.candidates[Number(config.parentIndex)];
  if (!parent) throw new TypeError("Choose a current candidate before stomping.");
  busy = true;
  try {
    const constraints = currentConstraints(config.presetId);
    const nextFamily = generation.generateStompCandidateSet({
      analysis: toGenerationAnalysis(mediaAnalysis),
      garmentConstraints: constraints,
      rendererProfile,
      parentScore: parent.scoreArtifact.score,
      locks: config.locks || [],
      rootSeed: config.rootSeed,
      count: 6,
    });
    return await materialize(nextFamily, config, signal, familyBinding?.labInfluence || null);
  } finally {
    busy = false;
  }
}
```

Do not store `stomp=true` anywhere after generation completes.

- [ ] **Step 4: Wire IPC/preload explicitly**

Add `candidate:stomp` handler and preload bridge method. Do not overload `candidate:mutate` with an ambient mode flag.

- [ ] **Step 5: Run focused tests**

Run: `node --test src/full-measure/tests/stomp-generation.test.cjs src/full-measure/tests/renderer-ui-integration.test.cjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/candidate-session.cjs src/full-measure/src/preload.cjs src/full-measure/tests/stomp-generation.test.cjs src/full-measure/tests/renderer-ui-integration.test.cjs
git commit -m "Expose one-shot STOMP candidate action"
```

### Task 3: STOMP button in the existing candidate action surface

**Files:**
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/src/renderer/candidate-ui.js`
- Modify: `src/full-measure/src/renderer/candidate-ui.css`
- Test: `src/full-measure/tests/renderer-ui-integration.test.cjs`

**Interfaces:**
- Visible button text `STOMP`.
- Visible/help text `Bored? Floor the next six.`
- Uses existing selected candidate index, family hash, lock set, root seed, and busy rendering path.

- [ ] **Step 1: Add failing UI contract tests**

```js
assert.equal(stompButton.textContent.trim(), "STOMP");
assert.match(stompHelp.textContent, /Bored\? Floor the next six\./);
assert.equal(stompButton.disabled, true);
```

Also assert the button enables only after selection, disables while the candidate surface is busy, and sends exactly one explicit `stompCandidates()` request containing family hash, selected parent index, locks, root seed, and preset context.

- [ ] **Step 2: Run UI test and confirm failure**

Run: `node --test src/full-measure/tests/renderer-ui-integration.test.cjs`
Expected: FAIL because STOMP UI is absent.

- [ ] **Step 3: Add narrow markup/style**

Place STOMP beside existing descendant controls. Reuse existing button classes/states where possible; add only a small modifier class if needed to make it read like a stomp pedal. Do not add knobs, menus, persistent indicators, or another panel.

- [ ] **Step 4: Wire click behavior**

On click, require current selection, set existing busy UI, call preload `stompCandidates()` with the same generation context used by descendant generation, replace the six-up family with the response, and clear busy in `finally`. Do not leave an armed flag behind.

- [ ] **Step 5: Run UI tests**

Run: `node --test src/full-measure/tests/renderer-ui-integration.test.cjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/renderer/index.html src/full-measure/src/renderer/candidate-ui.js src/full-measure/src/renderer/candidate-ui.css src/full-measure/tests/renderer-ui-integration.test.cjs
git commit -m "Add STOMP boredom pedal to six-up UI"
```

### Task 4: Regression and PR proof

**Files:**
- No planned source changes. If proof exposes a defect, edit only the failing feature file and its focused regression test.

- [ ] **Step 1: Prove ordinary mutation remains ordinary**

Run:
```bash
node --test src/full-measure/tests/candidate-family.test.cjs src/full-measure/tests/converge-frontier.test.cjs src/full-measure/tests/stomp-generation.test.cjs
```
Expected: PASS and existing ordinary policy/hash fixtures remain valid outside STOMP.

- [ ] **Step 2: Run full verification**

Run: `npm run verify`
Expected: PASS.

- [ ] **Step 3: Run application tests and smoke**

Run:
```bash
npm --prefix src/full-measure test
npm --prefix src/full-measure run smoke
```
Expected: PASS.

- [ ] **Step 4: Audit behavior/artifacts**

Confirm STOMP emits ordinary accepted VisualScores/ResolvedTimelines with explicit `visible-outcome-stomp-v1` derivation evidence; no renderer code branches on STOMP; no persistent UI setting remains after the request; locks are unchanged and absolute; there is no package/version/dependency change; and ordinary MUTATE/CONVERGE requests remain unchanged when STOMP is not called.

- [ ] **Step 5: Commit only if proof required a concrete fix**

If a proof failure required edits, stage exactly the feature/test files changed in that repair and commit them with:

```bash
git commit -m "Prove STOMP generation isolation"
```

If proof is already green, do not create an empty proof commit.
