# Haunted Toaster BETA Spine Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one current-main-first integration ancestor that preserves landed Video/VSPantry and memory foundations while porting the proven alpha.9/Track-0 runtime capabilities through current contracts.

**Architecture:** Work from `beta/spine-integration`, which was cut from current `main`. Treat divergent alpha.9 branches only as source material: import existing regression tests first, observe RED, then port the minimum compatible implementation. Reconcile overlapping current-main seams manually instead of replacing whole historical files.

**Tech Stack:** Node.js 24-compatible CommonJS, Electron 43, ffmpeg-static/ffprobe-static, node:test, Playwright browser witness, electron-builder.

**Spec:** `docs/superpowers/specs/2026-08-18-beta-spine-integration-design.md`

## Global Constraints

- Current `main` is product authority; never merge a divergent historical branch wholesale.
- Preserve current-main Video/VSPantry, receipt-memory, invalid-preset refusal, lyric timing, cancellation, preview/render parity, and provenance behavior.
- Preserve accepted `VisualScore -> ResolvedTimeline -> production preview -> production render -> receipt` authority.
- Historical raster/profile semantics remain compatible and explicitly versioned.
- Do not enable #147 candidate ecology, BETA Home capability flags, Frame Motion execution, YouTube publishing, or HAUNT sibling-memory consumption in this plan.
- No tag, release, main merge, or artifact promotion is authorized.
- Every behavior port uses RED -> GREEN evidence before proceeding.

---

### Task 1: Establish the alpha.9 semantic-core regression boundary

**Files:**
- Create from historical test evidence: `src/full-measure/tests/alpha9-mutation-lattice.test.cjs`
- Create from historical test evidence: `src/full-measure/tests/alpha9-evidence-proof.test.cjs`
- Create from historical test evidence: `src/full-measure/tests/converge-session-contract.test.cjs`
- Modify only after RED: `src/full-measure/src/generation/index.cjs`
- Create after RED: `src/full-measure/src/generation/mutation-lattice-generation.cjs`
- Create after RED: `src/full-measure/src/generation/topology-arc.cjs`
- Create after RED: `src/full-measure/profiles/toaster-raster-4.json`
- Create after RED: `src/full-measure/constraints/open-field.v3.json`
- Create after RED: `src/full-measure/constraints/porchlight.v3.json`
- Create after RED: `src/full-measure/constraints/wire-orchard.v3.json`
- Create after RED: `src/full-measure/constraints/absolute-residual.v3.json`
- Reconcile after RED: `src/full-measure/src/candidate-session.cjs`
- Reconcile after RED: `src/full-measure/src/build-capabilities.cjs`

**Interfaces:**
- Consumes: current-main `createCandidateSession()` including Video binding/session invalidation.
- Produces: raster-4/visual-language-v3 candidate generation, Mutation Lattice evidence, Topology Arc evidence, and current-main-compatible capability identity.

- [ ] **Step 1: Fetch the authoritative source branches locally**

```bash
git fetch origin main agent/alpha9-recovery fix/alpha9-range-calibration feat/elastic-topology-response-v1 fix/track0-bound-response-contour fix/track0-durable-listener-draft
git status --short --branch
```

Expected: integration branch is clean and based on current `main`.

- [ ] **Step 2: Import only the three semantic-core regression tests from the alpha.9 recovery head**

```bash
git show 3b87ed0070f5ccd59881fed81a7cccc7922665e3:src/full-measure/tests/alpha9-mutation-lattice.test.cjs > src/full-measure/tests/alpha9-mutation-lattice.test.cjs
git show 3b87ed0070f5ccd59881fed81a7cccc7922665e3:src/full-measure/tests/alpha9-evidence-proof.test.cjs > src/full-measure/tests/alpha9-evidence-proof.test.cjs
git show 3b87ed0070f5ccd59881fed81a7cccc7922665e3:src/full-measure/tests/converge-session-contract.test.cjs > src/full-measure/tests/converge-session-contract.test.cjs
```

- [ ] **Step 3: Run the imported tests and verify RED**

```bash
cd src/full-measure
node --test tests/alpha9-mutation-lattice.test.cjs tests/alpha9-evidence-proof.test.cjs tests/converge-session-contract.test.cjs
```

Expected: failures identifying absent raster-4 / Mutation Lattice / Topology Arc contracts on current main. A syntax/import failure unrelated to the missing feature must be repaired before continuing.

