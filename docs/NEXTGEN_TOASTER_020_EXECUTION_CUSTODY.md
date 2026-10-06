# NEXTGEN-TOASTER-020 — EXECUTION CUSTODY

Status: experimental descendant of NEXTGEN-TOASTER-019 Playable Terrain.

## Thesis

Accepting a creative crossing is not enough to execute it.

020 inserts two additional custody gates:

    accepted relation
        ↓
    exact affected-region proposal
        ↓
    explicit human scope approval
        ↓
    sparse transport parcel
        ↓
    separate local execution authorization
        ↓
    pixel-region execution witness

Founding non-collapse:

    ACCEPTANCE != EXECUTION
    SCOPE APPROVAL != EXECUTION AUTHORIZATION

## Why a derived program was necessary

The existing renderer could sparsely re-render the current PerformanceProgram, but that would not execute an accepted crossing.

020 therefore gives the first accepted crossing an explicit renderer-visible meaning.

Supported execution kind in v0:

    scar-wake

## Scar-wake execution semantics

An accepted scar-wake does not rewrite prior history.

Before the accepted frame:

    derived world = source world

At and after the accepted frame:

    target scar receives a bounded wake envelope

The wake envelope is:

- exact activation frame from the accepted binding;
- exact target residue ID from the accepted candidate semantics;
- explicit wake strength;
- explicit decay per frame;
- max-composed with the historical residue rather than replacing it.

Thus:

    SCAR WAKE != HISTORY REWRITE
    WAKE ENVELOPE != SOURCE RESIDUE

The derived PerformanceProgram receives a new program hash and preserves the original sourceProgramHash inside crossingExecution.

## Candidate semantics survive ACCEPT

019 proposals/bindings preserved kind/from/to, but execution needs kind-specific target semantics.

020 carries the full canonical candidateSpec through:

    PossibilityMap
      → proposal
      → accepted binding

For scar-wake this includes targetResidueId.

## Affected-region proposal

Schema:

    static-collective/crossing-affected-region-proposal/v0

Authority:

    scope-proposal-only

The system computes every frame where the derived scar-wake program has different residue strength from the source program.

Those exact changed frames are compressed into spans and intersected with the existing RenderRegionPlan.

The proposal carries:

- source binding hash;
- source program hash;
- derived program hash;
- region-plan hash;
- target residue;
- activation frame;
- wake strength;
- wake decay;
- exact changed-frame spans;
- exact affected region IDs + frame spans;
- region-set digest;
- no compute authority;
- no render authority.

    CHANGED FRAME != REGION AUTHORITY
    AFFECTED REGION PROPOSAL != SCOPE APPROVAL

## Human scope approval

Schema:

    static-collective/crossing-execution-scope-approval/v0

Authority:

    human-approved-scope-only

Approval requires the exact scopeProposalHash.

The proposal body is independently rehashed before approval, so mutated scope cannot approve itself by echoing an old hash.

The approved region set must equal the reviewed proposal exactly.

    SCOPE APPROVAL != EXECUTION AUTHORIZATION
    APPROVED REGION != COMPUTE CAPACITY
    SCOPE APPROVAL != RENDER AUTHORITY

## GHoT-067 sparse transport composition

020 selectively composes the sparse-work grammar from Haunted Toaster #345 / GHoT-067 without overwriting the newer Weirdness-aware renderer.

Pinned donor:

    repo: the-static-collective/GHoT
    PR:   #64
    ref:  exp067
    SHA:  6456828ca6d2ee2cd10db2017cbd9278c1e3c664

The parcel schema is:

    static-collective/ghot-067-approved-crossing-parcel/v0

Compatibility statement:

    shape-compatible-with-ghot-067-not-a-ghot-signature

It contains the exact human-approved region IDs and asserts:

    computeCapacityAuthority = none
    ownershipTransfer = false
    settlementAuthority = none

Therefore:

    REGION ASSIGNMENT != OWNERSHIP
    SCOPE APPROVAL != COMPUTE CAPACITY AUTHORITY

## Separate execution authorization

The sparse parcel still refuses execution unless the caller explicitly supplies:

    localExecutionAuthorized = true

This is a separate UI action:

    AUTHORIZE LOCAL EXECUTION

Only then does the current deterministic witness renderer execute the exact approved regions of the derived crossing program.

No outside region may execute.

## Real pixel consequence

The witness renderer now consumes crossingExecution semantics when calculating residue strength.

For an affected region:

    source PerformanceProgram pixels
        !=
    scar-wake derived-program pixels

This closes the causal gap that would otherwise make sparse execution merely recompute the old world.

## Sparse result

Schema:

    static-collective/ghot-067-approved-crossing-result/v0

Authority:

    execution-witness-only

It records:

- parcel identity;
- derived program identity;
- approved scope identity;
- worker particular;
- consumed region IDs;
- returned unfinished region IDs;
- exact pixel receipt hashes.

020's local UI consumes all approved regions in one pass, but the contract retains returnedRegionIds for future partial/distributed execution.

    EXECUTION RESULT != RENDER ACCEPTANCE
    PARTIAL EXECUTION MUST PRESERVE RETURNED REGION IDS

## Franken editor custody ladder

The playable terrain panel now exposes:

    ACCEPT CROSSING
        ↓
    PREPARE SCOPE
        ↓
    review exact changed frames + region IDs
        ↓
    APPROVE SCOPE
        ↓
    AUTHORIZE LOCAL EXECUTION

Each state has a distinct hash and UI readout.

Execution artifacts are persisted under:

    FrankenComposer/crossing-executions/
      <bindingHash>/
        <scopeApprovalHash>/

including:

- derived-program.json;
- scope-proposal.json;
- scope-approval.json;
- sparse-parcel.json;
- sparse-result.json;
- pixel-region witness output.

Scope approvals are separately persisted create-only.

## Nonclaims

020 does not:

- FREEZE the Franken composition;
- mark the sparse result as accepted final render;
- splice affected region pixels into a finished movie;
- grant external worker compute capacity;
- transfer ownership;
- settle value;
- make low energy a recommendation.

Thus sparse pixel witness execution is now real, but final artifact adoption remains a later door.

## Founding laws

    ACCEPTANCE != EXECUTION
    BINDING != FREEZE

    SCAR WAKE != HISTORY REWRITE
    EXECUTION DESCRIPTION != COMPUTE AUTHORITY

    AFFECTED REGION PROPOSAL != SCOPE APPROVAL
    SCOPE APPROVAL != EXECUTION AUTHORIZATION
    APPROVED REGION != COMPUTE CAPACITY

    REGION ASSIGNMENT != OWNERSHIP
    REGION PARCEL != REGION RESULT

    EXECUTION RESULT != RENDER ACCEPTANCE

## Next aperture

The next exact seam is artifact adoption.

Source-world pixels and derived-world sparse pixels now both have receipts.

A future slice can:

    verify unaffected source regions
      +
    verify executed derived regions
      ↓
    compose one candidate derived frame graph
      ↓
    REVIEW
      ↓
    explicit ADOPT / reject

That would complete the path from:

    see door
      → propose door
      → accept door
      → approve footprint
      → execute footprint
      → inspect actual changed world

without ever making execution equivalent to creative acceptance.
