# NEXTGEN-TOASTER-011 — FULL SONG FORM

## Purpose

Remove the 48-second performance ceiling without turning song sections into retries.

The human gets one uninterrupted ONE PASS through the admitted song.

Detected song sections shape the composition underneath that pass. They do not pause it, restart it, or offer a second attempt.

```text
finished song
    |
    +-- duration -----------------------------------+
    |                                               |
    '-- detected section boundaries                 |
             |                                      |
             v                                      v
       FullSongFormV0                         ONE PASS
       ARRIVE / CROSS / ASSEMBLE             one continuous take
             |                                      |
             +------------------+-------------------+
                                |
                                v
                     full-song performance witness
                                |
                     motion + TRACE + residue
                                |
                            RECOMPOSE
                                |
                              FREEZE
                                |
                    Franken full-song v1 plan
                                |
                    HyperFrames / Remotion
```

## What changed after 007

Full-song work starts from the current descendant, not from the original 007 branch.

The relevant lineage is:

```text
007 ONE PASS
    +
007 WATCH / synchronized transport
    |
    v
008 WATCH × PLAY × TRACE
    |
    v
009 performed spatial topology
    |
    v
010 residue memory
    |
    v
011 full-song form
```

That matters because duration is no longer only clip timing.

A performed edit can now generate:

- raw timing witness;
- spatial samples;
- ordinary transform keyframes;
- performed topology proposals;
- explicit syzygy relations;
- historical residue with deterministic decay.

Full-song duration therefore has to be shared by the entire temporal ecology.

## One performance, section-shaped form

`FullSongFormV0` is:

`static-collective/full-song-form/v0`

with policy:

`section-snapped-three-act/v0`

It carries:

- admitted song duration;
- 24 fps frame count;
- normalized detected source sections;
- exactly three contiguous macro scene spans;
- the boundary-selection basis;
- a deterministic form hash.

The three macro scenes remain:

```text
ARRIVE
CROSS
ASSEMBLE
```

The system chooses two detected section boundaries nearest the one-third and two-thirds positions of the song while preserving order and positive scene spans.

If useful section evidence is unavailable, it falls back deterministically to duration thirds.

This preserves the existing Franken three-act grammar while letting real song form bend its lengths.

## Example

For a 3:00 song with useful boundaries at 61s and 118s:

```text
ARRIVE       0.00s — 61.00s
CROSS       61.00s — 118.00s
ASSEMBLE   118.00s — 180.00s
```

At 24 fps:

```text
ARRIVE       0 — 1463
CROSS     1464 — 2831
ASSEMBLE  2832 — 4319
```

The player does not stop at frame 1464 or 2832.

Those are compiler boundaries, not performance boundaries.

## ONE PASS

ONE PASS now accepts dynamic:

- `totalFrames`;
- `sceneSpans`.

The admitted audio element remains the performance clock.

A gesture may begin in ARRIVE and end in CROSS. The receipt keeps the raw human down/up gesture intact while lowering it into scene-bounded renderer placements.

A late-song gesture remains late-song. It no longer clamps to frame 1151.

Performance envelopes are still bounded:

- up to 4096 witnessed input events;
- up to 2048 derived placements;
- up to 16384 spatial samples.

Those are safety envelopes, not scoring rules.

## Spatial performance

009 remains intact.

Pointer motion while a lane is held is witnessed against the same full-song audio clock.

Spatial samples lower into the existing maximum-four transform keyframes per placement.

The scene span used for lowering comes from the same `FullSongFormV0`.

```text
AUDIO CLOCK = PERFORMANCE CLOCK
FULL SONG FORM = TEMPORAL ADDRESS MAP
SPATIAL SAMPLE != KEYFRAME AUTHORITY
```

## TRACE

PerformanceTrace now carries the full-song macro spans.

A topology paint event in the final minute of a song remains addressed to the correct late-song frame and macro scene.

No 384-frame scene-start table is allowed to reinterpret it.

## Residue memory

ResidueMemory now derives birth, death, scene entry, scene exit, and checkpoints from the same dynamic macro spans.

A scar born at frame 3600 can therefore remain historically meaningful at frame 4000.

Residue still remains proposal-only.

```text
HISTORY != DESTINY
RESIDUE STATE != FREEZE
```

## Franken full-song v1

The founding contract is not silently changed.

It remains:

```text
static-collective/franken-composition/v0
franken-composer/v0
24 fps
1152 frames
```

Full-song uses a separate contract:

```text
static-collective/franken-composition/v1
franken-composer/full-song-v1
24 fps
dynamic duration
exactly three contiguous macro scenes
```

The v1 plan uses a separate hash domain.

```text
V1 != RETROACTIVE V0
DURATION CHANGE != HISTORY REWRITE
```

Old v0 receipts and plans keep their old meaning.

## Renderer crossing

The existing projectors were already structurally close to full-song capable.

Both consume:

- `plan.durationFrames`;
- scene `startFrame`;
- scene `durationFrames`;
- clip absolute timing.

011 updates plan-hash verification for the v1 domain but does not introduce renderer-local duration authority.

Remotion's registered composition already reads `bundle.composition.durationInFrames`.

HyperFrames already derives its total duration from `plan.durationFrames / plan.fps`.

## UI

The Franken editor now uses the active full-song form for:

- timeline length;
- playhead bounds;
- synchronized audio transport;
- macro scene bands;
- section landmarks;
- clip movement;
- clip resizing;
- keyframe addressing;
- ONE PASS progress;
- spatial preview targeting;
- residue archaeology.

Changing the admitted song invalidates the current proposal/performance state and derives a new form before another take.

## Laws

```text
SECTION GUIDE != EDIT
SECTION BOUNDARY != PAUSE
MACROFORM != PERFORMANCE
AUDIO CLOCK = PERFORMANCE CLOCK

ONE PASS != THREE PASSES
GESTURE != SCENE BOUNDARY
PERFORMANCE != OPTIMIZATION
MISS != ERROR

FULL SONG FORM != FREEZE
TRACE != FREEZE
RESIDUE STATE != FREEZE
RENDERER != PLAN AUTHORITY

V1 != RETROACTIVE V0
DURATION CHANGE != HISTORY REWRITE
```

## Nonclaims

011 does not claim:

- detected sections are semantic truth;
- a section boundary is a required edit point;
- the three-act macroform is the only future song grammar;
- spatial sampling is lossless;
- residue is final-pixel authority;
- a performed take is aesthetically good;
- arbitrary unbounded duration or unbounded event counts.

The point is narrower:

> a normal full song can now be one continuous editing performance while every downstream temporal system shares the same inspectable form.

## Next witness

Use a real multi-minute song and admitted video.

1. Load the song and inspect the derived macro boundaries.
2. Begin ONE PASS once.
3. Perform across at least one macro boundary.
4. Make at least one late-song spatial gesture.
5. Seal the receipt.
6. Scrub TRACE/residue after frame 1151.
7. RECOMPOSE.
8. FREEZE the v1 plan.
9. Produce both renderer projections.
10. Compare duration, macro spans, placement timing, keyframes, and plan hash evidence.
