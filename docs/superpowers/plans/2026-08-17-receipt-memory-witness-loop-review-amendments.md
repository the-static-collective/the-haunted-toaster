# Receipt Memory + Witness Loop — Plan Review Amendments

**Date:** 2026-08-17

**Applies to:** `docs/superpowers/plans/2026-08-17-receipt-memory-witness-loop.md`

These corrections are authoritative for execution. They resolve interface/name mismatches found during the required plan self-review; they do not change the approved design or scope.

## 1. Memory service method names

Task 6 and Task 5 must use one exact `memoryProvider` interface.

`createMemoryService({ rootProvider })` produces these methods:

```text
archiveSuccessfulRender(renderResult)
listPastToasts()
getPastToast(receiptSha256)
submitVerdict(config)
resolveReToastAncestor(receiptSha256)
contextForGeneration({ mediaAnalysis, constraints, explicitAncestorReceiptSha256 })
recordWitnessEncounter(config)
resolveArtifact({ receiptSha256, kind })
currentProjection()
```

There is no `armableAncestor()` method and no `generationContext()` method. Replace those two names in Task 6 with `resolveReToastAncestor()` and `contextForGeneration()` respectively.

`currentInfluenceTrace()` remains candidate-session state, not memory-service state, because the trace is bound to the currently materialized candidate family.

## 2. Exact preload sandbox regression file

In Task 7, the existing packaged/sandbox preload regression file is:

```text
src/full-measure/tests/listener-packaged-parity.test.cjs
```

Modify that file alongside the new `memory-ipc-contract.test.cjs`. Do not create or search for `sandboxed-preload-contract.test.cjs`.

Focused Task 7 proof therefore includes:

```bash
node --test tests/memory-ipc-contract.test.cjs tests/listener-packaged-parity.test.cjs
```

## 3. Exact Re-toast ancestry assertion

The current candidate object does not expose a top-level `parentScoreRef`. Parent ancestry is already recorded in the score artifact derivation.

Replace Task 5's ancestry assertion with:

```js
assert.ok(
  familyView.candidates.every(
    (candidate) =>
      candidate.scoreArtifact.derivation.parentScoreRefs[0] === archivedScoreAddress,
  ),
);
```

Do not add a redundant top-level `candidate.parentScoreRef` merely to satisfy the test.

## 4. Memory-context ownership through render

`candidateSession.executionForRender()` returns `memoryContext` and `reToastAncestor` as non-render-authority metadata beside the existing accepted score/timeline fields. `main.cjs` may use those values only after `renderVideo()` succeeds to append archive/witness records.

`render/render.cjs` must not serialize `memoryContext`, `reToastAncestor`, Human Verdict state, or Influence Trace into `full-measure.video-receipt.v1` in Slice B.

## 5. Self-review disposition

With these corrections applied:

- type/signature names are consistent across Tasks 4–7;
- the preload regression path is concrete;
- Re-toast tests use existing canonical derivation evidence;
- memory/witness metadata remains separate from immutable render authority.
