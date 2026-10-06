# NEXTGEN-TOASTER-011 — PERFORMANCE BECOMES PROGRAM

Status: experimental descendant of NEXTGEN-TOASTER-010 residue memory.

## Question

Can one sealed human edit performance become a portable, deterministic movie program that can be interrupted, resumed, duplicated, inspected, and replayed **without claiming that replay is a second performance**?

011 answers the first narrow part of that question.

```text
sealed ONE PASS witness
        ↓
PerformanceTrace
        ↓
ResidueMemory
        ↓
PerformanceProgramV0
        ├─ exact timeline actions
        ├─ performed topology
        ├─ explicit residue history
        └─ exact frame-region work plan
                    ↓
             execution witnesses
                    ↓
          missing-region reconstruction
```

## Founding law

```text
REPLAY != RE-PERFORMANCE
```

The ONE PASS receipt remains the historical witness of what the human did.

A PerformanceProgram replay may reproduce deterministic consequences of that witness. It does **not** mint another human performance, replace the original witness, or become retrospective authority over it.

## PerformanceProgramV0

011 adds:

```text
static-collective/performance-program/v0
```

with authority:

```text
portable-replay-description-only
```

The program carries:

- the original ONE PASS performance hash;
- exact timeline actions derived from lawful placements;
- the complete proposal-only PerformanceTrace;
- the complete proposal-only ResidueMemory;
- an exact non-overlapping render-region plan;
- explicit replay semantics;
- a deterministic program hash.

It remains a description. It does not grant renderer, compute, economic, ownership, or continuation authority.

## The three artifacts

The privileged Franken service can compile one sealed take into a create-only, byte-stable directory:

```text
FrankenComposer/
  performance-program/
    <programHash>/
      performance-program.json
      render-region-plan.json
      execution-receipt.json
```

### performance-program.json

The portable score.

### render-region-plan.json

The founding carrier is still 1152 frames at 24 fps.

011 uses a fixed 24-frame work region:

```text
1152 frames / 24 frames
= 48 exact regions
```

Each region has:

- exact start frame;
- exact exclusive end frame;
- exact frame count;
- stable region ID;
- deterministic region-plan lineage.

The regions cover the carrier exactly once: no gaps and no overlaps.

### execution-receipt.json

The initial execution-state receipt.

At compile time it truthfully says:

```text
attempts = 0
covered = 0
missing = all 48 regions
complete = false
aggregate output = none
```

It does not pretend compilation rendered anything.

## First executable interruption specimen

The local 011 execution witness is intentionally smaller than a renderer.

It computes a deterministic digest for an exact region and emits a witness-only region receipt. This lets the orchestration semantics be tested without pretending those digests are video pixels.

The founding interruption test executes:

```text
21 / 48 regions
= 43.75%
```

Then execution stops.

The reconstructed state reports the exact remaining 27 region IDs. No hidden cursor or process-local mutable state is required to know where to resume.

## Overlapping work / fork pressure

The next specimen intentionally gives two workers overlapping work.

One worker covers regions 21–30.

Another covers regions 21–25 plus 31–35.

Therefore five exact regions are attempted twice.

011 preserves both attempts as witnesses while coverage accounting obeys:

```text
ATTEMPT COUNT != COVERAGE
DUPLICATE WORK != DOUBLE CREDIT
```

After the exact missing set is completed, the aggregate deterministic simulation digest equals a clean one-pass execution of all 48 regions.

That proves the local accounting seam.

It does **not** claim GHoT recursive fork resolution has been imported into Toaster.

## Why this matters

Before 011, the human performance could generate:

```text
placement
animation
topology
residue
```

011 gives those consequences a portable executable shape:

```text
performance
    ↓
program
    ↓
exact work topology
    ↓
interruption
    ↓
missing-set reconstruction
    ↓
resume
```

The edit is no longer only a project-state mutation.

It can become a reconstructible score.

## Current laws

```text
REPLAY != RE-PERFORMANCE
PROGRAM != PERFORMANCE
PROGRAM != RENDER AUTHORITY
TRACE != FREEZE
HISTORY != DESTINY
REGION PLAN != EXECUTION
REGION PLAN != COMPUTE AUTHORITY
REGION ASSIGNMENT != COMPUTE CAPACITY AUTHORITY
ATTEMPT COUNT != COVERAGE
DUPLICATE WORK != DOUBLE CREDIT
REGION SIMULATION DIGEST != RENDERED PIXEL PROOF
EXECUTION RECEIPT != ECONOMIC VALUE
EXECUTION RECEIPT != OWNERSHIP
EXECUTION RECEIPT != CONTINUATION AUTHORITY
```

## Relationship to GHoT

GHoT's recent LIGHTWALKER work already contains the stronger distributed semantics:

- recursive continuation;
- fork detection;
- explicit resolution;
- losing-work preservation;
- exact work-region provenance;
- sparse missing-region assignment;
- independent compute-capacity authority.

011 does not copy those mechanisms into Toaster.

Instead it creates the portable particulars a future crossing needs:

```text
program hash
region-plan hash
exact region IDs
exact missing set
per-region witnessed attempt
aggregate coverage accounting
```

That keeps the seam honest:

```text
TOASTER DESCRIBES THE MOVIE WORK
GHoT MAY LATER CARRY THE WORK
NEITHER SILENTLY BECOMES THE OTHER
```

## Relationship to resource witnesses

CPU, storage, network, or energy evidence may later be attached to actual region execution.

011 does not do that.

In particular:

```text
RESOURCE MEASUREMENT != ARTISTIC VALUE
RESOURCE RECEIPT != PAYMENT
RESOURCE RECEIPT != OWNERSHIP
```

## Nonclaims

011 does **not** yet provide:

- actual distributed rendering;
- actual remote worker transport;
- GHoT continuation/fork authority inside Toaster;
- rendered-pixel verification;
- pixel-region salvage;
- compute-capacity authorization;
- storage/network/energy proof;
- payment or valuation;
- automatic FREEZE or KEEP;
- a claim that deterministic replay recreates the human event.

The local execution witness hashes exact work descriptions. It is an orchestration proof, not a movie renderer.

## Graduation aperture

The next meaningful crossing is concrete:

1. bind an actual deterministic render command to one exact PerformanceProgram region;
2. record the resulting real frame/pixel artifact digest;
3. stop after a partial set;
4. reconstruct the exact missing set;
5. resume elsewhere;
6. compare the final artifact graph with a clean uninterrupted render;
7. only then consider a GHoT sparse-work adapter.

If that passes, the phrase **playable compiler for movies** stops being metaphor and becomes an executable transport boundary.
