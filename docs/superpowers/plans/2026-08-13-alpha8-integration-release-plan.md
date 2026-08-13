# Haunted Toaster alpha.8 Integration and Release Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the already-proven alpha.8 slices on current `main`, prove one coherent browser + packaged Windows witness, bump authoritative version identity to `0.5.0-alpha.8`, and tag only the exact accepted release commit.

**Architecture:** This plan owns no new creative mechanism. It is a release-integration gate over independently reviewed work: render-failure evidence, UI Witness Gate, Toastmoods, and Native Color v1. It first proves all required feature identities are present on one main-line head, then adds a small executable release contract/build-capability check, bumps manifest/lockfile identity together, runs repository/browser/package proof, performs one packaged end-to-end field render, and only then creates the prerelease tag. Universal H.264 is the required transport witness; Efficient HEVC remains optional/experimental.

**Tech Stack:** Node.js CommonJS/node:test, npm lockfile, GitHub Actions Windows packaging/release workflow, Playwright/Vercel UI Witness from #122, Electron packaged appliance, Git tags/releases.

## Global Constraints

- Release version is exactly `0.5.0-alpha.8`; tag is exactly `v0.5.0-alpha.8`.
- Application manifest authority is `src/full-measure/package.json`; synchronize its lockfile version before tagging.
- Do not move or reuse an older tag.
- Release integration begins only after the feature PRs are merged to `main`; do not stack unreviewed feature branches into the release commit.
- Gold Star behavior remains recoverable through `archive/gold-star-renderer-alpha7`.
- Historical FFmpeg crash reproduction is not required if failure-evidence preservation is present; a newly reproduced crash on release-candidate code is release evidence and must be triaged.
- Browser UI Witness is required for interface appearance; packaged Electron witness is required for the final release because preload/IPC/native/package seams matter.
- Universal H.264 (`delivery`) is the required successful release render.
- Efficient HEVC (`efficient`) is optional and experimental; its failure to outperform H.264 is not a release blocker.
- No new alpha.9+ research lane enters this plan.

---

## File Structure

- Create `src/full-measure/tests/alpha8-release-contract.test.cjs` — executable proof that one source tree exposes the required alpha.8 capability surfaces without depending on field-only assertions.
- Modify `src/full-measure/src/build-capabilities.cjs` — advertise only capabilities mechanically derivable from landed code.
- Modify `src/full-measure/tests/build-identity.test.cjs` — require the new mechanically-derived capabilities in packaged build info.
- Modify `src/full-measure/package.json` — version `0.5.0-alpha.8`.
- Modify `src/full-measure/package-lock.json` — root/package identity synchronized to `0.5.0-alpha.8`.
- Modify root/release README/current-boundary text only if it explicitly names alpha.7 as current version; do not use release integration to rewrite conceptual docs.
- No renderer/generation semantic files should change unless integration proof exposes a cross-slice defect.

---

### Task 1: Establish the exact alpha.8 integration head and prerequisites

**Files:**
- No production changes.
- Read current GitHub state for `main`, PRs/issues #116/#119, #122/#124, #123, #115, and PR #125/spec history.

**Interfaces:**
- Produces a release-candidate base SHA that contains every required independently reviewed slice.

Required prerequisite states:

```text
failure evidence: landed on main
UI Witness Gate: landed on main and browser witness green
Toastmoods: landed on main
Native Color v1: landed on main
Gold Star archive branch: still resolves
main verification: green at candidate base SHA
```

- [ ] **Step 1: Fetch current main and verify ancestry**

Record:

```bash
git rev-parse HEAD
git status --short
git log --oneline -12
```

Expected: clean integration branch created from current accepted `main`, not from a stale alpha.7 SHA or a stacked feature branch.

- [ ] **Step 2: Verify each feature is actually in main ancestry**

Use merge commits/PR merge SHAs, not GitHub's word `merged` alone. For each required PR:

```bash
git merge-base --is-ancestor <merge-sha> HEAD
```

Expected: exit 0 for every required merged feature.

- [ ] **Step 3: Verify Gold Star archive still resolves**

```bash
git rev-parse archive/gold-star-renderer-alpha7
```

Expected: a commit SHA; do not move the archive branch.

- [ ] **Step 4: Run pre-version full verification**

```bash
npm run verify
```

Expected: PASS before release-only changes. If it fails, fix/route the owning feature slice rather than hiding the failure in version-bump work.

- [ ] **Step 5: Commit nothing**

