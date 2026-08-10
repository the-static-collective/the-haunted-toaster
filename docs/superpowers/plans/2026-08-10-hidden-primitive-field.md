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

- [ ] Write failing compatibility/validation tests for legacy absence, valid primitive values, malformed objects, and unknown identifiers.
- [ ] Run `node --test src/full-measure/tests/primitive-field.test.cjs` and verify RED.
- [ ] Implement the compatibility wrapper using `atmosphere-score.cjs` as the delegated core parser.
- [ ] Re-run the focused test and verify GREEN.
- [ ] Commit `Add optional hidden primitive score field`.

### Task 2: Deterministic primitive generation and replay

**Files:**
- Create: `src/full-measure/src/generation/primitive-field-generation.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Modify: `src/full-measure/src/generation/visible-distance.cjs`
- Test: `src/full-measure/tests/primitive-field.test.cjs`

**Interfaces:**
- Produces public overrides `generateCandidateSet`, `replayCandidateFamily`, `resolve`, `createVisualScore`, `replaceFinalCandidateWithConverge`.
- Exposes `PRIMITIVE_FIELD_POLICY = "primitive-field-coverage-v1"` and stable compiler identity helpers.

- [ ] Add failing determinism, coverage, topology-lock, motion-lock, replay, and primitive-distance tests.
- [ ] Run the focused test and verify RED.
- [ ] Wrap `possession-arc.cjs` generation, derive primitive choices only from canonical seed/parent/slot/role/lock evidence, rebuild score artifacts, resolve through Atmosphere, and re-apply Possession Arc.
- [ ] Add `primitiveStructure` and `primitiveDynamics` categorical distance fields with weight `4` each and matching coverage counters.
- [ ] Run primitive, candidate-family, diversity, possession-arc, and atmosphere tests.
- [ ] Commit `Generate deterministic hidden primitive fields`.

### Task 3: Production primitive compiler before Atmosphere

**Files:**
- Create: `src/full-measure/src/render/primitive-field.cjs`
- Modify: `src/full-measure/src/render/haunted-typography-render.cjs`
- Test: `src/full-measure/tests/primitive-field.test.cjs`
- Test: `src/full-measure/tests/timeline-render-filter.test.cjs`

**Interfaces:**
- Produces `applyPrimitiveFieldToGraph({ graph, timeline, width, height }) -> { graph, evidence }`.
- Consumes canonical timeline primitive values/compiler identities and rejects mismatches.

- [ ] Add failing renderer-seam tests proving legacy graph no-op and primitive-bearing rewrite/evidence.
- [ ] Run focused renderer tests and verify RED.
- [ ] Register structure compilers `structure-scope-v1`, `structure-ribs-v1`, `structure-lattice-v1`, `structure-facets-v1`, `structure-torus-v1`, `structure-folds-v1`, `structure-voxels-v1`, `structure-branches-v1` using existing FFmpeg filters only.
- [ ] Register dynamics compilers `dynamics-inertial-v1`, `dynamics-wave-v1`, `dynamics-orbital-decay-v1`, `dynamics-snap-v1`, `dynamics-oscillation-v1`, `dynamics-seismic-v1`, `dynamics-magnetic-v1`, `dynamics-swarm-v1`, `dynamics-whip-v1`, `dynamics-advect-v1`.
- [ ] Insert primitive compilation in `buildHauntedFilterGraph()` before Atmosphere using the canonical `[spectral][waveFull]overlay=0:0:shortest=1[stage0]` consumer seam.
- [ ] Run primitive, timeline-filter, internal-response, and atmosphere tests.
- [ ] Commit `Compile hidden primitive field in production renderer`.

### Task 4: Full proof and artifact audit

**Files:**
- No planned source changes. If proof exposes a defect, edit only the failing feature file and its focused regression test.

- [ ] Run `npm run verify`.
- [ ] Run `npm --prefix src/full-measure test`.
- [ ] Run `npm --prefix src/full-measure run smoke`.
- [ ] Confirm no package/version/dependency change; legacy absence preserves prior behavior/address; primitive sidecars contain primitive/compiler evidence; preview/final consume the same timeline semantics; no renderer-only entropy exists.
- [ ] If proof required a concrete repair, commit only those changed feature/test files with `Prove hidden primitive field compatibility`; otherwise create no empty proof commit.
