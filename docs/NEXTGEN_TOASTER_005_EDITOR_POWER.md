# NEXTGEN TOASTER 005 — Editor Power

Status: experimental descendant of NEXTGEN-TOASTER-004 material placement.

## Question

Can a derived video material become a genuinely reusable editing primitive rather than a one-shot placed clip?

005 adds editor power without moving acceptance authority away from explicit RECOMPOSE + FREEZE.

## New editor capabilities

- repeat the same digestion descendant in multiple scenes or multiple times in one scene;
- stable placement identity independent of material identity;
- timeline start offset;
- non-zero source-in trim;
- bounded clip duration;
- x / y / scale / rotation;
- optional source crop viewport;
- opacity and blend;
- explicit stack order;
- three-scene proposal geometry preview before FREEZE.

## Repeatability

`materialId` identifies the derived material. `placementId` identifies one use of it.

That distinction is now structural:

```text
ONE MATERIAL
   |
   +--> placement A · ARRIVE · source 0f
   +--> placement B · CROSS  · source 8f
   +--> placement C · CROSS  · source 18f
```

005 permits up to twelve digestion placements. Placement IDs must be unique; material IDs may repeat.

## Source-window custody

A placement carries `sourceStartFrames` plus `durationFrames`.

The composer refuses any placement where:

- source start + duration exceeds the admitted source-duration bound;
- timeline start + duration exceeds the selected 384-frame scene;
- crop escapes the normalized source frame;
- stack order, transform, opacity, blend, or scene is outside the bounded vocabulary;
- the material no longer exists in the current recomputed NextGen crossing.

## Crop semantics

Crop is a source viewport, not an arbitrary mask.

Both current projectors implement the same frozen crop rectangle:

- Remotion: viewport wrapper + repositioned source media;
- HyperFrames: viewport wrapper + repositioned source media.

## Stack semantics

`stackOrder` is now part of the frozen clip contract and semantic trace.

Renderer-local iteration order is no longer allowed to decide the visible stack.

## HyperFrames video timing

HyperFrames now emits each frozen video's source start and schedules media start/pause from the frozen clip timing. Non-zero source windows are therefore explicit projection semantics instead of being refused.

## Remotion video timing

Remotion carries the same source window into `trimBefore` / `trimAfter` and walks the same generic frozen scene / track / clip graph introduced in 004.

## Proposal preview

The Franken bench now renders a three-scene geometry preview from the current recomposed proposal.

It displays:

- scene membership;
- transform position / scale / rotation;
- opacity;
- stack order;
- crop state;
- clip role and timing metadata.

This is intentionally a geometry preview, not a claim of final rendered pixels. Dirty editor state does not rewrite the preview until RECOMPOSE.

## Authority laws

```text
MATERIAL != PLACEMENT
PLACEMENT ID != MATERIAL ID
EDITOR STATE != PROPOSAL
PROPOSAL PREVIEW != FROZEN PLAN
RECOMPOSE != FREEZE
SOURCE WINDOW != SOURCE MUTATION
STACK ORDER != ITERATION ACCIDENT
FROZEN CLIP GRAPH = RENDERER AUTHORITY
```

## Graduation proof

005 may graduate only if evidence proves:

1. one material can produce multiple distinct placements;
2. placement IDs, not material IDs, own edit/remove identity;
3. non-zero source trims survive compose → freeze;
4. video crop survives compose → freeze;
5. transforms, opacity, blend, and stack order survive compose → freeze;
6. out-of-range source windows, scene windows, and crops fail closed;
7. HyperFrames and Remotion expose equal semantic traces for trimmed/cropped/stacked video;
8. the visible editor can repeat a material, edit it, preview proposal geometry, dirty it again, recompose, and freeze;
9. inherited Toaster / Franken / NextGen proofs remain green.
