# BETA Home Bench Current-Main Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the BETA Home Bench on current `main` so it projects the landed Candidate Ecology/CROSS family without duplicating or changing candidate authority.

**Architecture:** `candidate-ui.js` remains the only renderer-side owner of candidate family state and creative verbs. Home Bench adds presentation mounts and mirrors the current family into a 3×2 contact sheet. A derived build capability truthfully reports when `toastmood-field-v1` and `two-parent-cross-v1` are present; it never changes generation behavior. Recent Toasts remains bridge-gated and Video/VSPantry remains source/persistent-material UI only.

**Tech Stack:** Electron renderer JavaScript, CommonJS/Node test runner, JSDOM, Playwright Chromium witness suite, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-18-beta-home-bench-current-main-design.md`

## Global Constraints

- Current integration ancestor is `main` after #175, #179, and #135.
- Do not rewrite published #167 history; preserve it and supersede it with a current-main PR.
- Preserve #179 candidate behavior, exact two-parent CROSS, and outer-scroll/sidebar repair.
- Home Bench is presentation only; no second family state or generation implementation.
- No Home-specific root-seed domain and no Home-specific Toast Feel decision.
- Recent Toasts stays absent without a real bridge.
- Thoughtline remains design-only.
- No tag or release.

---

### Task 1: Prove and derive the Candidate Ecology capability

**Files:**
- Modify: `src/full-measure/tests/beta-candidate-ecology.test.cjs`
- Modify: `src/full-measure/src/build-capabilities.cjs`

**Interfaces:**
- Consumes: `generation.TOASTMOOD_FIELD_POLICY === "toastmood-field-v1"` and `generation.CROSS_POLICY === "two-parent-cross-v1"`.
- Produces: build capability string `betaCandidateEcologyV1`.

- [ ] **Step 1: Write RED test** that calls `deriveBuildCapabilities()` and requires `betaCandidateEcologyV1` when both canonical policies are active.
- [ ] **Step 2: Push the test-only commit and verify GitHub Actions fails on that assertion.**
- [ ] **Step 3: Implement the minimal derived capability in `build-capabilities.cjs`; do not introduce a manual feature flag.**
- [ ] **Step 4: Push and verify the focused test and full Node suite are green.**

### Task 2: Pin Home Bench semantic DOM and Video/VSPantry presentation

**Files:**
- Create: `src/full-measure/tests/beta-home-ui.test.cjs`
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/src/renderer/video-source-ui.js`
- Modify: `src/full-measure/src/renderer/beta-home-ui.css`
- Modify: `src/full-measure/tests/video-source-ui.test.cjs`

**Interfaces:**
- DOM mounts: `videoSourceMount`, `videoPantryWindow`, `betaSixUpWindow`, `betaSixUpGrid`, `betaSixUpGenerate`, `betaSixUpState`, `recentToastsWindow`, `recentToastsList`.
- `videoSourceMount` owns the compact current-video row.
- `videoPantryWindow` owns persistent pantry status and folder intake.

- [ ] **Step 1: Add RED semantic tests** requiring the mounts, hidden beta/history windows by default, and default-on Add to VSPantry behavior.
- [ ] **Step 2: Push test-only head and verify expected failures.**
- [ ] **Step 3: Port the prior #167 semantic DOM and Video/VSPantry presentation onto current `main`, preserving existing bridge behavior.**
- [ ] **Step 4: Run CI and require focused + full tests green.**

### Task 3: Project the current candidate family into Home

**Files:**
- Modify: `src/full-measure/src/renderer/candidate-ui.js`
- Modify: `src/full-measure/src/renderer/candidate-ui.css`
- Modify: `src/full-measure/tests/beta-home-ui.test.cjs`
- Modify: `src/full-measure/tests/beta-candidate-ecology-ui.test.cjs`

**Interfaces:**
- Consumes the existing `family`, `selectedIndex`, `renderFamily(view)`, `chooseCard(index)`, and existing generate/mutate/CROSS APIs.
- Produces no new candidate state.
- Home mode may toggle presentation only.

