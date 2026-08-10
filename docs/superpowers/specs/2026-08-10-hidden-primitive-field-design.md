# Hidden Primitive Field Design

## Goal
Salvage the strongest Toaster Lab visual vocabulary as native Haunted Toaster primitives that multiply renderer variety without turning the UI into an effect menu or granting Toaster Lab execution authority.

The product law is: **the user chooses broad axes; the Toaster chooses the internal creature.** Primitive choices are invisible in ordinary controls but canonical, inspectable, deterministic, and replayable because they materially affect output.

## Source vocabulary and native mapping
Toaster Lab remains archaeology/source material only. Its proposal terms do not become executable merely because their names are recognized.

### Structure primitives
These describe the internal body inside the existing topological composition.

- `scope` — neutral/legacy internal body.
- `ribs` — from `organic_ribs`; repeated curved bands / duplicated skeletal traces.
- `lattice` — from `fractal_lattice` and `crystalline_mesh`; repeated intersecting internal traces.
- `facets` — from `platonic_solids` / crystalline forms; angular, rotated, polygon-like repetition.
- `torus` — from `hyper_torus`; nested or wrapped ring behavior.
- `folds` — from `folded_manifold` and `garment_drape`; mirrored and displaced layered planes.
- `voxels` — from `voxels_field`; quantized/block-like internal segmentation.
- `branches` — renderer-native version of the `hydra` idea; one source becomes several related limbs.

These are deliberately orthogonal to the existing `linear / circle / mirrored-ring / spiral / quad-mirror` topology axis. `spiral + ribs` and `quad-mirror + lattice` are valid combinations rather than new presets.

### Field-dynamics primitives
These describe how the internal body tends to move. They do not replace the broad motion grammar.

- `inertial` — neutral/legacy tendency.
- `wave` — from `fluid_wave` / water.
- `orbital-decay` — from Toaster Lab `orbital_decay`.
- `snap` — from `chaotic_snap`.
- `oscillation` — from `harmonic_oscillation`.
- `seismic` — from `seismic_shudder` / earthquake.
- `magnetic` — attraction/repulsion around deterministic field centers.
- `swarm` — bee-like local convergence/divergence without a literal bee effect.
- `whip` — cat-tail-like lag, overshoot, and reversal.
- `advect` — wind-like directional transport.

`staccato_pulses` and `inertial_drift` are already substantially represented by the canonical `pulse` and `drift` motion grammars, so they should not be duplicated as hidden categories.

### Atmosphere placement
Do not force every evocative word into structure or motion. Existing Atmosphere remains the authority for screen-space field phenomena.

- `rain-on-the-glass` should become a rain presentation/particle behavior, not a topology.
- `flame` belongs to buoyant/ember field behavior, potentially combining smoke/dust with upward advection rather than becoming a topology.
- `falling-stars` belongs to a ballistic luminous-particle behavior, reusing the atmosphere particle substrate where possible.
- `wind` primarily maps to `advect` and can influence atmosphere direction when an atmosphere is active.
- `water` primarily maps to `wave`; lens/rain behavior remains atmosphere territory.

Slice A must establish the reusable primitive seam first. Additional atmosphere behaviors may use that seam later without creating new architecture.

## Canonical model
Add an optional `primitiveField` object to the VisualScore:

```json
{
  "structure": "ribs",
  "dynamics": "magnetic"
}
```

The field is optional for compatibility. A score with no `primitiveField` preserves current behavior exactly. New candidate generation may populate the field using versioned deterministic policy.

The field is **not exposed as a selector or lock row** in this slice. It is still retained in VisualScore/ResolvedTimeline sidecars and therefore affects score/timeline identity.

Lock semantics remain trustworthy:

- locking `topology` also freezes the parent `primitiveField.structure`;
- locking `motion` also freezes the parent `primitiveField.dynamics`;
- other locks keep their current meaning.

This lets invisible ingredients increase variety without secretly violating a broad user lock.

## Generation
Introduce a versioned primitive-field generation policy with domain-separated PRNG input derived only from canonical generation evidence such as root seed, parent score reference, slot, attempt, and lock set. No renderer-only randomness is allowed.

Normal six-up generation should prefer coverage rather than uniform randomness:

- sibling candidates should not all receive the same primitive pair when lawful alternatives exist;
- common/neutral primitives remain frequent enough that ordinary generation does not become permanent STOMP mode;
- rare/strong primitives have non-zero ordinary probability;
- the existing risky-hybrid/crazy slot remains allowed to reach farther into the primitive tails;
- descendant generation may inherit or break primitive state according to its slot role and locks.

Extend visible-semantic distance so structure and field-dynamics breaks count as real visual differences. Candidate deduplication must therefore recognize a primitive-field difference rather than treating two materially different creatures as identical merely because their broad axes match.

## Renderer architecture
Add a focused primitive compiler seam rather than inflating the existing topology enum.

Production order is conceptually:

```text
base waveform/topology
  -> structure primitive
  -> field-dynamics primitive
  -> canonical motion response
  -> camera
  -> palette/material
  -> atmosphere
  -> lyrics
```

Structure and dynamics act on the internal visual field before camera motion so the new vocabulary increases internal response rather than merely shaking the frame harder.

Each primitive has a stable compiler ID. The renderer compiles only the primitive plan already accepted in the score/timeline; it never chooses a primitive at render time. Preview and final render consume the same accepted plan.

Prefer compositions made from existing FFmpeg operations and the current bounded field envelope. The initial implementation should avoid bespoke shader/runtime dependencies.

## Toaster Lab boundary
Do not make old Lab enums authoritative and do not widen the importer to execute arbitrary proposal strings. The Lab names are design-source vocabulary only unless a future adapter explicitly translates a proposal into a valid current Haunted Toaster primitive under current validation.

## Compatibility and artifact impact
- Legacy scores with no `primitiveField` remain byte-semantically compatible and render with the current behavior.
- New primitive-bearing scores have new score addresses and ResolvedTimeline hashes by design.
- Sidecars expose the accepted primitive field and compiler identities.
- No package/release bump is part of this slice unless separately requested.
- No new runtime dependency.
- Existing lyric timing, atmosphere authority, Possession Arc, cancellation, muxing, and receipt laws remain regression constraints.

## Proof
Add executable proof for:

- legacy score parsing and rendering with the field absent;
- validation of every registered structure and dynamics value;
- same seed/parent/locks producing identical primitive choices and hashes;
- topology and motion locks freezing their corresponding hidden primitive domain;
- sibling coverage/deduplication recognizing primitive differences;
- all initial primitive compiler IDs reaching production filter evidence;
- preview/final render sharing accepted primitive semantics;
- smoke render coverage for representative cross-products such as `spiral + ribs + magnetic`, `circle + facets + wave`, `quad-mirror + lattice + seismic`, and `linear + branches + swarm`;
- no use of wall clock, `Math.random()`, or renderer-only state in primitive selection.
