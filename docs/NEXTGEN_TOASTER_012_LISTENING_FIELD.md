# NEXTGEN-TOASTER-012 — LISTENING FIELD

Status: design-only descendant of NEXTGEN-TOASTER-011 full-song form.

Issue: #335

## Question

Can the Haunted Toaster stop treating Listener as a separate utility and instead make hearing a first-class geometry of the newest full-song editor — without turning machine perception into edit authority?

012 answers with one architectural move:

> **The editor does not receive advice from the Listener. The editor inhabits a receipted Listening Field.**

The Listener becomes a bounded, time-addressed testimony substrate over the same admitted song and the same `FullSongFormV0` already shared by WATCH, ONE PASS, spatial performance, TRACE, residue, RECOMPOSE, and FREEZE.

---

## Why this becomes possible only now

The old Listener and the old editor had different shapes.

The Listener knew:

- lyric text;
- transcript evidence;
- candidate timings;
- human anchors;
- Re-listen deltas.

The editor knew:

- clip placements;
- scene-local frames;
- preview state;
- final render structure.

NEXTGEN-TOASTER-011 changes the geometry.

Now the whole editor shares:

```text
one admitted song
one audio clock
one dynamic full-song frame domain
one FullSongFormV0
one set of macro scene spans
```

A human gesture at frame 3271, a lyric witness at frame 3271, a recurrence entrance at frame 3271, a topology stroke at frame 3271, and a residue state at frame 3271 can finally occupy the same inspectable address without pretending they are the same thing.

That is the opening.

---

## Founding architecture

```text
                         ADMITTED SONG
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
      FullSongFormV0                    ListeningFieldV0
      timing-form authority             testimony-only
             |                                 |
             |                    +------------+-------------+
             |                    |            |             |
             |                  lyrics       pulse        recurrence
             |                    |            |             |
             |                 anchors       energy        sections
             |                    |            |             |
             |                    +------------+-------------+
             |                                 |
             +----------------+----------------+
                              |
                              v
                    FULL-SONG EDITING FIELD
                              |
            +-----------------+-----------------+
            |                 |                 |
          WATCH             DIRECT            ONE PASS
                            EDITING
            |                 |                 |
            +-----------------+-----------------+
                              |
                              v
                       PerformanceTrace
                              |
                    ListeningField x Trace
                              |
                     RelationMirrorV0
                       descriptive-only
                              |
                       explicit human BIND
                              |
                     ListeningSyzygyV0
                        proposal-only
                              |
                          RECOMPOSE
                              |
                 compiled renderer-neutral
                    events / curves / keys
                              |
                            FREEZE
                              |
                   Franken full-song plan
                              |
                 HyperFrames / Remotion
```

No renderer re-runs perception.

No machine witness directly moves a placement.

No edit silently becomes a claim about what the song means.

---

## Contract 1 — ListeningFieldV0

Proposed schema:

`static-collective/listening-field/v0`

Authority:

`testimony-only`

A Listening Field is bound to:

- exact admitted song identity;
- exact `FullSongFormV0.formHash`;
- fps;
- total frames;
- exact temporal coordinate domain;
- explicit witness lanes;
- exact source evidence identities;
- deterministic field hash.

Illustrative shape:

```text
ListeningFieldV0 {
  schema
  authority = testimony-only

  songRef {
    sourceSha256
    durationSeconds
  }

  formRef {
    formHash
    fps
    totalFrames
  }

  lanes [
    {
      laneId
      kind
      source
      witnesses[]
    }
  ]

  laws[]
  fieldHash
}
```

### Founding lane kinds

012A should begin only with evidence already present or naturally derivable from current organs.

```text
lyric-cue
human-anchor
section-boundary
song-landmark
```

Later lanes may add:

```text
transient-pressure
pulse
dynamic-contour
recurrence-region
silence-region
spectral-change
fresh-ear-reference
```

The contract must not imply that all lanes exist.

Missing testimony is absence of testimony, not zero-valued testimony.

