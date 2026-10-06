# NEXTGEN-TOASTER-019 — PLAYABLE TERRAIN

Status: experimental descendant of NEXTGEN-TOASTER-018 Possibility Map.

## Thesis

A possibility landscape becomes an instrument only when observation, proposal, acceptance, and execution remain separate actions.

    terrain point
      hover/focus = inspect
      click       = propose
      ACCEPT      = bind relation
      execution   = not granted here

Founding laws:

    OBSERVATION != PROPOSAL
    PROPOSAL != ACCEPTANCE
    ACCEPTANCE != EXECUTION

## First playable terrain

019 uses evidence already present in every sealed ONE PASS take: ResidueMemory.

After the take is compiled, the editor may BUILD TERRAIN.

PlayableTerrainV0 exposes one scar-wake PossibilityMap for every actual residue scar.

All eligible residues are exposed. None are ranked.

    ALL ELIGIBLE RESIDUES EXPOSED != RANKED

Each map asks one stable question across uniformly sampled song frames:

    dormant scar → awake scar

The explicit founding base energy is 0.8 and remains visible in terrain identity.

## PlayableTerrainV0

Schema: static-collective/playable-possibility-terrain/v0

Authority: observational-only

It binds:

- exact PerformanceProgram hash;
- exact source performance hash;
- exact ResidueMemory hash;
- fps + total frame domain;
- exact sampling policy;
- exact base-energy policy;
- every residue map;
- deterministic terrain hash.

The SVG projections are generated separately and do not alter terrain identity.

## Franken editor interaction

The terrain panel lives directly under ONE PASS.

Flow:

    seal take
      ↓
    COMPILE TAKE
      ↓
    BUILD TERRAIN
      ↓
    choose one scar map
      ↓
    hover/focus exact map point
      = seek playhead + audio to frame/24
      = inspect energy + contribution ledger
      ↓
    click exact point
      = create PossibilityCrossingProposalV0
      ↓
    explicit ACCEPT CROSSING
      = create PossibilityCrossingBindingV0

Terrain interaction never marks Franken dirty, never recomposes, and never freezes.

## Exact-time inspection

Possibility maps are addressed by the ONE PASS 24 fps clock.

Terrain inspection therefore seeks audio by:

    seconds = frame / 24

rather than stretching song time across the older fixed 1152-frame preview carrier.

## Proposal

Schema: static-collective/possibility-crossing-proposal/v0

Authority: proposal-only

A proposal can only be minted from an exact sampled point already contained in the selected PossibilityMap.

It retains:

- map hash;
- program hash;
- TransitionEnergyField hash;
- candidate identity;
- exact frame;
- exact transition hash;
- observed energy;
- full contribution ledger;
- deterministic proposal hash.

Unsampled frames refuse.

    POINT CLICK != EDIT
    PROPOSAL != ACCEPTANCE
    PROPOSAL != EXECUTION

## ACCEPT binding

Schema: static-collective/possibility-crossing-binding/v0

Authority: human-accepted-relation-only

ACCEPT requires the exact expected proposal hash.

Stale proposal identity refuses.

The binding retains the exact map, proposal, program, transition, frame, and observed energy.

The privileged bridge persists it create-only at:

    FrankenComposer/possibility-bindings/<bindingHash>.json

Identical repeat ACCEPT is idempotent.

Conflicting bytes refuse.

    ACCEPTANCE != EXECUTION
    BINDING != FREEZE
    ACCEPTED CROSSING != RENDER AUTHORITY
    HUMAN ACCEPTANCE != COMPUTE AUTHORITY

## Reset / lineage

Beginning a new ONE PASS take or reloading live organs destroys the in-memory terrain, proposal, and binding UI state.

A previous performance cannot remain playable as if it belonged to the new take.

Durably accepted binding files remain historical artifacts.

## Accessibility

Exact SVG possibility points are keyboard-focusable.

Pointer hover, keyboard focus, or touch/click can inspect exact points.

Click always inspects before proposing.

## Weather-ready seam

The first live UI terrain is residue-driven because the Franken bridge does not yet carry a live ListeningField/RecurrenceField payload.

The proposal and ACCEPT contracts operate on generic PossibilityMapV0.

Therefore recurrence/weather-bearing maps can enter the same interaction surface later without changing proposal or acceptance semantics.

## Founding laws

    TERRAIN != SELECTION
    OBSERVATION != EDIT
    POINT CLICK != EDIT

    PROPOSAL != ACCEPTANCE
    ACCEPTANCE != EXECUTION
    BINDING != FREEZE

    MAP != SELECTION
    MINIMUM OBSERVED ENERGY != RECOMMENDATION
    LOWER TRANSITION COST != TAKE TRANSITION

## Next aperture

The next crossing is execution custody.

An accepted binding may later be translated into an exact sparse-work proposal:

    accepted crossing
       ↓
    affected regions proposal
       ↓
    human/reviewer verifies scope
       ↓
    sparse transport / renderer execution

But 019 deliberately stops before that door.

Seeing a path, proposing a path, accepting a path, and walking it remain four different events.
