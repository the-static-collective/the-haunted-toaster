# NEXTGEN-TOASTER-021 — ARTIFACT ADOPTION

Status: experimental descendant of NEXTGEN-TOASTER-020 Execution Custody.

## Thesis

Executing an accepted crossing produces evidence, not a canonical movie.

021 adds the final human disposition seam:

    source-world pixel evidence
          +
    approved derived-world sparse pixel evidence
          ↓
    candidate derived frame graph
          ↓
    hash-verified review MP4
          ↓
    human ADOPT / REJECT

Founding law:

    EXECUTION RESULT != RENDER ACCEPTANCE

## Narrow composition

The sparse executor works in full render regions, but the crossing may change only some frames inside those regions.

021 therefore does not grant derived provenance to an entire affected region.

For every frame:

- if crossing semantics actually changed that exact frame, use the derived-world pixel witness;
- otherwise retain source-world pixel provenance, even when the frame lives inside a region that had to be re-executed.

    AFFECTED WORK REGION != DERIVED FRAME
    UNCHANGED FRAME != DERIVED PROVENANCE

This makes the candidate graph as narrow as the accepted crossing itself.

## CandidateDerivedFrameGraphV0

Schema:

    static-collective/candidate-derived-frame-graph/v0

Authority:

    review-candidate-only

The graph binds:

- source PerformanceProgram hash;
- derived PerformanceProgram hash;
- source whole-render receipt;
- exact scope proposal + approval;
- renderer identity;
- fps;
- every frame hash;
- per-frame provenance: source-world or derived-world;
- source receipt hash for every frame;
- exact changed-frame count;
- exact derived region IDs;
- deterministic candidate pixel graph hash;
- deterministic candidate graph hash.

Every changed frame must have a derived sparse execution receipt.

Every approved affected region must have exactly one derived receipt.

Missing, duplicate, or outside-scope receipts refuse.

## Whole-world equivalence proof

The founding contract compares the mixed candidate graph to one clean uninterrupted whole render of the derived program.

The frame SHA-256 sequence must match exactly.

Thus the sparse splice proves:

    source unchanged frames
      +
    exact derived changed frames
      ==
    uninterrupted derived world

without requiring every unchanged frame to be recomputed as derived work.

## Review media

Schema:

    static-collective/candidate-artifact-review-media/v0

Authority:

    review-projection-only

Before encoding review media, 021 re-reads every source/derived PPM from disk and verifies its bytes against the frame hash already bound into the candidate graph.

Any byte drift refuses.

The verified frames are copied into one contiguous candidate sequence and encoded to MP4 with the packaged FFmpeg seam.

The review-media receipt binds:

- candidate graph hash;
- candidate pixel graph hash;
- frame count;
- fps;
- review MP4 SHA-256;
- review MP4 byte length;
- deterministic review-media receipt hash.

    ENCODED REVIEW != PIXEL AUTHORITY
    REVIEW MEDIA != ADOPTION

## Franken editor

After sparse execution, the terrain panel now exposes:

    BUILD REVIEW

This:

1. renders one source-world witness sequence;
2. validates the completed sparse execution lineage;
3. composes the candidate derived frame graph;
4. verifies every PPM byte;
5. materializes the mixed frame sequence;
6. encodes the review MP4;
7. loads that exact MP4 into an inline video player.

The UI displays:

- changed-frame count;
- total frame count;
- candidate graph hash;
- review-media SHA-256;
- final disposition hash/path.

## Artifact disposition

Schema:

    static-collective/candidate-artifact-disposition/v0

Authority:

    human-artifact-disposition-only

Allowed decisions:

    ADOPT
    REJECT

A disposition requires:

- exact expected candidateGraphHash;
- independently validated review-media receipt;
- exact review MP4 SHA-256;
- explicit human actor.

ADOPT and REJECT have different disposition identities.

## One graph, one disposition

The persistent destination is singular:

    FrankenComposer/artifact-dispositions/
      <candidateGraphHash>/
        disposition.json

Identical repeats are idempotent.

Once one choice exists, the opposite choice refuses rather than creating contradictory history.

    ONE CANDIDATE GRAPH -> ONE DURABLE DISPOSITION

## REJECT is evidence too

REJECT does not delete:

- the accepted crossing;
- approved scope;
- execution witness;
- candidate graph;
- review media.

It records that the exact reviewed candidate was declined.

    REJECTION PRESERVES EVIDENCE

This allows rejected creative branches to remain compostable historical specimens later.

## ADOPT is deliberately not FREEZE

ADOPT means:

    these exact reviewed pixels are accepted as the chosen derived artifact

It does not:

- mutate the original ONE PASS witness;
- overwrite the source PerformanceProgram;
- mark the Franken composition frozen;
- silently splice into some unrelated canonical editor state;
- grant future compute authority.

    ADOPTION != FREEZE
    ADOPTION != SOURCE REWRITE

A later promotion seam may decide where an adopted artifact enters the broader Franken/Toaster canonical composition.

## Tamper gates

021 refuses:

- stale candidate graph identity;
- changed review-media receipt body;
- changed source/derived frame bytes;
- missing sparse output directories;
- incomplete approved execution;
- contradictory second disposition.

## Full path now

    SEE possibility terrain
      ↓
    PROPOSE exact crossing
      ↓
    ACCEPT relation
      ↓
    PREPARE affected scope
      ↓
    APPROVE exact scope
      ↓
    AUTHORIZE execution
      ↓
    WITNESS changed pixels
      ↓
    BUILD candidate world
      ↓
    REVIEW actual MP4
      ↓
    ADOPT / REJECT

Every arrow is a separate authority transition.

## Founding laws

    EXECUTION RESULT != RENDER ACCEPTANCE
    CANDIDATE GRAPH != ADOPTION
    AFFECTED WORK REGION != DERIVED FRAME
    UNCHANGED FRAME != DERIVED PROVENANCE

    REVIEW MEDIA != ADOPTION
    ENCODED REVIEW != PIXEL AUTHORITY

    ADOPTION != FREEZE
    ADOPTION != SOURCE REWRITE
    REJECTION PRESERVES EVIDENCE
    DISPOSITION != COMPUTE AUTHORITY

## Next aperture

021 completes the crossing lifecycle without promoting the result into the old Franken FREEZE path.

The next seam, if desired, is **adopted-artifact promotion**:

    adopted candidate artifact
          ↓
    explicit import proposal
          ↓
    ordinary Franken composition relation
          ↓
    RECOMPOSE / REVIEW
          ↓
    existing FREEZE boundary

That would let a world born from creative physics return as ordinary compositional material—without bypassing the editor's existing authority chain.
