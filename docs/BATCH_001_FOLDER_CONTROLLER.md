# BATCH-001 — FOLDER BATCH CONTROLLER

**Status:** executable mutation slice  
**Working branch:** `mutant/batch-001-folder-controller`  
**Parent:** `mutant/future-rearview-memory-prophecy-001` / PR #307

> Pick a folder. Let the record become a place.

## Purpose

BATCH-001 turns Future Rearview Memory Prophecy into a folder-shaped album workflow.

The selected folder is treated as a bounded local ecology:

```text
SELECT FOLDER
    |
    +-- supported audio  -> ordered album spine
    +-- local images     -> album visual reservoir
    +-- local video      -> visible, but NOT silently admitted
    +-- other files      -> ignored with receipt
    |
    +-- existing VSPantry -> extended admitted video reservoir
```

Then one accepted six-up family becomes the album genome and the controller walks the record one track at a time.

## Folder scan

The scanner is deliberately tolerant of ordinary messy folders.

It:

- scans recursively to a bounded depth;
- does not follow symlinks;
- caps total discovered files;
- recognizes supported Haunted Toaster audio and image formats;
- orders numbered audio tracks numerically before lexical fallback;
- hashes admitted audio and image material;
- analyzes every track before batch start;
- records unsupported material instead of pretending it does not exist.

The manifest identity excludes absolute machine paths. Content identity and relative position carry the durable evidence.

## Local images

Every supported image in the selected folder becomes **available proposal material**.

No naming convention is required.

Names may still create soft affinity:

```text
01-opening.wav
opening.jpg
```

will naturally pull closer than an unrelated image.

But naming is not authority.

The allocator ranks images by:

1. least-used across accepted batch history;
2. track-name affinity;
3. deterministic hash tie-break.

This means the machine may roam the folder while naturally avoiding the same picture on every song.

The complete image reservoir remains inspectable even though the current Toaster can bind only one image input for a generation/render path.

## Video Pantry

Existing VSPantry is the extended video reservoir.

Only specimens with:

- prior pantry admission;
- preserved specimen identity;
- source hash;
- probe evidence;
- a currently reachable local path

are eligible.

A video file merely sitting in the album folder is **not** silently promoted into VSPantry.

```text
FILE EXISTS != ADMITTED VIDEO MATERIAL
```

Folder video is reported as:

`present-not-admitted`

That gives a later UI an obvious "admit these too" door without falsifying provenance.

## Material proposal

For each track BATCH-001 derives:

- the complete available folder-image reservoir;
- the complete currently reachable VSPantry reservoir;
- a suggested image;
- a suggested video;
- deterministic ranking evidence.

The suggestion is not execution authority.

```text
AVAILABLE != SELECTED
PROPOSED != SELECTED
SELECTED != RESOLVED TIMELINE
```

An explicit caller may choose another admitted item or choose no image/video.

Any selection outside the current reservoirs is refused.

## Future Rearview composition

BATCH-001 does not replace Future Rearview.

For each current track:

```text
ALBUM SIX-UP GENOME
        +
ACCEPTED REARVIEW
        +
FORWARD PROPHECY
        +
FOLDER IMAGE RESERVOIR
        +
VSPANTRY RESERVOIR
        |
        v
PREPARED CURRENT TRACK
```

Future Rearview derives the generation seed.

The ordinary Haunted Toaster candidate session still supplies its existing MEMORY-001 Memory Prism internally.

BATCH-001 stages:

- current audio + its precomputed analysis;
- selected local image path;
- selected admitted video binding;
- Future Rearview-derived generation seed.

It does not send ambient batch state into the renderer.

## Native bridge

The production preload now exposes these backend doors:

- `chooseBatchFolder()`
- `getBatchManifest()`
- `startBatch(config)`
- `getBatchContext()`
- `activateBatchTrack(config)`
- `acceptBatchTrack(outcome)`
- `closeBatch()`
- `clearBatch()`

The flow is:

```text
chooseBatchFolder
      |
choose / accept album six-up
      |
startBatch
      |
activateBatchTrack
      |
ordinary candidate ecology
      |
KEEP
      |
render
      |
accepted render receipt
      |
acceptBatchTrack
      |
next track
```

The bridge refuses to advance a track that has not first been activated.

Future Rearview still refuses to advance without an accepted render receipt.

## Material learning

Accepted batch history records exactly which folder image and VSPantry specimen were bound to each accepted track.

That history affects later allocation by coverage pressure.

It does **not** claim:

