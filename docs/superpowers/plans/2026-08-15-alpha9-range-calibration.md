# Alpha.9 Range Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make alpha.9 six-up choices expose and cover base creature identity, make Cathedral Fan visually distinct from Spiral, and restore dynamic headroom so STOMP/MADD CLOWN spans restrained through absurd without lowering the ceiling.

**Architecture:** Keep alpha.9 authority and replay contracts intact. Extend Mutation Lattice selection/evidence with deterministic base-identity coverage, revise only the raster-4 Cathedral Fan source geometry, version response shaping so visual-language-v2 remains unchanged, and add a raster-4-only STOMP contour that selects existing lawful pool candidates by semantic role plus target intensity rather than rewriting scores after selection.

**Tech Stack:** Node.js/CommonJS, `node:test`, deterministic VisualScore/ResolvedTimeline generation, FFmpeg filter graph compilation, Electron renderer UI, GitHub Actions browser witness.

## Global Constraints

- Parent stack: `fix/magnetic-crop-invariant` / PR #134 on the alpha.9 line.
- No tag, release, promotion, or main-branch merge.
- Preserve visual-language-v1/v2 replay semantics exactly.
- No unseeded randomness or hidden renderer-only creative state.
- Keep MADD CLOWN delegated to seeded STOMP.
- Preserve 1.0 as a reachable maximum; do not globally cap intensity.
- UI creative identity must come through authoritative candidate data, never inferred from DOM labels.

---

### Task 1: Record RED contract for base identity, Cathedral Fan, response headroom, and STOMP contour

**Files:**
- Modify: `src/full-measure/tests/alpha9-mutation-lattice.test.cjs`
- Modify: `src/full-measure/tests/candidate-preview.test.cjs`
- Modify: `src/full-measure/tests/alpha9-render-proof.test.cjs`
- Modify: `src/full-measure/tests/internal-response.test.cjs`
- Modify: `src/full-measure/tests/stomp-generation.test.cjs`

**Interfaces:**
- Consumes: current raster-4 Mutation Lattice, Shape Pack, candidate preview, response shaping, STOMP APIs.
- Produces: failing executable assertions for the new #136 contract.

- [ ] Add a lattice assertion that raster-4 coverage records distinct `(topology, structure, dynamics)` base identities and separate structure/dynamics counts.
- [ ] Add a candidate-preview assertion that raster-4 signature metadata exposes topology, primitive structure, and primitive dynamics.
- [ ] Add a Cathedral Fan compiler assertion proving its graph does not contain `mode=polar` while Spiral still does.
- [ ] Add v3 response assertions showing 0.25/0.5/0.75 remain near their source values while 0 and 1 remain exact, and keep the existing v2 lift assertions unchanged.
- [ ] Add raster-4 STOMP assertions that candidates carry deterministic contour evidence, include a restrained semantic mutant, and still preserve semantic distance/replay.
- [ ] Push the tests-only commit and verify GitHub Actions fails for the intended assertions while prior tests remain green.

### Task 2: Base-diverse Mutation Lattice and truthful six-up metadata

**Files:**
- Modify: `src/full-measure/src/generation/mutation-lattice-generation.cjs`
- Modify: `src/full-measure/src/render/candidate-preview.cjs`
- Modify: `src/full-measure/src/renderer/candidate-ui.js`

**Interfaces:**
- Produces: `baseIdentity`, deterministic coverage counts, and preview metadata sourced from candidate authority.

- [ ] Define a canonical base identity from topology + Primitive Field structure + dynamics.
- [ ] Prefer missing base identity, then missing structure/dynamics/topology, before secondary cross-layer/Toast Feel merit in raster-4 pool selection.
- [ ] Record base-identity/structure/dynamics counts in Mutation Lattice coverage and preserve exact-key/hash validation.
- [ ] Extend preview plans with authoritative base identity fields and render a compact `topology · structure / dynamics` line on each six-up card.
- [ ] Keep legacy profile preview signature behavior compatible.
- [ ] Run focused tests and full verification.

### Task 3: Give Cathedral Fan its own geometry

**Files:**
- Modify: `src/full-measure/src/render/topology-compilers.cjs`

**Interfaces:**
- Consumes: raster-4 topology context and field envelope.
- Produces: `cathedral-fan-v3` with a non-polar rib/blade source and negative-space fan composition.

- [ ] Replace Cathedral Fan's polar vectorscope source with a Cartesian/lissajous narrow-source composition.
- [ ] Preserve compiler id, field envelope policy, topology-arc namespacing, and deterministic parameters.
- [ ] Prove FFmpeg frames still compile for all Shape Pack topologies.

### Task 4: Restore v3 headroom without rewriting v2

**Files:**
- Modify: `src/full-measure/src/render/response-shaping.cjs`
- Modify raster-4 consumers that currently call `effectiveInternalEnergy` without policy distinction.

**Interfaces:**
- Produces: legacy v2 shaping unchanged plus a v3 shaping function that preserves midrange/headroom.

- [ ] Keep `effectiveInternalEnergy()` as the existing visual-language-v2 function.
- [ ] Add an explicit v3 response function with exact 0/1 endpoints and approximately identity-like midrange response.
- [ ] Route visual-language-v3 consumers to v3 shaping while visual-language-v2 stays on the prior curve.
- [ ] Verify legacy v2 numeric graph assertions remain unchanged.

### Task 5: STOMP contour selection for raster-4

**Files:**
- Modify: `src/full-measure/src/generation/stomp-generation.cjs`

**Interfaces:**
- Produces: deterministic per-role `intensityTarget`/`intensityObserved` evidence for raster-4 STOMP selection.

- [ ] Define one deterministic scalar intensity projection from existing score numeric axes.
- [ ] Assign ordered target bands across the six STOMP roles from restrained mutant through rail-rider peak.
- [ ] For raster-4 only, rank eligible candidates by semantic role first, then closeness to the role intensity target, then visible distance, then deterministic tie.
- [ ] Do not mutate selected scores after authority is created.
- [ ] Preserve legacy raster-3 STOMP selection unchanged.
- [ ] Verify MADD CLOWN remains seeded STOMP through existing Toast Feel tests.

### Task 6: Verify UI and publish reviewable stack

**Files:**
- Update reviewed UI witness baselines only if the intended card metadata produces a visual delta.

- [ ] Run GitHub Actions `npm run verify` gate.
- [ ] Run browser witness and inspect any changed screenshots before baseline promotion.
- [ ] Confirm packaged Electron proof is `not-required` unless bridge/native behavior changed.
- [ ] Open a draft/ready PR stacked on `fix/magnetic-crop-invariant`, linking `Closes #136` only after the implementation fully satisfies the issue.
- [ ] Record exact RED/GREEN run ids, current head SHA, checks, UI disposition, and remaining field-test request.
- [ ] Mirror the design/field finding into GitBook as a non-authoritative project-backed note linked to GitHub authority.
