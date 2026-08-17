# Elastic Topology Response Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore music-responsive topology breathing and mutation in visual-language-v3 while preserving alpha.9 headroom so intense songs can reach full-frame climax without collapsing into sustained white/full-field saturation.

**Architecture:** Keep PR #137's identity-like macro response untouched. Derive a separate canonical local-response witness from existing ~1 Hz RMS evidence, attach a deterministic `nestedResponse` plan to raster-4 timelines, then let the pinned v3 renderer map that plan into topology-specific articulation channels. Extent uses a soft occupancy knee and sustained-high shedding; excess pressure is redirected into deformation, openness, travel, phase, recoil, and Primitive Field movement. Bounded-field geometry remains safety authority, not expressive authority.

**Tech Stack:** Node.js/CommonJS, `node:test`, canonical JSON/SHA-256 timeline evidence, deterministic raster-4 VisualScore/ResolvedTimeline generation, FFmpeg filter graphs, Electron candidate preview/final render shared compiler path.

## Global Constraints

- Parent line is PR #139 on top of PR #137 / `fix/alpha9-range-calibration`.
- Preserve `effectiveInternalEnergyV3()` as identity-like clamped response; do not restore the old v2 midrange lift.
- Preserve exact `0` and `1` endpoints and keep `1.0` reachable.
- Full-frame topology is legal as a bounded climax; sustained high energy must not remain pinned there.
- **Area saturates. Expression does not.**
- Keep `resolveFieldEnvelope()` as safety geometry. Do not turn the envelope into a second creative authority.
- Nested response is canonical timeline evidence; preview and final render consume the same accepted plan.
- Do not spend ordinary patch entropy or increase Possession Arc / Topology Arc budgets for local response.
- True silence records zero signal-driven excursion. Any idle motion is separately declared and bounded.
- Approximate local windows are `micro` / `measure-scale`; never claim beat or meter authority in this slice.
- Preserve visual-language-v1/v2 replay semantics exactly.
- Preserve current good Linear behavior as a positive regression witness; do not force a new generic wobble onto Linear.
- No new random source, Toast Feel vocabulary, cloud analysis, tag, release, or promotion.

---

## File Structure

### New generation units

- `src/full-measure/src/generation/nested-response.cjs`
  - Owns `ResponseWitnessV1`, `NestedResponseContourV1`, deterministic smoothing/hysteresis/arc commitment, granularity, hashes, and timeline attachment.
- `src/full-measure/tests/nested-response-contour.test.cjs`
  - Pure RED/GREEN contract for witness derivation, signed contour, silence, anti-jitter, determinism, and unchanged patch accounting.

### New renderer unit

- `src/full-measure/src/render/topology-response.cjs`
  - Converts accepted `timeline.nestedResponse` into deterministic v3 render channels and FFmpeg piecewise expressions.
  - Owns soft occupancy knee, sustained-high shedding, topology-aware idle floors, and compact compiler evidence.
- `src/full-measure/tests/topology-response.test.cjs`
  - Pure tests for area saturation, full-frame reachability, shedding, excess-pressure routing, idle/signal separation, and expression generation.

### Existing integration units

- `src/full-measure/src/generation/index.cjs`
  - Export the new canonical response helpers.
- `src/full-measure/src/candidate-session.cjs`
  - Preserve real media `energySamples` as a separate response witness and pass it into raster-4 generation/replay.
- `src/full-measure/src/generation/mutation-lattice-generation.cjs`
  - Attach `nestedResponse` before Topology Arc and keep resulting timeline/family hashes authoritative.
- `src/full-measure/src/render/topology-compilers.cjs`
  - Consume render-response expressions in raster-4 only; preserve v1/v2 compiler behavior.
- `src/full-measure/src/render/primitive-field.cjs`
  - Modulate continuous Primitive Field displacement using the same accepted response plan without changing categorical structure/dynamics identity.
- `src/full-measure/src/render/timeline-filter.cjs`
  - Propagate compact nested-response compiler evidence into the production compiler result.
- `src/full-measure/src/render/render.cjs`
  - Add that compact evidence to `render.visualCompiler`; no new receipt authority.

### Existing regression/proof tests

- `src/full-measure/tests/internal-response.test.cjs`
  - Preserve v2/v3 numeric headroom contract.
- `src/full-measure/tests/alpha9-render-proof.test.cjs`
  - FFmpeg frame proof for responsive Shape Pack compilers, preview/final plan parity, bounded compositing, and dense-pressure anti-whiteout mechanics.
- `src/full-measure/tests/alpha9-range-calibration.test.cjs`
  - Keep PR #137 calibration behavior green.
- `src/full-measure/tests/alpha9-evidence-proof.test.cjs`
  - Extend compact evidence assertions if this is the existing receipt/compiler evidence fixture seam.