- [ ] **Step 4: Port new semantic-core files from the proven alpha.9 head**

```bash
git show 3b87ed0070f5ccd59881fed81a7cccc7922665e3:src/full-measure/src/generation/mutation-lattice-generation.cjs > src/full-measure/src/generation/mutation-lattice-generation.cjs
git show 3b87ed0070f5ccd59881fed81a7cccc7922665e3:src/full-measure/src/generation/topology-arc.cjs > src/full-measure/src/generation/topology-arc.cjs
git show 3b87ed0070f5ccd59881fed81a7cccc7922665e3:src/full-measure/profiles/toaster-raster-4.json > src/full-measure/profiles/toaster-raster-4.json
for f in open-field porchlight wire-orchard absolute-residual; do git show 3b87ed0070f5ccd59881fed81a7cccc7922665e3:src/full-measure/constraints/$f.v3.json > src/full-measure/constraints/$f.v3.json; done
```

- [ ] **Step 5: Reconcile generation/index, candidate-session, and build-capabilities against current main**

Use current-main files as the base. Add only the raster-4 generation exports/session path required by the imported tests. Preserve these current-main lines of behavior mechanically:

```text
candidate-session.cjs:
  registerVideoPantryIpc import remains
  video state remains in state()
  noteVideo()/clearVideo() remain
  Video changes still invalidate candidates
  materialize/generate do not push Video into executionForRender()

build-capabilities.cjs:
  capability claims remain derived from active profile/registries
```

Inspect the historical patch rather than replacing these files:

```bash
git diff d23e70162cfa18d07cafe97976b5fca582d6ed05..3b87ed0070f5ccd59881fed81a7cccc7922665e3 -- src/full-measure/src/generation/index.cjs src/full-measure/src/candidate-session.cjs src/full-measure/src/build-capabilities.cjs
```

- [ ] **Step 6: Run semantic-core tests GREEN plus current Video/VSPantry tests**

```bash
cd src/full-measure
node --test tests/alpha9-mutation-lattice.test.cjs tests/alpha9-evidence-proof.test.cjs tests/converge-session-contract.test.cjs tests/video-pantry.test.cjs tests/video-pantry-ui.test.cjs
```

Expected: all selected tests pass.

- [ ] **Step 7: Commit the semantic-core port**

```bash
git add src/full-measure
 git commit -m "feat: port alpha9 semantic core onto current main"
```

---

### Task 2: Port calibrated raster-4 visual identity without restoring alpha-era UI state

**Files:**
- Create/import test: `src/full-measure/tests/alpha9-range-calibration.test.cjs`
- Modify: `src/full-measure/tests/alpha9-render-proof.test.cjs`
- Modify: `src/full-measure/tests/internal-response.test.cjs`
- Modify: `src/full-measure/src/generation/mutation-lattice-generation.cjs`
- Modify/create as required: `src/full-measure/src/generation/stomp-generation.cjs`
- Modify: `src/full-measure/src/render/atmosphere.cjs`
- Modify: `src/full-measure/src/render/candidate-preview.cjs`
- Modify/create: `src/full-measure/src/render/response-shaping.cjs`
- Modify: `src/full-measure/src/render/topology-compilers.cjs`

**Interfaces:**
- Consumes: Task 1 raster-4 candidate semantics.
- Produces: base-identity-visible six-up, distinct Cathedral Fan/Echo Tunnel behavior, v3 headroom response, STOMP intensity contour.

- [ ] **Step 1: Import the calibration tests first**

```bash
git show bfb837ad74084bd2e55fe91f3a6a0df4fe70d4d3:src/full-measure/tests/alpha9-range-calibration.test.cjs > src/full-measure/tests/alpha9-range-calibration.test.cjs
git show bfb837ad74084bd2e55fe91f3a6a0df4fe70d4d3:src/full-measure/tests/internal-response.test.cjs > /tmp/internal-response.alpha9.test.cjs
```

Merge only the new v3 assertions from the temporary file into current-main `tests/internal-response.test.cjs`; retain newer current-main assertions.

- [ ] **Step 2: Verify RED**

```bash
cd src/full-measure
node --test tests/alpha9-range-calibration.test.cjs tests/internal-response.test.cjs
```

Expected: v3 calibration/identity assertions fail before production changes.

- [ ] **Step 3: Port the calibration implementation at the named seams**

