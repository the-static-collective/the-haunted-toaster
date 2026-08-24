# L BRANCH Evidence Bus / Toaster Mixing Desk — Design

Date: 2026-08-23
Status: design slice; no implementation authority

## Summary

Haunted Toaster should expose source-derived evidence as a reusable set of deterministic **lanes** rather than hard-wire individual analyses directly to renderer behavior.

The candidate generator receives both raw observations and bounded inferred slices, chooses how much each visual subsystem listens to each lane, optionally scopes that attention to a GRAB region, and records the exact routing as an accepted **Mix Plan**. Preview and final render consume the same accepted plan.

The product metaphor is a DJ mixing station, but the channels are not extracted audio stems. They are observations and explicitly labeled inferences about the source.

```text
SOURCE
  |
  +-- RAW WITNESS LANES
  |     +-- amplitude / energy envelope
  |     +-- spectral observations
  |     +-- image / lyric / video evidence when admitted
  |
  +-- INFERRED LANES
        +-- transient / percussion pressure
        +-- low-end / bass pressure
        +-- vocal salience
        +-- sustained harmonic/body
        +-- air/noise/texture
        +-- phrase / section recurrence
        +-- Listener-derived timing / lyric events
        +-- future lawful witnesses
                 |
                 v
           L BRANCH LANE BANK
                 |
                 v
          TOASTER MIXING DESK
      select | gain | resolution
      response | smoothing | scope
                 |
       +---------+----------+---------+
       v         v          v         v
    topology  primitive  atmosphere  material ...
               field
```

## Product law

> **The evidence lanes describe what may be listened to. The candidate decides what mattered. The accepted Mix Plan decides how it mattered.**

No lane gains renderer authority merely by existing.

## Goals

1. Make raw and inferred source evidence reusable across many visual layers.
2. Let different candidates route the same evidence bank differently.
3. Generalize Resolution into a per-routing attention control.
4. Generalize GRAB into a spatial scope for a routing rather than a one-off effect.
5. Preserve deterministic replay and selected-candidate → final-render authority.
6. Keep inference explicitly weaker than observation and human authority.
7. Avoid fixed mappings such as `snare -> topology` or `voice -> typography`.
8. Give Listener, future audio analysis, VSPantry, memory, and other admitted evidence a common bounded route into creative generation without letting them write directly into renderer state.

## Non-goals

- No audio stem extraction.
- No claim that a transient lane is literally a snare stem, or that a vocal-salience lane is isolated vocals.
- No renderer-local listening or spontaneous patching.
- No ambient nondeterminism.
- No giant user-facing mixer UI in v1.
- No requirement that every candidate consume every available lane.
- No automatic promotion of inferred evidence into source truth, ancestry, timing authority, or human authority.
- No new renderer authority parallel to VisualScore / ResolvedTimeline.

## Relationship to existing Toaster concepts

### Creative Context Table

The Creative Context Table answers:

> **What lawful evidence is available to this creature?**

The L BRANCH Lane Bank is a normalized, time-addressable subset/projection of source-derived evidence suitable for modulation.

### Influence Diet

The Influence Diet answers:

> **Which available evidence did this candidate consume, ignore, or treat as influence-only?**

### Mix Plan

The Mix Plan answers:

> **Exactly how did consumed lanes influence the candidate's visual subsystems?**

These remain separate concepts:

```text
Creative Context Table
        |
        v
available evidence
        |
        v
L BRANCH Lane Bank
        |
        +--> candidate ignores some lanes
        |
        v
Influence Diet
        |
        v
accepted Mix Plan
        |
        v
ResolvedTimeline / canonical execution
```

Availability is not consumption. Consumption is not execution authority. Only an accepted plan may cross into canonical execution.

## Lane model

A lane is a deterministic, addressed evidence signal.

Conceptual shape:

```text
Lane {
  id
  producerPolicy
  evidenceClass        // raw-observation | inferred | listener-derived | other admitted class
  sourceIdentity
  evidenceHash
  timebase
  samples / events / bounded windows
  normalization
  confidenceEvidence?  // evidence only; never authority
  provenance
}
```

### Required laws

