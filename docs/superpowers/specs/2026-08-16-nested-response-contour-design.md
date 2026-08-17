# Nested Response Contour v1 Design

**Issue:** #138 — Nested Contour v1: preserve headroom while keeping the creature alive  
**Parent line:** PR #137 / `fix/alpha9-range-calibration`  
**Status:** proposed design; no production implementation in this slice

## 1. Field finding

Alpha.9 range calibration corrected a real problem: visual-language-v3 should not globally lift middle energy values toward the ceiling. The new field tests reveal the complementary problem.

A dynamically honest renderer can still feel too inert between sparse section-scale events.

The desired correction is **not** to restore hotter mids. It is to make the creature continuously alive and let measured local change articulate motion inside the range already granted by the song.

Working laws:

> **Quiet is not static. Mellow is not dead.**

> **The creature stays alive; the song controls the excursion.**

> **Macro energy sets the available range. Local contour determines motion inside it.**

The smallest motivating phrase is:

```text
rise -> settle -> recoil -> rise
```

One large section should be able to contain several such smaller arcs without turning them into categorical scene changes.

## 2. Current seam

The current repository already has most of the semantic vocabulary but not the production evidence path needed to exercise it.

### Response shaping

`src/full-measure/src/render/response-shaping.cjs` preserves the legacy lifted response in `effectiveInternalEnergy()` while visual-language-v3 uses an identity-like clamped `effectiveInternalEnergyV3()`.

That distinction is correct and remains invariant.

### Analysis

`src/full-measure/src/render/analyze.cjs` already produces approximately one RMS-energy observation per second and derives a sparse 3–8 section map from those observations.

The raw local evidence therefore exists before candidate generation.

### Generation schema

The generation schema already recognizes:

```text
boundaries: section | phrase | transient
temporalDensity: frozen | section | phrase | transient
```

The ordinary resolver can emit state patches at those boundaries when the arrays exist.

### Production adapter

`src/full-measure/src/candidate-session.cjs::toGenerationAnalysis()` currently maps real media analysis into generation analysis like this:

```text
sections: real section evidence
phrases: []
transients: []
```

That makes `phrase` and `transient` temporal density semantically available but operationally empty in real candidate sessions.

### Why ordinary patches are not the repair

`src/full-measure/src/generation/resolver.cjs` treats an eligible boundary as an opportunity to choose one lawful axis and apply deterministic bounded jitter under the ordinary entropy budget.

That is appropriate for sparse state mutation. It is not a good representation of continuous nested response. Filling the empty arrays and firing more ordinary patches would risk:

- patch-count inflation;
- entropy exhaustion;
- rapid unrelated axis switching;
- nervous one-second jitter;
- loss of a coherent rise / settle / recoil gesture.

Nested response therefore needs its own canonical plan.

## 3. Options

### Option A — denser ordinary patches

Populate phrase/transient boundaries and reuse the existing resolver.

**Advantages**

- smallest code delta;
- reuses existing schema and patch compiler.

**Costs**

- wrong semantic primitive;
- turns continuous response into state mutation;
- consumes entropy and patch budget;
- difficult to guarantee coherent local direction;
- likely to produce jitter rather than phrasing.

**Decision:** reject as the primary mechanic.

### Option B — canonical nested continuous contour

Add a versioned local-response witness and resolve it into a compact timeline plan consumed by preview and production.

**Advantages**

- preserves current v3 macro headroom;
- makes local direction first-class;
- separates continuous response from categorical dramaturgy;
- allows smoothing, hysteresis, and arc commitment without hidden renderer state;
- can later accept true beat/meter evidence without requiring it now.

**Costs**

- one new timeline-level policy and compiler seam;
- requires explicit versioning and receipt evidence.

**Decision:** adopt.

### Option C — beat/meter analysis first

Build a real pulse and meter analyzer, then express exact measure arcs.

**Advantages**

- musically precise measure boundaries;
- strong long-term foundation for recurrence and event salience.

**Costs**

- substantially larger DSP surface;
- confidence/refusal semantics become prerequisites;
- delays proving the actual response law;
- risks falsely treating meter inference as authority.

**Decision:** defer. v1 uses honest `micro` / `measure-scale` windows and never calls them true measures without meter evidence.

## 4. Architecture

The new flow is:

```text
raw measured energy samples
        +
section map
        ↓
deriveResponseWitness(...)
        ↓
versioned local response witness
        +
VisualScore temporalDensity / influence
        +
current macro section context
        ↓
resolveNestedResponseContour(...)
        ↓
ResolvedTimeline.nestedResponse
        ↓
shared preview / production compiler
        ↓
topology + Primitive Field continuous parameters
        ↓
video + compact receipt evidence
```

