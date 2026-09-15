# MADD CLOWN CRAZY SLOTS — Continuation Without Preference v0

Status: design approved; implementation not yet landed
Carrier used for design: `walk/e-sequential-braid`
Date: 2026-09-15

## Purpose

Haunted Toaster should remain a machine that proposes complete creative creatures rather than a parameter surface the human manually drives. The human supplies a tiny, explicit continuation verdict; the Toaster owns generation, variation, divergence, crossing, and the rest of the reproductive operation.

The constitutional split is:

> **The Toaster owns possibility. The human owns continuation.**

This design compresses the ordinary human interaction toward **KEEP / SCRAPE** without throwing away the existing VisualScore, six-up, mutation, CROSS, STOMP, CONVERGE, topology, L BRANCH, Listener, receipt, genealogy, or memory machinery.

## Hard laws

1. **focus != verdict**
   Inspecting/selecting a candidate for preview does not grant reproductive authority.

2. **KEEP = continuation permission**
   KEEP means only: this exact creature may survive and become lawful ancestry.

3. **SCRAPE = local lineage extinction**
   SCRAPE means none of the current six receive continuation. It does not mean the user dislikes every feature inside them.

4. **verdict != feature preference**
   No KEEP or SCRAPE may silently become a scalar preference for topology, color, material, motion, BODY, typography, or any other extracted feature.

5. **Toaster chooses reproductive operation**
   Ordinary users do not operate MUTATE, CROSS, CONVERGE, STOMP, locks, mutation strength, or other genome controls. Those remain internal machine capabilities and investigative/debug surfaces.

6. **hidden choice still leaves a receipt**
   The Toaster may remain mysterious, but reproductive decisions must remain inspectable: chosen parent, chosen operation, relevant history/frontier evidence, resulting family identity, and any escalation/refusal.

7. **human never operates the genome**
   The ordinary product surface presents phenotypes/creatures. Internal genomes remain available to receipts, tests, archaeology, and explicit expert/debug surfaces only.

## Existing executable truth to preserve

Current WALK already contains most of the machinery this design needs:

- deterministic six-up candidate generation;
- accepted VisualScore / ResolvedTimeline execution;
- candidate genealogy and exact replay evidence;
- branch exploration with role-separated six-up slots;
- MUTATE and exact two-parent CROSS;
- STOMP for visibly farther descendants;
- CONVERGE for deterministic least-visited lawful frontier coverage;
- accepted-history tracking;
- TEST 6 isolation from ordinary ecology;
- topology authority, L BRANCH, Video, Listener, Stage A axis grammar, and final render plumbing;
- receipt archive and memory primitives.

This design is therefore primarily **governance and interface compression**, not a new evolutionary subsystem.

## Reproductive semantics

### Focus

A human may inspect any candidate. Focus changes UI state only.

Current behavior where ordinary `select()` can enter a candidate into accepted history must be split: selection/focus is observational; only KEEP may produce accepted ancestry.

### KEEP

KEEP applies to one exact current candidate.

On KEEP:

- record an immutable continuation verdict bound to current family hash, candidate score address, timeline hash, and relevant source/song identity;
- mark that candidate as accepted lineage;
- permit final render using the exact accepted candidate authority;
- after accepted render, make the specimen eligible for future ancestry/memory admission;
- do **not** infer global feature preference.

KEEP does not require the Toaster to immediately mutate that ancestor. It permits future descent.

### SCRAPE

SCRAPE applies to the current family as a whole.

On SCRAPE:

- record that the family received no continuation;
- add no candidate to accepted lineage;
- retain receipts/fossils for provenance and local repetition control;
- do not create negative feature weights;
- allow the Toaster to choose the next lawful operation.

A scraped family may contribute evidence that the current local search neighborhood has failed to earn continuation, but this evidence cannot become a permanent ban on its ingredients.

## MADD CLOWN dealer v0

The first dealer should reuse existing operations rather than invent new ones.

