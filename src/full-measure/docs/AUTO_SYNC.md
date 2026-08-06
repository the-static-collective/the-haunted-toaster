# Full Measure Listener

The Listener is an optional local timing witness for known lyrics.

Its contract is:

> The user supplies the words. The model may lend times. It may not rewrite the
> lyric record.

## Fast listening pass

1. FFmpeg makes a temporary mono, 16 kHz, 16-bit PCM listening copy.
2. whisper.cpp produces timestamped local ASR fragments.
3. Full Measure normalizes punctuation and small spelling differences.
4. Each known lyric line is fuzzy-matched forward through the fragments.
5. Repeated text consumes later fragments in chronological order.
6. Accepted matches borrow the fragment start and end times.
7. Weak or absent matches remain flagged for review or human placement.
8. The temporary listening directory is removed.

Only the supplied lyric text enters the final LRC and video. The raw ASR guess
is shown as review evidence and is not rendered as a replacement lyric.

## Musical placement

The Listener places each matched lyric entrance 220 ms ahead of the raw
speech-model timestamp. This compensates for the tendency of sung-word
recognition to mark a word after its musical onset. The applied lead is recorded
as `engine.placementLeadSeconds` in the alignment result.

This adjustment applies only to new Listener placements. Imported LRC, SRT,
VTT, and timestamped JSON cues remain exact, as do human corrections.

## Managed Windows pack

Automatic setup is currently available on 64-bit Windows:

| Component | Pin | Download |
| --- | --- | --- |
| whisper.cpp | 1.9.1 | `whisper-bin-x64.zip` |
| Whisper model | `base.en-q5_1` | `ggml-base.en-q5_1.bin` |

Both artifacts are fetched over HTTPS from their official project locations.
The binary archive and model are pinned to reviewed SHA-256 hashes. The model
must also match its exact expected byte length. Downloads use temporary paths;
an incomplete or failed integrity check never becomes an active pack.

Setup downloads about 68 MB and uses roughly 76 MB on disk. It is a one-time
operation. Listening is offline afterward.

## External configuration

Other platforms or custom builds can point Full Measure at compatible local
files:

```text
FULL_MEASURE_WHISPER=/absolute/path/to/whisper-cli
FULL_MEASURE_WHISPER_MODEL=/absolute/path/to/ggml-model.bin
```

The model and CLI must be compatible. The current invocation requests full JSON
output and word-sized segments.

## Confidence

Confidence combines:

- fuzzy similarity between the official line and the heard fragment
- comparable text-length fit
- whisper.cpp token probability when available
- a small chronological penalty for skipping unrelated fragments
- one-line lookahead to reduce greedy drift

The visible states are:

- **High** — strong automatic placement
- **Medium** — plausible; worth hearing
- **Low** — tentative; review recommended
- **Unplaced** — the matcher abstained
- **Human** — the user tapped, dragged, typed, or nudged the entrance

Unplaced lines are not silently interpolated into the exported LRC. The review
surface suggests a navigation position, but the user must place the line before
accepting the complete track.

## Correction loop

- Click a row to select it.
- Click Play to audition from just before its entrance.
- Drag the range control for broad movement.
- Edit `mm:ss.xx` for exact placement.
- Use `−.1` and `+.1` for fine nudging.
- Choose **Tap through review lines**, play the song, and press Space at each
  entrance.

After acceptance, Full Measure writes `song.lrc` beside `song.mp3` or
`song.wav`. Existing sidecars require an explicit replacement confirmation.
The sidecar is automatically rediscovered when the song is loaded later.

## Known limits

The fast model is deliberately compact. Heavy instrumentation, vocal doubling,
reverb, distortion, code-switching, unusually slow sustained singing, and
spoken samples may reduce alignment quality. A clean vocal stem will usually
improve the witness if one is available.

The current managed pack is English-only. A later Deep Listen slice can add
optional vocal isolation and larger or multilingual models without changing
the cue/LRC contract.
