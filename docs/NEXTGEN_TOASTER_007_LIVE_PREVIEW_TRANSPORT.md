# NEXTGEN TOASTER 007 — Live Proposal Preview + Transport

Status: experimental descendant of NEXTGEN-TOASTER-006 time editor.

## Question

Can the Franken bench show and scrub the actual admitted proposal media, synchronized to the chosen song, without turning playback or preview URLs into composition authority?

007 adds observational media preview, synchronized song transport, and timeline zoom.

## Preview assets

The compose service now returns a separate `previewAssets` map for admitted image/video bindings.

`previewAssets` is intentionally outside:

- proposal identity;
- frozen plan identity;
- receipts;
- projection bundle semantics.

The map contains only material id → media kind + local file URL for media already admitted by the composer inputs.

## Proposal media preview

The three-scene review surface now renders admitted image/video media for clips in the last recomposed proposal.

At the current playhead it evaluates:

- clip active/inactive state;
- source-window media time;
- transform and transform keyframes;
- crop viewport;
- opacity;
- stack order.

Video elements remain preview-only and muted. Their source time is sought from the proposal clip window.

## Song transport

Full Measure emits an observational browser event when its chosen song is ready:

`full-measure:audio-ready`

The event carries the already-approved browser media URL, duration, and filename. Franken does not own or mutate the main song state.

The transport maps song time proportionally onto the 1152-frame Franken composition:

```text
song 0s ------------------------------ song end
   |                                      |
   v                                      v
frame 0 ----------------------------- frame 1151
```

PLAY advances the playhead from the real song clock. PAUSE stops it. Manual scrub seeks the song clock when a song is present.

Transport controls are observational and never dirty the proposal.

## Timeline zoom

The timeline can be viewed at 1×, 2×, or 4× width inside a horizontal scroll surface.

Zoom changes display scale only. It does not alter frames, placements, snapping, proposal identity, or freeze authority.

## Custody laws

```text
PREVIEW URL != PROPOSAL DATA
PREVIEW MEDIA != FROZEN MEDIA AUTHORITY
PLAY != EDIT
PAUSE != EDIT
SCRUB != EDIT
ZOOM != EDIT
SONG CLOCK != PLACEMENT AUTHORITY
DIRTY EDITOR != RECOMPOSED PREVIEW
FREEZE remains the authority boundary
```

## Graduation proof

007 may graduate only if evidence proves:

1. preview URLs derive only from admitted local media bindings;
2. preview URLs never enter proposal identity or frozen plan data;
3. song time maps deterministically to composition frames;
4. proposal clip source windows map deterministically to preview media time;
5. the browser renders admitted media elements in the proposal preview;
6. scrub updates proposal media activity without dirtying the proposal;
7. PLAY advances the playhead from an actual browser audio clock;
8. PAUSE stops transport without changing composition state;
9. timeline zoom changes only display scale;
10. FREEZE remains enabled across play/pause/scrub/zoom when the proposal was already reviewed;
11. inherited Toaster / Franken / NextGen proofs remain green.
