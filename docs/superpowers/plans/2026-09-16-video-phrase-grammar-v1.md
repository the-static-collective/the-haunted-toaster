# Video Phrase Grammar v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two rigid Video dropdowns with deterministic candidate-owned multi-phrase video composition while preserving #277’s proven primitives, replay, KEEP law, and preview/final parity.

**Architecture:** Add a pure `VideoPhrasePlan v1` planner/validator/hash boundary, then teach the existing foreign-material compiler to lower accepted phrase schedules using the already-proven texture/topology/motion primitives. Candidate generation owns the plan; the ordinary UI only admits/removes material and displays descriptive evidence.

**Tech Stack:** Node.js/CommonJS, Electron IPC/preload, deterministic candidate session, FFmpeg filter graphs, Node test runner, Playwright browser witness, existing Full Measure smoke/package workflows.

**Spec:** `docs/superpowers/specs/2026-09-16-video-phrase-grammar-v1-design.md`

## Global Constraints

- Carrier starts from PR #277 head `fdaf32616148b1463a68f77055e2653307ea2852`; do not rebuild the proven 3×3 primitives from `main`.
- No production code before a failing test is witnessed for that behavior.
- Same admitted evidence + same generation seed + same phrase policy version must produce the same canonical plan and hash.
- Video phrasing is candidate-owned creative data; admission is material availability only.
- Remove ordinary digestion/timing selectors; do not replace them with new top-level mode dropdowns or a human spectrum slider.
- Preserve exact source ancestry, KEEP invalidation, preview/final shared planning, and receipt attribution.
- Unknown/invalid phrase data refuses; no silent fallback to legacy loop.
- v1 is single-source and bounded; richer time/spatial topology, Context Table evidence, HyperFood bridges, and multi-video composition remain named post-proof expansions in the spec.

---

### Task 1: Pure VideoPhrasePlan v1 contract

**Files:**
- Create: `src/full-measure/src/render/video-phrase-plan.cjs`
- Create: `src/full-measure/tests/video-phrase-plan.test.cjs`

**Interfaces:**
- Consumes: admitted Video binding (`specimenId`, `sourceSha256`, `byteLength`, `probe`), resolved timeline (`durationTicks`, `timebase`), explicit deterministic seed string.
- Produces: `createVideoPhrasePlan({ videoBinding, timeline, seed })`, `normalizeVideoPhrasePlan(plan)`, `hashVideoPhrasePlan(plan)`, constants for schema/policy/bounds.

- [ ] **Step 1: Write RED replay/schema test**

Add a test requiring `createVideoPhrasePlan()` to return schema `haunted-toaster/video-phrase-plan/v1`, source identity, bounded `spectrum`, at least one phrase, and the same `planHash` for the same source/timeline/seed even when the source path/filename changes.

```js
const a = createVideoPhrasePlan({ videoBinding: binding({ path: "/a.mp4" }), timeline, seed: "candidate-A" });
const b = createVideoPhrasePlan({ videoBinding: binding({ path: "/moved.mp4" }), timeline, seed: "candidate-A" });
assert.equal(a.planHash, b.planHash);
assert.deepEqual(a.phrases, b.phrases);
assert.equal(a.schema, "haunted-toaster/video-phrase-plan/v1");
```

- [ ] **Step 2: Run focused test and witness RED**

Run:

```bash
node --test src/full-measure/tests/video-phrase-plan.test.cjs
```

Expected: fail because `../src/render/video-phrase-plan.cjs` does not exist.

- [ ] **Step 3: Implement minimal deterministic canonical planner**

Implement SHA-256 seeded deterministic sampling with no ambient randomness. Normalize timeline ticks, source duration, source windows, phrase ids, digestion operator ids, transforms, traversal, cycles, playback rate, and release. Exclude path/filename from canonical hash identity.

Initial hard bounds:

```js
MAX_PHRASES = 6
MAX_OVERLAPS = 2
MAX_CYCLES = 4
ROTATIONS = [0, 90, 180, 270]
TRAVERSALS = ["forward", "reverse", "ping-pong"]
DIGEST_OPERATORS = [
  "clip-luma-texture-v1",
  "clip-luma-mask-v1",
  "clip-motion-mask-v1",
]
```

Use deterministic `spectrum` in `[0,1]` derived from the seed and source/timeline identity. Let it influence phrase count/fragmentation/mixing while remaining receipt-visible.

- [ ] **Step 4: GREEN replay test**

Run the focused test. Expected: PASS.

- [ ] **Step 5: Write RED validation/refusal tests**

Require refusal for:

