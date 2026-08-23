# Sigil Language Witness v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, renderer-independent human witness harness that tests recognition, composition, and productive novelty for Sigil Grammar v0 without granting production-renderer or candidate-family authority.

**Architecture:** Keep the language experiment as a small study subsystem beside the existing grammar, not inside VisualScore, ResolvedTimeline, ordinary six-up, Ghost Topology, or FFmpeg. A deterministic study freezer derives training/withheld specimens and a hash-bound answer key from the frozen grammar head; a neutral schematic projection presents those specimens; a witness recorder seals responses before reveal and emits a replayable `haunted-toaster/sigil-language-witness/v0` receipt. Because Haunted Toaster runs the renderer with `contextIsolation: true`, `sandbox: true`, and no Node integration, Language Lab packet/reveal state must live behind dedicated main/preload IPC rather than being imported directly by renderer JavaScript.

**Tech Stack:** Node.js 24, CommonJS, `node:test`, existing canonical hashing/stringification helpers, deterministic Sigil Grammar v0 modules, Electron IPC, HTML/CSS/vanilla JS for the test-only Language Lab surface.

**Spec:** `docs/superpowers/specs/2026-08-22-sigil-language-human-witness-design.md`

## Global Constraints

- First specimen contains exactly 18 scored trials: 6 recognition, 6 composition, 6 productive novelty.
- Recognition passes at 5/6; composition passes at 5/6; productive novelty passes at 4/6 using exact active structured reconstruction.
- Any answer-secrecy, replay, packet-integrity, grammar-reference, or receipt-integrity failure yields `unresolved`.
- Exact scored test expressions must not appear in the training set.
- Active reconstruction is collected before any multiple-choice fallback.
- Answer key is hash-bound before presentation and unavailable to the renderer until reveal.
- Verdict vocabulary is bounded to `demonstrated-for-this-witness`, `not-demonstrated`, and `unresolved`; one witness never constitutes population-level validation.
- No VisualScore or ResolvedTimeline authority.
- No production FFmpeg or ordinary candidate-family integration.
- No Ghost Topology execution coupling.
- No authentication, identity, ancestry, admission, or authority semantics.
- No dependency on #212, #214, #217, or #218.
- No private answer key or full human response body is committed to the repository.

---

## File Structure

- `src/full-measure/src/sigil-language/study-policy.cjs` — frozen v0 counts, thresholds, prompt classes, verdict vocabulary, and validation.
- `src/full-measure/src/sigil-language/study-packet.cjs` — deterministic training/withheld/distractor selection, presentation order, answer-key commitment, packet hash, and exact replay.
- `src/full-measure/src/sigil-language/study-projection.cjs` — renderer-neutral schematic projection from grammar evidence.
- `src/full-measure/src/sigil-language/witness-receipt.cjs` — response commitments, reveal transition, scoring, verdict, canonical receipt hash, and replay validation.
- `src/full-measure/src/sigil-language/session-service.cjs` — main-process-only holder for the private answer key and active local witness session.
- `src/full-measure/src/sigil-language/index.cjs` — narrow pure-module exports.
- `src/full-measure/tests/sigil-language-study-policy.test.cjs` — policy and fail-closed contract.
- `src/full-measure/tests/sigil-language-study-packet.test.cjs` — determinism, withholding, distractors, ordering, and answer-key secrecy.
- `src/full-measure/tests/sigil-language-study-projection.test.cjs` — projection invariants and superficial-skin preservation.
- `src/full-measure/tests/sigil-language-witness-receipt.test.cjs` — response commitment, reveal, scoring, verdict, tamper/replay behavior.
- `src/full-measure/tests/sigil-language-language-lab.test.cjs` — dedicated IPC/UI isolation contract.
- `src/full-measure/renderer/sigil-language-lab.js` — test-only Language Lab controller.
- `src/full-measure/renderer/sigil-language-lab.css` — deliberately neutral study styling.
- `src/full-measure/renderer/index.html` — test-only Language Lab launch/mount point.
- `src/full-measure/src/preload.cjs` — dedicated bounded Language Lab bridge methods.
- `src/full-measure/src/main.cjs` — dedicated Language Lab IPC handlers and one `session-service` instance.
- `docs/witnesses/2026-08-22-sigil-language-first-local-specimen.md` — digest/provenance note for the first blinded specimen only.

## Interfaces

