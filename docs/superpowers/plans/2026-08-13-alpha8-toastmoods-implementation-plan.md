# Alpha.8 Toastmoods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the normal Porchlight / Wire Orchard / Absolute Residual starting furniture with seven deterministic Toast Feels that bias the existing six-up instrument without rewriting VisualScore v1 or the Gold Star renderer.

**Architecture:** `src/toast-feels.cjs` is the single domain authority. Main exposes a read-only manifest through the existing Electron IPC/contextBridge boundary; renderer furniture never imports CommonJS or derives identity from DOM text. Six ordinary feels deterministically pressure already-lawful VisualScore v1 fields, then the complete current timeline stack is rebuilt in its established order: Primitive/Atmosphere resolution → Possession Arc → Color Drift already carried by Primitive resolution → Lyric Resonance. MADD CLOWN deterministically selects a seed parent and delegates its visible six-up to the existing STOMP outer rail. Toast Feel identity/version/evidence travels through candidate-family metadata, accepted execution, UI slate, and the final receipt without becoming renderer authority.

**Tech Stack:** Node.js CommonJS, Electron main/preload/contextBridge, deterministic generation modules, JSDOM/node:test, Playwright/UI Witness from #122.

## Global constraints

- Target release is `0.5.0-alpha.8`; do not bump version in this feature slice.
- Preserve `archive/gold-star-renderer-alpha7`, current six-up diversity, and old accepted replay meaning.
- **Toast Feel biases the creature. It does not dictate the creature.**
- Do not change `haunted-toaster/visual-score/v1` solely to carry Toast Feel identity.
- Porchlight / Wire Orchard / Absolute Residual remain compatibility constraint packs; alpha.8 Toast Feels use Open Field as the normal constraint container.
- No `Math.random()`, wall clock, network input, renderer-local interpretation, or DOM-derived identity.
- MADD CLOWN reuses `visible-outcome-stomp-v1`; no second chaos engine.
- Locks remain authoritative. A Toast Feel may not mutate a locked axis.
- Candidate preview and final render consume the same accepted score/timeline and bound Toast Feel evidence.
- #122 UI Witness Gate must be landed before the furniture cutover task is accepted.

## File map

- Create `src/full-measure/src/toast-feels.cjs` — canonical manifest/lookup.
- Create `src/full-measure/src/generation/toast-feel-generation.cjs` — ordinary pressure decorator + MADD CLOWN STOMP delegation.
- Modify `src/full-measure/src/generation/index.cjs` — export Toast Feel generation after lyric-resonance generation.
- Modify `src/full-measure/src/candidate-session.cjs` — validate/bind `toastFeelId` through generation and accepted execution.
- Modify `src/full-measure/src/main.cjs` — expose manifest IPC and carry bound Toast Feel into render config.
- Modify `src/full-measure/src/preload.cjs` — expose `getToastFeels()` through `window.fullMeasure`.
- Create `src/full-measure/src/renderer/toast-feel-controller.js`; retire `starting-field-controller.js` after parity proof.
- Modify `src/full-measure/src/renderer/index.html`, `app.js`, `styles.css`.
- Modify `src/full-measure/src/render/render.cjs` — compact receipt evidence.
- Tests: `toast-feels.test.cjs`, `toast-feel-generation.test.cjs`, candidate-session, preload/sandbox parity, renderer UI integration, UI Witness screenshots.

---

## Task 1 — Define the seven-feel domain contract

**Files:** create `src/full-measure/src/toast-feels.cjs`; create `src/full-measure/tests/toast-feels.test.cjs`.

**Contract:**

