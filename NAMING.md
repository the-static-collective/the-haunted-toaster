# Full Measure Naming Boundary

Status: **canonical disambiguation note**

This repository contains the audiovisual renderer formerly invoked through `START_FULL_MEASURE.bat`.

It is **not** the D&D-style gamified life project also called Full Measure.

## Canonical names

### Full Measure — World Layer

Use this name for the D&D-like gamified life system that combines relevant project features into a participatory world layer.

Preferred references:

- `Full Measure — World Layer`
- `Full Measure RPG`
- `Full Measure / world-layer`

Do not use `the-haunted-toaster` for this project.

### The Haunted Toaster — Video Receipt Renderer

Use this name for the local-first system in this repository that turns songs into finished videos and produces cryptographic video receipts.

Preferred references:

- `The Haunted Toaster`
- `The Haunted Toaster — Video Receipt Renderer`
- `Full Measure Video Receipt` only when preserving historical naming context

Repository:

- `the-static-collective/the-haunted-toaster`

Current purpose:

- MP3/WAV to finished 1080p MP4;
- optional image and lyrics;
- visual garments;
- audio-reactive rendering;
- cryptographic video receipts;
- local/offline rendering after setup.

## Collision rule

An unqualified reference to **Full Measure** means the **World Layer** project.

The renderer must be called **The Haunted Toaster** in new documentation, issues, branches, and conversation summaries.

Use `Full Measure Video Receipt` only as a legacy alias or when referring to the existing launcher name.

## Future rename pressure

The launcher `START_FULL_MEASURE.bat` is a historical collision source. A later implementation pass should consider adding or replacing it with a clearly named entry point such as:

```text
START_HAUNTED_TOASTER.bat
```

The old launcher may remain temporarily as a compatibility shim, but it should print a notice identifying the product as The Haunted Toaster.

## One-line distinction

> Full Measure is the world you play inside. The Haunted Toaster is the machine that turns a song into a witnessed video.