```js
buildSigilLanguageStudyPacket({
  grammarHead,
  grammarCorpus,
  seed,
  policyVersion: "sigil-language-study-v0",
}) -> { publicPacket, privateAnswerKey }

projectSigilLanguageStimulus({
  expression,
  topologyPlan,
  skin,
}) -> frozen StudyProjection

createSigilLanguageWitnessSession(publicPacket) -> WitnessSession

WitnessSession.commitResponse({
  trialId,
  reconstruction,
  choiceId,
  confidence,
  note,
}) -> frozen ResponseCommitment

WitnessSession.reveal(privateAnswerKey) -> frozen SigilLanguageWitnessReceipt

verifySigilLanguageWitnessReceipt({ publicPacket, receipt }) -> true
```

The renderer-facing bridge is exactly:

```js
window.fullMeasure.createSigilLanguageStudy({ seed })
window.fullMeasure.commitSigilLanguageResponse(response)
window.fullMeasure.revealSigilLanguageStudy()
window.fullMeasure.clearSigilLanguageStudy()
```

`createSigilLanguageStudy()` returns only the public packet/projections. The private answer key remains inside `session-service.cjs` in the main process until `revealSigilLanguageStudy()` succeeds after all 18 scored commitments are sealed.

`StudyPacket` minimum shape:

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

`SigilLanguageWitnessReceipt` minimum shape:

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

- [ ] **Step 2: Run RED**

```bash
node --test src/full-measure/tests/sigil-language-study-policy.test.cjs
```

Expected: FAIL because the subsystem does not exist.

- [ ] **Step 3: Implement the minimal frozen policy**

Use deep-frozen literals only. V0 counts/thresholds are not caller-configurable.

- [ ] **Step 4: Verify GREEN**

```bash
node --test src/full-measure/tests/sigil-language-study-policy.test.cjs
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
- Produces: `buildSigilLanguageStudyPacket(input)`, `verifySigilLanguageStudyPacket(packet)`, `SIGIL_LANGUAGE_STUDY_SCHEMA`.

- [ ] **Step 1: Write RED determinism tests**

Require the same `{grammarHead, grammarCorpus, seed}` to produce byte-identical public packet JSON, private answer-key JSON, and hashes. Changing only the seed may change presentation order but not the frozen 6/6/6 counts.

- [ ] **Step 2: Write RED withholding/secrecy tests**

For every scored `trial.expressionHash`, assert it is absent from `training[].expressionHash`. Assert the public packet contains no `answer`, `expected`, `correctChoiceId`, root/operator solution fields, or raw answer-key material; only `answerKeyCommitment` is public.

- [ ] **Step 3: Write RED distractor tests**

Recognition includes topology-near and topology-distant distractors. Composition includes order-swapped and root-matched/operator-different pairs. Productive novelty uses `responseMode: "active-reconstruction"`; fallback choices live under `fallback` and cannot replace the primary scored reconstruction.

- [ ] **Step 4: Run RED**

```bash
node --test src/full-measure/tests/sigil-language-study-packet.test.cjs
```

Expected: FAIL because packet builder does not exist.

- [ ] **Step 5: Implement domain-separated deterministic selection**

Derive training selection, withheld selection, distractors, and presentation order with separate hash domains from `seed`, `grammarHead`, policy version, and stable specimen hashes.

- [ ] **Step 6: Bind the private key before presentation**

Canonicalize the private answer key and expose only its hash in `publicPacket.answerKeyCommitment`.

- [ ] **Step 7: Verify replay and tamper refusal**

Mutating grammar head, trial hash, presentation order, or answer-key commitment must make `verifySigilLanguageStudyPacket()` throw.

- [ ] **Step 8: Verify GREEN**

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

### Task 3: Add Neutral Study Projection

**Files:**
- Create: `src/full-measure/src/sigil-language/study-projection.cjs`
- Modify: `src/full-measure/src/sigil-language/index.cjs`
- Test: `src/full-measure/tests/sigil-language-study-projection.test.cjs`

**Interfaces:**
- Produces: `projectSigilLanguageStimulus({ expression, topologyPlan, skin })`.
- `skin` is exactly one of `wire`, `filled`, `dotted`.

- [ ] **Step 1: Write RED invariance tests**

For one frozen expression/topology plan, project all three skins. Require identical `topologyIdentity` and distinct `presentationIdentity`. Node count, edge count, operator order, and topology-plan hash remain invariant.

- [ ] **Step 2: Write RED isolation tests**

Static-scan imports so the module cannot import production render modules, FFmpeg tooling, VisualScore construction, ResolvedTimeline resolution, candidate session, Ghost Topology execution, or renderer profiles.

- [ ] **Step 3: Run RED**

```bash
node --test src/full-measure/tests/sigil-language-study-projection.test.cjs
```

Expected: FAIL because projection module is absent.

- [ ] **Step 4: Implement canonical schematic geometry**

Return bounded normalized coordinates plus declarative primitive marks only. No renderer execution.

- [ ] **Step 5: Verify topology mutation changes identity**

Alter one edge in a negative fixture and require `topologyIdentity` to change.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/src/sigil-language/study-projection.cjs src/full-measure/src/sigil-language/index.cjs src/full-measure/tests/sigil-language-study-projection.test.cjs
git commit -m "feat: add neutral sigil language study projection"
```

