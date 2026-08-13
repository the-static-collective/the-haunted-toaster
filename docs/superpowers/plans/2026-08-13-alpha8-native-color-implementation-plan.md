# Alpha.8 Native Color Witness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admitted source image deterministically influence Haunted Toaster color through exactly two source-relative relationships (`echo` and `counterpoint`) and one bounded native-color decompression event, while preserving existing Color Drift, preview/render parity, and legacy replay meaning.

**Architecture:** Split the feature into an impure local image-analysis boundary and a pure timeline-plan boundary. The analysis boundary reduces the admitted image to a deterministic 32×32 PPM sample and derives a compact `NativeChromaticProfile`; the pure generation decorator attaches a `nativeColor` plan to each candidate timeline after Toast Feel and the existing generation stack have resolved. Timeline execution treats decompression start/end ticks as real semantic execution boundaries. The production compiler combines existing palette state + Color Drift + source-relative relationship, then moves the resulting hue/saturation treatment toward a profile-derived native target during the recorded decompression window. No semantic vision, raw-image renderer inspection, or second color clock is introduced.

**Tech Stack:** Node.js CommonJS, bundled FFmpeg, deterministic canonical hashing, existing ResolvedTimeline decorators, FFmpeg hue/eq filters, node:test, existing candidate preview and production compiler.

## Global Constraints

- Target release is `0.5.0-alpha.8`; do not bump the version in this feature slice.
- Native Color requires an admitted user image. No image means the current renderer path is byte/semantic-compatible except for unrelated upstream changes.
- Exactly two v1 relationship classes exist: `echo` and `counterpoint`.
- Additional relationship classes, semantic/local color zones, face/object detection, and segmentation are outside alpha.8.
- The photo is evidence; renderer code must not perform hidden image analysis.
- NativeChromaticProfile creation is deterministic from admitted image bytes + `native-chromatic-profile-v1` policy.
- Relationship and decompression plans are deterministic, canonical, and stored on the accepted ResolvedTimeline.
- Existing section-relative Color Drift remains active and composes before native decompression.
- Toast Feel may bias which of the two relationship classes appears first in six-up coverage, but cannot dictate an exact palette or reveal timestamp.
- Same pinned image/profile/score/analysis/constraints/profile/feel inputs reproduce identical candidate timeline hashes and Native Color plan hashes.
- Preview and final render must compile the same Native Color timeline evidence.

---

## File Structure

- Create `src/full-measure/src/native-color-analysis.cjs` — filesystem/FFmpeg boundary that creates and hashes `NativeChromaticProfile` from admitted image bytes.
- Create `src/full-measure/src/generation/native-color.cjs` — pure relationship/decompression plan resolver and `nativeColorAtTick` helper.
- Create `src/full-measure/src/generation/native-color-generation.cjs` — final candidate-family decorator after Toast Feel; assigns `echo`/`counterpoint` coverage and attaches plans to timelines.
- Modify `src/full-measure/src/generation/index.cjs` — export Native Color generation last.
- Modify `src/full-measure/src/candidate-session.cjs` — compute/cache profile for the current admitted image, pass it into generation, bind selected plan, and preserve relation under a palette lock.
- Modify `src/full-measure/src/render/timeline-execution.cjs` — validate Native Color plan and include decompression start/end ticks in execution segmentation.
- Modify `src/full-measure/src/render/timeline-filter.cjs` — compose relationship + Color Drift + decompression into renderer hue/saturation values and compiler evidence.
- Modify `src/full-measure/src/render/render.cjs` — carry Native Color compiler/profile/plan evidence into receipt treatment/compiler evidence.
- Modify `src/full-measure/src/render/candidate-preview.cjs` only if it currently bypasses `compileTimelineFilterGraph`; otherwise prove no separate preview implementation is needed.
- Test `src/full-measure/tests/native-color-analysis.test.cjs`.
- Test `src/full-measure/tests/native-color.test.cjs`.
- Test `src/full-measure/tests/native-color-generation.test.cjs`.
- Modify `src/full-measure/tests/timeline-execution.test.cjs`.
- Modify `src/full-measure/tests/timeline-filter.test.cjs` or the current compiler contract test owning `rendererValues`/Color Drift.
- Modify the existing receipt/render semantic test owning `receipt.treatment` and `visualCompiler`.