---

### Task 1: Canonical local-response witness and nested contour

**Files:**
- Create: `src/full-measure/src/generation/nested-response.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Create: `src/full-measure/tests/nested-response-contour.test.cjs`

**Interfaces:**
- Produces:
  - `RESPONSE_WITNESS_POLICY = "response-witness-v1"`
  - `NESTED_RESPONSE_POLICY = "nested-response-contour-v1"`
  - `IDLE_MOTION_POLICY = "topology-idle-v1"`
  - `deriveResponseWitness({ energySamples, sections, durationSeconds }) -> ResponseWitnessV1`
  - `resolveNestedResponse({ responseWitness, score, timeline }) -> NestedResponseContourV1`
  - `attachNestedResponse(timeline, { responseWitness, score }) -> ResolvedTimeline`
- Consumes existing canonical helpers from `generation/canonical.cjs`; does not mutate `AudioAnalysis v1` validation.

- [ ] **Step 1: Write RED fixtures for signed local contour and deterministic witness identity**

Create a single-section fixture whose dB observations visibly encode `rise -> settle -> recoil -> rise`:

```js
const energySamples = [
  { time: 0, db: -28 },
  { time: 1, db: -25 },
  { time: 2, db: -21 },
  { time: 3, db: -20 },
  { time: 4, db: -21 },
  { time: 5, db: -26 },
  { time: 6, db: -29 },
  { time: 7, db: -24 },
  { time: 8, db: -20 },
];
const sections = [{ startSeconds: 0, endSeconds: 9, energy: 0.5, label: "Steady" }];
```

Assert two calls to `deriveResponseWitness()` are deep-equal and have identical `witnessSha256`. Resolve with a `phrase` score and assert ordered nonzero directions contain positive, neutral/settled, negative/recoil, then positive values without increasing ordinary timeline patches.

- [ ] **Step 2: Run the new test and prove the contract is RED**

Run from `src/full-measure`:

```bash
node --test tests/nested-response-contour.test.cjs
```

Expected: FAIL because `deriveResponseWitness`, `resolveNestedResponse`, and `attachNestedResponse` are not exported.

- [ ] **Step 3: Implement versioned witness normalization and smoothing**

Use raw measured RMS dB directly; do not depend on renderer-local state. Normalize with a p10/p90 span and a minimum 6 dB denominator, then apply a deterministic radius-1 moving average.

Core shape:

```js
function deriveResponseWitness({ energySamples = [], sections = [], durationSeconds }) {
  const samples = normalizeDbSamples(energySamples); // [{time, energy}]
  const smoothed = movingAverage(samples.map((item) => item.energy), 1);
  const knots = samples.map((sample, index) => {
    const sectionIndex = sectionIndexAt(sample.time, sections);
    const sectionSamples = samples.filter((item) => sectionIndexAt(item.time, sections) === sectionIndex);
    const localCenter = average(sectionSamples.map((item) => item.energy));
    const prior = index ? smoothed[index - 1] : smoothed[index];
    return {
      atSeconds: quantize(sample.time),
      sectionIndex,
      localEnergy: quantize(sample.energy),
      smoothedEnergy: quantize(smoothed[index]),
      localCenter: quantize(localCenter),
      excursion: quantize(smoothed[index] - localCenter),
      slope: quantize(smoothed[index] - prior),
    };
  });
  const core = {
    policyVersion: RESPONSE_WITNESS_POLICY,
    durationSeconds: quantize(durationSeconds),
    sampleCount: knots.length,
    knots,
  };
  return deepFreeze({ ...core, witnessSha256: hashCanonical(core, "HauntedToaster-ResponseWitness-v1") });
}
```

Reject unsorted sample times and non-finite dB values except the existing `-120` silence sentinel.

- [ ] **Step 4: Implement granularity, hysteresis, and arc commitment in `resolveNestedResponse()`**

Use the accepted score's `temporalDensity` as a ceiling:

```text
frozen    -> no signal contour knots; idle policy only
section   -> section centers/boundaries only
phrase    -> reduce witness to roughly 3-5 second local knots
transient -> preserve the finest lawful witness cadence
```

Do not invent `phrases` or `transients` in `AudioAnalysis`. The nested-response plan carries its own `granularity` field.

Direction rules:

```js
const HYSTERESIS = 0.04;
const ARC_COMMIT_SAMPLES = 2;

