# Topology Event Authority Carrier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make topology-event authority a candidate-level immutable carrier that survives same-identity wrappers and is reissued at every genuine candidate birth, eliminating operation-specific topology re-attachment for GENERATE/MUTATE/CROSS/STOMP/CONVERGE.

**Architecture:** Add one focused authority module that can issue and verify a `TopologyEventAuthorityV1` from a canonical birth family and candidate. Extend `resolveTopologyEvents` to normalize either the legacy verified family form or the new carrier into the same strict internal authority facts. Move ordinary topology/L BRANCH enrichment to one shared birth-constitution helper so candidate-session operations do not each remember topology wiring separately.

**Tech Stack:** Node.js CommonJS, deterministic canonical hashing, `node:test`, existing Full Measure generation/session/render/receipt modules.

**Spec:** `docs/superpowers/specs/2026-08-25-topology-event-authority-carrier-design.md`

## Global Constraints

- Keep `resolveTopologyEvents` fail-closed; never trust arbitrary CROSS/STOMP/CONVERGE family schemas.
- Candidate genealogy remains separate from topology-event execution authority.
- Same candidate selection/relabeling carries authority; a new score/timeline birth receives new authority.
- Existing CandidateFamily authority input remains supported for compatibility.
- TEST 6 remains a forced witness outside ordinary ecology.
- CROSS is included only as a machine seam specimen, not WALK E product/UI scope.
- No Windows Witness #2 until the transition crucible and full repository gate are green.

---

### Task 1: Candidate-level topology-event authority carrier

**Files:**
- Modify: `src/full-measure/src/generation/topology-event-authority.cjs`
- Modify: `src/full-measure/src/generation/topology-events.cjs`
- Test: `src/full-measure/tests/topology-events.test.cjs`

**Interfaces:**
- Produces: `issueTopologyEventAuthority(family, candidateIndex)`
- Produces: `verifyTopologyEventAuthority(authority)`
- Preserves: `projectTopologyEventAuthority(family)` during migration if existing callers still require it.
- `resolveTopologyEvents(timeline, { authority, events })` becomes the new carrier form while the legacy `{ family, candidateIndex, events }` remains valid.

- [ ] **Step 1: Write failing carrier tests**

Add tests proving:

```js
const authority = issueTopologyEventAuthority(family, 0);
assert.equal(authority.scoreAddress, family.candidates[0].scoreAddress);
assert.equal(authority.sourceTimelineHash, family.candidates[0].timelineHash);
assert.equal(verifyTopologyEventAuthority(authority).authoritySha256, authority.authoritySha256);
```

and that tampering with score address, source timeline hash, locks, family hash, candidate index, or `authoritySha256` fails closed.

Add a resolver test:

```js
const timeline = resolveTopologyEvents(candidate.timeline, {
  authority,
  events: [request],
});
assert.equal(timeline.topologyEvents.acceptedAuthoritySha256, authority.authoritySha256);
```

- [ ] **Step 2: Run focused test and verify RED**

Run:

```text
npm --prefix src/full-measure test -- --test-name-pattern="topology event authority|authority carrier"
```

Expected: FAIL because candidate-level issuer/verifier and carrier resolver form do not yet exist.

- [ ] **Step 3: Implement minimal authority carrier**

Use a versioned schema/policy and canonical hash domain. Carrier core must bind the exact birth family/candidate facts from the design spec and be deeply frozen.

- [ ] **Step 4: Normalize both resolver authority forms**

Refactor `resolveTopologyEvents` so legacy family input and new carrier input reduce to one normalized internal authority object before event validation. Keep exact-key validation for each public input shape.

- [ ] **Step 5: Run focused tests GREEN**

Run the same focused command plus the entire topology-events test file.

- [ ] **Step 6: Commit**

```text
git add src/full-measure/src/generation/topology-event-authority.cjs src/full-measure/src/generation/topology-events.cjs src/full-measure/tests/topology-events.test.cjs
git commit -m "feat: add topology event authority carrier"
```

### Task 2: Put authority on ordinary candidate births

