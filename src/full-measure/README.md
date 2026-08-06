# The Haunted Toaster

> Drop in a song. Receive the whole music video.

The Haunted Toaster is a local-first desktop music-video instrument. It turns a finished song into one complete 1920×1080 MP4 using an optional image, a procedural visual garment, audio-reactive motion, and an optional lyric layer. The core render path requires no account, cloud upload, subscription, API key, or media credits.

Every accepted render also produces a **Video Receipt** containing source and output hashes, media facts, detected energy sections, render settings, lyric timing provenance, audio handling, and post-render duration validation.

## Version 0.4.0 demo cut

This release candidate combines the 0.3.1 instrument with the repaired lyric and animation clock:

- frame-rate-independent FFmpeg motion timing;
- one normalized cue timeline shared by preview and render;
- exact cue-boundary selection without swallowed gaps or arbitrary extensions;
- deterministic regression tests for fractional boundaries, long songs, gaps, and frame-rate expressions;
- canonical Haunted Toaster packaging and launcher;
- root-level CI that proves tests, audit, smoke renders, receipts, and optional Windows packaging.

See [`DEMO.md`](DEMO.md) for the presentation path and release gate.

## Core invariant

The instrument succeeds only when this path succeeds:

1. Choose or drop a finished song.
2. Optionally add one image, title, artist, and lyrics.
3. Choose Porchlight, Wire Orchard, or Absolute Residual.
4. Click **Make full video**.
5. Receive one playable, full-song MP4 with audio, video, and an accepted receipt.

Generated clips and online models are not part of the critical path.

## Lyrics

Paste plain lyrics or import LRC, SRT, VTT, or timestamped JSON.

- Plain text receives honestly approximate spacing across the song.
- LRC locks each line to its vocal entrance.
- SRT and VTT preserve supplied cue starts and ends.
- Timestamped JSON accepts Haunted Toaster cues and common Whisper/WhisperX-style segment, transcription, and word arrays.
- Word-only JSON is grouped into readable phrases without replacing the supplied words.

On 64-bit Windows, the optional local **Listener** can lend timing to supplied English lyrics. It downloads a verified whisper.cpp CPU binary and compact model once, then works locally. The transcript never becomes lyric authority. Uncertain or unmatched lines remain visible for timecode, drag, nudge, or Spacebar correction.

See [`docs/LYRIC_TIMING.md`](docs/LYRIC_TIMING.md) and [`docs/AUTO_SYNC.md`](docs/AUTO_SYNC.md).

## Run

Requirements:

- Node.js 22 or newer;
- npm.

On Windows, double-click:

```text
START_HAUNTED_TOASTER.bat
```

Or run directly:

```bash
npm ci
npm start
```

The first setup requires internet access for dependencies. Rendering is local afterward. The historical `START_FULL_MEASURE.bat` and `fullMeasure` preload bridge remain temporarily for compatibility.

## Prove the renderer

```bash
npm run check
npm test
npm audit --omit=dev --audit-level=high
npm run smoke
```

The smoke proof creates short multi-section audio fixtures, renders complete 1080p outputs, validates their streams and duration, and writes MP4/receipt pairs to `test-artifacts/`.

## Audio preservation

The selected song remains the sole soundtrack. The Haunted Toaster never regenerates, remixes, stretches, truncates, or adds sound.

- MP3 and AAC streams are copied into MP4 where the container permits it.
- WAV/PCM and FLAC are encoded to high-quality 320 kbps AAC for portable MP4 playback.
- Timing, pitch, channel layout, and full-song duration are preserved within the accepted validation tolerance.

The receipt records which path was used.

## Architecture

- `src/align/` — verified Listener setup, local transcription, monotonic lyric matching, sidecars, and correction data;
- `src/render/` — analysis, procedural artwork, FFmpeg rendering, validation, and receipts;
- `src/main.cjs` — narrow Electron IPC boundary;
- `src/preload.cjs` — isolated desktop bridge and product shell;
- `src/renderer/` — dependency-free interface;
- `scripts/smoke-render.cjs` — end-to-end render proof;
- `tests/` — deterministic analysis, lyrics, renderer, alignment, and receipt tests.

## Honest boundary

The compact Listener targets English vocals on 64-bit Windows. Dense mixes, extreme effects, overlapping singers, and sustained syllables may need human correction. The Windows package is unsigned and may trigger SmartScreen.

Version 0.4.0 does not yet contain the planned portable `VisualScore`, deterministic mutation engine, circular or mirrored-ring topology, score breeding, or replay/diff interface. Those are the next architectural generation and are deliberately excluded from this stable demo cut.
