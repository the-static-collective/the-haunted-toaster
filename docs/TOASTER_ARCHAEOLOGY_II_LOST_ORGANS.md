# Haunted Toaster — Archaeology II: Lost Organs

**Date:** 2026-09-16  
**Base inspected:** `main` @ `e8e8fb0fa3c13c98aae8c3ca5e98cb4de9f19031`  
**Status:** archaeology receipt / anti-loss evidence  
**Authority:** documentation only; executable code, tests, exact receipts, and explicit human witness outrank this file.

## Purpose

After the BETA 0.0.0 reconciliation, inspect older Haunted Toaster strata for capabilities that were proven, designed, or named but never reconnected to the present machine.

This pass deliberately distinguishes:

- **survived organ** — current executable implementation is materially present;
- **dormant organ** — implementation exists but its intended product connection is absent;
- **lost organ** — bounded design exists but the named executable layer never landed;
- **ancestry only** — old code is represented by clear descendants and should not be resurrected wholesale;
- **new inference** — a present architectural opportunity inferred from the evidence, not historical implementation truth.

No old branch, ZIP, issue, or design gains current authority merely because it is interesting.

---

## Executive finding

The large missing thing is **not an old renderer hidden in the source ZIPs**.

The strongest archaeological seam is the unfinished middle between admitted material and accepted creative authority:

```text
VSPantry
  = what specimens exist

ToastPack / HDToastPack
  = what has been deterministically understood and prepared

Creative Context Table
  = what evidence is lawfully available to generation

Influence Diet
  = what this candidate ate / ignored / received only as influence

accepted VisualScore / ResolvedTimeline
  = what actually acquires execution authority
```

The endpoints are strong. The middle is partially missing or disconnected.

A second, separate seam survives as design:

```text
sense / testimony
      ↓
deterministic body physiology
      ↓
explicit canonical derivation
      ↓
execution
```

Historical **Specimen Pulse** belongs to the first stage. **Resonant Disturbance** was designed for the second. Neither should be collapsed into renderer-local behavior.

---

## 1. ToastPack / HDToastPack — LOST ORGAN, CONTRACT WORTH RECOVERING

### Historical contract

