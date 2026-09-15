# The Haunted Toaster — application package

> **SONG IN → FINISHED VIDEO OUT**

This directory is the versioned application package for The Haunted Toaster. The repository-root README is the product overview; this file describes the executable package boundary.

Human release epoch: **HAUNTED TOASTER — BETA 0.0.0**  
Application package identity: **`0.0.0-beta.0`**

Draft PR #275 (`beta/reconcile-0.0.0`) is the proposed reconciliation carrier. `main` remains product authority until that carrier lands.

The Haunted Toaster is a local-first deterministic music-video instrument. It analyzes a finished song, builds a bounded candidate ecology, lets the human explicitly decide continuation with KEEP / SCRAPE, resolves a kept creature into one exact timeline, and renders a complete 1920×1080 music video with provenance artifacts.

## Current invariant

The ordinary BETA path is:

1. Choose or drop a finished song.
2. Optionally provide artwork/video material, title, artist, and lyrics.
3. Inspect the song and build deterministic response evidence.
4. Generate a bounded six-up candidate family.
5. Focus may inspect a creature but does not grant ancestry.
6. **KEEP** grants continuation authority to the exact selected creature, or **SCRAPE** rejects the family and deterministically searches again without negative-preference inference.
7. Resolve the kept candidate to an exact `ResolvedTimeline`.
8. Render that exact accepted authority.
9. Receive one playable full-song MP4 plus evidence artifacts.

The ordinary candidate render handoff requires KEEP. The explicitly forced TEST 6 witness path remains separate and declared.

The selected song remains the sole soundtrack. Haunted Toaster does not regenerate, remix, stretch, truncate, or add sound.

## Current creative machinery

The active reconciliation carrier includes:

- deterministic six-up candidate families;
- observational focus plus explicit `keep()` / `scrape()` continuation transitions;
- KEEP-required ordinary candidate render authority;
- VisualScore addressing and exact timeline replay evidence;
- MUTATE, exact two-parent CROSS, STOMP, and CONVERGE/frontier exploration as deeper substrate;
- role-separated branch diversity;
- candidate genealogy and accepted-history plumbing;
- APERTURE, SPEAK, GRAB, GROW, and BODY topology/composition behavior;
- deterministic TEST 6 witnesses kept outside ordinary mutation ecology;
- L BRANCH response/mix-plan machinery;
- admitted foreign video material and existing digestion descendants;
- Haunted Typography and lyric/ghost residue;
- local Listener-assisted lyric timing with human correction authority;
- Dogram `comparison-only` sidecar evidence;
- deterministic Haunted Haiku `descriptive-only` publication copy;
- score/timeline/receipt/subtitle evidence around accepted renders.

The machine owns reproductive operations; ordinary human interaction owns continuation. Development controls may still expose deeper machinery, but manually exercising each internal verb is not a BETA 0.0.0 release gate.

See [`../../docs/BETA_0.0.0_TRUTH_FLOOR.md`](../../docs/BETA_0.0.0_TRUTH_FLOOR.md) and [`../../docs/superpowers/specs/2026-09-15-madd-clown-crazy-slots-design.md`](../../docs/superpowers/specs/2026-09-15-madd-clown-crazy-slots-design.md).

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
npm --prefix src/full-measure test
npm --prefix src/full-measure run smoke
npm --prefix src/full-measure run pack
npm --prefix src/full-measure audit --omit=dev --audit-level=high
```

GitHub Actions also performs the production renderer/browser witness. BETA 0.0.0 additionally requires Windows Setup + Portable artifacts and one normal packaged-use witness from the same exact head.

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

BETA 0.0.0 is a reconciliation cut, not a declaration that every future Toaster idea is complete. Motion-mask work, temporal Video modes, Aperture Shape, HyperFood/HyperFrames descendants, broader cross-session taste learning, and other future feature lanes remain outside this release floor.

The Windows package is unsigned and may trigger SmartScreen.
