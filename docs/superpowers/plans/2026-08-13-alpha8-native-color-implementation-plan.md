# Alpha.8 Native Color Witness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admitted source image deterministically influence Haunted Toaster color through exactly two source-relative relationships (`echo` and `counterpoint`) and one bounded native-color decompression event, while preserving Color Drift, preview/render parity, and old replay meaning.

**Architecture:** An impure local analyzer reduces admitted image bytes to a deterministic 32×32 RGB sample and compact `NativeChromaticProfile`. A pure generation decorator attaches a `nativeColor` relationship/decompression plan to the already accepted candidate timelines after Toast Feel generation. No score schema changes are required. Timeline execution promotes decompression start/end ticks to real execution boundaries. The shared preview/production compiler (already used by `candidate-preview.cjs`) composes palette state → existing Color Drift → source-relative relationship → native return. Old/non-expressive timelines remain untouched.

**Tech Stack:** Node.js CommonJS, pinned/local FFmpeg, canonical SHA-256 hashing, current timeline decorators, FFmpeg hue/eq filters, node:test.

## Global constraints

- Exactly two v1 relationships: `echo`, `counterpoint`.
- No semantic segmentation, face/object detection, masks, local witness zones, third relationship, or renderer-side image analysis.
- No image means no Native Color plan and current behavior remains unchanged.
- Only current expressive renderer timelines receive Native Color; legacy/non-expressive timelines are returned unchanged.
- `NativeChromaticProfile` is deterministic from admitted image bytes + `native-chromatic-profile-v1` sampling policy.
- Relationship/decompression plans are pure, canonical, and included in accepted `ResolvedTimeline` hashing.
- Existing Color Drift remains active; Native Color does not replace its plan.
- Toast Feel preference is resolved by exact `toastFeelId` through `getToastFeel()`. Compact family Toast Feel metadata intentionally does not carry raw pressure.
- A palette lock preserves the parent's Native Color relationship.
- Candidate preview and final render already share `createTimelineExecution()` + `compileTimelineFilterGraph()`; extend that one compiler path, not two implementations.

## File map

- Create `src/full-measure/src/native-color-analysis.cjs`.
- Create `src/full-measure/src/generation/native-color.cjs`.
- Create `src/full-measure/src/generation/native-color-generation.cjs` and export it last from `generation/index.cjs` after Toast Feel generation.
- Modify `candidate-session.cjs` to compute/cache profile per admitted image and pass parent Native Color plan when needed.
- Modify `render/timeline-execution.cjs` to validate plan and segment at decompression boundaries.
- Modify `render/timeline-filter.cjs` to compile relationship/decompression through shared preview/production path.
- Modify `main.cjs`/`render.cjs` for compact receipt evidence.
- Tests: native-color-analysis, native-color plan/generation, candidate-session, timeline-execution, timeline-filter, candidate-preview, receipt/render.

---

## Task 1 — Derive a deterministic NativeChromaticProfile

**Files:** create `src/full-measure/src/native-color-analysis.cjs`; create `tests/native-color-analysis.test.cjs`.

Export:

```js
const NATIVE_CHROMATIC_PROFILE_POLICY = "native-chromatic-profile-v1";
async function analyzeNativeChromaticProfile(imagePath) {}
function profileFromRgbPixels({ sourceSha256, width, height, rgb }) {}
```

Profile:

```js
{
  schema: "haunted-toaster/native-chromatic-profile/v1",
  policyVersion: "native-chromatic-profile-v1",
  sourceSha256,
  sample: { width: 32, height: 32, pixelFormat: "rgb24" },
  hueCentroidDegrees, // [0,360)
  hueSpread,          // [0,1]
  saturationMean,     // [0,1]
  luminanceMean,      // [0,1], Rec.709
  chromaWeight,       // [0,1]
  profileSha256,
}
```

Sampling command is exact:

```bash
ffmpeg -y -hide_banner -loglevel error -i <image> \
  -vf scale=32:32:flags=area,format=rgb24 \
  -frames:v 1 <temp>/native-color-sample.ppm
```

