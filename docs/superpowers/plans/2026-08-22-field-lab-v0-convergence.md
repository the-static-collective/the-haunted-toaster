# Field Lab v0 Convergence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one disposable, packaged Haunted Toaster field laboratory in which the existing GRAB/TEST 6 witness room and the independently proven Sigil Language Lab coexist without sharing authority, answers, memory influence, or canonical ancestry claims.

**Architecture:** Field Lab v0 is a convergence specimen, not a canonical implementation ancestor. Cut it from the latest exact-head GREEN #214 branch, combine the independently GREEN Language Witness implementation only after its standalone completion gate passes, then add a tiny session membrane that records co-resident witness receipts without interpreting them. TEST 6 continues to use real Toaster rendering and forced-witness provenance; Language Lab continues to use neutral study projection. A session manifest may say both encounters occurred in the same packaged build, but neither receipt can validate or modify the other.

**Tech Stack:** Node.js 24, CommonJS, Electron/vanilla renderer assets already used by Haunted Toaster, existing Windows packaging workflow, existing TEST 6 forced-witness contracts, Sigil Language Witness v0 subsystem.

**Spec:** `docs/superpowers/specs/2026-08-22-sigil-language-human-witness-design.md`

## Global Constraints

- **BLOCKED** until standalone Sigil Language Witness v0 satisfies every completion gate in `docs/superpowers/plans/2026-08-22-sigil-language-witness-v0.md`.
- **BLOCKED** until the exact #214 head chosen for convergence has a successful full CI run.
- Convergence branch starts from #214, not from memory rescue #218.
- Field Lab v0 is a disposable test/package branch and must not become the canonical production spine by implication.
- TEST 6 receipt authority and Sigil Language Witness receipt authority remain separate.
- The session manifest is index/provenance only; it cannot promote, reinterpret, score, merge, or rewrite child receipts.
- Sigil Language Lab answers remain hidden until its own response commitments are complete.
- TEST 6 rendered outputs may not be used as Sigil Language training, distractors, answer keys, or scoring evidence in v0.
- Sigil Language results may not influence TEST 6, GRAB, ordinary candidate generation, or render selection.
- #217/#218 memory rescue is excluded from Field Lab v0. No ambient memory, Re-toast, Past Toasts, Thoughtline, or memory-seat influence is enabled by this convergence.
- No merge, tag, release, version bump, or promotion is authorized from the Field Lab branch.

---

## Required Inputs and Pinning

Before Task 1, record these exact refs in the convergence PR body:

```text
fieldBasePr = #214
fieldBaseHead = latest #214 head with successful full CI
languageSourcePr = standalone Language Witness implementation PR
languageSourceHead = exact standalone head that passed the standalone completion gate
reconciliationLedger = #216 informational only; never an implementation parent
memoryRescue = #217/#218 explicitly excluded
```

At the time this plan was written, #214 head `3a59cf6dea9692008a54402ffdb1311e6106e05a` had successful workflow run `32607364985`. Re-check before execution; if #214 moves, use only a newer exact head after fresh GREEN verification.

---

## File Structure

The convergence layer should be small and visibly separate from both witness engines.

- `src/full-measure/src/field-lab/session-manifest.cjs` — canonical `haunted-toaster/field-lab-session/v0` provenance index referencing child receipt hashes and build identity only.
- `src/full-measure/src/field-lab/index.cjs` — narrow export surface.
- `src/full-measure/tests/field-lab-session-manifest.test.cjs` — manifest isolation, append-only references, fail-closed identity checks.
- `src/full-measure/tests/field-lab-room-isolation.test.cjs` — proves TEST 6 and Language Lab do not call or influence each other and memory rescue is absent.
- `src/full-measure/renderer/field-lab.js` — presentation-only room switcher/launcher if a shared lab entry improves packaged operation.
- `src/full-measure/renderer/field-lab.css` — restrained lab-shell styling only.
- `src/full-measure/renderer/index.html` — mount a test-only `FIELD LAB` entry that exposes two clearly labeled rooms while preserving the existing TEST 6 and Language Lab actions.
- `docs/witnesses/2026-08-22-field-lab-v0-packaged-specimen.md` — exact build/package/witness provenance after the human run.

Do not move TEST 6 business logic into `field-lab/`. Do not move Sigil Language business logic into `field-lab/`. The convergence code owns only co-residence and provenance.

## Interfaces

