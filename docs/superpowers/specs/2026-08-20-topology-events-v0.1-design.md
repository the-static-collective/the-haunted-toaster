# Topology Events v0.1 — Design

Date: 2026-08-20
Source issue: #195 — BETA Topology Events — APERTURE / SPEAK / GRAB / GROW / BODY
Parent: #148 — Living Creative Playground
Status: approved architectural slice; implementation not yet landed

## Purpose

Give Haunted Toaster a small vocabulary of **momentary topology verbs** that act upon an already accepted topology without multiplying the permanent topology catalog.

```text
APERTURE = the frame develops attention
SPEAK    = a seam opens and emits material
GRAB     = one region seizes and deforms the field
GROW     = persistent strands accumulate visible ancestry
BODY     = choreography over APERTURE → SPEAK → GRAB → GROW
```

The governing law is:

> **A topology event is a verb applied to a topology, not another topology preset.**

This design preserves the existing distinction between candidate evolution and rendered phrasing:

```text
MUTATE | CROSS | MOLT | HAUNT
    candidate/family derivation upstream

APERTURE | SPEAK | GRAB | GROW
    time-addressed visual events inside an accepted world
```

## Existing seams reused

Current `main` already contains the required floor:

- `generation/candidate-family.cjs` — accepted candidate families carry authoritative `locks`, candidate score addresses, timeline hashes, and `familyHash`;
- `generation/resolver.cjs` — canonical ResolvedTimeline body, `timelineHash`, and `canonicalJson`;
- `generation/native-color.cjs` — precedent for attaching accepted evidence to a timeline and then rebuilding `timelineHash` + `canonicalJson`;
- `generation/topology-arc.cjs` — deterministic, time-addressed topology windows with entrance/peak/release, outcomes, scars, topology-lock refusal, and hashes;
- `render/topology-response.cjs` — deterministic time-varying topology-response expressions derived from accepted timeline evidence;
- `render/topology-compilers.cjs` — production topology compilation over the frozen accepted `baseState.topology`;
- `render/timeline-execution.cjs` — shared resolved execution boundary and optional-plan assertions;
- dedicated topology response/compiler/smoke tests.

Topology Events compose those seams. They must not create a second renderer timeline, permit the renderer to discover events privately, or trust caller-reported lock/topology state.

## Visual phrasing law

Topology Events inherit the project-side phrasing principle:

```text
withhold → imply → build → strike → decay → leave residue
```

An event therefore has an inspectable envelope rather than functioning as a continuous decorative filter.

A v0.1 event envelope is:

```text
prepareTick < strikeTick <= releaseTick <= residueUntilTick
```

The event may have zero-duration residue only where the event contract allows no persistent consequence. `GRAB` and `GROW` require non-zero post-strike consequence in their eventual visual implementations.

## Constitutional attachment law

A topology-event plan is **not** an orphan renderer sidecar.

It is derived from and attached back into one accepted candidate timeline under the candidate family's already-constituted constraints.

The first lawful API shape is conceptually:

```js
resolveTopologyEvents(timeline, {
  family,
  candidateIndex,
  events,
})
```

The caller does **not** supply `locks`, `sourceTopology`, `scoreAddress`, or a replacement timeline identity.

The resolver derives and verifies them from accepted evidence:

```text
family.locks
family.familyHash
family.candidates[candidateIndex].scoreAddress
family.candidates[candidateIndex].timelineHash
candidate.timeline.baseState.topology
current accepted timeline.scoreAddress
current accepted timeline.baseState.topology
current accepted timeline.timelineHash
```

Before planning or attachment:

1. `family` must be a valid CandidateFamily v1 specimen.
2. `candidateIndex` must resolve to an existing candidate.
3. `timeline.scoreAddress` must equal the selected candidate's `scoreAddress`.
4. `timeline.baseState.topology` must equal the selected candidate's frozen base topology.
5. `family.locks` is the authoritative lock set; no caller lock override exists.
6. A `topology` lock produces an explicit refusal before any executable event is attached.

This closes the dangerous compression:

```text
caller says locks=[]
        ≠
accepted candidate is unlocked
```