---

### Task 1: Derive a deterministic NativeChromaticProfile from admitted image bytes

**Files:**
- Create: `src/full-measure/src/native-color-analysis.cjs`
- Test: `src/full-measure/tests/native-color-analysis.test.cjs`

**Interfaces:**
- Produces: `NATIVE_CHROMATIC_PROFILE_POLICY = "native-chromatic-profile-v1"`.
- Produces: `analyzeNativeChromaticProfile(imagePath, options?) -> Promise<NativeChromaticProfile>`.
- Produces: `profileFromRgbPixels({ sourceSha256, width, height, rgb }) -> NativeChromaticProfile` for pure fixture testing.
- `NativeChromaticProfile` shape:

```js
{
  schema: "haunted-toaster/native-chromatic-profile/v1",
  policyVersion: "native-chromatic-profile-v1",
  sourceSha256: "…",
  sample: { width: 32, height: 32, pixelFormat: "rgb24" },
  hueCentroidDegrees: 0,     // [0, 360)
  hueSpread: 0,              // [0, 1], 0 = concentrated, 1 = diffuse
  saturationMean: 0,         // [0, 1]
  luminanceMean: 0,          // [0, 1], Rec.709
  chromaWeight: 0,           // [0, 1]
  profileSha256: "…",
}
```

Sampling command is exact:

```bash
ffmpeg -y -hide_banner -loglevel error -i <image> \
  -vf scale=32:32:flags=area,format=rgb24 \
  -frames:v 1 <temp>/native-color-sample.ppm
```

Use PPM because the current `runProcess` helper is text-oriented; do not widen that helper into a binary transport merely for this feature.

- [ ] **Step 1: Write pure RGB fixture tests**

Use two synthetic 4-pixel RGB buffers without invoking FFmpeg:

```js
const warm = Buffer.from([
  255, 0, 0,
  255, 64, 0,
  255, 128, 0,
  255, 192, 0,
]);
const profileA = profileFromRgbPixels({
  sourceSha256: "a".repeat(64),
  width: 2,
  height: 2,
  rgb: warm,
});
const profileB = profileFromRgbPixels({
  sourceSha256: "a".repeat(64),
  width: 2,
  height: 2,
  rgb: warm,
});
assert.deepEqual(profileA, profileB);
assert.ok(profileA.hueCentroidDegrees < 60 || profileA.hueCentroidDegrees > 330);
assert.ok(profileA.saturationMean > 0.8);
assert.ok(profileA.luminanceMean > 0 && profileA.luminanceMean < 1);
assert.match(profileA.profileSha256, /^[a-f0-9]{64}$/);
```

Also assert a grayscale fixture yields `chromaWeight === 0`, `hueCentroidDegrees === 0`, and finite values everywhere.

- [ ] **Step 2: Run RED**