- that a used image was good;
- that repeated use means preference;
- that an unused item is bad;
- that visual correlation proves meaning.

Those require Human Verdict or later evidence.

## Completion

After the final accepted render, BATCH-001 returns:

- Future Rearview retrospective;
- ending-haunts-beginning revisit invitations;
- image-use counts;
- VSPantry-use counts;
- final batch identity.

Material coverage is descriptive only.

## Proof obligations

Focused machine proof covers:

1. messy nested folder classification;
2. numeric album ordering;
3. folder images admitted as proposal material;
4. local video detected but not silently admitted;
5. stale VSPantry paths excluded from current availability;
6. track-affine image preference;
7. least-used coverage pressure after accepted application;
8. Future Rearview seed mutation survives inside batch preparation;
9. out-of-reservoir image/video selection is refused;
10. native bridge stages audio, image, and admitted video together;
11. native bridge cannot accept a track before activation;
12. accepted receipt advances the batch cursor;
13. completion produces material coverage plus Future Rearview retrospective.

## Authority law

```text
FOLDER PRESENCE != ADMISSION
ADMISSION != SELECTION
SELECTION != RENDER AUTHORITY
PROPHECY != AUTHORITY
RECEIPT = FACT
LEARNING = DERIVED FROM FACT
RESOLVED TIMELINE = EXECUTION AUTHORITY
```

## Deliberately not yet claimed

BATCH-001 does not yet add visible batch controls to the renderer UI.

It also does not:

- automatically KEEP a candidate;
- automatically render without the existing accepted-candidate gate;
- auto-admit album-folder video into VSPantry;
- consume multiple simultaneous image inputs;
- infer that material usage equals aesthetic success;
- publish, tag, merge, or promote the mutant to `main`.

The backend door is intentionally completed before the visible batch console.


## Visible Batch Console — issue #309

BATCH-001 now has a renderer-facing instrument surface layered above the same backend authority path.

The product interaction is deliberately **album transport**, not dashboard:

```text
CHOOSE ALBUM FOLDER
       |
       v
ORDERED ALBUM SPINE
       |
       v
DREAM SIX ALBUM GENOMES
       |
       v
EXACT SIX-UP FAMILY
  familyHash + six score addresses
       |
       v
TOAST THE RECORD
       |
       v
CURRENT TRACK
  ordinary six-up -> human KEEP -> ordinary render
       |
       v
ACCEPTED ARCHIVED RECEIPT
       |
       v
LEARN + RE-DREAM REMAINDER
       |
       v
NEXT TRACK
```

The console exposes compact evidence for:

- current Future Rearview role;
- current aperture focus;
- folder-image reservoir size;
- currently admitted VSPantry reservoir size;
- local folder video that remains unadmitted;
- completed/current/unwritten track state;
- final revisit invitations.

The visible console does **not** become a second editor or renderer.

### Album genome priming

A narrow privileged verb, `batch:prime-genome`, stages only the first manifest track into the existing candidate session and returns a deterministic root seed addressed by the manifest:

```text
album-genome:<manifestSha256>
```

The existing six-up candidate ecology generates the family. The batch controller may adopt a complete family only by recording:

- its exact `familyHash`;
- all six candidate `scoreAddress` values.

No candidate is automatically KEEP'd.

### Track handoff

After `TOAST THE RECORD`, each current track is prepared by BATCH-001 and handed back into the ordinary renderer presentation state.

The existing candidate surface receives the Future Rearview-derived generation seed.

The user still performs the ordinary crossing:

```text
six proposals
   -> human KEEP
   -> production render
   -> archived receipt
```

Only the archived receipt advances the batch cursor.

When a track closes, the console learns from its accepted outcome and automatically stages the **next proposal family**, never the next accepted winner.

### UI authority law

```text
CONSOLE != RENDER AUTHORITY
ALBUM GENOME != KEEP
AUTO-STAGE PROPOSALS != AUTO-SELECT
AUTO-STAGE PROPOSALS != AUTO-RENDER
VISIBLE PROPHECY != FACT
ARCHIVED RECEIPT = BATCH ADVANCE GATE
```

The renderer remains sandboxed and receives no general filesystem capability. Folder choice and manifest construction remain privileged main-process work through narrow IPC verbs.

### Finish contract

The album spine is the first-read object.

The primary action is:

> **TOAST THE RECORD**

The surface intentionally refuses generic dashboard furniture, equal-weight metric cards, or an arbitrary NLE timeline. It behaves like a compact sequencer/transport around the existing Haunted Toaster ecology.