function signedDirection(slope, priorDirection, committedSamples) {
  if (Math.abs(slope) < HYSTERESIS) return 0;
  const proposed = slope > 0 ? 1 : -1;
  if (priorDirection && proposed !== priorDirection && committedSamples < ARC_COMMIT_SAMPLES) {
    return priorDirection;
  }
  return proposed;
}
```

Each plan knot records at minimum:

```js
{
  atTick,
  sectionIndex,
  macroEnergy,
  localEnergy,
  excursion,
  slope,
  direction // -1, 0, +1
}
```

The plan object records `policyVersion`, `granularity`, `knotCount`, `meterEvidenceUsed: false`, `idleMotionPolicyVersion`, `sourceWitnessSha256`, and `planSha256`.

- [ ] **Step 5: Implement timeline attachment without touching patch accounting**

Follow `attachTopologyArc()`'s canonical rehash pattern:

```js
function attachNestedResponse(timelineInput, { responseWitness, score } = {}) {
  if (timelineInput?.rendererPolicy !== MUTATION_LATTICE_RENDERER_POLICY) return timelineInput;
  const nestedResponse = resolveNestedResponse({ responseWitness, score, timeline: timelineInput });
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    nestedResponse: _nestedResponse,
    ...baseBody
  } = timelineInput;
  const body = { ...structuredClone(baseBody), nestedResponse };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({ ...body, timelineHash, canonicalJson: canonicalStringify(body) });
}
```

Assert `timeline.accounting.patchCount` and `entropySpent` remain byte-for-byte unchanged before/after attachment.

- [ ] **Step 6: Add silence and anti-jitter tests**

Silence fixture: all dB values `-120`; assert every signal knot has `localEnergy === 0`, `excursion === 0`, and `direction === 0` while `idleMotionPolicyVersion` remains present.

Anti-jitter fixture: alternate tiny normalized deviations around one center; assert direction does not flip on every sample. Then add a sustained larger change and assert it does cross the hysteresis threshold.

- [ ] **Step 7: Run focused tests GREEN and commit**

```bash
node --test tests/nested-response-contour.test.cjs
node --test tests/internal-response.test.cjs

git add src/full-measure/src/generation/nested-response.cjs \
        src/full-measure/src/generation/index.cjs \
        src/full-measure/tests/nested-response-contour.test.cjs
git commit -m "feat: add canonical nested response contour"
```

---

### Task 2: Carry the real media witness into raster-4 candidate timelines

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Modify: `src/full-measure/src/generation/mutation-lattice-generation.cjs`
- Modify: `src/full-measure/tests/nested-response-contour.test.cjs`
- Modify the existing candidate-session/renderer-contract test that exercises `createCandidateSession()` once located by `rg "createCandidateSession|toGenerationAnalysis" src/full-measure/tests`.

**Interfaces:**
- Consumes `deriveResponseWitness()` and `attachNestedResponse()` from Task 1.
- Adds optional `responseWitness` to raster-4 `generateCandidateSet`, `generateStompCandidateSet`, `replaceFinalCandidateWithConverge`, and replay option objects; legacy generators ignore it.
- Produces candidate timelines whose hash already includes `nestedResponse` before Topology Arc is attached.

- [ ] **Step 1: Add a RED production-adapter test**

Build a media-analysis fixture with real `energySamples`, call `createCandidateSession().noteAudio()`, generate a raster-4 family, and assert every candidate timeline has:

```js
assert.equal(candidate.timeline.nestedResponse.policyVersion, "nested-response-contour-v1");
assert.ok(candidate.timeline.nestedResponse.knotCount > 0);
assert.equal(candidate.timeline.nestedResponse.meterEvidenceUsed, false);
```

Also assert the candidate's ordinary `patchCount` is unchanged relative to resolving the same score without the response attachment.

- [ ] **Step 2: Run the adapter test RED**

```bash
node --test tests/nested-response-contour.test.cjs
```

Expected: FAIL because candidate generation currently discards `mediaAnalysis.energySamples` after section extraction.

- [ ] **Step 3: Derive one response witness beside `toGenerationAnalysis()`**

Add a helper in `candidate-session.cjs`:

```js
function responseWitnessFor(mediaAnalysis) {
  return generation.deriveResponseWitness({
    energySamples: mediaAnalysis.energySamples || [],
    sections: toGenerationAnalysis(mediaAnalysis).sections,
    durationSeconds: Number(mediaAnalysis.duration),
  });
}
```

At `generate`, `mutate`, `stomp`, and CONVERGE option construction, compute the generation analysis once and pass both:

```js
const analysis = toGenerationAnalysis(mediaAnalysis);
const responseWitness = responseWitnessFor(mediaAnalysis);

