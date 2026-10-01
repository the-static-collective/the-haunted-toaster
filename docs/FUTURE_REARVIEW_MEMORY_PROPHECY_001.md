# MUTANT-001 - FUTURE REARVIEW MEMORY PROPHECY

**Status:** executable mutation proof
**Working branch:** `mutant/future-rearview-memory-prophecy-001`
**Exact parent:** `17194c34b9b248fd1edfa975c0cd6142d97b658a`
**Parent body:** MEMORY-001 / Six-Up Memory Prism

> The Toaster remembers backward, imagines forward, and is forbidden to confuse the two.

## Seed

The batch begins with one chosen six-up family. That family is not a command and it is not six independent prompts. It is the album genome:

```text
CHOSEN SIX-UP
  familyHash
  six score addresses
        |
        v
ALBUM GENOME
```

The ordered folder becomes a track manifest. Each track contributes bounded song evidence before any track is toasted.

## Three temporal materials

Future Rearview keeps three materials permanently distinct:

```text
RECEIPT   = what actually happened
LEARNING  = what can be derived from the accepted receipt
PROPHECY  = what the not-yet-executed remainder might become
```

Law:

```text
RECEIPT != LEARNING
LEARNING != PROPHECY
PROPHECY != AUTHORITY
PROJECTION != AUTHORITY
```

A prophecy may influence proposal generation. It may not rewrite a receipt, become a ResolvedTimeline, or claim that an imagined event occurred.

## Initial forward imagining

Before Track 1, the whole ordered manifest is visible to the mutation organ.

Each present/future track receives a deterministic, explicitly imagined prophecy containing:

- a provisional album role;
- two aperture focuses from BODY / BEHAVIOR / SKIN / COLOR / EYE / TIME;
- current song evidence;
- album-genome evidence;
- the exact rearview-history cut from which it was imagined.

The prophecy is hash-addressed and replayable. No wall clock, random source, renderer state, or ambient UI state participates.

## Current-track context

At any cursor position the Toaster can derive:

```text
ALBUM GENOME
    +
REARVIEW
  accepted receipts
  derived learnings
    +
PRESENT TRACK
    +
FORWARD HORIZON
    |
    v
FUTURE REARVIEW MUTATION PRISM
```

The mutation prism has the same six apertures as MEMORY-001, but it deliberately does **not** pretend to be a MemoryPrism.

Each seat names one proposal-time source:

- `GENOME`
- `REARVIEW`
- `PROPHECY`

Cold start has no counterfeit rearview, so Track 1 alternates GENOME and PROPHECY. After an accepted track exists, later tracks rotate all three sources.

Each seat emits only a deterministic `mutationKey` plus evidence references. It does not set score authority directly.

## Existing Toaster memory survives

The generation bridge derives a new deterministic root seed from:

- the caller's ordinary root seed;
- batch identity;
- current Future Rearview context;
- current mutation-prism identity.

If ordinary generation already carries the MEMORY-001 `memoryPrism`, it is preserved unchanged.

So the intended composition is:

```text
OLD TOASTER MEMORY ----+
                       |
ALBUM GENOME --------- +--> proposal generation
                       |
FORWARD PROPHECY ------+
```

The Future Rearview layer changes proposal search. It does not enter the renderer as ambient authority.

## Learning by practical application

Future Rearview v1 advances only from an accepted render receipt.

For the track that just executed, the machine stores:

- the exact prophecy that existed before execution;
- the accepted render receipt hash;
- optional candidate family / selected score identity;
- observed score axes and feature tokens;
- derived learning.

Learning compares predicted aperture focus against observed practical axes:

```text
predicted AND observed -> confirmed focus
observed NOT predicted -> surprise
predicted NOT observed -> unfulfilled focus
```

That learning is then included in the next history cut.

The remaining horizon is re-imagined from that new cut.

This is the mutation loop:

```text
IMAGINE REMAINDER
      |
      v
TOAST CURRENT TRACK
      |
      v
ACCEPTED PRACTICAL RECEIPT
      |
      v
DERIVE LEARNING
      |
      v
RE-IMAGINE REMAINDER
```

The machine is therefore allowed to say, in executable form:

> I know something now that I could not have known one track ago.

## The ending haunts the beginning

After the final accepted track, prophecy has become historical evidence about what the machine once imagined.

The retrospective compares prophecy against actuality. If an earlier track left an aperture unfulfilled and a later track actually manifests that aperture, the machine may emit a **revisit invitation**.

It may not automatically re-toast the earlier track.

```text
ENDING OBSERVATION
      |
      v
EARLIER UNFULFILLED PROPHECY
      |
      v
REVISIT INVITATION ONLY
```

This preserves archaeology. The album may acquire after-the-fact foreshadowing without sanding away the sequence that discovered it.

## Proof slice

Executable tests establish:

1. Track 1 sees album genome + prophecy but no counterfeit rearview.
2. Prophecy is explicitly non-authoritative and ResolvedTimeline authority remains untouched.
3. An accepted practical outcome becomes derived learning.
4. New learning changes the remaining horizon.
5. Later track contexts contain GENOME + REARVIEW + PROPHECY sources.
6. Existing MEMORY-001 `memoryPrism` survives the generation bridge unchanged.
7. Same album seed + manifest + accepted outcomes replay identically.
8. Final retrospective may invite an earlier revisit but cannot trigger one automatically.

## Not yet claimed

This mutation does not yet claim:

- folder-picker UI;
- unattended batch rendering;
- direct parent-score inheritance from one of the album genome's six score bodies;
- automatic axis-target synthesis from prophecy;
- failure-receipt learning;
- Human Verdict integration;
- renderer changes;
- canonical release status.

Those are later doors.

## Next executable door

The strongest next slice is a batch controller around this organ:

```text
SELECT FOLDER
  -> analyze ordered tracks
  -> choose album six-up genome
  -> build Future Rearview state
  -> toast Track 1 with ordinary memory + temporal seed
  -> accept receipt
  -> advance state
  -> toast Track 2
  -> ...
  -> final retrospective / optional revisit invitations
```

The core temporal law is now small enough to remain inspectable while the UI and automation grow around it.
