# Full Measure alpha contract

## Product sentence

**Full Measure turns any finished song into a finished music video—locally.**

The render is the product. A storyboard, shot list, web preview, or folder of
short clips does not satisfy the contract.

## Required path

```text
MP3 / WAV
    ↓
local analysis
    ↓
optional image + optional words + garment
    ↓
one Make Video action
    ↓
complete 1920×1080 MP4 + Video Receipt
```

## Invariants

1. The selected song is the sole soundtrack.
2. No model regenerates, remixes, stretches, replaces, or decorates the audio.
3. The video timeline covers the complete song with a continuous visual graph.
4. The renderer never depends on a cloud upload, login, subscription, or media
   credit.
5. MP3/AAC streams are copied when portable MP4 allows it. Other masters receive
   only the container-required high-quality AAC encode.
6. A render is accepted only when both audio and video streams exist and the
   finished duration differs from the source by no more than 250 ms.
7. Every accepted output receives a Video Receipt with source/output SHA-256
   hashes, media facts, treatment, section map, audio handling, and validation.
8. AI-generated images or clips may later enter as optional material, but they
   may never become the only route to a finished file.

## Alpha capabilities

- MP3, WAV, M4A, AAC, and FLAC ingestion
- one optional PNG/JPG/WebP/BMP/TIFF image
- three deterministic visual garments
- one-second RMS energy analysis and section-boundary detection
- slowly evolving local procedural artwork
- full-frame and lower-third audio-reactive wave layers
- optional title and artist
- plain lyrics with honestly approximate line spacing
- vocal-timed LRC, SRT, VTT, and timestamped JSON ingestion
- optional verified local whisper.cpp Listener pack on 64-bit Windows
- supplied-lyric auto-alignment with visible confidence and honest gaps
- waveform playback, Spacebar tap-through, drag, timecode, and nudge correction
- same-named LRC save and discovery without silent overwrite
- timing provenance and cue range recorded in the Video Receipt
- live progress and safe cancellation
- H.264/yuv420p/fast-start MP4
- source and output hashing
- post-render stream and duration validation
- Windows installer and portable-build workflow

## Honest alpha boundaries

- The compact English Listener can infer line entrances locally, but singing is
  harder than speech. Dense mixes and vocal effects may need visible human
  correction; low-confidence and unmatched lines are never presented as
  certainty.
- Automatic Listener setup is currently limited to 64-bit Windows. Manual tap
  sync and imported timing files remain cross-platform.
- Vocal isolation and heavier Deep Listen models are not part of this slice.
- Word-only JSON is grouped into readable phrases. Per-word karaoke highlighting
  is not claimed in this slice.
- Energy boundaries are meaningful visual edit points, not claimed verse/chorus
  transcription.
- The first Windows artifact is unsigned and may trigger a SmartScreen warning.
- A conventional MP4 cannot portably preserve WAV/PCM or FLAC bit-for-bit; those
  inputs are encoded to 320 kbps AAC without timing, pitch, or arrangement
  changes.
- The repository remains unlicensed until the project chooses its commons
  covenant.

## Proof commands

```bash
npm run check
npm test
npm run smoke
```

The smoke proof renders:

1. a full 12-second 1080p WAV path with synchronized LRC cues and AAC container
   encoding; and
2. a four-second image-weave path with MP3 stream-copy.

Both outputs must produce accepted receipts.
