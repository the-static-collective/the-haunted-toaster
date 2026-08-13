# UI Witness Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Haunted Toaster renderer visually witnessable at every relevant commit/PR without turning the witness surface into a second product implementation.

**Architecture:** Keep `src/full-measure/src/renderer/` as the interface authority. A build script copies those exact assets into a disposable static witness output and injects a deterministic fake `window.fullMeasure` bridge before production renderer scripts run. Vercel publishes that output; Playwright captures a small canonical screenshot set; Electron/package proof remains a separate stronger gate for bridge/native boundaries.

**Tech Stack:** Electron renderer HTML/CSS/JavaScript, Node.js 24, JSDOM, Playwright Chromium, GitHub Actions, Vercel static deployment.

## Global Constraints

- Issue authority: #122.
- Preserve `archive/gold-star-renderer-alpha7` and current six-up behavior.
- No creative renderer, VisualScore, ResolvedTimeline, Listener recognition, or FFmpeg semantics change in this plan.
- The browser witness is non-authoritative and must not become a web edition of the Toaster.
- Renderer assets in `src/full-measure/src/renderer/` remain the production interface authority.
- Screenshot baselines change only with an explicit intended visual delta.
- Keep Electron/local-first execution authority unchanged.

---

## File Structure

- Create `src/full-measure/witness/witness-bridge.js` — deterministic browser-only implementation of the existing `window.fullMeasure` interface.
- Create `src/full-measure/witness/witness-controller.js` — query-string/state controls that place the real renderer into canonical witness states.
- Create `src/full-measure/scripts/build-ui-witness.cjs` — copy production renderer assets and inject witness scripts into generated HTML.
- Create `src/full-measure/tests/ui-witness-build.test.cjs` — prove the generated witness contains production assets, correct script order, build identity, and no independent UI markup.
- Create `src/full-measure/tests/ui-witness.spec.cjs` — Playwright screenshot/interaction proof for canonical witness states.
- Create `src/full-measure/tests/ui-witness-baselines/` — reviewed PNG baselines for the small canonical state set.
- Modify `src/full-measure/package.json` and lockfile — add witness build/test commands and Playwright dev dependency.
- Modify `.github/workflows/haunted-toaster.yml` — run browser witness proof and upload screenshots/diffs.
- Create root `vercel.json` — build and publish `src/full-measure/witness-dist`.
- Modify `src/full-measure/src/renderer/index.html` — remove stale static Porchlight slate vocabulary so pre-script markup does not contradict Open Field runtime truth.
- Modify `src/full-measure/tests/renderer-ui-integration.test.cjs` — assert the initial DOM and booted DOM agree on Open Field vocabulary.
- Modify `AGENTS.md` — add repository-specific UI Witness completion fields.

---

### Task 1: Remove Existing Static/Runtime UI Drift

