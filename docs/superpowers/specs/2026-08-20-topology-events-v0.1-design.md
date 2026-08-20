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

- `generation/topology-arc.cjs` — deterministic, time-addressed topology windows with entrance/peak/release, outcomes, scars, topology-lock refusal, and hashes;
- `render/topology-response.cjs` — deterministic time-varying topology-response expressions derived from accepted timeline evidence;
- `render/topology-compilers.cjs` — production topology compilation over the frozen accepted `baseState.topology`;
- `render/timeline-execution.cjs` — shared resolved execution boundary;
- dedicated topology response/compiler/smoke tests.

Topology Events should compose those seams. It must not create a second renderer timeline or permit the renderer to discover events privately.

## Visual phrasing law

Topology Events inherit the project-side phrasing principle:

```text
withhold → imply → build → strike → decay → leave residue
```

An event should therefore have an inspectable envelope rather than functioning as a continuous decorative filter.

A v0.1 event envelope is:

```text
prepareTick < strikeTick <= releaseTick <= residueUntilTick
```

The event may have zero-duration residue only where the event contract allows no persistent consequence. `GRAB` and `GROW` require non-zero post-strike consequence in their eventual visual implementations.

## Selected plan contract

Create a pure generation module:

`src/full-measure/src/generation/topology-events.cjs`

with exact identifiers:

```text
policyVersion = topology-events-v0.1
schema        = haunted-toaster/topology-event-plan/v0.1
```

Conceptual normalized result:

```js
{
  schema,
  policyVersion,
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

`BODY` is deliberately absent from the event-kind union. It is choreography that may schedule several primitive events; it is not a fifth renderer primitive.

## Shared invariants

1. `sourceTopology` is the already accepted topology and remains inspectable beneath every event.
2. `topology` lock refuses all topology-event scheduling in v0.1 unless a later event proves it does not alter topology semantics. Start fail-closed.
3. Events are sorted by `prepareTick`, then stable `id`.
4. All ticks are safe non-negative integers in the accepted timeline timebase.
5. Every event has explicit evidence refs and a deterministic canonical hash.
6. No event reads raw audio, models, sensors, filesystem state, wall clock, or ambient randomness during render.
7. Preview and production consume the same accepted plan.
8. An event may leave residue but may not silently rewrite the accepted base topology identity.
9. Historical renderer policies and accepted artifacts remain unchanged.
10. Existing Topology Arc remains a separate ghost-topology apparition mechanism; do not silently reinterpret its windows as topology events.

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

Exact implementation may project these into scale/crop/opacity/topology-response expressions. Literal eyeball imagery is out of scope.

Aperture does not require persistent residue in v0.1.

## SPEAK contract

Purpose: turn a lawful seam into an emitting boundary.

```text
closed surface → seam → emission → closure | scar
```

Possible bounded emission sources include accepted lyric/ghost/topology material already present in the execution plan. The event itself does not gain permission to fetch new media.

Plan parameters should describe seam geometry/intensity and a declared residue mode. A later implementation may reuse existing lyric-ghost or topology compositor material only through explicit adapters.

## GRAB contract — founding executable specimen

Purpose: establish visible causality rather than temporary decoration.

```text
stable field → contact → drag/deformation → release → changed world
```

Recommended v0.1 parameters:

```text
anchorX
anchorY
targetX
targetY
pull
recoil
residualOffsetX
residualOffsetY
```

The first renderer proof must show:

- no deformation before `prepareTick`;
- visible attraction during preparation;
- maximum displacement at/near strike;
- bounded recoil during release;
- a non-zero residual displacement after release until `residueUntilTick`;
- deterministic return to the ordinary topology response after residue ends.

The residual displacement is why GRAB is the first proof: it demonstrates that an event had a consequence.

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

Topology Events should reuse its **planning lessons**, not overload its semantics.

Topology Arc asks:

> Which alternate topology may appear here, and what becomes of that apparition?

Topology Events ask:

> What bounded verb happens to the accepted topology here, and what visible consequence remains?

The two may later coexist in the same timeline only after deterministic overlap arbitration is explicitly designed.

## Relationship to Elastic Topology Response

Elastic response is continuous physiology-like response derived from accepted nested-response evidence.

Topology Events are sparse phrases layered over that lawful response.

For GRAB, a renderer adapter may compile an additive event offset/expression and compose it with the existing response expressions. It must not mutate `compileTopologyResponse(...)` semantics or hide new state inside topology compilers.

## Relationship to Resonant Disturbance #187

No dependency in v0.1.

The first event fixture is synthetic/accepted plan evidence. A future adapter may translate accepted Resonant Disturbance history into a proposed topology event plan, but body history cannot become renderer authority directly.

## First implementation architecture

Add two focused modules:

```text
src/full-measure/src/generation/topology-events.cjs
src/full-measure/src/render/topology-events.cjs
```

Generation module responsibilities:

- validate/normalize the bounded event plan;
- enforce lock/time/evidence invariants;
- address events and plan;
- provide one canonical GRAB fixture path.

Render module responsibilities:

- consume only the normalized accepted event plan;
- project GRAB into deterministic FFmpeg expressions;
- expose expressions/evidence to `topology-compilers.cjs`;
- contain no scheduler, random source, or hidden mutable state.

Modify `topology-compilers.cjs` only at its shared context seam: compile the accepted topology-event plan once and make the additive expressions available to topology compilers. Do not fork nine private GRAB implementations.

## Refusal

Use one stable refusal envelope for generation-side planning. Minimum reasons:

```text
topology-lock-prohibits-topology-events
no-lawful-event-window
unsupported-event-kind
invalid-event-envelope
invalid-event-parameters
```

Invalid representation throws during normalization; lawful-but-impossible scheduling produces an addressed refusal.

## Acceptance proof

### Contract proof

1. identical accepted event input produces byte/hash-identical plan;
2. input ordering normalizes deterministically;
3. topology lock returns explicit refusal;
4. invalid envelopes/parameters fail closed;
5. BODY is absent from primitive event kinds;
6. no plan contains renderer commands or ambient execution state.

### GRAB renderer proof

1. one GRAB fixture compiles through shared topology context;
2. pre-event expressions are neutral;
3. strike visibly changes geometry;
4. release recoils;
5. residue remains non-zero after release;
6. residue ends deterministically;
7. the frozen base topology identity is unchanged;
8. same accepted plan yields the same production filter graph;
9. preview/production parity is proven at the plan/evidence seam before packaged field witness;
10. root `npm run verify` remains green.

## Sequencing

```text
contract + GRAB expression tests
        ↓
shared topology compiler integration
        ↓
render smoke / topology smoke
        ↓
full npm run verify
        ↓
packaged human witness: does GRAB actually feel causal?
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
- no VisualScore schema expansion in the first proof unless existing timeline sidecar capacity proves insufficient;
- no second timeline;
- no physics engine;
- no raw audio/sensor reads in render;
- no autonomous event discovery;
- no mandatory BODY sequence;
- no release/tag in the design slice.

## Stop condition

Stop v0.1 when one accepted topology can undergo a deterministic GRAB with preparation, strike, recoil, and visible residue while retaining its topology identity and replay contract.

Then add the other verbs one at a time through the same event-plan seam.

## Working compression

> **The topology stays itself. Something happens to it. The world remembers.**