```bash
node --test src/full-measure/tests/native-color-analysis.test.cjs
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement deterministic RGB → HSV/statistics conversion**

For each RGB triplet:

1. normalize channels to `[0,1]`;
2. compute HSV hue/saturation/value using ordinary piecewise RGB→HSV math;
3. compute Rec.709 luminance `0.2126*r + 0.7152*g + 0.0722*b`;
4. use saturation as circular-hue weight;
5. accumulate `sumCos += cos(hueRadians) * saturation` and `sumSin += sin(hueRadians) * saturation`;
6. `hueCentroidDegrees = chromaWeight === 0 ? 0 : normalizedDegrees(atan2(sumSin, sumCos))`;
7. resultant magnitude `R = sqrt(sumCos² + sumSin²) / max(sumSaturation, epsilon)`;
8. `hueSpread = quantize(1 - clamp(R,0,1))`;
9. `saturationMean`, `luminanceMean`, and `chromaWeight = sumSaturation / pixelCount` are six-decimal quantized;
10. hash the profile body with domain `HauntedToaster-NativeChromaticProfile-v1`.

Reject RGB buffers whose byte length is not exactly `width * height * 3`.

- [ ] **Step 4: Implement P6 PPM parsing and FFmpeg sampling**

Write a small parser that accepts only P6, positive width/height, max value `255`, and exactly `width*height*3` pixel bytes after header whitespace/comments.

`analyzeNativeChromaticProfile` must:

```js
const sourceSha256 = await hashFile(imagePath);
const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "toaster-native-color-"));
try {
  const samplePath = path.join(tempDirectory, "native-color-sample.ppm");
  await runProcess(resolveFfmpeg(), [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", path.resolve(imagePath),
    "-vf", "scale=32:32:flags=area,format=rgb24",
    "-frames:v", "1",
    samplePath,
  ]);
  const sample = parsePpm(await fs.readFile(samplePath));
  return profileFromRgbPixels({ sourceSha256, ...sample });
} finally {
  await fs.rm(tempDirectory, { recursive: true, force: true });
}
```

- [ ] **Step 5: Add one integration fixture test**

Create a tiny PPM fixture in the test temp directory, run `analyzeNativeChromaticProfile` twice, and assert identical profile hashes. This proves the FFmpeg/sample boundary without adding binary image assets to the repo.

- [ ] **Step 6: Run focused tests**

```bash
node --test src/full-measure/tests/native-color-analysis.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/full-measure/src/native-color-analysis.cjs src/full-measure/tests/native-color-analysis.test.cjs
git commit -m "feat: derive native chromatic profile"
```

---

### Task 2: Resolve exactly two source-relative relationship plans

**Files:**
- Create: `src/full-measure/src/generation/native-color.cjs`
- Test: `src/full-measure/tests/native-color.test.cjs`

**Interfaces:**
- Produces: `NATIVE_COLOR_POLICY = "native-color-witness-v1"`.
- Produces: `RELATIONSHIPS = ["echo", "counterpoint"]`.
- Produces: `resolveNativeColorPlan(timeline, { profile, analysis, relationship }) -> ResolvedTimeline`.
- Produces: `nativeColorAtTick(timeline, tick) -> { relationshipHueOffset, relationshipSaturationMultiplier, nativeInfluence, nativeSaturationTarget }`.

Relationship renderer parameters are exact:

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
```

Native saturation target is:

```js
quantize(clamp(0.88 + profile.saturationMean * 0.24, 0.88, 1.12));
```

Decompression scheduling is deliberately one event maximum in v1:

- if canonical analysis has fewer than two sections, `decompressionWindows` is empty;
- otherwise consider each section after the first;
- compute absolute energy delta from its predecessor;
- choose the greatest delta, tie-breaking by earliest section start;
- window starts at that section start and ends at that same section's end;
- `nativeInfluence` is `0.68`;
- record previous/next section labels and energy delta as trigger evidence.

- [ ] **Step 1: Write failing plan tests**

Build a synthetic expressive timeline + three-section analysis + deterministic profile. Resolve once as `echo`, once as `counterpoint` and assert:

```js
assert.equal(echo.nativeColor.relationship, "echo");
assert.equal(counter.nativeColor.relationship, "counterpoint");
assert.notEqual(
  echo.nativeColor.relationshipState.hueOffset,
  counter.nativeColor.relationshipState.hueOffset,
);
assert.equal(echo.nativeColor.decompressionWindows.length, 1);
assert.equal(counter.nativeColor.decompressionWindows.length, 1);
assert.notEqual(echo.timelineHash, counter.timelineHash);
```

Resolve the same inputs twice and assert byte/canonical equality.

- [ ] **Step 2: Run RED**

```bash
node --test src/full-measure/tests/native-color.test.cjs
```

Expected: FAIL because the pure plan module is absent.

- [ ] **Step 3: Implement relationship and decompression plan**

Attach:

```js
nativeColor: {
  schema: "haunted-toaster/native-color-plan/v1",
  policyVersion: "native-color-witness-v1",
  profileSha256: profile.profileSha256,
  sourceSha256: profile.sourceSha256,
  relationship,
  relationshipState,
  nativeSaturationTarget,
  decompressionWindows,
  planSha256,
}
```

Recompute `timelineHash` using the existing `HauntedToaster-ResolvedTimeline-v1` domain exactly as Color Drift/Possession Arc do. Do not mutate `baseState` or existing Color Drift evidence.

- [ ] **Step 4: Implement `nativeColorAtTick`**

Outside a decompression window return:

```js
{
  relationshipHueOffset: relationshipState.hueOffset,
  relationshipSaturationMultiplier: relationshipState.saturationMultiplier,
  nativeInfluence: 0,
  nativeSaturationTarget,
}
```

Inside the recorded window return the same relationship fields plus `nativeInfluence: 0.68`.

- [ ] **Step 5: Prove single-section honesty**

A one-section analysis must still attach the relationship plan but return `decompressionWindows: []` and `windowCount: 0`; no fake timestamp is invented merely to satisfy the feature.

- [ ] **Step 6: Run focused test**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/full-measure/src/generation/native-color.cjs src/full-measure/tests/native-color.test.cjs
git commit -m "feat: resolve native color relationship plan"
```

---

### Task 3: Cover echo/counterpoint deterministically across candidate families

**Files:**
- Create: `src/full-measure/src/generation/native-color-generation.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Test: `src/full-measure/tests/native-color-generation.test.cjs`

**Interfaces:**
- Consumes: final Toast Feel generation API from `./toast-feel-generation.cjs`.
- Consumes: optional `nativeChromaticProfile` and `parentNativeColorPlan`.
- Produces: `generateCandidateSet`, `generateStompCandidateSet`, `replaceFinalCandidateWithConverge`, and `replayCandidateFamily` with Native Color timeline decoration.
- Adds family metadata `nativeColor: { policyVersion, profileSha256, relationships, preferredRelationship }` only when a profile exists.

Preference law:

```js
function preferredRelationship(toastFeel) {
  const contrastPressure = Number(toastFeel?.pressure?.contrast) || 0;
  return contrastPressure > 0.25 ? "counterpoint" : "echo";
}
```

Coverage law for an unlocked six-up:

```js
candidate index 0 -> preferred
1 -> other
2 -> preferred
3 -> other
4 -> preferred
5 -> other
```

If `locks` contains `palette` and `parentNativeColorPlan.relationship` is valid, every child inherits that relationship instead of alternating.

- [ ] **Step 1: Write failing family coverage tests**

Generate a six-up with a fixed profile and ordinary `Risky Hybrid` feel. Assert all candidates have the profile hash and the relationship sequence alternates from the feel preference. Assert the same inputs reproduce identical timeline/family hashes.

- [ ] **Step 2: Write failing palette-lock inheritance test**

Provide `locks: ["palette"]` and `parentNativeColorPlan.relationship: "echo"`; assert every child timeline remains `echo` while unrelated unlocked visual axes can still differ.

- [ ] **Step 3: Run RED**

```bash
node --test src/full-measure/tests/native-color-generation.test.cjs
```

Expected: FAIL because the decorator is absent.

- [ ] **Step 4: Implement family decoration**

Call the Toast Feel generator first. For each candidate, call `resolveNativeColorPlan(candidate.timeline, ...)`; do not change candidate score artifacts. Rebuild only timeline hashes/family hash and add compact family Native Color evidence.

- [ ] **Step 5: Wrap STOMP and CONVERGE too**

`generateStompCandidateSet` and `replaceFinalCandidateWithConverge` must receive the same profile/parent-plan options and decorate their resulting timelines before returning. The chosen visual score remains exactly the score produced by the existing machinery.

- [ ] **Step 6: Export Native Color generation last**

Append after Toast Feel generation in `generation/index.cjs`:

```js
  ...require("./native-color-generation.cjs"),
```