---

### Task 4: Seal Human Responses and Emit the Witness Receipt

**Files:**
- Create: `src/full-measure/src/sigil-language/witness-receipt.cjs`
- Modify: `src/full-measure/src/sigil-language/index.cjs`
- Test: `src/full-measure/tests/sigil-language-witness-receipt.test.cjs`

**Interfaces:**
- Produces: `createSigilLanguageWitnessSession(publicPacket)`, `verifySigilLanguageWitnessReceipt({publicPacket, receipt})`.

- [ ] **Step 1: Write RED bounded-response tests**

Require exactly one commitment per `trialId`; reject duplicate/unknown IDs, non-finite confidence, confidence outside 0–1, and notes above 2,000 UTF-8 bytes.

- [ ] **Step 2: Write RED pre-reveal lock test**

`session.reveal(privateAnswerKey)` after 17 scored commitments must throw `all scored responses must be committed before reveal`.

- [ ] **Step 3: Write RED verdict tests**

Require:
- 5/6 recognition + 5/6 composition + 4/6 productive novelty => `demonstrated-for-this-witness`;
- any intact threshold miss => `not-demonstrated`;
- integrity/replay/answer-key mismatch => `unresolved` or hard refusal before verdict according to the spec.

- [ ] **Step 4: Run RED**

```bash
node --test src/full-measure/tests/sigil-language-witness-receipt.test.cjs
```

Expected: FAIL because witness session/receipt does not exist.

- [ ] **Step 5: Implement `open -> committed -> revealed` only**

Commitments are immutable. Corrections require a fresh session.

- [ ] **Step 6: Bind and hash the final receipt**

Hash grammar head, packet hash, ordered commitments, reveal evidence, score summary, and verdict. No participant identity is required.

- [ ] **Step 7: Verify exact replay and tamper refusal**

Re-score the same packet/commitments/key and require the same canonical receipt hash. Mutating any commitment must fail verification.

- [ ] **Step 8: Verify GREEN**

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

### Task 5: Add Main-Process Session Service and Dedicated IPC

**Files:**
- Create: `src/full-measure/src/sigil-language/session-service.cjs`
- Modify: `src/full-measure/src/main.cjs`
- Modify: `src/full-measure/src/preload.cjs`
- Test: `src/full-measure/tests/sigil-language-language-lab.test.cjs`

**Interfaces:**
- Main process owns one `createSigilLanguageSessionService()` instance.
- Preload exposes exactly four methods listed in the Interfaces section.

- [ ] **Step 1: Write RED IPC contract tests**

Require `preload.cjs` to expose `createSigilLanguageStudy`, `commitSigilLanguageResponse`, `revealSigilLanguageStudy`, and `clearSigilLanguageStudy`; require none of them to reuse `candidate:*`, `render:*`, or TEST 6 IPC channels.

- [ ] **Step 2: Write RED answer-key secrecy test**

Create a study through the service and assert the returned payload contains the public packet/projections but no private answer key. The service must retain the key until reveal.

- [ ] **Step 3: Write RED lifecycle test**

A second `createSigilLanguageStudy()` while one study is active must refuse unless `clearSigilLanguageStudy()` has been called. Reveal clears the private key after producing the final receipt.

- [ ] **Step 4: Run RED**

```bash
node --test src/full-measure/tests/sigil-language-language-lab.test.cjs
```

Expected: FAIL because service/IPC is absent.

- [ ] **Step 5: Implement `session-service.cjs`**

Keep private key/session state in the main process. Accept only bounded seed/response payloads and return structured-cloned public data.

- [ ] **Step 6: Register dedicated main handlers**

Use channels:

```text
sigil-language:create
sigil-language:commit-response
sigil-language:reveal
sigil-language:clear
```

Register them inside `registerIpc()` in `src/full-measure/src/main.cjs`.

- [ ] **Step 7: Expose the four preload methods**

Map each method directly to its matching dedicated IPC channel.

- [ ] **Step 8: Verify GREEN**

```bash
node --test src/full-measure/tests/sigil-language-language-lab.test.cjs
npm --prefix src/full-measure run check
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/full-measure/src/sigil-language/session-service.cjs src/full-measure/src/main.cjs src/full-measure/src/preload.cjs src/full-measure/tests/sigil-language-language-lab.test.cjs
git commit -m "feat: add isolated Sigil Language Lab IPC"
```

---

### Task 6: Build the Test-Only Language Lab Surface