generation.generateCandidateSet({
  analysis,
  responseWitness,
  // existing options unchanged
});
```

No `phrases` or `transients` are synthesized.

- [ ] **Step 4: Attach response before Topology Arc in `mutation-lattice-generation.cjs`**

Inside `attachArcsToFamily()`:

```js
const withResponse = attachNestedResponse(candidate.timeline, {
  responseWitness: options.responseWitness,
  score: candidate.scoreArtifact.score,
});
const timeline = attachTopologyArc(withResponse, {
  analysis: options.analysis,
  score: candidate.scoreArtifact.score,
  constraints,
  locks,
  rootSeed: `${baseFamily.rootSeed}:topology-arc:${candidate.scoreAddress}`,
  toastFeelId: options.toastFeelId || baseFamily.toastFeel?.id || null,
});
```

Import `attachNestedResponse` explicitly. The final family hash continues to derive from the new candidate timeline hashes exactly as it does today.

- [ ] **Step 5: Prove deterministic replay includes the same response plan**

Generate and replay the same raster-4 family with the same `responseWitness`. Assert:

```js
assert.equal(replay.ok, true);
assert.deepEqual(
  replay.replayed.candidates.map((c) => c.timeline.nestedResponse.planSha256),
  family.candidates.map((c) => c.timeline.nestedResponse.planSha256),
);
```

Change one materially different energy sample and assert the response witness/plan hash changes while the score address remains governed by score generation, not renderer improvisation.

- [ ] **Step 6: Run focused tests GREEN and commit**

```bash
node --test tests/nested-response-contour.test.cjs
node --test tests/alpha9-mutation-lattice.test.cjs
node --test tests/alpha9-range-calibration.test.cjs

git add src/full-measure/src/candidate-session.cjs \
        src/full-measure/src/generation/mutation-lattice-generation.cjs \
        src/full-measure/tests
git commit -m "feat: bind local response witness to raster4 timelines"
```

---

### Task 3: Soft occupancy knee and anti-saturation articulation channels

**Files:**
- Create: `src/full-measure/src/render/topology-response.cjs`
- Create: `src/full-measure/tests/topology-response.test.cjs`
- Modify: `src/full-measure/tests/internal-response.test.cjs`

**Interfaces:**
- Produces:
  - `ELASTIC_TOPOLOGY_POLICY = "elastic-topology-response-v1"`
  - `SOFT_OCCUPANCY_KNEE = 0.72`
  - `compileTopologyResponse(timeline, topology) -> { evidence, expressions }`
  - `piecewiseLinearExpression(knots, field, timebase) -> ffmpegExpression`
- `expressions` exposes `extent`, `articulation`, `openness`, `phase`, `recoil`, `travelX`, `travelY`, and `idle` as FFmpeg expressions over `t`.

- [ ] **Step 1: Write RED tests for the core law**

Assert all of the following from pure numeric knot projection:

1. `macroEnergy=0.5` remains materially below peak extent.
2. A rising `macroEnergy=1` knot can reach `extent === 1`.
3. Sustained high knots with small local change shed area after several knots instead of remaining at `1`.
4. The shed pressure appears as increased `articulation`/`openness`, not as discarded energy.
5. A negative local excursion produces nonzero `recoil`.
6. True silence produces zero signal articulation; `idle` is a separate channel.

- [ ] **Step 2: Run RED**

```bash
node --test tests/topology-response.test.cjs
```

Expected: FAIL because the renderer response module does not exist.

- [ ] **Step 3: Implement the soft extent law**

Use a knee that redirects pressure before allowing a true peak to reach full extent:

```js
const SOFT_OCCUPANCY_KNEE = 0.72;

function softExtent(demand) {
  const value = clamp(demand, 0, 1);
  if (value <= SOFT_OCCUPANCY_KNEE) return quantize(value);
  const x = (value - SOFT_OCCUPANCY_KNEE) / (1 - SOFT_OCCUPANCY_KNEE);
  // zero derivative at the knee, exact 1.0 at true peak
  return quantize(SOFT_OCCUPANCY_KNEE + (1 - SOFT_OCCUPANCY_KNEE) * x * x);
}
```

For each accepted response knot:

```js
const demand = clamp(knot.macroEnergy + Math.max(0, knot.excursion) * 0.35, 0, 1);
const rawExtent = softExtent(demand);
const holdCount = demand >= SOFT_OCCUPANCY_KNEE ? priorHoldCount + 1 : 0;
const flatness = 1 - clamp(Math.abs(knot.excursion) * 4, 0, 1);
const shedding = holdCount >= 3
  ? Math.min(0.14, 0.035 * (holdCount - 2)) * flatness
  : 0;
