# Haunted Toaster alpha.8 — Creative Expansion Design

**Status:** approved design, awaiting written-spec review  
**Target:** `0.5.0-alpha.8`  
**Base:** current `main` at `56e006123f0231ac3a92f71762d25eeae15fc19a`  
**Known-good ancestor:** `archive/gold-star-renderer-alpha7`

## Product thesis

alpha.7 proved that the Haunted Toaster can already produce strong, coherent, song-responsive visual work. alpha.8 should therefore stop asking the existing renderer to prove itself again.

The next version should make a real creative step while preserving the field-proven composer:

> **Same proven creature. New way to summon it. New relationship to the source image. Better proof that the appliance actually contains what we built.**

The release is deliberately narrower than the full research backlog. Its center is:

1. preserve future native render-failure evidence without requiring reproduction of the old crash;
2. make the real renderer UI witnessable at the commit/PR boundary;
3. replace the narrow Starting Field furniture with Seven Toast Feels;
4. add a bounded first Native Color Witness / Chromatic Decompression mechanic;
5. preserve the distinction between creative choice and downstream transport;
6. package and witness the resulting Windows appliance as `0.5.0-alpha.8`.

## Release law

alpha.8 is not a renderer rewrite.

The existing deterministic chain remains authoritative:

```text
source evidence
  -> candidate generation / accepted VisualScore
  -> ResolvedTimeline
  -> shared preview + production compiler
  -> Witness Window
  -> transport encoding
  -> receipt
```

New alpha.8 features must enter through recorded, versioned inputs or derived plans upstream of execution. No renderer-local improvisation, ambient randomness, preview-only semantics, or hidden UI authority may be introduced.

## Preserved ancestor

The Gold Star alpha.7 renderer remains the route back to known-good behavior.

Preserve:

- current six-up diversity;
- landed visual-language behavior, including STOMP / outer-rail machinery;
- Possession Arc Slice A;
- section-relative Color Drift;
- Primitive Field and Atmosphere behavior;
- Witness Window semantics;
- current deterministic typography and lyric-resonance behavior;
- existing VisualScore / ResolvedTimeline replay meaning under pinned renderer policy.

alpha.8 may add new lawful inputs and plans, but must not silently reinterpret old accepted artifacts.

---

# Slice 0 — Failure evidence becomes insurance, not a release hostage

## Decision

The historical Windows FFmpeg `0xC0000005` specimen is no longer required to reproduce before alpha.8 can move forward.

Issue #116 remains valid diagnostic history, but the release-blocking requirement changes from:

```text
reproduce and solve the old crash before moving on
```

to:

```text
preserve enough evidence that the next recurrence can be isolated honestly
```

PR #119 is the intended floor: abnormal score-driven FFmpeg exits preserve a compact sibling evidence bundle containing the accepted score/timeline, filter graph, arguments, full stderr, build/source/compiler identities, and last render progress.

## Law

> **Preserve the failed performance before trying to teach it not to fail.**

No candidate ban, random retry, speculative swscale workaround, or renderer simplification belongs in alpha.8 without a newly preserved failing specimen proving the seam.

## Release disposition

- Land/retain the diagnostics-only preservation slice when its own proof is acceptable.
- Keep #116 open or explicitly field-blocked until a real future specimen exists.
- Lack of reproduction of the historical candidate is **not** an alpha.8 release blocker.
- A newly reproduced crash on alpha.8 candidate code **is** ordinary release evidence and must be triaged from the preserved bundle.

---

# Slice 1 — UI Witness Gate

## Purpose

Before alpha.8 changes the largest visible product surface, make interface appearance and exposed state part of the build evidence.

Issue #122 / PR #124 define the prerequisite.

The browser witness must render the actual production renderer assets with a deterministic fake `window.fullMeasure` bridge. It is a witness surface, not a web edition of the Toaster.

## Canonical witness states

Keep the state set small and deterministic:

- empty appliance;
- song-ready;
- Starting Field / Toast Feel selected;
- six-up;
- Listener;
- rendering;
- complete;
- failure/refusal.

Animations and time-dependent presentation should be frozen for screenshot comparison.

## Vercel role

The existing Git-linked Vercel deployment stream should publish the disposable browser witness built from production renderer assets.

Vercel owns no generation semantics, no score authority, and no local appliance execution authority.

## Completion law

For UI-sensitive changes record:

```text
UI impact: none | behavioral | visual | bridge
browser witness: PASS/FAIL @ commit
visual delta: expected | none | unexplained
packaged witness required: yes | no
packaged witness: PASS/FAIL/not-required
GitBook ontology changed: yes | no
```

Semantic tests remain behavior authority. Screenshot witnesses prove appearance. Packaged Electron proof remains stronger for preload/IPC/native boundaries.

---

# Slice 2 — Seven Toast Feels / Toastmoods

## Product change

