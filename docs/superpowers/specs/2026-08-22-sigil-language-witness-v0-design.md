# Sigil Language Witness v0 — Human Language Gate Design

**Status:** Approved design, implementation not yet authorized by this document alone  
**Date:** 2026-08-22  
**Repository:** `the-static-collective/the-haunted-toaster`  
**Base:** `main` @ `899a920b17019a54dadfb0c6bb321cc6e4cf860b`  
**Branch:** `feat/sigil-language-witness-v0`

## Purpose

Haunted Toaster now has a landed generation-only Sigil Grammar v0 proof. PR #211 established independent Witness Sigil compatibility, a Toaster-owned topology-expression contract, renderer-neutral topology plans, deterministic six-utterance families, replay, and fail-closed validation.

That landing deliberately stopped before visible Toaster rendering.

The next unresolved claim is therefore not whether the machine can generate deterministic grammar. It is whether a human can perceive enough stable structure to treat that grammar as language-like rather than merely combinatorial.

This slice builds a separate, deterministic human witness harness to test three progressively stronger claims:

1. **Recognition** — recurring structural expressions can be recognized across superficial presentation variation.
2. **Composition** — changes in operator and order produce distinguishable, reusable structural consequences.
3. **Productive novelty** — a participant can infer a never-before-seen expression from familiar roots and grammatical operations.

The grammar must earn visible production-renderer coupling by passing these human/perceptual gates first.

## Canonical boundary

This design inherits the stop condition established by PR #211.

The Human Language Witness is a study harness, not a production rendering feature.

It must remain mechanically separate from:

- VisualScore authority;
- ResolvedTimeline authority;
- production FFmpeg rendering;
- ordinary candidate-family policy;
- ordinary six-up UI behavior;
- Ghost Topology execution;
- packaging and version policy;
- authentication, identity, ancestry, admission, or authority semantics.

Draft PR #212 is a separate field specimen for GRAB / Resolution / Listener behavior and must remain untouched by this line of work.

## Research question

The study asks one narrow question:

> Can a human learn enough stable form–relation structure from the current Sigil Grammar to recognize old expressions, discriminate lawful compositions, and interpret withheld novel combinations without being shown the exact answer in advance?

A positive result is evidence that the grammar has language-like perceptual utility.

A negative or ambiguous result is also useful evidence. It means renderer coupling should remain withheld while the grammar or study representation is revised.

## Design principle: freeze first, reveal later

Every witness run begins with a deterministic frozen study packet.

The packet determines before the human begins:

- grammar ancestry;
- policy version;
- training expressions;
- withheld expressions;
- distractor expressions;
- presentation order;
- task kinds;
- answer key;
- answer-key hash;
- replay address.

The answer key must exist before the participant answers, but must not be exposed until the response is committed.

This prevents the study from becoming an informal taste exercise whose criteria move after seeing the result.

## Contracts

### `haunted-toaster/sigil-language-study/v0`

A normalized, deterministic study packet.

Required fields:

```js
{
  schema: "haunted-toaster/sigil-language-study/v0",
  grammar: {
    repository: "the-static-collective/the-haunted-toaster",
    commit: "<40-char lowercase commit sha>",
    expressionSchema: "haunted-toaster/sigil-topology-expression/v0",
    familySchema: "haunted-toaster/sigil-utterance-family/v0"
  },
  policy: {
    version: "sigil-language-study-policy/v0",
    seed: "<canonical deterministic seed>",
    presentationVersion: "sigil-language-study-presentation/v0"
  },
  training: ["<expressionHash>", "..."],
  withheld: ["<expressionHash>", "..."],
  trials: [
    {
      id: "trial-0001",
      kind: "recognition" | "composition" | "productive-novelty",
      prompt: { /* normalized study prompt */ },
      candidateHashes: ["<expressionHash>", "..."],
      answerKeyHash: "<hash>"
    }
  ],
  studyHash: "<hash>"
}
```

`studyHash` is computed from the validated core without `studyHash`.

The study packet is not authority. It is only a frozen experimental configuration with explicit ancestry.

### `haunted-toaster/sigil-language-witness/v0`

A normalized human response receipt bound to exactly one frozen study packet.

Required fields:

