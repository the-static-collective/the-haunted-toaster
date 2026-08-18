# Magnetic Crop Invariant Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair `dynamics-magnetic-v1` so its time-varying scale can never become smaller than the fixed witness crop, while preserving the existing magnetic motion grammar and alpha.9 replay/compiler identity.

**Architecture:** Keep the existing magnetic oscillator (`0.94 + 0.06*sin(t*0.83)`) and crop behavior, but derive the pre-expansion from the oscillator's lower bound plus a small safety margin instead of the unsafe fixed `1.1`. Prove the emitted FFmpeg program's minimum dimensions are always at least the crop dimensions, then retain the packaged Windows field witness as the final causal gate.

**Tech Stack:** Node.js 22+, `node:test`, CommonJS renderer modules, FFmpeg filter graph generation, GitHub Actions.

## Global Constraints

- Work from alpha.9 PR #131 head lineage; do not merge/tag/release alpha.9 from this repair.
- Preserve `dynamics-magnetic-v1` identity and the visible oscillator frequency/amplitude.
- Do not suppress candidates, add random retries, or treat `swscaler` warnings as the root cause.
- Keep issue #116 open until a repaired Windows package survives a magnetic render beyond the ~4.44 s first unsafe boundary.
- No unrelated UI, lyric, topology, or atmosphere changes.

---

### Task 1: Prove the magnetic crop invariant fails on the current renderer

**Files:**
- Modify: `src/full-measure/tests/primitive-field.test.cjs`

**Interfaces:**
- Consumes: `dynamicsProgram(kind, width, height)` from `src/full-measure/src/render/primitive-field.cjs`.
- Produces: a regression test that inspects the emitted magnetic scale dimensions and verifies the oscillator lower bound cannot make either dimension smaller than the crop.

- [ ] **Step 1: Write the failing test**

```js
const { dynamicsProgram } = require("../src/render/primitive-field.cjs");

test("magnetic dynamics never shrinks below the fixed crop", () => {
  const width = 1920;
  const height = 1080;
  const program = dynamicsProgram("magnetic", width, height);
  const dimensions = program.match(/scale=w='(\d+)\*\(0\.94\+0\.06\*sin\(t\*0\.83\)\)':h='(\d+)\*\(0\.94\+0\.06\*sin\(t\*0\.83\)\)'/);
  assert.ok(dimensions, "magnetic program must expose its animated scale dimensions");
  const minimumScale = 0.94 - 0.06;
  assert.ok(Number(dimensions[1]) * minimumScale >= width);
  assert.ok(Number(dimensions[2]) * minimumScale >= height);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/full-measure/tests/primitive-field.test.cjs`

Expected: FAIL only at `magnetic dynamics never shrinks below the fixed crop`, because current expansion is `1.1` and `1.1 * 0.88 = 0.968 < 1.0`.

### Task 2: Derive a safe magnetic pre-expansion

**Files:**
- Modify: `src/full-measure/src/render/primitive-field.cjs`

**Interfaces:**
- Consumes: width/height and the existing magnetic oscillator constants.
- Produces: the same FFmpeg magnetic grammar with safe initial dimensions.

- [ ] **Step 1: Implement the minimum repair**

Keep the oscillator unchanged and derive expansion from its lower bound:

```js
const MAGNETIC_CENTER_SCALE = 0.94;
const MAGNETIC_SCALE_AMPLITUDE = 0.06;
const MAGNETIC_MINIMUM_SCALE = MAGNETIC_CENTER_SCALE - MAGNETIC_SCALE_AMPLITUDE;
const MAGNETIC_CROP_SAFETY = 1.01;
```

Inside the magnetic branch:

```js
const expansion = MAGNETIC_CROP_SAFETY / MAGNETIC_MINIMUM_SCALE;
const expandedWidth = evenDimension(width * expansion);
const expandedHeight = evenDimension(height * expansion);
```

Continue emitting the existing `0.94+0.06*sin(t*0.83)` expression and the existing x/y magnetic motion.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run: `node --test src/full-measure/tests/primitive-field.test.cjs`

Expected: PASS.

- [ ] **Step 3: Run repository verification**

Run: `npm run verify`

Expected: exit 0 with the full application check, tests, and smoke suite green.

### Task 3: Publish evidence without prematurely closing the field gate

**Files:**
- Update GitHub issue #116 with the four independent packaged magnetic failures, the invariant proof, RED/GREEN commit evidence, and the remaining Windows witness requirement.
- Update PR metadata to reference #116 and explain the bounded repair.
- Record the root-cause hypothesis and repair in GitBook through a change request; do not alter unrelated ontology.

- [ ] **Step 1: Push the tested repair branch and open a PR targeting `agent/alpha9-recovery`.**
- [ ] **Step 2: Confirm GitHub Actions on the exact repair head.**
- [ ] **Step 3: Merge the bounded repair into the alpha.9 branch only after machine gates are green.**
- [ ] **Step 4: Keep #116 open pending a packaged Windows magnetic render past 5 seconds.**
