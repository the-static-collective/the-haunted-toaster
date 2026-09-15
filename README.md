# The Haunted Toaster

[![Haunted Toaster proof and package](https://github.com/the-static-collective/the-haunted-toaster/actions/workflows/haunted-toaster.yml/badge.svg)](https://github.com/the-static-collective/the-haunted-toaster/actions/workflows/haunted-toaster.yml)

> **SONG IN → FINISHED VIDEO OUT**

The Haunted Toaster is a local-first deterministic music-video instrument. Give it a finished song, optional artwork/video material, and lyrics; it analyzes the song, proposes a six-up of visual creatures, preserves exact creative lineage, and can render a kept creature as a complete witnessed music video.

The product law is deliberately smaller than the machine underneath it:

> **The Toaster owns possibility. The human owns continuation.**

The ordinary BETA interaction is **KEEP / SCRAPE**. The human does not need to operate the genome. The Toaster owns mutation, crossing, divergence, topology, listening, composition, and the rest of the reproductive machinery; the human decides whether an exact creature may continue.

```text
focus != verdict
focus != ancestry
KEEP = continuation permission
SCRAPE = reject this family and search again
SCRAPE != negative feature preference
```

> **A ghost is continuity without the original body. A receipt is continuity without the original event.**

The video is the performance. The receipt is the ghost of that performance: residual proof that the encounter happened on these terms, with this score and timeline, producing these hashes.

## BETA 0.0.0 release cut

Draft PR **#275** (`beta/reconcile-0.0.0`) is the single proposed BETA 0.0.0 reconciliation carrier. `main` remains product authority until that PR lands.

Human epoch: **HAUNTED TOASTER — BETA 0.0.0**  
Application package identity: **`0.0.0-beta.0`**

PR #274 is superseded as a release carrier and retained only as provenance. It contains no executable continuation truth that should be merged over #275.

The compact release truth is recorded in [`docs/BETA_0.0.0_TRUTH_FLOOR.md`](docs/BETA_0.0.0_TRUTH_FLOOR.md). The future-work registry is [`docs/BETA_0.0.1_FRONTIER.md`](docs/BETA_0.0.1_FRONTIER.md).

Scope is frozen for this cut. Motion-mask work, temporal Video modes, Aperture Shape, HyperFood/HyperFrames descendants, broader taste-learning, and other new feature lanes are **not** BETA 0.0.0 blockers.

## What exists now

The proposed BETA carrier executes this ordinary path:

```text
song + optional art / admitted video + lyrics
        ↓
      analysis
        ↓
 deterministic six-up candidate ecology
        ↓
 focus = observation only
        ↓
     KEEP / SCRAPE
        ↓
 KEEP-authorized VisualScore / ResolvedTimeline
        ↓
 preview and final render
        ↓
 video + score + timeline + Dogram + Haunted Haiku + receipt + subtitles
```

The current machine includes:

- **Deterministic six-up generation.** A song produces a bounded family of materially different visual creatures rather than one opaque roll.
- **Explicit continuation authority.** `keep()` admits the exact creature as lawful ancestry; `scrape()` rejects the current family and deterministically searches again without constructing a negative-preference model.
- **KEEP-required ordinary render handoff.** The ordinary candidate path refuses a final candidate render that has not been explicitly kept. TEST 6 forced witness remains a separate declared exception.
- **VisualScore and exact replay evidence.** Candidate identity, derivation, accepted score, and resolved timeline remain inspectable.
- **Evolutionary machinery.** Deterministic MUTATE, exact two-parent CROSS, STOMP, CONVERGE, locks, genealogy, and accepted-history plumbing exist as deeper machine substrate. They are not ordinary-user release gates.
- **Diversity and frontier exploration.** Branch exploration uses role-separated candidate slots; CONVERGE can deterministically target a least-visited lawful topology × motion × material region.
- **Topology language.** APERTURE, SPEAK, GRAB, GROW, and BODY participate in the current composition system, with deterministic TEST 6 witnesses kept separate from ordinary ecology.
- **L BRANCH / listening composition.** Response evidence and mix-plan machinery can alter how visual events listen to the song without becoming an audio remix.
- **Listener lyric timing.** The optional local Listener can lend timing to supplied English lyrics while preserving human lyric authority and correction anchors.
- **Foreign video material.** Short admitted video material can participate in the composition path; deeper digestion/metabolism remains future work.
- **Haunted typography and lyric residue.** Typography treatment, role-specific safety, and non-authoritative lyric/ghost residue are part of the visual language.
- **Dogram and Haunted Haiku composition.** Dogram remains `comparison-only`; Haunted Haiku remains deterministic `descriptive-only` publication copy. Neither silently acquires render or interpretive authority.
- **Local-first execution.** Rendering happens on the machine. The selected song remains the sole soundtrack.
- **Witnessed output.** Accepted renders travel with score/timeline/receipt evidence rather than pretending the pixels appeared from nowhere.

## KEEP / SCRAPE law

KEEP does not mean “learn that I like this color/topology/motion.” It means only that this exact creature may survive as lawful ancestry.

SCRAPE does not become six negative ratings or a permanent feature blacklist. It means that none of the current family receives continuation. The Toaster chooses the next lawful reproductive operation and leaves a receipt for that choice.

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

Additional receipt-derived Dogram and Haunted Haiku evidence is composed without changing the accepted render authority.

The receipt records the media result and provenance needed to verify the admitted render. The exact accepted `ResolvedTimeline` remains the semantic authority shared by preview and final render.

## Why the toaster is built this way

Creative variation and execution authority are different jobs.

A candidate may be strange. Mutation may make it stranger. STOMP may deliberately leave the local neighborhood. CONVERGE may seek underexplored lawful territory. But once a candidate is kept, the renderer does not secretly reinterpret it, invent new entropy, or run a second lyric clock.

Likewise, human judgment and machine interpretation are different jobs. A KEEP verdict is evidence of continuation, not permission to silently construct a universal model of the human's taste.

That lets the appliance remain haunted without becoming unaccountable.

## Release proof

BETA 0.0.0 is cut only from one exact head after all of the following agree:

- locked install and consolidated full suite;
- candidate/render smoke, including KEEP → render;
- production dependency audit;
- production browser/UI witness;
- Dogram/Haiku receipt composition;
- Windows Setup + Portable artifacts built from that exact head;
- recorded commit SHA, tree, workflow/run, artifact digest, and Build Info;
- one normal packaged use: **song in → six → KEEP/SCRAPE → finished video**;
- explicit exact-head landing approval.

The final packaged-use witness is intentionally ordinary use. It is not a requirement to manually summon every internal verb.

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
