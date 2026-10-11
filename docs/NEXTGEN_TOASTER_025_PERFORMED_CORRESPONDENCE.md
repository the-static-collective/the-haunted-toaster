# NEXTGEN-TOASTER-025 — Performed correspondence, split / join / release

**Stack parent:** #356 / NEXTGEN-TOASTER-024, exact head `bf9e31444f4bb032f068bfc682d9fd94296753f5`.
**Disposition:** experimental evidence grammar. No merge to main, product promotion, release, or automatic creative decision.

024 already measures five dimensions of mutation from exact performed particulars. But a renamed placement appears as removal plus addition even when a human recognizes a carried-forward material. 025 adds an explicit, separately witnessed correspondence **declaration**, without allowing naming, appearance, distance, ancestry, or a model to establish identity.

## The new operation

```text
parent performed witness                  child performed witness
  placement IDs + materials                 placement IDs + materials
             \                               /
              operator declares exact endpoints
                           |
             typed relation + attestation ID
                           |
              canonical sealed observation
                           |
           independent replay against supplied
                source witnesses and claims
```

A relation may be **continue** (1→1), **split** (1→2+), **join** (2+→1), **release** (1+→0), or **emerge** (0→1+). Arity is structural, not metaphorical. A *reunion* cannot be inferred from a join: to assert that historical relationship would require additional independently witnessed prior separation and relation evidence. 025 does not implement that assertion.

```text
SEPARATION != ERASURE
RELEASE != VACANCY
JOIN != REUNION
REUNION != REVERSAL
DECLARED CORRESPONDENCE != PROVEN CAUSATION
UNCLAIMED != ABSENT
COMMON MATERIAL != SAME IDENTITY
DISTANCE != CORRESPONDENCE
ATTESTATION ID != AUTHENTICATED HUMAN
```

## Contracts

- **Schema:** `static-collective/performed-correspondence/v0`
- **Policy:** `exact-particular-operator-declaration/v0`
- **Module:** `src/full-measure/src/nextgen/performed-correspondence.cjs`
- **API:** `compilePerformedCorrespondence({parentWitness, childWitness, declarations})` and `verifyPerformedCorrespondence(record, operands)`
- **Inputs:** two bounded, supplied performance witness objects containing `performanceHash` and exact performed placement records (`id`, `materialId`); caller-supplied relation kind, exact endpoint lists, attestation ID
- **Outputs:** canonical, domain-separated SHA-256 binding of both complete supplied witnesses, sorted relation claims, unclaimed endpoints, declared policy, denied authority, and unknowns
- **Conflicts:** unknown or repeated endpoints, duplicate placement identity, unsupported relation kind, wrong relation arity, unverifiable or modified record all refuse
- **Semantics:** both identity endpoints are local to their respective performance; material equality does not establish continuity; unclaimed placements remain unknown, not auto-released or auto-created

Performance hashes are carried from supplied witnesses; they are not misrepresented as cryptographic SHA-256. Witness SHA-256 commits to the supplied object bytes after canonical JSON projection; this is tamper evidence, **not proof** that the objects faithfully represent a render or that a real human supplied the attestation. No new UI authority, frozen plan, adopted artifact, mutation-distance weight, timeline mutation, or receipt authority is introduced.

## Proof

```bash
node src/full-measure/scripts/performed-correspondence.cjs --specimen
node src/full-measure/scripts/performed-correspondence.cjs --input correspondence-input.json
node src/full-measure/scripts/performed-correspondence.cjs --verify correspondence-record-and-input.json
node --test src/full-measure/tests/performed-correspondence.test.cjs
npm run verify
```

The suite covers split, join, release, emerge, partial unknown mappings, order-invariant canonical identity, arity and endpoint refusal, tampering, duplicate placement identities, and no inferred reunion.

**Packaging frontier:** #024's draft CI has green tests and browser witnesses but deliberately skips Windows packaging. The prior independently verified Windows workflow_dispatch package (run 34004702523, 2026-09-06) came from `digest/video-topology-mask-human-bridge` at SHA `35d352b095e4608e6eab8fadfadeb07744b83a4b` with a different application identity, `0.5.0-alpha.8`. It must not be called the packaged NEXTGEN. A ready-for-review PR through the inherited existing workflow may build an unsigned Windows test package after verify, Franken, and UI witness gates; only an actual completed run with uploaded Windows artifacts may be called a new package. **Build success is not human packaged UI witness.**

## Next bridge, explicitly unbuilt

1. Bind relation inputs to independently verified 023/024 sealed ONE PASS performance witnesses rather than accepting arbitrary user-supplied object attestations.
2. Present candidate exact endpoint sets in the Franken editor as **proposals only**. A human must affirm every crossing; no correspondence is accepted from similarity.
3. Retain declared relationships with the source-witness hashes in a create-only local evidence store.
4. Only after source verification, validate continuity through multi-generation split → independent paths → later join, distinguishing joining from demonstrated reunion.
5. Conduct a complete packaged Windows human path: song → six → KEEP / SCRAPE → frozen composition → rendered video + receipts, alongside a separate observational fission inspector.

**UI impact:** none.
**Browser witness:** inherited #024 CI required.
**Visual delta:** none.
**Packaged witness required:** yes for eventual visible integration; this slice exposes no new UI.
**Packaged witness:** not established by source-only changes.
**GitBook ontology changed:** no.
**Canonical score/timeline/profile migration:** none.
**Artifact impact:** source module, tests and documentation only; downstream packaged source inclusion follows existing Electron files policy.
