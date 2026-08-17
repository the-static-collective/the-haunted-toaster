# Cathedral Fan Native Articulation Design

**Parent issue:** #138 — Nested Contour v1: preserve headroom while keeping the creature alive  
**Parent design:** `2026-08-17-elastic-topology-response-design.md`  
**Parent PR:** #139 — design: specify nested response contour v1  
**Status:** design refinement; no production implementation in this slice

## 1. Field finding

A packaged alpha.9 Cathedral Fan witness can now read as a fan/rib/blade topology, but its movement still risks feeling like a mostly fixed fan-shaped object receiving generic motion.

The missing behavior is anatomical:

> **Cathedral Fan should open and fold through its ribs. The roots remain comparatively anchored while the distal tips spread apart and contract toward one another.**

This is not equivalent to scaling the whole topology, rotating it, or applying a generic pulse. The fan must remain recognizably Cathedral Fan while its own geometry breathes.

## 2. Design choices considered

### A. Generic whole-object pulse

Drive uniform scale from the existing motion amplitude.

**Reject.** This makes Cathedral Fan a static drawing that grows and shrinks rather than articulating through its own anatomy.

### B. Independent rib oscillators

Rotate or orbit each rib separately around the fan root.

**Reject as the primary law.** Unconstrained independent oscillators weaken the common-root identity, invite jitter, and risk renderer-local choreography.

### C. Root-anchored distal angular breathing with bounded stagger

Treat each rib as a root-to-tip member. Preserve a comparatively stable root region, increase deformation toward the distal half, and drive one canonical opening factor that changes inter-tip separation. Adjacent ribs may receive small deterministic phase offsets so contraction or expansion can travel across the fan.

**Adopt.** This expresses Cathedral Fan through its own anatomy and composes cleanly with Elastic Topology Response.

## 3. Native articulation law

Cathedral Fan owns a continuous **angular breathing** vocabulary:

```text
shared / near-shared root region
          ↓
low displacement near root
          ↓
increasing angular displacement along each rib
          ↓
maximum articulation near distal tips
          ↓
tip separation expands / contracts
```

The key variable is not whole-object size. It is the relationship between neighboring ribs.

A compact semantic model is sufficient:

```text
fanArticulation:
  openness          # normalized fan opening / inter-tip separation
  distalBias        # how strongly motion concentrates toward tips
  stagger           # bounded deterministic adjacent-rib phase offset
  aperture          # center negative-space opening
  recoil            # signed return / fold pressure
```

The exact implementation schema may be smaller if these values can be derived from the parent canonical response plan without ambiguity.

## 4. Root anchoring and distal bias

The inner/root region remains comparatively stable while the outer region receives most articulation. The exact deformation curve is implementation detail, but the observable law is not:

- base/root displacement stays materially smaller than tip displacement;
- the outer half of each rib carries most opening/folding motion;
- changing openness changes neighboring-tip distance more than root distance;
- the shared-root impression survives the full lawful response range.

## 5. Tip convergence and divergence

During an **opening** phase, neighboring distal tips move farther apart. During a **folding / recoil** phase, neighboring distal tips move toward one another.

```text
OPEN                       FOLD
\   \   |   /   /          \ \ | / /
 \   \  |  /   /            \ \|/ /
  \   \ | /   /              \ | /
       root                     root
```

The fan does not need to close into a literal single line. Minimum separation remains bounded so geometry stays legible and avoids accidental bright-density collapse. Maximum opening remains bounded by existing field-envelope safety geometry.

## 6. Deterministic rib stagger

Perfectly synchronous ribs can still resemble a generic scale transform. Cathedral Fan may therefore consume a small deterministic **stagger** channel so an opening or fold travels across neighboring ribs.

Stagger remains subordinate to the common articulation contour:

- all ribs participate in the same admitted opening/folding arc;
- stagger cannot reverse the fan's macro direction;
- no unseeded or renderer-local randomness;
- the canonical response witness determines the same phase relationship on replay.

v1 may use a fixed topology-native phase pattern if a separate canonical value would create unnecessary schema surface.