Suggested deterministic policy:

1. Initial birth: ordinary quality-diverse six-up.
2. First local SCRAPE: generate another lawful diverse family while favoring underexplored coverage.
3. Repeated SCRAPE in the same local lineage/neighborhood: escalate to existing STOMP behavior for a stranger six.
4. Continued rejection after STOMP: abandon the local lineage and create a fresh lawful birth rather than repeatedly optimizing the rejected parent.
5. KEEP: stop the search loop for that artifact, render the kept creature, and preserve it as eligible ancestry.
6. Future extension: when multiple lawful living ancestors exist, the Toaster may choose CROSS itself; the ordinary user does not select mating pairs.

Exact escalation thresholds belong in implementation policy and receipts, not hidden UI heuristics.

## Diversity and stepping stones

The system should optimize neither a universal aesthetic score nor predicted user preference.

Instead it should preserve:

- lawful viability;
- materially distinct candidates within each six-up;
- underexplored lawful regions;
- useful ancestry and stepping stones;
- bounded mutation fidelity after KEEP;
- deliberate divergence through STOMP/CONVERGE when the local neighborhood stalls.

A kept ancestor can remain valuable even when its visible traits do not resemble a future descendant. Lineage is therefore more important than extracting a list of liked features.

## Memory migration

Existing memory work is preserved as ancestry and reusable infrastructure, but its scalar preference semantics are superseded for the ordinary product loop.

In particular, the old human verdict model (`1..5` rating + `keep|weird|compost` + `wouldReToast`) and projections that convert those verdicts into positive/negative feature relationship weights must not silently govern future generation.

Rescue:

- receipt archive;
- immutable verdict provenance;
- feature/coverage counts;
- recent saturation detection;
- deterministic memory cuts/capsules;
- explicit evidence references.

Supersede:

- generic 1–5 aesthetic rating;
- inferred universal feature preference from KEEP;
- inferred feature dislike from SCRAPE/compost;
- hidden optimization toward a learned personal style.

Machine curiosity such as coverage exploration and saturation avoidance remains lawful because it describes the machine's search state rather than claiming what the human likes.

## UI

Ordinary target surface:

```text
SONG
  ↓
SIX HAUNTED CREATURES
  ↓
inspect freely
  ↓
KEEP   SCRAPE
  ↓
finished witnessed video / another dealt family
```

A receipt/provenance trapdoor may expose why a family or descendant appeared, but reproductive controls do not need to appear in the ordinary interface.

Existing expert/debug controls can remain during migration until the KEEP/SCRAPE path has equivalent machine proof and human witness.

## Evidence and receipts

A continuation receipt should be able to answer:

- what family was shown;
- which candidate, if any, was kept;
- what was scraped;
- what operation the Toaster chose next;
- which parent/ancestry was used;
- whether CONVERGE/frontier pressure participated;
- whether STOMP escalation participated;
- what exact score/timeline/family hashes resulted;
- which policy version made the choice.

Receipt != authority to reinterpret the verdict. It records the crossing.

## Non-goals for v0

- no learned personal aesthetic model;
- no neural reward model;
- no user-facing genome sliders;
- no arbitrary feature blacklist from SCRAPE;
- no automatic permanent preference for features inside KEEP;
- no new evolutionary operators unless the existing move set proves insufficient;
- no removal of expert/debug surfaces before the compressed loop is proven.

## First vertical slice

The smallest useful implementation should:

1. split focus/select from accepted-lineage admission;
2. introduce explicit KEEP for one current candidate;
3. introduce family-level SCRAPE;
4. record both as provenance without feature-preference inference;
5. let a deterministic internal dealer choose an existing next operation after SCRAPE;
6. reuse current diversity/CONVERGE/STOMP machinery;
7. prove deterministic replay and authority boundaries in tests;
8. leave existing manual move deck available only as an expert/debug path during migration.

No broader memory-learning redesign is required for the first slice.
