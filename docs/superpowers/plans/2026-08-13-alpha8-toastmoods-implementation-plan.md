# Alpha.8 Toastmoods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the normal Porchlight / Wire Orchard / Absolute Residual starting furniture with seven deterministic Toast Feels that bias the existing six-up instrument without rewriting VisualScore v1 or the Gold Star renderer.

**Architecture:** Add one versioned UI/domain manifest and one pure Toast Feel bias contract. Renderer furniture is generated from the manifest; candidate generation receives a stable `toastFeelId` rather than reading DOM text. Six ordinary feels deterministically pressure already-lawful score axes after the existing generation stack and re-resolve through the same canonical resolver chain; MADD CLOWN deterministically seeds the existing STOMP outer-rail generator from a recorded intermediate candidate. The chosen feel and its bias evidence are carried in candidate-family metadata, render execution context, and the final receipt without becoming a new hidden renderer authority.

**Tech Stack:** Node.js CommonJS, Electron renderer HTML/CSS/JavaScript, deterministic generation modules, JSDOM/node:test, existing UI Witness / Playwright proof from #122.

## Global Constraints

- Target release is `0.5.0-alpha.8`; do not bump the version in this feature slice.
- Preserve `archive/gold-star-renderer-alpha7` and current six-up diversity/replay meaning.
- `Toast Feel biases the creature. It does not dictate the creature.`
- Do not change the `haunted-toaster/visual-score/v1` schema solely to carry Toast Feel identity.
- Porchlight / Wire Orchard / Absolute Residual remain valid constraint packs and compatibility ancestry.
- No `Math.random()`, wall clock, host font discovery, network input, or renderer-local choice may affect Toast Feel execution.
- MADD CLOWN must reuse recorded STOMP / outer-rail machinery; do not add a second chaos algorithm.
- Candidate preview and final render must consume the same selected Toast Feel identity/version and resolved score/timeline semantics.
- UI Witness Gate #122 must be landed before the final Toastmoods furniture/cutover task is accepted.

---

## File Structure

- Create `src/full-measure/src/toast-feels.cjs` — versioned domain manifest, stable identities, display copy, semantic class, and pure bounded bias descriptors.
- Create `src/full-measure/src/generation/toast-feel-generation.cjs` — deterministic candidate-family decorator and MADD CLOWN STOMP entry path.
- Modify `src/full-measure/src/generation/index.cjs` — make Toast Feel generation the final exported generation layer.
- Modify `src/full-measure/src/candidate-session.cjs` — validate/retain selected feel, pass it through generation/mutation/STOMP, bind it to selected execution, and expose receipt evidence.
- Replace `src/full-measure/src/renderer/starting-field-controller.js` with manifest-driven `toast-feel-controller.js` after compatibility tests are in place.
- Modify `src/full-measure/src/renderer/index.html` — replace ancestor garment cards with one generated Toastmoods host while keeping no-JS text truthful.
- Modify `src/full-measure/src/renderer/app.js` — state uses `toastFeelId`/`toastFeelName`, disables generic Toast Feel controls while rendering, and sends exact identity to candidate/render IPC.
- Modify `src/full-measure/src/renderer/styles.css` — six small burnt-toast controls + one larger MADD CLOWN control, focus/selected/disabled states.
- Modify `src/full-measure/src/render/render.cjs` — write Toast Feel execution evidence into `receipt.treatment.toastFeel` without changing video semantics.
- Modify `src/full-measure/src/preload.cjs` only if the manifest must be exposed through the sandbox; prefer loading the safe static manifest in renderer code if existing CSP/module rules allow it.
- Test `src/full-measure/tests/toast-feels.test.cjs` — domain contract and deterministic pressure.
- Test `src/full-measure/tests/toast-feel-generation.test.cjs` — ordinary family bias, locks, replay, and MADD CLOWN STOMP reuse.
- Modify `src/full-measure/tests/candidate-session.test.cjs` — selection/binding/execution evidence.
- Modify `src/full-measure/tests/renderer-ui-integration.test.cjs` — manifest-driven furniture and slate state.
- Modify UI Witness baselines/tests introduced by #122 — explicit intended visual delta for Toastmoods.

