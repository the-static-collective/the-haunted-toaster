# NEXTGEN-TOASTER-012B — WORDPARK 001

## Thesis

The first lyric pass should not place captions on top of a video.

It should make the lyrics into the playable world.

> **TEXT != SUBTITLE**
>
> **THE WORDS ARE THE SKATEPARK**

WORDPARK 001 is a two-handed, one-pass 2D performance over the same admitted song, FullSongForm, and ListeningField introduced by 011 / 012A.

The right hand constructs the lyric world in real time.

The left hand rides a persistent bird-ball through that world.

The resulting packet is simultaneously:

- a construction witness;
- a traversal witness;
- a first lyric-video text map;
- a possible returnable creative cartridge ancestor.

## Core loop

```text
ADMITTED SONG
    |
    +-- FullSongFormV0
    |
    '-- ListeningFieldV0
           |
           '-- lyric cue testimony
                  |
                  v
              WORDPARK
        +---------+---------+
        |                   |
   RIGHT HAND            LEFT HAND
   LYRIC DROP            BIRD-BALL
        |                   |
   mood lane             steering
        |                   |
   text geometry         traversal
        |                   |
        +--------+----------+
                 |
                 v
        WORDPARK PERFORMANCE
                 |
        +--------+---------+
        |                  |
 construction trace   traversal trace
        |                  |
        +--------+---------+
                 |
                 v
         LYRIC VIDEO MAP
          proposal-only
```

The song keeps one uninterrupted clock.

No section boundary pauses the performance.

No lyric collision creates a score.

No mood placement claims what a lyric objectively means.

## Controls

### Left hand — bird-ball

The left hand controls one persistent 2D body.

Founding controls:

```text
joystick / WASD
    -> steering acceleration

field physics
    -> momentum
    -> gravity
    -> wall bounce
    -> text collision
```

The ball has position, velocity, and radius.

The founding core already records:

- ball samples;
- steering input;
- text contact;
- impact speed;
- exact contacted lyric object.

Future traversal vocabulary may add:

- grind;
- wall ride;
- launch;
- air;
- landing;
- manual;
- chained relation names.

Those should remain descriptive performance relations rather than point-scoring rules.

### Right hand — lyric drop

The right hand receives lyric chunks from the Listening Field.

It drops the current lyric into one of four physical mood lanes on the right side.

Founding right-side entry bands:

```text
OPEN       x=.82  y=.20
TENDER     x=.82  y=.40
STRANGE    x=.82  y=.60
HARD       x=.82  y=.80
```

The lane is a **physical treatment choice**, not a semantic label.

```text
MOOD PLACEMENT != LYRIC MEANING
```

The player may later sculpt / move / rotate the text deeper into the field, but the founding lane gives the hand a stable physical target.

## Mood grammar

### OPEN

```text
geometry: platform
physics: broad, buoyant
restitution: medium-high
friction: low
```

The exact lyric string flows across a horizontal baseline.

The baseline is the collision surface.

### TENDER

```text
geometry: bowl
physics: curved, holding
restitution: softer
friction: higher
```

The exact lyric string follows a concave path.

The ball may settle into or climb out of the words.

### STRANGE

```text
geometry: ramp
physics: angled, redirecting
restitution: high
friction: low
```

The exact lyric string follows an inclined baseline.

The text becomes a launch / redirection surface.

### HARD

```text
geometry: wall
physics: rigid, abrupt
restitution: highest founding value
friction: low
```

The exact lyric string flows vertically.

The text becomes a wall.

## Text is collision geometry

WORDPARK does not render decorative text near an invisible physics object.

The text path and collision path are the same addressed structure.

Each WordObject carries:

```text
source lyric witness
exact text
drop frame
mood lane
glyph positions
glyph rotations
text baseline path
collision segments derived from that path
```

The founding implementation maps every character in the exact lyric string to a point and rotation along the performed text path.

Collision segments are derived directly from adjacent path points.

```text
VISIBLE TEXT PATH = COLLISION PATH
```

A later renderer may outline glyph contours more precisely, but it must not silently separate visible typography from the geometry the player actually rode.

## WordObject

Founding conceptual shape:

```text
WordObject {
  wordObjectId

  sourceWitnessId
  sourceAuthority = testimony-only

  text
  cueStartFrame
  cueEndFrame

  dropFrame

  moodLane
  moodAuthority = performance-choice

  authority = human-performance-placement

  geometry {
    kind
    path[]
    glyphs[]
    collisionSegments[]
  }
}
```

The source lyric timing remains ListeningField testimony.

The player's drop is a separate human performance fact.

The collision is a third fact.

```text
HEARD LYRIC != HUMAN PLACEMENT
HUMAN PLACEMENT != BALL CONTACT
```

## Two traces

### ConstructionTrace

The construction trace records what the right hand built.

Each founding drop records:

- exact lyric witness;
- exact lyric text;
- frame;
- mood lane;
- physical grammar;
- created WordObject.

It explicitly records:

```text
meaningClaim = null
```

### TraversalTrace

The traversal trace records what the left hand did.

Founding events:

```text
ball-sample
text-contact
```

A text-contact names:

- frame;
- WordObject;
- source lyric witness;
- mood lane;
- geometry kind;
- exact segment;
- contact position;
- impact speed.

