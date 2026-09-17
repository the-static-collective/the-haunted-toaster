# RELATIONAL-FIT-001 — Design

**Date:** 2026-09-17  
**Carrier ancestry:** `design/video-phrase-grammar-v1`  
**Status:** approved concept / design descendant; implementation not authorized by this document alone  
**Authority:** experimental only

## Purpose

Add a small general planning concept to Haunted Toaster:

> **FIT THE FORM; DON'T FLATTEN IT.**

A declared relational pattern may be fitted into an available bounded carrier while preserving its internal relation where mathematically possible.

The first intended use is temporal phrase allocation inside Video Phrase Grammar v1. The longer research frontier includes spatial scaling, recurrence density, opacity/intensity envelopes, resolution, bitrate/file-size budgets, frame rate, and perceptual-quality-aware compression.

This is **not** a `369 mode`, numerology feature, preset, or hidden aesthetic authority.

The calibration specimen happens to be:

```text
(1,2,3)
(3,2,1)
(3,6,9)
(9,6,3)
```

because that specimen exposed the underlying engineering question. The runtime primitive, if later implemented, must accept arbitrary lawful weight patterns.

---

## Research ancestry

The design descends from two research packets, but imports only their formal engineering survivor:

```text
ALEX:
ORDER / SCALE / RECURRENCE
        ↓
Dogram:
WHICH DECLARED RELATION SURVIVES THE TRANSFORM?
        ↓
Toaster:
HOW CAN A CREATIVE PLAN FIT A BOUNDED CARRIER
WITHOUT NEEDLESSLY DESTROYING ITS INTERNAL SHAPE?
```

No biblical, Hermetic, prophetic, symbolic, or metaphysical interpretation becomes Toaster execution authority.

Boundary:

```text
RESEARCH MOTIVE != RUNTIME SEMANTICS
NUMBER SPECIMEN != AESTHETIC LAW
FORMAL ANALOGY != PRODUCT AUTHORITY
```

---

## Existing seam

Video Phrase Grammar v1 already supplies the correct substrate:

- deterministic candidate-owned phrase plans;
- bounded phrase spans;
- source-window retiming;
- forward / reverse / ping-pong traversal;
- recurrence cycles;
- crop / zoom / rotation / mirror transforms;
- deterministic Toaster spectrum coordinate;
- exact phrase-plan identity and replay;
- shared preview/final compilation;
- explicit future richer-time and richer-spatial topology.

`RELATIONAL-FIT-001` should therefore be a **planner utility / policy seam**, not another top-level mode selector.

The human should not see a new `369`, ratio, or mystical-number control.

---

## Core law

Given strictly positive weights:

```text
w = (w1, w2, ..., wn)
```

and a finite positive budget `B`, define normalized weights:

```text
p_i = w_i / sum(w)
```

and ideal allocation:

```text
a_i = B * p_i
```

Example:

```text
weights = (1,2,3)
budget = 18 seconds
ideal = (3s,6s,9s)
```

Reversed orientation:

```text
weights = (3,2,1)
budget = 18 seconds
ideal = (9s,6s,3s)
```

The resulting values are not chosen because `3/6/9` is privileged. They are the normalized consequence of the supplied weights and total budget.

General seal:

```text
RELATIONAL FIT PRESERVES DECLARED PROPORTION
WHEN THE TARGET CARRIER CAN REPRESENT IT.
```

---

## Distinguish four operations

The design must keep these separate.

### 1. `RELATIONAL_FIT`

Exact or tolerance-bounded allocation of one declared relation into one finite carrier.

Examples:

- phrase durations;
- source-window durations;
- recurrence-cell lengths;
- relative transform increments.

Primary question:

```text
Can this carrier represent the relation?
```

### 2. `ORIENTATION`

Change ordered direction without pretending the result is the same ordered trace.

Examples:

```text
(1,2,3) -> (3,2,1)
forward -> reverse
rise -> fall
```

Primary question:

```text
Which order changed, and was that change explicitly selected?
```

### 3. `RECURRENCE`

Re-embed a relation at another phrase/time/context.

Primary question:

```text
Where did this pattern recur?
```

Boundary:

```text
RECURRENCE != SAME OCCURRENCE
```

### 4. `BUDGET_OPTIMIZATION`

Choose among lossy media representations under constraints such as file size, quality, resolution, encode time, compatibility, and platform limits.

Primary question:

```text
What trade-off was made, under which declared objective and constraints?
```

This is **not** exact relational scaling.

---

# Phase A — temporal relational fit

The first implementation target, if approved later, should be temporal only.

## Candidate use

A phrase planner may derive a small weight pattern from explicit candidate evidence/seed/policy and fit it into a declared time budget.

Example:

```text
phrase budget: 12 seconds
weights: [1, 1, 2]
ideal spans: [3, 3, 6] seconds
```

Another candidate may derive:

```text
phrase budget: 12 seconds
weights: [3, 2, 1]
ideal spans: [6, 4, 2] seconds
```

The pattern source must be attributable:

```text
patternSource:
  explicit-policy
  deterministic-candidate-seed
  declared-evidence-derived
```

No hidden learned taste inference is introduced by this design.

## Integer tick/frame allocation

Actual timelines use discrete ticks/frames, so ideal real-valued allocation may not divide evenly.

The planner must preserve total budget exactly:

```text
sum(allocatedTicks) == budgetTicks
```

and receipt rounding residual.

Recommended future policy:

1. calculate exact rational shares;
2. floor each share;
3. distribute remaining ticks deterministically by largest fractional residual, with stable tie-breaking;
4. record ideal share, integer allocation, and residual per segment.

Boundary:

```text
ROUNDING != EXACT SCALE
```

A receipt must make the approximation visible.

---

## Temporal use cases

Once Phase A is proven, relational fit may be considered for:

- phrase-length families;
- source-window families;
- forward/reverse call-and-response spans;
- ping-pong subphase lengths;
- freeze/stutter cell lengths;
- jump-cut dwell times;
- nested recurrence groups;
- transition attack/sustain/release proportions;
- overlap windows.

No use case is authorized merely by appearing in this list.

---

# Phase B — bounded spatial/intensity fit frontier

After temporal fit has replay and field proof, the same pure allocation concept may be evaluated for dimensions that are meaningfully scalar.

Candidate examples:

- zoom-step magnitudes;
- crop inset progression;
- opacity envelope segments;
- blend weights;
- panel-width allocation in future multi-panel layouts;
- bounded radial/tile counts where integer realization is explicit.

Every dimension must declare:

```text
unit
minimum
maximum
quantization rule
clamp behavior
invariant being preserved
```

If clamping changes the normalized relation beyond policy tolerance, the planner must receipt distortion or refuse.

Boundary:

```text
CLAMPED SHAPE != ORIGINAL SHAPE
```

---

# Phase C — compression / size / quality research frontier

This is the requested extension, and it requires a different model.

## Why compression is not ordinary scale

Media file size and perceived quality do not obey a simple law such as:

```text
half bitrate = half quality
```

or:

```text
half resolution = half file size
```

Actual results depend on:

- codec and encoder implementation;
- content motion/detail/noise;
- duration;
- resolution;
- frame rate;
- chroma format / bit depth;
- keyframe structure;
- audio payload;
- rate-control mode;
- container overhead;
- encoder preset / effort;
- hardware vs software path.

Therefore compression belongs under:

```text
CONSTRAINED OPTIMIZATION
```

not pure proportional identity.

---

## Media-budget model

A future `MediaBudgetPlan` should accept explicit constraints rather than one vague `quality` slider.

Conceptual input:

```js
{
  sourceId,
  target: {
    maxBytes,
    maxWidth,
    maxHeight,
    maxFps,
    maxDuration,
    compatibilityProfile
  },
  priorities: [
    "preserve-duration",
    "preserve-frame-rate",
    "preserve-resolution",
    "preserve-perceptual-quality"
  ],
  policyVersion
}
```

The exact future schema must be designed against current packaging/render boundaries before implementation.

The plan must never silently infer that the first listed objective is morally or aesthetically superior. It is merely a declared optimization policy.

---

## File-size targeting

