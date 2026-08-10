# Hidden Primitive Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic hidden structure and field-dynamics primitives, derived from Toaster Lab vocabulary, as replayable VisualScore/ResolvedTimeline evidence and production renderer behavior without adding user-facing selectors.

**Architecture:** Follow the existing Atmosphere wrapper pattern instead of widening the legacy core schema in place. Add `primitive-field-score.cjs` and `primitive-field-generation.cjs` as compatibility wrappers around the current Atmosphere/Possession Arc stack, export them last from `generation/index.cjs`, and add a focused renderer compiler inserted between the canonical waveform/topology output and Atmosphere. Primitive-bearing scores opt in; scores without `primitiveField` retain existing hashes and render semantics.

**Tech Stack:** Node.js CommonJS, deterministic canonical JSON/SHA-256 addressing, existing seeded PRNG, FFmpeg filter graphs, Node test runner.

## Global Constraints

- Toaster Lab vocabulary is source material only; Haunted Toaster remains execution authority.
- No hidden entropy: no `Math.random()`, `Date.now()`, wall-clock, ambient process state, or renderer-only choices.
- Existing topology and motion locks are absolute: topology also freezes hidden structure; motion also freezes hidden dynamics.
- Primitive choices remain invisible in ordinary UI controls but inspectable in retained score/timeline artifacts.
- Legacy scores with no `primitiveField` retain existing behavior and addresses.
- No new runtime dependency and no version/release bump.
- Preview/final render must consume the same accepted primitive semantics.

---

### Task 1: Optional primitive score compatibility boundary

**Files:**
- Create: `src/full-measure/src/generation/primitive-field-score.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Test: `src/full-measure/tests/primitive-field.test.cjs`

**Interfaces:**
- Produces `STRUCTURE_PRIMITIVES`, `FIELD_DYNAMICS`, `hasPrimitiveField(score)`, `stripPrimitiveField(score)`, `parseVisualScore(input)`, `scoreWithinConstraints(score,constraints)`.
- `primitiveField` shape is exactly `{ structure, dynamics }`.

- [ ] **Step 1: Write failing compatibility/validation tests**

```js
assert.equal(generation.parseVisualScore(legacyScore).ok, true);
assert.equal(generation.addressVisualScore(legacyScore), legacyAddress);

const parsed = generation.parseVisualScore({
  ...legacyScore,
  primitiveField: { structure: "ribs", dynamics: "magnetic" },
});
assert.equal(parsed.ok, true);
assert.equal(parsed.value.primitiveField.structure, "ribs");
assert.equal(parsed.value.primitiveField.dynamics, "magnetic");

assert.equal(generation.parseVisualScore({
  ...legacyScore,
  primitiveField: { structure: "not-real", dynamics: "magnetic" },
}).ok, false);
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test src/full-measure/tests/primitive-field.test.cjs`
Expected: FAIL because primitive-field exports do not exist and current score parsing rejects `primitiveField`.

- [ ] **Step 3: Implement the wrapper**

Define:

```js
const STRUCTURE_PRIMITIVES = Object.freeze([
  "scope", "ribs", "lattice", "facets", "torus", "folds", "voxels", "branches",
]);
const FIELD_DYNAMICS = Object.freeze([
  "inertial", "wave", "orbital-decay", "snap", "oscillation",
  "seismic", "magnetic", "swarm", "whip", "advect",
]);
```

Parse JSON exactly as `atmosphere-score.cjs` does, strip `primitiveField`, delegate the core document to `atmosphere-score.cjs`, validate exactly two primitive keys, then rebuild canonical value without inserting a field when it was absent. Export the wrapper after existing generation modules in `generation/index.cjs` so public parsing accepts the optional field while legacy direct modules remain untouched.

- [ ] **Step 4: Run the focused test**

Run: `node --test src/full-measure/tests/primitive-field.test.cjs`
Expected: PASS for legacy absence, valid values, malformed object, unknown structure, and unknown dynamics.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/generation/primitive-field-score.cjs src/full-measure/src/generation/index.cjs src/full-measure/tests/primitive-field.test.cjs
git commit -m "Add optional hidden primitive score field"
```

### Task 2: Deterministic primitive generation and replay

