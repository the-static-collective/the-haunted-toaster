# Listening Eye v0 — Concept-Album Art Direction from the Song

Status: **experimental executable seam + opt-in final-six selection crossing**  
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

## The first executable crossing: selection pressure, not score pressure

Listening Eye now has one bounded opt-in crossing into the ordinary initial six-up.

Each Toastmood lane still generates its existing lawful candidate family first. Listening Eye then evaluates those already-generated possibilities through exactly one art-direction lens for that final slot:

```text
Toastmood lane
  -> existing lawful candidate possibilities
  -> existing novelty merit + Listening Eye lens merit
  -> one final survivor for that slot
  -> ordinary downstream topology / L BRANCH / preview / KEEP path
```

The lens does **not** rewrite the winning VisualScore or rebuild its ResolvedTimeline. It contributes only selection pressure among possibilities the Toaster already knew how to make.

The existing diversity pressure remains dominant: candidate merit is currently `2 × novelty + lens merit`. This keeps Listening Eye from collapsing the six into a stylistically homogeneous album mood.

When Listening Eye is disabled, its fields are absent rather than null and the original selection path is preserved.

The family records:

- the exact Listening Eye hash;
- album context and structural summary;
- one lens per final slot;
- lens merit and novelty merit;
- the source candidate index selected from that lane;
- `authority: influence-only`.

This is **LISTENING-EYE-CROSSING-001**.

The next proof is perceptual rather than architectural: run real songs through baseline A / directed B / baseline A′ and determine whether the directed six read as materially distinct interpretations of the same song while A and A′ remain exact.

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

## Next falsifiable witness

The strongest next experiment is **LISTENING-EYE-WITNESS-001**:

1. generate ordinary baseline A from a real song;
2. generate directed B from the same seed with Listening Eye enabled;
3. generate baseline A′ with Listening Eye removed;
4. prove A = A′ exactly;
5. confirm B carries six distinct lens receipts;
6. human-witness whether B reads as six coherent interpretations of one musical world rather than arbitrary style presets;
7. repeat on neighboring tracks with explicit album positions and inspect whether foreshadow / arrival creates useful continuity without flattening song identity.

Only after that witness should album-wide kept ancestry be allowed to feed later tracks.
