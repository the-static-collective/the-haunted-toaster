# Listener Transport UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Listener waveform click target into a visible, pointer-scrubbable, keyboard-accessible transport control with synchronized time feedback.

**Architecture:** Keep one transport authority in `renderer/app.js`: `seekSyncAudio(seconds)` clamps and synchronizes media/playhead/readout. Pointer and keyboard inputs delegate to it. HTML/CSS add only semantic affordances and visual feedback.

**Tech Stack:** Electron renderer, vanilla JavaScript, HTML/CSS, Node test runner, JSDOM.

## Global Constraints
- Do not alter lyric timing authority or render semantics.
- Do not add dependencies or a second UI controller.
- Pointer times clamp to `[0, duration]`.
- Keyboard seeking: Left/Right ±5 seconds, Home 0, End duration.
- Existing Tap Through Space behavior must not regress.
- No version bump or canonical artifact/receipt/profile change.

---

### Task 1: Transport behavior proof

**Files:**
- Modify: `src/full-measure/tests/renderer-ui-integration.test.cjs`

**Interfaces:**
- Consumes: existing `buildRenderer()` JSDOM harness and `#syncWaveform`, `#syncAudio`, `#syncPlayhead` DOM.
- Produces: failing executable expectations for pointer, keyboard, clamping, and synchronization.

- [ ] **Step 1: Write failing tests**
  Add tests that load a song, set deterministic media duration/currentTime properties, stub `getBoundingClientRect`, exercise click/pointer events and keyboard events, and assert `currentTime`, playhead `left`, readout text, and pointer capture/release.
- [ ] **Step 2: Verify RED**
  Run the branch workflow and confirm failure is caused by missing transport semantics/readout/scrubbing rather than harness errors.
- [ ] **Step 3: Commit**
  Commit only the failing test change as `test listener waveform transport`.

### Task 2: Accessible transport implementation

**Files:**
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/src/renderer/styles.css`
- Modify: `src/full-measure/src/renderer/app.js`

**Interfaces:**
- Consumes: `syncAudio`, `syncWaveform`, `syncPlayhead`, `formatDuration()`, and existing `updateSyncPlayhead()`.
- Produces: `seekSyncAudio(seconds)` plus pointer/keyboard handlers and live transport metadata.

- [ ] **Step 1: Add DOM semantics**
  Make the canvas focusable with slider role/label and add `#syncWaveformHint` text `Click or drag waveform to seek.` plus `#syncTimeReadout` initialized to `0:00 / 0:00`.
- [ ] **Step 2: Add visual treatment**
  Give the waveform pointer cursor, hover/focus-visible border/box-shadow treatment, and `touch-action: none`; style the hint/readout row compactly.
- [ ] **Step 3: Implement minimal transport primitive**
  Add duration resolution, clamped seek, readout update, pointer-to-time conversion, and immediate playhead synchronization in `app.js`.
- [ ] **Step 4: Bind pointer and keyboard controls**
  Pointer down seeks and captures; pointer move scrubs only while captured; pointer up/cancel releases. Arrow Left/Right seek 5 seconds; Home/End seek boundaries.
- [ ] **Step 5: Keep media events synchronized**
  Update playhead/readout on metadata/duration/time updates and after explicit seeks.
- [ ] **Step 6: Verify GREEN**
  Require `npm run verify` through the branch workflow to pass.
- [ ] **Step 7: Commit**
  Commit implementation as `improve listener waveform transport`.
