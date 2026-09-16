# HyperFood Slice A — post-BETA re-port receipt

Date: 2026-09-15

Status: experimental branch evidence only; no main/release authority.

## Carrier

- post-BETA base: `e8e8fb0fa3c13c98aae8c3ca5e98cb4de9f19031`
- branch: `hyperfood/slice-b-living-receipt`
- historical donor: PR #270 / `impl/hyperfood-slice-a`
- donor head at archaeology: `3b504f1233ec9a9cd10cb39b302832285e250b1c`

## RED

Contract-only commit: `4467b60e3a46ab2244c07fe8b9e4ea14425e74d9`

Workflow run `35029711818` / run number 2326 failed only because post-BETA main did not contain `../src/hyperfood/index.cjs`.

Observed suite result before the expected contract failure: 621 passed / 1 failed. The failure was `MODULE_NOT_FOUND` from `tests/hyperfood-slice-a-contract.test.cjs`; this establishes the missing current-carrier seam rather than inferring it from branch history.

## Re-port

Re-port commit: `9d04abe1591ba7e907d87995cc47fed0de32093c`.

Exactly the isolated Slice A donor modules and focused tests were re-attached to the post-BETA tree by blob identity; no old branch ancestry was merged and no renderer/UI/product files were changed.

Re-ported production files:

- `src/full-measure/src/hyperfood/registry.cjs`
- `schema.cjs`
- `identity.cjs`
- `graph.cjs`
- `mutation.cjs`
- `trace.cjs`
- `index.cjs`

Re-ported focused tests:

- `hyperfood-schema.test.cjs`
- `hyperfood-identity.test.cjs`
- `hyperfood-graph.test.cjs`
- `hyperfood-mutation.test.cjs`
- `hyperfood-trace.test.cjs`
- `hyperfood-slice-a-contract.test.cjs` (contract was already present from RED)

## Boundary

This re-port restores the renderer-independent ABI only: schema/registry, specimen identity, typed DAG validation, mutation reconstruction, transform traces, and public contract.

It does not add HyperFrames, Remotion, UI, VSPantry schema changes, receipt writing, renderer authority, or song execution authority.

GREEN remains a current-head verification claim and must be recorded only after the post-BETA workflow passes.
