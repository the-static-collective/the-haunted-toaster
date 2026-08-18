# Persistent Video Source + VSPantry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Video as a first-class session source and build one persistent local, deterministic, content-addressed VSPantry capable of cheap bulk admission of hundreds of short MP4/WebM specimens without changing renderer semantics.

**Architecture:** A small `video-pantry` module owns content identity, ffprobe evidence, canonical catalogue persistence, and bulk intake. Electron main/preload expose narrow IPC for choosing/admitting/listing video material; candidate session stores the current session video binding but does not pass it into render execution in Slice A. Renderer UI adds a Video source control and a default-on **Add to VSPantry** option.

**Tech Stack:** Node.js 22 CommonJS, Electron 43, `node:test`, `ffprobe-static`, filesystem/crypto APIs.

**Spec:** `docs/superpowers/specs/2026-08-17-video-source-pantry-toastpacks-memory-design.md`

## Global Constraints

- Video is input evidence/material, not render authority.
- Slice A MUST NOT change FFmpeg render inputs, `VisualScore`, `ResolvedTimeline`, candidate generation semantics, or render receipts.
- One persistent local VSPantry belongs to the Toaster installation/user and is shared across songs/sessions.
- Adding one Video defaults `Add to VSPantry` to `true`; the user can choose ephemeral session-only use.
- v1 supports local `.mp4` and `.webm` only.
- Specimen identity is content-based: raw-byte SHA-256 plus byte length. Filename/path/import time are non-authoritative metadata.
- Re-importing identical bytes is idempotent.
- Catalogue ordering is canonical by specimen identity and independent of filesystem/import order.
- Admission Stage A is cheap: hash + byte length + ffprobe metadata only. Deeper ToastPack analysis is deferred.
- Failed probe/hash/admission MUST NOT create a valid pantry specimen.
- Missing paths remain repairable observations; they MUST NOT mint a new specimen identity.
- Existing no-video behavior must remain unchanged.

---

### Task 1: Toaster home and canonical VSPantry catalogue

**Files:**
- Create: `src/full-measure/src/toaster-home.cjs`
- Create: `src/full-measure/src/video-pantry/schema.cjs`
- Create: `src/full-measure/src/video-pantry/catalog.cjs`
- Test: `src/full-measure/tests/video-pantry.test.cjs`

**Interfaces:**
- `resolveToasterHome({ appDataPath?, env? } = {}) -> string`
- `canonicalSpecimenId({ sha256, byteLength }) -> string`
- `emptyCatalog() -> { schema, specimens }`
- `canonicalizeCatalog(catalog) -> catalog`
- `loadCatalog(catalogPath) -> Promise<catalog>`
- `saveCatalog(catalogPath, catalog) -> Promise<catalog>`
- `upsertSpecimen(catalog, specimen) -> { catalog, inserted }`

- [ ] **Step 1: Write failing tests** proving the same content identity deduplicates, canonical ordering ignores insertion order, and empty/missing catalogue loads safely.
- [ ] **Step 2: Run `npm test -- tests/video-pantry.test.cjs` from `src/full-measure` and verify RED** because the new modules do not exist.
- [ ] **Step 3: Implement minimal schema/home/catalogue modules.** Use atomic write-by-temp-and-rename for catalogue persistence. `canonicalSpecimenId` must validate lowercase/uppercase hex equivalently by normalizing SHA-256 to lowercase.
- [ ] **Step 4: Run the focused test and full `npm test`; verify GREEN.**
- [ ] **Step 5: Commit `feat: add persistent VSPantry catalogue`.**

### Task 2: Deterministic video probe and single-specimen admission

**Files:**
- Create: `src/full-measure/src/video-pantry/probe.cjs`
- Create: `src/full-measure/src/video-pantry/admit.cjs`
- Modify: `src/full-measure/tests/video-pantry.test.cjs`

**Interfaces:**
- `hashFile(filePath) -> Promise<{ sha256, byteLength }>`
- `probeVideo(filePath, { ffprobePath?, execFileImpl? } = {}) -> Promise<probeEvidence>`
- `admitVideo(filePath, { catalogPath, persist = true, probeVideoImpl?, hashFileImpl?, observedAt? }) -> Promise<{ binding, catalog?, inserted }>`

`binding` shape:
```js
{
  schema: 'haunted-toaster/video-source/v1',
  specimenId,
  sourceSha256,
  byteLength,
  path,
  filename,
  probe: {
    durationSeconds,
    width,
    height,
    frameRate,
    container,
    codec,
    hasAudio
  },
  persisted
}
```

