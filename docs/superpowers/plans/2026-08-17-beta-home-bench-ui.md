# BETA Home Bench UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current Haunted Toaster visual language while preparing the three-column home screen for Video/VSPantry, beta Six-Up contact-sheet behavior, and recent witnessed-toast history without exposing backend capabilities that do not yet exist.

**Architecture:** Keep `index.html` as semantic UI authority and add small renderer controllers for persistent home windows. Consume the existing Video/VSPantry bridge from PR #157. Six-Up and Recent Toasts are capability-gated: alpha builds keep the current Toast Feel path, while deterministic witness fixtures can prove the beta geometry before #147 and Receipt Memory land. The existing full Six-Up modal remains the only detailed candidate workspace.

**Tech Stack:** Electron 43, browser JavaScript, HTML/CSS, Node.js 22 `node:test`, JSDOM 26, Playwright Chromium witness suite.

**Spec:** `docs/superpowers/specs/2026-08-17-beta-home-bench-and-thoughtline-render-design.md`

## Global Constraints

- Preserve the current three-column appliance chassis and existing aesthetic material language.
- Do not hide Toast Feel preselection unless a declared runtime capability genuinely supports ordinary no-preselection six-up.
- Do not invent ToastPack state when no ToastPack bridge exists.
- Do not expose a Recent Toasts window unless a real `listPastToasts` bridge capability exists.
- The home Six-Up contact sheet is a projection of the existing candidate family, not a second generation implementation.
- Video remains source evidence only in this slice; no render/generation semantics change.
- No files under `src/full-measure/src/render/` or `src/full-measure/src/generation/` may change.
- Existing UI witness states remain valid; new beta geometry is proved with explicit witness fixtures.

---

### Task 1: Pin the home-bench DOM and capability contract

**Files:**
- Create: `src/full-measure/tests/beta-home-ui.test.cjs`
- Modify: `src/full-measure/src/renderer/index.html`

**Interfaces:**
- Static DOM ids: `videoSourceMount`, `videoPantryWindow`, `betaSixUpWindow`, `recentToastsWindow`.
- Unsupported beta windows start with `hidden` and truthful fallback copy in markup.
- Existing `toastFeelChoices`, `shapeCard`, and render controls remain present.

- [ ] **Step 1: Write a failing JSDOM test** that reads `renderer/index.html` and asserts all four mount/window ids exist, `betaSixUpWindow` and `recentToastsWindow` begin hidden, `videoPantryWindow` is visible, and the current `toastFeelChoices` node still exists.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'index.html'), 'utf8');
const document = new JSDOM(html).window.document;

test('beta home semantic windows exist without hiding alpha Toast Feel truth', () => {
  assert.ok(document.querySelector('#videoSourceMount'));
  assert.ok(document.querySelector('#videoPantryWindow'));
  assert.ok(document.querySelector('#betaSixUpWindow')?.classList.contains('is-hidden'));
  assert.ok(document.querySelector('#recentToastsWindow')?.classList.contains('is-hidden'));
  assert.ok(document.querySelector('#toastFeelChoices'));
});
```

- [ ] **Step 2: Run `npm test -- tests/beta-home-ui.test.cjs` from `src/full-measure` and verify RED** because the new DOM nodes are absent.
- [ ] **Step 3: Add the four semantic nodes to `index.html`.** Put `videoSourceMount` immediately after the Image control, `videoPantryWindow` near the bottom of the left panel, `betaSixUpWindow` immediately before detected song shape in the middle panel, and `recentToastsWindow` between render slate/status and the bottom render action in the right panel.
- [ ] **Step 4: Run the focused test and verify GREEN.**

### Task 2: Make Video exactly match the source-row grammar and move pantry management home

**Files:**
- Modify: `src/full-measure/src/renderer/video-source-ui.js`
- Modify: `src/full-measure/tests/video-source-ui.test.cjs`
- Modify: `src/full-measure/tests/beta-home-ui.test.cjs`
- Modify: `src/full-measure/src/renderer/styles.css`

**Interfaces:**
- `installVideoSourceControls({ document, api })` mounts into `#videoSourceMount`.
- Current-video row contains `#videoDrop`, `#addVideoToPantry`, and `#removeVideo` only.
- `#videoPantryWindow` owns `#videoPantryStatus` and `#videoFolderImport`.
- `Add to VSPantry` remains checked by default and `chooseVideo({ addToPantry: <checked> })` remains unchanged.

- [ ] **Step 1: Change the focused renderer test first** so it expects the video chooser inside `#videoSourceMount`, the checked pantry control inside the same compact row, and folder import/status inside `#videoPantryWindow` rather than the video block.
- [ ] **Step 2: Run `npm test -- tests/video-source-ui.test.cjs tests/beta-home-ui.test.cjs` and verify RED** against the existing dynamically inserted two-row Video UI.
- [ ] **Step 3: Update `video-source-ui.js`** to populate the static mounts, keep the existing choose/clear/list/import bridge calls, and remove injected `<style>` ownership. The controller must return `false` if the required mounts are absent and remain idempotent on repeated install.
- [ ] **Step 4: Add CSS classes in `styles.css`** for a compact `video-source-row`, an inline switch-like `video-pantry-toggle`, and a bounded `home-window` matching the current card language. Do not change global color tokens.
- [ ] **Step 5: Run the two focused tests and verify GREEN.**

### Task 3: Add capability-gated Six-Up contact-sheet projection

**Files:**
- Modify: `src/full-measure/src/renderer/candidate-ui.js`
- Modify: `src/full-measure/src/renderer/candidate-ui.css`
- Modify: `src/full-measure/tests/beta-home-ui.test.cjs`
- Modify: `src/full-measure/witness/witness-bridge.js`