```js
createFieldLabSessionManifest({
  buildIdentity,
  fieldBase,
  languageSource,
}) -> FieldLabSessionManifest

appendFieldLabWitnessReference(manifest, {
  room: "test-six" | "language-lab",
  receiptSchema,
  receiptHash,
  artifactHash,
}) -> new frozen FieldLabSessionManifest

verifyFieldLabSessionManifest(manifest) -> true
```

Manifest shape:

```js
{
  schema: "haunted-toaster/field-lab-session/v0",
  buildIdentity: {
    commit,
    tree,
    packageArtifact,
    packageSha256,
  },
  sources: {
    fieldBase: { pr: 214, head },
    languageSource: { pr, head },
  },
  witnesses: [
    {
      room: "test-six",
      receiptSchema,
      receiptHash,
      artifactHash,
    },
    {
      room: "language-lab",
      receiptSchema: "haunted-toaster/sigil-language-witness/v0",
      receiptHash,
      artifactHash: null,
    },
  ],
  manifestHash,
}
```

The manifest must not contain Sigil answer keys, human response content, TEST 6 semantic interpretation, candidate scores, memory influence, or any combined pass/fail verdict.

---

### Task 1: Create the Disposable Convergence Branch and Prove the Two Parents

**Files:**
- No production file changes in this task.
- PR description only.

**Interfaces:**
- Produces one convergence branch with explicit field and language source heads.

- [ ] **Step 1: Re-verify #214 exact-head GREEN**

Fetch the workflow runs for the intended #214 head. Require a completed successful full application proof. Record run ID and head SHA.

- [ ] **Step 2: Re-verify standalone Language Witness completion**

Require the standalone implementation PR head to have full verification PASS plus the blinded local specimen provenance note and replay-verified witness receipt. Record head SHA and proof run.

- [ ] **Step 3: Cut `test/field-lab-v0-convergence` from the verified #214 head**

Do not cut from `main`, #218, or a reconciliation branch.

- [ ] **Step 4: Combine the independently GREEN Language Witness head as an explicit second parent**

Create an ordinary merge commit into the disposable convergence branch so Git ancestry truthfully records both tested parents. Do not squash the language work into #214 and do not rewrite either source branch.

- [ ] **Step 5: Run full verification immediately after the parent merge, before adding convergence code**

```bash
npm --prefix src/full-measure run verify
```

Expected: PASS. If the two independently GREEN parents conflict or fail together, stop here and repair only on the disposable convergence branch; do not mutate either source proof to hide the incompatibility.

- [ ] **Step 6: Commit only conflict-resolution changes if any were required**

Every conflict-resolution commit must name the exact incompatible seam and contain a focused regression test before implementation repair.

---

### Task 2: Add the Provenance-Only Field Lab Session Manifest

**Files:**
- Create: `src/full-measure/src/field-lab/session-manifest.cjs`
- Create: `src/full-measure/src/field-lab/index.cjs`
- Test: `src/full-measure/tests/field-lab-session-manifest.test.cjs`

**Interfaces:**
- Produces: `createFieldLabSessionManifest`, `appendFieldLabWitnessReference`, `verifyFieldLabSessionManifest`.

- [ ] **Step 1: Write RED tests for the exact manifest schema**

Require schema `haunted-toaster/field-lab-session/v0`, exact build identity, exact two source heads, empty initial `witnesses`, and canonical `manifestHash`.

- [ ] **Step 2: Write RED tests proving references are append-only and typed**

Allow only room `test-six` with a known forced-witness receipt schema, or room `language-lab` with `haunted-toaster/sigil-language-witness/v0`. Reject unknown receipt schemas, duplicate receipt hashes, mutable replacement, arbitrary paths, or missing build identity.

- [ ] **Step 3: Write RED tests proving the manifest has no combined verdict semantics**

Assert the module exports no `score`, `pass`, `validateLanguage`, `promote`, `admit`, `authorize`, or `mergeVerdicts` behavior. Assert manifest data contains no child answer keys or human response bodies.

- [ ] **Step 4: Run RED**

```bash
node --test src/full-measure/tests/field-lab-session-manifest.test.cjs
```

Expected: FAIL because field-lab manifest module does not exist.

- [ ] **Step 5: Implement minimal canonical manifest logic**

Use existing canonical stringify/hash helpers. Every append returns a new frozen object with a new manifest hash; prior manifests remain valid immutable history.