A useful first-order relation is:

```text
approximate payload bytes
≈
(total average bitrate bits/sec * duration sec) / 8
```

This can provide a starting bitrate budget when a target file size is known.

But the receipt must say `estimated`, not exact, because:

- audio consumes part of the bitrate budget;
- mux/container overhead exists;
- variable bitrate distribution changes local behavior;
- encoder realization may miss a target slightly.

For strict size targets, future research should compare:

1. average-bitrate / two-pass encoding;
2. constrained VBR;
3. iterative encode-measure-adjust loops;
4. resolution/frame-rate reduction before or after bitrate pressure.

No strategy is selected by this design.

---

## Quality targeting

Quality-targeted VBR/CRF-style encoding answers a different question from file-size targeting:

```text
maintain a quality-control target
and allow file size to vary
```

while bitrate / two-pass approaches can prioritize a size/rate budget.

Future Toaster policy must not label one as simply `better`.

Potential modes are internal policy identities such as:

```text
quality-constrained
size-constrained
compatibility-constrained
balanced-experimental
```

Those names are examples for research, not approved UI.

---

## Resolution scaling frontier

FFmpeg's scale machinery can deterministically resize video, but the creative policy must decide when resolution reduction is preferable to stronger compression at native resolution.

Research questions:

- At a fixed byte budget, when does lower resolution with milder quantization outperform native resolution with aggressive compression?
- How does source detail/motion change that boundary?
- Should short social/export surfaces use different ladders than archival/local outputs?
- Can source dimensions and intended display size provide a bounded prior without assuming screen context that was never declared?
- How should aspect-ratio-safe scaling and even-dimension encoder requirements be receipted?

The answer should be empirical and codec-specific, not one universal formula.

---

## Frame-rate scaling frontier

Frame-rate reduction may save substantial bitrate for some content but can destroy motion character.

Research questions:

- When is FPS reduction less perceptually damaging than resolution reduction?
- How should high-motion Specimen Pulse / motion evidence influence the choice without acquiring automatic authority?
- Can duplicate/static-heavy material tolerate lower FPS while preserving meaningful motion?
- When should the system refuse to reduce FPS because timing/motion topology is part of candidate identity?

Boundary:

```text
FRAME COUNT != MOTION MEANING
```

---

## Perceptual witnesses

Future experiments may use objective witnesses such as:

- VMAF where available;
- SSIM;
- PSNR as a low-level diagnostic;
- source/output byte size;
- encode time;
- resolution/FPS;
- exact codec/encoder options;
- human field preference.

FFmpeg exposes a `libvmaf` filter when built with the required library, and its ordinary scale/filter graph provides deterministic transformation surfaces. These tools may witness a comparison; they do not decide creative truth.

Sources for the research frontier:

- FFmpeg filters documentation: <https://ffmpeg.org/ffmpeg-filters.html>
- FFmpeg command documentation: <https://ffmpeg.org/ffmpeg.html>

Boundary:

```text
VMAF != HUMAN VERDICT
SSIM != AESTHETIC VALUE
SMALLER FILE != BETTER OUTPUT
HIGHER SCORE != CORRECT CREATIVE DESCENDANT
```

---

## Quality-preservation question

The compression descendant should eventually ask a version of the same original question:

> **What makes this output still recognizably the same intended media descendant after a lossy transform?**

But here the invariant is plural and scoped, not absolute.

Possible predeclared invariants/constraints:

```text
same duration
same audio sync
same aspect ratio
same candidate phrase plan
same frame-order semantics
same visible text legibility floor
minimum perceptual score vs reference
maximum file bytes
maximum dimensions
platform decode compatibility
```

A compression result may preserve some and sacrifice others.

The receipt must say which.

---

## Candidate future `MEDIA-SCALE-SPECTRUM`

If research eventually supports it, Toaster could have an internal deterministic spectrum for export pressure rather than another cluttered dropdown matrix.

One conceptual axis:

```text
SOURCE-FIDELITY <--------------------> DELIVERY-PRESSURE
```

But it must **not** be implemented as one hidden scalar that conflates every dimension.