```bash
git diff 3b87ed0070f5ccd59881fed81a7cccc7922665e3..bfb837ad74084bd2e55fe91f3a6a0df4fe70d4d3 -- src/full-measure/src/generation/mutation-lattice-generation.cjs src/full-measure/src/generation/stomp-generation.cjs src/full-measure/src/render/atmosphere.cjs src/full-measure/src/render/candidate-preview.cjs src/full-measure/src/render/response-shaping.cjs src/full-measure/src/render/topology-compilers.cjs
```

Apply the semantic changes only. Do not import historical browser/UI baselines wholesale.

- [ ] **Step 4: Verify GREEN with render proof**

```bash
cd src/full-measure
node --test tests/alpha9-range-calibration.test.cjs tests/internal-response.test.cjs tests/alpha9-render-proof.test.cjs
npm run smoke
```

Expected: tests and smoke exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure
 git commit -m "fix: port alpha9 creative range calibration"
```

---

### Task 3: Port Elastic Topology Response as canonical raster-4 timeline evidence

**Files:**
- Create tests: `src/full-measure/tests/nested-response-contour.test.cjs`
- Create tests: `src/full-measure/tests/nested-response-replay.test.cjs`
- Create tests: `src/full-measure/tests/topology-response.test.cjs`
- Create tests: `src/full-measure/tests/topology-response-compiler.test.cjs`
- Create tests: `src/full-measure/tests/topology-response-evidence.test.cjs`
- Create: `src/full-measure/src/generation/nested-response-generation.cjs`
- Create: `src/full-measure/src/generation/nested-response.cjs`
- Create: `src/full-measure/src/render/topology-response.cjs`
- Create/reconcile: `src/full-measure/src/render/render-base.cjs`
- Create/reconcile: `src/full-measure/src/render/timeline-filter-base.cjs`
- Modify: `src/full-measure/src/candidate-session.cjs`
- Modify: `src/full-measure/src/render/primitive-field.cjs`
- Modify: `src/full-measure/src/render/timeline-filter.cjs`
- Modify: `src/full-measure/src/render/topology-compilers.cjs`
- Modify: `src/full-measure/src/render/receipt.cjs`
- Modify: `src/full-measure/src/render/render-failure-evidence.cjs`
- Create: `src/full-measure/src/render/visual-compiler-evidence.cjs`

**Interfaces:**
- Consumes: current measured media analysis + raster-4 timeline resolution.
- Produces: deterministic `response-witness-v1`, `nested-response-contour-v1`, `elastic-topology-response-v1`, compact compiler/receipt evidence.

- [ ] **Step 1: Import the focused response tests from PR #146 head**

```bash
for f in nested-response-contour nested-response-replay topology-response topology-response-compiler topology-response-evidence; do git show 944169c7f7bbd821f51fa8e404302cbaa8f4a342:src/full-measure/tests/$f.test.cjs > src/full-measure/tests/$f.test.cjs; done
```

- [ ] **Step 2: Verify RED**

```bash
cd src/full-measure
node --test tests/nested-response-contour.test.cjs tests/nested-response-replay.test.cjs tests/topology-response.test.cjs tests/topology-response-compiler.test.cjs tests/topology-response-evidence.test.cjs
```

Expected: missing nested/topology response APIs or evidence.

- [ ] **Step 3: Port new pure modules exactly, then reconcile overlapping runtime seams**

```bash
for f in src/full-measure/src/generation/nested-response-generation.cjs src/full-measure/src/generation/nested-response.cjs src/full-measure/src/render/topology-response.cjs src/full-measure/src/render/visual-compiler-evidence.cjs; do git show 944169c7f7bbd821f51fa8e404302cbaa8f4a342:$f > $f; done
```

For `candidate-session.cjs`, `primitive-field.cjs`, `timeline-filter.cjs`, `topology-compilers.cjs`, `receipt.cjs`, and `render-failure-evidence.cjs`, apply the #146 semantic diff onto the Task-2 current-main-derived files. Preserve Video/VSPantry and current receipt-memory seams.

- [ ] **Step 4: Verify GREEN and real render smoke**

```bash
cd src/full-measure
node --test tests/nested-response-contour.test.cjs tests/nested-response-replay.test.cjs tests/topology-response.test.cjs tests/topology-response-compiler.test.cjs tests/topology-response-evidence.test.cjs
npm run smoke
```

- [ ] **Step 5: Commit**

```bash
git add src/full-measure
 git commit -m "feat: port elastic topology response onto beta spine"