```js
{
  schema: "haunted-toaster/sigil-language-witness/v0",
  studyHash: "<studyHash>",
  witness: {
    kind: "local-human",
    handle: "<local opaque handle>"
  },
  responses: [
    {
      trialId: "trial-0001",
      committedAnswer: { /* normalized answer */ },
      confidence: 0 | 1 | 2 | 3 | 4,
      note: "<optional bounded plain text>",
      revealed: false
    }
  ],
  reveal: {
    occurred: true,
    answerKeyHashes: ["<hash>", "..."]
  },
  summary: {
    recognition: { correct: 0, total: 0 },
    composition: { correct: 0, total: 0 },
    productiveNovelty: { correct: 0, total: 0 }
  },
  verdict: "pass" | "mixed" | "fail" | "unresolved",
  receiptHash: "<hash>"
}
```

The local opaque handle is not identity proof and must be at most 64 Unicode code points. Optional response notes must be at most 500 Unicode code points. Longer values fail closed rather than being silently truncated.

The receipt records testimony about one study packet. It does not generalize one participant into population-level validation.

## Study packet invariants

A valid study packet must satisfy all of the following:

1. Every referenced expression exists under the pinned grammar ancestry.
2. No exact withheld expression appears in the training set.
3. Trial IDs are unique and deterministic.
4. Candidate ordering is deterministic under the declared policy and seed.
5. Every answer key is hash-bound before participant response.
6. The answer key is absent from the pre-reveal participant view.
7. Replaying the same grammar ancestry + policy + seed reproduces the same normalized packet and `studyHash`.
8. Unknown schema versions, missing expressions, duplicate IDs, malformed hashes, illegal task kinds, and inconsistent answer-key hashes fail closed.

## Study representation

The harness may use a deliberately neutral study-only representation of topology expressions, but that representation is its own bounded surface.

It must not write VisualScore, ResolvedTimeline, candidate-family state, or FFmpeg instructions.

The purpose of the representation is to make structural comparison possible while minimizing aesthetic camouflage.

For v0, the representation should favor:

- plain geometry;
- fixed canvas dimensions;
- fixed stroke treatment;
- deterministic spatial normalization;
- no texture, atmosphere, typography, motion, source video, color narrative, or production effects;
- optional lawful superficial variants only where required by a recognition trial.

If the study representation is too expressive, it may make a weak grammar appear convincing through aesthetics. If it is too impoverished, it may erase the structure being tested. v0 therefore treats the representation as a measurement instrument, not an artwork.

## Task family 1 — Recognition

Recognition tests whether an underlying topology expression remains identifiable across bounded superficial variation.

A recognition trial contains:

- one reference expression;
- one true same-expression candidate under a lawful study-only presentation variation;
- one or more distractors.

Distractor classes should include, where available:

- **topology-near:** small structural difference;
- **order-swapped:** same broad ingredients with changed operation order;
- **root-near:** related primitive family but different expression identity;
- **topology-distant:** deliberately unlike control.

The participant commits a candidate before any answer reveal.

Evidence recorded:

- chosen candidate;
- confidence 0–4;
- optional bounded free-text explanation.

Recognition is a necessary but insufficient language test.

## Task family 2 — Composition

Composition tests whether the participant can distinguish consequences of grammatical structure rather than memorizing whole specimens.

Trial families should include:

- same roots, different operator;
- same roots and operators, different legal order;
- same broad geometry with different compositional relation;
- matched visual complexity where possible.

The participant should identify or reconstruct the relevant structural distinction before reveal.

The central question is whether order and operation behave as reusable grammar rather than decorative perturbation.

## Task family 3 — Productive novelty

Productive novelty is the strongest v0 gate.

The participant receives a bounded training subset containing recurring roots and operators.

The exact target expression is withheld from training.

The test then presents a new expression composed from familiar grammatical parts and asks the participant to infer its structural content.

The preferred response order is:

1. active structured reconstruction of the primitive roots and ordered operator kinds;
2. confidence commitment;
3. optional multiple-choice fallback only after the active response is committed;
4. answer reveal.

For v0 scoring, the active structured reconstruction is correct only when both the normalized primitive-root sequence and normalized ordered operator-kind sequence exactly match the precommitted answer key. Partial matches remain visible in raw testimony but do not count as correct for the specimen threshold.

The exact withheld expression must never appear in training.

A successful productive-novelty result is stronger evidence than recognition because it demonstrates use of learned structure on an unseen combination.

## Bias controls

The harness must reduce accidental answer leakage and confirmation bias.

Required controls:

- deterministic trial order from the frozen packet;
- no semantic answer labels before commitment;
- no answer-key access through ordinary participant UI;
- confidence captured before reveal;
- active-response phase before multiple-choice fallback for productive novelty;
- distractors chosen by explicit policy, not manually adjusted after seeing a participant response;
- raw response preservation alongside any summary score;
- participant notes stored as testimony, never silently translated into stronger claims.