---

## Witness atom

Every time-addressed item should retain enough evidence to explain why it is there.

Illustrative shape:

```text
ListeningWitness {
  witnessId
  laneId
  kind

  startFrame
  endFrame

  evidenceClass
  confidence?

  sourceRef
  method

  authority = testimony-only
}
```

A human anchor and a machine lyric hypothesis can occupy the same frame while remaining different authority classes.

A section boundary can exist without becoming a mandatory edit point.

A transient may be measured without being called a beat.

---

## Editor consequence — the Ear Underlay

The existing 011 timeline becomes capable of showing collapsible hearing lanes beneath the material tracks.

The first visual hierarchy should remain:

1. admitted song time;
2. macro scene geography;
3. human material placements;
4. optional hearing evidence.

The ear layer must not become a wall of analytics.

A useful founding presentation is sparse:

```text
ARRIVE             CROSS                    ASSEMBLE
|------------------|------------------------|

VIDEO 1    [=======]
VIDEO 2              [====]       [=====]

LYRIC     |    |       | |                 |
ANCHOR           H
SECTION   ^                 ^

PLAYHEAD                       |
```

The operator can hide all hearing lanes and recover the exact 011 visual/editor semantics.

```text
FIELD OFF => EXACT 011 EDITOR BEHAVIOR
```

---

## Witnessed snap targets

006 already introduced optional musical snap.

012 should generalize the snap source without making it stronger.

A snap target becomes a referenced witness:

```text
SnapTargetV0 {
  sourceWitnessId
  sourceFieldHash
  targetFrame
  targetKind
}
```

A human may elect to snap a placement to:

- a human lyric anchor;
- a machine lyric cue;
- a section edge;
- an existing song landmark;
- later, a transient or recurrence entrance.

The edit receipt should preserve which witness was chosen.

Still:

```text
WITNESS != SNAP TARGET
SNAP TARGET != PLACEMENT AUTHORITY
SNAP != MUSICAL TRUTH
```

The witness is eligible to become a snap target only because the human chose that interaction.

---

## The stronger merge — Listener timeline editing

The same full-song timeline should eventually expose lyric cues as editable temporal objects.

This does **not** mean every editor drag becomes Listener evidence.

Two object families remain distinct:

```text
visual placement edit
        !=
lyric timing edit
```

A lyric timing action may explicitly create or update:

`HumanAnchorV1`

The existing Listener anchor laws remain untouched:

- human anchor timestamp is authoritative;
- Re-listen may change machine-owned evidence;
- Re-listen may not move or drop the human anchor;
- machine recovery stays inside lawful anchor islands.

This creates a literal merger of work surfaces without merging authority.

One timeline can now edit:

- visual material;
- visual keyframes;
- lyric timing;
- human Listener anchors.

But each edit names what kind of thing it is editing.

---

## ONE PASS consequence — the human becomes another witness source

ONE PASS already records:

- key down / up;
- exact audio-clock timing;
- material lane;
- derived placement;
- spatial path;
- transform keyframes.

012 does **not** reinterpret those events as song facts.

Instead it allows a new post-performance comparison:

```text
sealed PerformanceTrace
          x
sealed ListeningField
          |
          v
RelationMirrorV0
```

---

## Contract 2 — RelationMirrorV0

Proposed schema:

`static-collective/listening-relation-mirror/v0`

Authority:

`descriptive-only`

The mirror asks:

> What inspectable temporal relations exist between what the human did and what the Listener witnessed?

It does **not** ask:

> Was the performance good?

Examples:

```text
gesture onset within 90ms of witnessed landmark
hold spans one lyric cue
repeat placement begins near recurrence entrance
path direction changes near section edge
no performed event inside a sparse region
```

The last item must remain especially careful.

Absence is visible but cannot be labeled intentional.

```text
COINCIDENCE != INTENT
ABSENCE OF GESTURE != REFUSAL
PERFORMANCE CORRELATION != QUALITY
NEAR != BOUND
```