The merged Video/VSPantry design (`docs/superpowers/specs/2026-08-17-video-source-pantry-toastpacks-memory-design.md`, PR #156) defines ToastPack as a **pre-read, mapped, integrated visual expansion pack**, not a video folder.

Its intended deterministic evidence includes, where available:

- luminance envelope;
- representative palette / chromatic behavior;
- edge density;
- motion magnitude or deterministic motion proxy;
- scene-change / frame-difference events;
- representative frame timestamps;
- negative-space / occupancy proxies;
- coarse temporal texture;
- topology / material / motion affinity evidence under a versioned policy.

The same specimen bytes under the same analysis policy/version must produce the same analysis identity. `HDToastPack` is a richer fidelity/capability tier under the same conceptual contract, not a second authority system.

### Current executable descendant

Current `src/full-measure/src/video-pantry/frame-reservoir.cjs` is real and useful. It provides:

- content-identity verification;
- deterministic frame addressing;
- bounded representative-frame selection;
- a declared motion-affordance vocabulary (`nested-crop-v1`, `tunnel-fold-v1`, `radial-echo-v1`, etc.);
- deterministic frame-motion seeds.

That is **not** the whole ToastPack contract. It is one valuable organ from the same body: an addressable still reservoir plus affordance vocabulary.

### Archaeology verdict

**Do not rebuild Frame Reservoir. Do not pretend Frame Reservoir is ToastPack.**

The broader canonical analysis-manifest layer is not visible on current `main`. This is the clearest lost organ found in this pass.

### Smallest honest recovery

A future `TOASTPACK-001` should prove only:

1. one already-admitted VSPantry specimen;
2. one versioned deterministic analysis manifest;
3. a deliberately small evidence vocabulary assembled from already-proven local tooling where possible;
4. canonical hash identity independent of path/filename/import order;
5. explicit partial/unavailable evidence rather than invented values;
6. no renderer authority;
7. no candidate behavior change merely because the manifest exists.

The first proof does **not** need the entire 2026-08-17 wishlist. Representative-frame evidence plus a few cheap temporal/visual descriptors is sufficient if the contract is extensible and truthful.

---

## 2. Creative Context Table + Influence Diet — SURVIVED ORGAN, DISCONNECTED NERVE

### Current executable truth

Current `main` still contains:

- `src/full-measure/src/generation/creative-context-table.cjs`;
- `src/full-measure/src/generation/influence-diet.cjs`.

Their contracts remain clean:

**Creative Context Table**

- deterministic provider normalization/order;
- canonical table identity;
- explicit authority classes: `source-truth`, `constraint`, `ancestry`, `influence-only`, `creative-material`;
- required-vs-optional availability;
- explicit evidence references;
- fail-closed contradictory providers;
- influence-only evidence cannot claim ancestry.

**Influence Diet**

- `ate`;
- `ignored`;
- `influenceOnly`;
- `boundaries`;
- deterministic diet identity;
- cannot eat `influence-only` evidence;
- cannot cite providers absent from the source table.

### Missing connection

Current `src/full-measure/src/candidate-session.cjs` imports the aggregate generation surface and builds ordinary BETA candidate families, topology authority, L BRANCH, POST-WALK grammar, Native Color, response witness, Video binding, etc., but contains no `creativeContext` / Context Table / Influence Diet integration.

The current BETA candidate ecology likewise directly builds its six Toastmood lanes from the normal generation path.

This matches the historical BETA integration boundary: the contracts were deliberately carried forward before ordinary six-up wiring.

### Archaeology verdict

This is not missing code. It is a **preserved socket without the ordinary-generation wire**.

The temptation should be resisted to add every new evidence source directly to candidate generation. The existing table/diet boundary is exactly the place designed to prevent that.

### Smallest honest reconnection

A future `CONTEXT-001` should first prove a no-behavior-change crossing:

1. build one deterministic table from evidence that already exists;
2. generate candidate diets that explicitly **ignore** optional evidence;
3. bind the table/diet evidence to candidate derivation receipts without changing accepted score semantics;
4. prove provider order does not matter;
5. prove deleting the optional provider restores the same ordinary candidate result when all candidates ignored it.

Only after that should one bounded seat be permitted to `eat` one optional provider and show an attributable delta.

---

## 3. Specimen Pulse — LOST SENSOR, NATURAL CONTEXT PROVIDER

Issue #183 defines **Specimen Pulse v1** as deterministic clip-relative testimony from the attached audio of an admitted VSPantry video.

The important law is already good:

> The Toaster may hear the specimen without putting the specimen in the song.

The intended witness is low-level and inspectable:

- energy/loudness envelope;
- signed energy delta/slope;
- onset/transient evidence;
- coarse spectral pressure;
- flux/noisiness;
- bounded periodicity/pulse evidence.

It explicitly does **not** claim stems, beat, meter, semantic sound classification, master-audio authority, or a second song clock.

### Current neighboring truth

Current `src/full-measure/src/render/analyze.cjs` already proves local FFmpeg/FFprobe audio inspection, energy sampling, normalization, and section inference for song analysis.

VSPantry already knows whether a specimen has attached audio.

That does not constitute Specimen Pulse. The missing organ is the **pure, content-bound, clip-relative, versioned witness object** under the pantry/material boundary.

### Natural connection

Issue #183 already identifies the intended proposal-stage provider:

```text
provider: pantry/specimen-pulse-v1
authority: influence-only
ancestry: none
```

That is a strong fit for the surviving Creative Context Table. No new ambient generation lookup is required.

### Smallest honest proof

`PULSE-WITNESS-001` should remain analysis-only:

1. one admitted video with audio;
2. deterministic bounded pulse evidence + hash;
3. explicit `unavailable` for no-audio specimens;
4. content-identity validation;
5. `timingAuthority = clip-relative-only`;
6. `masterAudioAuthority = none`;
7. no renderer/generation behavior change.

---

## 4. Resonant Disturbance — DESIGNED MARROW, NEVER OSSIFIED

PR #188 / issue #187 deliberately separates:

```text
Specimen Pulse / sensing testimony
          ↓
Resonant Disturbance / body physiology
          ↓
explicit canonical consequence
          ↓
renderer
```

Its core law remains useful:

> Recoil may restore present shape; witnessed disturbance remains in history.

The implementation plan was unusually concrete. It specifies a pure generation primitive with:

- `resonant-disturbance-v0` policy;
- body / pressure / plan schemas;
- deterministic stable cell/coupling order;
- event kinds `pressure | threshold-cross | transfer | recoil | terminal`;
- terminal dispositions `settled | exhausted | refused`;
- finite event budget;
- atomic threshold packages;
- canonical hashes;
- explicit pressure authority labels;
- no renderer, UI, VisualScore, ResolvedTimeline, VSPantry, or Project0 dependency.

Current `src/full-measure/src/generation/` contains no `resonant-disturbance.cjs`. The evaluator never crossed from plan into executable truth.

### Archaeology verdict

Do **not** infer that current Topology Events, L BRANCH, consequence/residue vocabulary, or HyperFood already implement this idea. They are neighbors, not this evaluator.

If recovered, Resonant Disturbance should first exist as a standalone pure-data body-law specimen. Only later may an explicit adapter transform admitted testimony into disturbance pressure or a disturbance plan into a canonical creative consequence.

### Smallest honest proof

The historical Task 1/2 plan is still a good bounded `BODY-001`:

- implement the pure evaluator exactly under tests;
- no product wiring;
- no renderer physiology claim;
- one deterministic cascade + refusal/exhaustion specimens;
- replay and event-history identity.

That gives the Toaster a reusable **body law** without giving it a new effect.

---

## 5. HyperFood PULSE is not Specimen Pulse

HyperFood v0 (PR #269) defines `PULSE@0.1.0` as a reusable motion organism:

```text
Surface + explicit EventGrid
        ↓
bounded attack / hold / decay transform envelope
        ↓
Surface
```

The HyperFood spec explicitly says **PULSE never analyzes raw audio**. Any beat/onset analysis is upstream and must bring its own evidence.

Historical **Specimen Pulse v1** is exactly such upstream evidence, derived from VSPantry specimen audio.

Therefore:

```text
Specimen Pulse v1
= testimony / EventGrid candidate source

HyperFood PULSE@0.1.0
= material organism consuming an explicit EventGrid
```

They may eventually compose through an explicit bridge, but they must never share identity/schema or silently imply one another.

Recommended naming discipline in prose and receipts:

- always write **Specimen Pulse** or provider id `pantry/specimen-pulse-v1` for the audio witness;
- reserve bare **PULSE** for the HyperFood organism.

---

## 6. Source ZIP audit — ANCESTRY MOSTLY ACCOUNTED FOR

Inspected archives:

- `archive/source-zips/1.full-measure-alpha-0.1.0-source.zip`;
- `archive/source-zips/full-measure-alpha-0.3.0-source.zip`;
- `archive/source-zips/full-measure-alpha-0.3.1-source.zip`.

### Method boundary

This was a **module-vocabulary / archive-directory archaeology pass**, not a byte-for-byte function diff of every compressed source body. That distinction is deliberate and should remain in the receipt.

### alpha 0.1.0

The archive contains the early renderer skeleton:

- `render/artwork.cjs`;
- `render/analyze.cjs`;
- `render/presets.cjs`;
- `render/tooling.cjs`;
- `render/receipt.cjs`;
- `render/render.cjs`;
- desktop main/preload and renderer HTML/CSS;
- render/analyze tests.

Current `main` still has direct descendants with the same names for artwork, analyze, presets, tooling, receipt, and render, plus substantial later structure around them.

**Disposition:** ancestry, not rescue donor.

### alpha 0.3.0

The major visible expansion adds:

- `align/matcher.cjs`;
- `align/listener-pack.cjs`;
- `align/auto-sync.cjs`;
- `render/lyrics.cjs`;
- renderer `app.js` and expanded UI;
- continued render/analyze/artwork/presets/tooling/receipt core.

Current `main` still contains direct descendants:

- `align/matcher.cjs`;
- `align/listener-pack.cjs`;
- `align/auto-sync.cjs`;
- plus `anchor-guided.cjs` and `lyric-foundry.cjs`;
- current `render/lyrics.cjs` and later lyric/ghost machinery.

**Disposition:** the big 0.3-era organ survived and evolved.

### alpha 0.3.1

The archive exposes the same major module families as 0.3.0 rather than a new subsystem family: aligner/listener/auto-sync + lyrics + renderer core.

**Disposition:** likely hardening/evolution stratum, not evidence of a missing current subsystem at the module-family level.

### ZIP conclusion

No large vanished subsystem was discovered in the archive topology.

The ZIPs remain useful when a **specific current behavior** needs ancestral comparison, especially Listener or render analysis behavior. They should not be treated as a general feature donor or merged/reconstructed wholesale.

---

## 7. Recovered connective architecture

The strongest new inference from this archaeology is not a new feature. It is a cleaner ordering of already-named boundaries:

```text
                     MATERIAL KNOWLEDGE

VSPantry specimen
      ↓
ToastPack / HDToastPack manifest
      ↓
Creative Context Table
      ↓
Influence Diet
      ↓
candidate derivation
      ↓
accepted VisualScore / ResolvedTimeline
      ↓
execution
```

Optional testimony can enter the same proposal boundary without acquiring authority:

```text
Specimen Pulse ── influence-only ──→ Creative Context Table
receipt memory ─ influence-only ──→ Creative Context Table
Native Color ─ creative-material ─→ Creative Context Table
constraints ───── constraint ─────→ Creative Context Table
song/source ───── source-truth ───→ Creative Context Table
```

A distinct experimental body-law chain can remain separate:

```text
admitted testimony
      ↓
Resonant Disturbance pressure adapter   [future explicit bridge]
      ↓
pure deterministic body plan
      ↓
explicit canonical derivation           [future explicit bridge]
      ↓
accepted execution authority
```

This preserves the existing law:

> evidence may influence generation; evidence does not become renderer authority by proximity.

---

## 8. Recommended excavation order

This is a research/build order, not release priority and not authorization to implement all four items.

1. **TOASTPACK-001** — recover one tiny deterministic pack-analysis manifest from an admitted specimen.
2. **CONTEXT-001** — reconnect Table/Diet in observation-only mode; prove available evidence may be ignored with zero candidate delta.
3. **PULSE-WITNESS-001** — build the pure clip-relative Specimen Pulse witness as an optional `influence-only` provider.
4. **BODY-001** — implement Resonant Disturbance as a standalone pure-data evaluator with no product wiring.
5. Only then test one bounded bridge at a time.

The main thing to avoid is skipping directly from “we can observe this” to “the renderer should react to it.”

---

## 9. Anti-resurrection law

For every archaeological candidate:

1. preserve old source/design as provenance;
2. inspect current executable descendants first;
3. re-port only the missing contract or behavior;
4. write RED against current `main`, not against an old branch;
5. refuse hidden authority widening;
6. preserve exact restoration/excision controls where influence is experimental;
7. keep a receipt that distinguishes historical fact, current executable truth, and new inference.

> **Dig for organs, not ghosts. If the organism already evolved, follow the living nerve.**
