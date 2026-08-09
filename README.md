# The Haunted Toaster

[![Haunted Toaster proof and package](https://github.com/the-static-collective/the-haunted-toaster/actions/workflows/haunted-toaster.yml/badge.svg)](https://github.com/the-static-collective/the-haunted-toaster/actions/workflows/haunted-toaster.yml)

> **SONG IN → FINISHED VIDEO OUT**

The Haunted Toaster is a local-first music-video instrument. Give it a finished song, optional artwork, and lyrics; it analyzes the song, proposes a deterministic six-up of visual creatures, lets you choose, lock, and mutate what you like, then renders the winner as a finished video with enough evidence to replay and inspect what happened.

It is not a preset browser and it is not a cloud video service. The machine keeps a canonical visual score and resolved timeline, uses the accepted timeline for preview and final render, and emits the artifacts that witnessed the render.

**Windows prerelease builds:** [GitHub Releases](https://github.com/the-static-collective/the-haunted-toaster/releases)

## What it does now

```text
song + optional art + lyrics
        ↓
      analysis
        ↓
 deterministic six-up
        ↓
 choose / lock / mutate
        ↓
 accepted VisualScore → ResolvedTimeline
        ↓
 preview and final render
        ↓
 video + score + timeline + receipt + SRT/VTT
```

- **Six-up generation.** A song can produce six deterministic candidate treatments instead of one opaque roll of the dice.
- **Choose, lock, mutate.** Keep the parts that are working and mutate the rest without giving up replayability.
- **Haunted visual language.** Garments, motion, palettes, materials, cameras, and visual topologies are selected through bounded deterministic grammars rather than a generic preset picker.
- **Lyric timing.** The lyric track is normalized once and shared by preview, rendered lyrics, and exported subtitle timing.
- **Subtitle sidecars.** Successful score-driven renders emit deterministic `.en.srt` and `.en.vtt` files beside the video, with their hashes recorded in the receipt.
- **Transport choice.** H.264 remains the universal/default output path; HEVC is available as an experimental efficient transport profile.
- **Local-first execution.** Rendering happens on the machine. After setup, the core render path does not require a cloud rendering service.
- **Witnessed output.** The finished video travels with its accepted score, resolved timeline, and receipt instead of pretending the pixels appeared from nowhere.

## The output bundle

A successful score-driven render produces a small evidence bundle around the finished video:

```text
<name>.mp4
<name>.score.json
<name>.timeline.json
<name>.video-receipt.json
<name>.en.srt
<name>.en.vtt
```

The receipt records the media result and provenance needed to verify the admitted render, including the subtitle sidecar filenames and SHA-256 hashes. The exact accepted `ResolvedTimeline` remains the semantic authority for preview and render.

## Why the toaster is built this way

The project treats creative variation and execution authority as different jobs.

A score may propose something strange. Mutation may make it stranger. But once a candidate is accepted, the renderer does not secretly reinterpret it, invent new entropy, or run a second lyric clock. The same admitted timeline is what preview and production consume.

That gives the appliance a useful combination: it can behave like a haunted instrument while still leaving a reproducible trail behind the finished artifact.

## Current status

The project is in **v0.5 prerelease development**. Windows builds are published through [GitHub Releases](https://github.com/the-static-collective/the-haunted-toaster/releases), and `main` is continuously exercised by the repository's proof-and-package workflow.

Expect an alpha: the creative system is actively expanding, and some surfaces are intentionally still experimental. The project nevertheless has an executable end-to-end path from song intake through candidate generation and final local video render.

## Install and verify from source

Node.js 22 or newer is required. Install the application dependencies from the locked manifest, then use the root proof command:

```bash
npm --prefix src/full-measure ci
npm run verify
```

`verify` runs the source checks, deterministic tests, and smoke renders. It is the same consolidated proof entry point used by GitHub Actions.

## Start from source

```bash
npm run start
```

On Windows, `START_HAUNTED_TOASTER.bat` remains the double-click entry point. The first setup downloads dependencies; rendering is local and offline afterward.

## Build Windows artifacts

```bash
npm --prefix src/full-measure ci
npm run dist:win
```

This creates unsigned Windows installer and portable artifacts under `src/full-measure/release/`. It does not tag or publish a release. The root workflow builds artifacts only for a manual run or a version tag, and publishes a GitHub prerelease only from a matching version tag.

## Repository and package authority

The repository root is the command entry point for people and automation. Its private `package.json` is deliberately an unversioned command facade; it is not an application package.

[`src/full-measure/package.json`](src/full-measure/package.json) is the sole application manifest and version authority. Its version controls Electron's application version, generated package names, and Build Info. The matching lockfile is [`src/full-measure/package-lock.json`](src/full-measure/package-lock.json). The `full-measure` directory name and legacy `fullMeasure` IPC bridge remain only for compatibility; the product is **The Haunted Toaster**.

Build Info is derived rather than hand-maintained. A source launch reports the authoritative application version and clearly identifies itself as an unpackaged source checkout. Packaging generates the commit and build timestamp immediately before Electron Builder runs. A Git tag does not override the application version: release tags and the application manifest must match as described in [release versioning](docs/RELEASE_VERSIONING.md).

## Build and execution law

For score-driven work, the accepted `ResolvedTimeline` is the semantic authority shared by production preview and final render. Score/timeline sidecars and the receipt must describe what was actually accepted and consumed; UI state, renderer defaults, wall-clock state, and unseeded randomness are not alternate authorities. The v0.4 execution floor remains an explicit compatibility constraint while v0.5 capabilities are introduced.

Historical source ZIP snapshots are retained for archaeology under [`archive/source-zips/`](archive/source-zips/), outside the live application tree. They are not build inputs and must not be treated as current source.

Full Measure is the separate world-layer project. The Haunted Toaster is the machine that turns a song into a witnessed video.
