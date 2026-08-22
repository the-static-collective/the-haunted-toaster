# Sigil Grammar v0

Haunted Toaster Sigil Grammar v0 is a renderer-neutral generation experiment. It independently reproduces the frozen `witness-sigil/v0.1` projection locally, then treats the shared primitive alphabet and morphology operators as a small deterministic grammar without granting sigils any product authority.

The National Treasure lineage is ancestry and design context. Haunted Toaster does not import a National Treasure runtime dependency. Frozen golden witness vectors are reproduced byte-for-byte by the local projection implementation before any grammar work is allowed to build on them.

## Compact law

The sigils began as recognition marks.
The primitives became letters.
The operators gave them verbs.
Order gave them syntax.
History gave them tense.
Haunted Toaster v0 tests whether one expression can lawfully speak six next utterances.

## Alphabet

The v0 primitive alphabet is frozen as `P0` through `PF`.

The v0 operator vocabulary is:

- `TRANSLATE`
- `ROTATE`
- `REFLECT`
- `SCALE`
- `REPEAT`
- `OVERLAP`
- `LIGATE`
- `CUT`
- `OPEN`
- `CLOSE`
- `NEST`
- `BRANCH`
- `MERGE`
- `PROJECT`

Operation order is syntax. Every operation may refer only to a root or an earlier operation. The expression contract bounds arity and arguments explicitly and rejects malformed or future-facing references.

## Two source channels

### `witness-locked`

A witness-locked expression starts from one canonical SHA-256 digest rendered through the independently reproduced `witness-sigil/v0.1` projection. Its sixteen roots are fixed by that recipe. Descendant operations may change the expression, but the source digest, projection version, and Toaster-local recipe address remain preserved.

### `free-sigil`

A free-sigil expression starts from explicitly supplied P0-PF roots. It has no witness digest and cannot silently become witness-locked later.

The channels are mechanically distinct. Grammar does not erase the difference.

## Data flow

```text
source channel
  ↓
normalized sigil topology expression
  ↓
renderer-neutral topology plan
  ↓
deterministic utterance family
```

### Expression

`haunted-toaster/sigil-topology-expression/v0` records roots, ordered operations, source evidence, append-only lineage, and a domain-separated expression hash.

### Topology plan

`haunted-toaster/sigil-topology-plan/v0` projects the expression into explicit primitive/operator counts and six Toaster-local structural pressure channels:

- rupture
- recurrence
- reflection
- ecology
- witness
- boundary

These pressures are deterministic integer sums. They are an inspectable local structural projection, not universal sigil meanings and not VisualScore fields.

### Utterance family

`haunted-toaster/sigil-utterance-family/v0` asks one parent expression to speak up to six bounded grammatical descendants.

The fixed v0 roles are, in order:

1. `turn` → `ROTATE`
2. `mirror` → `REFLECT`
3. `echo` → `REPEAT`
4. `scar` → `CUT`
5. `aperture` → `OPEN`
6. `branch` → `BRANCH`

Each role receives its own domain-separated deterministic PRNG seed derived from the family seed, parent expression identity, slot index, and role. It may vary only its bounded operator arguments. The parent expression is never mutated.

## Determinism and replay

For the same normalized parent, root seed, count, policy, and implementation version:

- role order is identical;
- operation arguments are identical;
- child expressions and expression hashes are identical;
- topology plans and plan hashes are identical;
- family hash is identical.

Replay regenerates the family and compares the family hash, role sequence, expression hashes, and plan hashes. Modified replay metadata fails rather than being silently accepted.

## Hard non-claims

A matching sigil is never authority.
A creative descendant is never the frozen witness it descended from.

Sigils in v0 are not:

- authentication;
- authorization;
- admission;
- identity proof;
- ancestry grants;
- VisualScore authority;
- ResolvedTimeline authority;
- renderer instructions;
- candidate-family ranking;
- Ghost Topology execution policy;
- a universal semantic dictionary.

`witness` in the topology pressure object is only the deterministic count contribution of primitive P8 inside this local structural projection. It does not elevate a sigil to witness authority or validate the source digest.

## v0 stop condition

The generation proof is mechanically complete only when all of the following hold together:

1. the five frozen Witness Sigil golden vectors reproduce byte-for-byte locally;
2. expressions normalize, hash, append, and fail closed under the frozen grammar;
3. expressions compile deterministically into renderer-neutral topology intent;
4. one parent can produce six distinct deterministic grammatical descendants;
5. family replay detects altered role/hash evidence;
6. the dedicated grammar smoke proves both free-sigil productive novelty and witness-locked source continuity;
7. the ordinary Haunted Toaster test/check/render-smoke chain remains green;
8. no renderer, VisualScore, ResolvedTimeline, candidate-family, UI, Ghost Topology, or packaging execution path has been coupled to the grammar.

## Next gate

The next gate is human review of the generated language before any visible renderer coupling. The human witness should assess recognition, composition, and productive novelty from the two smoke specimens and explicitly choose whether the grammar is a visible-coupling candidate, requires revision, or should compost the language claim.

Until that gate is crossed, Sigil Grammar v0 remains a generation-level experiment with no visible product consequence.
