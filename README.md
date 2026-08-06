# The Haunted Toaster

> **SONG IN → FINISHED VIDEO OUT**

The Haunted Toaster is a local-first desktop instrument that turns a finished song into one complete 1080p music video and writes a cryptographic Video Receipt beside it.

## 0.4.0 demo candidate

This branch of the instrument includes:

- MP3, WAV, M4A, AAC, and FLAC ingestion;
- optional image, title, artist, and lyrics;
- Porchlight, Wire Orchard, and Absolute Residual visual garments;
- audio-reactive motion and section-aware changes;
- plain, LRC, SRT, VTT, and timestamped JSON lyrics;
- optional verified local lyric Listener on 64-bit Windows;
- manual lyric timing and correction;
- preview/render cue-selection parity;
- frame-rate-independent motion timing;
- progress, safe cancellation, stream validation, and duration proof;
- MP3/AAC stream copy where the MP4 container permits it;
- source/output hashes and render provenance in every accepted receipt.

The application source lives in [`src/full-measure/`](src/full-measure/). The folder name and legacy `fullMeasure` IPC bridge are retained temporarily for compatibility; the canonical product name is **The Haunted Toaster**.

## Run on Windows

Install Node.js 22 or newer, then double-click:

```text
START_HAUNTED_TOASTER.bat
```

The first setup downloads dependencies. Rendering is local and offline afterward.

For the exact presentation path, claims, boundaries, and release gate, use the [0.4.0 demo runbook](src/full-measure/DEMO.md).

## Verify from source

```bash
cd src/full-measure
npm ci
npm run check
npm test
npm run smoke
```

The root GitHub Actions workflow runs the same proof on pull requests and `main`. Manual runs and version tags can also produce an unsigned Windows installer and portable executable.

## Current boundary

Version 0.4.0 stabilizes and presents the existing renderer. The portable `VisualScore`, deterministic mutation engine, circular and mirrored topology, score diff/replay, and score breeding architecture remain intentionally outside this demo cut.

Full Measure is the separate world-layer project. The Haunted Toaster is the machine that turns a song into a witnessed video.