```js
const TOAST_FEEL_CONTRACT = "toast-feel-v1";

const TOAST_FEELS = [
  ["low-and-slow", "Low & Slow", "Keep some heat in reserve.", "ordinary", { motion:-0.55, variance:-0.45, contrast:-0.10, imperfection:-0.25, camera:-0.50, temporal:-0.40 }],
  ["porch-ghost", "Porch Ghost", "Warm edges. Something still moving outside.", "ordinary", { motion:-0.20, variance:0.10, contrast:-0.15, imperfection:0.20, camera:-0.15, temporal:0 }],
  ["wire-heat", "Wire Heat", "Tension before flame.", "ordinary", { motion:0.35, variance:0.25, contrast:0.40, imperfection:0.10, camera:0.10, temporal:0.25 }],
  ["ash-bloom", "Ash Bloom", "Let the residue become the flower.", "ordinary", { motion:-0.05, variance:0.30, contrast:0.15, imperfection:0.60, camera:-0.05, temporal:0.15 }],
  ["burnt-halo", "Burnt Halo", "Bright center. Scorched perimeter.", "ordinary", { motion:0.05, variance:-0.05, contrast:0.65, imperfection:0.25, camera:0.05, temporal:-0.05 }],
  ["risky-hybrid", "Risky Hybrid", "Cross a few wires on purpose.", "ordinary", { motion:0.45, variance:0.65, contrast:0.35, imperfection:0.55, camera:0.45, temporal:0.55 }],
  ["madd-clown-crazy-slots", "MADD CLOWN CRAZY SLOTS", "Maximum lawful surprise.", "madd-clown", null],
];
```

Normalize each into a frozen object `{ id, name, invitation, iconId: `toast-${id}`, contractVersion, semanticClass, pressure }`. Export `TOAST_FEEL_CONTRACT`, `TOAST_FEELS`, `getToastFeel(id)`, and copy-returning `listToastFeels()`.

- [ ] Write RED test: exactly seven ids in that order; six ordinary + one `madd-clown`; lookup unknown returns `null`; every ordinary pressure field is finite within `[-1,1]`.
- [ ] Run `node --test src/full-measure/tests/toast-feels.test.cjs` and confirm module-missing RED.
- [ ] Implement the frozen manifest and validation at module initialization; no executable render expressions in manifest data.
- [ ] Run focused test and `npm --prefix src/full-measure run check`.
- [ ] Commit: `feat: define seven Toast Feels`.

---

## Task 2 — Apply ordinary Toast Feel pressure and rebuild the complete current timeline stack

**Files:** create `src/full-measure/src/generation/toast-feel-generation.cjs`; modify `generation/index.cjs`; create `tests/toast-feel-generation.test.cjs`.

**Imports:**

```js
const lyricResonance = require("./lyric-resonance-generation.cjs");
const primitiveGeneration = require("./primitive-field-generation.cjs");
const possessionArc = require("./possession-arc.cjs");
const { getToastFeel } = require("../toast-feels.cjs");
```

**Pressure law:** change only existing unlocked VisualScore fields. Use:

```js
function pressureNumber(current, range, pressure, fraction) {
  const span = Number(range.max) - Number(range.min);
  return quantizeNumber(Math.min(range.max, Math.max(range.min,
    Number(current) + span * Number(pressure) * fraction)));
}

const FRACTION = {
  motion: 0.12,
  variance: 0.14,
  contrast: 0.12,
  imperfection: 0.14,
  camera: 0.12,
};
```

Map `motion` → `score.motion.amplitude`; `variance` → `score.motion.variance`; `contrast` → `score.palette.contrastBias`; `imperfection` → `score.material.imperfection`; `camera` → `score.camera.variance`. `temporal` moves at most one legal step through `["frozen","section","phrase","transient"]` only when pressure magnitude is at least `0.35`. Respect matching locks.

**Critical re-resolution law:** after changing a candidate score, do not call only `lyricResonance.resolve()`, because that would omit Possession Arc reconstruction. Build the full timeline explicitly:

```js
function resolvePressuredTimeline({ analysis, score, constraints, rendererProfile, locks, lyricTrack }) {
  let timeline = primitiveGeneration.resolve(analysis, score, constraints, rendererProfile);
  timeline = possessionArc.applyPossessionArc(timeline, {
    analysis,
    score,
    constraints,
    locks,
  });
  return lyricResonance.attachLyricResonance(timeline, lyricTrack || null);
}
```