const extent = clamp(rawExtent - shedding, 0, 1);
const redirected = Math.max(0, demand - extent);
const recoil = clamp(Math.max(0, -knot.excursion) * 2 + (knot.direction < 0 ? 0.08 : 0), 0, 1);
const articulation = clamp(Math.abs(knot.excursion) * 1.5 + redirected * 2.2 + shedding * 2.5, 0, 1);
const openness = clamp(articulation * 0.72 + recoil * 0.28, 0, 1);
```

This is not pixel occupancy measurement. It is a deterministic response-pressure policy under the pinned renderer compiler.

- [ ] **Step 4: Add topology-aware idle floors without touching Linear**

Use explicit values recorded only as renderer policy:

```js
const IDLE_FLOOR = Object.freeze({
  linear: 0,
  circle: 0.05,
  "mirrored-ring": 0.05,
  spiral: 0.045,
  "quad-mirror": 0.04,
  "elastic-spine": 0.08,
  "split-horizon": 0.05,
  "cathedral-fan": 0.08,
  "echo-tunnel": 0.055,
});
```

The evidence object must expose `idleMotionPolicyVersion` and `idleFloor` separately from signal channel values.

- [ ] **Step 5: Compile canonical knots into FFmpeg expressions**

Implement deterministic piecewise linear interpolation using only accepted knot values:

```js
function piecewiseLinearExpression(knots, field, timebase) {
  if (!knots.length) return "0";
  let expression = ffmpegNumber(knots.at(-1)[field]);
  for (let index = knots.length - 2; index >= 0; index -= 1) {
    const left = knots[index];
    const right = knots[index + 1];
    const a = left.atTick / timebase;
    const b = right.atTick / timebase;
    const span = Math.max(0.001, b - a);
    const u = `max(0,min(1,(t-${ffmpegNumber(a)})/${ffmpegNumber(span)}))`;
    const segment = `${ffmpegNumber(left[field])}+(${ffmpegNumber(right[field])}-${ffmpegNumber(left[field])})*${u}`;
    expression = `if(lt(t,${ffmpegNumber(b)}),${segment},${expression})`;
  }
  return expression;
}
```

Derive deterministic signed `phase`, `travelX`, and `travelY` from accepted direction/excursion; do not call PRNG or wall clock.

- [ ] **Step 6: Preserve PR #137 response-shaping tests exactly**

Extend `internal-response.test.cjs` to import `effectiveInternalEnergyV3` and explicitly keep:

```js
assert.equal(effectiveInternalEnergyV3(0), 0);
assert.equal(effectiveInternalEnergyV3(0.25), 0.25);
assert.equal(effectiveInternalEnergyV3(0.5), 0.5);
assert.equal(effectiveInternalEnergyV3(0.75), 0.75);
assert.equal(effectiveInternalEnergyV3(1), 1);
```

Do not change `response-shaping.cjs` unless a test reveals an actual regression.

- [ ] **Step 7: Run GREEN and commit**

```bash
node --test tests/topology-response.test.cjs tests/internal-response.test.cjs

git add src/full-measure/src/render/topology-response.cjs \
        src/full-measure/tests/topology-response.test.cjs \
        src/full-measure/tests/internal-response.test.cjs
git commit -m "feat: add elastic topology pressure routing"
```

---

### Task 4: Make raster-4 topologies breathe, recoil, and mutate continuously

**Files:**
- Modify: `src/full-measure/src/render/topology-compilers.cjs`
- Modify: `src/full-measure/tests/alpha9-render-proof.test.cjs`
- Modify: `src/full-measure/tests/topology-response.test.cjs`

**Interfaces:**
- Consumes `compileTopologyResponse(timeline, topology)` from Task 3.
- `topologyContext()` gains `response` only when `rendererPolicy === MUTATION_LATTICE_RENDERER_POLICY` and `timeline.nestedResponse` exists.
- Production return gains `topologyResponse` compact evidence; v1/v2 return it as `null`.

- [ ] **Step 1: Add RED compiler assertions before changing graphs**

For a raster-4 `cathedral-fan` timeline with nested response, assert the compiled graph contains response-driven `t` expressions in fan rib angles and a bounded dynamic extent transform. For `echo-tunnel`, assert the vanishing axis is time-varying. For the same score under raster-2/raster-3, assert the historical graph remains unchanged.

Add a Linear control:

```js
const linear = compiledGraphFor("linear", responsiveTimeline);
assert.equal(linear.topologyCompiler, "linear-v1");
assert.equal(linear.topologyResponse, null); // Linear stays the current positive control in this slice
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/alpha9-render-proof.test.cjs tests/topology-response.test.cjs
```

Expected: FAIL because topology compilers do not yet consume `nestedResponse`.

- [ ] **Step 3: Attach response expressions to `topologyContext()` for raster-4 only**

```js
const response = execution.timeline.rendererPolicy === MUTATION_LATTICE_RENDERER_POLICY
  ? compileTopologyResponse(execution.timeline, baseState.topology)
  : null;

