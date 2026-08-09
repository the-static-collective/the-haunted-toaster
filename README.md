# The Haunted Toaster

[![Haunted Toaster proof and package](https://github.com/the-static-collective/the-haunted-toaster/actions/workflows/haunted-toaster.yml/badge.svg)](https://github.com/the-static-collective/the-haunted-toaster/actions/workflows/haunted-toaster.yml)

> **SONG IN → FINISHED VIDEO OUT**

The Haunted Toaster is a local-first desktop instrument that turns a finished song into a finished music video and retains the score, resolved timeline, and provenance needed to witness that render.

## Repository and package authority

The repository root is the command entry point for people and automation. Its private `package.json` is deliberately an unversioned command facade; it is not an application package.

[`src/full-measure/package.json`](src/full-measure/package.json) is the sole application manifest and version authority. Its version controls Electron's application version, generated package names, and Build Info. The matching lockfile is [`src/full-measure/package-lock.json`](src/full-measure/package-lock.json). The `full-measure` directory name and legacy `fullMeasure` IPC bridge remain only for compatibility; the product is **The Haunted Toaster**.

Build Info is derived rather than hand-maintained. A source launch reports the authoritative application version and clearly identifies itself as an unpackaged source checkout. Packaging generates the commit and build timestamp immediately before Electron Builder runs. A Git tag does not override the application version: release tags and the application manifest must match as described in [release versioning](docs/RELEASE_VERSIONING.md).

## Install and verify

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

## Build and execution law

For score-driven work, the accepted `ResolvedTimeline` is the semantic authority shared by production preview and final render. Score/timeline sidecars and the receipt must describe what was actually accepted and consumed; UI state, renderer defaults, wall-clock state, and unseeded randomness are not alternate authorities. The v0.4 execution floor remains an explicit compatibility constraint while v0.5 capabilities are introduced.

Historical source ZIP snapshots are retained for archaeology under [`archive/source-zips/`](archive/source-zips/), outside the live application tree. They are not build inputs and must not be treated as current source.

Full Measure is the separate world-layer project. The Haunted Toaster is the machine that turns a song into a witnessed video.
