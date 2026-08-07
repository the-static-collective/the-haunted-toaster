# Haunted Toaster Agent Operating Law

This file governs coding agents working in this repository. It is a scope and authority contract, not a substitute for issue-specific acceptance criteria.

## 1. Product authority

The Haunted Toaster owns deterministic transformation from accepted song/render inputs into a witnessed local video render and its retained provenance artifacts.

For score-driven v0.5 work, the governing execution chain is:

```text
accepted VisualScore
  -> canonical ResolvedTimeline
  -> production preview
  -> production render
  -> score/timeline sidecars
  -> receipt
```

Once a render is score-driven, the accepted `ResolvedTimeline` is authoritative for semantic execution.

## 2. Non-authority

Agents must not silently move authority into:

- UI state;
- renderer-specific defaults;
- preview-only logic;
- AI/model output;
- Toaster Lab or another upstream proposal surface;
- ambient process state, wall-clock time, or unseeded randomness;
- a second validation/resolution implementation.

Upstream systems may propose. Haunted Toaster validates, resolves, executes, and proves only within its canonical boundary.

## 3. Invariants

Unless an issue explicitly changes one of these laws, preserve all of them:

1. **One accepted timeline, one semantic execution.** Preview and final render must consume the same accepted timeline semantics.
2. **No hidden entropy.** `Math.random()`, `Date.now()`, ambient entropy, or hidden generation defaults may not alter score-driven semantic choices.
3. **No silent dual authority.** Renderer code may derive concrete render parameters from the timeline, but may not mutate or reinterpret the accepted score/timeline.
4. **Canonical artifacts remain inspectable.** Retained score/timeline artifacts must represent exactly what was accepted and consumed.
5. **Receipts prove completed reality.** A failed render must not leave a receipt claiming successful accepted completion.
6. **Compatibility is explicit.** Preserve the v0.4 execution floor until it is deliberately migrated; do not accidentally reinterpret legacy inputs as new canonical semantics.
7. **Local-first remains the default.** Do not introduce cloud/network dependence into the execution path unless the issue explicitly requires it.
8. **Existing audio, lyric timing, muxing, cancellation, validation, and provenance behavior are regression constraints, not incidental implementation details.**

## 4. Scope discipline

Prefer the smallest executable slice that makes an issue's next statement mechanically true.

Do not opportunistically add:

- new generation theory;
- new canonical schemas unless a concrete defect requires one;
- new garment families;
- mutation/breeding UX;
- AI aesthetic ranking;
- broad refactors unrelated to the requested proof;
- speculative abstractions for imagined future backends.

If useful code exists on an archaeology/source branch, selectively port only the pieces that satisfy current `main` contracts. Do not merge historical laboratory branches wholesale merely because they contain related code.

## 5. Proof before completion

For source changes under `src/full-measure/`, run the repository's canonical proof path unless the issue specifies a stricter one:

```bash
cd src/full-measure
npm ci
npm run check
npm test
npm run smoke
```

For a narrow docs-only change, source proof is not required unless the documentation alters executable examples or workflow contracts.

When reporting completion, state:

- what changed;
- which invariant or acceptance criterion it satisfies;
- which proof commands ran and their result;
- any remaining unsupported case or explicit stop condition.

Do not report "done" from code inspection alone when the issue requires executable proof.

## 6. Current sequential priority

When no narrower issue instruction overrides it, respect explicit dependency order rather than selecting the most conceptually interesting work.

The current v0.5 execution seam is:

```text
ResolvedTimeline
  -> production preview/render parity
  -> score/timeline sidecars
  -> receipt binding
```

Candidate-family generation, lock/mutate UX, breeding, and broader creative exploration belong after the execution seam is mechanically true.

## 7. Agent roles

These are behavioral roles, not separate authorities.

### Implementation agent

Make the smallest change that satisfies the selected issue. Preserve all invariants and stop at the issue boundary.

### Hostile reviewer

Try to falsify the implementation. Look for hidden entropy, duplicate authority, silent fallbacks, mutable canonical artifacts, compatibility regressions, unproved claims, and scope expansion.

### Archaeology agent

Search old branches/PRs for reusable implementation pieces, but treat them as evidence and source material only. Current `main` contracts win.

### Dependency reconciler

Compare issue/PR dependency language with merged repository reality. Update stale sequencing instead of creating duplicate conceptual work.

### Test-proof agent

Translate acceptance criteria into executable tests or reproducible proof. Prefer a failing proof before a fix when feasible, then demonstrate the exact condition passing.

## 8. Refusal rule

If a requested change would violate a repository invariant or depends on an unresolved prerequisite, do not silently weaken the invariant to make the patch pass.

Instead:

1. identify the conflicting law or missing prerequisite;
2. preserve the current behavior;
3. leave explicit evidence of what remains blocked;
4. propose the smallest lawful next slice.

## 9. Completion test

A patch is complete when its requested statement is mechanically true, proven at the required boundary, and no broader authority has been smuggled into the implementation.