**Files:**
- Create: `src/full-measure/src/generation/primitive-field-generation.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Modify: `src/full-measure/src/generation/visible-distance.cjs`
- Test: `src/full-measure/tests/primitive-field.test.cjs`

**Interfaces:**
- Produces public overrides `generateCandidateSet`, `replayCandidateFamily`, `resolve`, `createVisualScore`, `replaceFinalCandidateWithConverge`.
- Exposes `PRIMITIVE_FIELD_POLICY = "primitive-field-coverage-v1"` and compiler identity helpers.

- [ ] **Step 1: Add failing determinism, coverage, lock, and distance tests**

```js
const first = generation.generateCandidateSet(options);
const replay = generation.replayCandidateFamily(first, replayOptions);
assert.equal(replay.ok, true);
assert.ok(first.candidates.every((candidate) => candidate.scoreArtifact.score.primitiveField));

const topologyLocked = generation.generateCandidateSet({
  ...options,
  parentScore: first.candidates[0].scoreArtifact.score,
  locks: ["topology"],
  phase: "branch",
});
assert.ok(topologyLocked.candidates.every((candidate) =>
  candidate.scoreArtifact.score.primitiveField.structure ===
  first.candidates[0].scoreArtifact.score.primitiveField.structure));

const motionLocked = generation.generateCandidateSet({
  ...options,
  parentScore: first.candidates[0].scoreArtifact.score,
  locks: ["motion"],
  phase: "branch",
});
assert.ok(motionLocked.candidates.every((candidate) =>
  candidate.scoreArtifact.score.primitiveField.dynamics ===
  first.candidates[0].scoreArtifact.score.primitiveField.dynamics));
```

Also prove `visibleSemanticDistance()` increases when only structure or dynamics differs.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test src/full-measure/tests/primitive-field.test.cjs`
Expected: FAIL because candidate decoration, primitive-aware distance, and replay are absent.

- [ ] **Step 3: Implement deterministic coverage wrapper**

Wrap `possession-arc.cjs` generation rather than bypassing it. Use only canonical seed inputs:

```js
hashCanonical({
  rootSeed: String(rootSeed),
  parentScoreRef,
  candidateScoreRef,
  slotIndex,
  role,
  locks,
}, "HauntedToaster-PrimitiveField-v1")
```

Role policy:
- `anchor` / near-parent: inherit parent primitives, or `scope + inertial` on first generation.
- motion-oriented roles: preserve/inherit structure and choose deterministic non-parent dynamics.
- topology-composition roles: choose deterministic non-parent structure and preserve/inherit dynamics.
- mixed/frontier roles: choose both domains.
- `risky-hybrid`: draw from the rare tail (`branches`, `torus`, `voxels`, `lattice`) × (`magnetic`, `swarm`, `whip`, `seismic`, `snap`).

Rebuild score artifacts, re-resolve through Atmosphere, then re-apply Possession Arc so timeline authority includes `primitiveField` before production rendering. Record `primitiveField`, policy ID, structure compiler ID, and dynamics compiler ID in canonical timeline evidence.

- [ ] **Step 4: Make visible distance primitive-aware**

Add two categorical fields in `visible-distance.cjs` with bounded weights:

```js
{ key: "primitiveStructure", weight: 4, read: (score) => score.primitiveField?.structure || "scope" },
{ key: "primitiveDynamics", weight: 4, read: (score) => score.primitiveField?.dynamics || "inertial" },
```

Extend `categoricalCoverage()` with matching keys. Do not add these to the user lock row.

- [ ] **Step 5: Run focused and existing generation tests**

Run:
```bash
node --test src/full-measure/tests/primitive-field.test.cjs
node --test src/full-measure/tests/candidate-family.test.cjs src/full-measure/tests/diversity-engine.test.cjs src/full-measure/tests/possession-arc.test.cjs src/full-measure/tests/atmosphere.test.cjs
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/generation/primitive-field-generation.cjs src/full-measure/src/generation/index.cjs src/full-measure/src/generation/visible-distance.cjs src/full-measure/tests/primitive-field.test.cjs
git commit -m "Generate deterministic hidden primitive fields"
```

### Task 3: Production primitive compiler before Atmosphere

**Files:**
- Create: `src/full-measure/src/render/primitive-field.cjs`
- Modify: `src/full-measure/src/render/haunted-typography-render.cjs`
- Test: `src/full-measure/tests/primitive-field.test.cjs`
- Test: `src/full-measure/tests/timeline-render-filter.test.cjs`

**Interfaces:**
- Produces `applyPrimitiveFieldToGraph({ graph, timeline, width, height }) -> { graph, evidence }`.
- Consumes canonical timeline `primitiveField` compiler identities and rejects mismatches.