## Selected plan contract

Create a pure generation module:

`src/full-measure/src/generation/topology-events.cjs`

with exact identifiers:

```text
policyVersion = topology-events-v0.1
schema        = haunted-toaster/topology-event-plan/v0.1
```

Conceptual normalized plan:

```js
{
  schema,
  policyVersion,
  acceptedFamilyHash,
  acceptedScoreAddress,
  sourceTimelineHash,
  sourceTopology,
  lockedAxes,
  eventCount,
  events: [
    {
      id,
      kind, // aperture | speak | grab | grow
      prepareTick,
      strikeTick,
      releaseTick,
      residueUntilTick,
      parameters,
      evidenceRefs,
      eventSha256,
    }
  ],
  refusal,
  planSha256,
}
```

`sourceTimelineHash` is the exact timeline identity **before** the topology-event plan is attached. It is provenance, not the final timeline identity.

`BODY` is deliberately absent from the event-kind union. It is choreography that may schedule several primitive events; it is not a fifth renderer primitive.

## Canonical timeline attachment

After a lawful plan is derived, it is inserted into the canonical ResolvedTimeline body as:

```text
topologyEvents
```

Attachment follows the same identity discipline already demonstrated by Native Color:

1. remove old `timelineHash` and `canonicalJson` from the current timeline wrapper;
2. preserve the entire current canonical body, including other accepted optional plans;
3. add/replace `topologyEvents` with the addressed plan;
4. hash the resulting body with `HauntedToaster-ResolvedTimeline-v1`;
5. rebuild `canonicalJson` from that same body;
6. deep-freeze the returned timeline.

Therefore:

> **Different accepted topology-event plans must produce different ResolvedTimeline identities.**

A plan may never affect rendering while living outside the identity-bearing timeline body.

The attachment helper must prove:

```text
plan.sourceTimelineHash == timeline.timelineHash before attachment
plan.sourceTopology == timeline.baseState.topology
plan.acceptedScoreAddress == timeline.scoreAddress
```

Any mismatch refuses/throws before render.

## Shared invariants

1. `sourceTopology` is derived from the accepted candidate/timeline, never trusted from a request.
2. `lockedAxes` is derived from `family.locks`, never trusted from a request.
3. `topology` lock refuses all topology-event scheduling in v0.1. Start fail-closed.
4. The selected timeline must belong to the selected candidate by `scoreAddress` and topology identity.
5. Events are sorted by `prepareTick`, then stable `id`.
6. All ticks are safe non-negative integers in the accepted timeline timebase.
7. Every event has explicit evidence refs and a deterministic canonical hash.
8. The attached plan is inside the canonical timeline body and changes `timelineHash` when `planSha256` changes.
9. No event reads raw audio, models, sensors, filesystem state, wall clock, or ambient randomness during render.
10. Preview and production consume the same accepted timeline and therefore the same accepted plan.
11. An event may leave residue but may not silently rewrite the accepted base topology identity.
12. Historical renderer policies and no-event artifacts remain unchanged.
13. Existing Topology Arc remains a separate ghost-topology apparition mechanism; do not silently reinterpret its windows as topology events.

## APERTURE contract

Purpose: make the field visibly acquire a focal attractor.

```text
field → aperture → fixation → release
```

Parameters should stay renderer-neutral in the plan, for example:

```text
focusX
focusY
compression
peripheralSuppression
```

Exact implementation may project these into bounded local emphasis and suppression. Literal eyeball imagery is out of scope.

APERTURE does not require persistent residue in v0.1.

## SPEAK contract

Purpose: turn a lawful seam into an emitting boundary.

```text
closed surface → seam → emission → closure | scar
```

Possible bounded emission sources include accepted lyric/ghost/topology material already present in the execution plan. The event itself does not gain permission to fetch new media.

Plan parameters describe seam geometry/intensity and a declared residue mode. A later implementation may reuse existing lyric-ghost or topology compositor material only through explicit adapters.

## GRAB contract — founding executable specimen

Purpose: establish **local visible causality** rather than temporary whole-frame decoration.

```text
stable field → local contact → local drag/deformation → release → changed local world
```

