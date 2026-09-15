# The Haunted Toaster

[![Haunted Toaster proof and package](https://github.com/the-static-collective/the-haunted-toaster/actions/workflows/haunted-toaster.yml/badge.svg)](https://github.com/the-static-collective/the-haunted-toaster/actions/workflows/haunted-toaster.yml)

> **SONG IN → FINISHED VIDEO OUT**

The Haunted Toaster is a local-first deterministic music-video instrument. Give it a finished song, optional artwork/video material, and lyrics; it analyzes the song, proposes a six-up of visual creatures, preserves exact creative lineage, and can render an accepted creature as a complete witnessed music video.

The long-term product idea is deliberately smaller than the machine underneath it:

> **The Toaster owns possibility. The human owns continuation.**

The intended ordinary interaction is moving toward **KEEP / SCRAPE**. The human should not need to operate the genome. The Toaster owns mutation, crossing, divergence, topology, listening, composition, and the rest of the reproductive machinery; the human decides whether a creature gets to continue.

That compressed interface is still being migrated. Current WALK builds expose more of the underlying candidate controls for development and witness work.

> **A ghost is continuity without the original body. A receipt is continuity without the original event.**

The video is the performance. The receipt is the ghost of that performance: residual proof that the encounter happened on these terms, with this score and timeline, producing these hashes.

## What exists now

Current executable development includes substantially more than the old 0.4 demo surface:

```text
song + optional art / admitted video + lyrics
        ↓
      analysis
        ↓
 deterministic six-up candidate ecology
        ↓
 VisualScore + genealogy + topology / listening / composition
        ↓
 MUTATE / CROSS / STOMP / CONVERGE machinery
        ↓
 accepted ResolvedTimeline
        ↓
 preview and final render
        ↓
 video + score + timeline + receipt + subtitle sidecars
```

The current machine includes:

- **Deterministic six-up generation.** A song produces a bounded family of materially different visual creatures rather than one opaque roll.
- **VisualScore and exact replay evidence.** Candidate identity, derivation, accepted score, and resolved timeline remain inspectable.
- **Evolutionary machinery.** Deterministic MUTATE, exact two-parent CROSS, STOMP for farther descendants, locks, genealogy, and accepted-history plumbing exist in the current development carrier.
- **Diversity and frontier exploration.** Branch exploration uses role-separated candidate slots; CONVERGE can deterministically target a least-visited lawful topology × motion × material region.
- **Topology language.** APERTURE, SPEAK, GRAB, GROW, and BODY participate in the current composition system, with deterministic TEST 6 witnesses kept separate from ordinary ecology.
- **L BRANCH / listening composition.** Response evidence and mix-plan machinery can alter how visual events listen to the song without becoming an audio remix.
- **Listener lyric timing.** The optional local Listener can lend timing to supplied English lyrics while preserving human lyric authority and correction anchors.
- **Foreign video material.** Short admitted video material can participate in the composition path; digestion/metabolism work is still developing.
- **Haunted typography and lyric residue.** Typography treatment, role-specific safety, and non-authoritative lyric/ghost residue are part of the visual language.
- **Local-first execution.** Rendering happens on the machine. The selected song remains the sole soundtrack.
- **Witnessed output.** Accepted renders travel with score/timeline/receipt evidence rather than pretending the pixels appeared from nowhere.

## Product direction: KEEP / SCRAPE

The ordinary interface is being compressed around one constitutional distinction:

```text
focus != verdict
KEEP = continuation permission
SCRAPE = local lineage extinction
verdict != feature preference
```

KEEP should not mean “learn that I like this color/topology/motion.” It means only that this exact creature may survive as lawful ancestry.

SCRAPE should not become six negative ratings or a permanent feature blacklist. It means that none of the current family receives continuation. The Toaster chooses the next lawful reproductive operation and leaves a receipt for that choice.

The design is recorded in [`docs/superpowers/specs/2026-09-15-madd-clown-crazy-slots-design.md`](docs/superpowers/specs/2026-09-15-madd-clown-crazy-slots-design.md).

## The output bundle

A successful score-driven render produces an evidence bundle around the finished video:

```text
<name>.mp4
<name>.score.json
<name>.timeline.json
<name>.video-receipt.json
<name>.en.srt
<name>.en.vtt
```

The receipt records the media result and provenance needed to verify the admitted render. The exact accepted `ResolvedTimeline` remains the semantic authority shared by preview and final render.

## Why the toaster is built this way

Creative variation and execution authority are different jobs.

A candidate may be strange. Mutation may make it stranger. STOMP may deliberately leave the local neighborhood. CONVERGE may seek underexplored lawful territory. But once a candidate is accepted, the renderer does not secretly reinterpret it, invent new entropy, or run a second lyric clock.

Likewise, human judgment and machine interpretation are different jobs. A KEEP verdict is evidence of continuation, not permission to silently construct a universal model of the human's taste.

That lets the appliance remain haunted without becoming unaccountable.

## Current carrier status

The project is in **v0.5 prerelease development**.

The active WALK carrier currently contains much of the candidate/evolution/topology/composition machinery. `main` also contains later independent work that must be deliberately re-ported or composed rather than blindly merged. In particular, current development treats branch identity and provenance as authority boundaries.

A current WALK package has passed the repository proof-and-package workflow. Human witness is still closing the remaining WALK perceptual delta before a landing decision.

Expect an alpha: the machine is executable end to end, but several product surfaces are intentionally still experimental or more exposed than the intended final appliance.

## Install and verify from source

Node.js 22 or newer is required.

```bash
npm --prefix src/full-measure ci
npm run verify
```

`verify` runs source checks, deterministic tests, and smoke renders. It is the consolidated proof entry point used by GitHub Actions.

## Start from source

```bash
npm run start
```

On Windows, `START_HAUNTED_TOASTER.bat` remains the double-click entry point. The first setup downloads dependencies; rendering is local afterward.

## Build Windows artifacts

```bash
npm --prefix src/full-measure ci
npm run dist:win
```

This creates unsigned Windows installer and portable artifacts under `src/full-measure/release/`. It does not tag or publish a release.

## Repository and package authority

The repository root is the command entry point for people and automation. Its private `package.json` is an unversioned command facade, not an application package.

[`src/full-measure/package.json`](src/full-measure/package.json) is the sole application manifest and version authority. Its version controls Electron's application version, generated package names, and Build Info. The matching lockfile is [`src/full-measure/package-lock.json`](src/full-measure/package-lock.json).

The `full-measure` directory name and legacy `fullMeasure` IPC bridge remain for compatibility. The product is **The Haunted Toaster**.

## Build and execution law

For score-driven work, the accepted `ResolvedTimeline` is the semantic authority shared by production preview and final render. Score/timeline sidecars and the receipt must describe what was actually accepted and consumed; UI state, renderer defaults, wall-clock state, and unseeded randomness are not alternate authorities.

Historical source ZIP snapshots are retained for archaeology under [`archive/source-zips/`](archive/source-zips/), outside the live application tree. They are not build inputs and must not be treated as current source.

Full Measure is the separate world-layer project. The Haunted Toaster is the machine that turns a song into a witnessed video.
