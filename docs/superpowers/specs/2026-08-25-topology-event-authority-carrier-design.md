# Topology Event Authority Carrier — Design

Issue: #248
Parent context: #234 / PR #244

## Problem

Ordinary topology activity currently depends on session-layer reconstruction of canonical family authority. Candidate wrappers such as MUTATE, CROSS, STOMP and CONVERGE can lawfully create new candidates and genealogies, but topology-event admission still needs an original canonical family-shaped authority object. That makes ordinary enrichment a post-hoc step that every transition path must remember to re-run.

The failure mode is architectural: a valid candidate may survive a wrapper transition while losing the authority path that allows the exact timeline to receive APERTURE / SPEAK / GRAB / GROW.

## Founding law

> Candidate birth constitutes topology-event authority. Wrappers may transform genealogy; they may not erase authority.

Selection/relabeling of the same candidate carries the same authority. Any operation that produces a genuinely new score/timeline issues a new authority carrier at that birth boundary.

## Carrier

Introduce one immutable candidate-level carrier:

```text
TopologyEventAuthorityV1 {
  schema,
  policyVersion,
  birthFamilySchema,
  birthFamilyPolicy,
  birthFamilyHash,
  candidateIndex,
  scoreAddress,
  sourceTimelineHash,
  sourceTopology,
  lockedAxes,
  analysisHash,
  constraintsHash,
  rendererProfileHash,
  rootSeed,
  slotIndex,
  authoritySha256
}
```

Exact field names may be tightened during implementation if existing canonical contracts demand it. The carrier must contain enough immutable birth evidence to verify that it authorizes one exact source timeline and score under the same locks/context; it must not carry mutable wrapper genealogy as authority.

## Birth ordering

Avoid circular hashes by issuing authority only after the birth family hash exists and before topology activity changes the execution timeline:

```text
score + source timeline
        ↓
birth family hash
        ↓
TopologyEventAuthorityV1
        ↓
topology-event plan
        ↓
enriched execution timeline
```

The authority cites the source timeline hash, not the post-event timeline hash.

## Resolver law

`resolveTopologyEvents` remains fail-closed.

During migration it accepts exactly two authority forms:

1. existing verified `CandidateFamily + candidateIndex`;
2. verified `TopologyEventAuthorityV1`.

Both normalize into the same internal authority facts and must prove:

- exact score address;
- exact source timeline hash;
- exact source topology;
- exact locks;
- canonical hash integrity;
- matching candidate/birth identity.

Do not accept arbitrary CROSS/STOMP/CONVERGE family schemas as authority.

## Genealogy law

Candidate genealogy remains independent evidence:

- Toastmood selection;
- Mutation Lattice ancestry;
- CROSS parentage/inheritance;
- STOMP policy/history;
- CONVERGE frontier evidence;
- future wrappers.

Genealogy explains where the candidate came from. The active topology authority explains why this exact candidate timeline may receive topology events. One must never substitute for the other.

## Ordinary enrichment

Make ordinary enrichment one shared birth constitution:

```text
candidate born
     ↓
authority issued
     ↓
ordinary topology activity admitted
     ↓
L BRANCH binds lawful GRAB windows
     ↓
render-ready candidate
```

A same-identity wrapper carries the already-enriched candidate and authority unchanged. A new candidate birth re-runs the birth constitution from its new source timeline.

Session code must not contain bespoke per-operation topology re-attachment logic.

## Plan identity and receipts

The topology event plan must record `acceptedAuthoritySha256` (or equivalent) and remain content-addressed.

For an accepted render, execution input and retained receipt must expose the same:

- topology plan identity/hash;
- authority hash;
- event count;
- APERTURE/SPEAK/GRAB/GROW kinds;
- event windows;
- GRAB → L BRANCH binding evidence where present;
- current candidate genealogy;
- foreign Video assimilation evidence.

This must make these states distinguishable without archaeology:

```text
no GRAB scheduled
GRAB scheduled but visually weak
GRAB scheduled and render failed
```

## CROSS scope correction

#234 historically says CROSS remains out of the WALK package. #248 admits CROSS only as a machine transition specimen because it crosses the same authority seam. This does not add CROSS to the WALK E human witness, package UI, or product scope.

## Transition crucible

Before packaging, prove:

```text
GENERATE → accept → render
GENERATE → MUTATE → accept → render
GENERATE → CROSS → accept → render
GENERATE → STOMP → accept → render
GENERATE → CONVERGE → accept → render
```

For every path:

1. the accepted candidate owns a verified authority carrier;
2. topology events are admitted from that carrier;
3. execution input and receipt expose the same topology plan;
4. any GRAB-scoped L BRANCH send cites a lawful GRAB event/window;
5. Video assimilation evidence remains attributable and separate from topology authority.

## Compatibility

- preserve existing canonical CandidateFamily verification path;
- preserve TEST 6 forced-witness separation;
- preserve historical artifact semantics when carrier fields are absent;
- no renderer-local event scheduling or authority;
- no event-kind changes;
- no package/release/promotion from this slice alone.

## Stop condition

Stop when topology-event legality follows the candidate through ordinary candidate birth boundaries without wrapper-specific reconstruction, and the transition crucible can prove the same topology schedule in execution input and receipt for GENERATE, MUTATE, CROSS, STOMP and CONVERGE.