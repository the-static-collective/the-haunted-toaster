# Sigil Language Witness v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, renderer-independent human witness harness that can test recognition, composition, and productive novelty for Sigil Grammar v0 without granting production-renderer or candidate-family authority.

**Architecture:** Keep the language experiment as a small study subsystem beside the existing grammar, not inside VisualScore, ResolvedTimeline, ordinary six-up, Ghost Topology, or FFmpeg. A deterministic study freezer derives training/withheld specimens and a hash-bound answer key from the frozen grammar head; a neutral study projection presents those specimens; a witness recorder commits responses before answer reveal and emits a replayable `haunted-toaster/sigil-language-witness/v0` receipt. The implementation stops after one blinded local human specimen; renderer coupling remains a separate future gate.

**Tech Stack:** Node.js 24, CommonJS, `node:test`, existing canonical hashing/stringification helpers, deterministic Sigil Grammar v0 modules, HTML/CSS/vanilla JS for the test-only Language Lab surface.

**Spec:** `docs/superpowers/specs/2026-08-22-sigil-language-human-witness-design.md`

## Global Constraints

- First specimen contains exactly 18 scored trials: 6 recognition, 6 composition, 6 productive novelty.
- Recognition passes at 5/6; composition passes at 5/6; productive novelty passes at 4/6 using exact active structured reconstruction.
- Any answer-secrecy, replay, packet-integrity, grammar-reference, or receipt-integrity failure yields `unresolved`.
- Exact scored test expressions must not appear in the training set.
- Active reconstruction is collected before any multiple-choice fallback.
- Answer key is hash-bound before presentation and unavailable to the response surface until reveal.
- Verdict vocabulary is bounded to `demonstrated-for-this-witness`, `not-demonstrated`, and `unresolved`; one witness never constitutes population-level validation.
- No VisualScore or ResolvedTimeline authority.
- No production FFmpeg or ordinary candidate-family integration.
- No Ghost Topology execution coupling.
- No authentication, identity, ancestry, admission, or authority semantics.
- No dependency on #212, #214, #217, or #218.

---

## File Structure

Create the study subsystem under `src/full-measure/src/sigil-language/` so its boundary is obvious and the existing Sigil Grammar modules remain generation-only.

- `src/full-measure/src/sigil-language/study-policy.cjs` — frozen v0 trial counts, thresholds, prompt classes, verdict vocabulary, and validation.
- `src/full-measure/src/sigil-language/study-packet.cjs` — deterministic training/withheld/distractor selection, presentation order, answer-key commitment, packet hash, and exact replay.
- `src/full-measure/src/sigil-language/study-projection.cjs` — renderer-neutral schematic projection from grammar expression/topology-plan evidence into canonical study glyph geometry.
- `src/full-measure/src/sigil-language/witness-receipt.cjs` — response commitments, confidence/notes bounds, reveal transition, scoring, verdict, canonical receipt hash, and replay validation.
- `src/full-measure/src/sigil-language/index.cjs` — narrow exports only.
- `src/full-measure/tests/sigil-language-study-policy.test.cjs` — policy and fail-closed contract.
- `src/full-measure/tests/sigil-language-study-packet.test.cjs` — determinism, withholding, distractors, ordering, and answer-key secrecy.
- `src/full-measure/tests/sigil-language-study-projection.test.cjs` — projection invariants and superficial-skin preservation.
- `src/full-measure/tests/sigil-language-witness-receipt.test.cjs` — response commitment, reveal, scoring, verdict, tamper/replay behavior.
- `src/full-measure/tests/sigil-language-language-lab.test.cjs` — test-only Language Lab UI/bridge isolation contract.
- `src/full-measure/renderer/sigil-language-lab.js` — test-only browser controller for the local Language Lab.
- `src/full-measure/renderer/sigil-language-lab.css` — deliberately neutral presentation styling.
- `src/full-measure/renderer/index.html` — add one test-only Language Lab mount/launch point behind a dedicated capability flag; do not reuse ordinary six-up semantics.
- `src/full-measure/src/preload.cjs` — expose only bounded Language Lab packet/response methods if the current test shell requires Electron bridging.
- `src/full-measure/src/main.cjs` — register matching test-only IPC handlers only if required by the existing renderer/preload architecture.

## Interfaces

The plan uses these exact subsystem interfaces throughout:

