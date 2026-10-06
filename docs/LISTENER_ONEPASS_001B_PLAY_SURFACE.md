# LISTENER-ONEPASS-001B — PLAYABLE WORDPARK SURFACE

Parent: LISTENER-ONEPASS-001A / PR #340  
Issue: #339

## Game Studio decision

The playable surface is intentionally **not Phaser**.

WORDPARK already owns deterministic:

- lyric geometry;
- ball physics;
- collisions;
- queue timing;
- lane state;
- punch timing;
- witness sealing.

Adding Phaser as another game engine would duplicate simulation authority merely to draw the same state.

The Game Studio architecture is therefore:

```text
WORDPARK deterministic simulation
        |
        v
privileged Franken IPC play runtime
        |
  bounded snapshots
        |
        +----------------+
        |                |
        v                v
     Canvas            DOM HUD
   playfield       controls / lyrics
```

```text
SIMULATION != RENDERER
CANVAS != PHYSICS AUTHORITY
HUD != QUEUE AUTHORITY
SANDBOXED PRELOAD != SIMULATION HOST
AUDIO CLOCK = PERFORMANCE CLOCK
```

## Play surface

The first human-playable surface contains only what the one-pass task needs.

### World

Canvas renders:

- exact performed lyric glyph geometry;
- the underlying text path;
- current bird-ball state;
- full-song progress.

It does not calculate collisions or lyric timing.

### Right-hand HUD

At most three lyric cards:

```text
NOW
NEXT
AFTER
```

Each card shows its interaction state:

- ANCHORED;
- READY;
- WATCH;
- CATCH.

### Creative treatment

Four persistent lane buttons:

```text
1 OPEN     -> platform
2 TENDER   -> bowl
3 STRANGE  -> ramp
4 HARD     -> wall
```

One selection remains latched across future automatic arrivals until changed.

Repeated automatic arrivals in one latched lane use deterministic staging slots so the operator is not forced to change lane merely to avoid immediate text pileup.

The slot is explicitly recorded as:

`authority: deterministic-staging-only`

```text
LANE CHOICE = HUMAN TREATMENT
ENTRY SLOT = MACHINE STAGING
ENTRY SLOT != HUMAN SPATIAL CHOICE
```

### Timing exception

One large action:

`NOW`

Keyboard:

`Space`

It punches the current lyric at the current audio-clock frame using the 001A guide semantics.

### Traversal

Desktop:

- WASD;
- arrow keys.

Touch/pointer:

- compact four-direction pad over the lower-left playfield.

The steering input crosses to the preload runtime as action state. The DOM/canvas never mutates the ball directly.

## Runtime boundary

New module:

`src/nextgen/wordpark-runtime.cjs`

The privileged Franken service owns one assisted WORDPARK session. The sandboxed preload only forwards bounded IPC requests.

Renderer-facing methods cross the sandboxed preload as asynchronous IPC calls and remain deliberately narrow:

- start;
- set lane;
- advance to audio-clock frame;
- punch;
- snapshot;
- seal;
- reset.

Snapshots are:

`static-collective/wordpark-play-snapshot/v0`

Authority:

`view-snapshot-only`

The snapshot does not expose dense construction/traversal traces. Those remain inside the simulation until seal.

## Context crossing

The existing Franken editor already holds:

- exact admitted audio;
- FullSongFormV0;
- current ListeningFieldV0;
- current Listener alignment.

When all are present it emits one bounded UI context event for WORDPARK.

The event supplies source state. It does not grant edit/freeze authority.

## Playtest gate

Game Studio QA now checks:

1. WORDPARK playfield is visible inside Franken;
2. canvas occupies more than two-thirds of the game shell;
3. no console errors;
4. STRANGE may latch before the take;
5. BEGIN creates the three-item lookahead;
6. two scheduled lyrics can arrive without two human drop actions;
7. CATCH becomes the current NOW action;
8. one NOW punch creates one human timing anchor;
9. later lyric becomes current;
10. a screenshot is captured from the resulting played state.

The screenshot witness is UI evidence only.

The browser witness uses bounded fake play snapshots and is explicitly separate from production WORDPARK physics.

## Deliberate exclusions

001B does not add:

- live phase assist;
- scoring;
- combos;
- grind vocabulary;
- automatic semantic mood choice;
- Relation Mirror;
- renderer/freeze integration;
- History Compost composition;
- a second game engine.

## Founding law

> The player should feel like they are skating the lyrics, while the machine quietly carries the timing paperwork.

Or mechanically:

```text
MACHINE SCHEDULES ORDINARY ARRIVAL
HUMAN CHOOSES TREATMENT
HUMAN PUNCHES EXCEPTIONS
BALL DISCOVERS CONSEQUENCE
```