## 7. Relationship to generic motion and Primitive Field

Native articulation is not another motion grammar competing with `pulse`, `orbit`, `whip`, or other admitted operators.

```text
Cathedral Fan topology identity
        +
native fan articulation
        +
generic admitted motion / Primitive Field modulation
        =
final lawful creature
```

Generic motion may modulate speed, excursion, translation, or field pressure, but it must not replace opening/folding. A restrained or nearly fixed camera must still allow Cathedral Fan to visibly breathe through its own geometry.

## 8. Relationship to Nested Response

This refinement is a Cathedral Fan-specific consumer of `nested-response-contour-v1` / Elastic Topology Response.

```text
rise     -> tips spread / aperture opens
settle   -> hold with small living stagger
recoil   -> tips contract toward one another
new rise -> reopen, potentially with different flex emphasis
release  -> readable exhale rather than instant reset
```

Macro energy sets available excursion. Local contour determines motion inside that range.

## 9. Occupancy and negative space

This design inherits the parent law:

> **Area saturates. Expression does not.**

Cathedral Fan has a useful anti-whiteout channel: opening and aperture can increase negative space even while musical pressure remains high. Screen-additive brightness is not a substitute for articulation.

## 10. Compatibility boundary

- visual-language-v3 / Shape Pack Cathedral Fan only;
- do not reinterpret visual-language-v1/v2 timelines;
- do not change topology identity or Topology Arc budgets;
- do not spend ordinary patch entropy for each fan breath;
- do not add a public topology enum or Toast Feel control;
- do not require beat/meter inference;
- do not restore the old global amplitude-to-zoom boost.

## 11. Acceptance criteria

### Anatomy

- Root/base displacement remains materially smaller than distal displacement.
- At least two neighboring distal-tip distances increase during opening and decrease during recoil/folding.
- Most angular/deformation excursion occurs in the outer half of the ribs.
- Cathedral Fan remains recognizable at minimum and maximum lawful openness.

### Continuous life

- With restrained camera and no Topology Arc event, Cathedral Fan visibly changes through opening/folding articulation.
- A quiet non-silent fixture produces a small readable fan breath without global boosting.
- A `rise -> settle -> recoil -> rise` fixture produces the same ordered fan articulation on every resolution.

### Stagger

- If enabled, neighboring ribs do not all reach extrema on the same sample/frame.
- Stagger is bounded and deterministic.
- Stagger cannot contradict overall opening/folding strongly enough to destroy fan identity.

### Headroom / anti-whiteout

- Full-frame reach remains legal for a bounded climax.
- Sustained high pressure does not pin extent, opacity, and rib density at maximum.
- Negative space between ribs remains observable through at least one sustained-high-pressure phase.
- After the occupancy knee, added admitted pressure changes a non-area articulation channel rather than only increasing bright occupied area.

### Determinism and parity

- Same accepted timeline + same canonical response plan => identical Cathedral Fan articulation program.
- Preview and production consume the same semantics.
- No wall clock, ambient process state, or unseeded randomness affects rib placement.
- Existing Shape Pack field-envelope safety remains intact.

## 12. First proof slice

The smallest implementation proving the idea should target Cathedral Fan only before generalizing every topology:

1. consume one canonical normalized opening/recoil contour from Nested Response;
2. compile root-anchored rib geometry whose distal angle changes with that contour;
3. add one bounded deterministic adjacent-rib stagger pattern;
4. retain field-envelope / anti-whiteout safety;
5. add focused deterministic compiler tests plus an actual FFmpeg frame/video witness;
6. compare a packaged Cathedral Fan specimen with current fixed-fan behavior.

Do not simultaneously redesign Circle, Spiral, Echo Tunnel, or Primitive Field. Cathedral Fan should establish the reusable contract first.

## 13. Decision

Cathedral Fan's first native articulation is **root-anchored distal angular breathing**:

> **The roots hold. The tips open, approach, separate, and return.**

This is the concrete first proof that topology can be more than geometry receiving generic effects. A topology can carry its own lawful anatomy of movement.