**Files:**
- Create: `src/full-measure/renderer/sigil-language-lab.js`
- Create: `src/full-measure/renderer/sigil-language-lab.css`
- Modify: `src/full-measure/renderer/index.html`
- Modify: `src/full-measure/tests/sigil-language-language-lab.test.cjs`

**Interfaces:**
- Renderer consumes only public packet/projection data from `window.fullMeasure.createSigilLanguageStudy()`.
- Renderer sends bounded response input through `commitSigilLanguageResponse()`.
- Renderer can call `revealSigilLanguageStudy()` only after its local progress state shows 18 sealed responses; main process independently enforces the same rule.

- [ ] **Step 1: Write RED UI isolation tests**

Require visible `LANGUAGE LAB` test furniture and static-scan that `sigil-language-lab.js` never calls ordinary candidate generation, mutation, STOMP, CROSS, CONVERGE, TEST 6 generation, rendering, FFmpeg, or package/release APIs.

- [ ] **Step 2: Write RED phase-order tests**

Training must finish before scored trials. Scored order must match `presentationOrder`. Active reconstruction must be sealed before fallback UI appears. Reveal UI must remain absent until all 18 commitments are accepted.

- [ ] **Step 3: Run RED**

```bash
node --test src/full-measure/tests/sigil-language-language-lab.test.cjs
```

Expected: FAIL because renderer assets/mount are absent.

- [ ] **Step 4: Implement the smallest neutral surface**

Use flat schematic SVG/DOM marks, neutral typography, no production visual-language styling, no answer-signaling animation, and no ordinary candidate-card components.

- [ ] **Step 5: Verify UI + application proof**

```bash
node --test src/full-measure/tests/sigil-language-language-lab.test.cjs
npm --prefix src/full-measure run verify
```

Expected: application proof PASS. If canonical browser witness changes, inspect and promote only the exact intended Language Lab furniture.

- [ ] **Step 6: Commit**

```bash
git add src/full-measure/renderer/sigil-language-lab.js src/full-measure/renderer/sigil-language-lab.css src/full-measure/renderer/index.html src/full-measure/tests/sigil-language-language-lab.test.cjs
git commit -m "feat: add test-only sigil language lab"
```

---

### Task 7: Execute the First Blinded Local Human Specimen

**Files:**
- Create: `docs/witnesses/2026-08-22-sigil-language-first-local-specimen.md`

**Interfaces:**
- Consumes one frozen public packet/private answer-key pair through the packaged Language Lab.
- Produces one immutable `haunted-toaster/sigil-language-witness/v0` receipt stored in the app's local witness/archive path, plus a repository provenance note containing only hashes/counts/verdict.

- [ ] **Step 1: Freeze the exact study packet before the human begins**

Record grammar head, policy version, seed, packet hash, answer-key commitment, and software commit. Do not inspect or alter withheld answers after the run begins.

- [ ] **Step 2: Run all 18 scored trials blinded**

Complete training first. No answer labels appear before commitment.

- [ ] **Step 3: Reveal and score once**

Use the retained private answer key only after all 18 commitments are sealed.

- [ ] **Step 4: Replay packet and receipt**

Reconstruct the packet from grammar head + seed and verify identical packet identity; re-verify the final receipt. Any divergence yields `unresolved` and blocks the renderer wedge.

- [ ] **Step 5: Write the provenance note**

Include exact commit, packet hash, answer-key commitment, receipt hash, 6/6/6 counts, score counts, and bounded verdict. State explicitly that this is one local specimen, not population validation. Do not include the private answer key or full free-text responses.

- [ ] **Step 6: Run full verification**

```bash
npm --prefix src/full-measure run verify
```

Expected: PASS with no production renderer, ordinary candidate-family, Ghost Topology, package-version, authentication, admission, identity, or authority changes.

- [ ] **Step 7: Commit the provenance note**

```bash
git add docs/witnesses/2026-08-22-sigil-language-first-local-specimen.md
git commit -m "docs: record first sigil language witness"
```

---

## Completion Gate

The standalone Language Witness v0 is GREEN only when:

1. the 18-trial policy is frozen and fail-closed;
2. packet generation is deterministic and exact scored expressions are withheld from training;
3. answer key is committed before testing and remains main-process-private until all responses are sealed;
4. neutral study projections preserve topology identity across superficial skins;
5. witness receipt is immutable, replayable, and tamper-evident;
6. dedicated IPC stays outside ordinary generation/render authority;
7. Language Lab remains visually and semantically neutral;
8. one blinded local specimen is completed and replay-verified;
9. the claim is bounded to the receipt verdict for that witness only;
10. production renderer coupling remains unimplemented.

Only after this gate is GREEN may the separate Field Lab convergence plan execute.