This task is a release preflight gate; proceed only from a clean, green, correctly-ancestried base.

---

### Task 2: Add one executable alpha.8 release contract and truthful build capabilities

**Files:**
- Create: `src/full-measure/tests/alpha8-release-contract.test.cjs`
- Modify: `src/full-measure/src/build-capabilities.cjs`
- Modify: `src/full-measure/tests/build-identity.test.cjs`

**Interfaces:**
- `deriveBuildCapabilities()` must mechanically expose these strings when the corresponding code exists:

```text
uiWitnessV1
toastFeelV1
nativeColorWitnessV1
renderFailureEvidenceV1
```

Existing capability strings remain unchanged unless their underlying code actually disappeared.

- [ ] **Step 1: Write the failing release-contract test**

The test imports the actual modules and asserts capabilities from behavior, not version text:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { deriveBuildCapabilities } = require("../src/build-capabilities.cjs");
const { TOAST_FEEL_CONTRACT, TOAST_FEELS } = require("../src/toast-feels.cjs");
const { NATIVE_COLOR_POLICY, RELATIONSHIPS } = require("../src/generation/native-color.cjs");

test("alpha.8 source tree exposes the bounded release surfaces", () => {
  const build = deriveBuildCapabilities();
  assert.equal(TOAST_FEEL_CONTRACT, "toast-feel-v1");
  assert.equal(TOAST_FEELS.length, 7);
  assert.equal(NATIVE_COLOR_POLICY, "native-color-witness-v1");
  assert.deepEqual(RELATIONSHIPS, ["echo", "counterpoint"]);
  for (const capability of [
    "uiWitnessV1",
    "toastFeelV1",
    "nativeColorWitnessV1",
    "renderFailureEvidenceV1",
  ]) {
    assert.ok(build.capabilities.includes(capability), capability);
  }
});
```

Use the concrete UI Witness/failure-evidence exports established by their landed implementation to derive the first/fourth capability; do not merely hard-code them because the test asks for them.

- [ ] **Step 2: Run RED**

```bash
node --test src/full-measure/tests/alpha8-release-contract.test.cjs
```

Expected: FAIL because build capabilities do not yet advertise all alpha.8 surfaces.

- [ ] **Step 3: Derive capabilities from actual module contracts**

Examples:

```js
const { TOAST_FEEL_CONTRACT } = require("./toast-feels.cjs");
const { NATIVE_COLOR_POLICY } = require("./generation/native-color.cjs");
```

For UI Witness and failure evidence, import their stable policy/export constants introduced by #122/#119. If those slices landed without one, add a narrow exported policy constant in the owning module and a focused test rather than using filesystem string search.

- [ ] **Step 4: Extend build-identity proof**

`build-identity.test.cjs` must assert packaged Build Info includes the same capability strings derived from source.

- [ ] **Step 5: Run focused tests**

```bash
node --test \
  src/full-measure/tests/alpha8-release-contract.test.cjs \
  src/full-measure/tests/build-identity.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/build-capabilities.cjs src/full-measure/tests/alpha8-release-contract.test.cjs src/full-measure/tests/build-identity.test.cjs
