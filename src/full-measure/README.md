# Full Measure

> Drop in a song. Receive the whole damn music video.

Full Measure is a local-first desktop music-video instrument. The core renderer
does not require an account, cloud upload, subscription, or internet connection.
It turns a finished MP3 or WAV into a complete 1080p MP4, using an optional
image, a procedural visual garment, audio-reactive motion, and an optional
lyric layer. Plain lyrics receive honest approximate spacing; LRC, SRT, VTT,
and timestamped JSON render at their supplied vocal times. On 64-bit Windows,
the optional local **Listener** can now borrow vocal timing directly from the
song while keeping the supplied lyrics authoritative.

Every render also produces a **Video Receipt**: a JSON record containing source
and output hashes, media facts, detected energy sections, render settings, audio
handling, and post-render validation.

## Alpha invariant

The alpha succeeds only when this entire path succeeds:

1. Choose or drop an MP3/WAV.
2. Optionally add one image and lyrics.
3. Choose a garment.
4. Click **Make Video**.
5. Receive one playable, full-song, 1920×1080 MP4 with no blank timeline.

Generated clips and online models are not part of the critical path.

## Vocal-timed lyrics

Paste lyrics directly or choose **Import timed file**.

- Plain text keeps the original alpha behavior: headings are omitted and lyric
  lines are spaced approximately across the song.
- LRC timestamps lock each line to its vocal entrance.
- SRT and VTT preserve explicit cue starts and ends.
- Timestamped JSON accepts Full Measure cues as well as common
  Whisper/WhisperX-style `segments`, `transcription`, or `words` arrays.
- Word-only JSON is grouped into readable vocal-timed phrases without replacing
  the supplied text.

The interface labels approximate and synchronized timing differently, and the
Video Receipt records the timing mode, source format, cue count, and cue range.
See [`docs/LYRIC_TIMING.md`](docs/LYRIC_TIMING.md) for formats and templates.

## Local auto-sync

With a song loaded and plain lyrics pasted, choose **Auto-sync vocals**.

On first use, Windows can install a verified local Listener pack:

- whisper.cpp 1.9.1 CPU binary
- quantized English base model (`base.en-q5_1`)
- about 68 MB of one-time downloads
- SHA-256 and exact-size verification before activation
- no account, upload, API key, credits, or network after setup

The listener transcribes a private temporary 16 kHz copy, then Full Measure
monotonically matches the known lyric lines against those timing witnesses.
The transcript never replaces the supplied words. Repeated choruses are
consumed in order, and a line that cannot be placed remains an explicit gap.

The review surface provides:

- high, medium, low, human, and unplaced confidence states
- local playback and an energy waveform
- editable timecodes
- drag-to-time range controls
- ±0.1 second nudging
- Spacebar tap-through for uncertain or missing lines
- same-named `.lrc` save beside the song
- automatic `.lrc` discovery the next time that audio is selected
- alignment provenance in the Video Receipt

The Listener is optional. **Skip install · tap the lines manually** opens the
same correction surface with every line awaiting a human timestamp. Imported
LRC/SRT/VTT/JSON and the original approximate plain-text behavior continue to
work unchanged.

Listener-generated entrances receive a small 220 ms musical lead by default.
Imported timing files and human edits remain literal. The ±0.1 second controls
support mouse, touch, pen, and keyboard correction and flash the changed
timestamp for confirmation.

See [`docs/AUTO_SYNC.md`](docs/AUTO_SYNC.md) for the trust contract, model-pack
details, environment overrides, and known singing limits.

## Run

Requirements:

- Node.js 22 or newer
- npm

```bash
npm install
npm start
```

On Windows, `START_FULL_MEASURE.bat` performs that first-run setup and launches
the app. After setup, rendering itself is offline.

The install includes current platform-specific FFmpeg and FFprobe binaries. If those
cannot be resolved, Full Measure falls back to `ffmpeg` and `ffprobe` on the
system path. The environment variables `FULL_MEASURE_FFMPEG` and
`FULL_MEASURE_FFPROBE` can override either binary explicitly.

## Prove the renderer

The smoke command creates a short, multi-section audio fixture, renders the
entire file at 1080p, validates the result, and writes the MP4 plus its receipt
to `test-artifacts/`.

```bash
npm run smoke
```

Run the fast structural and unit checks with:

```bash
npm test
npm run check
```

## Audio preservation

The uploaded song remains the sole soundtrack. Full Measure never regenerates,
remixes, stretches, truncates, or adds sound.

- MP3 and AAC audio are copied byte-for-byte at the stream level into the MP4
  when the container supports it.
- WAV/PCM and FLAC must be encoded to high-quality 320 kbps AAC because
  portable MP4 playback does not reliably support those source codecs.
- Timing, pitch, channel layout, and full-song duration are preserved in both
  paths.

The Video Receipt states which path was used.

## Architecture

- `src/align/` — verified Listener setup, local transcription, monotonic
  lyric matching, LRC sidecars, and correction data
- `src/render/` — standalone analysis, procedural artwork, FFmpeg rendering,
  validation, and receipt code
- `src/main.cjs` — narrow Electron IPC boundary
- `src/preload.cjs` — isolated desktop bridge
- `src/renderer/` — dependency-free desktop interface
- `scripts/smoke-render.cjs` — end-to-end render proof
- `tests/` — deterministic section and receipt tests

## Current alpha boundary

The fast Listener pass currently targets English vocals on 64-bit Windows.
Singing remains harder than ordinary speech: dense mixes, extreme vocal
effects, overlapping singers, and long sustained syllables may need Spacebar
or drag correction. Full Measure exposes those judgments instead of claiming
infallibility. Vocal isolation and heavier “Deep listen” model packs remain
future optional layers; the renderer and manual/timed-file paths do not depend
on them.

The next slices can add vocal isolation, word-by-word karaoke highlighting,
album garment reuse, and optional imported or generated hero clips without
changing the local render invariant.