- Same admitted source + same producer policy => same lane identity/content.
- Missing evidence produces an unavailable lane, never fabricated values.
- Inference labels must remain truthful: `transient-pressure`, not `snare-stem`; `vocal-salience`, not `vocals` unless actual isolated-vocal evidence exists.
- Human Listener anchors remain authority and may constrain/annotate Listener-derived lanes, but inferred confidence cannot move a human anchor.
- Lanes may be continuous signals, sparse events, or bounded windows; consumers must know which form they receive.

## Send model

The smallest creative routing primitive is a **Send**:

```text
LANE -> SEND -> DESTINATION
```

Conceptual v1 shape:

```text
Send {
  sourceLaneId
  target
  gain
  resolution
  scope
  response
  smoothing
}
```

### `gain`

How strongly the lane matters to this destination.

A zero/absent send means the candidate ignores that lane for that target.

### `resolution`

How closely the destination attends to variation in the lane.

Resolution does not have to mean output raster size. It is the existing Toaster concept generalized as **attention/detail scale** for this relationship. The destination compiler decides the lawful physical interpretation while preserving the accepted numeric/control identity.

### `scope`

Where the send may act.

```text
whole-layer
or
GRAB(regionRef)
```

GRAB therefore becomes a general spatial mask/scope that can apply to any compatible send rather than a special isolated renderer operation.

### `response`

At minimum:

- `follow` — greater lane value drives greater target response;
- `oppose` — greater lane value drives less/opposite target response;
- `accent` — response emphasizes change/onsets rather than sustained level.

Do not assume `more evidence = more visual intensity`. This prevents every route from collapsing into an equalizer visualization.

### `smoothing`

A bounded temporal response policy such as slow / medium / fast or an equivalent versioned numeric envelope.

Smoothing belongs in the accepted routing plan, not as hidden renderer behavior.

## Mix Plan

A candidate's accepted routing graph is a versioned **Mix Plan**.

Conceptually:

```text
MixPlan {
  policyVersion
  laneBankHash
  sends[]
  planHash
}
```

The candidate generator may propose different lawful Mix Plans from the same Lane Bank.

Example:

```text
Candidate A
  vocal-salience -> atmosphere    gain .80 resolution .60 follow
  vocal-salience -> typography    gain .30 resolution .85 accent
  transient-pressure              ignored
  bass-pressure  -> primitive     gain .50 resolution .40 follow

Candidate B
  transient-pressure -> topology  gain .70 resolution .75 accent
  transient-pressure -> material  gain .40 resolution .90 accent scope=GRAB:R1
  bass-pressure      -> primitive gain .90 resolution .35 follow
  vocal-salience                     ignored
```

Same evidence bank; materially different listening strategies.

## Authority chain

The hard authority boundary is:

```text
source truth / admitted evidence
        |
        v
lane producers
        |
        v
L BRANCH Lane Bank            // evidence only
        |
        v
candidate generation          // proposal authority only
        |
        v
ACCEPTED MIX PLAN
        |
        v
accepted candidate / ResolvedTimeline
        |
        +--> preview
        |
        +--> final render
```

The renderer may **execute** a send. It may not invent one.

Forbidden:

```text
renderer detects transient
  -> renderer decides to excite topology
```

Required:

```text
candidate Mix Plan says:
  transient-pressure
  -> topology
  gain=.63
  resolution=.72
  scope=whole-layer
  response=accent
  policy=send-v1
```

Preview and final render consume the same accepted routing identity.

## Listener integration

Listener can contribute bounded lanes without becoming renderer authority.

Potential future Listener-derived lanes:

- vocal-salience;
- lyric onset/event windows;
- phrase presence/density;
- human-anchor proximity;
- unresolved-lyric texture/confidence evidence.

The distinction remains:

> **Confidence is evidence. Human anchors are authority.**

A Mix Plan may choose to listen strongly to human-anchored lyric events and weakly or not at all to unresolved regions.

## Audio-analysis integration

The planned analysis-only control lanes fit directly into the Lane Bank:

- raw amplitude / local-energy witness;
- low-end / bass-pressure evidence;
- transient / percussion-pressure evidence;
- vocal-presence/salience evidence;
- sustained harmonic/body evidence;
- optional high-frequency/noise/air evidence;
- recurrence / phrase / section evidence.