return Object.freeze({
  // existing fields
  response,
});
```

Do not change `effectiveInternalEnergyV3`, existing `zoom`, or existing static field-envelope calculation.

- [ ] **Step 4: Add a generic post-topology extent/travel transform for non-Linear raster-4**

Reuse the already-proven `scale ... :eval=frame,crop=...` pattern from `primitive-field.cjs::magnetic` rather than inventing a new timing mechanism.

After a topology has been composed to canonical frame size, apply:

```text
scale factor = 1 + 0.45*extent + 0.33*extent^6
```

This yields `1.0` at zero response, approximately `1.35` near the soft knee, and `1.78` only at true `extent=1`, enough for a 1080-high square topology to briefly occupy a 1920-wide frame without making that the sustained default.

The generated filter shape is:

```js
const e = context.response.expressions.extent;
const tx = context.response.expressions.travelX;
const ty = context.response.expressions.travelY;
const factor = `(1+0.45*(${e})+0.33*pow(${e},6))`;
const responsiveFrame = [
  `scale=w='iw*${factor}':h='ih*${factor}':eval=frame`,
  `crop=${context.width}:${context.height}:x='(iw-ow)/2+(${tx})*(iw-ow)*0.28':y='(ih-oh)/2+(${ty})*(ih-oh)*0.28'`,
].join(",");
```

Apply this only to the transparent topology layer, never to the user image/background.

- [ ] **Step 5: Add topology-specific articulation mappings**

Keep each mapping small and identity-preserving:

- `circle` — generic extent/travel + response phase in final rotation.
- `mirrored-ring` — generic transform + mirrored pair separation proportional to `openness`.
- `spiral` — generic transform + stronger signed phase response; keep polar source identity.
- `quad-mirror` — generic transform + bounded quadrant separation proportional to `openness`.
- `elastic-spine` — generic transform + lateral bow/travel proportional to signed `phase`/`recoil`.
- `split-horizon` — generic transform + top/bottom separation proportional to `openness`, reversing toward center on recoil.
- `cathedral-fan` — rib angles breathe using `openness` and recoil:

```js
const open = context.response.expressions.openness;
const recoil = context.response.expressions.recoil;
const rightAngle = `${ffmpegNumber(angle)}+(${open})*0.22-(${recoil})*0.08`;
const leftAngle = `-${ffmpegNumber(angle)}-(${open})*0.22+(${recoil})*0.08`;
```

- `echo-tunnel` — preserve explicit depth falloff, but make nested-plane vanishing offsets move with `travelX/travelY` and let `openness` increase spacing rather than brightness.

Do not reintroduce `blend=all_mode=screen` for layered Shape Pack topologies.

- [ ] **Step 6: Make `finishFilter()` accept a response phase without changing v1/v2 output**

For raster-4 response only:

```js
const baseAngle = `${ffmpegNumber(radians)}*t/${ffmpegNumber(context.duration)}`;
const responseAngle = context.response
  ? `+(${context.response.expressions.phase})*0.16`
  : "";
const rotate = `rotate='${baseAngle}${responseAngle}':ow=iw:oh=ih:c=black@0`;
```

When `context.response === null`, emit exactly the historical string.

- [ ] **Step 7: Prove actual FFmpeg frames for quiet, peak, sustained-high, and recoil plans**

Extend `alpha9-render-proof.test.cjs` with synthetic nested-response plans and use its existing `proveFrames()` helper. Required cases:

1. quiet non-silent Cathedral Fan;
2. exact peak Cathedral Fan;
3. sustained-high Cathedral Fan with shedding;
4. Echo Tunnel recoil/travel;
5. one ancestor topology such as Circle or Spiral;
6. Linear unchanged.

Assert every case emits two frames without FFmpeg error and the graph contains no screen-additive regression.

- [ ] **Step 8: Run GREEN and commit**

```bash
node --test tests/topology-response.test.cjs tests/alpha9-render-proof.test.cjs
node --test tests/alpha9-range-calibration.test.cjs

git add src/full-measure/src/render/topology-compilers.cjs \
        src/full-measure/tests/topology-response.test.cjs \
        src/full-measure/tests/alpha9-render-proof.test.cjs