- [ ] **Step 6: Verify tamper refusal**

Mutate a child receipt hash, source head, package digest, or witness room and require `verifyFieldLabSessionManifest()` to fail closed.

- [ ] **Step 7: Run focused + full tests**

```bash
node --test src/full-measure/tests/field-lab-session-manifest.test.cjs
npm --prefix src/full-measure test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/full-measure/src/field-lab src/full-measure/tests/field-lab-session-manifest.test.cjs
git commit -m "test: add Field Lab session provenance"
```

---

### Task 3: Prove Room Isolation Before Adding Shared Furniture

**Files:**
- Create: `src/full-measure/tests/field-lab-room-isolation.test.cjs`

**Interfaces:**
- Consumes existing TEST 6 and Sigil Language Lab public APIs.
- Produces no new runtime API.

- [ ] **Step 1: Write a test proving TEST 6 never consumes Sigil Language state**

Generate/replay a TEST 6 family with and without an unrelated completed Sigil Language witness object present in process memory. Require byte-identical TEST 6 family/receipt identity.

- [ ] **Step 2: Write a test proving Sigil Language packets never consume TEST 6 state**

Build the same study packet with and without an unrelated TEST 6 receipt/artifact reference present. Require byte-identical study packet identity and presentation order.

- [ ] **Step 3: Write a static boundary test excluding memory rescue**

Scan Field Lab, TEST 6 convergence glue, and Language Lab imports. Refuse imports from memory-service rescue, witness-memory seat, Re-toast, Past Toasts, Thoughtline, or memory influence modules.

- [ ] **Step 4: Write a test proving rendered TEST 6 artifacts cannot enter Sigil training/scoring**

Attempt to pass a TEST 6 artifact/receipt into the study packet builder as corpus/training material and require type/schema refusal.

- [ ] **Step 5: Run the isolation suite**

```bash
node --test src/full-measure/tests/field-lab-room-isolation.test.cjs
```

Expected: PASS once both parent systems are correctly isolated; any failure is a convergence blocker, not permission to weaken either source contract.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/tests/field-lab-room-isolation.test.cjs
git commit -m "test: prove Field Lab room isolation"
```

---

### Task 4: Add the Shared Field Lab Door Without Sharing Semantics

**Files:**
- Create: `src/full-measure/renderer/field-lab.js`
- Create: `src/full-measure/renderer/field-lab.css`
- Modify: `src/full-measure/renderer/index.html`
- Test: extend `src/full-measure/tests/field-lab-room-isolation.test.cjs` or create `src/full-measure/tests/field-lab-ui.test.cjs` if existing UI-test conventions favor separate files.

**Interfaces:**
- Presentation-only controller exposes two launch actions: `TEST 6` and `LANGUAGE LAB`.
- It delegates to the existing dedicated room actions and owns no generation/scoring code.

- [ ] **Step 1: Write RED UI contract**

Require a visible test-only `FIELD LAB` entry in the packaged renderer with exactly two room labels: `TEST 6` and `LANGUAGE LAB`. Require the shell to disappear when test capabilities are absent.

- [ ] **Step 2: Write RED delegation/isolation test**

Static-scan `field-lab.js` so it may call only the existing room launch functions and session-manifest methods. It must not call candidate generation, TEST 6 fixture creation directly, Sigil scoring directly, FFmpeg, memory services, or release/package APIs.

- [ ] **Step 3: Run RED**

```bash
node --test src/full-measure/tests/field-lab-ui.test.cjs
```

Expected: FAIL because Field Lab shell does not exist.

- [ ] **Step 4: Implement the smallest shared shell**

The UI may visually frame the two rooms as one laboratory, but must preserve their distinct labels, explanatory copy, and evidence paths. Do not visually imply that TEST 6 teaches or validates the Sigil language.

- [ ] **Step 5: Run browser/canonical witness and inspect intentional deltas**

```bash
npm --prefix src/full-measure run verify
```

If canonical screenshots change, review the exact Field Lab furniture and update only the intended baseline states. Do not bulk-promote unrelated pixels.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/renderer/field-lab.js src/full-measure/renderer/field-lab.css src/full-measure/renderer/index.html src/full-measure/tests/field-lab-ui.test.cjs
git commit -m "feat: add packaged Field Lab shell"
```

---

### Task 5: Package One Exact Windows Field Lab Specimen

