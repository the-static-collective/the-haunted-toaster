# FFmpeg Render Failure Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve a compact, reproducible sibling evidence bundle whenever score-driven FFmpeg rendering exits abnormally, without changing accepted renderer semantics or successful-render cleanup.

**Architecture:** Enrich `runProcess` failures with structured process metadata while preserving the existing concise human error string. Add a focused render-failure evidence module that serializes sanitized process, graph, score, timeline, source, build, and compiler evidence into `<output>.render-failure/`; call it only after the score-driven render has reached the FFmpeg execution boundary and only for abnormal process exits, then continue the existing failed-render cleanup. Keep root-cause remediation out of this slice: the first preserved real crash bundle becomes the input to one-variable filter-family isolation.

**Tech Stack:** Node.js CommonJS, `node:test`, filesystem/promises, crypto SHA-256, FFmpeg/FFprobe metadata already exposed by Full Measure.

## Global Constraints

- Current `main` is product authority; do not port divergent historical renderer behavior.
- Failed rendering must never leave a receipt claiming successful completion.
- Preserve `VisualScore -> ResolvedTimeline -> renderer -> sidecars -> receipt` authority and preview/render parity.
- No candidate ban, random retry, swscale workaround, or semantic renderer change in this slice.
- Do not preserve a partial MP4 by default.
- Avoid absolute local paths in the failure bundle; use basenames, hashes, and explicit diagnostic fields.
- Successful renders keep current cleanup behavior and do not leave a `.render-failure` directory.
- Existing accepted video receipt semantics remain unchanged.

---

### Task 1: Preserve structured process-failure evidence

**Files:**
- Modify: `src/full-measure/src/render/tooling.cjs`
- Test: `src/full-measure/tests/render-failure-evidence.test.cjs`

**Interfaces:**
- Consumes: `runProcess(binary, args, options)`.
- Produces: rejected `Error` objects with `processFailure = { binary, code, signal, stdout, stderr }` for abnormal non-cancelled process exits; existing error message remains concise and tail-limited.

- [ ] **Step 1: Write the failing test**

Create a test that runs `process.execPath` with a tiny script that writes distinct stderr lines and exits `7`; assert the rejected error includes `processFailure.code === 7`, full stderr including the first line, and a basename-only binary identity while the visible error message remains bounded.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/full-measure/tests/render-failure-evidence.test.cjs`

Expected: FAIL because `processFailure` is absent.

- [ ] **Step 3: Write minimal implementation**

Attach an immutable structured metadata object to the existing rejected error in the non-zero exit path. Do not alter cancellation semantics or successful return values.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/full-measure/tests/render-failure-evidence.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: retain structured FFmpeg process failure evidence`

---

### Task 2: Write a sanitized sibling render-failure bundle

**Files:**
- Create: `src/full-measure/src/render/render-failure-evidence.cjs`
- Modify: `src/full-measure/tests/render-failure-evidence.test.cjs`

**Interfaces:**
- Consumes: `{ outputPath, error, filterPath, ffmpegArgs, visualScore, resolvedTimeline, buildInfo, sourceAudio, sourceImage, visualCompiler, jobId, startedAt, lastProgress }`.
- Produces: `writeRenderFailureBundle(input) -> { directory, failurePath }` with files `failure.json`, `render.ffgraph`, `visual-score.json`, `resolved-timeline.json`, `ffmpeg-args.json`, `ffmpeg.stderr.log`.

- [ ] **Step 1: Write the failing test**

Use a temporary directory and synthetic score/timeline/graph/process failure. Assert all six files exist; `failure.json` contains basename-only source identities, build identity, exit code/signal, graph hash, timeline/profile/compiler evidence, job id, and last progress; `ffmpeg-args.json` replaces path-bearing source/filter/output arguments with basenames; full stderr is byte-preserved; no absolute temp path appears anywhere in JSON/log evidence.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/full-measure/tests/render-failure-evidence.test.cjs`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement pure sanitization helpers plus `writeRenderFailureBundle`. Use existing canonical serialization for score/timeline where available and SHA-256 the exact graph text. Recreate the sibling directory on each failed attempt so stale evidence cannot mix with a new crash.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/full-measure/tests/render-failure-evidence.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: preserve score-driven render failure bundle`

---

### Task 3: Integrate failure preservation at the FFmpeg boundary

**Files:**
- Modify: `src/full-measure/src/render/render.cjs`
- Modify: `src/full-measure/tests/render-failure-evidence.test.cjs`

**Interfaces:**
- Consumes: structured `processFailure` from Task 1 and `writeRenderFailureBundle` from Task 2.
- Produces: abnormal score-driven FFmpeg exits preserve diagnostic evidence before normal failed-render cleanup and temp-directory removal; non-process failures retain current behavior.

- [ ] **Step 1: Write the failing integration-contract test**

Assert the score-driven renderer wires a process-failure capture context only after the graph and FFmpeg arguments exist, records progress through `lastProgress`, writes the bundle before cleanup, and does not write a successful receipt from the failure path. Keep this contract narrow enough to avoid invoking a full multi-minute render fixture.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/full-measure/tests/render-failure-evidence.test.cjs`

Expected: FAIL because `render.cjs` does not call the evidence writer.

- [ ] **Step 3: Write minimal implementation**

Track the graph path, FFmpeg args, compiler evidence, media probes/hashes, and last progress in render-scope variables. In `catch`, when `error.processFailure` exists and the graph/args have been resolved, write the sibling failure bundle first; then perform the existing output/sidecar cleanup and rethrow the original render error. Failure-bundle write errors should be attached as diagnostic context without replacing the original FFmpeg failure.

- [ ] **Step 4: Run focused and repository proof**

Run:

```bash
node --test src/full-measure/tests/render-failure-evidence.test.cjs
npm run verify
```

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: preserve failed FFmpeg performance before cleanup`

---

### Task 4: Package/CI proof and field handoff

**Files:**
- No production files unless proof exposes a branch-caused defect.

**Interfaces:**
- Produces: green repo verification and Windows package proof; leaves #116 open for real-candidate reproduction/root-cause isolation unless the exact field crash is reproduced and isolated.

- [ ] **Step 1: Run GitHub verification on the final branch head**

Expected: `Verify renderer` passes.

- [ ] **Step 2: Run Windows packaging proof on the final branch head**

Expected: `Build Windows demo` passes and artifact upload succeeds.

- [ ] **Step 3: Inspect review/CI state**

Resolve branch-caused failures only; do not expand scope into renderer workarounds.

- [ ] **Step 4: Field handoff**

Use the known failing candidate with the same source media in the packaged appliance. Confirm `<output>.render-failure/` survives and contains the full graph/log/score/timeline evidence. Compare against a successful candidate and isolate frame-0-active operator families one variable at a time. The repeated swscaler warning remains a lead, not a verdict.

- [ ] **Step 5: Issue disposition**

Keep #116 open until the preserved real specimen identifies the failing seam or provides enough evidence to state why reproduction is blocked. Do not use `Closes #116` on a diagnostics-only PR.
