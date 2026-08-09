# Haunted Typography v1

This branch begins the bounded implementation of #25.

## Product law

Typography is a deterministic result of accepted score identity + stable text/cue identity + renderer vocabulary. The user supplies the words; the Toaster owns the exact treatment.

## Resolver now present

`src/render/haunted-typography.cjs` provides a pure resolver with eight bounded morphology treatments:

- condensed-scream
- wide-carnival
- heavy-slab
- needle
- tilted-ransom
- ghost-echo
- inverted-emphasis
- jittered-spacing

The vocabulary deliberately uses declarative ASS morphology over a known base family. No host font discovery, executable expressions, wall clock, or ambient randomness participates.

Same score identity + renderer/profile identity + text/cue list resolves the same typography plan and plan hash.

## Remaining wiring before merge

This branch is intentionally draft until all of these are true:

1. `render-legacy.cjs` consumes the resolved plan for title, artist, canonical lyric cues, and explicit lyric ghosts.
2. Six-up candidate preview resolves typography per candidate score rather than constructing one shared text overlay before the candidate loop.
3. Final ResolvedTimeline render resolves from the same score identity and vocabulary.
4. Receipt evidence records typography policy/version + plan hash (or equivalent sidecar evidence).
5. Preview/render parity is proven on at least one candidate fixture.
6. Legacy/no-haunted-typography behavior has an explicit deterministic fallback.

Do not merge this branch merely because the pure resolver tests are green. The user-visible feature is the shared preview/render seam.