git commit -m "feat: make raster4 topologies breathe with nested response"
```

---

### Task 5: Let Primitive Field carry the same contour without categorical churn

**Files:**
- Modify: `src/full-measure/src/render/primitive-field.cjs`
- Modify/create focused Primitive Field tests located by `rg "applyPrimitiveFieldToGraph|dynamicsProgram" src/full-measure/tests`.
- Modify: `src/full-measure/tests/alpha9-render-proof.test.cjs`

**Interfaces:**
- Consumes `compileTopologyResponse(timeline, timeline.baseState.topology)` from Task 3.
- `dynamicsProgram(kind, width, height, response = null)` keeps exact current strings when `response === null`.
- Signal-driven activity modulates displacement amplitude; idle remains a separate minimum floor.

- [ ] **Step 1: Write RED tests that response changes continuous field amplitude but not Primitive Field identity**

For a timeline with `primitiveField: { structure: "voxels", dynamics: "whip" }`, compile quiet and rising response plans. Assert both still report the same `structureCompiler` and `dynamicsCompiler`, but their movement expressions differ through response amplitude.

Assert a true-silence plan still contains only the declared idle contribution, not fabricated signal energy.

- [ ] **Step 2: Run RED**

```bash
node --test tests/*primitive*field*.test.cjs tests/alpha9-render-proof.test.cjs
```

Expected: FAIL because `dynamicsProgram()` currently uses fixed displacement amplitudes.

- [ ] **Step 3: Thread response evidence into `applyPrimitiveFieldToGraph()`**

```js
const response = timeline?.nestedResponse
  ? compileTopologyResponse(timeline, timeline.baseState.topology)
  : null;
const program = [
  structureProgram(evidence.structure.value, frameWidth, frameHeight),
  dynamicsProgram(evidence.dynamics.value, frameWidth, frameHeight, response),
  "[spectral][primitiveField]overlay=0:0:shortest=1[stage0]",
].join(";\n");
```

Return compact response evidence beside existing Primitive Field evidence only when present.

- [ ] **Step 4: Modulate displacement amplitude, not categorical dynamics**

Define one activity expression:

```js
const signal = response?.expressions.articulation || "1";
const idle = response?.expressions.idle || "0";
const activity = response ? `max(${idle},${signal})` : "1";
const amplitude = response ? `(0.28+0.72*(${activity}))` : "1";
```

Multiply the existing displacement magnitudes by `amplitude`; preserve each dynamics grammar's frequency and path identity. Example for `whip`:

```js
`(iw-ow)/2+sin(t*0.92)*sin(t*0.92)*(iw-ow)*0.46*${amplitude}`
```

For `magnetic`, preserve the already-proven safe expanded source/crop invariant; multiply only its oscillation depth/travel, never shrink below its crop-safety floor.

- [ ] **Step 5: Prove local contour does not create extra timeline patches or categorical field changes**

Assert response-plan changes do not alter:

```js
timeline.accounting.patchCount
timeline.accounting.entropySpent
timeline.primitiveField.structure
timeline.primitiveField.dynamics
```

Only renderer expressions change.

- [ ] **Step 6: Run GREEN and commit**

```bash
node --test tests/*primitive*field*.test.cjs tests/alpha9-render-proof.test.cjs

git add src/full-measure/src/render/primitive-field.cjs src/full-measure/tests
git commit -m "feat: couple primitive field to nested response"
```

---

### Task 6: Compiler evidence, full verification, and packaged field proof

**Files:**
- Modify: `src/full-measure/src/render/topology-compilers.cjs`
- Modify: `src/full-measure/src/render/timeline-filter.cjs`
- Modify: `src/full-measure/src/render/render.cjs`
- Modify: `src/full-measure/tests/alpha9-evidence-proof.test.cjs`
- Modify: `src/full-measure/tests/alpha9-render-proof.test.cjs`
- Update: `docs/superpowers/specs/2026-08-17-elastic-topology-response-design.md` only if implementation reveals a concrete wording mismatch; otherwise leave the approved design unchanged.

**Interfaces:**
- `compileProductionTopology()` returns `topologyResponse` compact evidence.
- `compileTimelineFilterGraph()` returns `nestedResponse`/`topologyResponse` evidence without duplicating raw knots.
- `render.visualCompiler` records policy/hash/count/granularity/idle/occupancy policy and the rendered graph hash.

- [ ] **Step 1: Add RED evidence assertions**

For an accepted raster-4 render compiler result, require:

```js
assert.deepEqual(compiled.topologyResponse, {
  policyVersion: "elastic-topology-response-v1",
  nestedResponsePolicyVersion: "nested-response-contour-v1",
  planSha256: timeline.nestedResponse.planSha256,
  knotCount: timeline.nestedResponse.knotCount,
  granularity: timeline.nestedResponse.granularity,
  idleMotionPolicyVersion: "topology-idle-v1",
  softOccupancyKnee: 0.72,
  meterEvidenceUsed: false,
});
```

Do not record all raw knots in the receipt/compiler evidence; the timeline sidecar already carries canonical detail.

- [ ] **Step 2: Thread compact evidence through compiler results**

In `compileProductionTopology()` return:

```js
topologyResponse: context.response?.evidence || null,
```

In both branches of `compileTimelineFilterGraph()`, propagate that field unchanged.

- [ ] **Step 3: Add compact evidence to `render.visualCompiler`**

In `render.cjs`:

```js
const visualCompiler = Object.freeze({
  policy: compiledTimeline.rendererPolicy,
  topology: compiledTimeline.topology,
  topologyCompiler: compiledTimeline.topologyCompiler,
  fieldEnvelopePolicy: compiledTimeline.fieldEnvelope?.policy || null,
  topologyResponse: compiledTimeline.topologyResponse || null,
  topologyArc: compiledTimeline.topologyArc || null,
  operators: compiledTimeline.operators,
  // existing fields unchanged
});
```

The canonical timeline hash remains the authority for the full response plan.

- [ ] **Step 4: Run all focused response/headroom/replay/FFmpeg tests**

From `src/full-measure`:

```bash
node --test \
  tests/nested-response-contour.test.cjs \
  tests/topology-response.test.cjs \
  tests/internal-response.test.cjs \
  tests/alpha9-range-calibration.test.cjs \
  tests/alpha9-mutation-lattice.test.cjs \
  tests/alpha9-render-proof.test.cjs \
  tests/alpha9-evidence-proof.test.cjs
```

Expected: all PASS.

- [ ] **Step 5: Run repository verification**

From repository root:

```bash
npm run verify
```

Do not weaken a test or skip a failing contract. Classify any failure as task-caused, pre-existing, environment, or unrelated-state interference; fix only task-caused failures in this branch.

- [ ] **Step 6: Build the Windows proof artifact through the existing workflow if the normal verification workflow packages raster-4**

Record exact workflow run id, head SHA, artifact id/digest, and whether Setup/Portable both built. No release publication.

- [ ] **Step 7: Human field proof against three contrasting specimens**

Use the packaged build with exact accepted candidates; do not regenerate merely to chase a preferred look.

Required human questions:

1. **Quiet / spacious specimen:** does topology remain inhabited and fluid without being falsely promoted to loud/full-frame behavior?
2. **Dense / mastered/distorted specimen:** does topology continue dancing, opening, recoiling, and mutating instead of becoming an explosive white field most of the time?
3. **Linear positive control:** does the previously good Linear behavior remain good rather than acquiring generic wobble?

For the dense specimen, explicitly watch for the desired cycle:

```text
bloom -> recoil -> hold tension -> bloom differently
```

Full-frame white/bright geometry is acceptable for a bounded beat/phrase climax. Failure condition is sustained convergence with no remaining expressive direction.

- [ ] **Step 8: Record field evidence on #138 and update PR #139**

The PR body/comment should include:

- exact final head SHA;
- RED and GREEN focused test evidence;
- full `npm run verify` result;
- packaged artifact evidence if produced;
- three human field verdicts;
- explicit statement that v1/v2 replay semantics and v3 headroom stayed unchanged;
- any remaining field uncertainty without claiming it solved.

- [ ] **Step 9: Commit final evidence plumbing**

```bash
git add src/full-measure/src/render/topology-compilers.cjs \
        src/full-measure/src/render/timeline-filter.cjs \
        src/full-measure/src/render/render.cjs \
        src/full-measure/tests
git commit -m "test: prove elastic topology response end to end"
```

---

## Plan Self-Review

### Spec coverage

- Honest macro headroom: Tasks 1, 3, 6.
- Local signed contour: Task 1.
- Smoothing/hysteresis/arc commitment: Task 1.
- No false meter authority: Tasks 1 and 6.
- Canonical replay/preview-render authority: Tasks 1, 2, 6.
- Topology-aware idle separated from signal: Tasks 1 and 3.
- Soft occupancy knee / full-frame climax / sustained-high shedding: Task 3.
- Topology-specific articulation rather than only scale: Task 4.
- Primitive Field first-consumer coupling: Task 5.
- No categorical churn / no patch-budget increase: Tasks 1, 2, 5.
- Linear positive control: Tasks 3, 4, 6.
- Shape Pack whiteout regression: Tasks 4 and 6.
- Compact receipt/compiler evidence: Task 6.

### Placeholder scan

No undefined implementation placeholders are required by this plan. Exact policy names, function signatures, thresholds, formulas, files, focused commands, and expected test states are specified above.

### Type/interface consistency

- `deriveResponseWitness()` produces the `responseWitness` passed by `candidate-session.cjs` into raster-4 generation.
- `attachNestedResponse()` consumes that witness and writes `timeline.nestedResponse` before `attachTopologyArc()`.
- `compileTopologyResponse()` consumes only `timeline.nestedResponse` plus topology identity; the renderer does not re-analyze audio.
- `topology-compilers.cjs` and `primitive-field.cjs` consume the same deterministic render-response expressions.
- `compileTimelineFilterGraph()` propagates compact compiler evidence; `render.cjs` records it inside the existing `visualCompiler` receipt object.
