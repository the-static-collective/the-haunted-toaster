# Haunted Toaster alpha.8 Integration and Release Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate independently reviewed alpha.8 slices on `main`, prove one coherent browser + packaged Windows witness, bump authoritative identity to `0.5.0-alpha.8`, and tag only the exact accepted release commit.

**Architecture:** This plan adds no new creative mechanism. It verifies one main-line head contains render-failure evidence, UI Witness, Toastmoods, and Native Color v1; adds small mechanical capability constants/tests where needed; bumps manifest/lockfile together; runs source/browser/package proof; performs one packaged end-to-end field witness; then tags the exact proven `main` commit. Universal H.264 is the required transport witness. Efficient HEVC remains optional/experimental.

## Global constraints

- Version exactly `0.5.0-alpha.8`; tag exactly `v0.5.0-alpha.8`.
- Version authority: `src/full-measure/package.json`; synchronize `src/full-measure/package-lock.json` before tagging.
- Do not move/reuse an existing tag.
- Integrate only merged/reviewed feature slices; no stacked unreviewed release branch.
- Gold Star archive remains recoverable.
- Historical #116 crash reproduction is not required once failure-evidence preservation is present; any **new** release-candidate crash is triaged from preserved evidence.
- UI Witness proves appearance; final packaged Electron witness proves inclusion/preload/IPC/native seams.
- Required successful transport: Universal H.264 `delivery`.
- HEVC `efficient` is experimental and not required to outperform H.264.
- No alpha.9+ research enters release integration.

## File map

- Create `src/full-measure/tests/alpha8-release-contract.test.cjs`.
- Modify `src/full-measure/src/build-capabilities.cjs` and `tests/build-identity.test.cjs`.
- If #119 landed without an exported schema constant, modify `src/full-measure/src/render/render-failure-evidence.cjs` and its existing test only to export/use `RENDER_FAILURE_EVIDENCE_SCHEMA`.
- If #122 landed without an exported witness-policy constant, modify `src/full-measure/scripts/build-ui-witness.cjs` and `tests/ui-witness-build.test.cjs` only to export/use `UI_WITNESS_POLICY`.
- Modify `src/full-measure/package.json` + lockfile for version bump.
- No generation/renderer semantic files change unless integration reveals a cross-slice defect.

---

## Task 1 — Establish the exact integration base

Required state:

```text
failure evidence landed on main
UI Witness landed + browser proof green
Toastmoods landed
Native Color v1 landed
archive/gold-star-renderer-alpha7 resolves
main verify green
```

- [ ] Create integration branch from current accepted `main`; record `git rev-parse HEAD`, `git status --short`, recent log.
- [ ] For every required feature PR, verify its actual merge commit is an ancestor of HEAD with `git merge-base --is-ancestor <merge-sha> HEAD`; do not rely on GitHub's word `merged` alone.
- [ ] `git rev-parse archive/gold-star-renderer-alpha7` must resolve; do not move it.
- [ ] Run `npm run verify` before release-only changes. Any failure routes back to owning slice.
- [ ] Commit nothing in this preflight task.

---

## Task 2 — Define exact mechanical alpha.8 capability contracts

**Files:** release-contract test, build-capabilities, build-identity; possibly the two policy-constant-only edits named below.

The four alpha.8 capability strings are exact:

```text
uiWitnessV1
toastFeelV1
nativeColorWitnessV1
renderFailureEvidenceV1
```

The capability test must import real stable constants, not search source text.

### Failure evidence constant

PR #119 currently writes the schema literal `full-measure.render-failure.v1` but does not export a constant. If that remains true after merge, make the narrow compatibility edit:

```js
const RENDER_FAILURE_EVIDENCE_SCHEMA = "full-measure.render-failure.v1";
```

Use it in `failure.schema` and export it from `render-failure-evidence.cjs`. Extend the existing failure-evidence test to require the exact constant/schema. No failure behavior changes.

### UI Witness constant

