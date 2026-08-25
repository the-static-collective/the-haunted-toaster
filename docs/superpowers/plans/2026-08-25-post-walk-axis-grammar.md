# Post-WALK Axis Grammar Stage A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove `RESPONSE STANCE × SCOPE × CONSEQUENCE` as a deterministic six-up grammar using existing L BRANCH and topology-event organs, with versioned relational response semantics, exact replay, fail-closed refusal, receipt parity, and no new renderer subsystem.

**Architecture:** Add a versioned L BRANCH v2 execution policy only for the Stage A path so historical v1 semantics remain unchanged. Add one focused `post-walk-axis-grammar.cjs` layer that addresses six balanced recipes, requests an existing GRAB event as the consequence carrier, binds a v2 L BRANCH send as response/scope, and records the recipe identity on the accepted timeline. Candidate-session exposes this only through an explicit internal policy; ordinary six-up generation remains governed by the existing path when the policy is absent.

**Tech Stack:** Node.js CommonJS, deterministic canonical hashing, `node:test`, existing Full Measure candidate/session/topology/L BRANCH/receipt modules, existing FFmpeg render seam.

**Spec:** `docs/superpowers/specs/2026-08-25-post-walk-gait-design.md`

## Global Constraints

- Stage A only: do not implement Video Digestion (#250), MADDCL0WN, KEEP TOAST/SCRAPE TOAST, persistent Listener work, memory, HAUNT, or DREAM in this plan.
- Do not reopen or widen WALK E. At plan authorship the witnessed post-WALK carrier lineage is PR #249 head `8b0ba15e8688aa0e02e9d0f926f51df380cc152c`; execution must use the then-current accepted post-WALK integration ref, not stale `main` if WALK has not landed.
- Do not merge PR #249, tag, release, or promote as a side effect of Stage A work.
- No new renderer subsystem or monolithic effect preset.
- Historical L BRANCH v1 plan/execution semantics remain unchanged. New relational `oppose` behavior must be versioned.
- When axis grammar is absent, ordinary six-up behavior and historical artifacts retain their existing meaning.
- Evidence availability does not imply consumption; candidate proposal does not imply execution authority.
- Renderer code may execute accepted semantics but may not invent response, scope, consequence, routing, or fallback defaults.
- Illegal or unavailable combinations refuse explicitly; no silent coercion to whole-frame, `follow`, or clean-return.
- The same frozen inputs, seed, locks, policy, and evidence must reproduce the same recipes, timelines, plans, executions, and receipt identities.
- Preview and final render must consume the same accepted timeline semantics.
- Stage A v1 owns only `whole | grab` scope. It does not encode aperture geometry; that preserves the clean descendant seam for #223 Aperture Shape.
- Machine proof and human witness remain separate receipts.

---

### Task 1: Version L BRANCH so Stage A can have relational `oppose` without rewriting history

**Files:**
- Modify: `src/full-measure/src/generation/l-branch.cjs`
- Modify: `src/full-measure/src/render/l-branch-integrity.cjs`
- Test: `src/full-measure/tests/l-branch-evidence-bus.test.cjs`
- Test: `src/full-measure/tests/l-branch-production-admission.test.cjs`

**Interfaces:**
- Preserve existing exports and v1 constants: `MIX_PLAN_SCHEMA`, `MIX_PLAN_POLICY`, `MIX_EXECUTION_SCHEMA`, `MIX_EXECUTION_POLICY`, `buildMixPlan(...)`, `compileMixPlan(...)`, `attachLBranchToFamily(...)`.
- Add: `MIX_PLAN_SCHEMA_V2 = "haunted-toaster/l-branch-mix-plan/v2"`.
- Add: `MIX_PLAN_POLICY_V2 = "l-branch-mix-plan-v2"`.
- Add: `MIX_EXECUTION_SCHEMA_V2 = "haunted-toaster/l-branch-mix-execution/v2"`.
- Add: `MIX_EXECUTION_POLICY_V2 = "l-branch-mix-execution-v2"`.
- Add: `buildMixPlanFromRequests({ laneBank, candidate, strategyId, requests, policyVersion })`.
- Add: `bindMixPlanToTimeline(timeline, laneBank, mixPlan)` as the public name for the current binding operation.
- `compileMixPlan(...)` dispatches response semantics from the mix-plan policy. v1 remains exactly current behavior; v2 uses relational temporal counter-motion for `oppose`.

- [ ] **Step 1: Write failing tests for v2 plan identity and historical v1 stability**

Add a test that builds the same candidate/lane bank twice, once through the existing v1 `buildMixPlan` path and once through `buildMixPlanFromRequests` with v2.

```js
const v2Plan = buildMixPlanFromRequests({
  laneBank,
  candidate,
  strategyId: "post-walk-test",
  policyVersion: MIX_PLAN_POLICY_V2,
  requests: [{
    lane: "raw-energy-envelope",
    target: "topology",
    gain: 0.72,
    resolution: 0.72,
    response: "oppose",
    smoothing: 0,
    scope: "whole",
  }],
});

assert.equal(v2Plan.schema, MIX_PLAN_SCHEMA_V2);
assert.equal(v2Plan.policyVersion, MIX_PLAN_POLICY_V2);
assert.equal(v2Plan.sends[0].response, "oppose");
```

Keep existing v1 fixture/hash assertions unchanged. Do not update historical expected hashes to make the new code pass.

- [ ] **Step 2: Write a failing relational-oppose test**

Construct a lane whose smoothed values contain a rising transition, for example `0.20 → 0.60`. Under v1 the second `oppose` value is `1 - 0.60 = 0.40`. Under v2 the counter-motion must depend on the previous local value rather than the absolute complement:

```js
function relationalOppose(current, previous) {
  return Math.max(0, Math.min(1, previous - (current - previous)));
}

assert.equal(relationalOppose(0.60, 0.20), 0);
assert.notEqual(relationalOppose(0.60, 0.20), 1 - 0.60);
assert.notEqual(relationalOppose(0.60, 0.80), relationalOppose(0.60, 0.20));
```

Test this through `compileMixPlan`, not by exporting the helper solely for tests. Equal current amplitude under different local history must produce different v2 `oppose` output.

- [ ] **Step 3: Run the focused L BRANCH tests and verify RED**

```text
npm --prefix src/full-measure test -- --test-name-pattern="L BRANCH|relational oppose|mix plan v2"
```

Expected: FAIL because v2 schemas/building and relational response semantics do not exist yet.

- [ ] **Step 4: Refactor plan construction without changing v1 output**

Move the current `buildMixPlan` core into `buildMixPlanFromRequests`. `buildMixPlan` continues selecting `STRATEGIES[index % STRATEGIES.length]` and calls the helper with the v1 policy.

```js
const MIX_PLAN_HASH_DOMAIN_V1 = "HauntedToaster-LBranchMixPlan-v1";
const MIX_PLAN_HASH_DOMAIN_V2 = "HauntedToaster-LBranchMixPlan-v2";
```

The helper reuses existing lane/destination/response/scope validation.

- [ ] **Step 5: Add policy-specific execution semantics**

Keep v1 exactly:

```js
if (send.response === "oppose") responseValue = 1 - value;
else if (send.response === "accent") responseValue = Math.abs(value - previous);
```

For v2:

```js
if (send.response === "oppose") {
  responseValue = clamp01(previous - (value - previous));
} else if (send.response === "accent") {
  responseValue = Math.abs(value - previous);
}
```

Use v2 execution schema/policy and hash domain `HauntedToaster-LBranchMixExecution-v2`. Do not alter follow/accent semantics in this slice.

- [ ] **Step 6: Teach `assertLBranchIntegrity` to verify either admitted version**

Select expected schema, policy, and hash domain from the mix-plan/execution version. Reject mixed v1/v2 pairs. Existing v1 timelines must continue to verify unchanged.

- [ ] **Step 7: Run focused tests GREEN**

```text
npm --prefix src/full-measure test -- --test-name-pattern="L BRANCH|relational oppose|mix plan v2"
```

Expected: PASS, including unchanged historical v1 assertions.

- [ ] **Step 8: Commit**

```text
git add src/full-measure/src/generation/l-branch.cjs src/full-measure/src/render/l-branch-integrity.cjs src/full-measure/tests/l-branch-evidence-bus.test.cjs src/full-measure/tests/l-branch-production-admission.test.cjs
git commit -m "feat: version relational l-branch response"
```

### Task 2: Create the addressed three-axis recipe kernel

**Files:**
- Create: `src/full-measure/src/generation/post-walk-axis-grammar.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Create test: `src/full-measure/tests/post-walk-axis-grammar.test.cjs`

**Interfaces:**
- Export: `POST_WALK_AXIS_GRAMMAR_SCHEMA = "haunted-toaster/post-walk-axis-grammar/v1"`.
- Export: `POST_WALK_AXIS_GRAMMAR_POLICY = "post-walk-axis-grammar-v1"`.
- Export: `POST_WALK_AXIS_RECIPE_SCHEMA = "haunted-toaster/post-walk-axis-recipe/v1"`.
- Export: `POST_WALK_AXIS_RECIPE_POLICY = "post-walk-axis-recipe-v1"`.
- Export: `POST_WALK_AXIS_RECIPES` as exactly six immutable recipe cores.
- Export: `buildPostWalkAxisRecipe(candidateIndex)` returning a deep-frozen addressed recipe with `recipeHash`.
- Export: `buildAxisGrabRequest({ timeline, rootSeed, slotIndex, recipe })` returning one existing-GRAB event request or an explicit refusal.

The six founding recipe cores are fixed for v1:

```js
[
  { response: "follow", scope: "whole", consequence: "clean-return" },
  { response: "oppose", scope: "whole", consequence: "residue" },
  { response: "accent", scope: "grab", consequence: "clean-return" },
  { response: "follow", scope: "grab", consequence: "residue" },
  { response: "oppose", scope: "grab", consequence: "clean-return" },
  { response: "accent", scope: "whole", consequence: "residue" },
]
```

Every recipe uses the same evidence/send constants in the founding proof so intensity is not pretending to be orthogonality:

```js
{
  lane: "raw-energy-envelope",
  target: "topology",
  gain: 0.72,
  resolution: 0.72,
  smoothing: 0.24,
}
```

- [ ] **Step 1: Write failing recipe-address and descendant-seam tests**

Prove exactly six recipes, all hashes unique, each response appears twice, each scope appears three times, and each consequence appears three times.

```js
assert.deepEqual(
  POST_WALK_AXIS_RECIPES.map(({ response, scope, consequence }) => ({ response, scope, consequence })),
  [
    { response: "follow", scope: "whole", consequence: "clean-return" },
    { response: "oppose", scope: "whole", consequence: "residue" },
    { response: "accent", scope: "grab", consequence: "clean-return" },
    { response: "follow", scope: "grab", consequence: "residue" },
    { response: "oppose", scope: "grab", consequence: "clean-return" },
    { response: "accent", scope: "whole", consequence: "residue" },
  ],
);
assert.equal(POST_WALK_AXIS_RECIPES.some((recipe) => Object.hasOwn(recipe, "shape")), false);
```

The absence of a `shape` field is intentional: #223 may later refine GRAB region geometry without changing the founding Stage A recipe contract.

- [ ] **Step 2: Write failing consequence tests using the existing GRAB organ**

Use `ORDINARY_TOPOLOGY_PARAMETERS.grab` as the base parameters. The Stage A consequence mapper produces:

```js
cleanReturn = {
  ...baseGrab,
  recoil: 1,
  residualVectorX: 0,
  residualVectorY: 0,
  residualStretch: 0,
};

residue = {
  ...baseGrab,
  recoil: 0.35,
  residualVectorX: 0.08,
  residualVectorY: -0.04,
  residualStretch: 0.06,
};
```

Assert both satisfy existing GRAB validation, have different canonical event hashes, and do not introduce a new topology event kind.

- [ ] **Step 3: Write failing lawful-window/refusal tests**

`buildAxisGrabRequest` scans deterministic existing opportunity windows in ascending order using `opportunityCount(...)` + `boundedOpportunityWindow(...)`, chooses the first lawful window, and includes `axis-recipe:<recipeHash>` in `evidenceRefs`.

For a timeline too short to furnish a lawful window, return:

```js
{
  ok: false,
  refusal: {
    reason: "no-lawful-axis-event-window",
    recipeHash,
  },
}
```

There is no whole-frame or no-event fallback.

- [ ] **Step 4: Run focused test and verify RED**

```text
npm --prefix src/full-measure test -- --test-name-pattern="post-walk axis grammar"
```

Expected: FAIL because the module does not exist.

- [ ] **Step 5: Implement recipe addressing and consequence mapping**

Hash recipe cores with domain:

```text
HauntedToaster-PostWalkAxisRecipe-v1
```

Keep the recipe object limited to addressed semantics and fixed founding send constants. Do not put renderer commands or aperture geometry in the recipe.

- [ ] **Step 6: Implement deterministic GRAB request construction**

Use existing `grab` kind and topology timing validation. Event ids are deterministic:

```text
axis-grab-<slotIndex>-<recipeHash first 12 hex chars>
```

Evidence refs include grammar policy, recipe hash, and selected opportunity index.

- [ ] **Step 7: Export through `generation/index.cjs` and run GREEN**

Run the focused test again. Expected: PASS.

- [ ] **Step 8: Commit**

```text
git add src/full-measure/src/generation/post-walk-axis-grammar.cjs src/full-measure/src/generation/index.cjs src/full-measure/tests/post-walk-axis-grammar.test.cjs
git commit -m "feat: add post-walk axis recipe kernel"
```

### Task 3: Compose recipe → topology consequence → L BRANCH response/scope into one accepted family

**Files:**
- Modify: `src/full-measure/src/generation/post-walk-axis-grammar.cjs`
- Test: `src/full-measure/tests/post-walk-axis-grammar.test.cjs`

**Interfaces:**
- Add: `attachPostWalkAxisGrammar(family, { responseWitness, lyricTrack = null })`.
- Add: `replayPostWalkAxisGrammarFamily(family, { baseFamily, responseWitness, lyricTrack = null })`.
- Add timeline binding:

```js
{
  schema: "haunted-toaster/post-walk-axis-timeline/v1",
  policyVersion: "post-walk-axis-grammar-v1",
  recipe,
  recipeHash,
  sourceFamilyHash,
  topologyPlanSha256,
  mixPlanHash,
}
```

- Each successful candidate exposes `axisRecipeHash` equal to the accepted timeline binding `recipeHash`.

- [ ] **Step 1: Write the failing six-candidate composition test**

Start from one normal six-candidate birth family and one frozen `responseWitness`. Call `attachPostWalkAxisGrammar` and assert:

```js
assert.equal(axisFamily.candidates.length, 6);
for (let index = 0; index < 6; index += 1) {
  const candidate = axisFamily.candidates[index];
  const recipe = buildPostWalkAxisRecipe(index);
  assert.equal(candidate.axisRecipeHash, recipe.recipeHash);
  assert.equal(candidate.timeline.axisGrammar.recipeHash, recipe.recipeHash);
  assert.equal(candidate.timeline.topologyEvents.events[0].kind, "grab");
  assert.equal(candidate.timeline.lBranch.mixPlan.policyVersion, MIX_PLAN_POLICY_V2);
  assert.equal(candidate.timeline.lBranch.mixPlan.sends[0].response, recipe.response);
  assert.equal(
    candidate.timeline.lBranch.mixPlan.sends[0].scope.kind,
    recipe.scope === "grab" ? "grab" : "whole-layer",
  );
}
```

- [ ] **Step 2: Write failing independence assertions**

Prove the six-up contains:

- the same scope with different consequences;
- the same consequence under both scopes;
- every response under more than one scope/consequence context;
- GRAB-local recipes whose L BRANCH `regionRef` equals the accepted GRAB event id;
- whole recipes whose send scope remains `whole-layer` even though the consequence carrier is an existing GRAB event.

- [ ] **Step 3: Write failing lock/refusal tests**

With a topology lock, the topology resolver refuses and the axis grammar must not bind an executable v2 L BRANCH plan as if the consequence existed.

With a missing raw-energy lane, return:

```text
required-axis-evidence-unavailable
```

With no lawful event window, preserve:

```text
no-lawful-axis-event-window
```

- [ ] **Step 4: Run focused tests and verify RED**

Run the Stage A test file. Expected: FAIL on the missing family compositor/replay.

- [ ] **Step 5: Implement family composition in this exact order**

```text
base birth family
  → attachTopologyEventAuthorities(...)
  → build one Lane Bank
  → recipe per candidate index
  → existing GRAB request from recipe consequence
  → resolveTopologyEvents(...)
  → v2 buildMixPlanFromRequests(...)
  → bindMixPlanToTimeline(...)
  → bind addressed axis recipe to timeline
  → re-hash candidate timeline identities
  → re-hash family identity
```

Do not route this through ordinary random topology activity; Stage A requires deliberate orthogonal coverage before randomness.

- [ ] **Step 6: Implement replay**

Replay calls the same compositor from the untouched base family and compares:

```js
recipeHashesMatch
laneBankHashMatches
mixPlanHashesMatch
topologyPlanHashesMatch
timelineHashesMatch
familyHashMatches
```

Return a deep-frozen replay artifact with `ok` equal to the conjunction of those booleans.

- [ ] **Step 7: Run focused tests GREEN**

Expected: PASS for composition, independence, refusal, and replay.

- [ ] **Step 8: Commit**

```text
git add src/full-measure/src/generation/post-walk-axis-grammar.cjs src/full-measure/tests/post-walk-axis-grammar.test.cjs
git commit -m "feat: compose post-walk axis family"
```

### Task 4: Put Stage A behind one explicit candidate-session policy and leave ordinary behavior untouched

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Create test: `src/full-measure/tests/post-walk-axis-candidate-session.test.cjs`
- Test existing: `src/full-measure/tests/walk-e-ordinary-transition-wiring.test.cjs`

**Interfaces:**
- Candidate-session config accepts internal `axisGrammarPolicy`.
- Only `axisGrammarPolicy === generation.POST_WALK_AXIS_GRAMMAR_POLICY` activates Stage A.
- Undefined/null `axisGrammarPolicy` follows the current `enrichOrdinaryFamily(...)` path exactly.
- The same enrichment decision applies after genuine candidate births in GENERATE, MUTATE, CROSS, STOMP, and CONVERGE; same-identity selection/relabel paths do not reconstitute authority or grammar.

- [ ] **Step 1: Write a failing initial-generation session test**

```js
const ordinary = await session.generate({ ...config, rootSeed: "axis-session-v1" }, signal);
const axis = await session.generate({
  ...config,
  rootSeed: "axis-session-v1",
  axisGrammarPolicy: generation.POST_WALK_AXIS_GRAMMAR_POLICY,
}, signal);

assert.equal(ordinary.candidates.every((candidate) => candidate.axisRecipeHash === undefined), true);
assert.equal(axis.candidates.every((candidate) => typeof candidate.axisRecipeHash === "string"), true);
```

Existing ordinary fixture expectations remain unchanged.

- [ ] **Step 2: Write failing transition-invariance tests**

For GENERATE, MUTATE, CROSS, STOMP, and CONVERGE under Stage A policy, each newly born family contains six addressed recipes and verified topology authority. For each accepted candidate:

```js
assert.equal(
  candidate.timeline.topologyEvents.acceptedAuthoritySha256,
  candidate.topologyEventAuthority.authoritySha256,
);
assert.equal(candidate.timeline.axisGrammar.recipeHash, candidate.axisRecipeHash);
```

CROSS remains a machine seam specimen, not a human product/UI lane.

- [ ] **Step 3: Verify RED**

```text
npm --prefix src/full-measure test -- --test-name-pattern="post-walk axis candidate session|ordinary transition wiring"
```

Expected: FAIL because candidate-session does not route the policy yet.

- [ ] **Step 4: Route the policy through the existing shared enrichment seam**

Add the explicit branch to `enrichOrdinaryFamily`:

```js
if (context.axisGrammarPolicy === generation.POST_WALK_AXIS_GRAMMAR_POLICY) {
  return generation.attachPostWalkAxisGrammar(sourceFamily, {
    responseWitness: context.responseWitness,
    lyricTrack: context.lyricTrack,
  });
}
```

Preserve the current ordinary topology + L BRANCH body for the absent-policy path.

- [ ] **Step 5: Pass the policy consistently at each genuine birth call site**

Use one context field; do not add operation-specific grammar implementations. GENERATE/MUTATE/CROSS/STOMP/CONVERGE all enter through the same enrichment function when they create a new family.

- [ ] **Step 6: Run focused tests GREEN**

Expected: PASS, including existing ordinary transition tests.

- [ ] **Step 7: Commit**

```text
git add src/full-measure/src/candidate-session.cjs src/full-measure/tests/post-walk-axis-candidate-session.test.cjs src/full-measure/tests/walk-e-ordinary-transition-wiring.test.cjs
git commit -m "feat: route axis grammar through candidate births"
```

### Task 5: Retain axis grammar identity in canonical timeline receipts

**Files:**
- Modify: `src/full-measure/src/render/receipt.cjs`
- Create test: `src/full-measure/tests/post-walk-axis-receipt.test.cjs`
- Test existing: `src/full-measure/tests/topology-candidate-genealogy-receipt.test.cjs`
- Test existing: `src/full-measure/tests/topology-event-receipt.test.cjs`

**Interfaces:**
- Add: `compactAxisGrammarEvidence(timeline)`.
- `promoteTimelineEvidenceInReceipt(receipt, timeline)` adds `canonicalExecution.axisGrammar` only when the accepted timeline contains Stage A semantics.
- Receipt evidence contains exactly:

```js
{
  policyVersion,
  recipeHash,
  response,
  scope,
  consequence,
  sourceFamilyHash,
  topologyPlanSha256,
  mixPlanHash,
}
```

- Candidate genealogy remains a separate evidence object and does not absorb axis/topology authority.

- [ ] **Step 1: Write a failing canonical receipt test**

```js
assert.equal(receipt.canonicalExecution.axisGrammar.recipeHash, timeline.axisGrammar.recipeHash);
assert.equal(receipt.canonicalExecution.axisGrammar.topologyPlanSha256, timeline.topologyEvents.planSha256);
assert.equal(receipt.canonicalExecution.axisGrammar.mixPlanHash, timeline.lBranch.mixPlan.planHash);
```

Also assert response/scope/consequence equal the addressed recipe.

- [ ] **Step 2: Write tamper tests**

A mismatched `recipeHash`, `topologyPlanSha256`, or `mixPlanHash` in timeline binding fails before receipt promotion. A non-Stage-A historical timeline does not acquire `canonicalExecution.axisGrammar`.

- [ ] **Step 3: Verify RED**

```text
npm --prefix src/full-measure test -- --test-name-pattern="post-walk axis receipt|topology event receipt|candidate genealogy receipt"
```

Expected: FAIL only on the new axis receipt obligations.

- [ ] **Step 4: Implement compact promotion**

Validate the axis binding against the accepted timeline before cloning fields into the receipt. Do not duplicate renderer commands, lane knots, or topology parameters in this new block; those remain under existing evidence surfaces.

- [ ] **Step 5: Run receipt tests GREEN**

Expected: PASS, with genealogy/topology separation unchanged.

- [ ] **Step 6: Commit**

```text
git add src/full-measure/src/render/receipt.cjs src/full-measure/tests/post-walk-axis-receipt.test.cjs src/full-measure/tests/topology-candidate-genealogy-receipt.test.cjs src/full-measure/tests/topology-event-receipt.test.cjs
git commit -m "feat: retain axis grammar receipt identity"
```

### Task 6: Add the Stage A negative-control crucible and one exact production render witness harness

**Files:**
- Create test: `src/full-measure/tests/post-walk-axis-grammar-crucible.test.cjs`
- Create: `src/full-measure/scripts/smoke-axis-grammar.cjs`
- Do not modify `src/full-measure/package.json`; invoke the smoke script directly with Node.

**Interfaces:**
- Crucible consumes one frozen evidence fixture and one root seed.
- `smoke-axis-grammar.cjs` uses the same production components as `scripts/smoke-candidates.cjs`: `createCandidateSession`, `inspectAudio`, `renderVideo`, `resolveFfmpeg`, and `runProcess`.
- The smoke creates `test-artifacts/post-walk-axis-smoke.wav` from a 6-second 173 Hz PCM sine, generates one Stage A six-up with root seed `post-walk-axis-smoke-root`, selects candidate index `3`, and renders `test-artifacts/post-walk-axis-winner.mp4` at 640×360, 24 fps, `ultrafast`, CRF 28.
- The only new generation policy injected by the harness is `axisGrammarPolicy: "post-walk-axis-grammar-v1"`.

- [ ] **Step 1: Write the independence crucible**

Machine assertions prove:

1. six recipes are deterministic under the same seed;
2. v2 `oppose` is not equal to `1 - value` for at least one non-boundary knot;
3. the same consequence occurs under both whole and GRAB-local scope;
4. the same scope occurs with both clean-return and residue;
5. GRAB-local sends cite the exact accepted GRAB `regionRef` and event window;
6. clean-return has zero residual vector/stretch while residue has non-zero residual evidence;
7. no recipe silently changes response/scope/consequence after acceptance;
8. replay returns `ok: true` with exact family/timeline/plan hashes;
9. Stage A recipes contain no aperture-shape field, preserving #223 as a descendant rather than a hidden dependency.

- [ ] **Step 2: Write refusal crucible cases**

Assert explicit refusal for:

```text
topology-lock-prohibits-topology-events
required-axis-evidence-unavailable
no-lawful-axis-event-window
```

No refused case may silently return a whole-layer `follow` send.

- [ ] **Step 3: Run crucible RED/GREEN discipline**

```text
npm --prefix src/full-measure test -- --test-name-pattern="post-walk axis grammar crucible"
```

Any RED must be repaired at the exposed seam; do not weaken the negative control.

- [ ] **Step 4: Implement the exact production smoke harness**

Build the fixture exactly as the existing candidate smoke does, changing only frequency/duration/output names and Stage A policy:

```js
await runProcess(resolveFfmpeg(), [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "lavfi", "-i", "sine=frequency=173:duration=6:sample_rate=48000",
  "-c:a", "pcm_s16le", audioPath,
]);
```

Generate with:

```js
const family = await session.generate({
  rootSeed: "post-walk-axis-smoke-root",
  presetId: "wireOrchard",
  title: "POST WALK AXIS SMOKE",
  artist: "The Static Collective",
  lyrics: "",
  toastFeelId: "wire-heat",
  axisGrammarPolicy: "post-walk-axis-grammar-v1",
});
```

Require six PNG previews, select index `3`, then require the selected preview candidate, `session.select(...)`, `executionForRender(...)`, final canonical timeline, and retained receipt to agree on `timelineHash`, `recipeHash`, topology `planSha256`, and L BRANCH `mixPlanHash`.

This is the explicit preview/final semantic-parity proof: the candidate shown in the six-up is the exact accepted semantic object executed by final render.

- [ ] **Step 5: Run the exact production smoke**

```text
node src/full-measure/scripts/smoke-axis-grammar.cjs
```

Expected: six previews are produced; candidate `3` renders through the production renderer; the receipt is accepted; preview/selection/execution/final receipt identities all match exactly.

- [ ] **Step 6: Commit**

```text
git add src/full-measure/tests/post-walk-axis-grammar-crucible.test.cjs src/full-measure/scripts/smoke-axis-grammar.cjs
git commit -m "test: add post-walk axis crucible"
```

### Task 7: Run the complete machine gate and preserve exact proof before human witness

**Files:**
- No product-code changes expected.
- Update Stage A PR/issue evidence only after the exact head is green.

**Interfaces:**
- The exact Stage A head is the unit of machine testimony.
- Machine green does not imply human perceptual calibration or landing approval.

- [ ] **Step 1: Run all Full Measure tests**

```text
npm --prefix src/full-measure test
```

Expected: all tests pass, including pre-existing WALK/topology/L BRANCH/receipt suites and all new Stage A suites.

- [ ] **Step 2: Run repository verification**

```text
npm run verify
```

Expected: repository-owned check + test + smoke gate passes.

- [ ] **Step 3: Run standard and Stage A production smoke plus runtime audit**

```text
npm --prefix src/full-measure run smoke
node src/full-measure/scripts/smoke-axis-grammar.cjs
npm --prefix src/full-measure audit --omit=dev --audit-level=high
```

Expected: both smoke paths pass and production audit reports no vulnerability at or above the repository gate.

- [ ] **Step 4: Run canonical renderer witness comparison through the repository-owned workflow**

Use the same canonical renderer workflow/gate already used by WALK. Do not invent a local substitute.

- [ ] **Step 5: Record exact machine testimony**

Record:

```text
exact head SHA
exact tree SHA
workflow/run id
Full Measure test count
crucible result
standard smoke result
Stage A smoke result
runtime audit result
canonical renderer witness result
axis production-render recipeHash
topology planSha256
L BRANCH mixPlanHash
final timelineHash
```

Do not claim human distinguishability from these machine results.

- [ ] **Step 6: Stop at the Stage A machine boundary**

The next receipt is a human six-up witness of the same fixed evidence family. The human question is narrow:

```text
Can the same thing visibly matter to different creatures
in different ways, in different places,
and leave different lawful consequences?
```

SPEAK/APERTURE calibration, Video Digestion, MADDCL0WN, and human-hands work remain outside this implementation plan.

---

## Implementation order compression

```text
accepted post-WALK base
  ↓
version L BRANCH response semantics without rewriting v1
  ↓
address six balanced axis recipes
  ↓
compose recipe → GRAB consequence → v2 response/scope
  ↓
route one internal Stage A policy through all genuine births
  ↓
retain exact recipe identity in receipts
  ↓
negative-control crucible + exact preview/final production smoke
  ↓
full machine gate
  ↓
STOP for human Stage A witness
```

The implementation is successful only if the Toaster gains combinatorial gait from organs it already possessed. If passing the proof requires a new effect family, renderer-local choice, silent fallback, aperture-shape dependency, or rewriting historical v1 behavior, the implementation has violated the design and must refuse or be redesigned.