### Relation candidate

Illustrative:

```text
RelationCandidate {
  relationId
  performanceRef
  witnessRef
  relationKind
  measuredDelta
  authority = descriptive-only
}
```

No score.

No winner.

No taste model.

---

## LISTEN BACK

After a sealed ONE PASS, the editor can expose a temporary observational lens:

`LISTEN BACK`

This is not a new authority mode.

It is a way to inspect the braid:

```text
what the song witness said
          x
what the human performed
```

Example UI thought:

```text
TRANSIENT     ^       ^       ^
GESTURE         ●       ●
                           ●

RELATION
gesture-17 is 2 frames after transient-9
gesture-21 is 1 frame before transient-12

[ BIND THIS RELATION ]
```

The machine may reveal coincidence.

Only the human can create the binding.

---

## Contract 3 — ListeningSyzygyV0

Proposed schema:

`static-collective/listening-syzygy/v0`

Authority:

`proposal-only`

A Listening Syzygy is an explicit accepted relation between heard testimony and a visual property.

Illustrative:

```text
ListeningSyzygyV0 {
  syzygyId

  driver {
    fieldHash
    witnessIds[]
    property
  }

  target {
    placementId / trackId / residueId
    property
  }

  mapping {
    kind
    inputRange
    outputRange
    bounds
  }

  authority = proposal-only
}
```

Founding legal examples:

```text
human lyric anchor
    -> typography entrance

section boundary
    -> transition invitation

song landmark
    -> placement pulse

later:
transient pressure
    -> scale envelope

dynamic contour
    -> opacity envelope

recurrence entrance
    -> material return

quiet region
    -> residue persistence
```

The relation itself is not the frozen output.

---

## Compile the relation before FREEZE

The renderer should never know how to listen.

At RECOMPOSE:

```text
ListeningField
    +
accepted ListeningSyzygy
    +
current proposal
        |
        v
deterministic compiler
        |
        +-> existing transform keyframes
        +-> explicit timeline events
        +-> explicit opacity / parameter curves
        +-> explicit transition parameters
```

Those renderer-neutral compiled structures can then enter the ordinary proposal/freeze path.

The frozen plan binds:

- source ListeningField hash;
- source syzygy identity;
- compiled output identity.

The renderer receives only the frozen result.

```text
LISTENER != RENDERER
RENDERER MUST NOT RE-LISTEN
WITNESS != FROZEN CURVE
SYZYGY != COMPILED EFFECT
COMPILE != FREEZE
```

This is the architectural move that makes audio-reactive composition deterministic rather than ambient.

---

## Look-Twice inside the editor

LISTENER × LOOK-TWICE-001 should remain a diagnostic ear, not become an always-on editor model.

A disputed region can expose:

`FRESH EAR`

Explicit flow:

```text
select exact timeline region
        |
        v
freeze exact bounded audio window
        |
      isolate
     /       \
 ear A       ear B
     \       /
      seal both
        |
only now reveal current
Listener/editor hypotheses
        |
cross-read / support annotation
```

The full editor state must not enter either first-listen packet.

```text
EDITOR MEMORY != FRESH EAR MEMORY
FIRST LISTEN PRECEDES CROSS-READ
```

A sealed first-listen observation may later be referenced by ListeningField as a diagnostic witness reference.

It never becomes a timing anchor automatically.

---

## Residue becomes capable of hearing history

010 already creates explicit residue.

That makes a later composition possible without hidden effects:

```text
performed topology scar
          x
explicit heard witness
          x
human accepted syzygy
          |
          v
new residue behavior
```

Examples:

```text
recurrence entrance -> wake a related scar
quiet region -> slower explicit decay
energy rise -> bounded bloom
new lyric anchor -> residue reveal point
```

This is not “audio reactive residue.”

It is:

> a frozen relation between an exact heard witness and an exact historical visual object.

That distinction matters.

---

## Memory Prism consequence

Persistent memory should remember accepted relations, not infer taste.

Legal memory:

```text
Track 2:
human explicitly bound recurrence entrance
to return of material family X
```

Illegal automatic conclusion:

```text
user likes chorus cuts
```

A future track may receive:

```text
proposal pressure:
a prior accepted recurrence->return relation exists
```

but still requires local evidence and human acceptance.

```text
MEMORY OF RELATION != TASTE CLAIM
PAST ACCEPTANCE != FUTURE AUTHORITY
```

---

## Stronger long-term picture

If the design survives, the Toaster stops being:

```text
song analyzer
+
video editor
```

and becomes:

```text
a performed relation instrument
```

The song contributes witnessed structure.

The media contributes material.

The human performs time and space.

The machine preserves observable relations.

The human decides which relations matter.

RECOMPOSE compiles them.

FREEZE grants execution authority.

The renderers execute the frozen composition without interpreting the song.

---

# Staged implementation

## 012A — LISTENING FIELD

Goal:

One canonical, hash-addressed ListeningField over the exact 011 full-song form.

Initial lanes only:

- source section boundaries already carried by `FullSongFormV0`;
- current Listening Eye / song landmarks already used by snap;
- admitted Listener lyric cues when available;
- human lyric anchors when available.

Editor adds an optional ear underlay.

No placement behavior changes.

No frozen-plan bytes change.

Required excision proof:

```text
011 baseline A
012A field ON  B
012A field OFF A'

require A == A'
```

## 012B — RELATION MIRROR

Take sealed PerformanceTrace + sealed ListeningField.

Emit descriptive-only temporal relations.

No scoring.

No automatic binding.

No proposal mutation.

## 012C — LISTENING SYZYGY

Human explicitly binds one heard relation to one existing editor parameter family.

Recommended first proof:

```text
human lyric anchor
    ->
existing typography entrance event
```

or:

```text
section landmark
    ->
existing placement snap target
```

Prefer a relation that compiles into an already-existing frozen grammar rather than inventing a renderer feature.

## 012D — LISTENER TIMELINE EDITING

Expose lyric cues on the full-song editor timeline.

Explicit lyric timing edit -> HumanAnchor.

Visual edit remains unrelated.

Re-listen must preserve anchor islands.

## 012E — FRESH EAR

Bounded explicit Look-Twice invocation from one selected region.

No ambient model calls.

No editor context leaks into first-listen packets.

## 012F — HEARD RESIDUE

Allow one explicit ListeningSyzygy to modulate existing ResidueMemory.

No hidden audio-reactive renderer code.

---

# Founding laws

```text
AUDIO CLOCK = COMMON ADDRESS

LISTENING FIELD != SONG MEANING
HEARING != EDIT
EDIT != HEARING
HUMAN EDIT != HUMAN ANCHOR

WITNESS != SNAP TARGET
SNAP TARGET != PLACEMENT AUTHORITY

COINCIDENCE != RELATION
RELATION CANDIDATE != SYZYGY
SYZYGY != FREEZE

LISTENER != RENDERER
RENDERER MUST NOT RE-LISTEN
WITNESS != FROZEN CURVE

PERFORMANCE CORRELATION != QUALITY
MISS != ERROR
ABSENCE OF GESTURE != REFUSAL

MEMORY OF RELATION != TASTE CLAIM
PAST ACCEPTANCE != FUTURE AUTHORITY
```

---

# 012A stop condition

The first implementation slice succeeds when:

1. a real admitted full song derives the same `FullSongFormV0` as 011;
2. one deterministic ListeningField binds to that exact form hash;
3. the editor can render/hide the hearing underlay against the exact same frame domain;
4. all hearing items identify provenance and authority;
5. hearing evidence cannot modify a placement;
6. hearing evidence cannot enter FREEZE;
7. field-off restores exact 011 proposal/freeze semantics;
8. old v0 and current v1 composition receipts retain their meaning.

Then stop.

Do not jump directly to automatic audio-reactive animation.

First make the editor capable of **hearing without obeying**.