Recommended v0.1 parameters:

```text
anchorX
anchorY
targetX
targetY
radiusX
radiusY
pull
recoil
falloff
residualVectorX
residualVectorY
residualStretch
```

Normalized positions/radii are bounded to the frame. `pull`, `recoil`, and `falloff` are finite bounded values. Residual vector/stretch values are bounded signed values.

### Local deformation law

A GRAB renderer proof is **not satisfied** by whole-frame `offsetX` / `offsetY` / `scale` alone.

The render adapter must compile an explicit bounded local deformation field, conceptually:

```js
{
  centerX,
  centerY,
  radiusX,
  radiusY,
  vectorX,
  vectorY,
  stretch,
  falloff,
}
```

The field acts only within a bounded neighborhood of the anchor/drag region and decays toward its edge.

The FFmpeg implementation may use a deterministic masked displacement/warp or an equivalent local-deformation construction at the shared topology seam. The exact filter primitive is implementation detail; the contract is not.

The human-visible requirement is:

> **a region catches, pulls, and deforms neighboring visual material while the rest of the topology remains recognizably itself.**

Generic pan/zoom cannot pass the GRAB witness gate.

The first renderer proof must show:

- neutral field before `prepareTick`;
- visible local attraction during preparation;
- maximum local pull/deformation at or near strike;
- bounded local recoil during release;
- non-zero local residual vector and/or stretch after release until `residueUntilTick`;
- deterministic return to the ordinary topology response after residue ends;
- unchanged frozen topology identity throughout.

The residual local deformation is why GRAB is the first proof: it demonstrates that contact had a consequence.

## GROW contract

Purpose: make carried visual history remain attached.

```text
event → strand → accumulation → inherited field
```

GROW is not an ordinary ephemeral particle trail.

Its eventual renderer proof must preserve an inspectable age ordering, such as normalized strand samples:

```text
anchor ← newest ... older ... oldest surviving edge
```

Lawful behaviors may later include tangling, braiding, cutting, shedding, and regrowth, but v0.1 should begin with one bounded persistent strand family. Do not introduce a physics engine.

## BODY choreography

BODY is a generation-side composition helper only after at least two primitive events exist.

Conceptually:

```text
APERTURE  notice
SPEAK     emit
GRAB      alter
GROW      retain residue
```

BODY may omit stages when constraints or available evidence make a stage dishonest. It must compile to ordinary primitive topology events and carry no separate renderer authority.

## Relationship to Topology Arc

Topology Arc already supports entrance/peak/release windows, ghost topologies, overlap, dissolve/scar/succession, and explicit topology-lock refusal.

Topology Events reuse its **planning lessons**, not its semantics.

Topology Arc asks:

> Which alternate topology may appear here, and what becomes of that apparition?

Topology Events ask:

> What bounded verb happens to the accepted topology here, and what visible consequence remains?

The two may later coexist in the same timeline only after deterministic overlap arbitration is explicitly designed.

## Relationship to Elastic Topology Response

Elastic response is continuous physiology-like response derived from accepted nested-response evidence.

Topology Events are sparse phrases layered over that lawful response.

For GRAB, the renderer adapter compiles a **local deformation field** and composes it at one shared topology context seam. It must not mutate `compileTopologyResponse(...)` semantics, replace the topology identity, or hide event state inside nine separate topology compilers.

## Relationship to Resonant Disturbance #187

No dependency in v0.1.

The first event fixture is synthetic/accepted plan evidence. A future adapter may translate accepted Resonant Disturbance history into a proposed topology event request, but body history cannot become renderer authority directly.

## First implementation architecture

Add two focused modules:

```text
src/full-measure/src/generation/topology-events.cjs
src/full-measure/src/render/topology-events.cjs
```

Generation module responsibilities:

- validate the candidate-family/candidate/timeline relationship;
- derive authoritative locks and source topology from accepted evidence;
- normalize bounded event requests;
- refuse topology-locked planning;
- address events and plan;
- attach the plan to the canonical timeline body;
- rebuild `timelineHash` and `canonicalJson` after attachment.

Render module responsibilities:

- consume only `timeline.topologyEvents` from an accepted ResolvedTimeline;
- assert `sourceTopology` equals the frozen base topology;
- compile GRAB into a deterministic bounded local deformation field;
- expose that field/evidence once to `topology-compilers.cjs`;
- contain no scheduler, random source, or hidden mutable state.

Modify `topology-compilers.cjs` only at its shared context seam: compile accepted topology-event evidence once and make the local field available to topology compilers. Do not fork nine private GRAB implementations.

Modify `timeline-execution.cjs` with an optional `assertTopologyEvents(timeline)` validator so malformed or foreign-addressed plans fail before execution.

## Refusal / failure boundaries

Use one stable refusal envelope for lawful-but-impossible generation-side planning. Minimum reasons:

```text
topology-lock-prohibits-topology-events
candidate-timeline-mismatch
no-lawful-event-window
unsupported-event-kind
```

Invalid representation, mismatched identity, hostile structure, source-topology mismatch, bad hashes, and invalid event parameters fail closed with `TypeError` rather than becoming a renderer decision.

## Acceptance proof

### Contract and lineage proof

1. identical accepted family/candidate/timeline/event input produces byte/hash-identical plan;
2. input ordering normalizes deterministically;
3. no API accepts a caller-supplied lock override;
4. authoritative `family.locks` containing `topology` produces explicit refusal;
5. candidate/timeline score-address mismatch fails closed;
6. plan `sourceTopology` is derived from and equals the accepted frozen base topology;
7. a plan addressed to another topology cannot attach or execute;
8. BODY is absent from primitive event kinds;
9. no plan contains renderer commands or ambient execution state.

### Timeline identity proof

1. attached `topologyEvents` lives inside the canonical ResolvedTimeline body;
2. attachment rebuilds `timelineHash` and `canonicalJson`;
3. changing `planSha256` changes `timelineHash`;
4. `plan.sourceTimelineHash` equals the pre-attachment timeline hash;
5. no-event timeline behavior remains byte-compatible;
6. renderer cannot consume an unattached raw event request.

### GRAB renderer proof

1. one GRAB fixture compiles through shared topology context;
2. pre-event local deformation field is neutral;
3. strike visibly deforms a bounded region rather than only translating/scaling the entire frame;
4. release locally recoils;
5. local residue remains non-zero after release;
6. residue ends deterministically;
7. the frozen base topology identity is unchanged;
8. same accepted timeline yields the same production filter graph;
9. preview/production parity is proven at the accepted timeline/plan seam before packaged field witness;
10. packaged witness rejects a generic pan/zoom reading;
11. root `npm run verify` remains green.

## Sequencing

```text
accepted lineage + lock/topology tests
        ↓
canonical timeline attachment / re-address proof
        ↓
GRAB local deformation-field tests
        ↓
shared topology compiler integration
        ↓
render smoke / topology smoke
        ↓
full npm run verify
        ↓
packaged human witness: does GRAB actually feel causal and local?
        ↓
APERTURE
        ↓
SPEAK
        ↓
GROW persistence / age-order proof
        ↓
BODY choreography
```

Do not add all four visual mechanics before the first GRAB specimen earns the abstraction.

## Non-goals

- no four new base topology values;
- no literal anatomical imagery requirement;
- no Creative Verb Kernel changes;
- no orphan renderer sidecar carrying execution-significant event state;
- no caller-supplied lock/topology authority;
- no second timeline;
- no generic whole-frame zoom/pan accepted as GRAB;
- no physics engine;
- no raw audio/sensor reads in render;
- no autonomous event discovery;
- no mandatory BODY sequence;
- no release/tag in the design slice.

## Stop condition

Stop v0.1 when one accepted candidate timeline can undergo a deterministic **local** GRAB with preparation, strike, recoil, and visible residue while:

- authoritative candidate-family locks remain binding;
- the event plan is inside the canonical timeline identity;
- plan topology and timeline topology cannot diverge;
- the base topology remains frozen and recognizable;
- replay remains exact.

Then add the other verbs one at a time through the same event-plan seam.

## Working compression

> **The topology stays itself. Something local happens to it. The accepted world carries the consequence.**