A lawful implementation would resolve the spectrum through an explicit versioned policy table that chooses bounded constraints/objectives, then receipt the resulting individual decisions:

```text
resolution decision
fps decision
rate-control decision
bitrate/quality target
codec/preset decision
measured bytes
quality witnesses
```

The spectrum may select a policy profile.

It may not erase the profile's dimensional receipts.

---

# Relationship to candidate identity

For temporal/spatial relational fit that affects creative composition:

```text
changed fit plan
=> changed candidate derivation identity
=> stale KEEP invalidated
```

For post-composition delivery compression, the boundary may instead be:

```text
same accepted creative candidate
+ different delivery descendant
```

This distinction is important.

A 1080p and 720p export of one accepted composition need not become two different creative candidates if the composition itself is unchanged. They should be separately addressed delivery descendants with their own render/compression receipts.

Therefore:

```text
CREATIVE TRANSFORM IDENTITY
!=
DELIVERY ENCODE IDENTITY
```

Do not bind export-file size experimentation into candidate KEEP semantics unless the experiment actually changes creative composition.

---

# Proposed architecture boundaries

No implementation is authorized yet, but the eventual shape should remain separated.

### Pure relation module

Potential module:

```text
src/full-measure/src/math/relational-fit.cjs
```

Responsibilities:

- normalize positive weight vectors;
- allocate rational/continuous budgets;
- perform deterministic integer budget allocation;
- receipt rounding residual;
- contain no FFmpeg, Electron, UI, or candidate semantics.

### Phrase planner adapter

`video-phrase-plan.cjs` may consume the pure relational-fit result when a versioned planning policy explicitly requests it.

### Delivery budget planner — future only

Potential separate module:

```text
src/full-measure/src/render/media-budget-plan.cjs
```

Responsibilities would eventually include:

- declared output constraints;
- bitrate budget estimates;
- encode-profile selection from explicit versioned policy;
- no direct process execution;
- no candidate creative authority.

### Encoder/compiler

Existing render/FFmpeg surfaces perform the accepted delivery plan and return measured receipts.

Planning remains separate from execution.

---

# Receipts

## Relational-fit receipt

A future receipt should contain at minimum:

```text
schema
policyVersion
sourceWeights
orientation
budgetUnit
budgetTotal
idealAllocations
realizedAllocations
roundingResiduals
normalizedSourceRelation
normalizedRealizedRelation
maxRelationError
result: exact | approximated | refused
```

## Media-budget receipt — future

Potential fields:

```text
schema
policyVersion
sourceMediaIdentity
targetConstraints
priorityProfile
codec / encoder
resolution
frameRate
rateControlMode
qualityTarget or bitrateTarget
audio allocation
estimatedTargetBytes
actualBytes
encodeDuration
qualityWitnesses
referenceIdentity
constraintViolations
result: accepted | measured_out_of_bounds | refused
```

No metric field grants authority merely by existing.

---

# Failure / refusal law

Relational fit must refuse or explicitly approximate when:

- weight vector is empty;
- a required-positive weight is zero/negative;
- weights contain NaN/Infinity;
- budget is nonpositive;
- discrete target cannot satisfy required minimum segment sizes;
- clamping would exceed declared relation-error tolerance;
- integer allocation cannot satisfy both exact total and hard per-cell bounds.

Media-budget planning must refuse when:

- constraints are mutually impossible under supported encoders;
- required codec/profile is unavailable;
- a strict maximum byte limit cannot be guaranteed by the selected policy;
- reference-based quality measurement is requested but reference alignment is invalid;
- output would violate a declared minimum legibility/resolution/FPS floor;
- planner cannot attribute which policy generated the chosen settings.

No silent fallback to arbitrary defaults.

---

# Proof gates — future Phase A

A temporal `RELATIONAL-FIT-001` implementation should not widen beyond experiment until these pass:

