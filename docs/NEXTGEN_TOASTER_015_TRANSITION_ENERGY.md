# NEXTGEN-TOASTER-015 — TRANSITION ENERGY

Status: experimental descendant of NEXTGEN-TOASTER-014 Law Fossils.

## Thesis

A creative crossing can have an explicit cost without becoming an instruction.

Transition Energy describes how easy or difficult a candidate relation is to reach under the current world, ancestry, residue, and kinship evidence.

    candidate relation
        + base energy
        + current-world resonance
        + law-fossil resonance
        + live residue
        + shared ancestry
        ↓
    TransitionEnergyFieldV0

The field is descriptive possibility only.

    LOWER TRANSITION COST != TAKE TRANSITION
    LOWEST ENERGY != RECOMMENDATION
    REACHABILITY != SELECTION

## Material custody seam

ONE PASS now preserves a bounded provenance-only historyRef for each material lane.

It keeps only:

- exact history capsule identity;
- rendered-media identity;
- generation + parent capsule hashes;
- bounded LawFossilRef;
- bounded WorldLawCauseRef.

It refuses unsupported fields and does not carry an executable Weirdness binding.

This allows PerformanceProgramV0 to retain causal law ancestry without importing sidecars or full history capsules.

## Field contract

Schema: static-collective/transition-energy-field/v0

Policy: explicit-creative-physics/v0

Authority: descriptive-possibility-only

Each candidate has:

- candidateId;
- crossing kind;
- exact frame;
- fromState / toState;
- baseEnergy in [0,1];
- kind-specific targets;
- explicit evidence contributions;
- totalDelta;
- final energy;
- deterministic transitionHash.

Field identity includes the source PerformanceProgram and the complete transition ledger.

Candidate order is canonical by candidateId, so input ordering cannot become hidden preference ordering.

## Founding crossing kinds

### generic-relation

No inferred evidence. Final energy equals base energy.

### law-return

Names one material and one Weirdness axis.

Two independent evidence channels may lower energy:

1. current-world-law-resonance
2. law-fossil-resonance

Current world resonance asks whether the presently compiled world already relaxes the target axis.

Law fossil resonance asks whether the named material has causally proven ancestry under the same relaxed axis.

Neither activates the old law.

### scar-wake

Names an exact ResidueMemory residue.

If that scar is actually alive at the candidate frame, its current explicit strength lowers transition energy.

Before residue birth or after deterministic death, there is no residue contribution.

### kinship-cross

Names two different materials.

Shared exact history-capsule ancestry lowers the crossing cost.

If there is no shared capsule but there is shared causal LawFossil ancestry, a smaller lowering is available.

Kinship remains evidence, not relation authority.

## Founding energy policy

All weights are explicit and included in the field hash:

    current-world law resonance  max lowering 0.20
    law-fossil resonance         max lowering 0.25
    residue presence             max lowering 0.30
    shared history capsule       lowering     0.18
    shared law fossil            lowering     0.12

Final energy:

    energy = clamp(baseEnergy + sum(explicit deltas), 0, 1)

There is no hidden model score, no randomness, and no optimization target.

## Example

Suppose a material was born in a causally verified world with:

    experienced-time-agreement = 0.45

and the current world has:

    experienced-time-agreement = 0.60

A candidate crossing named:

    ordinary clock
        → altered-clock return

may receive two separately inspectable reductions:

    current-world-law-resonance
    law-fossil-resonance

The field can truthfully say:

    this crossing is cheaper here

but it cannot say:

    take this crossing

## Scar example

    dormant scar
       ↓
    scar-wake candidate at frame 240

If ResidueMemory says the scar strength at frame 240 is 0.62, the ledger records that exact witness and its bounded cost reduction.

Scrub to a frame before the scar was born and the contribution disappears.

Thus historical state changes possibility without becoming command.

## Creative physics

Transition Energy changes the Weirdness architecture from isolated transforms into a possibility landscape.

    current world laws
    historical laws
    living residue
    material genealogy
          ↓
    energy landscape

Different crossings can now be:

- expensive;
- moderately reachable;
- unusually easy;

without being ranked as good or bad.

    ENERGY != VALUE
    ENERGY != PROBABILITY

## Relationship to sparse transport

The sibling bound-media × sparse-transport work provides an excellent future execution substrate.

Once a human explicitly accepts a crossing, exact affected regions could later be described and transported through the sparse-work aperture.

But Transition Energy does not assign work and does not grant compute authority.

    POSSIBILITY FIELD != EXECUTION PLAN
    ACCEPTED CROSSING != COMPUTE AUTHORITY

## Dormant evidence channels

Not active in 015:

- ListeningField recurrence / section / density weather;
- explicit lyric anchors;
- constellation evidence;
- vacancy specimens;
- affective weighting;
- transition history / hysteresis;
- learned taste.

Each requires an attributable witness and its own bounded contribution policy before joining the field.

## Founding laws

    LOWER TRANSITION COST != TAKE TRANSITION
    LOWEST ENERGY != RECOMMENDATION
    ENERGY != PROBABILITY
    ENERGY != VALUE
    REACHABILITY != SELECTION
    FIELD != AUTHORITY
    EVIDENCE CONTRIBUTION != CAUSE OF ACCEPTANCE
    LAW FOSSIL != ACTIVE LAW
    HISTORY != DESTINY

## Next aperture

The strongest next crossing is to compose ListeningField into the physics.

Then the same candidate could have a time-varying energy landscape:

    fossil resonance
      ×
    living residue
      ×
    musical recurrence testimony
      ↓
    lower transition energy only in a bounded song region

That would let the world develop real creative weather while preserving:

    WEATHER != COMMAND

and would finally make Transition Energy vary through the full-song address space rather than only from static ancestry and residue facts.
