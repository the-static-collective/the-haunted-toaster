# NEXTGEN-TOASTER-007 — ONE PASS 001

## Purpose

ONE PASS turns editing into a real-time performance.

The player gets one continuous pass through the current Franken carrier. Six Video Digestion descendants become six physical lanes. Pressing a lane begins a visual placement; releasing it ends that placement. The take is not paused, snapped, repaired, or undone while it is happening.

```text
admitted song
  + six Video Digestion descendants
        ↓
BEGIN THE TAKE
        ↓
A S D J K L
raw down/up timing against the song clock
        ↓
real digestion placements
        ↓
sealed performance witness
        ↓
ordinary Franken dirty proposal
        ↓
RECOMPOSE
        ↓
explicit FREEZE
```

## Current prototype boundary

The current Franken composition is 1152 frames at 24 fps: **48 seconds**.

ONE PASS therefore runs for the shorter of:

- the admitted song duration; or
- the current 48-second Franken carrier.

This branch proves the performance-editing interaction. It does **not** claim arbitrary full-song Franken duration yet.

## Controls

Six current Video Digestion descendants map to:

```text
A  S  D  J  K  L
1  2  3  4  5  6
```

Key down begins a placement. Key up ends it.

Pointer input on the six visible lane buttons uses the same action path.

Keyboard repeat is ignored. A held gesture may cross ARRIVE / CROSS / ASSEMBLE; the raw gesture remains one witnessed down/up pair while its renderer-facing placement is lawfully split at scene boundaries.

## Clock

ONE PASS follows the admitted audio element's `currentTime`.

The performance clock is therefore what the human is actually hearing, not an independent animation timer.

```text
AUDIO CLOCK = PERFORMANCE CLOCK
REQUESTANIMATIONFRAME != TIME AUTHORITY
```

## Anti-perfect custody

During the take:

- no pause control is offered;
- no undo exists;
- no timeline dragging is authoritative;
- snapping is bypassed;
- doing nothing is a valid move;
- key repeat cannot manufacture additional strikes.

After the take, the original event stream is sealed. The resulting placements become ordinary dirty Franken editor state and still require **RECOMPOSE** before **FREEZE**.

## Receipt

A completed take produces:

`static-collective/one-pass-performance-receipt/v0`

The receipt contains the six lane identities, raw event sequence, derived placements, bounded counts, laws, and a deterministic 256-bit performance fingerprint.

The privileged Franken boundary recomputes that fingerprint before persistence and writes the witness create-only under the app's Franken user-data root:

```text
franken-composer/
  one-pass/
    <performanceHash>.one-pass.json
```

Writing an identical receipt again is idempotent. Conflicting bytes at an existing performance identity refuse.

The receipt is **witness-only**. It does not become composition or render authority.

## Laws

```text
PERFORMANCE != OPTIMIZATION
MISS != ERROR
HUMAN TIMING != SNAP TARGET
AUDIO CLOCK = PERFORMANCE CLOCK
EVENT RECEIPT != RENDER AUTHORITY
ONE PASS != ONE PERFECT PASS
PERFORMANCE PLACEMENT != FREEZE
```

## Why no Unity in 001

The current Electron/DOM editor already owns the actual Franken proposal surface. Introducing a second game runtime would create a new state and timing boundary before the interaction itself is proven.

For ONE PASS 001:

- the game simulation is separate from DOM rendering;
- the existing Toaster audio clock is reused;
- the existing Franken placement grammar is reused;
- the existing proposal / RECOMPOSE / FREEZE custody is preserved.

A later spatial or VR instrument can consume the same ONE PASS action/event contract without changing what a performed edit means.

## Next gates

1. Human packaged-use witness: load a real song and admitted video, perform one take, replay the resulting proposal.
2. Visual lane-pressure pass: approaching Listening Eye landmarks may become visible prompts without turning into required notes.
3. Full-song duration: remove the 48-second Franken carrier limit without introducing a second timing authority.
4. Ghost run: render a prior sealed performance as optional visible history while preserving the new pass as independent human timing.
