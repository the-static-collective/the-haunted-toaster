# NEXTGEN-TOASTER-010 — RESIDUE MEMORY

Status: experimental descendant of NEXTGEN-TOASTER-009 performed topology.

## Question

Can the room remember a performed topology gesture after the gesture ends, across later scenes, without turning memory into hidden render authority?

010 introduces a bounded residue state derived from the proposal-only PerformanceTrace.

```text
sealed human performance
        ↓
PerformanceTrace
        ↓
performed paint event
        ↓
residue seed
        ↓
explicit decay law
        ↓
scene-to-scene memory
        ↓
proposal preview lens
```

## Core distinction

A paint event and the thing it leaves behind are different objects.

```text
PAINT EVENT != RESIDUE
RESIDUE != SOURCE
RESIDUE STATE != FREEZE
CARRY != AUTHORITY
HISTORY != DESTINY
```

The original performed gesture remains witnessed by ONE PASS.

The paint event remains a TRACE proposal.

The residue is a new proposal-only state derived from that paint event.

## Residue birth

Residue begins after the source paint event completes.

Each residue retains:

- source trace hash;
- source performance hash;
- source paint event;
- source placement;
- source material;
- topology surface;
- birth scene;
- birth frame;
- initial strength;
- explicit decay law;
- explicit cross-scene carry policy;
- brush kind and paint mode ancestry;
- path length when the source was a performed spatial stroke.

Initial strength is exactly the paint event's existing brush amount.

010 deliberately does **not** secretly map path length, velocity, acceleration, or other motion measurements into memory strength.

Those may become explicit Syzygies later.

## Decay

Founding policy:

```text
kind: linear
perFrame: 0.0004
floor: 0
carryAcrossScenes: true
```

Strength at a frame is:

```text
initialStrength - ageFrames × decayPerFrame
```

bounded to `[0,1]`.

Before birth: zero.

After deterministic death: zero.

Changing the decay law changes the residue memory identity while preserving the source PerformanceTrace identity.

## Scene memory

The current Franken carrier remains:

```text
ARRIVE    0–383
CROSS   384–767
ASSEMBLE 768–1151
```

ResidueMemoryV0 records scene-entry and scene-exit strengths.

This makes statements like the following inspectable:

```text
ARRIVE:
  gesture happens
  scar is born

CROSS:
  scar enters at 0.14
  leaves at 0.00

ASSEMBLE:
  no surviving scar
```

A stronger or later residue may survive farther.

No renderer needs to infer historical state.

## Scrub archaeology

010 also adds an observational residue lens to the proposal preview.

After ONE PASS seals:

1. the privileged boundary revalidates the receipt;
2. derives PerformanceTrace;
3. derives ResidueMemory;
4. returns a `proposal-preview-only` ecology object.

The preview uses the explicit residue birth/death/decay fields at the current playhead.

Therefore:

```text
scrub before birth
    → no scar

scrub after birth
    → scar appears

scrub forward
    → scar fades

scrub backward
    → state reconstructs deterministically
```

No mutable canvas history is required.

The preview overlay is **not** claimed to be final rendered topology pixels.

## One gesture, four descendants

009 established:

```text
human gesture
  ├─ raw witness
  ├─ placement animation
  └─ topology stroke proposal
```

010 adds:

```text
human gesture
  ├─ raw witness
  ├─ placement animation
  ├─ topology stroke proposal
  └─ residue memory proposal
```

The fourth descendant is historical state.

## Video compost consequence

A finished video fragment can now pass through:

```text
finished clip
   ↓
Video Digestion
   ↓
performed descendant
   ↓
topology stroke
   ↓
residue
   ↓
later scene
```

The source video may no longer be literally visible, while a traceable consequence of its performed descendant remains.

This is the first literal implementation of:

> the room remembers what you painted through it.

## Preview authority

The privileged composition service exposes:

```text
static-collective/performance-ecology-preview/v0
```

containing:

- validated performance hash;
- PerformanceTrace;
- ResidueMemory.

Its authority is:

```text
proposal-preview-only
```

It is excluded from the frozen Franken plan in 010.

This is intentional.

010 proves historical state and inspectable preview before asking renderers to own residue semantics.

## Next Syzygy openings

Now that residue exists as an explicit object, later relations can be named rather than hidden:

```text
path length     → persistence
velocity        → scratch density
scale           → scar width
rotation        → grain orientation
chorus pressure → residue bloom
new stroke      → old scar displacement
kinship         → related descendants wake old scars
```

Each should become an explicit accepted relation.

None are silently active in 010.

## Nonclaims

- no frozen-plan residue semantics yet;
- no Remotion/HyperFrames residue rendering yet;
- preview scar appearance is not final pixels;
- no path-length-to-memory-strength heuristic;
- no optical flow;
- no automatic KEEP;
- no automatic FREEZE;
- no mutable hidden canvas state;
- no claim that history determines future edits.

## Graduation question

The useful human test is:

1. perform an ARRIVE stroke;
2. seal the take;
3. scrub before the gesture;
4. watch the scar appear after its birth;
5. scrub into CROSS;
6. observe whether the surviving residue creates useful compositional history;
7. scrub backward and verify the same history reconstructs;
8. decide whether residue belongs in the frozen grammar.

If it does, the next crossing is no longer “make memory.”

It is:

> **give frozen composition an explicit historical-state channel.**