git commit -m "test: define alpha.8 release capability contract"
```

---

### Task 3: Bump authoritative application and lockfile identity together

**Files:**
- Modify: `src/full-measure/package.json`
- Modify: `src/full-measure/package-lock.json`
- Test: existing `src/full-measure/tests/build-identity.test.cjs` and repository `check` scripts.

**Interfaces:**
- Application version becomes exactly `0.5.0-alpha.8` everywhere the npm lockfile represents the root package.

- [ ] **Step 1: Write/confirm the version identity assertion before editing**

Ensure the existing build-identity/version test reads `src/full-measure/package.json` and `package-lock.json` and requires exact equality. If it does not, add:

```js
assert.equal(manifest.version, lockfile.version);
assert.equal(lockfile.packages[""].version, manifest.version);
```

- [ ] **Step 2: Run the focused test on the pre-bump tree**

Expected: PASS at alpha.7 or current pre-release identity; this proves the test is meaningful before the change.

- [ ] **Step 3: Change only the authoritative version**

Set:

```json
"version": "0.5.0-alpha.8"
```

in `src/full-measure/package.json`.

- [ ] **Step 4: Synchronize lockfile mechanically**

From `src/full-measure` run the repository's ordinary lockfile-safe npm command, preferably:

```bash
npm install --package-lock-only --ignore-scripts
```

Inspect the diff. It must update version identity only; unexpected dependency graph churn is not accepted into a release bump.

- [ ] **Step 5: Run identity/check proof**

```bash
node --test src/full-measure/tests/build-identity.test.cjs
npm --prefix src/full-measure run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/package.json src/full-measure/package-lock.json src/full-measure/tests/build-identity.test.cjs
git commit -m "chore: bump Haunted Toaster to alpha.8"
```

---

### Task 4: Run the complete source + browser witness gate on the final release branch head

**Files:**
- No production changes unless proof exposes an integration defect.

**Interfaces:**
- Produces exact source/browser evidence tied to one release-candidate head SHA.

- [ ] **Step 1: Run repository verification**

```bash
npm run verify
```

Expected: PASS, including check/test/smoke.

- [ ] **Step 2: Run the UI Witness build/test commands from #122**

Expected: all canonical states pass at the exact release-candidate SHA, including Toast Feel selection and failure/refusal.

- [ ] **Step 3: Inspect screenshot deltas**

Required disposition:

```text
UI impact: visual + behavioral
browser witness: PASS @ <release-candidate SHA>
visual delta: expected or none; never unexplained
packaged witness required: yes
GitBook ontology changed: already documented
```

- [ ] **Step 4: Confirm Vercel witness resolves the exact commit**

The deployed witness must visibly expose the same commit SHA/build identity. A generic production URL that cannot be tied to the release head is insufficient evidence.

- [ ] **Step 5: Stop on unexplained UI drift**

Do not baseline-update an unexplained delta simply to turn CI green. Route the mismatch back to the owning UI slice.

---

### Task 5: Run Windows package proof on the exact candidate head

**Files:**
- No production changes unless packaging exposes an integration defect.

**Interfaces:**
- Produces the installer/portable artifacts and packaged build identity used for final field witness.

- [ ] **Step 1: Push the final integration branch and record exact head SHA**

```bash
git rev-parse HEAD
```

Record it in the PR/release evidence.

- [ ] **Step 2: Dispatch the existing Windows packaging workflow on that head**

Use the repository's existing `workflow_dispatch` path; do not create a second release workflow.

Expected jobs:

```text
Verify renderer: success
Build Windows demo: success
Publish GitHub release: skipped (no tag yet)
```

- [ ] **Step 3: Inspect artifact names and contents**

Confirm the Windows package artifact uses filesystem-safe names and contains the expected installer/portable outputs. This specifically guards the earlier slash-in-artifact-name failure class without reintroducing the historical crash as a release blocker.

- [ ] **Step 4: Launch packaged Build Info**

Confirm visible package identity includes:

```text
version: 0.5.0-alpha.8
commit: <exact candidate SHA>
dirty: false
capabilities include uiWitnessV1, toastFeelV1, nativeColorWitnessV1, renderFailureEvidenceV1
```

- [ ] **Step 5: Stop if package identity differs from source witness**

Do not tag a commit whose packaged Build Info cannot be reconciled with the candidate head.

---

### Task 6: Perform one coherent packaged alpha.8 field witness

**Files:**
- No production changes unless field proof exposes a release blocker.
- Preserve the resulting score/timeline/receipt/video and failure bundle if a render fails.

**Interfaces:**
- Produces the human+machine witness that closes the release thesis.

Required specimen uses:

```text
one multi-section song
one distinctive-color image
one ordinary Toast Feel (use Wire Heat for the canonical release specimen)
Native Color relationship selected by six-up (echo or counterpoint)
Universal H.264 transport
```

- [ ] **Step 1: Select `Wire Heat` in the packaged UI**

Witness that the Toastmoods furniture is visible, selectable, keyboard reachable, and the slate reflects the chosen feel.

- [ ] **Step 2: Generate six and inspect candidate evidence**

Prove the family receipt/evidence includes:

```text
toastFeel.id = wire-heat
toastFeel.contractVersion = toast-feel-v1
native color profile hash present
echo/counterpoint coverage present across candidate timelines
```

- [ ] **Step 3: Choose one candidate with a Native Color decompression window**

Record candidate score address, timeline hash, relationship, Native Color plan hash, and window ticks.

- [ ] **Step 4: Render with Universal H.264**

Required success conditions:

```text
accepted: true
transportEncoding.profileId: delivery
Toast Feel receipt: wire-heat
Native Color profile/plan evidence present
Native Color relationship matches accepted candidate
windowCount: 1
preview/final semantic evidence agrees
Witness Window verified
duration delta <= existing acceptance threshold
```

- [ ] **Step 5: Human visual witness at the recorded window**

Confirm the chosen relationship is visible before the window and the image moves visibly toward its native chromatic character during the recorded window.

- [ ] **Step 6: Exercise MADD CLOWN separately without requiring a second full release render**

Generate a MADD CLOWN family and confirm family evidence says:

```text
semanticClass: madd-clown
stompPolicy: visible-outcome-stomp-v1
seedParentScoreRef: present
```

A full MADD CLOWN video is optional for the release gate unless the generation path exposes a defect.

- [ ] **Step 7: Optional Efficient transport witness**

If convenient, render the same accepted timeline with `efficient` and record playback/size evidence. Do not alter visual semantics or block release if H.264 is valid and HEVC remains merely experimental.

---

### Task 7: Resolve release-candidate PR review and freeze the exact accepted commit

**Files:**
- PR metadata/comments only unless review identifies a valid in-scope regression.

**Interfaces:**
- Produces one reviewed/green release commit SHA eligible for tagging.

- [ ] **Step 1: Run PR Completion/review loop on the integration PR**

Review focus is narrow:

```text
version identity
combined alpha.8 capability contract
browser/package witness parity
no accidental semantic changes during integration
release/tag safety
```

- [ ] **Step 2: Address only valid in-scope findings**

Any code change invalidates the prior package/field witness. After a fix, rerun Tasks 4–6 as required by the affected boundary.

- [ ] **Step 3: Reconfirm final state**

Required:

```text
checks green
browser witness green
Windows package green
packaged field specimen accepted
zero unresolved in-scope review threads
exact final head SHA recorded
```

- [ ] **Step 4: Merge using the repository/user-approved strategy**

Do not infer merge permission from this plan. The operator executing the plan must have explicit merge authorization at that time.

- [ ] **Step 5: Fetch main and verify merge result**

```bash
git switch main
git pull --ff-only
git rev-parse HEAD
```

The commit to tag is the exact accepted post-merge `main` commit whose packaged/review evidence is still applicable. If merge method changes the commit SHA, run the lightweight source/build identity checks again and ensure the package evidence is correctly attributable; if not, package the final main SHA before tagging.

---

### Task 8: Tag and publish `v0.5.0-alpha.8` only after final-main proof

**Files:**
- Git tag/release only.

**Interfaces:**
- Produces one immutable prerelease tag pointing to the exact proven `main` commit.

- [ ] **Step 1: Confirm tag does not already exist**

```bash
git rev-parse -q --verify refs/tags/v0.5.0-alpha.8
```

Expected: no existing ref. If it exists, stop; never move/reuse it.

- [ ] **Step 2: Confirm manifest identity on final main**

```bash
node -p "require('./src/full-measure/package.json').version"
```

Expected: `0.5.0-alpha.8`.

- [ ] **Step 3: Confirm final main is clean and green**

```bash
git status --short
npm run verify
```

Expected: clean + PASS.

- [ ] **Step 4: Create and push exact tag**

```bash
git tag v0.5.0-alpha.8 <proven-main-sha>
git push origin v0.5.0-alpha.8
```

- [ ] **Step 5: Let the existing `v*` workflow publish**

Expected:

```text
Verify renderer: success
Build Windows demo: success
Publish GitHub release: success
```

Do not manually publish a duplicate release if the workflow succeeds.

- [ ] **Step 6: Verify published release artifacts and identity**

Confirm release tag, commit, package version, artifact names, and Build Info all agree.

- [ ] **Step 7: Record final release witness**

Record in GitBook/specimen notes or the appropriate project evidence page:

```text
release: v0.5.0-alpha.8
main commit: <sha>
Windows package workflow: <run>
browser witness: PASS @ <sha>
packaged witness: PASS
canonical field specimen receipt: <receipt/output hashes>
Toast Feel: wire-heat
Native Color: <echo|counterpoint> + plan hash
Universal H.264: PASS
historical #116 reproduction: not required; failure evidence floor present
```

- [ ] **Step 8: Stop and field-mine**

Do not immediately pull Compression Pressure, Dynamic Camera, Linear v2, deeper Listener structure, Haunted Memory, semantic color zones, foreign-video ingestion, Exact Return, or two-parent breeding into the tagged release. alpha.8 is complete once the approved three human-visible truths are proven and shipped.