Use P6 PPM so the current text-oriented `runProcess` needs no binary-output redesign. Hash original source with existing `hashFile()` before sampling.

RGB statistics:

1. normalize channels to `[0,1]` and compute ordinary HSV;
2. Rec.709 luminance = `0.2126*r + 0.7152*g + 0.0722*b`;
3. saturation is circular-hue weight;
4. accumulate weighted `sin/cos`; centroid = normalized `atan2`; grayscale centroid = `0`;
5. resultant magnitude `R`; `hueSpread = 1-clamp(R,0,1)`;
6. means/chromaWeight quantized to six decimals;
7. hash canonical profile body with domain `HauntedToaster-NativeChromaticProfile-v1`.

- [ ] RED pure fixture test: same warm RGB buffer twice → identical profile/hash; warm centroid near red/orange; grayscale finite with zero chroma.
- [ ] RED parser tests: reject non-P6, wrong max value, malformed dimensions, wrong byte count.
- [ ] Implement pure math/P6 parser.
- [ ] Implement FFmpeg temp sample boundary with guaranteed temp cleanup.
- [ ] Integration test using a temporary hand-written PPM source run twice through analyzer; identical profile hashes.
- [ ] Run focused test; commit `feat: derive native chromatic profile`.

---

## Task 2 — Resolve the pure two-relationship Native Color plan

**Files:** create `generation/native-color.cjs`; create `tests/native-color.test.cjs`.

Exports:

```js
const NATIVE_COLOR_POLICY = "native-color-witness-v1";
const RELATIONSHIPS = Object.freeze(["echo", "counterpoint"]);
function resolveNativeColorPlan(timeline, { profile, analysis, relationship }) {}
function nativeColorAtTick(timeline, tick) {}
```

Import `EXPRESSIVE_RENDERER_POLICY`. First guard:

```js
if (timeline.rendererPolicy !== EXPRESSIVE_RENDERER_POLICY) return timeline;
```

Relationship state:

```js
function relationshipState(profile, relationship) {
  if (relationship === "echo") {
    return {
      hueOffset: 0,
      saturationMultiplier: quantize(clamp(0.94 + profile.chromaWeight * 0.12, 0.94, 1.06)),
    };
  }
  const direction = profile.hueCentroidDegrees < 180 ? 1 : -1;
  return {
    hueOffset: 54 * direction,
    saturationMultiplier: quantize(clamp(1.04 + profile.chromaWeight * 0.14, 1.04, 1.18)),
  };
}

const nativeSaturationTarget = quantize(
  clamp(0.88 + profile.saturationMean * 0.24, 0.88, 1.12),
);
```

Decompression v1 schedules at most one section window: require at least two canonical analysis sections; consider every section after first; choose greatest absolute energy delta, tie earliest; window = chosen section start→end; `nativeInfluence = 0.68`; record previous/next section labels and delta. One-section analysis gets zero windows rather than fake timing.

Attach:

```js
nativeColor: {
  schema: "haunted-toaster/native-color-plan/v1",
  policyVersion: NATIVE_COLOR_POLICY,
  sourceSha256,
  profileSha256,
  relationship,
  relationshipState,
  nativeSaturationTarget,
  decompressionWindows,
  windowCount,
  planSha256,
}
```

Recompute timeline hash through `HauntedToaster-ResolvedTimeline-v1` exactly like other decorators.

- [ ] RED test: same expressive timeline/profile resolved twice is canonical-identical; echo/counterpoint plan hashes and timeline hashes differ.
- [ ] RED non-expressive test: exact input object is returned unchanged.
- [ ] RED single-section test: relationship present, zero windows.
- [ ] Implement plan + `nativeColorAtTick`; outside window influence `0`, inside `0.68`.
- [ ] Run focused test; commit `feat: resolve native color relationship plan`.

---

## Task 3 — Cover echo/counterpoint deterministically across six-up

**Files:** create `generation/native-color-generation.cjs`; modify `generation/index.cjs`; create `tests/native-color-generation.test.cjs`.