**Files:**
- Modify: `src/full-measure/src/generation/candidate-family.cjs` and/or the current beta ecology birth module actually used by WALK E.
- Modify: `src/full-measure/src/generation/ordinary-topology-activity.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Test: existing ordinary topology activity / candidate ecology tests discovered in the branch.

**Interfaces:**
- Every newly born ordinary candidate exposes immutable `topologyEventAuthority` before topology activity is attached.
- `projectOrdinaryTopologyActivityView` consumes the candidate carrier directly and no longer needs an `authorityForCandidate` reconstruction callback for ordinary families.

- [ ] **Step 1: Write failing birth-carrier tests**

Assert every generated candidate has a verified carrier whose score/source timeline matches the pre-event candidate birth identity.

- [ ] **Step 2: Verify RED**

Run only the relevant generation/activity tests and confirm the missing carrier causes the failure.

- [ ] **Step 3: Issue carrier at family finalization**

After the birth family hash is known, map candidates to carrier-bearing candidates and freeze the resulting family without creating a circular hash dependency. The family hash remains the birth-family hash; carrier fields are an execution envelope over that already-addressed birth.

- [ ] **Step 4: Simplify ordinary activity projection**

Use `candidate.topologyEventAuthority` as the authority input to `resolveTopologyEvents`. Remove ordinary-path family reconstruction where no longer needed.

- [ ] **Step 5: Run relevant tests GREEN**

Run ordinary topology activity + candidate ecology + topology events tests.

- [ ] **Step 6: Commit**

```text
git commit -am "refactor: carry topology authority on candidate birth"
```

### Task 3: Replace session operation-specific topology wiring with one birth constitution

**Files:**
- Modify: `src/full-measure/src/candidate-session.cjs`
- Create or modify one focused generation helper for `constituteOrdinaryCandidateFamily(...)` if existing structure supports it.
- Test: `src/full-measure/tests/candidate-session*.test.cjs` / WALK E interaction tests.

**Interfaces:**
- Shared helper consumes one newly born family plus analysis/listening/constraints/profile context and returns the fully ordinary enriched family: topology activity first, then L BRANCH.
- GENERATE, MUTATE, CROSS, STOMP, CONVERGE call the same helper when they create a new family.
- Selection/relabel paths do not reconstitute a same-identity candidate.

- [ ] **Step 1: Write failing transition tests**

For each operation, assert the resulting accepted candidate has:

```js
candidate.topologyEventAuthority
candidate.timeline.topologyEvents
candidate.timeline.topologyEvents.acceptedAuthoritySha256 === candidate.topologyEventAuthority.authoritySha256
```

and no operation-specific authority reconstruction callback is required.

- [ ] **Step 2: Verify RED**

At least one transition must fail for the expected missing shared invariant before production changes.

- [ ] **Step 3: Extract the shared birth constitution**

Centralize ordinary topology activity + L BRANCH composition. Keep operation-specific genealogy only in the birth family generator.

- [ ] **Step 4: Route GENERATE/MUTATE/CROSS/STOMP/CONVERGE through it**

Do not add wrapper-specific event logic; only pass each new family through the common constitution.

- [ ] **Step 5: Run transition tests GREEN**

Run candidate-session and WALK E interaction tests.

- [ ] **Step 6: Commit**

```text
git commit -am "fix: make ordinary enrichment transition invariant"
```

### Task 4: Receipt parity and GRAB/L BRANCH diagnostics

**Files:**
- Modify: current receipt/render evidence builder used by candidate-session.
- Modify: L BRANCH binding receipt projection if needed.
- Test: WALK E receipt/interactions tests.

**Interfaces:**
- Receipt exposes exact topology `planSha256`, `acceptedAuthoritySha256`, event count, event kinds/windows, GRAB-scoped binding evidence, candidate genealogy, and foreign-material evidence.
- Render execution input and receipt must cite the same topology plan hash.

- [ ] **Step 1: Write failing receipt parity test**

For an accepted mutated candidate, compare execution input and retained receipt topology identities byte-for-byte/canonically.

- [ ] **Step 2: Verify RED**

Confirm receipt currently omits at least one required authority/schedule field or does not prove parity.

- [ ] **Step 3: Add the smallest retained evidence projection**

Do not duplicate renderer state; retain canonical plan/carrier/binding identities and the existing event records required for diagnosis.

- [ ] **Step 4: Add failure-class assertions**

Prove tests can distinguish zero scheduled GRABs from a scheduled GRAB with successful execution evidence.

- [ ] **Step 5: Run receipt/render tests GREEN**

Run affected receipt, render, foreign-material, L BRANCH and candidate-session tests.

- [ ] **Step 6: Commit**

```text
git commit -am "test: bind topology authority into render receipts"
```

### Task 5: Exact transition crucible and repository gate

**Files:**
- Test: create/extend one WALK E transition-crucible test file.
- Docs/PR evidence only after machine proof.

**Interfaces:**
- One deterministic fixture exercises GENERATE/MUTATE/CROSS/STOMP/CONVERGE and compares topology plan identities between accepted render input and receipt.

- [ ] **Step 1: Add the five-path crucible**

Each path must prove verified carrier, non-silent topology schedule, execution/receipt plan parity, and lawful GRAB→L BRANCH binding when GRAB exists.

- [ ] **Step 2: Run focused crucible**

Expected: PASS.

- [ ] **Step 3: Run Full Measure tests**

```text
npm --prefix src/full-measure test
```

Expected: all pass.

- [ ] **Step 4: Run repository verification/smoke**

```text
npm run verify
npm --prefix src/full-measure run smoke
```

Run runtime audit and canonical renderer witness checks through the repository-owned workflow where applicable.

- [ ] **Step 5: Record exact head/tree and CI evidence**

Do not package Windows yet if any machine gate is red.

- [ ] **Step 6: Commit proof-only changes**

```text
git commit -am "test: add topology authority transition crucible"
```

### Task 6: Windows Witness #2 only after green

**Files:**
- No product code expected.
- Update #248 / PR body with exact machine and artifact evidence.

- [ ] **Step 1: Trigger one Windows distribution build from the exact green head/tree.**
- [ ] **Step 2: Record branch head SHA, tree SHA, workflow run, merge-ref/tree parity if applicable, artifact id/name/size/digest, and Build Info identity.**
- [ ] **Step 3: Preserve Witness #1 as historical evidence; do not overwrite its provenance.**
- [ ] **Step 4: Run the narrowed human witness against the new exact package.**
- [ ] **Step 5: Do not tag/release/promote without a separate landing decision.**
