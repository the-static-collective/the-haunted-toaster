# Lyric Resonance Design

**Issue:** #110

## Purpose

Let canonically timed lyric cues summon bounded visual-family responses without giving lyric text authority to rewrite the base VisualScore or letting the renderer invent semantics.

The first slice covers the existing atmosphere vocabulary only: `smoke`, `rain`, `dust`, and `firefly`.

## Governing law

**Lyrics may summon; they do not command.**

A lyric match produces deterministic, time-addressed resonance evidence. The accepted `ResolvedTimeline` remains the sole semantic execution authority. The base `VisualScore.atmosphere` continues to be selected, locked, mutated, addressed, and replayed by the existing candidate machinery.

## Considered approaches

### 1. Rewrite the VisualScore atmosphere from lyric text

This is simple, but wrong for the requested behavior. One occurrence of `smoke` would turn a local musical event into a whole-song categorical choice, collide with atmosphere locks, and make words dominate candidate-family variation.

**Rejected.**

### 2. Scan lyrics inside the FFmpeg renderer

This is mechanically easy because the renderer already has lyric text, but it would create renderer-only semantics after timeline acceptance. Preview/render parity and retained timeline evidence would no longer prove what happened.

**Rejected.**

### 3. Canonical timeline resonance events

Parse already-accepted timed lyric input before candidate resolution. Derive deterministic resonance events and attach them to each resolved timeline before timeline and family hashes are finalized. Preview and final render then compile the same evidence.

**Selected.**

## Data flow

```text
lyrics input
  -> existing createLyricTrack(...)
  -> timed=true gate
  -> deterministic lyric-resonance resolver
  -> ResolvedTimeline.lyricResonance
  -> timeline hash / candidate family hash
  -> preview + final atmosphere compiler
  -> transient atmosphere overlay
  -> retained timeline sidecar + render evidence
```

Plain lyrics are still allowed for subtitle layout, but their evenly distributed fallback cues are not semantic timing evidence and therefore produce zero lyric-resonance events.

## Lyric resonance model

Add a focused generation module:

`src/full-measure/src/generation/lyric-resonance.cjs`

It owns:

- the v1 local lexicon;
- token normalization;
- exact / strong / related weights;
- bounded cue accumulation;
- same-family coalescing/cooldown;
- conversion from lyric cue seconds to canonical timeline ticks;
- canonical frozen evidence.

### v1 lexicon

Keep the first dictionary deliberately small to avoid accidental karaoke literalism.

- `smoke`
  - exact: `smoke`, `smokes`, `smoking`
  - strong: `haze`, `hazy`, `fumes`, `cigarette`, `cigarettes`, `chimney`
  - related: `ash`, `ashes`, `soot`
- `rain`
  - exact: `rain`, `rains`, `raining`
  - strong: `rainy`, `drizzle`, `downpour`, `storm`, `storming`
  - related: `wet`, `thunder`, `cloud`, `clouds`
- `dust`
  - exact: `dust`, `dusts`, `dusting`
  - strong: `dusty`, `sand`, `powder`, `grit`
  - related: `dirt`, `earth`, `soil`
- `firefly`
  - exact: `firefly`, `fireflies`
  - strong: `glowworm`, `glowworms`, `bioluminescent`
  - related: `glimmer`, `glimmers`, `flicker`, `flickers`

Weights:

- exact: `1.0`
- strong: `0.72`
- related: `0.45`

For one cue/family, intensity is the highest matched weight plus `0.08` for each additional matched token, capped at `1.0`.

### Event windows and cooldown

Each event begins at the cue's canonical start tick. Its nominal duration is:

`2.4 + intensity * 2.4` seconds.

Clamp the end to song duration.

If a same-family event begins no more than `1.5` seconds after the previous event ends, coalesce them into one event:

- preserve the earliest start;
- extend to the later end;
- keep the greater intensity;
- union cue indices and matched terms in stable order.

This prevents repeated nearby words from creating unbounded duplicate overlays while still letting a cluster sustain a summoned family.

## Timeline shape

When timed lyric evidence exists, add:

```json
{
  "lyricResonance": {
    "schema": "haunted-toaster/lyric-resonance/v1",
    "policy": "lyric-resonance-atmosphere-v1",
    "sourceMode": "timestamped-lrc",
    "events": [
      {
        "family": "smoke",
        "startTick": 12345,
        "endTick": 16125,
        "intensity": 1,
        "cueIndices": [7],
        "matchedTerms": ["smoke"]
      }
    ]
  }
}
```

The timeline hash and canonical JSON include this object. The VisualScore address does not change solely because lyric text changed.

Timelines with no timed lyric resonance may omit `lyricResonance`; this preserves legacy canonical behavior when no new semantic evidence exists.

## Generation integration

`candidate-session.cjs` parses `config.lyrics` with the existing `createLyricTrack` using inspected media duration.

Only when `track.timed === true` does it pass the track to candidate generation.

`atmosphere-generation.cjs` accepts the optional lyric track and passes it through every candidate `resolve(...)` call, including initial generation, branch mutation, STOMP-compatible generation paths that use the shared atmosphere wrapper, and replay.

The resolver attaches lyric resonance before computing each timeline hash.

Changing lyrics already clears the candidate family in the renderer UI, so an accepted selection cannot silently retain stale lyric semantics.

## Renderer integration

`render/atmosphere.cjs` continues to compile the base atmosphere exactly as before. It additionally compiles each `timeline.lyricResonance.events` window as a bounded transient overlay.

The summoned family is additive:

- base `none` + lyric `smoke`: smoke materializes only for the event window;
- base `smoke` + lyric `smoke`: the event stacks as an intensification;
- base `rain` + lyric `smoke`: smoke briefly visits while rain remains the base atmosphere.

The renderer does not inspect lyric strings. It consumes only accepted timeline resonance evidence.

The v1 renderer may use compact family-specific burst generators rather than reinterpreting the whole-song base event field. Each burst is deterministically seeded from timeline identity plus event contents.

## Validation

Extend `assertResolvedTimeline` so present lyric-resonance evidence must have:

- the exact v1 schema/policy;
- a list of ordered events;
- supported family names;
- integer `startTick` / `endTick` within timeline duration;
- `endTick > startTick`;
- intensity in `[0, 1]`;
- stable cue-index and matched-term arrays.

Legacy timelines without the field remain accepted.

## Proof

Focused tests must prove:

1. exact `smoke` yields a stronger event than a strong synonym;
2. untimed/plain lyrics yield no resonance object/events;
3. identical timed inputs replay to identical evidence and timeline hashes;
4. lyric changes change timeline hash without changing VisualScore address by themselves;
5. nearby same-family hits coalesce;
6. unrelated words produce no events;
7. renderer compiles transient summoned atmosphere over `none`, same-family base, and different-family base;
8. renderer evidence reports base kind plus resonance families/event count;
9. legacy no-resonance atmosphere behavior is unchanged;
10. root `npm run verify` passes in CI.

## Compatibility and artifact impact

- No schema migration of VisualScore.
- No new dependency.
- No online service.
- No renderer-side text interpretation.
- Existing timelines without `lyricResonance` remain valid.
- Timelines generated from timed lyrics gain new canonical evidence and therefore new timeline hashes.
- Retained timeline sidecars include the new evidence automatically because they retain the accepted timeline.
- No release/tag/package-version change in this slice.