Retire Porchlight / Wire Orchard / Absolute Residual as the primary normal starting furniture while preserving them as ancestry and compatibility.

The normal entry surface becomes:

- six ordinary burnt-toast mood choices;
- one conspicuously larger seventh **MADD CLOWN CRAZY SLOTS** choice.

## Core ontology

> **Toast Feel biases the creature. It does not dictate the creature.**

A Toast Feel is not a replacement preset and does not contain a finished appearance.

Each ordinary feel applies deterministic bounded pressure across existing lawful creative axes, potentially including:

- topology weighting within the legal field;
- motion grammar / amplitude / variance pressure;
- palette relationship tendencies;
- material / imperfection tendency;
- camera tendency;
- temporal density tendency;
- Atmosphere / residual / fragmentation weighting where already lawful.

The exact candidate still emerges through the existing deterministic six-up generator and accepted score path.

## Domain decoupling prerequisite

Before the visual cutover:

- introduce one versioned interface/domain manifest for available starting doors;
- stop deriving semantic identity or display names from DOM furniture;
- render interface choices from the manifest;
- make selection state, slate, candidate generation, render, receipt, and tests share the same stable identity/version;
- preserve old constraint packs and lineage for compatibility.

DOM classes and text are presentation, not ontology authority.

## MADD CLOWN semantic class

MADD CLOWN CRAZY SLOTS is maximum **lawful** surprise, not uncontrolled randomness.

It should widen or activate already-proven STOMP / outer-rail surprise machinery under deterministic, receiptable policy. It must remain replayable from recorded inputs.

## Candidate and render parity

The selected Toast Feel identity/version must survive:

```text
UI selection
  -> six-up generation
  -> candidate mutation / locks
  -> accepted VisualScore lineage/evidence
  -> ResolvedTimeline
  -> final render
  -> receipt
```

No UI-only mood that disappears after candidate generation is acceptable.

---

# Slice 3 — Native Color Witness / Chromatic Decompression v1

## Why alpha.8 pulls this forward

The prior staging note kept Native Color behind the near-term package line while alpha.7 was still being mined. alpha.7 has now supplied enough visual evidence to justify a bounded color experiment without reopening the whole renderer.

The source image should become a chromatic witness, not merely material to be overwritten.

> **The photo is a witness, not just fuel.**

> **Stylization may compress the source, but it should sometimes decompress and let the source testify again.**

## v1 scope

Keep the first implementation deliberately small:

```text
source image bytes
  -> deterministic NativeChromaticProfile
  -> source-relative ChromaticRelationshipPlan
  -> existing section-relative Color Drift
  -> optional bounded Native Color decompression windows
  -> shared preview + production compiler
```

### NativeChromaticProfile

Derive only defensible low-level deterministic image statistics, such as:

- representative/dominant palette clusters;
- hue centroid/distribution/spread;
- saturation distribution;
- luminance distribution;
- optional high-chroma anchors;
- source image hash;
- analysis policy/version.

No semantic object/face/region detection is required for alpha.8.

### Chromatic relationship

alpha.8 v1 has exactly two relationship classes:

- `echo` — remain near / extend the native chromatic field;
- `counterpoint` — deliberately offset or oppose the native chromatic field under bounded deterministic policy.

The two classes must produce materially distinct but deterministic behavior from the same admitted source image. Additional relationship classes such as chromatic drain/residue are explicitly deferred beyond alpha.8.

### Native-color decompression window

At least one lawful recorded temporal window must be able to increase source-chroma influence toward the native image.

The event may be global in alpha.8. It does not need semantic segmentation.

The return is an event, not permanent realism:

```text
withhold / travel
  -> accumulate chromatic distance
  -> reveal native color
  -> residue / release
  -> treatment may reassert
```

## Composition order

Make the ordering explicit and testable:

```text
NativeChromaticProfile
  -> source-relative relationship baseline
  -> Color Drift section modulation
  -> decompression / native return event
```

Native Color must compose with existing Color Drift rather than replace or silently fight it.

## Toast Feel relationship

Toast Feel may bias:

- whether `echo` or `counterpoint` is favored;
- how far the composition may lawfully travel from native color;
- likelihood/intensity of a decompression event within the allowed policy.

Toast Feel must not directly specify a final palette or exact reveal schedule.

## Receipt evidence

Record enough to explain and replay color behavior:

- source image hash;
- native chromatic analysis policy/version;
- NativeChromaticProfile hash;
- relationship policy/version and selected relation;
- relationship-plan hash;
- decompression policy/schedule/hash;
- existing Color Drift policy/plan evidence;
- accepted score/timeline/renderer identity.

---

# Slice 4 — Render/output choice remains transport, not creativity

## Existing boundary

The normal product should continue to expose only the bounded transport distinction:

- **Universal — H.264** (`delivery`) as default;
- **Efficient — HEVC (experimental)** (`efficient`) as optional.

