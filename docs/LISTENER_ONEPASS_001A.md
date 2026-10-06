# LISTENER-ONEPASS-001A — PAINLESS LYRIC PLACEMENT

Issue: #339

Status: executable core, stacked on WORDPARK 001.

## Thesis

The Listener should absorb clerical timing work so the human can spend one uninterrupted pass making creative treatment decisions.

The founding optimization is:

```text
confidence
    ->
interaction burden
```

not:

```text
confidence
    ->
hidden authority
```

## Queue

New contract:

`static-collective/lyric-performance-queue/v0`

Authority:

`performance-guide-only`

The queue is bound to:

- exact admitted song identity through ListeningField;
- exact FullSongForm hash;
- exact ListeningField hash;
- exact Listener alignment schema and ordered cue set.

Each line becomes:

```text
ANCHORED
  human timing exists
  auto-arrive exactly

READY
  high-confidence Listener timing
  auto-arrive

WATCH
  medium-confidence Listener timing
  auto-arrive unless punched first

CATCH
  low or unresolved
  never auto-arrive
```

These are interaction states, not new evidence classes.

## Important unresolved-line boundary

ListeningFieldV0 intentionally omits lyrics with no lawful frame.

Therefore an unmatched CATCH line cannot honestly pretend to have a ListeningField witness.

The queue keeps the exact alignment line identity and records:

```text
sourceWitnessId = null
proposedFrame   = null
state           = CATCH
```

If the human punches it during the take, WORDPARK records:

```text
sourceAuthority = listener-unresolved
timingSource    = human-punch
```

No fake machine timestamp is created.

## Lane latch

OPEN / TENDER / STRANGE / HARD become persistent creative state.

One lane choice may govern many consecutive lyric arrivals.

```text
LANE LATCH
    !=
LYRIC MEANING
```

The human performs changes in treatment rather than repetitive confirmations.

## Auto-arrival

READY / WATCH / ANCHORED entries materialize at their proposed frame.

The resulting WORDPARK object records:

```text
authority   = machine-scheduled-performance-placement
timingSource = machine-scheduled
moodAuthority = performance-choice
```

This keeps machine timing and human visual treatment separate.

## NOW punch

The current queue item may be punched at the current audio-clock frame.

The resulting WORDPARK object records:

```text
authority = human-punched-performance-placement
timingSource = human-punch
humanAnchorCreated = true
```

No pause or rewind is required.

## Miss behavior

CATCH must never stop the song.

A CATCH line stays punchable until a later lawfully scheduled lyric overtakes it.

Then it becomes a miss witness:

```text
reason = overtaken-by-scheduled-lyric
authority = witness-only
```

and the queue continues.

A final unresolved CATCH may simply remain unresolved when the performance seals.

```text
MISS != ERROR
UNRESOLVED != STOP
```

## Three-item lookahead

The core exposes only the current three queue items for a future live rail.

The intended performance UI is:

```text
NOW    lyric A    READY
NEXT   lyric B    WATCH
AFTER  lyric C    CATCH
```

not the existing full correction table.

The correction table remains useful before/after the performance.

## Additive composition

Assisted mode is a wrapper around WORDPARK, not a rewrite.

Existing explicit `dropLyric()` behavior remains available with:

`authority = human-performance-placement`

This gives a clean excision seam.

## Modules

- `lyric-performance-queue.cjs`
  - deterministic queue derivation;
  - guide state;
  - lane latch;
  - automatic advance;
  - human punch;
  - three-item lookahead.

- `wordpark-assisted.cjs`
  - composes guide state with WORDPARK;
  - materializes new guide arrivals into exact lyric geometry;
  - leaves bird traversal unchanged;
  - returns guide witness beside ordinary WORDPARK performance packet.

- `wordpark.cjs`
  - adds only a bounded `dropLyricFromGuide()` admission path;
  - original explicit-drop path remains unchanged.

## Laws

```text
INTERACTION BURDEN != EVIDENCE AUTHORITY

HEARD LYRIC != HUMAN PLACEMENT
AUTO ARRIVAL != HUMAN PLACEMENT CLAIM
HUMAN PUNCH != MACHINE HEARING

LATCHED MOOD != LYRIC MEANING
LANE STATE != TIMING AUTHORITY

PUNCH != RE-LISTEN
MISS != ERROR
UNRESOLVED != STOP

PERFORMANCE QUEUE != FROZEN PLAN
PROPOSAL != FREEZE
```

## Deliberately not in 001A

- no live phase assist;
- no automatic timing offset propagation;
- no Relation Mirror;
- no packaged WORDPARK UI yet;
- no renderer integration;
- no history-composition merge;
- no release / tag / main promotion.

## Human target

For a roughly forty-line song:

```text
old explicit WORDPARK
  ~40 required right-hand drops

assisted target
  5–10 creative lane changes
  2–4 timing punches
  continuous traversal
  zero required pauses
```

That target is an interaction hypothesis. It still needs a real-song human witness.
