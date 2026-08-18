# Durable Listener Draft — Implementation Plan

> **Execution:** TDD-first Track 0 trust repair. GitHub issue #153 is requirement authority. PR #155 is stacked after PR #154 so the eventual packaged field build contains both Track 0 repairs.

**Goal:** Human lyric timing edits survive closing and reopening the Listener. A fresh machine pass occurs only through explicit Re-listen and preserves staged human anchors.

**Architecture:** Keep the existing in-memory `state.alignment` as the draft authority for the current exact source. Closing the dialog hides the editor without clearing it. `beginAutoSync()` reopens an existing draft instead of rerunning the Listener. Lyric/audio source replacement invalidates the draft. Foundry Re-listen dispatches an explicit fresh-pass event after staging its existing anchor evidence.

**Scope:** renderer behavior only; no matcher rewrite, second lyric clock, cloud storage, or new canonical timing schema.

---

## Task 1 — RED: reproduce close/reopen loss

**File:** `src/full-measure/tests/anchor-guided-renderer-contract.test.cjs`

Prove the current renderer lacks the reopen-existing-draft branch, explicit re-listen event, and lyric-source invalidation. Preserve the existing human-anchor and bounded-recovery contracts.

## Task 2 — GREEN: preserve the draft

**Files:**
- `src/full-measure/src/renderer/app.js`
- `src/full-measure/src/renderer/lyric-foundry-ui.js`

Implement:
1. `beginAutoSync()` reopens `state.alignment` when present.
2. explicit `haunted-listener-relisten` performs the fresh pass.
3. Foundry stages anchors then dispatches that explicit event rather than clicking Listen Closer.
4. manual/imported lyric-source replacement invalidates the old draft; audio replacement already invalidates alignment.
5. `closeSyncDialog()` never clears alignment.

## Task 3 — verification + UI witness

Run the repository-required consolidated proof. Required evidence:
- focused durability test GREEN;
- full test suite GREEN;
- canonical browser renderer witness GREEN;
- behavioral UI disposition recorded;
- packaged Electron/Windows witness before Track 0 closure.

## Stop condition

Stop before merge/tag/release. Human field witness must prove: time several lyrics → close outside Listener → reopen → exact edits remain; explicit Re-listen keeps human anchors while allowing machine-owned cues to change.