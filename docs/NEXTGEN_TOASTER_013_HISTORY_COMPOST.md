
# NEXTGEN-TOASTER-013 — HISTORY COMPOST

Status: experimental descendant of NEXTGEN-TOASTER-012A Listening Field.

## Thesis

A finished video is not terminal output.

When it re-enters the Toaster, it may carry an exact provenance capsule describing:

- which frozen composition caused it;
- which projection produced it;
- which exact media bytes the capsule belongs to;
- which performance / trace / residue / listening context surrounded its making;
- which earlier rendered-history capsules are its parents.

Then Video Digestion may inherit that capsule as provenance.

> Output becomes input, but history becomes material.

## Two identities

Recursive media needs two different identities:

~~~
media SHA-256
  = what exact bytes this video is

history capsule hash
  = how this exact finished video came to exist
~~~

Therefore:

~~~
BYTES != HISTORY
~~~

Two files with the same bytes may be associated with different lawful historical contexts and therefore produce different history-aware digestion family identities.

Without a verified history capsule, the old digestion identity remains unchanged.

## RenderedHistoryCapsuleV0

Schema: static-collective/rendered-history-capsule/v0

Authority: provenance-only

The capsule has two deliberately different compartments.

### Render authority

These references describe what actually caused the finished render:

- frozen Franken plan hash;
- plan schema / policy;
- fps / duration;
- exact projection kind;
- exact projection hash;
- exact rendered-media SHA-256;
- optional exact byte length.

Authority: render-cause-reference

### Surrounding history

These references preserve relevant making-context without claiming the renderer executed them:

- ONE PASS performance hash;
- PerformanceTrace hash;
- ResidueMemory hash;
- ListeningField hash;
- FullSongForm hash;
- admitted song SHA-256.

Authority: context-reference-only

~~~
FROZEN OUTPUT != SURROUNDING HISTORY
SURROUNDING HISTORY != RENDER CAUSE
~~~

010 residue and 012A hearing evidence are not silently promoted merely because they were present while the video was made.

## Recursive lineage

A capsule may name earlier capsule refs:

~~~
generation 1
    ↓ compost / compose / render
generation 2
    ↓ compost / compose / render
generation 3
~~~

Generation is deterministic:

~~~
no parents → 1
parents → max(parent generation) + 1
~~~

Parents remain capsule hashes + generation only. No inferred family story is inserted.

## Exact-byte sidecar

The founding physical form is adjacent:

~~~
finished.mp4
finished.mp4.history.json
~~~

Writing a sidecar validates the capsule, hashes the exact finished media, requires that hash to match, checks optional byte length, writes canonical bytes without overwrite, and treats identical repeated writes as idempotent. Conflicting existing sidecars refuse.

Reading a sidecar hashes the current media again before returning history.

~~~
SIDECAR NAME != IDENTITY
PATH != IDENTITY
EXACT BYTES = ADMISSION GATE
~~~

## Automatic pantry re-entry

VSPantry now checks for the adjacent sidecar when a video is admitted.

No sidecar:

~~~
exact old admission behavior
~~~

Valid sidecar:

~~~
video binding
  + historyCapsule
  + historyRef
~~~

Mismatched sidecar:

~~~
REFUSE
~~~

The system does not silently strip stale provenance and continue.

## History-aware Video Digestion

Video Digestion Six accepts the verified capsule.

Every descendant retains:

~~~
sourceSha256
sourceSpecimenId
clipAnalysisHash
planHash
historyRef {
  capsuleHash
  generation
  renderedMediaSha256
  parentCapsuleHashes[]
}
~~~

The family identity includes the history ref only when one actually exists.

~~~
same bytes + same history
  → same history-aware family

same bytes + different history
  → different family

same bytes + no history
  → old history-free family identity
~~~

This is not a visual effect. It is ancestry.

## Franken consequence

When descendants become Franken materials, their derivation retains the same history ref.

~~~
material
  ↓
Video Digestion descendant
  ↓
history capsule
  ↓
prior frozen render
  ↓
earlier capsule parents
~~~

A derived texture may therefore remain attributable to a video whose pixels were themselves the consequence of earlier performed material.