- empty/negative phrase spans;
- source windows outside source duration;
- cycles above `MAX_CYCLES`;
- unknown digestion operator;
- rotations outside the v1 set;
- NaN/Infinity values;
- phrase count above limit;
- overlap depth above limit.

- [ ] **Step 6: Implement strict normalizer and GREEN**

Reject invalid input with explicit `TypeError`/`RangeError`; do not clamp structural invalidity silently. Run focused tests until PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/full-measure/src/render/video-phrase-plan.cjs src/full-measure/tests/video-phrase-plan.test.cjs
git commit -m "feat: add deterministic video phrase plan v1"
```

---

### Task 2: Historical #277 behaviors become compatibility phrase specimens

**Files:**
- Modify: `src/full-measure/src/render/video-phrase-plan.cjs`
- Modify: `src/full-measure/tests/video-phrase-plan.test.cjs`
- Test alongside: `src/full-measure/tests/video-phrasing.test.cjs`

**Interfaces:**
- Produces: `phrasePlanForLegacyBinding({ videoBinding, timeline })` or equivalent explicit compatibility lowering used only for ancestry/tests/migration.

- [ ] **Step 1: Write RED ancestry tests**

For each #277 timing policy, require an equivalent single-phrase representation:

- `loop-source-clip-v1` → forward full-source traversal with bounded recurrence covering song;
- `play-source-once-v1` → source-rate forward phrase then `release: "native"`;
- `stretch-source-clip-v1` → one forward full-source phrase retimed to the accepted render span.

The existing digestion operator id must map unchanged into the phrase digestion list.

- [ ] **Step 2: Run RED**

Run both phrase-plan and existing video-phrasing tests. Expected: new ancestry tests fail only on missing compatibility lowering.

- [ ] **Step 3: Implement compatibility lowering**

Keep historical policy ids in provenance metadata but produce normalized v1 phrase semantics. Do not delete existing #277 constants/compiler paths yet.

- [ ] **Step 4: Run GREEN**

Expected: new ancestry tests PASS and all existing 3×3 tests remain PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/full-measure/src/render/video-phrase-plan.cjs src/full-measure/tests/video-phrase-plan.test.cjs
git commit -m "test: preserve video phrasing ancestry in phrase grammar"
```

---

### Task 3: FFmpeg phrase compiler — source-time maps and transforms

**Files:**
- Modify: `src/full-measure/src/render/foreign-material.cjs`
- Create: `src/full-measure/tests/video-phrase-compiler.test.cjs`
- Keep existing: `src/full-measure/tests/video-phrasing.test.cjs`

**Interfaces:**
- Consumes: normalized accepted `VideoPhrasePlan v1`.
- Produces: shared FFmpeg graph/input args plus compiler evidence containing `videoPhrasePlanHash` and phrase summaries.

- [ ] **Step 1: RED real-FFmpeg forward/reverse/ping-pong tests**

Create a synthetic source with time-distinguishable frames. Require three phrase plans to produce measurably distinct frame order:

```text
forward:   A B C D
reverse:   D C B A
ping-pong: A B C D C B A
```

Use decoded pixel samples/timestamps, not filter-string assertions alone.

- [ ] **Step 2: Witness RED**

Run:

```bash
node --test src/full-measure/tests/video-phrase-compiler.test.cjs
```

Expected: fail because existing compiler accepts only one whole-song sampling policy.

- [ ] **Step 3: Add phrase-local source-time lowering**

Extend `foreign-material.cjs` so an accepted phrase can lower source window, traversal, cycles/rate, start/end placement, and native release into deterministic FFmpeg filters. Keep input decoding finite where possible; no hidden infinite loop for plans that explicitly release.

- [ ] **Step 4: GREEN source-time tests**

All forward/reverse/ping-pong tests PASS; output duration remains the full song duration.

- [ ] **Step 5: RED transform tests**

Require deterministic pixel-visible differences for:

- horizontal mirror;
- vertical mirror;
- 90° rotation;
- bounded crop/zoom.

Also require identity transform to preserve the untransformed phrase path.

- [ ] **Step 6: Implement transforms and GREEN**

Apply transforms before digestion where required by operator semantics, with explicit normalized order. Do not add arbitrary affine/perspective behavior.

- [ ] **Step 7: RED mixed-digestion / multi-phrase test**

One plan must contain at least three phrase spans and at least two of the existing digestion atoms. Require the compiler evidence to enumerate phrase ids/operators and the final render to retain complete audio/video duration.

- [ ] **Step 8: Implement phrase composition and GREEN**

Reuse existing texture/topology/motion compiler bodies as primitives rather than duplicating their algorithms. Preserve native composition outside phrase spans.

