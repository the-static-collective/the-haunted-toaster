# Matcher False-Placement Guard Design

## Goal
Prevent isolated weak machine matches from acquiring lyric timing authority while preserving the current fuzzy matcher, human anchors, and successful high/medium placements.

## Core law
Candidate discovery may remain permissive. Timing admission must be conservative.

A machine candidate classified `high` or `medium` remains admissible under the existing policy. A machine candidate classified `low` is admitted only when it has meaningful direct match evidence and sequence corroboration from a neighboring cue. Otherwise the cue remains reviewable evidence but is emitted as `unmatched` with `start: null` and `end: null`.

Human anchors are outside this guard: `status: human` remains authoritative exactly where the user placed it.

## Deterministic evidence rule
For a `low` candidate to retain a timestamp:
- candidate score must be at least `0.50`;
- candidate similarity must be at least `0.47`;
- and at least one sequence condition must hold:
  - a prior lyric cue has already been admitted and this candidate begins no more than 8 transcript entries after the current cursor; or
  - the next lyric line has a near-cursor candidate score of at least `0.52` after this candidate.

The prior-cue requirement matters for first-line anomalies: the first available ASR entry may itself occur far into the song, so `startIndex === cursor` does not by itself establish local evidence.

The thresholds live as named matcher-policy constants. They are not renderer defaults and introduce no ambient state.

## Architecture
Keep broad and near-cursor search unchanged. Extend `bestCandidate()` to retain bounded context about the winning search result: skipped transcript entries and next-line support already computed during lookahead. Add one pure `hasSufficientTimingEvidence(candidate, confidence, hasPreviousPlacement)` admission function used by `alignLyricsToTranscript()` after `confidenceStatus()`.

When the guard refuses a low candidate, preserve `heard`, `similarity`, and computed confidence for review, but do not advance the transcript cursor and do not create a time.

## Regression proof
Add a synthetic specimen shaped like the field anomaly: the first lyric line finds a low-confidence candidate beginning at `54.27s`, with no neighboring sequence support. Assert that it remains unplaced rather than becoming a timed cue.

Also prove:
- an ordinary high/medium placement is unchanged;
- a low placement with meaningful direct evidence plus prior/next sequence support may still be admitted;
- an explicit human anchor at the same weak location remains `status: human` with its exact timestamp.

If the original `0 certain / 13 review / 49 unplaced` specimen becomes available later, add it as a fixture without changing the policy solely to fit the fixture.

## Compatibility boundary
No global increase of `MIN_ACCEPTED_SCORE`. No renderer, subtitle, score, receipt, or profile change. No timestamp synthesis for rejected evidence. Existing human-anchor windows remain untouched.