# NEXTGEN-TOASTER-026 — Fission / Joining Bench

Stack parent: NEXTGEN-TOASTER-025 / PR #358 at commit 791a941838a860d8f53f3d83aa0e509a6819e797.
Disposition: experimental human interface and native custody. No product merge, tag, release, or generation authority.

## Playable operator path

1. Seal the CURRENT ONE PASS child take through the existing six-lane performance. The finished take is the immutable set of child placement particulars.
2. LOAD EARLIER TAKE selects a previously saved ONE PASS receipt. The native bridge verifies its schema, envelope and fingerprint before presenting exact parent placement IDs, material IDs, scenes and lanes.
3. Select exact performed placement IDs from the two rails, choose CONTINUE (1 to 1), SPLIT (1 to N), JOIN (N to 1), RELEASE (N to zero), or EMERGE (zero to N). Type an explicit attestation ID.
4. STAGE RELATION records a local proposal of those exact endpoints. A used endpoint cannot be claimed again, and unclaimed endpoints remain unknown.
5. RECORD CORRESPONDENCE rereads the parent, checks it did not change, validates the child receipt, compiles and independently verifies the relationship. It retains full canonical ONE PASS parent and child snapshots, and writes a create-only SHA-256-addressed record in FrankenComposer/performed-correspondence.
6. VERIFY RECORD independently rereads retained snapshots and record, revalidates both ONE PASS fingerprints, and recomputes the full record from its exact inputs.

A new take clears stale staged/recorded claims. REMOVE LAST affects only stage state. CLEAR resets only this observational instrument. An earlier child may later become a newly chosen parent, preserving human-declared longitudinal links by exact performance identity.

## Founding laws

SEPARATION != ERASURE
RELEASE != VACANCY
JOIN != REUNION
REUNION != REVERSAL
STAGED RELATION != RECORDED EVIDENCE
RECORDED EVIDENCE != RENDER AUTHORITY
UNCLAIMED != ABSENT
HUMAN ATTESTATION ID != AUTHENTICATED SIGNATURE
PERFORMANCE != FREEZE
DISTANCE != CORRESPONDENCE

This bench does not re-place media, change a sealed ONE PASS take, select KEEP/SCRAPE, freeze a score, infer kinship from similarity, or prove that pixels actually executed the placements. ONE PASS performanceHash remains a fingerprint (not cryptographic SHA-256); retained witness and record storage are cryptographically content-addressed. External local paths are custody locators, not identities.

## Implementation files

- src/full-measure/src/renderer/performed-correspondence-ui.js : explicit selector, staged relations, child-epoch resets and verification.
- src/full-measure/src/franken-composer/bridge.cjs : validated ONE PASS adapter, snapshot custody, strict readback, refusal.
- src/full-measure/src/preload.cjs : guarded native IPC methods.
- src/full-measure/src/renderer/index.html, franken-composer-ui.css, franken-composer-ui.js : user-facing controls and integration.
- src/full-measure/scripts/build-ui-witness.cjs : include the new script in production browser witness.
- src/full-measure/tests/performed-correspondence-ui.test.cjs and performed-correspondence-bridge.test.cjs : regression and tamper proofs.

## Proof gates

Run:
  node --test src/full-measure/tests/performed-correspondence*.test.cjs
  npm run verify
  npm --prefix src/full-measure run witness:build
  npm --prefix src/full-measure run witness:test

A ready-for-review experimental PR permits the existing Windows-demo gate. A successful Windows package is an unsigned test build only; full human packaged song → six → KEEP/SCRAPE → rendered-video witness is still a separate gate.

## Next aperture

A multi-edge trail inspector should reread each performed link without pretending any single join proves historical reunion. A future proposal-only split brush could compose possible next-performance placements, but may not alter sealed receipts. Pixel-region execution requires separate native proof.

UI impact: visual + behavioral + IPC bridge.
Browser witness: pending exact-head CI.
Visual delta: expected in Franken Composer.
Packaged witness required: yes.
Packaged witness: pending.
GitBook ontology changed: no.
Canonical score, ResolvedTimeline, profile or compatibility migration: none.