The traces remain separate.

```text
CONSTRUCTION TRACE != TRAVERSAL TRACE
```

That distinction is important because the world the player built and the way they moved through it are two different performances.

## WORDPARK performance packet

Schema:

`static-collective/wordpark-performance/v0`

Authority:

`witness-only`

Founding packet contains:

```text
songRef
formRef
listeningFieldRef

wordObjects[]

constructionTrace[]
traversalTrace[]

finalBall
counts

laws[]
performanceHash
```

The packet contains no score and no quality field.

```text
CONTACT != QUALITY
MISS != ERROR
```

## Lyric-video map

WORDPARK can compile its sealed performance into:

`static-collective/wordpark-lyric-map/v0`

Authority:

`proposal-only`

The lyric map retains:

- exact lyric text;
- source lyric witness;
- original cue timing;
- performed drop frame;
- mood lane;
- performed glyph geometry;
- collision geometry;
- descriptive contact count;
- maximum witnessed impact.

This is the first-pass lyric-video mapping.

It is not yet the final render plan.

```text
LYRIC MAP != FROZEN PLAN
PROPOSAL != FREEZE
```

## Why this is a Tony Hawk relation rather than a rhythm score

The song already supplies temporal structure.

WORDPARK does not need to judge whether a player hit the song correctly.

Instead:

- the right hand continuously turns listening into space;
- the left hand discovers consequences in that space;
- collisions create new trajectories;
- new trajectories affect later placement choices.

The useful loop is:

```text
music
  -> interpretation
  -> text geometry
  -> traversal
  -> collision
  -> changed trajectory
  -> next interpretation
```

That is closer to building a skatepark while skating it than to pressing notes for accuracy.

## Listening Field relation

012A stays testimony-only.

WORDPARK consumes lyric cues as source testimony but does not convert the entire Listening Field into game authority.

The player chooses where a lyric becomes physical.

The ball chooses what subsequently happens.

After the run, Relation Mirror may compare:

```text
ListeningField
    x
ConstructionTrace
    x
TraversalTrace
```

to expose descriptive candidates such as:

- repeated collisions near recurrence entrances;
- long rides across lyric spans;
- large trajectory changes near section boundaries;
- lyric drops before musical arrivals;
- deliberate non-contact regions.

Those remain relation candidates.

```text
COINCIDENCE != INTENT
RELATION CANDIDATE != SYZYGY
```

## Return-packet seam

WORDPARK is shaped to become a small creative instrument cartridge later.

A portable return can separate:

```text
RETURN PACKET
  song / form refs
  rig / grammar refs
  word geometry
  construction trace
  reduced traversal
  accepted relations
  raw trace hash

TRACE SIDECAR
  dense ball samples
  dense spatial detail
  diagnostics
```

reLATTE may carry that packet without understanding WORDPARK semantics.

A receiving locality may interpret the same packet differently.

```text
SAME PACKET != SAME LOCAL AFFORDANCE
```

## Founding laws

```text
TEXT != SUBTITLE
VISIBLE TEXT PATH = COLLISION PATH

MOOD PLACEMENT != LYRIC MEANING
HEARD LYRIC != HUMAN PLACEMENT
HUMAN PLACEMENT != BALL CONTACT

CONSTRUCTION TRACE != TRAVERSAL TRACE
CONTACT != QUALITY
MISS != ERROR

SECTION GUIDE != EDIT
SECTION BOUNDARY != PAUSE

WORDPARK PACKET != FROZEN PLAN
LYRIC MAP != FROZEN PLAN
PROPOSAL != FREEZE
```

## Implementation status

WORDPARK 001 currently has an executable deterministic core on:

`experiment/nextgen-toaster-012b-wordpark-001`

Implemented:

- four mood grammars;
- stable right-side entry bands;
- exact lyric string -> glyph path;
- collision segments derived from the same text path;
- persistent bird-ball physics;
- steering / gravity / wall bounce;
- text collision + bounce witness;
- separate construction and traversal traces;
- witness-only performance sealing;
- proposal-only lyric-video map compilation;
- no score / quality field.

Not yet claimed:

- packaged Electron play surface;
- touch joystick;
- live lyric queue UI;
- grind / wall-ride / combo relations;
- glyph-outline collision;
- actual video rendering from the lyric map;
- Relation Mirror integration;
- reLATTE round trip.

## Minimal playable gate

The next UI witness should be deliberately small.

### Screen

```text
+------------------------------------------------------+
|                                                      |
|                  WORDPARK FIELD                      |
|                                                      |
|        🐦 ball                 actual lyric geometry |
|                                                      |
|                                   OPEN    [ lyric ]  |
|                                   TENDER  [ lyric ]  |
|                                   STRANGE [ lyric ]  |
|                                   HARD    [ lyric ]  |
+------------------------------------------------------+
```

### Left hand

Touch joystick or WASD.

### Right hand

Four large mood targets.

The current timed lyric chunk is dropped into the selected lane.

### Clock

The admitted song audio clock.

### Session rule

One uninterrupted take.

### End

Seal WORDPARK packet, then show the first proposal-only lyric map.

That is the threshold for calling WORDPARK **playable** rather than merely executable.
