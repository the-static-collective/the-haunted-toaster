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

### Task 1: STOMP generation policy

**Files:**
- Create `src/full-measure/src/generation/stomp-generation.cjs`
- Modify `src/full-measure/src/generation/index.cjs`
- Create `src/full-measure/tests/stomp-generation.test.cjs`

- [ ] Write failing policy tests for six roles, deterministic replay, stronger novelty, primitive-aware breaks, lock inheritance, and constrained threshold relaxation.
- [ ] Verify RED in GitHub Actions.
- [ ] Implement `STOMP_POLICY = "visible-outcome-stomp-v1"` and six deterministic tail-seeking role policies.
- [ ] Reuse canonical score parsing/resolution and visible semantic distance; never add renderer entropy.
- [ ] Re-run focused/full proof and commit GREEN.

### Task 2: Candidate-session one-shot action

**Files:**
- Modify `src/full-measure/src/candidate-session.cjs`
- Modify `src/full-measure/src/preload.cjs`
- Extend `src/full-measure/tests/stomp-generation.test.cjs`

- [ ] Write failing tests for selected-parent requirement, stale-family protection, explicit `candidate:stomp` IPC, and one-shot materialization.
- [ ] Verify RED.
- [ ] Add `stomp(config, signal)` sibling to `mutate()` that calls `generation.generateStompCandidateSet()` and reuses `materialize()`.
- [ ] Add explicit preload bridge; do not overload ordinary mutation with an ambient flag.
- [ ] Verify GREEN.

### Task 3: STOMP button

**Files:**
- Modify `src/full-measure/src/renderer/index.html`
- Modify `src/full-measure/src/renderer/candidate-ui.js`
- Modify `src/full-measure/src/renderer/candidate-ui.css`
- Extend `src/full-measure/tests/renderer-ui-integration.test.cjs`

- [ ] Write failing UI contract tests for exact label/helper, selected-candidate enablement, busy state, and explicit request payload.
- [ ] Verify RED.
- [ ] Add one `STOMP` control beside descendant actions using existing candidate family/selection/lock/root-seed context.
- [ ] Do not add knobs, menus, armed state, or persistent settings.
- [ ] Verify GREEN.

### Task 4: Regression and PR proof

- [ ] Run `npm run verify` through normal GitHub Actions.
- [ ] Confirm application tests, smoke, dependency audit, and smoke artifact succeed.
- [ ] Confirm ordinary MUTATE/CONVERGE code paths and renderer remain STOMP-independent.
- [ ] Confirm no package/version/dependency change.
- [ ] Keep the PR stacked on the primitive branch until #105 lands, then refresh onto resulting `main` before any STOMP landing request.