Import the final Toast Feel generation layer and the canonical feel resolver:

```js
const toastGeneration = require("./toast-feel-generation.cjs");
const { getToastFeel } = require("../toast-feels.cjs");
```

Preference is derived from the authoritative manifest object, never family metadata:

```js
function preferredRelationship(toastFeelId) {
  const feel = getToastFeel(toastFeelId);
  if (!feel) throw new TypeError(`Unknown Toast Feel: ${String(toastFeelId)}.`);
  return Number(feel.pressure?.contrast) > 0.25 ? "counterpoint" : "echo";
}
```

Unlocked six-up sequence: candidate `0` preferred, `1` other, alternating through `5`. If `locks` contains `palette` and `parentNativeColorPlan.relationship` is valid, all children inherit that relationship. MADD CLOWN has no raw pressure and therefore prefers `echo`; its underlying STOMP score semantics stay untouched.

Decorator calls Toast Feel generation first, then only decorates candidate timelines with `resolveNativeColorPlan`; candidate scores are unchanged. Rebuild timeline hashes/family hash and add compact family evidence `{ policyVersion,profileSha256,relationships:["echo","counterpoint"],preferredRelationship }`.

Wrap `generateCandidateSet`, `generateStompCandidateSet`, `replaceFinalCandidateWithConverge`, and replay so every visible generation mode receives the same profile law. Export Native Color generation **last** from `generation/index.cjs`.

- [ ] RED family test: fixed profile + `risky-hybrid` covers both relationships in expected alternating order; repeat gives same timeline/family hashes.
- [ ] RED palette-lock test: parent `echo` + palette lock keeps all descendants `echo` while other axes may vary.
- [ ] RED no-profile test: returned family equals Toast Feel generator behavior with no Native Color metadata.
- [ ] Implement family decorator/wrappers/replay.
- [ ] Run Native Color + Toast Feel + STOMP + Possession Arc + Color Drift suites.
- [ ] Commit `feat: cover native color relationships across six-up`.

---

## Task 4 — Cache NativeChromaticProfile in candidate session

**Files:** modify `candidate-session.cjs`; modify `candidate-session.test.cjs`.

Dependency-inject analyzer for tests without changing default production construction:

```js
function createCandidateSession({
  analyzeNativeChromaticProfile: analyzeProfile = defaultAnalyzeNativeChromaticProfile,
} = {}) {}
```

`noteImage()` invalidates candidates and cached profile when image identity changes. `ensureNativeChromaticProfile()` analyzes once per currently admitted image. Pass `nativeChromaticProfile` into generate/mutate/STOMP/import. On branch operations pass `parentNativeColorPlan: parent.timeline?.nativeColor || null`; Native Color decorator decides whether palette lock makes it authoritative.

`executionForRender` returns cached profile only when selected execution still matches bound image/audio/feel/container; accepted timeline already carries the plan authority.

- [ ] RED lifecycle test: same image generates twice with one analyzer call; new image clears profile/candidates and calls analyzer once for new identity.
- [ ] RED no-image test: analyzer never called and Native Color absent.
- [ ] Implement cache and generation options.
- [ ] Run candidate-session tests; commit `feat: bind native chromatic evidence to candidate session`.

---

## Task 5 — Make decompression windows true timeline boundaries

**Files:** modify `render/timeline-execution.cjs`; modify `tests/timeline-execution.test.cjs`.

Validate optional plan strictly: exact schema/policy; relationship in `echo|counterpoint`; source/profile/plan hashes lowercase 64-hex; finite relationship renderer values; ordered non-overlapping windows; `0 <= start < end <= duration`; v1 influence exactly `0.68`; boundary exactly `section`.

Add every Native Color window `startTick` and `endTick` into `executionSegments()` event ticks with existing patch/Possession Arc ticks, sort and dedupe.

- [ ] RED segmentation fixture proves window start/end create segments even without patch/arc there.
- [ ] RED malformed-plan cases fail closed.
- [ ] Implement validation/segmentation.
- [ ] Run timeline-execution tests; commit `feat: segment execution at native color windows`.