- [ ] **Step 7: Run generation regression suite**

```bash
node --test \
  src/full-measure/tests/native-color-generation.test.cjs \
  src/full-measure/tests/toast-feel-generation.test.cjs \
  src/full-measure/tests/color-drift.test.cjs \
  src/full-measure/tests/possession-arc.test.cjs \
  src/full-measure/tests/stomp-generation.test.cjs
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/full-measure/src/generation/native-color-generation.cjs src/full-measure/src/generation/index.cjs src/full-measure/tests/native-color-generation.test.cjs
git commit -m "feat: cover native color relationships across six-up"
```

---

### Task 4: Analyze/cache the admitted image in candidate session and preserve palette-lock context

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Modify: `src/full-measure/tests/candidate-session.test.cjs`

**Interfaces:**
- Candidate session stores `nativeChromaticProfile` for the currently admitted image.
- `noteImage(nextImagePath)` invalidates the cached profile when image identity changes.
- Generation calls pass `nativeChromaticProfile` and the selected parent timeline's `nativeColor` plan when appropriate.
- `executionForRender` returns `nativeChromaticProfile` and the selected timeline already contains the authoritative Native Color plan.

- [ ] **Step 1: Write failing image-profile lifecycle test**

Use dependency injection for the analyzer so the unit test does not launch FFmpeg:

```js
const session = createCandidateSession({
  analyzeNativeChromaticProfile: async (imagePath) => fixtureProfile(imagePath),
});
```

Assert generating twice with the same image analyzes once; changing the image clears candidates/profile and analyzes the new image once.

- [ ] **Step 2: Run RED**

Run `candidate-session.test.cjs`; expected failure is missing analyzer injection/profile state.

- [ ] **Step 3: Add optional dependency injection without changing default API**

Change signature:

```js
function createCandidateSession({
  analyzeNativeChromaticProfile: analyzeProfile = defaultAnalyzeNativeChromaticProfile,
} = {})
```

Keep ordinary production construction unchanged.

- [ ] **Step 4: Pass profile into all candidate-generation modes**

Before `generate`, `mutate`, `stomp`, or imported-proposal generation:

```js
const nativeChromaticProfile = imagePath
  ? await ensureNativeChromaticProfile()
  : null;
```

Pass it into generation options.

When mutating/STOMP from a selected parent and palette is locked, pass:

```js
parentNativeColorPlan: parent.timeline?.nativeColor || null,
```

- [ ] **Step 5: Bind execution evidence**

`executionForRender` returns the cached profile only when the selected execution still matches the bound image path and timeline. Do not allow a renderer-supplied profile to override it.

- [ ] **Step 6: Run candidate session suite**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/full-measure/src/candidate-session.cjs src/full-measure/tests/candidate-session.test.cjs
git commit -m "feat: bind native chromatic evidence to candidate session"
```

---

### Task 5: Make decompression windows true timeline execution boundaries

**Files:**
- Modify: `src/full-measure/src/render/timeline-execution.cjs`
- Modify: `src/full-measure/tests/timeline-execution.test.cjs`

**Interfaces:**
- `assertResolvedTimeline` validates optional `timeline.nativeColor`.
- `executionSegments` includes every native decompression `startTick` and `endTick` in addition to patches/Possession Arc ticks.

- [ ] **Step 1: Write failing segmentation test**

Create a timeline with ordinary patch ticks plus:

```js
nativeColor: {
  schema: "haunted-toaster/native-color-plan/v1",
  policyVersion: "native-color-witness-v1",
  relationship: "counterpoint",
  profileSha256: "a".repeat(64),
  sourceSha256: "b".repeat(64),
  relationshipState: { hueOffset: 54, saturationMultiplier: 1.1 },
  nativeSaturationTarget: 1.02,
  decompressionWindows: [{
    startTick: 2400,
    endTick: 4800,
    nativeInfluence: 0.68,
    boundary: "section",
    triggerEvidence: { previousSection: "A", nextSection: "B", energyDelta: 0.3 },
  }],
  windowCount: 1,
  planSha256: "c".repeat(64),
}
```

Assert segment starts include `2400` and `4800` even when neither is an ordinary patch/arc tick.

- [ ] **Step 2: Run RED**

Expected: current execution segmentation ignores Native Color boundaries.

- [ ] **Step 3: Add strict Native Color validation**

Validate:

- schema/policy exact strings;
- relationship in `echo|counterpoint`;
- finite bounded renderer values;
- profile/source/plan hashes are lowercase 64-hex;
- windows ordered and non-overlapping;
- `0 <= startTick < endTick <= durationTicks`;
- `nativeInfluence === 0.68` for v1;
- `boundary === "section"`.

- [ ] **Step 4: Merge Native Color ticks into segmentation**

Add start/end ticks to `eventTicks`, sort/dedupe exactly like existing patch/arc boundaries.

- [ ] **Step 5: Run execution suite**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/render/timeline-execution.cjs src/full-measure/tests/timeline-execution.test.cjs
git commit -m "feat: segment execution at native color windows"
```

