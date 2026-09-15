# Post-WALK Axis Grammar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Stage A post-WALK axis grammar from addressed six-recipe kernel through accepted topology + L BRANCH v2 composition, deterministic replay, ordinary candidate-session opt-in, canonical receipt evidence, fail-closed crucible, and production witness.

**Architecture:** Keep the existing WALK authority chain intact. Stage A first admits the recipe-driven GRAB through topology-event authority, then builds an L BRANCH v2 mix plan from that accepted topology timeline and binds both into the accepted `ResolvedTimeline`; replay reconstructs from attributable source inputs rather than trusting serialized output. Candidate-session integration is explicit opt-in in the existing ordinary-family enrichment seam, leaving TEST 6 and default behavior unchanged.

**Tech Stack:** Node.js CommonJS, `node:test`, canonical SHA-256 addressing, existing topology-event authority, L BRANCH v2, candidate-session, canonical render sidecars/receipts, GitHub Actions.

**Spec:** PR #251 bounded Stage A design approved 2026-08-25.

## Global Constraints

- No merge, tag, release, promotion, or WALK widening.
- No new effect family.
- No aperture/shape axis; #223 remains untouched.
- Accepted `ResolvedTimeline` remains sole semantic execution authority.
- Stage A is explicit opt-in; opt-out must preserve existing identity/behavior.
- TEST 6 remains isolated from ordinary candidate ecology.
- Refuse explicitly on missing/mismatched authority, recipe identity, lawful event window, GRAB scope, or replay identity.
- Use TDD: each behavior begins with an observed failing test before production code.

---

### Task 3: Compose recipe into accepted topology + L BRANCH v2 timeline

**Files:**
- Modify: `src/full-measure/tests/post-walk-axis-grammar.test.cjs`
- Modify: `src/full-measure/src/generation/post-walk-axis-grammar.cjs`

**Interfaces:**
- Consumes: addressed recipe, source candidate/family identity, topology-event authority, admitted Lane Bank.
- Produces: `composePostWalkAxisRecipe(...)` returning explicit refusal or a final accepted timeline containing accepted topology evidence, recipe identity, L BRANCH v2 mix plan/execution, and canonical timeline hash.

- [ ] Write failing composition test proving topology acceptance precedes L BRANCH v2 binding and recipe identity is retained on final timeline.
- [ ] Observe RED in GitHub Actions.
- [ ] Implement minimal compositor using existing topology resolver, `buildMixPlanFromRequests`, `compileMixPlan`, and `bindMixPlanToTimeline`.
- [ ] Observe focused/full GREEN before proceeding.

### Task 4: Deterministic replay

**Files:**
- Modify: `src/full-measure/tests/post-walk-axis-grammar.test.cjs`
- Modify: `src/full-measure/src/generation/post-walk-axis-grammar.cjs`

**Interfaces:**
- Consumes: admitted Stage A result plus source family/candidate, Lane Bank, recipe, authority.
- Produces: `replayPostWalkAxisRecipe(...)` with exact recipe/event/plan/execution/timeline identity comparisons.

- [ ] Write failing replay identity and replay-drift tests.
- [ ] Observe RED.
- [ ] Implement reconstruction from attributable inputs; never trust serialized final timeline as source authority.
- [ ] Observe GREEN.

### Task 5: Ordinary candidate-session opt-in

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Add/modify focused candidate-session test in `src/full-measure/tests/`.

**Interfaces:**
- Consumes: explicit Stage A session option and existing ordinary enrichment inputs.
- Produces: ordinary six-up family composed through Stage A only when opted in.

- [ ] Write failing opt-in/off identity tests and TEST 6 isolation test.
- [ ] Observe RED.
- [ ] Add one explicit transformation at the ordinary enrichment seam; default remains current path.
- [ ] Observe GREEN.

### Task 6: Canonical receipt evidence

**Files:**
- Modify: `src/full-measure/src/render/receipt.cjs`
- Modify/add receipt test in `src/full-measure/tests/`.

**Interfaces:**
- Consumes: canonical accepted timeline sidecar with Stage A binding.
- Produces: compact receipt evidence for recipe identity adjacent to topology and L BRANCH proof, without duplicate authority.

- [ ] Write failing receipt promotion and tamper-refusal tests.
- [ ] Observe RED.
- [ ] Promote compact Stage A evidence from canonical timeline only.
- [ ] Observe GREEN.

### Task 7: Negative-control crucible

**Files:**
- Modify/add Stage A crucible tests under `src/full-measure/tests/`.

**Interfaces:**
- Produces fail-closed proof for wrong recipe hash, wrong family/authority, no lawful window, GRAB-scope mismatch, replay drift, opt-in absent, and shape-field attempts.

- [ ] Add each negative control as a failing test against the intended contract.
- [ ] Implement only missing refusal checks.
- [ ] Run focused and full regression gates.

### Task 8: Machine + production witness

**Files:**
- No semantic source changes unless a failing executable proof exposes a bug.

- [ ] Run GitHub Actions full machine gate and record exact commit/status.
- [ ] Run the repository production/smoke render path available in CI; inspect accepted timeline sidecar and receipt evidence.
- [ ] Confirm all six recipes compose/replay deterministically.
- [ ] Report environment limitations explicitly if a true packaged/local-media render cannot run.
- [ ] Leave PR #251 draft and unmerged; no tag/release/promotion.