`primitiveGeneration.resolve()` already carries current Atmosphere/Primitive Field semantics and Color Drift; Possession Arc is then reapplied exactly as current candidate generation does.

- [ ] Write RED test for deterministic `applyToastFeelPressure`, constraints safety, and lock preservation.
- [ ] Write RED family test: same inputs + `risky-hybrid` produce identical score addresses/timeline hashes/family hash twice.
- [ ] Implement ordinary decorator by first calling `lyricResonance.generateCandidateSet(options)`, rebuilding each pressured score artifact, then resolving with `resolvePressuredTimeline`.
- [ ] Extend each derivation policy with `{ toastFeel: { contractVersion,id,semanticClass,pressureHash } }`.
- [ ] Add compact family metadata `{ contractVersion,id,name,semanticClass,pressureHash }`; do not copy raw pressure into family metadata.
- [ ] Rebuild `scoreAddresses`, `timelineHashes`, and `familyHash` canonically.
- [ ] Export Toast Feel generation after lyric-resonance in `generation/index.cjs`.
- [ ] Run Toast Feel + candidate/diversity/Primitive/Possession Arc/Color Drift/Lyric Resonance suites.
- [ ] Commit: `feat: bias candidate families with Toast Feel pressure`.

---

## Task 3 — Route MADD CLOWN through the existing STOMP outer rail

**Files:** modify `toast-feel-generation.cjs` and its tests.

For `madd-clown-crazy-slots`, do not pressure ordinary candidates. Generate a deterministic seed family through the existing lyric-resonance generator, choose one seed parent by hash, and delegate the visible six to existing STOMP:

```js
const seedFamily = lyricResonance.generateCandidateSet({ ...options, toastFeelId: undefined });
const digest = hashCanonical(
  { rootSeed: String(options.rootSeed), feel: "madd-clown-crazy-slots" },
  "HauntedToaster-MaddClownSeed-v1",
);
const seedIndex = Number.parseInt(digest.slice(0, 8), 16) % seedFamily.candidates.length;
const seedParent = seedFamily.candidates[seedIndex];
const stompFamily = lyricResonance.generateStompCandidateSet({
  ...options,
  parentScore: seedParent.scoreArtifact.score,
});
```

Rebuild family metadata only. Visible candidate score/timeline semantics remain the exact STOMP results. Family policy becomes `toast-feel-madd-clown-v1`; metadata records `seedFamilyHash`, `seedParentScoreRef`, and `stompPolicy: "visible-outcome-stomp-v1"`.

- [ ] RED test: six candidates, all derivations use STOMP policy, seed parent evidence present, same inputs replay identically.
- [ ] Implement MADD route and replay reconstruction from recorded root seed/feel.
- [ ] Run Toast Feel + STOMP suites.
- [ ] Commit: `feat: route MADD CLOWN through STOMP`.

---

## Task 4 — Bind Toast Feel through candidate session and sandbox API

**Files:** modify `candidate-session.cjs`, `main.cjs`, `preload.cjs`; tests candidate-session and sandbox/preload parity.

**Candidate session:** validate every `config.toastFeelId` with `getToastFeel`. `materialize()` binds `nextFamily.toastFeel`. `executionForRender(config)` requires the same audio, image, internal compatibility preset, and exact Toast Feel id; it returns a clone of bound Toast Feel evidence with accepted score/timeline.

**Manifest delivery:** use the existing sandbox boundary; renderer never imports the CommonJS manifest.

Main:

```js
ipcMain.handle("app:toast-feels", () => listToastFeels());
```

Preload/contextBridge:

```js
getToastFeels: () => ipcRenderer.invoke("app:toast-feels"),
```

