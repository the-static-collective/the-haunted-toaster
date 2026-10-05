# NEXTGEN TOASTER 006 — Time Editor

Status: experimental descendant of NEXTGEN-TOASTER-005 editor power.

## Question

Can time become a directly editable surface without allowing gestures, snapping, preview, or keyframes to bypass proposal review and explicit FREEZE?

006 adds a miniature timeline, playhead/scrub preview, musical snap guides, and bounded transform keyframes.

## Timeline

The Franken bench now exposes the full 1152-frame composition as three 384-frame bands:

- ARRIVE: 0–383
- CROSS: 384–767
- ASSEMBLE: 768–1151

Each digestion placement is drawn as its own timeline bar using `placementId`, not `materialId`.

The bar may be dragged across scene boundaries. Its right edge may be resized. Both operations edit dirty placement state only.

## Musical snapping

The same analysis already consumed by Listening Eye yields influence-only snap marks:

- section starts;
- phrase events;
- transients;
- song end.

Song time is deterministically projected onto the 1152-frame Franken timeline. Scene boundaries are also snap candidates.

Snap marks are guides, not placement authority. The human may disable snapping.

## Playhead / scrub preview

A 0–1151 playhead drives the three-scene proposal geometry preview.

The preview is derived from the last recomposed proposal, not current dirty editor state. It shows clip activity at the selected frame and evaluates frozen transform keyframes at that frame.

Therefore:

```text
DIRTY TIMELINE EDIT
      |
      | does not rewrite preview
      v
LAST RECOMPOSED PROPOSAL
      |
      | RECOMPOSE
      v
UPDATED SCRUB PREVIEW
      |
      | FREEZE
      v
RENDERER AUTHORITY
```

## Transform keyframes

Each placement may carry up to four transform keyframes.

A keyframe owns:

- offset frame within the placement;
- x;
- y;
- scale;
- rotation.

The base placement transform is the frame-zero state. Transform values interpolate linearly between frozen keyframes.

Changing clip duration or source trim prunes keyframes that would fall outside the resulting clip span.

## Renderer semantics

Remotion evaluates the frozen transform keyframe set through frame interpolation inside the clip sequence.

HyperFrames lowers the same frozen keyframes into explicit GSAP timeline segments with linear easing.

Keyframe semantics are part of the renderer-neutral semantic trace.

## Fail-closed rules

- at most four keyframes per placement;
- keyframe offsets must be unique;
- keyframe offsets must stay inside clip duration;
- timeline drag cannot place a clip outside a scene span;
- resize cannot exceed scene span or admitted source duration;
- stale crossing / material rules from 003–005 remain unchanged;
- editor gestures never freeze.

## Authority laws

```text
SNAP GUIDE != PLACEMENT AUTHORITY
DRAG != RECOMPOSE
RECOMPOSE != FREEZE
PLAYHEAD != RENDER AUTHORITY
SCRUB PREVIEW != FINAL PIXELS
KEYFRAME EDIT != FROZEN MOTION
FROZEN KEYFRAMES = RENDERER MOTION AUTHORITY
```

## Graduation proof

006 may graduate only if evidence proves:

1. observed song structure becomes deterministic snap landmarks;
2. snap can be enabled or disabled without mutating source evidence;
3. drag can cross scene boundaries using placement identity;
4. resize stays bounded by scene and admitted source duration;
5. playhead scrub reads the last recomposed proposal, not dirty state;
6. up to four transform keyframes survive compose → freeze;
7. duplicate/out-of-range keyframes fail closed;
8. Remotion and HyperFrames expose equal semantic traces for keyframed clips;
9. the visible witness performs snap drag → resize → scrub → keyframe → RECOMPOSE → dirty move → custody check → RECOMPOSE → FREEZE;
10. all inherited Toaster / Franken / NextGen proofs remain green.