---

### Task 1: Define the Seven Toast Feel domain contract

**Files:**
- Create: `src/full-measure/src/toast-feels.cjs`
- Test: `src/full-measure/tests/toast-feels.test.cjs`

**Interfaces:**
- Produces: `TOAST_FEEL_CONTRACT = "toast-feel-v1"`.
- Produces: `TOAST_FEELS` frozen ordered array.
- Produces: `getToastFeel(id) -> ToastFeel` and `listToastFeels() -> ToastFeel[]`.
- A `ToastFeel` has `{ id, name, invitation, iconId, contractVersion, semanticClass, pressure }`.
- `semanticClass` is exactly `"ordinary"` or `"madd-clown"`.
- `pressure` is data only; it contains no executable expressions and no renderer filters.

The seven v1 identities and display names are frozen in this task:

```js
const TOAST_FEELS = Object.freeze([
  {
    id: "low-and-slow",
    name: "Low & Slow",
    invitation: "Keep some heat in reserve.",
    iconId: "toast-low-and-slow",
    semanticClass: "ordinary",
    pressure: {
      motion: -0.55,
      variance: -0.45,
      contrast: -0.1,
      imperfection: -0.25,
      camera: -0.5,
      temporal: -0.4,
    },
  },
  {
    id: "porch-ghost",
    name: "Porch Ghost",
    invitation: "Warm edges. Something still moving outside.",
    iconId: "toast-porch-ghost",
    semanticClass: "ordinary",
    pressure: {
      motion: -0.2,
      variance: 0.1,
      contrast: -0.15,
      imperfection: 0.2,
      camera: -0.15,
      temporal: 0,
    },
  },
  {
    id: "wire-heat",
    name: "Wire Heat",
    invitation: "Tension before flame.",
    iconId: "toast-wire-heat",
    semanticClass: "ordinary",
    pressure: {
      motion: 0.35,
      variance: 0.25,
      contrast: 0.4,
      imperfection: 0.1,
      camera: 0.1,
      temporal: 0.25,
    },
  },
  {
    id: "ash-bloom",
    name: "Ash Bloom",
    invitation: "Let the residue become the flower.",
    iconId: "toast-ash-bloom",
    semanticClass: "ordinary",
    pressure: {
      motion: -0.05,
      variance: 0.3,
      contrast: 0.15,
      imperfection: 0.6,
      camera: -0.05,
      temporal: 0.15,
    },
  },
  {
    id: "burnt-halo",
    name: "Burnt Halo",
    invitation: "Bright center. Scorched perimeter.",
    iconId: "toast-burnt-halo",
    semanticClass: "ordinary",
    pressure: {
      motion: 0.05,
      variance: -0.05,
      contrast: 0.65,
      imperfection: 0.25,
      camera: 0.05,
      temporal: -0.05,
    },
  },
  {
    id: "risky-hybrid",
    name: "Risky Hybrid",
    invitation: "Cross a few wires on purpose.",
    iconId: "toast-risky-hybrid",
    semanticClass: "ordinary",
    pressure: {
      motion: 0.45,
      variance: 0.65,
      contrast: 0.35,
      imperfection: 0.55,
      camera: 0.45,
      temporal: 0.55,
    },
  },
  {
    id: "madd-clown-crazy-slots",
    name: "MADD CLOWN CRAZY SLOTS",
    invitation: "Maximum lawful surprise.",
    iconId: "toast-madd-clown",
    semanticClass: "madd-clown",
    pressure: null,
  },
].map((feel) => Object.freeze({
  ...feel,
  contractVersion: "toast-feel-v1",
  pressure: feel.pressure ? Object.freeze(feel.pressure) : null,
})));
```

- [ ] **Step 1: Write the failing manifest test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  TOAST_FEEL_CONTRACT,
  TOAST_FEELS,
  getToastFeel,
} = require("../src/toast-feels.cjs");

