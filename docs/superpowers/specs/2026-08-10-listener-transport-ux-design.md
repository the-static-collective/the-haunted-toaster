# Listener Transport UX Design

## Goal
Make the Lyric Listener waveform an explicit, accessible transport control without changing lyric timing authority, render semantics, or canonical artifacts.

## Interaction contract
- The waveform is an interactive seek surface with a pointer cursor and visible hover/focus treatment.
- The UI says `Click or drag waveform to seek.` directly below the waveform.
- A live `current / duration` readout is visible beside that instruction.
- Pointer down seeks immediately and captures the pointer; captured pointer movement scrubs continuously; pointer up/cancel ends scrubbing.
- All pointer-derived times clamp to `[0, duration]`, including coordinates outside the canvas bounds during a captured drag.
- The waveform is keyboard focusable and exposes slider semantics. Arrow Left/Right seek by 5 seconds, Home seeks to 0, End seeks to duration.
- Seeking updates `audio.currentTime`, the playhead, the time readout, and active-cue synchronization immediately. Native audio playback remains the source of truth for subsequent time updates.

## Architecture
Keep transport behavior in `src/full-measure/src/renderer/app.js`, beside the existing waveform draw/playhead logic. Add only the small DOM affordances needed in `index.html` and styling in `styles.css`; do not create another late-loaded UI controller.

Introduce one seek primitive that accepts seconds, clamps against the current media duration, writes `syncAudio.currentTime`, and calls the existing playhead synchronization path. Pointer and keyboard handlers both delegate to that primitive.

## Accessibility
The canvas receives `tabindex="0"` and `role="slider"`. JavaScript maintains `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and an `aria-valuetext` matching the visible time state.

## Proof
Extend `renderer-ui-integration.test.cjs` through the existing JSDOM harness. Cover click seeking, pointer-capture drag scrubbing, coordinate clamping, keyboard seeking, live current/duration text, and playhead synchronization.

## Compatibility boundary
No version bump. No score, timeline, receipt, profile, subtitle, or render changes. No new dependency. Existing Tap Through Space behavior remains unchanged when focus is outside the waveform.