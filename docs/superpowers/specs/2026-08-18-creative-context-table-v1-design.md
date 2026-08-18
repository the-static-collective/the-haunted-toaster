# Creative Context Table v1 — Design

**Date:** 2026-08-18  
**Status:** Design review  
**Project:** The Haunted Toaster  
**Tracks:** #168, #148, #147, #151, #132, #97, #44, #163

## 1. Purpose

Haunted Toaster beta is accumulating more lawful creative evidence than a fixed row of modes can honestly represent: song response, source imagery, timed and unresolved lyric evidence, Toastmood pressure, receipt-backed memory, Re-toast ancestry, VSPantry specimens, semantic attractors, and future project-owned witnesses.

The product should not respond by adding one compulsory feature lane or UI control for every new source.

Instead, generation receives one versioned, inspectable **Creative Context Table** describing what is truthfully available for proposal-time use. Each candidate may consume, ignore, or be influenced by different subsets of that table.

Working law:

> **Give the Toaster a growing world of things it may notice. Let each creature declare what mattered.**

The Table is upstream derivation context. It is not renderer state, not a second timeline, not a new score axis, and not a universal authority object.

## 2. Existing authority floor

Repository law remains unchanged:

```text
accepted VisualScore
  -> canonical ResolvedTimeline
  -> production preview
  -> production render
  -> retained sidecars
  -> receipt
```

After `ResolvedTimeline` admission, renderer execution must not consult the Creative Context Table to make new semantic choices.

`candidate-session.cjs` is the current natural composition seam because it already gathers source analysis, image evidence, lyrics, Toast Feel, garment constraints, genealogy inputs, and candidate-generation configuration before `executionForRender()` narrows the state to accepted execution material.

The design preserves that narrowing rather than widening render execution to carry ambient context.

## 3. Approaches considered

### A. Typed Creative Context Table — selected

Normalize available proposal-time evidence into one deterministic table with typed provider contracts. Candidate-family generation receives that table and resolves per-candidate consumption evidence.

**Advantages**

- extensible without redesigning the ordinary beta interaction;
- provider authority class is explicit;
- unavailable evidence stays absent rather than becoming a fallback;
- candidate derivation remains inspectable;
- renderer authority stays narrow;
- future organs can join without expanding VisualScore merely for provenance.

**Cost**

- requires a small new contract layer and deterministic provider normalization;
- candidate-family evidence becomes slightly richer.

### B. Ambient context lookup inside generation — rejected

Allow candidate generators to reach directly into memory, pantry, lyric, or session services as needed.

This is smaller initially but creates hidden dependencies, makes replay depend on ambient state, obscures what each candidate consumed, and makes provider authority difficult to audit.

### C. Promote all available evidence into VisualScore / ResolvedTimeline — rejected

Store memory, pantry references, genealogy, and influence evidence directly in canonical execution artifacts.

This makes provenance easy to find but wrongly enlarges score/timeline meaning, risks turning influence into execution authority, and forces every future creative evidence source into compatibility-critical canonical schemas.

## 4. Core model

Conceptually:

```text
source truth
+ normalized provider evidence
+ locks / constraints
        ↓
Creative Context Table v1
        ↓
candidate family policy
        ↓
per-candidate Influence Diet
        ↓
VisualScore proposal
        ↓
ordinary admission / resolution / render chain
```

A minimal shape is conceptually:

```js
{
  schema: 'haunted-toaster/creative-context-table/v1',
  source: {
    analysisRef,
    sourceIdentity,
    requiredEvidenceRefs
  },
  entries: [
    {
      providerId,
      policyVersion,
      evidenceRef,
      influenceClass,
      allowedDecisions,
      ancestryClass,
      availability
    }
  ],
  constraintsRef,
  tableHash
}
```

Exact field names are implementation details. The invariant is that every entry is typed, addressed, normalized, and explicit about what kind of influence it is allowed to exert.

## 5. Provider contract

Every provider must define:

