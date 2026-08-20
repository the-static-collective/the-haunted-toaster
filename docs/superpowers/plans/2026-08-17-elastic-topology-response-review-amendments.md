# Elastic Topology Response — Plan Review Amendments

**Parent plan:** `docs/superpowers/plans/2026-08-17-elastic-topology-response.md`  
**Status:** self-review corrections; these exact-path corrections supersede the two discovery placeholders in the parent plan.

The implementation design itself is unchanged. This note removes the remaining execution ambiguity discovered during plan self-review.

## Task 2 candidate-session proof path

Use a dedicated production-adapter test:

- Create: `src/full-measure/tests/candidate-session-response.test.cjs`
- Modify: `src/full-measure/tests/converge-session-contract.test.cjs` only if the existing shared session fixture needs response-witness priming.

The focused test imports `createCandidateSession` from `../src/candidate-session.cjs` and proves that `noteAudio()` with real `energySamples`, followed by raster-4 `generate()`, yields candidate timelines containing deterministic `nestedResponse` evidence.

Run:

```bash
node --test tests/candidate-session-response.test.cjs tests/nested-response-contour.test.cjs
```

Do not use `renderer-ui-integration.test.cjs` as the primary adapter proof; it mocks the renderer bridge instead of exercising candidate-session generation authority directly.

## Task 5 Primitive Field test path

Use the existing focused owner:

- Modify: `src/full-measure/tests/primitive-field.test.cjs`

Run:

```bash
node --test tests/primitive-field.test.cjs tests/alpha9-render-proof.test.cjs
```

The test keeps structure/dynamics compiler identity unchanged while proving only continuous displacement amplitude responds to the accepted Nested Response plan.

## Task 6 compatibility and compiler-evidence gates

Add these exact existing regressions to the final focused suite:

- `src/full-measure/tests/visual-language-v2-compat.test.cjs`
- `src/full-measure/tests/timeline-render-filter.test.cjs`
- `src/full-measure/tests/primitive-field.test.cjs`
- `src/full-measure/tests/candidate-session-response.test.cjs`

Final focused command:

```bash
node --test \
  tests/nested-response-contour.test.cjs \
  tests/candidate-session-response.test.cjs \
  tests/topology-response.test.cjs \
  tests/internal-response.test.cjs \
  tests/primitive-field.test.cjs \
  tests/alpha9-range-calibration.test.cjs \
  tests/alpha9-mutation-lattice.test.cjs \
  tests/alpha9-render-proof.test.cjs \
  tests/alpha9-evidence-proof.test.cjs \
  tests/timeline-render-filter.test.cjs \
  tests/visual-language-v2-compat.test.cjs
```

Then run:

```bash
npm run verify
```

## Self-review disposition

- Placeholder/path ambiguity: resolved above.
- Architectural contradiction: none found.
- Scope expansion: none.
- Authority boundary: unchanged — measured audio -> canonical response witness -> accepted timeline -> shared preview/production compiler -> compact receipt evidence.
- Creative law: unchanged — **Area saturates. Expression does not.**
- Positive control: Linear remains unchanged in this slice.
- Compatibility: visual-language-v1/v2 remains an explicit final gate.