1. **EXACT CONTINUOUS FIT** — `(1,2,3)` into 18 seconds yields exact `(3,6,9)`.
2. **REVERSE** — `(3,2,1)` into 18 seconds yields `(9,6,3)` without silently relabeling orientation.
3. **ARBITRARY PATTERN** — a non-123 specimen such as `(2,3,5)` proves the mechanism is general.
4. **INTEGER TOTAL** — discrete tick allocation preserves total budget exactly.
5. **ROUNDING RECEIPT** — nondivisible allocations expose ideal vs realized shares.
6. **HOSTILE NONUNIFORM CONTROL** — planner never claims relation preservation for a candidate outside tolerance.
7. **REPLAY** — same weights/budget/policy yields byte-identical plan/receipt.
8. **PHRASE INTEGRATION** — one candidate uses relational fit for phrase spans without changing unrelated phrase grammar semantics.
9. **KEEP LAW** — creative fit-plan identity participates in candidate identity.
10. **NO UI MODE** — ordinary product surface gains no `369` or ratio dropdown.
11. **FIELD WITNESS** — actual video output demonstrates that proportional phrase allocation is creatively useful, not merely mathematically tidy.

---

# Compression research gates — before implementation

The media-scaling frontier should remain research-only until a separate packet answers at least:

1. Which current production codecs/encoders are actually shipped and available in packaged Toaster builds?
2. Which rate-control modes behave consistently on Windows packaged builds?
3. Can strict or near-strict file-size targets be reproduced across representative source classes?
4. Is VMAF available in the packaged FFmpeg build, or would that introduce an unacceptable dependency/build change?
5. What simple fallback witness set works everywhere if VMAF is unavailable?
6. How should reference alignment be normalized before metric comparison?
7. What resolution/FPS/bitrate combinations form a useful empirical Pareto frontier for representative Toaster outputs?
8. Which transforms preserve text/lyrics legibility?
9. How should audio bitrate be budgeted rather than treated as invisible overhead?
10. Which compression changes are delivery-only descendants versus creative changes requiring candidate identity delta?

---

# Suggested research corpus for compression frontier

Use small representative media classes rather than one giant benchmark:

```text
A. static / typography-heavy
B. low-motion photographic
C. high-motion / dance / handheld
D. noisy / grainy / dark footage
E. generated topology / masks
F. mixed candidate with text + foreign Video
```

For each source, sweep a bounded matrix such as:

```text
resolution: native, 1080p, 720p, 540p
fps: source, 30, 24, 15 where lawful
rate control: quality-targeted vs size-targeted
encoder effort: bounded supported presets
```

Record:

```text
bytes
encode seconds
VMAF/SSIM/PSNR where available
text-legibility checks
human field disposition
```

Then retain the Pareto frontier rather than inventing one universal best setting.

Boundary:

```text
BENCHMARK WINNER != UNIVERSAL POLICY
```

---

# Explicit non-goals

- no 369 preset;
- no sacred-number UI;
- no hidden symbolic scoring;
- no cross-repo runtime dependency on ALEX or Dogram;
- no generic `same thing` ontology;
- no universal quality score;
- no automatic preference inference;
- no auto-upload optimization without explicit destination constraints;
- no replacing existing renderer authority;
- no changing current accepted Video Phrase Grammar v1 proof gates;
- no assuming compression is a linear scaling problem;
- no claiming objective metrics determine artistic quality.

---

# Compact laws

```text
FIT THE FORM; DON'T FLATTEN IT.

CARRIER != RELATION
SCALE != ORIENTATION
RECURRENCE != IDENTITY
ROUNDING != EXACT SCALE
CLAMPING != PRESERVATION

CREATIVE TRANSFORM IDENTITY
!=
DELIVERY ENCODE IDENTITY

FILE SIZE != QUALITY
QUALITY METRIC != HUMAN VERDICT
BITRATE != PERCEPTUAL FIDELITY
RESOLUTION != DETAIL RETAINED

EXACT RELATIONAL FIT
!=
CONSTRAINED MEDIA OPTIMIZATION
```

---

# Intended next step

After human review of this written design, write one implementation plan for **Phase A temporal relational fit only**.

Do **not** combine compression implementation into that plan.

Compression/size/quality remains a named research frontier until its packaged-FFmpeg capabilities, metric availability, representative corpus, and delivery-vs-creative identity boundaries are separately proven.
