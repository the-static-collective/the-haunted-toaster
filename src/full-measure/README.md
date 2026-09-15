# The Haunted Toaster — application package

> **SONG IN → FINISHED VIDEO OUT**

This directory contains the application package for The Haunted Toaster. The repository root README is the current product overview; this file describes the executable package boundary.

The Haunted Toaster is a local-first deterministic music-video instrument. It analyzes a finished song, builds a bounded candidate ecology, resolves accepted creative authority into one exact timeline, and renders a complete 1920×1080 music video with provenance artifacts.

The current v0.5 development machine is substantially beyond the historical 0.4 demo cut. Portable VisualScore, deterministic candidate generation, mutation, crossing, topology, genealogy, replay evidence, and six-up candidate ecology are present in current development work and must not be described as merely future architecture.

## Current invariant

A successful score-driven path is:

1. Choose or drop a finished song.
2. Optionally provide artwork/video material, title, artist, and lyrics.
3. Inspect the song and build deterministic response evidence.
4. Generate a bounded six-up candidate family.
5. Resolve one accepted candidate to an exact `ResolvedTimeline`.
6. Render that exact accepted authority.
7. Receive one playable full-song MP4 plus evidence artifacts.

The selected song remains the sole soundtrack. Haunted Toaster does not regenerate, remix, stretch, truncate, or add sound.

## Current creative machinery

The active development carrier includes:

- deterministic six-up candidate families;
- VisualScore addressing and exact timeline replay evidence;
- MUTATE, exact two-parent CROSS, STOMP, and CONVERGE/frontier exploration;
- role-separated branch diversity;
- candidate genealogy and accepted-history plumbing;
- APERTURE, SPEAK, GRAB, GROW, and BODY topology/composition behavior;
- deterministic TEST 6 witnesses kept outside ordinary mutation ecology;
- L BRANCH response/mix-plan machinery;
- admitted foreign video material and developing digestion paths;
- Haunted Typography and lyric/ghost residue;
- local Listener-assisted lyric timing with human correction authority;
- score/timeline/receipt/subtitle evidence around accepted renders.

The intended ordinary product interface is being compressed toward **KEEP / SCRAPE**: the Toaster owns reproductive operations and the human owns continuation. That interface is design direction, not yet a claim about the current UI. See the repository-root README and [`../../docs/superpowers/specs/2026-09-15-madd-clown-crazy-slots-design.md`](../../docs/superpowers/specs/2026-09-15-madd-clown-crazy-slots-design.md).

## Lyrics

Paste plain lyrics or import LRC, SRT, VTT, or timestamped JSON.

- Plain text receives honestly approximate spacing across the song.
- LRC locks each line to its vocal entrance.
- SRT and VTT preserve supplied cue starts and ends.
- Timestamped JSON accepts Haunted Toaster cues and common Whisper/WhisperX-style segment, transcription, and word arrays.
- Word-only JSON is grouped into readable phrases without replacing supplied words.

On 64-bit Windows, the optional local **Listener** can lend timing to supplied English lyrics. The transcript does not become lyric authority. Uncertain or unmatched lines remain available for human correction.

See [`docs/LYRIC_TIMING.md`](docs/LYRIC_TIMING.md) and [`docs/AUTO_SYNC.md`](docs/AUTO_SYNC.md).

## Run

Requirements:

- Node.js 22 or newer;
- npm.

From the repository root:

```bash
npm --prefix src/full-measure ci
npm run start
```

On Windows, `START_HAUNTED_TOASTER.bat` remains the double-click entry point.

## Prove the renderer and application

From the repository root:

```bash
npm --prefix src/full-measure ci
npm run verify
```

The proof path exercises deterministic tests and smoke renders. GitHub Actions uses the same consolidated proof entry point.

## Audio preservation

- MP3 and AAC streams are copied into MP4 where the container permits it.
- WAV/PCM and FLAC are encoded to high-quality AAC for portable MP4 playback.
- Timing, pitch, channel layout, and full-song duration are preserved within accepted validation tolerance.
- The receipt records which path was used.

## Architecture

- `src/align/` — Listener setup, local transcription, matching, sidecars, and correction data;
- `src/generation/` — VisualScore, candidate ecology, diversity, mutation/cross/frontier/topology composition machinery;
- `src/memory/` — receipt archive, verdict/projection/capsule primitives and preserved memory experiments;
- `src/render/` — analysis, procedural artwork, FFmpeg rendering, validation, and receipts;
- `src/main.cjs` — Electron/main process and candidate-session authority boundary;
- `src/preload.cjs` — isolated desktop bridge;
- `src/renderer/` — product UI, candidate interaction, Listener controls, and development surfaces;
- `scripts/` — smoke/proof/package support;
- `tests/` — deterministic generation, authority, interaction, rendering, alignment, and receipt proof.

## Honest boundary

The application is still an alpha/prerelease machine. Human witness is finishing the current WALK perceptual delta, some development controls expose more internal machinery than the intended KEEP/SCRAPE appliance, memory orchestration is not yet a finished cross-session product loop, and branch-carrier reconciliation with `main` must remain deliberate.

The Windows package is unsigned and may trigger SmartScreen.
