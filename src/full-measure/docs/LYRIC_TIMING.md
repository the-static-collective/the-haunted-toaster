# Lyric timing contract

Full Measure accepts plain lyrics and four timestamped formats. Timestamped
input is rendered at the supplied vocal times and identified as synchronized in
the interface and Video Receipt.

## LRC — smallest useful input

```text
[00:12.40]The symbols are remembering their weight
[00:16.85]We are passing the microphone
[00:21.10]The porch light will not go out
```

Hundredths or milliseconds are accepted. An optional `[offset:500]` metadata
line shifts all cues by 500 milliseconds. Other LRC metadata is ignored.

LRC provides line starts but not ends. Full Measure keeps a line until shortly
before the next cue. A final line, or a line before a long instrumental gap,
receives a bounded reading duration.

## SRT or WebVTT — explicit ranges

```text
1
00:00:12,400 --> 00:00:16,500
The symbols are remembering their weight

2
00:00:16,850 --> 00:00:20,600
We are passing the microphone
```

SRT and VTT cue ends are honored. Basic caption markup is removed before the
text is drawn.

## Timestamped JSON

The native interchange shape is:

```json
{
  "schema": "full-measure.lyrics.v1",
  "cues": [
    {
      "start": 12.4,
      "end": 16.5,
      "text": "The symbols are remembering their weight"
    },
    {
      "start": 16.85,
      "end": 20.6,
      "text": "We are passing the microphone"
    }
  ]
}
```

Times are seconds. Full Measure also recognizes common external shapes:

- `segments`, `lines`, `transcription`, or `words` arrays
- `start` / `end`, `startSeconds` / `endSeconds`, `from` / `to`, or
  `timestamps.from` / `timestamps.to`
- Whisper-style segment objects containing `start`, `end`, `text`, and
  optional `words`

When an input contains only word-level entries, Full Measure groups consecutive
words into readable phrases while preserving their timestamp range and text.

## Validation rules

- Cues are sorted and clamped to the song.
- Empty text and section headings such as `[Chorus]` are omitted.
- Overlapping line cues are closed just before the next line.
- At most 256 visible cues are accepted in one render.
- Timestamp syntax that produces no cue inside the song is rejected instead of
  being rendered as literal text.

## Native local aligner

The optional Full Measure Listener now produces this same contract:

```text
finished song + supplied lyrics
    ↓
local vocal transcription / forced alignment
    ↓
confidence-scored full-measure.lyrics.v1 cues
    ↓
human correction when needed
    ↓
the existing renderer
```

The supplied words remain authoritative. whisper.cpp contributes approximate
timing evidence; a monotonic fuzzy matcher places repeated lines in order;
uncertain or absent matches are exposed for Spacebar, drag, timecode, or nudge
correction. Accepted timing saves as a same-named LRC and is recorded in the
Video Receipt.

Model inference remains optional. The renderer is deterministic, manual tap
sync needs no model, and an LRC/SRT/VTT/JSON file from any outside process is
always a valid escape hatch. See [`AUTO_SYNC.md`](AUTO_SYNC.md).