#122's implementation plan creates `scripts/build-ui-witness.cjs`. Require it to export:

```js
const UI_WITNESS_POLICY = "ui-witness-v1";
```

Its build result includes `policy: UI_WITNESS_POLICY`; `ui-witness-build.test.cjs` asserts it. If #122 already lands an equivalent exact exported constant, use that instead and do not rename it during release integration.

### Release contract

Create `tests/alpha8-release-contract.test.cjs`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { deriveBuildCapabilities } = require("../src/build-capabilities.cjs");
const { TOAST_FEEL_CONTRACT, TOAST_FEELS } = require("../src/toast-feels.cjs");
const { NATIVE_COLOR_POLICY, RELATIONSHIPS } = require("../src/generation/native-color.cjs");
const { RENDER_FAILURE_EVIDENCE_SCHEMA } = require("../src/render/render-failure-evidence.cjs");
const { UI_WITNESS_POLICY } = require("../scripts/build-ui-witness.cjs");

test("alpha.8 source exposes the bounded release surfaces", () => {
  assert.equal(TOAST_FEEL_CONTRACT, "toast-feel-v1");
  assert.equal(TOAST_FEELS.length, 7);
  assert.equal(NATIVE_COLOR_POLICY, "native-color-witness-v1");
  assert.deepEqual(RELATIONSHIPS, ["echo", "counterpoint"]);
  assert.equal(RENDER_FAILURE_EVIDENCE_SCHEMA, "full-measure.render-failure.v1");
  assert.equal(UI_WITNESS_POLICY, "ui-witness-v1");
  const build = deriveBuildCapabilities();
  for (const capability of ["uiWitnessV1","toastFeelV1","nativeColorWitnessV1","renderFailureEvidenceV1"]) {
    assert.ok(build.capabilities.includes(capability), capability);
  }
});
```

`deriveBuildCapabilities()` derives each capability from these real contracts, not package version text.

- [ ] Write test and confirm RED only for missing capability/constant contracts.
- [ ] Add missing exact policy constants narrowly if required.
- [ ] Extend build capabilities and `build-identity.test.cjs` so packaged Build Info reports same capability set.
- [ ] Run release-contract + build-identity + any touched failure/UI-witness focused tests.
- [ ] Commit `test: define alpha.8 release capability contract`.

---

## Task 3 — Bump manifest and lockfile identity together

- [ ] Confirm/extend identity test:

```js
assert.equal(manifest.version, lockfile.version);
assert.equal(lockfile.packages[""].version, manifest.version);
```

- [ ] Run it before edit to prove current identity is internally consistent.
- [ ] Set only `src/full-measure/package.json` version to `0.5.0-alpha.8`.
- [ ] From `src/full-measure`, run `npm install --package-lock-only --ignore-scripts` (or the repo's landed equivalent) to synchronize lock identity.
- [ ] Inspect diff; reject unrelated dependency churn.
- [ ] Run build-identity test and `npm --prefix src/full-measure run check`.
- [ ] Commit `chore: bump Haunted Toaster to alpha.8`.

---

## Task 4 — Prove source + browser witness on the exact release-candidate head

- [ ] Run `npm run verify`.
- [ ] Run the exact UI Witness build/test commands landed by #122.
- [ ] Required UI disposition:

```text
UI impact: visual + behavioral
browser witness: PASS @ <candidate SHA>
visual delta: expected | none (never unexplained)
packaged witness required: yes
GitBook ontology changed: already documented
```

- [ ] Confirm Vercel witness visibly identifies the same candidate commit SHA/build identity.
- [ ] Stop on unexplained screenshot/UI drift; never baseline-update merely to make CI green.

---

## Task 5 — Prove Windows package on the same candidate head

- [ ] Record exact head SHA and push integration branch.
- [ ] Dispatch existing Windows packaging workflow for that head. Expected: Verify renderer success; Build Windows demo success; Publish release skipped because no tag.
- [ ] Inspect artifact names for filesystem-safe naming and expected installer/portable outputs; this guards the earlier slash-in-artifact-name failure class.
- [ ] Launch packaged Build Info and require:

```text
version: 0.5.0-alpha.8
commit: <candidate SHA>
dirty: false
capabilities: uiWitnessV1, toastFeelV1, nativeColorWitnessV1, renderFailureEvidenceV1
```

- [ ] Stop if packaged identity cannot be reconciled with source/browser witness.

---

## Task 6 — Perform one coherent packaged alpha.8 field witness

Canonical release specimen:

```text
one multi-section song
one distinctive-color image
Toast Feel: Wire Heat
six-up Native Color coverage
selected candidate with echo or counterpoint + one decompression window
transport: Universal H.264 / delivery
```

- [ ] Select Wire Heat in packaged UI; witness visible/keyboard-selectable furniture and slate.
- [ ] Generate six. Evidence must include `toastFeel.id=wire-heat`, contract `toast-feel-v1`, profile hash, and both Native Color relationships across candidate timelines.
- [ ] Choose a candidate with one Native Color window; record score address, timeline hash, relationship, plan hash, window ticks.
- [ ] Render Universal H.264 and require:

```text
validation.accepted = true
transportEncoding.profileId = delivery
treatment.toastFeel.id = wire-heat
Native Color profile/plan evidence present
receipt relationship matches accepted timeline
windowCount = 1
Witness Window verified
preview/final semantic evidence agrees
duration delta within existing acceptance threshold
```

- [ ] Human witness the recorded window: chosen relationship is apparent before it and frame treatment moves toward native source chroma during it.
- [ ] Generate MADD CLOWN separately and require `semanticClass=madd-clown`, `stompPolicy=visible-outcome-stomp-v1`, `seedParentScoreRef` present. A second full video is optional unless generation exposes a defect.
- [ ] Optional: same accepted timeline through `efficient`; record compatibility/size without blocking valid H.264 release.
- [ ] If a render fails natively, preserve/inspect `.render-failure`; a new repeatable candidate failure is release evidence, not something to ignore because old #116 was demoted.

---

## Task 7 — Complete review and freeze the accepted commit

- [ ] Run PR Completion review loop focused only on version identity, combined capability contract, browser/package parity, accidental integration semantic changes, and tag safety.
- [ ] Address valid in-scope findings only. Any code change invalidates affected package/field evidence; rerun Tasks 4–6 proportionally.
- [ ] Require green checks, browser witness green, Windows package green, accepted field specimen, zero unresolved in-scope review threads, final head SHA recorded.
- [ ] Merge only with explicit merge authorization at execution time and approved strategy.
- [ ] Fetch final `main`. If merge method changes commit SHA such that prior package evidence is not attributable, package/witness final main before tagging.

---

## Task 8 — Tag/publish only final proven main

- [ ] Confirm `refs/tags/v0.5.0-alpha.8` does not already exist. If it exists, stop; never move it.
- [ ] Confirm manifest returns `0.5.0-alpha.8`, worktree clean, `npm run verify` green.
- [ ] Tag exact proven main SHA and push `v0.5.0-alpha.8`.
- [ ] Let existing `v*` workflow verify/package/publish. Do not manually publish a duplicate release if it succeeds.
- [ ] Verify tag, release commit, package version, artifact names, and packaged Build Info agree.
- [ ] Record final project evidence:

```text
release: v0.5.0-alpha.8
main commit: <sha>
Windows workflow: <run>
browser witness: PASS @ <sha>
packaged witness: PASS
field specimen receipt/output hashes: recorded
Toast Feel: wire-heat
Native Color: <echo|counterpoint> + plan hash
Universal H.264: PASS
historical #116 reproduction: not required; failure-evidence floor present
```

- [ ] Stop and field-mine. Do not pull Compression Pressure, Dynamic Camera, Linear v2, deeper Listener structure, Haunted Memory, semantic color zones, foreign-video ingestion, Exact Return, or two-parent breeding into the tagged release.