- [ ] **Step 9: Run old + new FFmpeg suite**

```bash
node --test \
  src/full-measure/tests/video-phrasing.test.cjs \
  src/full-measure/tests/video-phrase-plan.test.cjs \
  src/full-measure/tests/video-phrase-compiler.test.cjs
```

Expected: PASS.

- [ ] **Step 10: Commit Task 3**

```bash
git add src/full-measure/src/render/foreign-material.cjs src/full-measure/tests/video-phrase-compiler.test.cjs
git commit -m "feat: compile video phrase schedules"
```

---

### Task 4: Candidate-owned planning and KEEP law

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Modify or extend: `src/full-measure/tests/video-digestion-human-bridge.test.cjs`
- Create if clearer: `src/full-measure/tests/video-phrase-candidate.test.cjs`

**Interfaces:**
- Candidate derivation owns `videoPhrasePlan` / `videoPhrasePlanHash`.
- Admitted Video binding no longer needs user-selected `digestOperatorId` / `samplingPolicyId` as ordinary generation inputs.

- [ ] **Step 1: RED six-candidate ownership test**

Admit one Video specimen, generate a six-up family with a known generation seed, and require each candidate to carry a valid phrase plan derived from source/timeline/candidate identity. At least two candidates in the deterministic fixture must have different `videoPhrasePlanHash` values.

- [ ] **Step 2: Witness RED**

Expected: current candidates share the global Video binding settings and have no candidate-owned phrase plan.

- [ ] **Step 3: Wire planner into candidate derivation**

Derive an explicit phrase seed from existing candidate/family deterministic identity. Do not call `Math.random()` or wall-clock time. Bind the accepted plan into the same candidate data that preview and KEEP/render handoff consume.

- [ ] **Step 4: GREEN candidate ownership test**

Same family seed replays the same six phrase-plan hashes in order.

- [ ] **Step 5: RED KEEP invalidation tests**

Require:

- KEEP remains valid while exact source + accepted candidate plan identity is unchanged;
- clearing/replacing Video source revokes stale KEEP;
- regenerating/selecting a different candidate plan requires a new KEEP;
- descriptive UI changes do not change plan identity.

- [ ] **Step 6: Implement KEEP comparison on source + phrase-plan identity**

Replace global operator/sampling comparison with exact accepted plan identity where appropriate. Keep source specimen identity as an independent requirement.

- [ ] **Step 7: GREEN and commit**

```bash
git add src/full-measure/src/candidate-session.cjs src/full-measure/tests/video-digestion-human-bridge.test.cjs src/full-measure/tests/video-phrase-candidate.test.cjs
git commit -m "feat: make video phrasing candidate-owned"
```

---

### Task 5: Remove the two dropdowns and make UI observational

**Files:**
- Modify: `src/full-measure/src/renderer/video-source-ui.js`
- Modify: `src/full-measure/src/preload.cjs`
- Modify: `src/full-measure/src/video-pantry/electron-ipc.cjs`
- Modify: `src/full-measure/src/renderer/beta-home-ui.css` only if needed after selector removal
- Modify: `src/full-measure/tests/ui-witness.spec.cjs`
- Modify: `src/full-measure/tests/video-phrase-stamp.test.cjs`

**Interfaces:**
- UI admits/removes video only.
- Candidate result/status may expose descriptive phrase stamp; no editing IPC for digestion/timing remains on ordinary surface.

- [ ] **Step 1: RED UI contract**

Update browser/DOM tests to require:

```js
assert.equal(document.querySelector("#videoDigestOperator"), null);
assert.equal(document.querySelector("#videoSamplingPolicy"), null);
```

After generation/selection, require a descriptive status containing phrase count and candidate-owned wording, sourced from accepted candidate evidence rather than mutable UI state.

- [ ] **Step 2: Witness RED**

Expected: both selectors still exist.

- [ ] **Step 3: Remove selector markup/listeners and ordinary mutation IPC exposure**

Delete the selector controls, `setVideoDigestOperator`, and `setVideoSamplingPolicy` from ordinary renderer/preload wiring unless a compatibility-only internal test path still genuinely requires them. If retained internally, they must not be reachable from ordinary BETA UI.

- [ ] **Step 4: Add observational phrase stamp**

Format from accepted candidate plan summary, e.g.:

```text
Video phrase · 4 movements · texture/motion · reverse + mirror · candidate-owned
```

Do not make the stamp editable.

- [ ] **Step 5: GREEN UI/browser tests**

