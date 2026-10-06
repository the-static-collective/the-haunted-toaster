# NEXTGEN-TOASTER-023 — GENERATIONAL ECOLOGY

Status: experimental descendant of NEXTGEN-TOASTER-022 Adopted Artifact Promotion.

## Thesis

Once a finished world can return as material, the next problem is not recursion itself.

It is lineage.

023 makes repeated creative descent inspectable without allowing ancestry to become instruction, ranking, or destiny.

```
rendered world
  -> provenance-only history capsule
  -> Video Digestion descendants
  -> ONE PASS placement
  -> new performed world
  -> ...
```

The important distinction is:

```
AVAILABLE ANCESTRY != PERFORMED PARENTAGE
```

A historical material that exists in a lane is not a parent unless the human actually performs with that lane.

## Contract

Schema:

```
static-collective/generational-ecology/v0
```

Policy:

```
performed-history-kinship/v0
```

Authority:

```
observational-only
```

The ecology compiler accepts bounded arrays of:

- sealed ONE PASS performance receipts;
- adopted-artifact material admissions.

It emits one deterministic, content-addressed ecology artifact.

## Performed generation

ONE PASS already carries provenance-only history refs on admitted material lanes:

- capsule hash;
- exact rendered-media SHA-256;
- explicit generation;
- explicit parent capsule hashes;
- optional law-fossil ref.

023 only considers history refs attached to materials that appear in actual placements.

Unused history is ignored.

For a performed world with no explicit historical parents:

```
generation = 1
```

For a performed world with explicit direct parents:

```
generation = 1 + max(explicit direct-parent generations)
```

This is an observation over carried evidence, not a quality score.

```
GENERATION != QUALITY
GENERATION != AUTHORITY
```

## Parent edges

A direct edge is emitted only when a placed material carries an exact history ref:

```
history:<capsuleHash>
  -- performed-from-history -->
performance:<performanceHash>
```

Each edge preserves the performed evidence:

- material IDs;
- placement IDs;
- scene IDs;
- placement count;
- total used frames.

Multiple lanes derived from the same historical capsule collapse to one parent edge while retaining all placement evidence.

## Ancestor stubs

History refs may declare parent capsule hashes even when the full ancestor capsules are not locally available.

Those ancestors become bounded reference-only nodes:

```
kind = history-parent-reference
generation = null
renderedMediaSha256 = null
```

023 does not invent their generation, bytes, law state, or identity details.

```
UNKNOWN GENERATION != ZERO
```

## Shared ancestry

When multiple performed worlds share one explicit parent capsule, 023 emits two derived observations:

### Reuse observation

The same historical world participated in multiple children.

### Sibling group

The children share one explicit parent.

The relation is labeled:

```
shared-explicit-parent-only
```

No similarity inference, embedding distance, filename parsing, or semantic guess is used.

```
SHARED PARENT != SAME CHILD
```

## Law fossils

If a parent history ref carries a LawFossilRef, the ecology preserves:

- law fossil hash;
- weirdness compilation hash;
- source and compiled program hashes;
- relaxed axes and amounts;
- source capsule hashes.

But:

```
activeLawAuthority = none
LAW FOSSIL != ACTIVE LAW
```

Historical weirdness remains descriptive evidence.

It cannot reactivate itself.

## Adoption evidence

022 adopted-artifact admissions can be supplied as additional evidence.

023 never assumes an adoption and a history capsule are the same lineage object because their names look related.

A bridge is emitted only when exact media SHA-256 matches a known history capsule.

If exactly one capsule matches:

```
matchBasis = exact-media-sha256
```

If more than one history identity carries the same exact bytes:

```
matchBasis = ambiguous-exact-media-sha256
matchedHistoryCapsuleHash = null
```

If none match:

```
matchBasis = unresolved
```

This preserves the existing law:

```
SAME BYTES != SAME AUTHORITY
```

## Persisted artifact

The privileged Franken bridge compiles and persists ecology create-only:

```
FrankenComposer/
  generational-ecology/
    <ecologyHash>.json
```

Identical replay is idempotent.

Conflicting bytes under the same identity refuse.

The ecology artifact does not create or mutate:

- placements;
- proposals;
- frozen plans;
- render authority;
- execution authority;
- material admission.

It is observation only.

## Editor surface

After a sealed ONE PASS take:

```
BUILD FAMILY TREE
```

The readout shows:

- observed generation;
- performed parent count;
- history-node count;
- law-fossil count;
- adoption-evidence count;
- unresolved adoption evidence;
- persisted ecology artifact.

The button does not alter the performance or composition.

## Founding laws

```
GENEALOGY != DESTINY
AVAILABLE ANCESTRY != PERFORMED PARENTAGE
UNUSED HISTORY != PARENT
SHARED PARENT != SAME CHILD
GENERATION != QUALITY
GENERATION != AUTHORITY
LAW FOSSIL != ACTIVE LAW
ADOPTION EVIDENCE != KINSHIP AUTHORITY
SAME BYTES != SAME AUTHORITY
UNKNOWN GENERATION != ZERO
```

## What this makes possible

For the first time the recursive Toaster loop can expose a real family structure using evidence already carried through the machine:

```
world A
  -> capsule A
      -> child performance B
      -> child performance C

capsule B
  -> child performance D

capsule C
  -> child performance E
```

The structure can now answer bounded questions such as:

- Which historical worlds were actually used?
- Which worlds share an explicit parent?
- Which ancestor has been reused most often?
- Which law fossils recur across branches?
- Which adoption records can be tied to known history by exact bytes?
- Where does the lineage become unresolved?

Without answering:

- which child is best;
- which branch should win;
- which ancestor should be copied;
- which old law should reactivate.

## Next aperture

The next natural slice is **mutation distance** over this explicit family graph.

Not aesthetic ranking.

A typed delta between parent and child evidence:

```
placement delta
+ timing delta
+ topology delta
+ law-fossil delta
+ material-role delta
= inspectable mutation record
```

while preserving:

```
DISTANCE != VALUE
MUTATION != IMPROVEMENT
DIFFERENCE != RECOMMENDATION
```
