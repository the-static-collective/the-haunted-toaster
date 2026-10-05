# NEXTGEN TOASTER 004 — Human Material Placement

Status: experimental descendant of the green NEXTGEN-TOASTER-003 live-organ crossing.

## Question

Can the six Video Digestion descendants stop being an inert reservoir and become
explicit human-owned timeline material while preserving deterministic freeze and
cross-renderer parity?

004 answers only that question.

## Placement contract

Video Digestion still contributes six proposal-only descendants. 004 gives each
descendant a stable public `materialId`, an admitted source-duration bound, and a
renderer-neutral projection treatment.

Nothing is placed automatically.

A placement exists only after the human chooses or drags one descendant into a scene.
The editable placement contract is:

- material identity;
- scene: ARRIVE / CROSS / ASSEMBLE;
- start offset in frames;
- duration in frames;
- position / scale / rotation;
- opacity;
- blend: normal / screen.

Each digestion descendant may be placed at most once in this slice.

## Editor behavior

The Franken reservoir now supports two equivalent human actions:

1. press **PLACE** on a descendant;
2. drag the descendant onto an ARRIVE / CROSS / ASSEMBLE lane.

Placed materials expose scene, timing, opacity, and blend controls. Any placement,
move, removal, or parameter edit dirties the proposal immediately and disables FREEZE.

```text
RESERVOIR
   |
   | human PLACE / drag
   v
PLACEMENT EDIT
   |
   | RECOMPOSE
   v
REVIEWED PROPOSAL
   |
   | explicit FREEZE
   v
FROZEN TRACK GRAPH
```

## Fail-closed bounds

A placement refuses if:

- its material identity is not in the current recomputed crossing;
- the same descendant is placed twice;
- the clip duration exceeds the admitted source duration;
- start + duration exceeds the selected 384-frame scene;
- scene, transform, opacity, or blend is outside the bounded editor vocabulary;
- the NextGen crossing identity is stale.

Reloading the live organ crossing or changing seed clears local placements.

## Frozen representation

Placed descendants become ordinary frozen scene clips on one
`video-digestion-placement` track per scene.

The material keeps:

- source digest;
- Video Digestion family hash;
- descendant plan hash;
- operator ID;
- sampling-policy ID;
- projection class;
- source-duration frame bound;
- renderer-neutral projection treatment.

The projection treatment is intentionally narrower than the original FFmpeg digestion
operator. It gives both current Franken projectors one deterministic visible treatment
for the descendant identity. It does **not** claim byte-equivalence with the Toaster
foreign-material FFmpeg compiler.

## Renderer repair

HyperFrames already walked arbitrary frozen scene tracks.

Remotion did not: its founding component hard-coded six image slots and one video slot.
004 removes that special-case structure. Remotion now walks the frozen scene / track /
clip graph generically, exactly like the renderer-neutral contract requires.

Both renderers consume the same frozen placement semantics and the same projection
treatment evidence.

## Authority laws

```text
RESERVOIR != PLACEMENT
DRAG != FREEZE
PLACE != KEEP
PLACEMENT EDIT != ACCEPTANCE
RECOMPOSE != FREEZE
DERIVATION != PIXEL-EQUIVALENT FFMPEG DIGEST
FROZEN TRACK GRAPH = RENDERER AUTHORITY
```

## Graduation proof

004 may graduate only if evidence proves:

1. all six descendants have stable placeable material identities;
2. public material identity does not leak private source plans;
3. placement state is explicit and human-owned;
4. duplicate, stale, overlong, and scene-overflow placements refuse;
5. a reviewed placement survives compose → freeze with derivation custody;
6. changing the crossing or seed clears stale placement state;
7. Remotion walks arbitrary frozen tracks rather than hard-coded slots;
8. HyperFrames and Remotion expose equal semantic traces for a placed descendant;
9. the visible editor witnesses PLACE → RECOMPOSE → FREEZE;
10. all inherited Toaster and Franken proofs remain green.
