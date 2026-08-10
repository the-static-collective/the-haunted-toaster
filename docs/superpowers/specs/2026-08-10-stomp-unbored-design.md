# STOMP / UNBORED Design

## Goal
Add one intentionally simple boredom pedal: **STOMP**. Pressing it immediately generates the next six descendants with the generator biased toward the outer rails of the lawful search space.

Product law: **STOMP means “I’m bored. Surprise me harder.”** It does not mean “make it louder,” “apply distortion,” or “choose a specific weird effect.” It changes the generation policy, not the renderer after the fact.

The internal/product nickname may be `UNBORED`, but the visible control is `STOMP` with helper text `Bored? Floor the next six.`

## Interaction contract
- STOMP is a one-shot action, not a persistent mode or preference.
- It lives beside the existing candidate mutation controls and uses the same current selected candidate as the parent.
- It is disabled when no current candidate is selected.
- Pressing STOMP immediately generates one six-up family under the STOMP policy.
- After generation there is no armed state to clear; ordinary MUTATE/CONVERGE behavior remains ordinary on the next action unless STOMP is pressed again.
- Existing user locks remain absolute.
- The generated cards use the normal six-up surface and remain selectable/renderable exactly like ordinary descendants.

## Generation law
Introduce a separate versioned candidate-family policy `visible-outcome-stomp-v1` rather than passing an undocumented UI flag into the renderer.

STOMP optimizes for **novelty from the selected parent and from its siblings**, not for raw numeric maximums. A quiet but structurally bizarre candidate may be a better STOMP result than a predictable candidate with every amplitude value pinned high.

All six slots become tail-seeking roles while staying materially different from one another:

1. `structure-break` — strongly prefer a structure/topology departure.
2. `dynamics-break` — strongly prefer motion/field-dynamics departure.
3. `field-break` — strongly prefer atmosphere/material/palette territory not adjacent to the parent.
4. `categorical-break` — require several broad categorical changes when lawful.
5. `compound-mutant` — combine primitive and broad-axis departures.
6. `rail-rider` — highest lawful novelty threshold and the strongest permission to combine rare primitive families.

These are generation roles, not visible presets. The UI still shows six candidate outputs rather than effect names.

## Relationship to the hidden primitive field
STOMP is intentionally sequenced after the hidden primitive-field slice.

Normal generation gives hidden structure/dynamics primitives ordinary weighted coverage. STOMP shifts that weighting toward rare and underexplored primitive combinations and raises minimum semantic-distance requirements.

Examples of outcomes STOMP may discover include `ribs + magnetic`, `facets + seismic`, `branches + swarm`, or `folds + whip`, but no named combination is guaranteed or directly selectable.

If `topology` is locked, STOMP freezes both the broad topology and selected hidden structure primitive. If `motion` is locked, it freezes both the broad motion grammar and hidden field dynamics. STOMP then searches harder in the remaining lawful domains rather than violating the lock.

## Distance and coverage
Extend the existing visible-distance machinery rather than inventing a second concept of novelty.

The STOMP policy should:

- use versioned deterministic seeds derived from root seed, parent score reference, slot index, attempt, lock set, and STOMP policy ID;
- require larger parent-distance and sibling-distance thresholds than ordinary branch generation;
- count primitive-field breaks in semantic distance;
- prefer underexplored categorical/primitive combinations when multiple candidates satisfy thresholds;
- degrade thresholds deterministically when locks or a narrow garment constraint pack make the nominal target impossible;
- fail only when no lawful descendant exists, with a clear generation error rather than silently breaking a lock.

The existing ordinary `risky-hybrid` slot remains unchanged outside STOMP. STOMP effectively makes the whole six-up search with that same “crazy slot” permission, while still assigning six distinct roles so the family does not collapse into six versions of one chaos preset.

## Authority and provenance
STOMP does not mutate the accepted parent or accepted history merely by being pressed. It creates derived score artifacts; history changes only through the existing candidate selection/admission flow.

Every STOMP candidate derivation records candidate policy ID, parent score reference, root/derived seed evidence, slot and role, locks, intended/applied broad axes, primitive breaks, categorical breaks, measured distance from parent and nearest accepted sibling, and any deterministic threshold relaxation required by locks/constraints.

Same parent + same root seed + same locks + same policy must reproduce the same six candidates and timelines.

## UI architecture
Keep the UI change narrow:

- add one `STOMP` button to the existing candidate action area;
- reuse the current selected candidate, lock state, root seed, and six-up rendering path;
- send an explicit STOMP generation request through the candidate session/preload boundary rather than keeping a hidden renderer/UI toggle;
- provide helper text `Bored? Floor the next six.`;
- expose disabled/busy state through the same rules as MUTATE/CONVERGE.

No mood dials, effect menus, intensity sliders, or persistent STOMP settings are added.

## Compatibility and artifact impact
- Ordinary candidate generation and CONVERGE remain behaviorally unchanged when STOMP is not invoked.
- STOMP creates new derivation/family policy evidence and therefore intentionally different score/timeline hashes for its descendants.
- Existing renderer profiles and retained artifacts remain replayable.
- No package/release bump is part of this slice.
- No new dependency.

## Integration order
1. Build against the hidden primitive-field slice.
2. After the primitive PR lands, refresh STOMP onto the resulting `main` before landing STOMP.
3. If concurrent changes touch the same generation/UI seam, integrate semantically rather than choosing one side wholesale.

## Proof
Add executable proof for selected-parent/stale-family protection, six distinct STOMP roles, deterministic replay, stronger novelty than ordinary branch generation, primitive-field distance, lock inheritance, deterministic threshold relaxation, ordinary MUTATE/CONVERGE isolation, UI one-shot semantics, and production preview/render consuming normal accepted timelines with no renderer-side STOMP branch.