test("Toast Feel v1 exposes six ordinary feels plus one MADD CLOWN", () => {
  assert.equal(TOAST_FEEL_CONTRACT, "toast-feel-v1");
  assert.equal(TOAST_FEELS.length, 7);
  assert.equal(TOAST_FEELS.filter((feel) => feel.semanticClass === "ordinary").length, 6);
  assert.equal(TOAST_FEELS.filter((feel) => feel.semanticClass === "madd-clown").length, 1);
  assert.equal(getToastFeel("risky-hybrid").name, "Risky Hybrid");
  assert.equal(getToastFeel("missing"), null);
  assert.deepEqual(
    TOAST_FEELS.map((feel) => feel.id),
    [
      "low-and-slow",
      "porch-ghost",
      "wire-heat",
      "ash-bloom",
      "burnt-halo",
      "risky-hybrid",
      "madd-clown-crazy-slots",
    ],
  );
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
node --test src/full-measure/tests/toast-feels.test.cjs
```

Expected: FAIL because `src/toast-feels.cjs` does not exist.

- [ ] **Step 3: Implement the frozen manifest and lookups**

Create the manifest exactly as specified above, then export safe copy-returning helpers:

```js
function getToastFeel(id) {
  return TOAST_FEELS.find((feel) => feel.id === String(id)) || null;
}

function listToastFeels() {
  return TOAST_FEELS.map((feel) => structuredClone(feel));
}

module.exports = {
  TOAST_FEEL_CONTRACT,
  TOAST_FEELS,
  getToastFeel,
  listToastFeels,
};
```

- [ ] **Step 4: Run focused test and repository check**

Run:

```bash
node --test src/full-measure/tests/toast-feels.test.cjs
npm --prefix src/full-measure run check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/toast-feels.cjs src/full-measure/tests/toast-feels.test.cjs
git commit -m "feat: define seven Toast Feels"
```

---

### Task 2: Add deterministic ordinary Toast Feel pressure as a generation decorator

**Files:**
- Create: `src/full-measure/src/generation/toast-feel-generation.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Test: `src/full-measure/tests/toast-feel-generation.test.cjs`

**Interfaces:**
- Consumes: current final generation API from `./lyric-resonance-generation.cjs`.
- Consumes: `toastFeelId`, canonical constraints, locks, analysis, renderer profile, root seed, and lyric track.
- Produces: `applyToastFeelPressure(score, feel, constraints, locks) -> VisualScore`.
- Produces: `decorateFamilyWithToastFeel(family, options) -> CandidateFamily`.
- Produces: `generateCandidateSet(options)` and `replayCandidateFamily(family, options)` compatible with the current generation API.
- Ordinary feel pressure modifies only unlocked existing VisualScore v1 numeric fields; it does not add a Toast Feel field to the score schema.

Use one bounded nudge function:

```js
function pressureNumber(current, range, pressure, maximumFraction) {
  const span = Number(range.max) - Number(range.min);
  const next = Number(current) + span * Number(pressure) * maximumFraction;
  return quantizeNumber(Math.min(range.max, Math.max(range.min, next)));
}
```

Map pressure into existing axes only:

```js
const MAX_PRESSURE_FRACTION = Object.freeze({
  motion: 0.12,
  variance: 0.14,
  contrast: 0.12,
  imperfection: 0.14,
  camera: 0.12,
});
```

`temporal` must not invent a new number. It moves at most one step through the existing ordered density vocabulary:

```js
const TEMPORAL_ORDER = ["frozen", "section", "phrase", "transient"];
```

Pressure `>= 0.35` moves one legal step higher; pressure `<= -0.35` moves one legal step lower; otherwise it holds. Respect a `temporalDensity` lock.

- [ ] **Step 1: Write failing deterministic-pressure tests**

Use `open-field.v1.json`, a fixed score fixture, and `Risky Hybrid`. Assert:

```js
const pressuredA = applyToastFeelPressure(score, feel, constraints, []);
const pressuredB = applyToastFeelPressure(score, feel, constraints, []);
assert.deepEqual(pressuredA, pressuredB);
assert.equal(pressuredA.schema, score.schema);
assert.ok(pressuredA.motion.amplitude >= score.motion.amplitude);
assert.ok(pressuredA.motion.variance >= score.motion.variance);
assert.ok(pressuredA.material.imperfection >= score.material.imperfection);
assert.ok(pressuredA.camera.variance >= score.camera.variance);
assert.deepEqual(
  applyToastFeelPressure(score, feel, constraints, ["motion", "camera"]).motion,
  score.motion,
);
assert.deepEqual(
  applyToastFeelPressure(score, feel, constraints, ["motion", "camera"]).camera,
  score.camera,
);
```

Also assert the pressured score still passes `scoreWithinConstraints`.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test src/full-measure/tests/toast-feel-generation.test.cjs
```

Expected: FAIL because the generation decorator is absent.

- [ ] **Step 3: Implement pure score pressure and family rebuild**

For ordinary feels:

1. call `lyric-resonance-generation.generateCandidateSet(options)`;
2. pressure each candidate score on unlocked axes;
3. rebuild the score artifact with the existing canonical `artifact(...)` helper and extend derivation policy with:

```js
{
  toastFeel: {
    contractVersion: feel.contractVersion,
    id: feel.id,
    semanticClass: feel.semanticClass,
    pressureHash: hashCanonical(feel.pressure, "HauntedToaster-ToastFeelPressure-v1"),
  },
}
```

4. re-resolve each pressured score through `lyricResonance.resolve(analysis, score, constraints, rendererProfile, lyricTrack)`;
5. rebuild `scoreAddresses`, `timelineHashes`, and `familyHash` from the changed candidates;
6. add family metadata:

```js
toastFeel: {
  contractVersion: feel.contractVersion,
  id: feel.id,
  name: feel.name,
  semanticClass: feel.semanticClass,
  pressureHash,
}
```

Do not mutate the source family in place.

- [ ] **Step 4: Export Toast Feel generation last**

Append to `src/full-measure/src/generation/index.cjs` after lyric-resonance generation:

```js
  ...require("./toast-feel-generation.cjs"),
```

This makes the new decorator the normal `generateCandidateSet`/`replayCandidateFamily` surface while retaining direct access to all earlier helpers.

- [ ] **Step 5: Prove family replay and lock preservation**

Add a test that generates an ordinary feel family twice from the same fixed inputs and asserts identical:

```js
assert.deepEqual(first.scoreAddresses, second.scoreAddresses);
assert.deepEqual(first.timelineHashes, second.timelineHashes);
assert.equal(first.familyHash, second.familyHash);
assert.equal(first.toastFeel.id, "risky-hybrid");
```

For a branch family with `locks: ["palette", "camera"]`, assert each child's pressured score keeps the parent palette and camera byte/semantic-identical.

- [ ] **Step 6: Run focused and generation suites**

Run:

```bash
node --test \
  src/full-measure/tests/toast-feel-generation.test.cjs \
  src/full-measure/tests/candidate-family.test.cjs \
  src/full-measure/tests/diversity-engine.test.cjs \
  src/full-measure/tests/possession-arc.test.cjs \
  src/full-measure/tests/color-drift.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/full-measure/src/generation/toast-feel-generation.cjs src/full-measure/src/generation/index.cjs src/full-measure/tests/toast-feel-generation.test.cjs
git commit -m "feat: bias candidate families with Toast Feel pressure"
```

---

### Task 3: Route MADD CLOWN through the existing STOMP outer rail

**Files:**
- Modify: `src/full-measure/src/generation/toast-feel-generation.cjs`
- Modify: `src/full-measure/tests/toast-feel-generation.test.cjs`

**Interfaces:**
- Produces: `generateMaddClownCandidateSet(options) -> CandidateFamily`.
- The visible MADD CLOWN family has `policy: "toast-feel-madd-clown-v1"` and `toastFeel.semanticClass === "madd-clown"`.
- It records `seedFamilyHash`, `seedParentScoreRef`, and `stompPolicy` so the internal bridge into STOMP is inspectable and replayable.

- [ ] **Step 1: Write the failing MADD CLOWN reuse test**

Generate with fixed analysis/Open Field/root seed and `toastFeelId: "madd-clown-crazy-slots"`. Assert:

```js
assert.equal(family.toastFeel.id, "madd-clown-crazy-slots");
assert.equal(family.toastFeel.semanticClass, "madd-clown");
assert.equal(family.policy, "toast-feel-madd-clown-v1");
assert.equal(family.producedCount, 6);
assert.ok(family.toastFeel.seedFamilyHash);
assert.ok(family.toastFeel.seedParentScoreRef);
assert.equal(family.toastFeel.stompPolicy, "visible-outcome-stomp-v1");
assert.ok(family.candidates.every((candidate) =>
  candidate.scoreArtifact.derivation.policy.candidatePolicy === "visible-outcome-stomp-v1"
));
```

- [ ] **Step 2: Run RED**

Run the focused test; expected failure is absence of MADD CLOWN routing.

- [ ] **Step 3: Implement deterministic seed-parent selection and STOMP delegation**

Implementation sequence:

```js
const seedFamily = lyricResonance.generateCandidateSet({
  ...options,
  toastFeelId: undefined,
});
const seedIndex = Number.parseInt(
  hashCanonical(
    { rootSeed: String(options.rootSeed), feel: "madd-clown-crazy-slots" },
    "HauntedToaster-MaddClownSeed-v1",
  ).slice(0, 8),
  16,
) % seedFamily.candidates.length;
const seedParent = seedFamily.candidates[seedIndex];
const stompFamily = lyricResonance.generateStompCandidateSet({
  ...options,
  parentScore: seedParent.scoreArtifact.score,
});
```

Rebuild only family metadata so the six visible candidates remain exact STOMP descendants. Do not rewrite their score or timeline semantics after STOMP.

- [ ] **Step 4: Add exact replay proof**

Replay from the same `rootSeed`, feel identity, analysis, constraints and renderer profile; assert the same `seedParentScoreRef`, candidate score addresses, timeline hashes, and family hash.

- [ ] **Step 5: Run STOMP + Toast Feel suites**

Run:

```bash
node --test \
  src/full-measure/tests/toast-feel-generation.test.cjs \
  src/full-measure/tests/stomp-generation.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/generation/toast-feel-generation.cjs src/full-measure/tests/toast-feel-generation.test.cjs
git commit -m "feat: route MADD CLOWN through STOMP"
```

---

### Task 4: Bind Toast Feel identity through candidate session and final execution

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Modify: `src/full-measure/tests/candidate-session.test.cjs`

**Interfaces:**
- Candidate config now consumes `toastFeelId`.
- `familyBinding` stores `toastFeel` evidence from the generated family.
- `executionForRender(config)` returns `{ visualScore, resolvedTimeline, analysis, labInfluence, toastFeel }`.
- Selection becomes invalid if audio, image, or Toast Feel identity changes.

- [ ] **Step 1: Write failing binding tests**

Add a session test that:

1. notes audio and image;
2. generates with `toastFeelId: "wire-heat"`;
3. selects a candidate;
4. calls `executionForRender` with the same audio/image/feel and asserts `execution.toastFeel.id === "wire-heat"`;
5. calls `executionForRender` with `toastFeelId: "ash-bloom"` and expects `null`.

- [ ] **Step 2: Run RED**

Run:

```bash
node --test src/full-measure/tests/candidate-session.test.cjs
```

Expected: FAIL because Toast Feel is not part of family binding.

- [ ] **Step 3: Validate and pass exact identity**

At the start of `generate`, `mutate`, and `stomp`:

```js
const feel = getToastFeel(config.toastFeelId);
if (!feel) throw new TypeError(`Unknown Toast Feel: ${String(config.toastFeelId)}.`);
```

Pass `toastFeelId: feel.id` into generation. In `materialize`, bind the returned `nextFamily.toastFeel` rather than reconstructing it from UI input.

For ordinary explicit STOMP-after-selection, keep the selected ordinary feel identity and pass it into the Toast Feel generation wrapper so the descendants remain in the same mood field. MADD CLOWN's initial family already uses the dedicated path from Task 3.

- [ ] **Step 4: Include feel identity in render binding**

`executionForRender` must require:

```js
if (config.toastFeelId !== familyBinding.toastFeel?.id) return null;
```

and return a structured clone of `familyBinding.toastFeel`.

- [ ] **Step 5: Run candidate-session and generation suites**

Run:

```bash
node --test \
  src/full-measure/tests/candidate-session.test.cjs \
  src/full-measure/tests/toast-feel-generation.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/candidate-session.cjs src/full-measure/tests/candidate-session.test.cjs
git commit -m "feat: bind Toast Feel through candidate execution"
```

---

### Task 5: Replace DOM-derived Starting Field furniture with manifest-driven Toastmoods

**Prerequisite:** #122 / PR #124 UI Witness Gate is landed on the implementation branch before this task begins.

**Files:**
- Create: `src/full-measure/src/renderer/toast-feel-controller.js`
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/src/renderer/app.js`
- Modify: `src/full-measure/src/renderer/styles.css`
- Delete after tests pass: `src/full-measure/src/renderer/starting-field-controller.js`
- Modify: `src/full-measure/tests/renderer-ui-integration.test.cjs`
- Modify: `src/full-measure/tests/ui-witness.spec.cjs`
- Modify reviewed screenshot baselines under `src/full-measure/tests/ui-witness-baselines/`.

**Interfaces:**
- Renderer global: `window.toastFeel.getSelection() -> { id, name, contractVersion, semanticClass }`.
- Event: `toast-feel-change` with the same fields in `event.detail`.
- Default ordinary feel is exactly `low-and-slow`.
- UI is generated from a browser-safe manifest literal produced from the same domain data; do not infer names/ids back from DOM text.

- [ ] **Step 1: Write the failing renderer-domain test**

Assert raw HTML contains one host:

```html
<div id="toastFeelChoices" class="toast-feel-choices" role="radiogroup" aria-label="Toast Feel"></div>
```

and does not contain `.garment-card`, `data-preset="porchlight"`, or raw Porchlight/Wire Orchard/Absolute Residual choice furniture.

Load the controller in JSDOM and assert it creates seven buttons with exact `data-toast-feel-id` values from Task 1, with MADD CLOWN carrying `.toast-feel--madd-clown`.

- [ ] **Step 2: Run RED**

Run the renderer UI integration test; expected failure is the old static garment furniture/controller.

- [ ] **Step 3: Implement manifest-driven buttons and state**

Each generated button must be:

```html
<button type="button" class="toast-feel" role="radio" aria-checked="false">
  <span class="toast-feel-icon" aria-hidden="true">…inline SVG toast silhouette…</span>
  <strong></strong>
  <small></small>
</button>
```

Generate the toast silhouette with local inline SVG/CSS only. Use the `iconId` as a class/data hook; icon appearance carries no semantic authority.

The controller owns selection state and dispatches `toast-feel-change`; it never calls candidate APIs directly.

- [ ] **Step 4: Move app state from preset furniture to Toast Feel identity**

Change renderer state:

```js
toastFeelId: "low-and-slow",
toastFeelName: "Low & Slow",
```

Listen for `toast-feel-change`, update slate copy to `Toast Feel`, and pass `toastFeelId` into candidate generation/mutation/STOMP and `startRender` config.

Keep `presetId` as internal compatibility execution state only where legacy render/config paths still require a constraint pack; ordinary alpha.8 Toast Feels use `openField` as the compatibility constraint container unless an imported historical score explicitly binds another ancestor.

- [ ] **Step 5: Disable the generated choices while rendering**

Replace `.garment-card` loops with:

```js
for (const choice of $$(".toast-feel")) choice.disabled = rendering;
```

and assert the UI Witness `rendering` state shows all seven controls disabled.

- [ ] **Step 6: Add exact visual witness assertions**

In Playwright, prove:

- six ordinary toast buttons are equal/small size;
- MADD CLOWN is visibly larger;
- selected state is obvious;
- keyboard Tab + Space/Enter can select a feel;
- hover/focus do not move layout;
- `?state=starting-field` is renamed/aliased to the canonical Toast Feel witness state without breaking old witness URLs during the migration;
- visual baseline change is declared `expected`.

- [ ] **Step 7: Run UI proof**

Run the UI Witness commands established by #122 plus:

```bash
npm --prefix src/full-measure test -- --test-name-pattern="Toast Feel|renderer"
npm --prefix src/full-measure run witness:test
```

Expected: PASS with reviewed expected screenshot deltas only.

- [ ] **Step 8: Commit**

```bash
git add src/full-measure/src/renderer src/full-measure/tests/renderer-ui-integration.test.cjs src/full-measure/tests/ui-witness.spec.cjs src/full-measure/tests/ui-witness-baselines
git commit -m "feat: replace Starting Field furniture with Toastmoods"
```

---

### Task 6: Record the executed Toast Feel in render receipt evidence

**Files:**
- Modify: `src/full-measure/src/render/render.cjs`
- Modify: `src/full-measure/src/main.cjs`
- Modify: `src/full-measure/tests/render-receipt.test.cjs` or the existing resolved-render receipt test owning `receipt.treatment`.
- Modify: `src/full-measure/tests/candidate-session.test.cjs` if main-process execution handoff is covered there instead.

**Interfaces:**
- `renderResolvedTimelineVideo(config)` consumes optional `config.toastFeel` already validated/bound by candidate session.
- Receipt writes `treatment.toastFeel` only when present.

Receipt shape:

```js
toastFeel: {
  contractVersion: "toast-feel-v1",
  id: "wire-heat",
  name: "Wire Heat",
  semanticClass: "ordinary",
  pressureHash: "...",
  seedParentScoreRef: null,
  stompPolicy: null,
}
```

MADD CLOWN uses non-null `seedParentScoreRef` and `stompPolicy`.

- [ ] **Step 1: Write failing receipt test**

Pass a synthetic bound Toast Feel into a resolved render receipt builder/test seam and assert the exact structure appears under `receipt.treatment.toastFeel` while `canonicalExecution.scoreAddress` and `timelineHash` remain unchanged.

- [ ] **Step 2: Run RED**

Run the focused receipt test; expected failure is missing Toast Feel evidence.

- [ ] **Step 3: Carry candidate-session evidence through main render handoff**

Where main obtains `candidateSession.executionForRender(config)`, pass:

```js
toastFeel: execution.toastFeel,
```

into `renderVideo` only from the bound execution result. Do not trust a renderer-supplied free-form Toast Feel object.

- [ ] **Step 4: Serialize compact receipt evidence**

In `render.cjs`, copy only declared fields; do not dump arbitrary family metadata.

- [ ] **Step 5: Run full repository verification**

Run:

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/main.cjs src/full-measure/src/render/render.cjs src/full-measure/tests
git commit -m "feat: receipt-bind executed Toast Feel"
```

---

### Task 7: Toastmoods packaged witness and issue handoff

**Files:**
- No production changes unless proof exposes a Toastmoods-caused defect.
- Update PR body / issue #123 evidence after proof.

**Interfaces:**
- Produces the alpha.8 Toastmoods completion evidence consumed by the later release plan.

- [ ] **Step 1: Run final branch verification**

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 2: Confirm UI Witness completion fields**

Record:

```text
UI impact: visual + behavioral
browser witness: PASS @ <exact head SHA>
visual delta: expected
packaged witness required: yes
GitBook ontology changed: yes
```

- [ ] **Step 3: Run the repository's Windows packaging workflow on the exact final head**

Expected: `Build Windows demo` succeeds and produces the ordinary Windows artifacts.

- [ ] **Step 4: Field-witness one ordinary feel and MADD CLOWN**

In the packaged appliance, prove:

```text
select Wire Heat -> generate six -> choose -> render -> receipt says wire-heat
select MADD CLOWN -> generate six -> visible family is STOMP-derived -> choose -> render -> receipt says madd-clown-crazy-slots + stompPolicy
```

- [ ] **Step 5: Stop**

Do not add more Toast Feel names, user sliders, per-axis mood controls, or a second surprise engine in this PR. Those require new field evidence.
