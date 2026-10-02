# Listening Eye v0 — Concept-Album Art Direction from the Song

Status: **experimental executable seam**  
Date: **2026-10-01**  
Authority: **influence-only**

## Purpose

Listening Eye gives The Haunted Toaster a bounded way to ask:

> **What visual laws does this song suggest when it is listened to as part of a larger album world?**

It is not a second renderer, not a taste model, and not a semantic oracle.

The motivating experiment came from using a live audio-reactive shader as an art-direction sketchpad: rather than treating the shader output as final art, the useful object was the visual grammar discovered while the actual music drove space, motion, density, persistence, and recurrence.

Listening Eye brings that idea inside Toaster law.

## Constitutional boundary

```text
SONG ANALYSIS = witnessed input
LISTENING EYE = influence-only art-direction evidence
LISTENING EYE != VisualScore authority
LISTENING EYE != KEEP
LISTENING EYE != preference inference
LISTENING EYE != lyric meaning oracle
```

KEEP / SCRAPE remains untouched.

Listening Eye may contribute possibilities. The existing candidate ecology still proposes creatures. The human still owns continuation.

## Six-up lens ecology

One song produces exactly six complementary art-direction lenses:

1. **Landscape** — horizon, road, relief, recurring landmarks.
2. **Architecture** — gate, chamber, ribs, apertures.
3. **Organism** — branch, membrane, pulse, scar.
4. **Sigil / Type** — stroke, glyph, echo, break.
5. **Weather / Particles** — dust, spark, mist, rain.
6. **Dimensional Space** — depth, fold, parallax, void.

These are not six style presets. They are six different translations of the same witnessed musical structure.

Each lens declares how it interprets four existing event classes:

- **section** → large-scale state;
- **phrase** → local structure / gesture;
- **transient** → puncture / break / burst;
- **history** → what persists after the event.

For concept albums it adds a fifth role:

- **album** → how a recurring visual law can mature across tracks.

## Album position without falsifying the song

Listening Eye takes optional album context:

```json
{
  "albumId": "optional-stable-id",
  "albumSeed": "optional-stable-seed",
  "trackIndex": 2,
  "trackCount": 9
}
```

This creates two explicit pressures:

- **foreshadowPressure** is strongest earlier in the album;
- **arrivalPressure** is strongest later in the album.

Crucially, changing album position does **not** change the song-analysis hash.

That means an early track may carry immature forms, partial symbols, distant architecture, or unresolved spatial relationships while a late track can resolve those same laws—without pretending the waveform itself changed.

This is the first small executable foothold for the earlier **Future Rearview Memory Prophecy** idea.

## v0 output

`buildListeningEye()` produces:

```text
haunted-toaster/listening-eye/v0
  authority: influence-only
  analysisHash
  album context
  structural summary
  six deterministic lenses
    mapping
    normalized pressures
  listeningEyeSha256
```

Pressure channels are normalized `0..1`:

- motion
- density
- contrast
- persistence
- memory
- foreshadow
- arrival

The hash makes the art-direction proposal inspectable and replayable.

## Why the first slice does not steer rendering yet

The existing Toaster already has a strong authority chain:

```text
analysis
  -> candidate ecology
  -> VisualScore
  -> ResolvedTimeline
  -> KEEP
  -> render
```

v0 deliberately stops before mutating that chain.

The next slice should prove one narrow crossing:

```text
Listening Eye lens
  -> explicit bounded candidate influence
  -> changed candidate evidence
  -> exact excision restores baseline
```

That crossing should behave more like Scar / Familiar research than like an ambient style preference.

Until that proof exists, Listening Eye is executable art-direction evidence only.

## Intended concept-album workflow

```text
ALBUM SEED
   |
   +-- Track 1 analysis -> six Listening Eye lenses
   |      -> early foreshadow pressure
   |
   +-- human KEEP establishes lawful ancestry
   |
   +-- Track 2 analysis -> same six conceptual doors
   |      -> inherited album context, new song witness
   |
   ...
   |
   +-- final track
          -> arrival pressure dominates
          -> earlier partial structures may become explicit
```

A future album memory layer may carry exact kept visual ancestry forward. It must not convert KEEP into a generic learned preference.

## VisualSong relationship

VisualSong or another audio-reactive renderer can serve as an external **probe instrument**:

```text
song -> live reactive visual experiment -> discovered behavior
                                        |
                                        v
                           candidate Listening Eye law
```

The external renderer does not become product authority merely because it generated the discovery.

The useful harvest is the law: for example, “history should remain visible as a wake,” “transients should puncture architecture,” or “late-album arrival should close a previously incomplete gate.”

## Non-goals for v0

- no automatic final-video style selection;
- no hidden style ranking;
- no user preference vector;
- no lyric-semantic claims;
- no spectral-band claims unless the underlying Toaster analysis explicitly provides them;
- no dependency on VisualSong or any external provider;
- no alteration of KEEP / SCRAPE;
- no album-wide mutation without exact ancestry evidence.

## Next falsifiable crossing

The strongest next experiment is **LISTENING-EYE-CROSSING-001**:

1. generate a baseline ordinary six;
2. choose one Listening Eye lens deterministically by slot;
3. apply one bounded declared influence to each candidate;
4. receipt the lens hash and changed axes;
5. prove replay;
6. excise Listening Eye and recover the exact baseline family;
7. human-witness whether the six feel materially more like distinct interpretations of one song rather than six unrelated style presets.

If that passes, Listening Eye becomes a real art-direction organ inside the Toaster rather than merely a good idea.