```js
buildSigilLanguageStudyPacket({
  grammarHead,
  grammarCorpus,
  seed,
  policyVersion: "sigil-language-study-v0",
}) -> frozen StudyPacket

projectSigilLanguageStimulus({
  expression,
  topologyPlan,
  skin,
}) -> frozen StudyProjection

createSigilLanguageWitnessSession(studyPacket) -> WitnessSession

WitnessSession.commitResponse({
  trialId,
  reconstruction,
  choiceId,
  confidence,
  note,
}) -> frozen ResponseCommitment

WitnessSession.reveal(answerKey) -> frozen SigilLanguageWitnessReceipt

verifySigilLanguageWitnessReceipt({ studyPacket, receipt }) -> true
```

`StudyPacket` must contain at minimum:

```js
{
  schema: "haunted-toaster/sigil-language-study/v0",
  policyVersion: "sigil-language-study-v0",
  grammarHead,
  seed,
  training: [...],
  trials: [...],
  presentationOrder: [...],
  answerKeyCommitment,
  packetHash,
}
```

`SigilLanguageWitnessReceipt` must contain at minimum:

```js
{
  schema: "haunted-toaster/sigil-language-witness/v0",
  packetHash,
  grammarHead,
  responseCommitments: [...],
  reveal: { answerKeyHash, revealedAtStep: "after-commit" },
  scoreSummary: {
    recognition: { correct, total: 6 },
    composition: { correct, total: 6 },
    productiveNovelty: { correct, total: 6 },
  },
  verdict,
  receiptHash,
}
```

---

### Task 1: Freeze and Validate the Study Policy

**Files:**
- Create: `src/full-measure/src/sigil-language/study-policy.cjs`
- Create: `src/full-measure/src/sigil-language/index.cjs`
- Test: `src/full-measure/tests/sigil-language-study-policy.test.cjs`

**Interfaces:**
- Produces: `SIGIL_LANGUAGE_STUDY_POLICY_V0`, `getSigilLanguageStudyPolicy(version)`, `assertSigilLanguageStudyPolicy(policy)`.

- [ ] **Step 1: Write the failing policy contract test**

Create tests asserting the exact v0 policy:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getSigilLanguageStudyPolicy,
  assertSigilLanguageStudyPolicy,
} = require("../src/sigil-language");

test("Sigil Language Study v0 freezes the first 18-trial witness gate", () => {
  const policy = getSigilLanguageStudyPolicy("sigil-language-study-v0");
  assert.deepEqual(policy.trials, {
    recognition: 6,
    composition: 6,
    productiveNovelty: 6,
  });
  assert.deepEqual(policy.passThresholds, {
    recognition: 5,
    composition: 5,
    productiveNovelty: 4,
  });
  assert.deepEqual(policy.verdicts, [
    "demonstrated-for-this-witness",
    "not-demonstrated",
    "unresolved",
  ]);
  assert.equal(policy.activeReconstructionBeforeFallback, true);
  assert.equal(policy.answerRevealAfterCommitOnly, true);
});