These are **control signals**, not recovered stems.

## First executable slice

Keep v1 deliberately small.

### Lane Bank v1: three lanes

1. `raw-energy-envelope` — direct bounded observation derived from measured audio energy.
2. `transient-pressure` — inferred onset/percussive salience.
3. `vocal-salience` — inferred likely vocal-presence energy, explicitly not a vocal stem.

### Destinations v1: three destinations

1. Topology.
2. Primitive Field.
3. Atmosphere.

### Send controls v1

- gain;
- resolution;
- response (`follow | oppose | accent`);
- smoothing;
- optional whole-layer vs one existing lawful GRAB region.

No additional lane or destination is required to prove the architecture.

### Candidate proof

From one fixed source and one fixed Lane Bank, generate six deterministic candidates whose Mix Plans differ materially.

At least:

- one candidate strongly follows transient pressure through topology;
- one candidate primarily routes vocal salience into Atmosphere or Primitive Field;
- one candidate deliberately ignores one available inferred lane;
- one candidate uses a GRAB-scoped send;
- one candidate uses an `oppose` or otherwise inverse relationship so difference is not equivalent to intensity.

The exact roles are proof fixtures, not permanent six-up quotas.

## Acceptance proof

1. Same source + same analysis policy => byte-identical Lane Bank identities.
2. Raw observation and inferred lanes are mechanically distinguishable.
3. Missing evidence produces explicit unavailable/refusal state; no fabricated lane.
4. Same Lane Bank + same candidate-generation inputs/seed/policy => identical Mix Plans.
5. Six-up can contain materially different routing strategies from the same evidence bank.
6. Availability does not imply consumption.
7. At least one candidate may ignore an available lane without penalty.
8. Gain, Resolution, response, smoothing, and GRAB scope are recorded in accepted plan evidence.
9. GRAB remains bounded; a scoped send cannot leak outside its admitted region.
10. Resolution changes the destination's attention/detail response without creating a second authority path.
11. Inferred lanes remain evidence; no inferred lane becomes source truth or human authority.
12. Preview and final render consume the exact same Mix Plan identity.
13. Renderer cannot add, remove, or reroute sends after candidate acceptance.
14. Replay reconstructs Lane Bank -> candidate Mix Plan -> accepted timeline -> final receipt exactly.
15. Existing historical artifacts without a Mix Plan preserve their historical renderer semantics.

## Failure / refusal laws

- Unknown lane: refuse explicitly.
- Unavailable lane requested by a send: refuse or omit before admission; never silently substitute another lane.
- Unknown destination: refuse explicitly.
- Invalid GRAB region: refuse explicitly.
- Unsupported lane/destination combination: refuse before candidate admission.
- Mix Plan / accepted timeline identity mismatch at render: fail closed.
- Renderer-local lane lookup not represented in the accepted plan: forbidden.

## Future expansion

Once v1 proves the primitive, additional providers may join through the same lane contract:

- low-end / bass pressure;
- sustained harmonic/body;
- air/noise texture;
- section/phrase recurrence;
- lyric/Listener events;
- Native Color dynamics;
- VSPantry motion/material witnesses;
- receipt-backed memory / prior-coverage signals;
- other explicitly admitted Creative Context providers.

Expansion should add evidence providers, not special-case renderer wiring.

## Compression into the broader eCODE / Toaster grammar

Several apparently separate Toaster ideas reduce to one small relationship grammar:

```text
EVIDENCE
  -> SELECT
  -> SCOPE
  -> WEIGHT
  -> RESOLVE
  -> TARGET
```

In product language:

> **What do I listen to? Where do I listen to it? How hard do I listen? At what resolution? What part of me responds?**

This is the intended L BRANCH creative primitive.

## Sequencing

This slice is design-only and should not interrupt the current #224 promotion/repair line.

Implementation should begin only after the current renderer authority spine is landed/trustworthy, then compose with the beta candidate-ecology / Creative Context Table work rather than bypassing it.

Likely related project ancestry: #113, #138, #147, #148, #168, current GRAB/Resolution field promotion work.