- [ ] **Step 1: Add failing tests** for SHA/byte identity, supported `.mp4`/`.webm`, unsupported extension refusal, malformed probe refusal, persistent dedupe, and `persist:false` leaving catalogue unchanged.
- [ ] **Step 2: Run focused tests and verify RED** because probe/admission are missing.
- [ ] **Step 3: Implement minimal probe/admission.** Parse ffprobe JSON deterministically; require one video stream with finite positive dimensions/duration; record rational frame-rate text without floating-point normalization as authority.
- [ ] **Step 4: Run focused + full tests and verify GREEN.**
- [ ] **Step 5: Commit `feat: admit deterministic video specimens`.**

### Task 3: Cheap deterministic folder intake

**Files:**
- Create: `src/full-measure/src/video-pantry/import-folder.cjs`
- Modify: `src/full-measure/tests/video-pantry.test.cjs`

**Interfaces:**
- `listSupportedVideoFiles(folderPath) -> Promise<string[]>`
- `admitVideoFolder(folderPath, { catalogPath, admitVideoImpl? }) -> Promise<{ admitted, duplicates, refused, catalogSize, specimenIds }>`

- [ ] **Step 1: Add failing tests** proving file enumeration order does not affect returned specimen order, duplicate contents collapse, nested directories are not traversed in v1, unsupported files are ignored, and per-file failures are reported without aborting unrelated admissions.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement flat-folder intake.** Sort candidate paths only for stable work scheduling, but sort final identity output by `specimenId`; never make filename/import order semantic.
- [ ] **Step 4: Verify focused + full GREEN.**
- [ ] **Step 5: Commit `feat: add bulk VSPantry intake`.**

### Task 4: Session binding and narrow Electron IPC

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Modify: `src/full-measure/src/main.cjs`
- Modify: `src/full-measure/src/preload.cjs`
- Create: `src/full-measure/tests/video-session.test.cjs`

**Interfaces:**
- Candidate session: `noteVideo(videoBinding)`, `clearVideo()`, `state().video`
- Preload: `chooseVideo(options)`, `chooseVideoFolder()`, `listVideoPantry()`, `clearVideo()`
- IPC: `dialog:choose-video`, `dialog:choose-video-folder`, `video-pantry:list`, `video:clear`

- [ ] **Step 1: Add failing candidate-session tests** proving video binding is stored/cleared and does not appear in `executionForRender(...)` output.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement candidate-session video state only.** Video changes may invalidate candidate materialization conservatively, but Slice A must not add video to render execution.
- [ ] **Step 4: Add IPC/preload contract tests using the existing project test pattern where available; otherwise assert source-level channel exposure in a focused test.**
- [ ] **Step 5: Implement main/preload handlers.** Single-video dialog accepts MP4/WebM; default admission is persistent unless renderer explicitly passes `{ addToPantry: false }`. Folder import returns summary; list returns canonical catalogue; clear only clears session binding.
- [ ] **Step 6: Run focused + full tests and verify GREEN.**
- [ ] **Step 7: Commit `feat: bind video source and VSPantry IPC`.**

### Task 5: Renderer UI source controls

**Files:**
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/src/renderer/app.js`
- Modify: `src/full-measure/src/renderer/styles.css` only if existing source-field styles cannot be reused
- Modify/Create focused renderer DOM test under `src/full-measure/tests/`

**Required DOM contract:**
- a visible `Video` source row/field;
- button to choose one video;
- checkbox labeled `Add to VSPantry`, checked by default;
- button/action to import a video folder;
- human-readable current video name/state;
- small pantry count/import summary;
- clear-video action.

- [ ] **Step 1: Add failing DOM/controller test** asserting default checkbox state and that choose/import/clear call the new preload methods with the expected persistence option.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement minimal UI following existing Song/Image/Lyrics visual grammar.** Do not introduce a timeline editor, clip placement UI, or renderer controls.
- [ ] **Step 4: Verify focused + full tests and run `npm run check`.**
- [ ] **Step 5: Commit `feat: add Video and VSPantry source controls`.**

### Task 6: Slice A acceptance and no-render-semantic-change proof

**Files:**
- Modify tests only if needed to encode discovered regression cases.

- [ ] **Step 1: Run `npm test`.** Expected: all tests pass.
- [ ] **Step 2: Run `npm run check`.** Expected: pass.
- [ ] **Step 3: Run existing smoke/proof command that does not require unavailable host UI resources; at minimum confirm renderer unit/proof suite remains green.**
- [ ] **Step 4: Inspect PR diff and confirm no files under `src/full-measure/src/render/` or `src/full-measure/src/generation/` changed.**
- [ ] **Step 5: Confirm acceptance laws:** ephemeral video works without persistence; duplicate bytes dedupe; folder import canonicalizes; invalid specimens are bounded failures; no-video render path is untouched.
- [ ] **Step 6: Update PR body with exact validation evidence and stop for PR-completion review.**