## First specimen policy v0

The first complete local human specimen is frozen at **18 scored trials**:

- 6 recognition trials;
- 6 composition trials;
- 6 productive-novelty trials.

Confidence is recorded but does not change correctness.

Family thresholds are fixed before the first run:

- recognition passes at **5/6 or better**;
- composition passes at **5/6 or better**;
- productive novelty passes at **4/6 or better** using the exact active-reconstruction rule above.

The local specimen verdict is computed as follows:

- `pass` — all three family thresholds are met and every integrity invariant holds;
- `mixed` — the specimen is complete and valid, at least one family threshold is met, but not all three are met;
- `fail` — the specimen is complete and valid and none of the three family thresholds are met;
- `unresolved` — any trial is incomplete, any study/receipt integrity invariant fails, answer secrecy is broken, or contradictory evidence prevents lawful scoring.

These are specimen thresholds, not population statistics. Passing one local specimen does not establish universal comprehension or general human learnability.

## Witness verdicts

The harness computes only the local specimen verdict defined above.

A `pass` authorizes only the next design discussion about renderer coupling. It does not automatically change production behavior.

## Replay and receipt law

Replay must be first-class.

Given the same:

- grammar commit;
- study policy version;
- deterministic seed;
- source expressions;

…the normalized study packet must reproduce exactly.

A completed witness receipt must bind to the packet `studyHash`.

Any mismatch between:

- receipt and study hash;
- trial IDs;
- answer-key hashes;
- pinned grammar ancestry;

must fail closed.

## Failure conditions

The slice fails its own design if any of these occur:

- a withheld expression leaks into training;
- a participant can inspect answers before committing;
- trial generation is nondeterministic;
- replay produces a different packet;
- malformed evidence is silently repaired;
- a study result mutates production Toaster state;
- study geometry enters VisualScore or ResolvedTimeline;
- FFmpeg or ordinary candidate generation depends on study output;
- one participant's result is described as universal or population-level validation;
- a creative descendant is presented as the frozen Witness Sigil it descended from;
- matching sigils are described as authentication, identity, ancestry, admission, or authority.

## File boundary for implementation

The implementation should prefer focused modules under the existing Full Measure generation/test surfaces.

Expected new responsibilities:

- `src/full-measure/src/generation/sigil-language-study.cjs` — study packet construction, normalization, hashing, replay inputs;
- `src/full-measure/src/generation/sigil-language-witness.cjs` — response receipt validation, normalization, scoring, verdict, hashing;
- `src/full-measure/src/generation/sigil-language-study-presentation.cjs` — study-only neutral topology projection, if required by the accepted implementation plan;
- focused tests for study invariants, withholding, answer-key secrecy, replay, receipts, and fail-closed behavior;
- a bounded study harness surface that does not alter ordinary Toaster flow.

Exact UI/harness file placement must follow the repository's existing runtime structure discovered during implementation planning. This design does not authorize a production UI change.

## Rollout sequence

The implementation should proceed in this order:

1. Freeze `sigil-language-study/v0` and `sigil-language-witness/v0` contracts in tests.
2. Build deterministic packet generation and replay.
3. Prove withheld/training separation and answer-key binding.
4. Implement recognition trials end-to-end.
5. Implement witness receipt + reveal sequencing.
6. Run one blind local recognition specimen.
7. Add composition trials.
8. Add productive-novelty trials.
9. Run one complete three-family human specimen using the fixed 18-trial policy and thresholds above.
10. Stop and review evidence before discussing production renderer coupling.

## Acceptance criteria for this design slice

This design is ready for implementation planning when:

- the branch ancestry remains pinned to current `main` after #211;
- PR #212 remains untouched;
- the two contracts and their authority limits are explicit;
- the three study task families are defined;
- first-specimen trial counts and thresholds are fixed before implementation;
- answer leakage controls are explicit;
- replay and fail-closed rules are explicit;
- production-renderer coupling remains forbidden;
- the stop condition after one complete three-family human specimen is explicit.

## Stop condition

The Human Language Witness v0 slice stops after it can produce and replay a deterministic study packet, capture one complete human witness receipt across recognition/composition/productive novelty, and preserve the evidence without changing production Toaster rendering.

Only after that specimen is reviewed may a separate renderer-coupling design be proposed.

> **Make the grammar earn pixels.**