Run focused DOM + Playwright witness. Inspect screenshot for row readability after removing selector width/wrapping complexity.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/full-measure/src/renderer/video-source-ui.js src/full-measure/src/preload.cjs src/full-measure/src/video-pantry/electron-ipc.cjs src/full-measure/src/renderer/beta-home-ui.css src/full-measure/tests/ui-witness.spec.cjs src/full-measure/tests/video-phrase-stamp.test.cjs
git commit -m "feat: let toaster own video phrasing"
```

---

### Task 6: Receipt evidence and preview/final parity

**Files:**
- Modify receipt/compiler evidence path in `src/full-measure/src/render/foreign-material.cjs`
- Modify candidate/render receipt integration at the existing receipt owner discovered during implementation
- Create/extend focused receipt tests near existing Video receipt tests

**Interfaces:**
- Produces compact receipt evidence with source identity, spectrum, phrase count, plan hash, phrase spans/windows/traversals/operators/transforms/releases, compiler policy.

- [ ] **Step 1: RED receipt test**

Require accepted render evidence to contain `videoPhrasePlanHash` and normalized phrase summaries, and prohibit reliance on raw source path for canonical identity.

- [ ] **Step 2: GREEN receipt wiring**

Carry the exact accepted candidate plan through preview and final render; do not regenerate the plan at render time.

- [ ] **Step 3: RED preview/final parity test**

For one deterministic candidate, require preview and final compiler evidence to reference the same `videoPhrasePlanHash` and phrase ids/order.

- [ ] **Step 4: GREEN parity**

Fix any separate-preview planning path so both projections consume the accepted plan.

- [ ] **Step 5: Commit Task 6**

```bash
git add src/full-measure/src/render/foreign-material.cjs src/full-measure/tests
git commit -m "feat: receipt video phrase plans"
```

---

### Task 7: Full proof, packaged mutant, and field guide

**Files:**
- Modify: `docs/VIDEO_PHRASING_BETA_TEST.md`
- Add a bounded reconciliation/proof receipt under the repository’s existing reconciliation/docs convention if required by current project law.

**Interfaces:**
- Produces a testable Windows mutant identified by exact commit/build provenance; no tag/release implied.

- [ ] **Step 1: Rewrite test guide around grammar rather than 3×3 menus**

Human field checks must include:

- short source vs long song;
- obvious directional movement for reverse/ping-pong detection;
- text/asymmetric footage for mirror/rotation detection;
- source with still intervals for motion-mask sanity;
- preview vs final at matching song times;
- KEEP then source change/regenerate behavior;
- receipt plan hash/phrase summary inspection.

- [ ] **Step 2: Run consolidated local proof**

Run repository syntax/check command, all deterministic tests, full render smoke, six-up winner smoke, and runtime dependency audit using the existing #277 workflow commands.

Expected: all PASS with no baseline rewrite used to hide a UI failure.

- [ ] **Step 3: Run browser witness**

Confirm selectors are absent and admitted Video row remains readable.

- [ ] **Step 4: Push exact head and let PR CI build Windows installer + portable mutant**

Record exact head SHA, workflow run, package artifact id, package digest, smoke artifact digest, and UI witness digest.

- [ ] **Step 5: Packaged field witness**

Use real footage and record whether the render demonstrates non-rigid phrase behavior: multiple entries/exits, at least one time-direction mutation, and at least one spatial/digestion change that feels compositionally useful.

Do not call the mutation proven until this human witness reports no concrete blocker.

- [ ] **Step 6: Record expansion frontier, not expansion implementation**

In the final proof receipt link back to the design’s post-proof expansion sections:

- richer time topology;
- richer spatial topology;
- composable digestion organisms;
- evidence-responsive phrasing;
- multi-video composition;
- learned taste with explicit evidence boundaries.

State explicitly that these are next-step candidates, not behavior authorized by v1 proof.

- [ ] **Step 7: Final verification commit**

```bash
git add docs/VIDEO_PHRASING_BETA_TEST.md docs
git commit -m "docs: record video phrase grammar mutant proof"
```

## Self-review receipt

- Spec coverage: planner, strict refusal, #277 ancestry, source-time topology, spatial transforms, mixed digestion, candidate ownership, KEEP law, UI removal, receipts, preview/final parity, packaged witness, and expansion frontier all have explicit tasks.
- Placeholder scan: no TBD/TODO steps; implementation details are bounded to named APIs and tests.
- Type consistency: `VideoPhrasePlan v1`, `videoPhrasePlanHash`, `spectrum`, `phrases`, source identity, and phrase-local fields use the same names across planner, candidate, compiler, receipt, and UI tasks.
- Scope: single-source v1 only. Multi-source and richer topology remain a separate post-proof frontier.