- [ ] **Step 1: Add failing renderer seam tests**

```js
const legacy = applyPrimitiveFieldToGraph({ graph, timeline: legacyTimeline, width: 1920, height: 1080 });
assert.equal(legacy.graph, graph);
assert.equal(legacy.evidence, null);

const compiled = applyPrimitiveFieldToGraph({ graph, timeline: ribsMagneticTimeline, width: 1920, height: 1080 });
assert.match(compiled.graph, /primitiveStructure/);
assert.match(compiled.graph, /primitiveField/);
assert.equal(compiled.evidence.structure.compiler, "structure-ribs-v1");
assert.equal(compiled.evidence.dynamics.compiler, "dynamics-magnetic-v1");
```

- [ ] **Step 2: Run focused renderer tests and confirm failure**

Run: `node --test src/full-measure/tests/primitive-field.test.cjs src/full-measure/tests/timeline-render-filter.test.cjs`
Expected: FAIL because the compiler seam does not exist.

- [ ] **Step 3: Implement structure compilers using existing FFmpeg primitives**

Register stable compiler IDs `structure-scope-v1`, `structure-ribs-v1`, `structure-lattice-v1`, `structure-facets-v1`, `structure-torus-v1`, `structure-folds-v1`, `structure-voxels-v1`, and `structure-branches-v1`. Use only existing filters (`split`, `overlay`, `hflip`, `vflip`, `rotate`, `scale`, `crop`, `pad`) and full-frame transparent RGBA. Target the current canonical consumer seam:

```text
[spectral][waveFull]overlay=0:0:shortest=1[stage0]
```

Replace it with structure/dynamics compilation that still yields one full-frame primitive label, then feed that into the same overlay.

- [ ] **Step 4: Implement dynamics compilers**

Register `dynamics-inertial-v1`, `dynamics-wave-v1`, `dynamics-orbital-decay-v1`, `dynamics-snap-v1`, `dynamics-oscillation-v1`, `dynamics-seismic-v1`, `dynamics-magnetic-v1`, `dynamics-swarm-v1`, `dynamics-whip-v1`, and `dynamics-advect-v1`. Keep all expressions deterministic functions of `t`, accepted dimensions, and accepted primitive identity. Do not read audio or UI state inside this renderer module.

- [ ] **Step 5: Insert primitive compilation before Atmosphere**

In `buildHauntedFilterGraph()`, apply primitive compilation to `baseFilter.graph`, then pass that graph to `applyAtmosphereToGraph()`. Return `primitiveFieldEvidence` alongside `atmosphereEvidence`.

- [ ] **Step 6: Run focused render tests**

Run:
```bash
node --test src/full-measure/tests/primitive-field.test.cjs src/full-measure/tests/timeline-render-filter.test.cjs src/full-measure/tests/internal-response.test.cjs src/full-measure/tests/atmosphere.test.cjs
```
Expected: PASS, including legacy no-op and representative cross-products.

- [ ] **Step 7: Commit**

```bash
git add src/full-measure/src/render/primitive-field.cjs src/full-measure/src/render/haunted-typography-render.cjs src/full-measure/tests/primitive-field.test.cjs src/full-measure/tests/timeline-render-filter.test.cjs
git commit -m "Compile hidden primitive field in production renderer"
```

### Task 4: Full proof and artifact audit

**Files:**
- No planned source changes. If proof exposes a defect, edit only the failing feature file and its focused regression test.

- [ ] **Step 1: Run repository verification**

Run: `npm run verify`
Expected: PASS.

- [ ] **Step 2: Run application test suite**

Run: `npm --prefix src/full-measure test`
Expected: PASS.

- [ ] **Step 3: Run smoke path**

Run: `npm --prefix src/full-measure run smoke`
Expected: PASS with primitive-bearing representative candidate/render coverage.

- [ ] **Step 4: Audit compatibility/artifacts**

Confirm no package/version/dependency change; legacy score absence keeps prior address and graph semantics; primitive score/timeline sidecars contain selected primitive and compiler identities; preview/final render consume the same timeline evidence; and no renderer-only random source exists.

- [ ] **Step 5: Commit only if proof required a concrete fix**

If a proof failure required edits, stage exactly the feature/test files changed in that repair and commit them with:

```bash
git commit -m "Prove hidden primitive field compatibility"
```

If proof is already green, do not create an empty proof commit.
