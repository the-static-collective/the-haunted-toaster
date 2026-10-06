# NEXTGEN-TOASTER-018 — POSSIBILITY MAP

Status: experimental descendant of NEXTGEN-TOASTER-017 Recurrence Weather.

## Thesis

One candidate crossing can be asked the same question repeatedly across song time:

    what is the transition energy of THIS SAME crossing HERE?

The answer becomes a sampled possibility curve.

    one stable crossing identity
          ×
    exact song frames
          ↓
    TransitionEnergyFieldV0
          ↓
    PossibilityMapV0
          ↓
    deterministic SVG projection

The map is observational only.

    MAP != SELECTION
    CURVE != RECOMMENDATION

## PossibilityMapV0

Schema: static-collective/possibility-map/v0

Policy: one-crossing-over-song-time/v0

Authority: observational-only

A map binds:

- exact PerformanceProgram hash;
- exact source performance hash;
- exact TransitionEnergyField hash;
- one source candidate identity;
- one immutable candidate specification;
- fps + total frame domain;
- optional exact CreativeWeather reference;
- exact sampled frames;
- one transition hash per sampled frame;
- complete contribution ledger per point;
- observed energy range;
- observed minimum and maximum frames;
- deterministic map hash.

## Same crossing, changing world

The candidate specification stays fixed.

Only candidate frame changes.

Example:

    crossing:
      absent → return

    frame 96
      recurrence weather = 0
      energy = .80

    frame 120
      recurrence weather = .90
      energy = .575

    frame 156
      recurrence weather = 0
      energy = .80

This is a time-varying possibility landscape, not a list of different suggestions.

## Exact sampled points

PossibilityMap does not invent a continuous analytic field.

Every point is an exact Transition Energy receipt at one sampled frame.

The SVG connects points visually, but the contract states:

    SAMPLED POINT != INTERPOLATED TRUTH

No energy value between sampled frames is claimed.

## Canonical sampling

Sample frames are unique and ascending.

At most 256 frames may be sampled in one map.

A helper produces bounded uniform full-song samples while always including frame 0 and the final song frame.

Sampling order cannot become preference order.

## Observed minima

The map may report the minimum energy observed among its sampled points.

This is descriptive only.

    MINIMUM OBSERVED ENERGY != RECOMMENDATION

The map never emits:

- recommended;
- selected;
- best;
- preferred;
- accept.

## Evidence ledger

Each plotted point retains:

- exact frame;
- transition hash;
- base energy;
- total delta;
- final energy;
- contribution kinds;
- complete contribution evidence.

Therefore a dip can be inspected down to:

    law fossil
    residue
    kinship
    section weather
    lyric weather
    recurrence region
    exact witness IDs

rather than becoming an unexplained score.

## SVG projection

018 adds a deterministic SVG renderer.

It is a projection of PossibilityMapV0, not a second physics calculation.

The SVG contains:

- exact map hash;
- exact candidate identity;
- energy axis 0..1;
- base-energy reference line;
- polyline through sampled points;
- one marker per exact sampled transition;
- transition hash on each point;
- observed minimum marker;
- contribution rails showing where named evidence channels participated.

The SVG uses no smoothing algorithm.

    SVG != PHYSICS AUTHORITY

Changing visual styling must not alter PossibilityMap identity.

## Playability opening

The map makes the creative-physics field human-readable.

A person can now see:

    cheap
    expensive
    cheap again

for one specific crossing over the full song.

Future interaction may allow:

- hover one point to inspect its evidence ledger;
- scrub audio from a point;
- compare multiple candidate maps;
- audition a crossing at one chosen frame;
- explicitly ACCEPT one sampled crossing.

But none of those actions exist merely because the map displays a low point.

## Relationship to recurrence weather

017 made recurrence a lawful local season.

018 makes that season visible in the energy curve.

Example:

    ancestral altered-time fossil
          ×
    recurrence-presence weather
          ↓
    return-with-altered-clock

may create two separated low-energy basins corresponding to two admitted recurrence occurrences.

The curve does not claim those basins are musically correct.

## Relationship to sparse transport

After a human later accepts one exact crossing at one exact frame, the sibling sparse-transport work may be able to describe and execute only the affected pixel regions.

Still:

    POSSIBILITY MAP != EXECUTION PLAN
    MAP POINT != REGION ASSIGNMENT
    ACCEPTED CROSSING != COMPUTE AUTHORITY

## Founding laws

    MAP != SELECTION
    CURVE != RECOMMENDATION
    MINIMUM OBSERVED ENERGY != RECOMMENDATION
    SAMPLED POINT != INTERPOLATED TRUTH

    LOWER TRANSITION COST != TAKE TRANSITION
    ENERGY != VALUE
    ENERGY != PROBABILITY

    SVG != PHYSICS AUTHORITY
    POSSIBILITY MAP != EXECUTION PLAN

## Next aperture

The strongest next move is to make this map directly playable without collapsing observation into action.

One possible interaction:

    hover / scrub
        = inspect

    click
        = propose crossing at exact frame

    explicit ACCEPT
        = bind crossing

    execution
        = separate later aperture

That would turn the possibility landscape into a playable compositional instrument while preserving the distinction between seeing a door and walking through it.