---

### Task 6: Compile relationship → Color Drift → native decompression in one renderer path

**Files:**
- Modify: `src/full-measure/src/render/timeline-filter.cjs`
- Modify: `src/full-measure/tests/timeline-filter.test.cjs` or the existing compiler test file that currently proves Color Drift.

**Interfaces:**
- `rendererValues(state, drift = null, nativeColor = null)`.
- `nativeColorOperator(timeline)` adds compact compiler evidence.
- Every compiled segment records `nativeColor: nativeColorAtTick(timeline, segment.startTick)`.

Composition math is exact:

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

const nativeInfluence = clamp(Number(nativeColor?.nativeInfluence) || 0, 0, 1);
const hue = quantize(baseHue * (1 - nativeInfluence));
const saturation = quantize(
  relationshipSaturation * (1 - nativeInfluence) +
  (Number(nativeColor?.nativeSaturationTarget) || 1) * nativeInfluence,
);
```

Contrast/brightness/gamma remain unchanged by Native Color v1.

- [ ] **Step 1: Write failing renderer-value order test**

Use one fixed state and drift. Assert:

```js
const counter = rendererValues(state, drift, {
  relationshipHueOffset: 54,
  relationshipSaturationMultiplier: 1.1,
  nativeInfluence: 0,
  nativeSaturationTarget: 1,
});
const returned = rendererValues(state, drift, {
  relationshipHueOffset: 54,
  relationshipSaturationMultiplier: 1.1,
  nativeInfluence: 0.68,
  nativeSaturationTarget: 0.98,
});
assert.ok(Math.abs(returned.hue) < Math.abs(counter.hue));
assert.ok(Math.abs(returned.saturation - 0.98) < Math.abs(counter.saturation - 0.98));
```

This proves decompression happens after relationship + Color Drift rather than replacing Color Drift upstream.

- [ ] **Step 2: Run RED**

Expected: current `rendererValues` has no Native Color argument/evidence.

- [ ] **Step 3: Compile Native Color for every execution segment**

Call `nativeColorAtTick(execution.timeline, segment.startTick)` in both Possession Arc and non-arc branches. Feed that state to `numericFilters`/`rendererValues`.

- [ ] **Step 4: Add operator/compiler evidence**

When Native Color is present, include:

```js
{
  axis: "nativeColor",
  compiler: "native-color-witness-v1",
  profileSha256: timeline.nativeColor.profileSha256,
  planSha256: timeline.nativeColor.planSha256,
  relationship: timeline.nativeColor.relationship,
  windowCount: timeline.nativeColor.windowCount,
}
```

Also include per-segment Native Color state in compiler semantic evidence, but not raw image/profile statistics repeated per segment.

- [ ] **Step 5: Prove no-image compatibility**

Compile the same old fixture timeline with no `nativeColor`; graph, operators, and renderer values must remain exactly the pre-feature behavior expected by existing fixtures.

- [ ] **Step 6: Run compiler + Color Drift suites**

```bash
node --test \
  src/full-measure/tests/native-color.test.cjs \
  src/full-measure/tests/timeline-execution.test.cjs \
  src/full-measure/tests/timeline-filter.test.cjs \
  src/full-measure/tests/color-drift.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/full-measure/src/render/timeline-filter.cjs src/full-measure/tests