```

---

### Task 4: Bound long nested-response compilation and preserve Listener human timing drafts

**Files:**
- Modify test: `src/full-measure/tests/nested-response-contour.test.cjs`
- Modify test: `src/full-measure/tests/anchor-guided-renderer-contract.test.cjs`
- Modify test: `src/full-measure/tests/alpha9-render-proof.test.cjs`
- Modify: `src/full-measure/src/generation/nested-response.cjs`
- Reconcile: `src/full-measure/src/renderer/app.js`
- Reconcile: `src/full-measure/src/renderer/lyric-foundry-ui.js`

**Interfaces:**
- Consumes: Task 3 response plan and current-main Listener/Video-aware renderer UI.
- Produces: bounded accepted contour (max 48 knots) and durable in-progress Listener alignment with explicit Re-listen semantics.

- [ ] **Step 1: Import the compaction assertions from #154 and Listener assertions from #155 before production changes**

```bash
git show 5f60c78807104e66de289ef677c12abf3604bd1c:src/full-measure/tests/nested-response-contour.test.cjs > /tmp/nested-response.compacted.test.cjs
git show 2a063454e8eb46fdf62d1ee435a8ad84be50e633:src/full-measure/tests/anchor-guided-renderer-contract.test.cjs > /tmp/anchor-guided.track0.test.cjs
```

Merge only the new compaction and close/reopen/Re-listen assertions into the current integration tests.

- [ ] **Step 2: Verify RED**

```bash
cd src/full-measure
node --test tests/nested-response-contour.test.cjs tests/anchor-guided-renderer-contract.test.cjs
```

Expected: long contour remains unbounded and/or close->reopen launches/replaces alignment before the repair.

- [ ] **Step 3: Port the bounded contour implementation**

```bash
git diff 944169c7f7bbd821f51fa8e404302cbaa8f4a342..5f60c78807104e66de289ef677c12abf3604bd1c -- src/full-measure/src/generation/nested-response.cjs
```

Apply the compaction policy preserving endpoints, section coverage, extrema, interpolation-error selection, and max accepted knot count 48.

- [ ] **Step 4: Reconcile Listener durability onto current-main app state**

```bash
git diff 5f60c78807104e66de289ef677c12abf3604bd1c..2a063454e8eb46fdf62d1ee435a8ad84be50e633 -- src/full-measure/src/renderer/app.js src/full-measure/src/renderer/lyric-foundry-ui.js
```

Port only these semantics:

```text
ordinary Listen Closer + existing same-source alignment -> reopen existing editor
explicit Re-listen -> fresh machine pass
human anchors -> staged/preserved exactly
manual lyric-source replacement -> invalidate stale draft
new audio source -> invalidate stale draft
close Listener -> never clear alignment
```

Preserve current-main Video/VSPantry UI and any newer source controls.

- [ ] **Step 5: Verify GREEN with the production-like parser regression**

```bash
cd src/full-measure
node --test tests/nested-response-contour.test.cjs tests/anchor-guided-renderer-contract.test.cjs tests/alpha9-render-proof.test.cjs
npm run smoke
```

- [ ] **Step 6: Commit**

```bash
git add src/full-measure
 git commit -m "fix: preserve track0 renderer and listener trust repairs"