**Files:**
- No source changes unless packaging exposes a fresh, testable defect; any such defect requires a new RED regression before repair.
- Update convergence PR body with exact proof/package refs.

**Interfaces:**
- Produces one Windows package artifact tied to exact convergence head/tree and digest.

- [ ] **Step 1: Run full exact-head CI**

Require consolidated application proof, runtime audit, smoke proof, renderer witness, and canonical witness-state comparison to pass.

- [ ] **Step 2: Invoke the repository's existing Windows package path without tagging/releasing**

Use the existing PR/package mechanism. Do not bump package version solely for this disposable test specimen.

- [ ] **Step 3: Record provenance**

Record convergence branch head SHA, packaged merge-ref if GitHub Actions uses one, source tree SHA, artifact ID/name/size, package SHA-256, and payload filenames.

- [ ] **Step 4: Verify source-tree equivalence where merge-ref packaging is used**

If package workflow builds a generated PR merge ref, compare its tree to the intended convergence source tree and state any delta explicitly. A source-tree mismatch blocks human testing.

- [ ] **Step 5: Keep PR draft**

Do not merge, tag, release, or promote after packaging.

---

### Task 6: Run One Co-Resident Human Field Session

**Files:**
- Create: `docs/witnesses/2026-08-22-field-lab-v0-packaged-specimen.md`
- Store child receipts/artifact references according to their existing receipt/archive rules; do not copy private Sigil answer keys into the document.

**Interfaces:**
- Produces independent TEST 6/GRAB evidence, independent Sigil Language witness receipt, and one provenance-only Field Lab session manifest referencing both.

- [ ] **Step 1: Confirm Build Info before testing**

The human records exact package/build identity and verifies it matches the convergence PR provenance.

- [ ] **Step 2: Enter TEST 6 room and perform the field witness**

Exercise at least BIG GRAB, TIGHT GRAB, WIDE GRAB, and KITCHEN SINK from the packaged test harness. Record the existing forced-witness receipt/artifact identities. Do not derive any Sigil answers from these renders.

- [ ] **Step 3: Enter LANGUAGE LAB room in the same package**

Run the already-frozen independent Sigil Language study packet. Do not regenerate the study packet because of anything observed in TEST 6.

- [ ] **Step 4: Complete and reveal the Sigil witness under its own law**

Seal all 18 responses before reveal, produce the independent `haunted-toaster/sigil-language-witness/v0` receipt, and replay-verify it.

- [ ] **Step 5: Append both receipt references to the Field Lab session manifest**

The manifest records only build/source identity plus child receipt/artifact hashes. It emits no combined verdict.

- [ ] **Step 6: Write the packaged specimen note**

Document exact build/package digest, #214 source head, standalone Language Witness source head, child receipt hashes, Field Lab manifest hash, and observational notes. Explicitly state that co-residence proves compatibility/usability of the laboratory package, not semantic equivalence between the rooms.

- [ ] **Step 7: Final full verification**

Run the repository's full verification on the exact convergence head once more after any receipt/provenance-only source additions.

- [ ] **Step 8: Commit only the provenance note if repository policy allows it**

```bash
git add docs/witnesses/2026-08-22-field-lab-v0-packaged-specimen.md
git commit -m "docs: record Field Lab v0 specimen"
```

---

## Stop Condition

Field Lab v0 is complete when:

1. #214 and standalone Language Witness were independently GREEN before convergence;
2. their combined parent state passes full verification before convergence-specific code;
3. a provenance-only session manifest exists and cannot combine verdicts;
4. room-isolation tests prove no cross-influence and no memory rescue coupling;
5. one shared test-only Field Lab shell exposes TEST 6 and LANGUAGE LAB as distinct rooms;
6. one exact Windows package is built without release/tag/version promotion;
7. one human session exercises both rooms in the same package;
8. each room produces its own independently valid receipt/evidence;
9. the session manifest references both without changing either;
10. the convergence PR remains draft/disposable and is not treated as canonical spine authority.

## Explicitly Deferred: Field Lab v1

Do **not** implement in v0:

- memory of prior lab encounters;
- one-seat memory influence;
- Re-toast ancestry;
- Past Toasts;
- Thoughtline;
- adaptive training based on prior answers;
- Sigil-derived candidate pressure;
- TEST 6-derived Sigil training material.

A later Field Lab v1 may study continuity by remembering prior **witnesses**, but only after #217/#218 complete their own current-BETA proof ladder and only under a separately approved experimental design.