## The strange loop

~~~
VIDEO A
   ↓
digest
   ↓
perform
   ↓
topology / residue / relation context
   ↓
freeze
   ↓
render VIDEO B
   ↓
write B.history.json
   ↓
re-admit VIDEO B
   ↓
verify exact bytes
   ↓
digest B
   ↓
descendants inherit B history
   ↓
compose again
~~~

The second generation does not merely contain pixels from the first.

It can carry evidence that those pixels have a history.

## What 013 does NOT do

History is not behavior.

A descendant does not automatically wake old scars, repeat old timing, choose related materials, recreate a prior relation, inherit taste, gain placement authority, or affect FREEZE merely because it has ancestry.

~~~
PROVENANCE != BEHAVIOR
PAST RELATION != FUTURE AUTHORITY
RECURSION != DESTINY
~~~

History becomes available to composition. Composition must still decide what matters.

# New doors preserved by 013

## Kinship Syzygy

Two current materials can discover that their capsule ancestry intersects.

~~~
material X
  parent capsule A

material Y
  parent capsule A

=> shared-history candidate
~~~

A human may later bind that kinship to behavior. Shared ancestry alone does nothing.

## Historical Constellation

One bounded interval may contain:

~~~
Listening witness
+ performed gesture
+ surviving residue
+ returning history-bearing material
+ prior accepted relation ref
~~~

The system can describe the constellation without reducing it to a single cause.

~~~
CO-OCCURRENCE != CAUSE
CONSTELLATION != SYZYGY
~~~

## Vacancy specimen

FullSongForm + ListeningField + PerformanceTrace allow bounded regions containing testimony but no human gesture.

Those can become VacancyCandidates, not errors. Later recursive history could reveal that a future material occupies an earlier vacancy.

## Counterfactual relation worlds

One sealed performance can be recomposed with different explicit relation sets. Each resulting finished render can have its own capsule.

~~~
same performance
   ├→ relation world A → output A → capsule A
   ├→ relation world B → output B → capsule B
   └→ relation world C → output C → capsule C
~~~

Those worlds may then be composted and compared as materially distinct historical descendants.

## Ensemble traces

Independent human performance traces can occupy one FullSongForm. Their finished outputs can retain which trace context surrounded each render.

Later compost can preserve those different creative genealogies without pretending they are the same authorial act.

## Archaeological timeline

A frame can eventually expose:

~~~
what was heard here?
what was performed here?
what was painted here?
what residue survived here?
what history-bearing materials were present?
what relations were explicitly bound?
what finally froze?
~~~

History capsule refs provide the inter-generation layer this view previously lacked.

## History-grown organs

This is the strongest long-term consequence.

A later material may be decomposed not only by pixels but by lawful ancestry.

Possible future candidate organs:

~~~
historical-return organ
kinship organ
relation-fossil organ
vacancy-fill organ
scar-wake organ
generation-contrast organ
~~~

These are candidate compositional readings. They must never arise as unreviewed authority.

# Founding laws

~~~
BYTES != HISTORY

FROZEN OUTPUT != SURROUNDING HISTORY
SURROUNDING HISTORY != RENDER CAUSE

SIDECAR NAME != IDENTITY
PATH != IDENTITY
EXACT BYTES = ADMISSION GATE

PROVENANCE != BEHAVIOR
ANCESTRY != RELATION
CO-OCCURRENCE != CAUSE

PAST RELATION != FUTURE AUTHORITY
PAST ACCEPTANCE != CURRENT KEEP
RECURSION != DESTINY
~~~

## First human witness

1. Render one full-song composition to MP4.
2. Create a capsule bound to its exact frozen plan + projection + finished MP4 hash.
3. Write the adjacent sidecar.
4. Re-admit that same MP4.
5. Confirm VSPantry discovers the capsule automatically.
6. Derive Video Digestion Six.
7. Verify all six descendants retain generation-1 history.
8. Place one descendant into a new composition.
9. Render that composition.
10. Write a generation-2 capsule whose parent is generation 1.

At that point:

> history has literally survived a render → compost → render crossing.