git commit -m "feat: compile chromatic decompression after Color Drift"
```

---

### Task 7: Put Native Color evidence into candidate preview/final receipt without creating a second path

**Files:**
- Modify: `src/full-measure/src/main.cjs`
- Modify: `src/full-measure/src/render/render.cjs`
- Modify: `src/full-measure/src/render/candidate-preview.cjs` only if inspection proves it does not already consume the accepted timeline compiler.
- Modify receipt/render tests.

**Interfaces:**
- Final render receives `nativeChromaticProfile` only from bound candidate-session execution.
- Canonical Native Color authority remains `resolvedTimeline.nativeColor`; the profile is receipt evidence and a hash-bound input, not a second renderer plan.

Receipt treatment shape:

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

`render.visualCompiler.operators` already carries compiler-side plan evidence from Task 6.

- [ ] **Step 1: Write failing receipt evidence test**

Assert a resolved Native Color render records exactly the compact treatment evidence above and that receipt `canonicalExecution.timelineHash` equals the Native-Color-bearing accepted timeline hash.

- [ ] **Step 2: Run RED**

Expected: receipt lacks Native Color treatment evidence.

- [ ] **Step 3: Carry profile evidence from candidate session through main**

Where main gets accepted execution, pass the bound `nativeChromaticProfile` to `renderVideo`. Never accept a renderer-process profile object when no selected execution exists.

- [ ] **Step 4: Serialize compact evidence in `render.cjs`**

Do not include raw sampled RGB, temp paths, or redundant per-pixel statistics in the video receipt.

- [ ] **Step 5: Inspect candidate preview parity**

If `candidate-preview.cjs` already calls the shared timeline compiler, add only a regression assertion that preview operator evidence includes Native Color. If it compiles a separate semantic path, route it through the same `compileTimelineFilterGraph` Native Color helpers rather than duplicating the math.

- [ ] **Step 6: Run smoke + full verification**

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/full-measure/src/main.cjs src/full-measure/src/render src/full-measure/tests
git commit -m "feat: receipt-bind Native Color Witness"
```

---

### Task 8: Field proof with the same image under echo and counterpoint

**Files:**
- No production changes unless the field proof exposes a Native-Color-caused defect.
- Update issue #115/PR evidence after proof.

**Interfaces:**
- Produces the Native Color acceptance evidence consumed by the alpha.8 release gate.

- [ ] **Step 1: Run final branch verification**

```bash
npm run verify
```

Expected: PASS.

- [ ] **Step 2: Use one distinctive-color source image and one multi-section song**

Generate enough deterministic candidates to select one `echo` and one `counterpoint` candidate from the same image/profile and source song.

- [ ] **Step 3: Compare canonical evidence before visual judgment**

Prove:

```text
same source image SHA-256
same NativeChromaticProfile SHA-256
same profile policy
relationship differs: echo vs counterpoint
plan hashes differ
both have exactly one decompression window
preview/final timeline hashes agree for each selected candidate
```

- [ ] **Step 4: Human visual witness**

Confirm both:

1. `echo` and `counterpoint` are materially distinguishable before the decompression event;
2. during the recorded window, each visibly moves back toward the photograph's native chromatic character rather than farther away.

- [ ] **Step 5: Preserve evidence, do not tune a taxonomy**

Record screenshot/frame timestamps and receipt hashes. If one relationship is weak, tune only the bounded v1 numeric constants and rerun the same specimen. Do not add a third relationship class, segmentation, masks, or semantic vision in this slice.

- [ ] **Step 6: Stop**

Native Color v1 is complete when the deterministic profile, two relationships, one return event, preview/render parity, and receipt evidence are proven on the packaged renderer path.