The response plan is semantic authority. The renderer executes it; the renderer does not rediscover or improvise it.

## 5. Response model

Nested response has four distinct quantities.

### 5.1 Macro center / range

The section-scale energy remains honest. visual-language-v3 does not boost the macro center merely to make a quiet section interesting.

A quiet section can remain quiet while still using its narrow range expressively.

### 5.2 Local signed excursion

Within the current section, measured local energy is evaluated relative to a smoothed local baseline / section context.

The important variable is not only absolute energy but **direction and excursion**:

```text
+ excursion -> rise / opening / pressure
near zero    -> settle / hold
- excursion -> recoil / release / contraction
```

The plan should prefer continuous numerical knots. Optional human-readable labels may be derived as evidence, but labels are not required as renderer authority.

### 5.3 Autonomous idle motion

The visual creature may retain a small topology-aware idle behavior even when signal-driven excursion is zero.

Examples are conceptual rather than a required taxonomy:

```text
branches       -> faint breathing / flex
torus          -> slow circulation
lattice        -> tiny phase drift
split horizon  -> restrained shear / slide
cathedral fan  -> rib respiration
```

Critical boundary:

> **Idle motion is not audio evidence.**

True signal silence may produce zero signal response while the accepted renderer policy still allows a bounded autonomous idle motion.

### 5.4 Event accent

Discrete transient / beat-like accent lanes are useful but not required for this first slice. v1 may expose a seam for later event salience without inventing stems or a beat grid.

## 6. Nested temporal hierarchy

The hierarchy is intentionally asymmetric:

```text
section        = macro range / context
local window   = signed contour / phrasing
micro window   = finest lawful response
categorical arc = separate sparse authority
```

Possession Arc and Topology Arc remain sparse categorical dramaturgy. Nested Response does not increase their event budgets.

### Temporal density

For visual-language-v3, the accepted score's existing `temporalDensity` acts as a **granularity ceiling** for the response plan:

- `frozen` — autonomous idle + static/macro response only;
- `section` — section-scale response only;
- `phrase` — section plus nested local windows;
- `transient` — finest lawful micro contour / accent sensitivity.

This does not authorize silent reinterpretation of legacy raster behavior. The new policy must be explicitly versioned and confined to the new v3/raster-4 execution path.

## 7. Local witness derivation

Do not mutate the existing `AudioAnalysis v1` fixture contract merely to smuggle additional fields through exact-key validation.

Preferred boundary:

```text
mediaAnalysis.energySamples
        ↓ pure versioned derivation
ResponseWitnessV1
```

A minimal witness should preserve enough data to deterministically reconstruct the plan while remaining bounded:

```text
policyVersion
sample cadence / source count
smoothed local energy samples or canonical reduced knots
section association
local baseline / span evidence
signed slope / excursion evidence
source hash / witness hash
```

The derivation should operate on the existing measured RMS evidence. No wall-clock state, host randomness, cloud inference, or renderer-local sampling participates.

### Measure truth boundary

The current ~1 Hz energy witness can support several-second micro arcs. It cannot by itself establish tempo, downbeat, or meter.

Therefore v1 names these windows `micro` or `measure-scale`.

A later `PulseWitness` / meter policy may promote a window to `measure` only with recorded confidence and refusal semantics.

## 8. Smoothing, hysteresis, and arc commitment

Continuous responsiveness must not become twitch.

The resolver should enforce three controls.

### Smoothing

Use a deterministic local smoothing policy over measured samples so isolated RMS noise does not become a visible command.

### Hysteresis

Direction should not reverse until signed change exceeds a bounded threshold relative to the local span.

### Arc commitment

Once a meaningful local rise / recoil begins, preserve enough duration or integrated excursion for the movement to read before allowing a contrary micro-state to replace it.

These are generation policies, not renderer state machines.

## 9. Renderer consumption

Nested response should first modulate **continuous internal action**, not categorical identity.

Primary consumers:

- topology deformation depth / travel / spread;
- Primitive Field dynamics strength / phase / displacement;
- bounded internal pulse / circulation / flex;
- other existing continuous parameters that preserve topology identity.

Secondary consumer:

- camera intensity only through the existing surrender hierarchy or an equivalently bounded policy.

Do not make the camera the easiest way to fake responsiveness.

Do not change motion/material/camera grammar categories for every local knot. Categorical changes remain Possession Arc / ordinary-patch territory.

## 10. Compatibility and replay

### Invariants

