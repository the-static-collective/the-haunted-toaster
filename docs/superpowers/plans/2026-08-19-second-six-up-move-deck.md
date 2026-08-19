# Second Six-Up Move Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the candidate modal's verb toolbar with a deterministic second six-up of contextual move proposals plus one proposal-only re-deal control.

**Architecture:** Add a pure CommonJS proposal-deck module that returns six addressed, non-authoritative move proposals from current family/selection/locks/deal index. Expose that pure function through preload without adding a new IPC authority path. Candidate UI renders and executes proposals by delegating to the existing mutate/converge/stomp/cross APIs; render acceptance stays separate.

**Tech Stack:** Node.js >=22, CommonJS, Electron contextBridge, vanilla browser JavaScript/CSS, node:test, jsdom, Playwright witness.

**Spec:** `docs/superpowers/specs/2026-08-19-second-six-up-move-deck.md`

## Global Constraints

- Preserve `VisualScore -> ResolvedTimeline -> preview -> render -> sidecars -> receipt` unchanged.
- No hidden entropy.
- Proposal re-deal must never invoke candidate generation or change candidate/render authority.
- CROSS remains exactly two current-family parents.
- EXPAND is a UI intent over the existing branch-mutation primitive, not a new renderer mode or Creative Verb ontology entry.
- Locks remain absolute and are passed unchanged to execution.
- Packaged Electron witness is required because preload changes.
- Do not merge, tag, publish, release, or promote as part of this plan.

---

### Task 1: Pure deterministic move-deck contract

**Files:**
- Create: `src/full-measure/src/candidate-move-deck.cjs`
- Create: `src/full-measure/tests/candidate-move-deck.test.cjs`

**Interfaces:**
- Consumes: `{ familyHash, candidates, selectedIndex, locks, dealIndex }`.
- Produces: `dealCandidateMoves(context) -> { policy, dealAddress, dealIndex, proposals[6] }`.
- Proposal fields: `{ address, kind, label, detail, action, parentIndex?, parentIndexes? }`.

- [ ] **Step 1: Write the failing tests**

Tests must prove: exactly six first-deal proposals; first deal contains EXPAND/MUTATE/CONVERGE/STOMP/two CROSS; CROSS partners are distinct and exclude selected candidate; identical context is byte-deep-equal; deal 1 differs from deal 0 but leaves supplied context unchanged; sorted locks produce stable identity; invalid/missing current selection refuses.

- [ ] **Step 2: Run RED**

Run: `cd src/full-measure && npm test -- tests/candidate-move-deck.test.cjs`
Expected: FAIL because `../src/candidate-move-deck.cjs` does not exist.

- [ ] **Step 3: Implement the pure module**

Implementation uses `node:crypto` SHA-256 over canonical fixed-key JSON. Partner order is deterministic from family hash + selected score address + deal index. No random APIs, time, filesystem, IPC, or mutation of input objects.

- [ ] **Step 4: Run GREEN**

Run: `cd src/full-measure && npm test -- tests/candidate-move-deck.test.cjs`
Expected: PASS.

- [ ] **Step 5: Run full Node tests**

Run: `cd src/full-measure && npm test`
Expected: all tests PASS.

---

### Task 2: Preload exposure and second-six-up UI

**Files:**
- Modify: `src/full-measure/src/preload.cjs`
- Modify: `src/full-measure/src/renderer/candidate-ui.js`
- Modify: `src/full-measure/src/renderer/candidate-ui.css`
- Modify: `src/full-measure/tests/beta-candidate-ecology-ui.test.cjs`

**Interfaces:**
- Consumes: `window.fullMeasure.dealCandidateMoves(context)` plus existing `mutateCandidates`, `crossCandidates`, `stompCandidates`.
- Produces UI controls `#candidateMoveGrid`, `#candidateMoveRedeal`, and six `.candidate-move-card` buttons.

- [ ] **Step 1: Write failing UI contract assertions**

Assert preload imports/exposes `dealCandidateMoves`; candidate UI contains the move grid and re-deal control; UI delegates proposal actions to existing APIs; old `candidateCrossMark` and `candidateCross` toolbar controls are absent; `Use selected timeline` remains explicit.

- [ ] **Step 2: Run RED**

