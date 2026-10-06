# NEXTGEN-TOASTER-022 — ADOPTED ARTIFACT PROMOTION

Status: experimental descendant of repaired NEXTGEN-TOASTER-021 Artifact Adoption.

## Thesis

An adopted world may return as ordinary compositional material, but adoption itself does not import, admit, place, or freeze it.

    human ADOPT disposition
          ↓
    IMPORT PROPOSAL
          ↓
    exact-byte MATERIAL ADMISSION
          ↓
    ordinary material reservoir
          ↓
    human PLACE
          ↓
    RECOMPOSE
          ↓
    REVIEW
          ↓
    existing FREEZE

Founding non-collapse:

    ADOPTION != IMPORT
    IMPORT PROPOSAL != MATERIAL ADMISSION
    ADMISSION != PLACEMENT

## Import proposal

Schema:

    static-collective/adopted-artifact-import-proposal/v0

Authority:

    proposal-only

Only an exact 021 ADOPT disposition may generate an import proposal.

REJECT cannot.

The proposal independently validates and binds:

- candidate derived frame graph;
- review-media receipt;
- ADOPT disposition;
- source + derived program hashes;
- frame graph hash;
- exact review MP4 SHA-256 + byte length;
- fps + frame count;
- deterministic proposed material ID.

Material identity:

    adopted-artifact:<candidateGraphHash prefix>

Thus the proposed material is content-addressed by the exact reviewed world rather than by filename or UI state.

## Exact-byte custody

The privileged bridge will only propose import from review media already inside FrankenComposer output custody.

Before proposal it re-reads the MP4 and verifies:

    bytes length == reviewed byte length
    sha256(bytes) == reviewed mediaSha256

The same checks run again at material admission.

If review bytes change between ADOPT, import proposal, and admission, the crossing refuses.

## Material admission

Schema:

    static-collective/adopted-artifact-material-admission/v0

Authority:

    material-only

Explicit `ADMIT AS MATERIAL` converts the import proposal into a self-contained package:

    FrankenComposer/adopted-artifacts/
      <admissionHash>/
        admission.json
        material.mp4

Identical repeated admission is idempotent.

Conflicting bytes refuse.

The admitted material is an ordinary Franken video material:

    kind = video
    digest = exact review MP4 SHA-256
    rightsBasis = locally-produced-human-adopted-artifact
    admissionBasis = explicit-adopted-artifact-material-admission

## Deep provenance

The material derivation retains:

- import proposal hash;
- source ADOPT disposition hash;
- candidate graph hash;
- candidate pixel frame graph hash;
- source PerformanceProgram hash;
- derived PerformanceProgram hash;
- review-media receipt hash;
- source duration in frames;
- fps.

Authority:

    provenance-only

The recursive material therefore knows where it came from without inheriting creative authority from its history.

    HISTORY != EDIT AUTHORITY
    ADOPTED HISTORY != PLACEMENT AUTHORITY

## Admission is editor-neutral

The editor reducer stores admitted adopted worlds outside composition state.

Admission alone:

- does not create a clip;
- does not mutate `digestPlacements`;
- does not mark the proposal dirty;
- does not clear an existing frozen-plan marker;
- does not enter ONE PASS lane inventory.

Therefore a reviewed Franken proposal remains byte-semantically the same after mere material admission.

    MATERIAL != PLACEMENT

## Ordinary placement

Once admitted, the material appears in the existing material reservoir as an `ADOPTED WORLD` card.

It uses the same bounded placement grammar already used by video digestion:

- ARRIVE / CROSS / ASSEMBLE scene;
- timeline offset;
- source-in trim;
- bounded duration;
- x / y / scale / rotation;
- crop;
- opacity;
- normal / screen blend;
- stack order;
- up to four transform keyframes;
- timeline drag + resize.

No privileged placement defaults or hidden auto-placement exist.

When the human presses `ADD CLIP` or drags the card into a scene, ordinary placement marks the editor dirty and requires RECOMPOSE.

## Proposal composition

An admitted-but-unplaced adopted artifact is intentionally absent from the public Franken proposal.

Only placed adopted materials enter:

- proposal materials;
- proposal tracks;
- proposal ancestry.

Placed track role:

    adopted-artifact-placement

Proposal ancestry records exact:

- material ID;
- admission hash;
- source disposition hash;
- candidate graph hash;
- media SHA-256.

This ancestry is descriptive only.

## Revalidation at RECOMPOSE / FREEZE

`composeConfig` carries admission package paths.

The privileged bridge reloads and validates each package before composition:

- path must stay inside FrankenComposer output custody;
- admission receipt must validate;
- sibling material.mp4 must exist;
- exact media byte length + SHA-256 must still match admission.

Therefore renderer memory is not trusted as material authority.

FREEZE re-runs the same material package validation before rebuilding the exact reviewed proposal identity.

## Recursive safety

An adopted world can contain history from:

    source material
      → performed topology
      → transition physics
      → accepted crossing
      → sparse execution
      → candidate review
      → ADOPT
      → material admission

But none of that history causes its new placement.

The new placement is a fresh human compositional relation.

    PRIOR ADOPTION != CURRENT PLACEMENT
    PRIOR WORLD LAW != CURRENT WORLD LAW
    PRIOR ACCEPTANCE != CURRENT ACCEPTANCE

This prevents recursion from becoming authority amplification.

## ONE PASS boundary

Adopted worlds do not silently expand ONE PASS from six lanes.

The original six Video Digestion descendants remain the performance lane inventory.

Adopted worlds live in the ordinary placement reservoir only.

A future slice could explicitly propose a new performance-lane contract, but 022 does not infer one.

## UI sequence

After 021 ADOPT:

    PROPOSE IMPORT
          ↓
    IMPORT PROPOSAL
          ↓
    ADMIT AS MATERIAL
          ↓
    ADOPTED WORLD card
          ↓
    ADD CLIP / drag
          ↓
    ordinary placement editor
          ↓
    RECOMPOSE

REJECT leaves import unavailable.

## Founding laws

    ADOPTION != IMPORT
    IMPORT PROPOSAL != MATERIAL ADMISSION
    ADMISSION != PLACEMENT
    MATERIAL != PLACEMENT

    ADOPTED HISTORY != PLACEMENT AUTHORITY
    HISTORY != EDIT AUTHORITY
    ADMISSION != FREEZE

    PRIOR ADOPTION != CURRENT PLACEMENT
    PRIOR WORLD LAW != CURRENT WORLD LAW
    PRIOR ACCEPTANCE != CURRENT ACCEPTANCE

## What closes here

022 closes the first complete recursive creative loop:

    material
      → performance
      → memory
      → creative physics
      → crossing
      → execution
      → reviewed world
      → ADOPT
      → material again

without allowing the return path to bypass ordinary composition authority.

## Next aperture

The most interesting next question is no longer merely another authority gate.

It is **generational ecology**:

when adopted descendant worlds repeatedly return as materials, what inspectable family structure emerges across generations?

A bounded next slice could expose:

    material genealogy
      ×
    law fossils
      ×
    adoption lineage
      ×
    placement history
          ↓
    family tree / mutation ecology

while preserving:

    GENEALOGY != DESTINY
