# Elastic Topology Response v1 Design

**Issue:** #138 — Nested Contour v1: preserve headroom while keeping the creature alive  
**Parent design:** `2026-08-16-nested-response-contour-design.md` / PR #139  
**Parent renderer line:** PR #137 / `fix/alpha9-range-calibration`  
**Status:** design addendum; no production implementation in this slice

## 1. New field finding

Fresh alpha.9 packaged testing shows that the calibrated renderer solved one real failure while exposing another.

The older renderer allowed topology to bloom strongly with musical intensity. In quiet and spacious passages this could be highly expressive: shapes breathed, stretched, opened, contracted, and could temporarily become the visual world. Under sustained high intensity, however, the same response could monotonically increase occupied bright area until the frame converged on an explosive white field.

The alpha.9 calibration correctly protects headroom and topology identity, but the resulting Shape Pack can feel less fluid. The source topology often remains a comparatively fixed container while motion/material/camera change around it and sparse Topology Arc windows provide the major topology events.

The desired correction is not “make the shapes bigger again.” It is:

> **Restore continuous topology breathing while separating expression from occupied bright area.**

Working law:

> **Area saturates. Expression does not.**

A topology may touch or briefly dominate the full frame. It must not become permanently pinned there merely because the song stays loud.

## 2. Current implementation seam

On the alpha.9 calibration line, `topologyContext()` currently derives one main continuous topology pressure from base motion:

```text
raw motion amplitude
  -> effectiveInternalEnergyV3(...)
  -> amplitude
  -> opacity = 0.38 + amplitude * 0.5
  -> zoom    = 1.25 + amplitude * 1.15
```

The Shape Pack compilers then consume that mostly fixed context. `resolveFieldEnvelope()` provides a bounded full-height square for non-linear topologies and safe internal expansion, but the envelope itself is not a musical deformation vocabulary.

That split explains the current field result:

- the renderer no longer blindly drives bright geometry toward maximum;
- topology identity survives pressure better;
- but much of the earlier “creature dancing” behavior disappeared because topology response has too few continuous degrees of freedom.

The repair belongs inside #138's canonical nested-response layer, not as a return to the legacy global boost.

## 3. Design options

### A. Reintroduce stronger amplitude -> zoom

Increase the raster-4 topology zoom range or restore part of the old lifted response.

**Reject.** This recreates the same one-dimensional failure: loud means larger until no spatial headroom remains. It also weakens PR #137's calibrated macro-range law.

### B. Hard-cap topology size and add random wobble

Keep a strict occupancy ceiling and add renderer-local motion so shapes feel less static.

**Reject.** A hard geometric prison removes legitimate full-field climaxes, while renderer-local wobble creates a second creative authority and is not replay evidence.

### C. Canonical multi-dimensional topology articulation with occupancy shedding

Use #138's signed local contour to drive several topology-specific continuous response channels. Treat occupied bright area as only one response dimension; when occupancy approaches saturation, redirect additional pressure into deformation, negative space, multiplicity, phase, asymmetry, travel, and recoil.

**Adopt.** This restores fluidity without restoring monotonic whiteout.

## 4. Response model

Nested Response should resolve a compact topology articulation state for each canonical response knot/window. The exact implementation schema may be smaller, but the semantic dimensions are:

```text
extent          # spatial reach / size
openness        # negative space / hollowing
 deformation     # bend / shear / rib flex / eccentricity
multiplicity     # copies / lobes / ribs / echoes where lawful
phase            # rotation / circulation / relative offset
asymmetry        # controlled departure from perfect symmetry
opacityPressure  # bounded brightness/alpha contribution
travel           # local displacement through the field
```

Not every topology consumes every channel. The resolved plan supplies normalized, deterministic articulation pressure; each topology compiler maps it into its own lawful vocabulary.

## 5. Occupancy is not intensity

Introduce a deterministic **occupancy-pressure / saturation law** separate from macro musical energy.

Conceptually:

```text
musical pressure rises
      ↓
extent may rise
      ↓
occupied-bright-area approaches soft knee
      ↓
extent gain compresses
      +
extra pressure redirects into:
  deformation
  openness / negative space
  multiplicity
  phase / travel
  asymmetry
      ↓
sustained pressure eventually sheds area / recoils
```

This is a soft knee, not a global hard size cap.

### Required behavior

- 100% frame reach remains legal for a bounded climax.
- Sustained high energy must not imply sustained 100% filled/bright occupancy.
- After a bloom, hysteresis / arc commitment should create recoil or area shedding before another full bloom is eligible.
- A topology can remain extremely expressive while occupying less bright area than its prior peak.
- Negative space is an active response channel, not merely leftover background.

## 6. Attack, release, and recovery

The topology should respond as a body with memory, not a meter needle.

Canonical response arcs should support:

```text
attack -> bloom -> recoil -> tension -> bloom-differently
```

or for a breather:

```text
inhale -> open -> settle -> exhale
```

The same smoothing/hysteresis/arc-commitment machinery proposed in the parent Nested Response design owns these arcs. No new renderer state machine is required.

Important distinction:

- **attack** may be comparatively fast;
- **release/recoil** should preserve enough duration to read;
- sustained high energy may maintain tension but should not simply freeze the topology at maximum extent.

## 7. Topology-specific articulation vocabularies

The first implementation should stay small, but each topology needs at least two or three continuous ways to remain itself while changing.

Examples are design vocabulary, not mandatory public enum names.

### Linear

- bow / snake;
- spread / spacing between line forms;
- braid / phase offset;
- kink / shear;
- multiplicity growth above the existing multi-line floor.

### Circle / Mirrored Ring

- breathe radius;
- eccentric / egg deformation;
- ring thickness / hollowing;
- lobe/satellite separation;
- ripple / phase motion.