Run: `cd src/full-measure && npm test -- tests/beta-candidate-ecology-ui.test.cjs`
Expected: FAIL on missing move-deck UI/exposure.

- [ ] **Step 3: Expose the pure function from preload**

Add `const { dealCandidateMoves } = require("./candidate-move-deck.cjs")` and `dealCandidateMoves: (context) => dealCandidateMoves(context)` to `window.fullMeasure`. Do not create a new main-process IPC handler.

- [ ] **Step 4: Replace verb toolbar with second six-up**

Candidate UI state adds `moveDealIndex`. Selecting a card resets it to 0 and calls `renderMoveDeck()`. `renderMoveDeck()` passes family hash, minimal candidate provenance, selected index, current locks, and deal index to preload. Re-deal increments only `moveDealIndex` and re-renders proposals.

Proposal execution mapping:

```js
expand/mutate -> api.mutateCandidates({ ...configFor(kind), familyHash, parentIndex, locks, converge: false })
converge      -> api.mutateCandidates({ ...configFor("converge"), familyHash, parentIndex, locks, converge: true })
stomp         -> api.stompCandidates({ ...configFor("stomp"), familyHash, parentIndex, locks })
cross         -> api.crossCandidates({ ...configFor("cross"), familyHash, parentIndexes, locks })
```

Any family replacement calls existing `renderFamily()`, which clears selected/accepted state. Re-deal never calls any operation above.

- [ ] **Step 5: Style compact 3x2 move grid**

Keep `.candidate-grid` as the only native scroll region. The move panel is fixed-height/compact and responsive; do not make `.candidate-surface` scroll.

- [ ] **Step 6: Re-run focused UI tests**

Run: `cd src/full-measure && npm test -- tests/beta-candidate-ecology-ui.test.cjs tests/candidate-move-deck.test.cjs`
Expected: PASS.

- [ ] **Step 7: Run full Node tests**

Run: `cd src/full-measure && npm test`
Expected: PASS.

---

### Task 3: Browser witness and packaged proof

**Files:**
- Modify when needed by witness: `src/full-measure/tests/ui-witness.spec.cjs`
- Modify when needed by witness: `src/full-measure/src/renderer/candidate-ui.css`

**Interfaces:**
- Consumes: completed second-six-up UI.
- Produces: browser and packaged proof that the move deck is visible, stable, and proposal-only on re-deal.

- [ ] **Step 1: Add witness assertions before any witness-specific production tweak**

Witness must show: select one candidate -> six move cards appear; first deal includes all five mechanics; click re-deal -> candidate card addresses remain unchanged while move proposal addresses/deal label change; CROSS proposal names a different current candidate; modal stays within viewport at canonical geometry.

- [ ] **Step 2: Run browser witness**

Run: `cd src/full-measure && npm run witness:build && npm run witness:test`
Expected: PASS.

- [ ] **Step 3: Run repository checks and smoke**

Run: `cd src/full-measure && npm run check && npm run smoke`
Expected: PASS.

- [ ] **Step 4: Run packaged Electron/Windows CI proof**

Use the repository's existing pull-request workflow. Confirm the exact PR head has renderer/application verification plus packaged witness required by repository law.

---

### Task 4: Documentation, PR, and review gates

**Files:**
- Update: GitHub issue #180
- Update: GitBook beta target page through a GitBook change request

**Interfaces:**
- Consumes: exact verified PR head.
- Produces: bounded review-ready PR with implementation receipts and current documentation projection.

- [ ] **Step 1: Update #180**

Record that `EXPAND` became one proposal in a second six-up rather than a dedicated large control. Preserve the original mood-door objective and authority law.

- [ ] **Step 2: Open PR**

PR body must enumerate authority non-changes, RED/GREEN evidence, exact test/check/smoke/witness results, and packaged proof status.

- [ ] **Step 3: Run Riqor UI finish gate**

Review the browser witness against the design contract; fix only finish-gate findings that are in scope and re-run proof.

- [ ] **Step 4: Run Develoop automated-review resolution**

Move PR to ready when proof is green, observe automated review, resolve valid review findings with test-first fixes, and leave no unresolved in-scope review thread.

- [ ] **Step 5: Run PR Completion readiness gate**

Verify exact head, CI, reviews, conflict state, and merge readiness. Stop at merge-ready; merging requires a separate explicit landing instruction.