- stable `providerId`;
- policy/version identity;
- deterministic availability predicate;
- stable evidence identity/hash/ref;
- normalized bounded payload or payload ref;
- allowed derivation decisions / axes it may affect;
- authority class;
- ancestry class;
- deterministic refusal/unavailable behavior.

Recommended authority classes for v1:

- `source-truth` — current addressed source evidence that constrains derivation;
- `constraint` — locks, garment constraints, or equivalent hard boundaries;
- `ancestry` — explicit human-selected parent/ancestor material allowed to participate in inheritance;
- `influence-only` — may bias search/coverage/selection pressure but cannot become parentage or execution authority;
- `creative-material` — may be transformed into proposed creative state under an explicit versioned policy but is not itself timeline/render authority.

A provider must never write directly into renderer state.

## 6. Influence Diet

Each candidate receives compact derivation evidence separating four questions:

```text
ATE
  available entries actually consumed by this derivation

IGNORED
  available entries intentionally unused by this candidate

INFLUENCE ONLY
  entries that shaped search or coverage without becoming ancestry/source truth

BOUNDARIES
  source truth, locks, constraints, and other non-negotiable limits
```

The exact serialization can be a compact object or addressed sidecar. It must be deterministic and sufficient to answer:

- what evidence was available;
- what this candidate consumed;
- what it ignored;
- what only biased search;
- what bounded the result;
- whether the route can be replayed.

The diet is derivation evidence, not a user-facing parameter surface.

## 7. Family composition law

The Table does not require every candidate to consume every entry.

Availability means **permission to consider**, not mandatory use.

A six-up may therefore differ not only in creative values but also in evidence diet. For example, with the same source and locks:

- one candidate may consume image evidence strongly and ignore memory;
- another may consume memory influence and leave the image mostly untreated;
- another may deliberately ignore both optional providers and remain primarily song-conditioned;
- a future joy/Elsewhere candidate may consume prior-coverage evidence chiefly as negative search pressure.

No fixed role quota is required in v1. Family policy must still prefer material semantic diversity over cosmetic diet differences.

Two candidates with different diets but indistinguishable resulting creative state do not count as meaningful coverage merely because their provenance differs.

## 8. Determinism and replay

Table construction must be pure with respect to declared provider evidence.

Forbidden inputs include:

- wall-clock time;
- unseeded randomness;
- filesystem enumeration order as semantic input;
- ambient renderer/UI state;
- provider data not represented by the recorded table or stable evidence ref.

Required replay claim:

```text
same source evidence
+ same provider evidence set
+ same provider policies
+ same constraints / locks
+ same family policy / seed
= same table identity
+ same candidate family
+ same Influence Diets
```

If one provider is absent during replay, the system must refuse exact family reconstruction or truthfully perform a separately declared degraded operation. It must not silently substitute another source.

## 9. Interaction with existing beta tracks

### #147 — candidate ecology

The Table should compose with the no-preselection six-up rather than replace it. Toastmood pressure becomes one provider/input class rather than compulsory preselection furniture.

### #149 / creative verbs

Future MUTATE / CROSS / MOLT / HAUNT operations may consume a Table plus explicit parent/subject inputs. Parentage remains mechanically distinct from influence-only entries.

### #151 / Receipt Memory

MemoryCapsules and Elsewhere coverage are natural `influence-only` providers. Explicit Re-toast ancestry remains `ancestry`, not ordinary memory influence.

### #157 / VSPantry and #44 foreign material

VSPantry catalogue presence alone is not enough to place raw video on the Table as render material. A later ToastPack/foreign-material provider must supply deterministic analyzed evidence and an admitted creative-material policy.

### #132 / Semantic Attractors and #97 unresolved lyric influence

Timed semantic evidence and non-temporal unresolved-lyric evidence must remain separate providers because their authority boundaries differ. Neither provider may acquire timing authority from the other.

### #163 / neutral-ground source treatment

Clear or partially revealed source-image states are renderer-policy capabilities derived from accepted creative state. The Table may expose source-image evidence; it must not command renderer-local reveal behavior.

## 10. First executable proof boundary

The first implementation must be deliberately narrow.

Use only providers already close to proven candidate seams:

1. **Required source/song provider** — canonical measured analysis/source identity.
2. **Optional source-image provider** — existing Native Color/source-image evidence when present.
3. **Optional memory provider** — one receipt-backed MemoryCapsule/influence plan from the #166 lineage when that stack is an eligible ancestor.
4. **Explicit ignore path** — prove an available optional provider can be deliberately unused by a candidate.

Do not integrate raw VSPantry video, semantic attractors, unresolved lyric features, ToastPack analysis, or new renderer operators in the founding executable proof.

Success means one deterministic family contains at least two materially distinct candidates whose diets differ, while both obey identical source truth and hard constraints.

## 11. Sequencing and landing gate

The current renderer-trust gate remains authoritative.

PR #155 still requires packaged human witness before ordinary Track 1 candidate-ecology behavior is promoted. Therefore:

- this design may land independently as architecture;
- a pure Table schema/provider-normalization module may later be implementable without changing ordinary candidate behavior;
- any implementation that changes ordinary six-up composition must stack on the trusted beta candidate-ecology ancestor, not on the current renderer repair line;
- no merge/tag/release/promotion follows from this design alone.

## 12. Failure behavior

The Table must fail closed on malformed provider evidence.

Required cases:

- duplicate provider identities with contradictory payloads/ref → refuse table construction;
- unknown influence/authority class → refuse;
- provider claims ancestry without an ancestry-capable contract → refuse;
- unavailable optional provider → omit/record unavailable truthfully;
- required source/constraint provider unavailable → refuse generation;
- candidate diet cites an entry absent from the table → refuse derivation evidence;
- influence-only entry appears as parent/score/timing/render authority → contract failure.

One bad optional provider may be excluded only if its provider contract explicitly declares bounded independent failure and table evidence records the exclusion. Required source truth cannot be skipped.

## 13. UI direction

No new mandatory home-screen controls are required for v1.

The ordinary interaction remains:

```text
Bring source
→ six creatures
→ recognize / mutate / cross / accept
```

Influence Diet detail belongs initially in lineage/receipt/proof surfaces. A compact optional disclosure such as “what this creature noticed” may follow only after field evidence shows it helps humans choose.

Do not turn provider availability into a checkbox matrix.

## 14. Acceptance criteria

1. One versioned Creative Context Table schema owns normalized available proposal-time evidence.
2. Provider contracts explicitly classify authority, ancestry, availability, and allowed influence surface.
3. Table identity is deterministic and replayable.
4. Missing optional evidence is absent/unavailable rather than fabricated.
5. Required source truth and hard constraints cannot be ignored.
6. Candidate diets distinguish consumed, ignored, influence-only, and boundary evidence.
7. At least two candidates in one founding proof consume materially different lawful subsets and produce materially distinct creative states.
8. Availability never implies mandatory consumption.
9. Influence-only evidence cannot become parentage, timing authority, VisualScore authority, ResolvedTimeline authority, or renderer authority.
10. Locks and constraints remain absolute.
11. Full Table state does not cross `executionForRender()` as ambient renderer decision context.
12. Existing accepted artifacts retain historical meaning.
13. Future providers can join through the typed provider contract without changing the ordinary beta interaction.
14. Fake diversity is not credited merely because two candidates have different diets.

## 15. Non-goals

- no renderer-side context lookup;
- no universal context service or daemon;
- no cloud/global memory requirement;
- no untyped plugin runtime;
- no automatic use of every available provider;
- no AI taste/winner ranking;
- no self-modifying canonical vocabulary;
- no giant UI provider matrix;
- no VisualScore/ResolvedTimeline expansion solely to hold provenance;
- no raw VSPantry video assimilation in the founding proof;
- no bypass of #155 / #147 sequencing gates.

## 16. Stop condition

The first implementation is complete when one deterministic family can truthfully state, for each candidate:

> **These were the things available to me. These are the things this creature cared about. These are the things it ignored. These were influences only. These were the boundaries it could not cross.**

and exact replay reproduces both the candidate family and those distinctions without widening renderer authority.