### Spiral

- coil spacing;
- radial reach;
- winding tension;
- center migration.

### Quad Mirror

- tile separation / convergence;
- mirror phase offset;
- quadrant shear;
- center aperture.

### Elastic Spine

- bend depth;
- lateral travel;
- vertebral spacing / echo;
- tension / recoil.

### Split Horizon

- vertical separation;
- shear direction;
- horizon thickness / aperture;
- opposing phase.

### Cathedral Fan

- rib spread;
- blade opening angle;
- center aperture / negative space;
- rib flex / stagger;
- fan recoil.

### Echo Tunnel

- depth spacing;
- vanishing-axis travel;
- aperture size;
- plane phase / recession;
- alternating hollow/full emphasis.

v1 does not need every item above. It must prove the architecture with enough topologies to show that “responsive” is not one generic zoom function.

## 8. Relationship to field envelope

`resolveFieldEnvelope()` remains **safety geometry**, not the expression controller.

Preserve its responsibilities:

- canonical output frame;
- intentional bounded-object behavior;
- safe rotation/displacement expansion;
- no accidental source-edge exposure;
- preview/production parity.

Nested topology articulation operates inside/through that safety geometry.

Do not reinterpret `bounded-full-height-v1` as “the visible creature may never reach the frame edges.” Full reach remains legal. The invariant is that safe internal working geometry and final composition remain controlled.

## 9. Relationship to Topology Arc

Topology Arc remains sparse categorical dramaturgy:

```text
source topology
 -> apparition / overlap
 -> dissolve | scar | succession
```

Elastic Topology Response is continuous life **inside the currently authoritative topology**.

The two should compose:

```text
cathedral-fan already breathing / flexing
        ↓
ghost split-horizon enters
        ↓
resonant overlap
        ↓
succession or dissolve
        ↓
remaining topology continues with inherited response contour
```

Do not increase the 0–2 ghost-window budget merely to make topology feel alive.

## 10. Canonical evidence

Extend the parent `nestedResponse` plan or compiler evidence with a compact topology-response identity, conceptually:

```text
topologyResponse:
  policyVersion: elastic-topology-response-v1
  occupancyPolicyVersion: soft-occupancy-shedding-v1
  articulationPlanSha256
  activeChannels
  peakExtent
  peakOccupancyPressure
  recoilCount
```

Do not emit per-frame geometry into the receipt.

If the implementation can derive peak/recoil summaries entirely from the canonical plan, the receipt may record only the plan hash/version plus concise summary evidence.

## 11. Acceptance criteria

### Preserve headroom

- PR #137's `effectiveInternalEnergyV3()` identity-like 0..1 behavior remains unchanged.
- 1.0 remains a reachable musical macro value.
- No global midrange boost is restored.

### Restore fluidity

- A quiet/spacious fixture visibly changes topology continuously even when no Possession/Topology Arc event occurs.
- A low-variance/locked camera can remain restrained while the topology itself breathes.
- At least one topology demonstrates three materially distinct continuous expressions without changing topology identity.

### Anti-whiteout

Use a dense sustained-energy fixture.

- A peak may produce temporary near/full-frame reach.
- Sustained high pressure must not pin extent + opacity + filled area at maximum for the remainder of the section.
- After the occupancy soft knee, additional admitted pressure changes at least one non-area articulation channel.
- At least one recoil/area-shedding phase occurs while macro energy remains high.
- Negative space remains observable during sustained high-energy response.

### Dynamic contrast

Use a fixture shaped like:

```text
breather -> rise -> sustained loud -> recoil while loud -> new accent -> release
```

The topology must produce distinguishable states for all six phases instead of reducing them to one scalar size ladder.

### Determinism / authority

- same score + same response witness + same policy => byte-identical articulation plan/hash;
- preview and production consume the same articulation plan;
- no wall clock, ambient randomness, or renderer-only history participates;
- visual-language-v1/v2 replay remains unchanged;
- Topology Arc and Possession Arc budgets remain unchanged.

## 12. Field regression set

Use real alpha.9 field specimens as human witnesses after fixture proof:

1. **Shack With Swag** — positive restrained/Linear witness; simple topology should remain capable of expressive continuous life without forced spectacle.
2. **Carry the Small Fire** — long-form Cathedral Fan witness with multiple musical ranges; should demonstrate breathe -> grow -> transform -> recede -> sustain -> exhale rather than fixed fan plus sparse events.
3. **dense/mastered high-intensity specimen** — explicit anti-whiteout witness; full-field peaks are allowed, permanent white-field convergence is not.

The field question is:

> **Does the topology feel like a musical creature again—able to become huge, recoil, mutate internally, and stay dynamically legible even when the song remains intense?**

## 13. Scope

### In scope

- extend #138 Nested Response with topology-first articulation;
- soft occupancy saturation / pressure shedding;
- attack/release/recoil memory in the canonical contour;
- topology-specific continuous response channels;
- preserve bounded-field safety geometry;
- preview/render parity and compact evidence;
- fixture proof plus packaged field comparison.

### Out of scope

- reverting PR #137;
- global amplitude/zoom boost;
- hard global topology size cap;
- increasing Topology Arc event count;
- new topology enum merely to obtain fluidity;
- generic physics engine;
- per-frame stochastic deformation;
- beat/meter inference prerequisite;
- changing color/native-color policy;
- release/tag/promotion.

## 14. Decision

Treat **Elastic Topology Response v1** as the primary visual consumer of Nested Response Contour v1.

The core implementation law is:

> **Area saturates. Expression does not.**

The Toaster should be free to let a topology become the whole frame for a meaningful moment. When the song keeps pushing, the topology must still have somewhere lawful to go: open, hollow, bend, split, travel, recoil, phase, and bloom differently rather than converging on permanent explosive white.