**Files:**
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/tests/renderer-ui-integration.test.cjs`

**Interfaces:**
- Consumes: existing `window.startingField` and `app.js` Open Field initialization.
- Produces: static and booted DOM both identify the neutral starting state as Open Field.

- [ ] **Step 1: Write the failing initial-DOM test**

Add a test that inspects `html` before any renderer script is evaluated:

```js
test("raw renderer markup does not claim Porchlight as the default starting field", () => {
  const dom = new JSDOM(html);
  const slate = dom.window.document.querySelector("#slateGarment");
  assert.equal(slate.textContent.trim(), "Open Field");
  assert.equal(dom.window.document.body.textContent.includes("Garment\n              Porchlight"), false);
  dom.window.close();
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npm --prefix src/full-measure test -- --test-name-pattern="raw renderer markup"
```

Expected: FAIL because raw HTML currently says `Porchlight` in `#slateGarment`.

- [ ] **Step 3: Make the smallest production markup correction**

Change the render-slate label/value so raw markup is neutral and truthful:

```html
<dt>Starting field</dt>
<dd id="slateGarment">Open Field</dd>
```

Do not rename JavaScript identifiers in this task; the semantic refactor belongs to #123.

- [ ] **Step 4: Run renderer UI integration tests**

Run:

```bash
npm --prefix src/full-measure test -- --test-name-pattern="renderer|starting field|raw renderer markup"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/renderer/index.html src/full-measure/tests/renderer-ui-integration.test.cjs
git commit -m "fix: align raw renderer starting-field state"
```

---

### Task 2: Build a Disposable Witness from Production Renderer Assets

**Files:**
- Create: `src/full-measure/scripts/build-ui-witness.cjs`
- Create: `src/full-measure/tests/ui-witness-build.test.cjs`
- Modify: `src/full-measure/package.json`

**Interfaces:**
- Produces: `buildUiWitness({ rootDir, outputDir, commit }) -> { outputDir, rendererFiles, commit }`.
- Generated output: `src/full-measure/witness-dist/` (ignored/uncommitted build artifact).

- [ ] **Step 1: Write the failing build test**

The test must require exact production files to be copied and witness scripts to appear before `starting-field-controller.js`:

```js
test("UI witness is generated from production renderer assets", () => {
  const result = buildUiWitness({
    rootDir,
    outputDir: tempDir,
    commit: "deadbeef",
  });
  const generated = fs.readFileSync(path.join(tempDir, "index.html"), "utf8");
  const production = fs.readFileSync(path.join(rootDir, "src", "renderer", "index.html"), "utf8");

  assert.equal(result.commit, "deadbeef");
  assert.match(generated, /witness-bridge\.js/);
  assert.ok(generated.indexOf("witness-bridge.js") < generated.indexOf("starting-field-controller.js"));
  assert.equal(fs.readFileSync(path.join(tempDir, "styles.css"), "utf8"), fs.readFileSync(path.join(rootDir, "src", "renderer", "styles.css"), "utf8"));
  assert.match(generated, /data-ui-witness-commit="deadbeef"/);
  assert.ok(production.includes("./styles.css"));
});
```

- [ ] **Step 2: Run the test and confirm the module is missing**

Run:

```bash
node --test src/full-measure/tests/ui-witness-build.test.cjs
```

Expected: FAIL because `build-ui-witness.cjs` does not exist.

- [ ] **Step 3: Implement the build script**

Implement `buildUiWitness` with these exact rules:

```js
const RENDERER_FILES = [
  "styles.css",
  "candidate-ui.css",
  "listener-transport.css",
  "starting-field-controller.js",
  "app.js",
  "candidate-ui.js",
  "lyric-foundry-ui.js",
  "sync-keyboard.js",
];
```

Read production `src/renderer/index.html`, inject:

```html
<script src="./witness-bridge.js"></script>
<script src="./witness-controller.js"></script>
```

immediately before the first production renderer script, add `data-ui-witness-commit="<sha>"` to `<body>`, copy the listed renderer files byte-for-byte, copy `witness/*.js`, and write only to the supplied output directory.

Export the function and run it when invoked as a CLI. Derive the CLI commit from `VERCEL_GIT_COMMIT_SHA || GITHUB_SHA || "local"`.

- [ ] **Step 4: Add the package command**

Add:

```json
"witness:build": "node scripts/build-ui-witness.cjs"
```

Do not commit `witness-dist`.

- [ ] **Step 5: Run the focused build proof**

Run:

```bash
node --test src/full-measure/tests/ui-witness-build.test.cjs
npm --prefix src/full-measure run witness:build
```

Expected: PASS and `src/full-measure/witness-dist/index.html` created locally.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/scripts/build-ui-witness.cjs src/full-measure/tests/ui-witness-build.test.cjs src/full-measure/package.json src/full-measure/package-lock.json src/full-measure/.gitignore
git commit -m "feat: build browser witness from renderer authority"
```

---

### Task 3: Implement the Deterministic Witness Bridge and Canonical States

**Files:**
- Create: `src/full-measure/witness/witness-bridge.js`
- Create: `src/full-measure/witness/witness-controller.js`
- Modify: `src/full-measure/tests/ui-witness-build.test.cjs`

**Interfaces:**
- Produces: browser global `window.fullMeasure` with the same callable names the renderer expects.
- Produces: query parameter `?state=<name>` where name is one of `empty`, `song-ready`, `starting-field`, `six-up`, `listener`, `rendering`, `complete`, `failure`.

- [ ] **Step 1: Extend the failing test to require canonical states**

Assert the witness controller contains exactly:

```js
const CANONICAL_WITNESS_STATES = Object.freeze([
  "empty",
  "song-ready",
  "starting-field",
  "six-up",
  "listener",
  "rendering",
  "complete",
  "failure",
]);
```

and that unknown states fall back to `empty`.

- [ ] **Step 2: Implement the fake bridge**

Mirror the stable methods already supplied by `renderer-ui-integration.test.cjs`: `chooseAudio`, `chooseImage`, `chooseLyrics`, `chooseOutput`, `inspectAudio`, `fileUrl`, `inspectLyrics`, Listener methods, candidate methods, render methods, Build Info methods, and event subscriptions.

All returned values must be literals or deterministic functions of inputs. Do not use `Date.now()`, `Math.random()`, fetch, network requests, filesystem APIs, or native dialogs.

Use a fixed specimen:

```js
const SPECIMEN = Object.freeze({
  audioPath: "/witness/specimen.wav",
  duration: 30,
  buildVersion: "0.5.0-alpha.7",
  commit: document.body.dataset.uiWitnessCommit || "local",
});
```

- [ ] **Step 3: Implement canonical state orchestration**

The controller must drive the real UI by clicking/filling its existing controls rather than manually adding replacement DOM. Example for `song-ready`:

```js
await window.__uiWitness.loadSong();
document.documentElement.dataset.witnessState = "song-ready";
```

For `failure`, configure the fake bridge's next render to reject with `new Error("Witness refusal specimen")` and drive the real render button.

- [ ] **Step 4: Run JSDOM/build tests**

Run:

```bash
node --test src/full-measure/tests/ui-witness-build.test.cjs
npm --prefix src/full-measure test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/witness src/full-measure/tests/ui-witness-build.test.cjs
git commit -m "feat: add deterministic renderer witness states"
```

---

### Task 4: Add Real-Browser Screenshot Witnesses

**Files:**
- Create: `src/full-measure/tests/ui-witness.spec.cjs`
- Create: `src/full-measure/tests/ui-witness-baselines/*.png`
- Modify: `src/full-measure/package.json`
- Modify: `src/full-measure/package-lock.json`

**Interfaces:**
- Consumes: generated `witness-dist` and canonical state query parameter.
- Produces: reviewed screenshots at 1380x900 viewport.

- [ ] **Step 1: Add Playwright as a locked dev dependency**

Run:

```bash
npm --prefix src/full-measure install --save-dev @playwright/test
```

- [ ] **Step 2: Write the screenshot test**

Use one Chromium project and a fixed viewport:

```js
const { test, expect } = require("@playwright/test");

for (const state of ["empty", "song-ready", "starting-field", "six-up", "listener", "rendering", "complete", "failure"]) {
  test(`witness ${state}`, async ({ page }) => {
    await page.setViewportSize({ width: 1380, height: 900 });
    await page.goto(`${process.env.UI_WITNESS_URL}?state=${state}`);
    await expect(page.locator("html")).toHaveAttribute("data-witness-ready", "true");
    await expect(page).toHaveScreenshot(`${state}.png`, { animations: "disabled", fullPage: true });
  });
}
```

The witness controller must set `data-witness-ready="true"` only after the state is fully materialized.

- [ ] **Step 3: Add scripts for local proof**

Add commands equivalent to:

```json
"witness:serve": "node scripts/serve-ui-witness.cjs",
"witness:test": "playwright test tests/ui-witness.spec.cjs"
```

If a static server helper is needed, create `scripts/serve-ui-witness.cjs` using Node's built-in `http` and no additional server dependency.

- [ ] **Step 4: Generate and review the initial baseline set**

Run:

```bash
npm --prefix src/full-measure run witness:build
npx --prefix src/full-measure playwright install chromium
UI_WITNESS_URL=http://127.0.0.1:4173 npm --prefix src/full-measure run witness:test -- --update-snapshots
```

Inspect all eight images before committing. No baseline should contain clipped panels, missing labels, unexplained Porchlight defaults, or witness-only furniture inside the appliance itself.

- [ ] **Step 5: Run without baseline updates**

Run the same test without `--update-snapshots`.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/package.json src/full-measure/package-lock.json src/full-measure/tests/ui-witness.spec.cjs src/full-measure/tests/ui-witness-baselines src/full-measure/scripts/serve-ui-witness.cjs
git commit -m "test: witness canonical renderer appearance"
```

---

### Task 5: Publish the Existing Vercel Deployment Stream as the Witness Window

**Files:**
- Create: `vercel.json`
- Modify: `src/full-measure/tests/ui-witness-build.test.cjs`

**Interfaces:**
- Consumes: Vercel `VERCEL_GIT_COMMIT_SHA`.
- Produces: static deployment from `src/full-measure/witness-dist`.

- [ ] **Step 1: Add a test for deployment configuration**

Assert root `vercel.json` contains:

```json
{
  "buildCommand": "npm --prefix src/full-measure ci && npm --prefix src/full-measure run witness:build",
  "outputDirectory": "src/full-measure/witness-dist"
}
```

- [ ] **Step 2: Create `vercel.json` exactly with that build/output contract**

Do not add serverless functions or API routes.

- [ ] **Step 3: Push a branch commit and inspect the Vercel preview**

Required witness:

- root URL returns HTTP 200;
- page title is the real renderer title;
- body contains the deployment commit SHA;
- `?state=listener` and `?state=six-up` reach ready states;
- no network upload path is introduced.

- [ ] **Step 4: Commit**

```bash
git add vercel.json src/full-measure/tests/ui-witness-build.test.cjs
git commit -m "build: publish renderer witness on Vercel"
```

---

### Task 6: Make UI Witness Proof Part of Toaster Completion

**Files:**
- Modify: `.github/workflows/haunted-toaster.yml`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces: GitHub Actions artifact `haunted-toaster-ui-witness` containing screenshots and any visual diffs.

- [ ] **Step 1: Add a CI job after `verify`**

The job must:

```text
checkout
setup Node 24
npm --prefix src/full-measure ci
npm --prefix src/full-measure run witness:build
npx --prefix src/full-measure playwright install --with-deps chromium
start witness static server
run witness:test without --update-snapshots
upload screenshot/diff artifacts even on failure
```

Do not gate unrelated non-UI source semantics on Vercel availability; the local generated witness is the CI input.

- [ ] **Step 2: Add repository completion vocabulary to `AGENTS.md`**

Add:

```text
UI impact: none | behavioral | visual | bridge
browser witness: PASS/FAIL @ commit
visual delta: expected | none | unexplained
packaged witness required: yes | no
packaged witness: PASS/FAIL/not-required
GitBook ontology changed: yes | no
```

State that browser witness never substitutes for packaged Electron proof when preload/IPC/native behavior changed.

- [ ] **Step 3: Run the complete local proof**

Run:

```bash
npm --prefix src/full-measure ci
npm run verify
npm --prefix src/full-measure test
npm --prefix src/full-measure run witness:build
UI_WITNESS_URL=http://127.0.0.1:4173 npm --prefix src/full-measure run witness:test
```

Expected: all semantic and visual tests pass.

- [ ] **Step 4: Push and require the GitHub Actions witness artifact**

Confirm the PR run uploads screenshots and that the Vercel PR deployment visually matches the same commit.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/haunted-toaster.yml AGENTS.md
git commit -m "ci: require renderer UI witness proof"
```

---

## Self-Review Checklist

- #122 acceptance is covered by Tasks 1-6.
- The witness contains no independent production UI implementation.
- Vercel is a witness only; Electron remains product authority.
- Semantic tests and visual tests remain distinct claims.
- Gold Star renderer behavior is not modified.
- No task introduces Toast Feel semantics; that belongs to #123.
- No placeholder/TODO step is required for completion.