```

---

### Task 5: Add renderer-safe beta foundations only after core convergence

**Files:**
- Port from PR #173: `src/full-measure/src/video-pantry/frame-reservoir.cjs`
- Port from PR #173: `src/full-measure/tests/frame-reservoir-identity.test.cjs`
- Reconcile from PR #173: `src/full-measure/tests/video-pantry.test.cjs`
- Port from PR #170: Creative Context Table / Influence Diet contract files and their tests exactly as listed in PR #170.

**Interfaces:**
- Consumes: landed Video/VSPantry and memory foundations.
- Produces: deterministic frame address reservoir and typed context/influence contracts without changing render execution or ordinary six-up composition.

- [ ] **Step 1: Import #173 tests first and verify RED**

```bash
git show 00fc6712f939b62a337ba9d89918ae803f01bb85:src/full-measure/tests/frame-reservoir-identity.test.cjs > src/full-measure/tests/frame-reservoir-identity.test.cjs
cd src/full-measure
node --test tests/frame-reservoir-identity.test.cjs
```

Expected: missing Frame Reservoir module.

- [ ] **Step 2: Port #173 implementation and verify GREEN**

```bash
git show 00fc6712f939b62a337ba9d89918ae803f01bb85:src/full-measure/src/video-pantry/frame-reservoir.cjs > src/full-measure/src/video-pantry/frame-reservoir.cjs
node --test tests/frame-reservoir-identity.test.cjs tests/video-pantry.test.cjs
```

- [ ] **Step 3: Import #170 contract tests first and verify RED**

Discover the exact #170 test paths from the PR patch, then materialize them from head `a751ec76435ec980bf49458e5a86e3089ae4647f` before copying production modules. Run those exact tests and require failures due to missing Table/Diet/provider APIs.

```bash
git diff --name-only d23e70162cfa18d07cafe97976b5fca582d6ed05..a751ec76435ec980bf49458e5a86e3089ae4647f | grep '^src/full-measure/tests/'
```

- [ ] **Step 4: Port only #170 contract/provider files and verify GREEN**

```bash
git diff --name-only d23e70162cfa18d07cafe97976b5fca582d6ed05..a751ec76435ec980bf49458e5a86e3089ae4647f | grep '^src/full-measure/src/'
```

Materialize those production files from the exact #170 head, then rerun the exact #170 tests plus Video/VSPantry and receipt-memory tests. Do not wire the Table into ordinary candidate generation.

- [ ] **Step 5: Commit safe foundations**

```bash
git add src/full-measure
 git commit -m "feat: add beta context and frame reservoir foundations"
```

---

### Task 6: Prove the exact integration ancestor before opening candidate ecology

**Files:**
- Potentially modify: `src/full-measure/tests/ui-witness-baselines/*.png` only after explicit visual review demonstrates an intended current-head delta.
- Modify docs only as needed to record exact proof state.

**Interfaces:**
- Consumes: Tasks 1–5 exact branch state.
- Produces: evidence-backed selected ancestor for #147.

- [ ] **Step 1: Install from the authoritative lockfile**

```bash
npm --prefix src/full-measure ci
```

Expected: exit 0.

- [ ] **Step 2: Run full repository verification**

```bash
npm run verify
```

Expected: exit 0 with check, deterministic tests, and smoke complete.

- [ ] **Step 3: Run full application tests again as an explicit countable gate**

```bash
npm --prefix src/full-measure test
```

Expected: 0 failed tests.

- [ ] **Step 4: Run production smoke again**

```bash
npm --prefix src/full-measure run smoke
```

Expected: render smoke and candidate-family smoke both exit 0.

- [ ] **Step 5: Build and compare browser witness**

```bash
npm --prefix src/full-measure run witness:build
npm --prefix src/full-measure run witness:test
```

If snapshots differ, inspect the generated artifact/diff. Do not update baselines until the delta is identified as intended.

- [ ] **Step 6: Inspect artifact/authority impact before push**

```bash
git status --short
git diff --check
git diff main...HEAD -- src/full-measure/profiles src/full-measure/constraints src/full-measure/src src/full-measure/tests
```

Reject accidental generated files, stale witness output, debug logs, or current-main regressions.

- [ ] **Step 7: Publish branch and open one draft integration PR**

The PR body must record:

```text
UI impact: behavioral + visual-language integration
browser witness: PASS/FAIL @ <head>
visual delta: expected | none | unexplained
packaged witness required: yes
packaged witness: pending until exact-head Windows Actions artifact
GitBook ontology changed: no for runtime port; project projection may follow proof
```

No main merge is authorized.

- [ ] **Step 8: Require exact-head GitHub Actions proof**

Verify on the exact PR head:

```text
Full Measure check
all node tests
production smoke render
candidate six-up smoke
production dependency audit
canonical browser renderer witness
unsigned Windows Setup + Portable build
```

Do not substitute historical green runs for this integration head.

- [ ] **Step 9: Run the packaged human Track-0 witness on that exact artifact**

Record four independent verdicts:

```text
aggressiveRenderCompleted
lowAndSlowExpressiveReachPreserved
listenerDraftPreserved
relistenHumanAnchorsPreserved
```

A render pass alone closes only the first verdict.

- [ ] **Step 10: Stop and select this exact head as #147 ancestor only when machine proof is green and remaining uncertainty is named**

No #147 code belongs in this plan.