test("unknown or weakened Sigil Language policy fails closed", () => {
  assert.throws(() => getSigilLanguageStudyPolicy("v1"), /Unknown Sigil Language study policy/);
  const policy = structuredClone(getSigilLanguageStudyPolicy("sigil-language-study-v0"));
  policy.trials.productiveNovelty = 5;
  assert.throws(() => assertSigilLanguageStudyPolicy(policy), /productiveNovelty/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm --prefix src/full-measure test -- --test-name-pattern="Sigil Language Study v0|unknown or weakened Sigil Language policy"
```

Expected: FAIL because `../src/sigil-language` / policy exports do not exist.

- [ ] **Step 3: Implement the minimal frozen policy**

Use deep-frozen literals only. Do not read environment state or accept caller overrides for v0 counts/thresholds.

- [ ] **Step 4: Run focused test and full source check**

```bash
npm --prefix src/full-measure test -- --test-name-pattern="Sigil Language Study v0|unknown or weakened Sigil Language policy"
npm --prefix src/full-measure run check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/sigil-language src/full-measure/tests/sigil-language-study-policy.test.cjs
git commit -m "test: freeze sigil language study policy"
```

---

### Task 2: Build the Deterministic Study Packet and Withholding Law

**Files:**
- Create: `src/full-measure/src/sigil-language/study-packet.cjs`
- Modify: `src/full-measure/src/sigil-language/index.cjs`
- Test: `src/full-measure/tests/sigil-language-study-packet.test.cjs`

**Interfaces:**
- Consumes: existing Sigil Grammar expression/topology-plan corpus and canonical hashing/stringification helpers.
- Produces: `buildSigilLanguageStudyPacket(input)`, `verifySigilLanguageStudyPacket(packet)`, `SIGIL_LANGUAGE_STUDY_SCHEMA`.

- [ ] **Step 1: Write RED tests for deterministic packet identity**

Test the same `{grammarHead, grammarCorpus, seed}` twice and require byte-identical canonical packet JSON and identical `packetHash`; change only `seed` and require presentation order to change while trial counts remain fixed.

- [ ] **Step 2: Write RED tests for exact withholding and answer secrecy**

For every scored `trial.expressionHash`, assert it is absent from `training[].expressionHash`. Assert no trial exposes `answer`, `expected`, `correctChoiceId`, root/operator solution fields, or raw answer-key material. Assert only `answerKeyCommitment` is present in the public packet.

- [ ] **Step 3: Write RED tests for distractor policy**

Recognition must include both topology-near and topology-distant distractors. Composition must include order-swapped and root-matched/operator-different comparisons. Productive novelty must mark `responseMode: "active-reconstruction"` and may contain fallback choices only under a separate `fallback` field that is not scored unless active reconstruction is unscorable.

- [ ] **Step 4: Run the packet tests and verify RED**

```bash
node --test src/full-measure/tests/sigil-language-study-packet.test.cjs
```

Expected: FAIL because packet builder does not exist.

- [ ] **Step 5: Implement deterministic selection with domain-separated hashes**

Derive all ordering and selection from `seed`, `grammarHead`, policy version, and stable specimen hashes. Use separate hash domains for training selection, withheld selection, distractor choice, and presentation order so changes in one stage cannot silently perturb all others.

- [ ] **Step 6: Commit only a hash of the answer key into the public packet**

Construct the private answer key during packet creation, canonicalize it, and store only its hash in the returned public packet. Tests may receive the private key through a test-only helper export; production/test UI must not.

- [ ] **Step 7: Verify exact replay and fail-closed tamper behavior**

Mutate `grammarHead`, a trial hash, one presentation-order entry, or the answer-key commitment and require `verifySigilLanguageStudyPacket()` to throw rather than normalize the packet.

- [ ] **Step 8: Run focused + full tests**

```bash
node --test src/full-measure/tests/sigil-language-study-packet.test.cjs
npm --prefix src/full-measure test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/full-measure/src/sigil-language/study-packet.cjs src/full-measure/src/sigil-language/index.cjs src/full-measure/tests/sigil-language-study-packet.test.cjs
git commit -m "feat: freeze deterministic sigil language study packets"
```

---

### Task 3: Add Neutral Study Projection Without Production Renderer Authority

**Files:**
- Create: `src/full-measure/src/sigil-language/study-projection.cjs`
- Modify: `src/full-measure/src/sigil-language/index.cjs`
- Test: `src/full-measure/tests/sigil-language-study-projection.test.cjs`

**Interfaces:**
- Produces: `projectSigilLanguageStimulus({ expression, topologyPlan, skin })`.
- `skin` is exactly one of `wire`, `filled`, `dotted`; skins alter superficial marks only, not canonical topology nodes/edges/ordering.

- [ ] **Step 1: Write RED invariance tests**

For one frozen expression/topology plan, project all three skins. Assert `topologyIdentity` is identical across skins while `presentationIdentity` differs. Assert canonical node count, edge count, ordered root/operator labels used internally for scoring, and topology-plan hash remain identical.

- [ ] **Step 2: Write RED isolation tests**

Static-scan the module and test imports so it cannot import production render modules, FFmpeg tooling, VisualScore construction, ResolvedTimeline resolution, candidate session, Ghost Topology execution, or renderer profiles.

- [ ] **Step 3: Run RED**

```bash
node --test src/full-measure/tests/sigil-language-study-projection.test.cjs
```

Expected: FAIL because projection module is absent.

- [ ] **Step 4: Implement a canonical schematic projection**

Represent the topology as bounded normalized coordinates plus declarative primitive marks. Keep the result data-only, deterministic, and suitable for SVG/DOM rendering without invoking production graphics code.

- [ ] **Step 5: Verify superficial variation cannot mutate topology identity**

Run the invariance test and add one negative case where an edge is changed; require `topologyIdentity` to change.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/sigil-language/study-projection.cjs src/full-measure/src/sigil-language/index.cjs src/full-measure/tests/sigil-language-study-projection.test.cjs
git commit -m "feat: add neutral sigil language study projection"
```

---

### Task 4: Commit Human Responses Before Reveal and Emit the Witness Receipt

**Files:**
- Create: `src/full-measure/src/sigil-language/witness-receipt.cjs`
- Modify: `src/full-measure/src/sigil-language/index.cjs`
- Test: `src/full-measure/tests/sigil-language-witness-receipt.test.cjs`

**Interfaces:**
- Produces: `createSigilLanguageWitnessSession(studyPacket)`, `verifySigilLanguageWitnessReceipt({studyPacket, receipt})`.

- [ ] **Step 1: Write RED tests for bounded response commitments**

Require exactly one commitment per `trialId`; duplicates, unknown IDs, non-finite confidence, confidence outside 0–1, or notes above the documented size bound must refuse. Store reconstruction/choice evidence as canonical data plus a commitment hash.

- [ ] **Step 2: Write RED test proving answer reveal is impossible before all 18 scored commitments exist**

Attempt `session.reveal(answerKey)` after 17 responses and require an error matching `all scored responses must be committed before reveal`.

- [ ] **Step 3: Write RED scoring/verdict tests**

Construct fixtures for:
  - 5/6 recognition, 5/6 composition, 4/6 productive novelty => `demonstrated-for-this-witness`;
  - one threshold miss with intact experiment => `not-demonstrated`;
  - answer-key hash mismatch, packet tamper, replay divergence, or missing response => `unresolved` or hard refusal before verdict according to the spec.

- [ ] **Step 4: Run RED**

```bash
node --test src/full-measure/tests/sigil-language-witness-receipt.test.cjs
```

Expected: FAIL because witness session/receipt does not exist.

- [ ] **Step 5: Implement the append-only in-memory session state machine**

Allowed transitions are only `open -> committed -> revealed`. A commitment cannot be edited; corrections require a new session/packet run. Reveal checks `answerKeyCommitment` before scoring.

- [ ] **Step 6: Bind and hash the final receipt**

Hash grammar head, packet hash, ordered commitments, reveal evidence, score summary, and verdict. Never include participant identity requirements; an optional local witness label may be presentation metadata only and excluded from authority semantics.

- [ ] **Step 7: Verify receipt replay**

Re-score the same packet + commitments + answer key and require the same canonical receipt bytes/hash. Mutate any commitment and require verification failure.

- [ ] **Step 8: Run focused + full tests**

```bash
node --test src/full-measure/tests/sigil-language-witness-receipt.test.cjs
npm --prefix src/full-measure test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/full-measure/src/sigil-language/witness-receipt.cjs src/full-measure/src/sigil-language/index.cjs src/full-measure/tests/sigil-language-witness-receipt.test.cjs
git commit -m "feat: add sigil language human witness receipts"
```

---

### Task 5: Build the Test-Only Language Lab Surface

**Files:**
- Create: `src/full-measure/renderer/sigil-language-lab.js`
- Create: `src/full-measure/renderer/sigil-language-lab.css`
- Modify: `src/full-measure/renderer/index.html`
- Modify only if required by current renderer architecture: `src/full-measure/src/preload.cjs`
- Modify only if required by current renderer architecture: `src/full-measure/src/main.cjs`
- Test: `src/full-measure/tests/sigil-language-language-lab.test.cjs`

**Interfaces:**
- UI consumes only public `StudyPacket` data and `StudyProjection` data.
- UI emits only bounded response input to the witness session.
- UI receives answer/reveal content only after all 18 commitments are sealed.

- [ ] **Step 1: Write RED UI isolation tests**

Require a visible `LANGUAGE LAB` test action when the test capability is enabled. Require no action when capability is absent. Static-scan that the controller does not call ordinary `generateCandidates`, mutation, STOMP, CROSS, CONVERGE, TEST 6 generation, rendering, or package/release APIs.

- [ ] **Step 2: Write RED behavior tests for the three phases**

Require training to finish before scored trials; require scored trial order to match `presentationOrder`; require active reconstruction field to be committed before fallback choices can be exposed; require answer/reveal panel to remain absent until commit completion.

- [ ] **Step 3: Run RED**

```bash
node --test src/full-measure/tests/sigil-language-language-lab.test.cjs
```

Expected: FAIL because the Language Lab assets/mount do not exist.

- [ ] **Step 4: Implement the smallest neutral surface**

Use flat schematic SVG/DOM marks, neutral typography, no production visual-language styling, no animation that conveys the answer, and no ordinary candidate card components.

- [ ] **Step 5: Add only the narrow bridge required to load a frozen packet and commit responses**

If renderer JS cannot safely call the pure study modules directly, expose dedicated methods such as `createSigilLanguageStudy()` and `commitSigilLanguageResponse()` through preload/main. Do not tunnel through ordinary generation IPC.

- [ ] **Step 6: Run focused UI contract, canonical renderer witness, and full verification**

```bash
node --test src/full-measure/tests/sigil-language-language-lab.test.cjs
npm --prefix src/full-measure run verify
```

Expected: application proof PASS. If canonical browser witness changes because the test-only action is intentionally visible in a captured state, inspect the visual diff and promote only the exact intended Language Lab furniture after review; never blanket-update snapshots.

- [ ] **Step 7: Commit**

```bash
git add src/full-measure/renderer/sigil-language-lab.js src/full-measure/renderer/sigil-language-lab.css src/full-measure/renderer/index.html src/full-measure/src/preload.cjs src/full-measure/src/main.cjs src/full-measure/tests/sigil-language-language-lab.test.cjs
git commit -m "feat: add test-only sigil language lab"
```

Only add preload/main to the commit if those files actually changed.

---

### Task 6: Execute the First Blinded Local Human Specimen

**Files:**
- Create: `src/full-measure/tests/fixtures/sigil-language/first-witness-manifest.json` only if the repository convention permits committed non-sensitive fixture receipts; otherwise store the receipt as CI/local artifact and commit only its digest/provenance note under `docs/witnesses/`.
- Create: `docs/witnesses/2026-08-22-sigil-language-first-local-specimen.md`
- Test: existing Sigil Language suites.

**Interfaces:**
- Consumes one frozen `StudyPacket` and its private answer key.
- Produces one immutable `haunted-toaster/sigil-language-witness/v0` receipt plus a short provenance note.

- [ ] **Step 1: Freeze the exact study packet before the human begins**

Record grammar head, policy version, seed, packet hash, answer-key commitment, and software commit. Do not inspect or alter withheld answers after the run begins.

- [ ] **Step 2: Run the witness in blinded order**

Complete training, then all 18 scored trials. The human may supply confidence and free-text reasoning, but no answer labels appear before commitment.

- [ ] **Step 3: Reveal and score once**

Use the committed answer key only after all 18 responses are sealed. Record the bounded verdict exactly as produced by the receipt implementation.

- [ ] **Step 4: Replay the packet and receipt**

Reconstruct the packet from grammar head + seed and verify identical packet identity; re-verify the receipt. Any divergence changes the verdict to `unresolved` and blocks the renderer wedge.

- [ ] **Step 5: Write the witness provenance note**

The note must explicitly say this is one local specimen and cannot establish population validity. Include exact commit, packet hash, receipt hash, counts, and verdict without publishing the private answer key in the note.

- [ ] **Step 6: Run full verification**

```bash
npm --prefix src/full-measure run verify
```

Expected: PASS with no production renderer, candidate-family, Ghost Topology, package-version, authentication, admission, identity, or authority changes.

- [ ] **Step 7: Commit the provenance note and any allowed non-sensitive fixture artifact**

```bash
git add docs/witnesses/2026-08-22-sigil-language-first-local-specimen.md
git commit -m "docs: record first sigil language witness"
```

---

## Completion Gate

The standalone Language Witness v0 is GREEN only when all of the following are true:

1. the 18-trial policy is frozen and fail-closed;
2. packet generation is deterministic and exact scored expressions are withheld from training;
3. answer key is committed before testing and hidden until all responses are sealed;
4. neutral study projections preserve topology identity across superficial skins;
5. witness receipt is immutable, replayable, and tamper-evident;
6. Language Lab remains outside ordinary generation/render authority;
7. one blinded local specimen is completed and replay-verified;
8. the claim is bounded to the receipt verdict for that witness only;
9. production renderer coupling remains unimplemented.

Only after this gate is GREEN may the separate Field Lab convergence plan execute.