---

## Task 6 — Compile relationship → Color Drift → decompression through the shared compiler

**Files:** modify `render/timeline-filter.cjs`; modify timeline-filter/Color Drift/candidate-preview tests.

Change:

```js
rendererValues(state, drift = null, nativeColor = null)
```

Exact composition:

```js
const baseHue =
  (Number(palette.contrastBias) || 0) * 18 +
  ((Number(palette.bleed) || 0) - 0.5) * 12 +
  (Number(drift?.hueOffset) || 0) +
  (Number(nativeColor?.relationshipHueOffset) || 0);

const relationshipSaturation =
  (0.94 + (Number(palette.bleed) || 0) * 0.22) *
  (Number(drift?.saturationMultiplier) || 1) *
  (Number(nativeColor?.relationshipSaturationMultiplier) || 1);

const influence = clamp(Number(nativeColor?.nativeInfluence) || 0, 0, 1);
const hue = quantize(baseHue * (1 - influence));
const saturation = quantize(
  relationshipSaturation * (1 - influence) +
  (Number(nativeColor?.nativeSaturationTarget) || 1) * influence,
);
```

Contrast/brightness/gamma are unchanged in v1. In both Possession Arc and ordinary compilation paths call `nativeColorAtTick(timeline, segment.startTick)` beside `driftAtTick`. Add compiler operator:

```js
{
  axis: "nativeColor",
  compiler: "native-color-witness-v1",
  profileSha256,
  planSha256,
  relationship,
  windowCount,
}
```

Record per-segment compact Native Color state in compiler evidence.

`candidate-preview.cjs` already calls the same `createTimelineExecution()` and `compileTimelineFilterGraph()` as production. Do **not** add a preview-specific Native Color implementation; add a regression that its compiled preview reflects the accepted Native Color timeline.

- [ ] RED renderer-value test: counterpoint hue magnitude decreases toward zero during influence and saturation moves toward native target.
- [ ] RED no-native test: current fixture renderer values/graph remain unchanged.
- [ ] RED candidate-preview parity test: preview plan/timeline hash is accepted Native Color timeline hash and shared compiler operator appears in compiled seam.
- [ ] Implement shared compiler changes.
- [ ] Run timeline-filter, Color Drift, candidate-preview, Native Color suites.
- [ ] Commit `feat: compile chromatic decompression after Color Drift`.

---

## Task 7 — Receipt-bind Native Color and prove the packaged specimen

**Files:** modify `main.cjs`, `render/render.cjs`, receipt/render tests.

Main passes only candidate-session-bound `nativeChromaticProfile` to resolved rendering. Timeline remains plan authority. Receipt treatment records:

```js
nativeColor: {
  policyVersion: "native-color-witness-v1",
  profilePolicyVersion: "native-chromatic-profile-v1",
  sourceSha256: profile.sourceSha256,
  profileSha256: profile.profileSha256,
  relationship: timeline.nativeColor.relationship,
  planSha256: timeline.nativeColor.planSha256,
  windowCount: timeline.nativeColor.windowCount,
}
```

Do not dump sampled pixels/temp paths. `render.visualCompiler.operators` already carries compiler-side plan evidence.

- [ ] RED receipt test: compact evidence present and `canonicalExecution.timelineHash` equals accepted Native-Color-bearing timeline hash.
- [ ] Implement main handoff/receipt serialization.
- [ ] Run `npm run verify`.
- [ ] Package the feature branch after Toastmoods/UI Witness prerequisite is integrated.
- [ ] Field proof: same distinctive-color image + same multi-section song; select one `echo` and one `counterpoint` candidate across deterministic runs; prove same source/profile hashes, distinct plan/timeline hashes, one recorded decompression window each.
- [ ] Human witness: relationships visibly differ before window; at recorded window both move toward the source image's native chromatic character.
- [ ] Preserve frame timestamps/receipt hashes. If weak, tune only bounded v1 constants and rerun same specimen; do not add a third relationship/segmentation.
- [ ] Commit narrow proof-caused fix if needed; otherwise stop.