**Interfaces:**
- Runtime capability predicate: `api.getBuildInfo()` contains `capabilities` including `betaCandidateEcologyV1`.
- When unsupported: `#toastFeelChoices` remains visible and `#betaSixUpWindow` remains hidden.
- When supported: add class `is-hidden` to `#toastFeelChoices`, reveal `#betaSixUpWindow`, and render the same `family.candidates` thumbnails into `#betaSixUpGrid` after `renderFamily(view)`.
- Clicking a home candidate calls the existing `chooseCard(index)` and opens the existing candidate modal; no duplicate candidate state is introduced.

- [ ] **Step 1: Add a failing JSDOM/controller test** using a fake API whose `getBuildInfo()` resolves `{ capabilities: ['betaCandidateEcologyV1'] }`; assert beta window visible, Toast Feel choices hidden, and six home cells appear after a six-candidate family is rendered.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Add a small asynchronous `configureHomeMode()` in `candidate-ui.js`.** It reads build info once, toggles only presentation nodes, and never changes generation config on its own.
- [ ] **Step 4: Extend `renderFamily(view)`** to project the already-returned family into `#betaSixUpGrid` when enabled. Each cell uses the same thumbnail, candidate index, and signature already used by the modal.
- [ ] **Step 5: Extend witness bridge build-info fixtures** so an explicit beta witness state can opt into `betaCandidateEcologyV1`; do not add the capability to ordinary alpha witness states.
- [ ] **Step 6: Run focused tests and full `npm test`; verify GREEN.**

### Task 4: Add capability-gated three-item Recent Toasts window

**Files:**
- Create: `src/full-measure/src/renderer/recent-toasts-ui.js`
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/scripts/build-ui-witness.cjs`
- Modify: `src/full-measure/witness/witness-bridge.js`
- Modify: `src/full-measure/tests/beta-home-ui.test.cjs`
- Modify: `src/full-measure/tests/ui-witness-build.test.cjs`

**Interfaces:**
- Capability exists only when `typeof api.listPastToasts === 'function'`.
- `installRecentToasts({ document, api }) -> Promise<boolean>`.
- Calls `api.listPastToasts({ limit: 3 })` and renders at most three rows into `#recentToastsList`.
- Rows consume only stable display fields: `id`, `title`, `rating`, `disposition`, `mediaAvailable`, `receiptAvailable`.
- `api.openPastToast(id)` is invoked only if that bridge function exists; otherwise rows remain non-clickable.

- [ ] **Step 1: Add failing tests** proving no bridge keeps the window hidden, a fake bridge with four records renders exactly three, and rating/disposition text is display-only.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement `recent-toasts-ui.js`** as a presentation-only controller and add it to `index.html` plus witness build copying/injection.
- [ ] **Step 4: Extend the witness bridge only for the explicit beta-history fixture** with deterministic three-record `listPastToasts` data. Do not expose it in ordinary alpha states.
- [ ] **Step 5: Run focused + full tests and verify GREEN.**

### Task 5: Add explicit beta witness states and compact-desktop proof

**Files:**
- Modify: `src/full-measure/tests/ui-witness.spec.cjs`
- Modify: `src/full-measure/tests/ui-witness.playwright.config.cjs`
- Add reviewed baselines only after screenshot inspection under `src/full-measure/tests/ui-witness-baselines/`.

**Interfaces:**
- New witness states: `beta-home`, `beta-history`.
- Existing eight states remain unchanged.
- Add a second Playwright project or targeted test viewport at `1080×720` for `beta-home`; do not change the canonical 1380×900 baseline viewport for existing states.

- [ ] **Step 1: Add tests for `beta-home` and `beta-history` before any baseline update.** `beta-home` asserts six contact cells and hidden Toast Feel choices; `beta-history` asserts exactly three recent rows.
- [ ] **Step 2: Run `npm run witness:build && npm run witness:test` and verify RED** because new snapshots do not exist.
- [ ] **Step 3: Inspect the generated screenshots at 1380×900 and 1080×720.** Reject clipping, hidden render action, overlapping source controls, or unreadable contact cells.
- [ ] **Step 4: Adjust only layout CSS needed to satisfy the approved design, rerun semantic tests, rebuild witness, and re-inspect screenshots.
- [ ] **Step 5: Update snapshots only after every changed pixel is explained, then rerun `npm run witness:test` and verify GREEN.**

### Task 6: Acceptance and stacked-PR handoff

**Files:**
- No production additions beyond prior tasks.

- [ ] **Step 1: Run `npm test`.** Expected: all tests pass.
- [ ] **Step 2: Run `npm run check`.** Expected: pass.
- [ ] **Step 3: Run `npm run witness:build && npm run witness:test`.** Expected: all canonical and beta witness states pass.
- [ ] **Step 4: Inspect diff and prove no `src/full-measure/src/render/` or `src/full-measure/src/generation/` files changed.**
- [ ] **Step 5: Open a stacked PR against `agent/persistent-video-vspantry` while #157 is unmerged.** PR body must state that Six-Up and Recent Toasts beta windows are capability-gated and therefore do not claim #147/Receipt Memory are implemented.
- [ ] **Step 6: Request bounded review focused on semantic UI truth, alpha compatibility, and witness geometry.**

## Deferred independent slice: Thoughtline

Do not implement renderer pixels in this plan. The approved design changes Thoughtline into a render ingredient, which depends on Receipt Memory Influence Trace and the renderer-trust gate. Its first implementation plan must begin with a pure `thoughtline-v1` compiler/schema/fixture test slice before shared preview/final renderer integration.