- [ ] **Step 1: Add RED tests** proving Home mode is enabled by `betaCandidateEcologyV1`, shows six exact current candidates, mirrors selection, and does not inject `toastFeelId` or a Home-only seed domain into ordinary generation.
- [ ] **Step 2: Push and verify RED.**
- [ ] **Step 3: Add `configureHomeMode()` that toggles only presentation nodes.**
- [ ] **Step 4: Add `renderHomeFamily(view)` as a pure projection called by existing `renderFamily(view)`.**
- [ ] **Step 5: Ensure `clearUi()` clears both modal and Home projection; do not change #179 CROSS parent logic.**
- [ ] **Step 6: Run focused ecology/UI tests and full suite; require GREEN.**

### Task 4: Add truthful Recent Toasts aperture

**Files:**
- Create: `src/full-measure/src/renderer/recent-toasts-ui.js`
- Create: `src/full-measure/tests/recent-toasts-ui.test.cjs`
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/scripts/build-ui-witness.cjs`

**Interfaces:**
- `installRecentToasts({ document, api }) -> Promise<boolean>`.
- Capability exists only when `typeof api.listPastToasts === "function"`.
- Calls `api.listPastToasts({ limit: 3 })`; renders at most three stable records.

- [ ] **Step 1: Add RED tests** for absent bridge, four-input/three-output cap, display-only evidence, and optional detail navigation.
- [ ] **Step 2: Push and verify RED.**
- [ ] **Step 3: Port the small presentation controller and witness build inclusion.**
- [ ] **Step 4: Require focused + full suite GREEN.**

### Task 5: Fresh browser witness and #179 regression protection

**Files:**
- Modify: `src/full-measure/witness/witness-bridge.js`
- Modify: `src/full-measure/witness/witness-controller.js`
- Modify: `src/full-measure/tests/ui-witness-build.test.cjs`
- Modify: `src/full-measure/tests/ui-witness.spec.cjs`

**Interfaces:**
- Explicit witness states: `beta-home`, `beta-history`, compact `beta-home` at 1080×720.
- Existing candidate modal outer-shell scrollbar invariant remains green.

- [ ] **Step 1: Add RED witness assertions before changing witness fixtures.**
- [ ] **Step 2: Add explicit fixture capability/data only to beta witness states.**
- [ ] **Step 3: Run browser witness in CI and inspect screenshots before accepting any baseline delta.**
- [ ] **Step 4: Apply only layout fixes required by observed evidence.**
- [ ] **Step 5: Require canonical witness, beta states, compact state, and #179 scrollbar/sidebar witness GREEN.**

### Task 6: Review, successor PR, and readiness gate

**Files:**
- No new production files.

- [ ] **Step 1: Verify no unintended `src/full-measure/src/render/` or `src/full-measure/src/generation/` semantic changes.**
- [ ] **Step 2: Run/inspect full application checks, production smoke/candidate smoke, dependency audit, browser witness, Vercel, and Windows package gates exposed by Actions.**
- [ ] **Step 3: Use the Riqor UI finish gate against desktop and compact witness artifacts.**
- [ ] **Step 4: Open the successor PR from `agent/beta-home-bench-current-main` to `main`; mark it draft until machine + browser witness are green.**
- [ ] **Step 5: Comment on and close #167 as superseded, preserving `archive/beta-home-bench-pre-ecology-20260818`.**
- [ ] **Step 6: When exact-head readiness is proven, request explicit per-PR landing confirmation for that head SHA.**

## DANCO documentation sidecar

In parallel with implementation, update GitBook `Haunted Toaster — Gold Star Field Checkpoint` with `release (DANCO)` as the topology-response positive control. Preserve the hypothesis as calibration evidence:

> **Do not make heavy songs more intense. Preserve enough local musical difference that topology has information to respond to.**

Pair DANCO with one or two topologically-dead heavy negative controls before promoting the hypothesis into a portable law.