These choices carry the same accepted visual semantics differently.

```text
accepted timeline
  -> inner visual cadence
  -> presentation frames
  -> Witness Window
  -> H.264 or HEVC transport
```

## UI / receipt law

The UI passes only the profile identity. Renderer/output profile code remains authority for codec parameters.

After render, the product should report the transport actually recorded in the resulting receipt rather than merely echoing what the UI intended.

## No front-panel schema explosion

alpha.8 must not expose every topology/motion/palette/material/camera/temporal parameter as a conventional control panel.

The low-level vocabulary remains primarily the space explored by:

- Toast Feel bias;
- deterministic six-up coverage;
- locks;
- mutation;
- imported canonical scores where supported.

The product remains an instrument for choosing and breeding outcomes, not a form editor for the VisualScore schema.

---

# Listener boundary for alpha.8

Keep the already-landed Listener parity/hardening work and human-anchor authority.

Do **not** make alpha.8 depend on implementing the deeper Listener research backlog.

Explicitly deferred:

- wrong-chorus structural priors;
- full declared/inferred song-structure model;
- vocal-biased second pass;
- Compression Pressure driven Listener changes;
- Witness Session / proof-watch loop;
- broad threshold retuning from insufficient field evidence.

The alpha.8 release may collect evidence useful to those projects, but must not absorb them.

---

# Acceptance witness

alpha.8 is ready to package only when one coherent end-to-end specimen proves the release thesis.

## Required proof chain

```text
Gold Star ancestor remains recoverable
  -> failure evidence floor exists
  -> browser UI witness passes
  -> Toast Feel selection is visible and deterministic
  -> selected Toast Feel influences six-up lawfully
  -> accepted candidate carries Toast Feel identity/version
  -> NativeChromaticProfile is stable for identical source bytes
  -> echo and counterpoint are materially distinguishable on the same source
  -> at least one deterministic native-color return event is visible
  -> preview and final render agree on those semantics
  -> Universal H.264 render succeeds
  -> receipt records the new mood/color/transport evidence
  -> Windows packaged appliance visibly matches the accepted interface boundary
  -> application manifest + lockfile become 0.5.0-alpha.8
  -> exact proven main commit is tagged v0.5.0-alpha.8
```

Efficient HEVC remains experimental and is not required to replace or outperform Universal to ship alpha.8. It remains selectable through the existing transport profile when supported by the packaged renderer path.

## Regression guards

- six-up remains meaningfully diverse;
- old accepted artifacts retain pinned replay meaning;
- no new ambient randomness enters the pure generation core;
- no new renderer-local image analysis;
- no Toast Feel becomes a hidden preset code path;
- no Native Color behavior exists only in preview;
- no transport choice changes creative semantics;
- no historical crash workaround ships without preserved evidence supporting it.

---

# Explicit alpha.9+ backlog

These remain valid, but are outside the alpha.8 cut:

- Compression Pressure;
- dynamic camera variance / song-conditioned camera response;
- Linear v2 / Elastic Spine;
- deeper Listener structure and vocal-biased recovery;
- semantic/local Native Color witness zones;
- additional chromatic relationship classes beyond `echo` and `counterpoint`;
- Haunted Memory;
- Fallible Witness / Witness Fidelity;
- Closed Witness Loop;
- Witness Session beyond bookkeeping;
- foreign short-video assimilation;
- Exact Return / Artifact Resurrection;
- broader typographic/material physicalization;
- two-parent breeding.

New evidence may reorder these after alpha.8, but they do not enter the release by adjacency.

---

# Work decomposition

This document is an **alpha.8 release design**, not one giant implementation patch.

Implementation must remain decomposed into reviewable slices with their own proof:

1. **failure evidence** — existing #116 / PR #119 line;
2. **UI Witness Gate** — #122 / PR #124;
3. **Toastmoods migration** — #123, implemented only after the UI Witness Gate;
4. **Native Color Witness v1** — #115, narrowed to the alpha.8 scope above;
5. **alpha.8 integration/release gate** — version identity, combined Windows proof, receipt/UI witness, tag/release.

Do not combine independent feature slices merely to reduce PR count. The release becomes coherent by dependency order and shared acceptance proof, not by one oversized branch.

## Dependency order

```text
failure evidence floor -----------┐
                                  |
UI Witness Gate                   |
  -> Toastmoods migration         |
       -> Native Color v1         |
             -> combined witness -┴-> alpha.8 package/tag
```

Failure evidence is an insurance prerequisite but does not need to be causally entangled with the creative changes.

## Stop condition

Stop expanding the release when a packaged alpha.8 demonstrates all three new human-visible truths:

1. **I can summon the Toaster through a richer mood surface.**
2. **The source image's own color can matter and return.**
3. **What I see in the accepted interface and receipt is what the packaged appliance actually executed.**

At that point, ship the version and begin the next field-mining cycle instead of adding another research lane.