# Listener Transport UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Listener waveform click target into a visible, pointer-scrubbable, keyboard-accessible transport control with synchronized time feedback.

**Architecture:** Keep the existing `app.js` click seek intact. Put semantic markup in `renderer/index.html`, visual treatment in `renderer/listener-transport.css`, and extend the already-loaded `renderer/sync-keyboard.js` controller with clamped pointer/keyboard transport plus playhead/readout synchronization. No new runtime UI controller is introduced.

**Tech Stack:** Electron renderer, vanilla JavaScript, HTML/CSS, Node test runner, JSDOM.

## Global Constraints
- Do not alter lyric timing authority or render semantics.
- Do not add dependencies or a second UI controller.
- Pointer times clamp to `[0, duration]`.
- Waveform-focused keyboard seeking: Left/Right ±5 seconds, Home 0, End duration.
- Existing Tap Through Space and fine-grained review keyboard behavior must not regress.
- No version bump or canonical artifact/receipt/profile change.

---

### Task 1: Transport behavior proof

**Files:**
- Modify: `src/full-measure/tests/renderer-ui-integration.test.cjs`

**Interfaces:**
- Consumes: existing `buildRenderer()` JSDOM harness and `#syncWaveform`, `#syncAudio`, `#syncPlayhead` DOM.
- Produces: executable expectations for pointer, keyboard, clamping, and synchronization.

- [x] **Step 1: Write failing tests**
  Added tests that load a song, set deterministic media duration/currentTime properties, stub `getBoundingClientRect`, exercise click/pointer events and keyboard events, and assert `currentTime`, playhead `left`, readout text, and pointer capture/release.
- [x] **Step 2: Verify RED**
  Branch workflow failed only the four new transport tests while 179 existing tests remained green.
- [x] **Step 3: Commit**
  Committed the failing test change as `test listener waveform transport`.

### Task 2: Accessible transport implementation

**Files:**
- Modify: `src/full-measure/src/renderer/index.html`
- Create: `src/full-measure/src/renderer/listener-transport.css`
- Modify: `src/full-measure/src/renderer/sync-keyboard.js`

**Interfaces:**
- Consumes: `syncAudio`, `syncWaveform`, `syncPlayhead`, the existing app click seek, and native media events.
- Produces: clamped pointer/keyboard seek helpers plus live transport metadata.

- [x] **Step 1: Add DOM semantics**
  Made the canvas focusable with slider role/label and added `#syncWaveformHint` text `Click or drag waveform to seek.` plus `#syncTimeReadout` initialized to `0:00 / 0:00`.
- [x] **Step 2: Add visual treatment**
  Added a narrow static stylesheet with pointer cursor, hover/focus treatment, `touch-action: none`, and compact hint/readout styling.
- [x] **Step 3: Implement minimal transport primitive**
  Added duration resolution, clamped seek, readout update, pointer-to-time conversion, and immediate playhead synchronization in the existing sync keyboard controller.
- [x] **Step 4: Bind pointer and keyboard controls**
  Pointer down seeks and captures; pointer move scrubs only while captured; pointer up/cancel releases. Arrow Left/Right seek 5 seconds; Home/End seek boundaries when the waveform owns focus.
- [x] **Step 5: Keep media events synchronized**
  Playhead/readout update on metadata/duration/time/seek/play/pause events and after explicit seeks.
- [ ] **Step 6: Verify GREEN**
  Require the final cleaned-up branch head to pass `npm run verify` through the branch workflow.
- [x] **Step 7: Commit**
  Implementation is committed on `agent/listener-transport-ux`.
