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
- Seeking updates `audio.currentTime`, the playhead, and the time readout immediately. Native audio playback remains the source of truth for subsequent time updates and existing app cue synchronization remains intact.

## Architecture
Keep markup declarative in `src/full-measure/src/renderer/index.html` and transport styling in a narrow `listener-transport.css` stylesheet. Extend the already-loaded `sync-keyboard.js` controller for pointer and keyboard transport behavior instead of adding another late-loaded controller or mutating the DOM at runtime.

`app.js` remains the existing click-to-seek authority. The transport controller adds pointer-capture drag scrubbing, keyboard seeking, clamping, ARIA state, and immediate playhead/readout synchronization after click or explicit seek. This avoids duplicating lyric or cue-state authority.

## Accessibility
The canvas owns `tabindex="0"`, `role="slider"`, a seek label, and the visible hint/readout relationship in HTML. JavaScript maintains `aria-valuemax`, `aria-valuenow`, and `aria-valuetext` from the media state.

## Proof
Extend `renderer-ui-integration.test.cjs` through the existing JSDOM harness. Cover click seeking, pointer-capture drag scrubbing, coordinate clamping, keyboard seeking, live current/duration text, and playhead synchronization.

## Compatibility boundary
No version bump. No score, timeline, receipt, profile, subtitle, or render changes. No new dependency. Existing Tap Through Space and fine-grained review keyboard behavior remain unchanged when focus is outside the waveform.