- [ ] RED candidate-session test: generate/select `wire-heat`; matching execution returns feel; mismatched `ash-bloom` returns `null`.
- [ ] RED preload contract test: `getToastFeels` exists and invokes only `app:toast-feels`.
- [ ] RED main IPC test: returned manifest equals `listToastFeels()` and cannot mutate module authority.
- [ ] Implement exact binding and bridge.
- [ ] Run candidate-session, preload, main IPC tests.
- [ ] Commit: `feat: bind Toast Feel through appliance boundary`.

---

## Task 5 — Replace Starting Field furniture with seven manifest-driven burnt-toast controls

**Prerequisite:** #122 implementation is landed.

**Files:** create `renderer/toast-feel-controller.js`; modify `renderer/index.html`, `app.js`, `styles.css`; delete `starting-field-controller.js` after tests; update renderer UI integration + UI Witness Playwright/baselines.

Renderer flow:

```js
const feelings = await window.fullMeasure.getToastFeels();
// render seven buttons from returned data
// own only selection state and presentation
window.dispatchEvent(new CustomEvent("toast-feel-change", { detail: selected }));
```

Raw HTML contains only a truthful host:

```html
<div id="toastFeelChoices" class="toast-feel-choices" role="radiogroup" aria-label="Toast Feel"></div>
```

Default is `low-and-slow`. Each control is a real button with `role="radio"`, `aria-checked`, locally drawn inline SVG/CSS toast icon, label, invitation, keyboard behavior, `.is-selected`, disabled state. MADD CLOWN is visibly larger via `.toast-feel--madd-clown`; icon/art carries no semantic data.

`app.js` moves visible state to `toastFeelId` / `toastFeelName`, sends exact `toastFeelId` into candidate/render requests, disables `.toast-feel` controls while rendering, and labels slate `Toast Feel`. Keep internal `presetId: "openField"` as compatibility constraint container for ordinary alpha.8 creation; do not expose old garment trio as normal choices.

- [ ] RED JSDOM test: raw HTML has no `.garment-card` or old three choices; after manifest promise resolves there are seven exact ids.
- [ ] RED behavior test: selection event carries `{id,name,contractVersion,semanticClass}` from manifest, not DOM text.
- [ ] Implement controller and styles; delete old controller only after tests pass.
- [ ] Update #122 witness canonical state from Starting Field to Toast Feel while keeping the old query alias if #122 has already published it.
- [ ] Playwright proof: six equal ordinary controls, larger MADD CLOWN, stable hover/focus, keyboard selection, disabled during render, selected slate visible.
- [ ] Declare screenshot delta `expected`; never accept unexplained drift.
- [ ] Run renderer UI tests and `npm --prefix src/full-measure run witness:test` (or exact command landed by #122).
- [ ] Commit: `feat: replace Starting Field furniture with Toastmoods`.

---

## Task 6 — Receipt-bind the executed Toast Feel and package-witness the slice

**Files:** modify `main.cjs`, `render/render.cjs`, receipt tests; no release version change.

Main passes `execution.toastFeel` from candidate-session authority into resolved rendering. Renderer accepts only that bound object and writes compact evidence:

```js
receipt.treatment.toastFeel = {
  contractVersion,
  id,
  name,
  semanticClass,
  pressureHash: pressureHash || null,
  seedParentScoreRef: seedParentScoreRef || null,
  stompPolicy: stompPolicy || null,
};
```

- [ ] RED receipt test: Toast Feel evidence present while canonical score address/timeline hash remain unchanged.
- [ ] Implement compact serialization; no raw pressure dump.
- [ ] Run `npm run verify`.
- [ ] Run #122 browser witness on exact head and record `UI impact: visual + behavioral`, `browser witness: PASS`, `visual delta: expected`, `packaged witness required: yes`.
- [ ] Run Windows packaging workflow on exact head.
- [ ] In packaged appliance prove `Wire Heat → six-up → select → render → receipt wire-heat`.
- [ ] Generate MADD CLOWN and prove visible family is STOMP-derived with recorded seed parent/policy. A second full video is optional here.
- [ ] Commit any proof-caused narrow fix separately; otherwise stop. Do not add more feel names/sliders or a second surprise system.