- visual-language-v1/v2 replay semantics remain unchanged;
- current v3 midrange identity response remains unchanged;
- 0 and 1 remain exact response endpoints;
- 1.0 remains reachable;
- no new unseeded randomness;
- no second render authority;
- preview and production consume the same accepted nested-response plan.

### Versioning

The response witness and nested contour each receive explicit policy/version identities.

Historical accepted timelines remain replayable because they already contain their semantic timeline. Re-resolution behavior must be pinned by renderer/profile policy so the new plan is never silently injected into a legacy execution contract.

## 11. Evidence and receipt shape

The accepted timeline should carry the compact canonical plan or a canonical plan object sufficient for exact semantic replay.

Receipt / compiler evidence should include at minimum:

```text
nestedResponse:
  policyVersion
  planSha256
  windowCount / knotCount
  granularity
  idleMotionPolicyVersion
  meterEvidenceUsed: false   # initial v1
```

Do not dump raw per-frame response data into the receipt.

## 12. Error / refusal behavior

- Missing local energy samples must not manufacture fake phrase/measure evidence.
- If no local witness exists, the plan degrades explicitly to the lawful macro/idle behavior for the selected temporal density.
- Invalid / unsorted witness data is rejected before resolution.
- A zero-energy signal produces zero signal excursion.
- If local range is effectively flat, responsiveness remains bounded and stable rather than dividing by a tiny span into artificial maximum motion.

## 13. Test design

### Headroom regression

Keep the current v3 response assertions:

```text
0 -> 0
0.25 -> ~0.25
0.5 -> ~0.5
0.75 -> ~0.75
1 -> 1
```

Legacy lifted v2 behavior remains unchanged.

### Nested contour fixture

Within one macro section provide a deterministic local sample sequence shaped like:

```text
rise -> settle -> recoil -> rise
```

Assert:

- multiple local windows exist inside one section;
- signed excursion order is preserved;
- same inputs produce identical witness and plan hashes;
- ordinary patch count / entropy does not increase solely because contour exists.

### Quiet / alive fixture

Assert a quiet non-silent source receives a narrow but nonzero internal action range without raising its macro energy.

### Silence fixture

Assert signal excursion is exactly zero while any autonomous idle contribution is separately evidenced.

### Anti-jitter fixture

Provide alternating tiny one-second deviations and prove hysteresis prevents constant response reversal.

Then provide a sustained change and prove it crosses the threshold.

### Dense-master fixture

Use a narrow surviving local span with meaningful small deltas. Assert those deltas create bounded visible excursions while peak headroom remains available.

### Compatibility

- visual-language-v1/v2 golden fixtures unchanged;
- #136 / PR #137 headroom and topology-pressure contracts remain green;
- preview and render expose the same plan identity.

## 14. Field proof

Use three packaged specimens:

1. **quiet / spacious** — should remain visibly inhabited without being falsely promoted to high energy;
2. **dense / mastered** — surviving local deltas should remain articulate without continuous saturation;
3. **repetitive groove** — several small rise / settle / recoil cycles should read inside one larger section.

Do not require a formal measure claim in the third specimen unless beat/meter evidence exists.

Human acceptance question:

> **Does the video feel continuously inhabited while still getting genuinely bigger, smaller, tighter, and looser with the song?**

## 15. Scope boundaries

### In scope

- versioned local response witness from existing measured energy;
- deterministic nested contour plan;
- explicit idle-motion policy separate from signal response;
- section -> local -> micro nesting;
- smoothing / hysteresis / arc commitment;
- topology + Primitive Field first consumption;
- preview/render parity;
- compact evidence and field proof.

### Out of scope

- restoring global midrange lift;
- lowering the 1.0 ceiling;
- full beat/meter estimation;
- calling approximate windows true measures;
- flooding ordinary timeline patches;
- increasing Possession/Topology Arc budgets for local response;
- new Toast Feels;
- inferred stems/control lanes;
- cloud analysis;
- visual-language-v1/v2 changes;
- tag, release, or promotion.

## 16. Decision

Adopt a **versioned canonical Nested Response Contour** for visual-language-v3.

Preserve the calibrated macro response exactly. Recover local expressivity by treating measured sub-section change as a signed continuous force inside that range, while keeping a separately declared topology-aware idle motion floor.

This gives the Toaster the intended hierarchy:

```text
creature identity
    ↓
always-alive intrinsic motion
    +
section-scale dynamic range
    +
nested local contour
    +
sparse categorical dramaturgy
    ↓
coherent motion with actual headroom
```

The implementation plan is intentionally deferred until this design is reviewed.