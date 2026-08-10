# Matcher False-Placement Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject isolated low-confidence machine placements without weakening human anchors or successful matcher behavior.

**Architecture:** Preserve candidate search. Capture deterministic search context on the winner, then add a separate timing-admission decision for `low` machine candidates. Refused candidates retain review evidence but no start/end time and do not advance the transcript cursor.

**Tech Stack:** CommonJS Node, node:test, deterministic matcher utilities.

## Global Constraints
- Do not globally raise `MIN_ACCEPTED_SCORE`.
- High/medium machine placements retain existing behavior.
- Human anchors retain exact authority and bypass the machine guard.
- Rejected weak evidence becomes `unmatched`, never a guessed timestamp.
- No renderer, subtitle, score, receipt, profile, or version change.

---

### Task 1: False-placement regression proof

**Files:**
- Modify: `src/full-measure/tests/align.test.cjs`
- Modify: `src/full-measure/tests/anchor-guided-listener.test.cjs`

**Interfaces:**
- Consumes: `alignLyricsToTranscript()` and `alignLyricsToTranscriptWithAnchors()`.
- Produces: failing proof for distant isolated low evidence plus explicit anchor preservation.

- [ ] **Step 1: Write failing anomaly test**
  Build a transcript where the first line can only find a distant low-quality candidate at 54.27 seconds and subsequent lyrics provide no corroborating sequence. Assert the cue is `unmatched` with null timing.
- [ ] **Step 2: Write anchor authority test**
  Place an explicit human anchor at 54.27 for the same line against weak/no transcript evidence and assert exact time, `status: human`, and `humanCorrected: true`.
- [ ] **Step 3: Verify RED**
  Run the branch workflow and confirm the anomaly test fails because the matcher currently timestamps the isolated weak candidate.
- [ ] **Step 4: Commit**
  Commit tests as `test isolated matcher placement guard`.

### Task 2: Conservative timing admission

**Files:**
- Modify: `src/full-measure/src/align/matcher.cjs`

**Interfaces:**
- Consumes: current candidate score, similarity, cursor/start index, and next-line lookahead score.
- Produces: deterministic winner context and `hasSufficientTimingEvidence(candidate, confidence)`.

- [ ] **Step 1: Name policy constants**
  Add constants for low-placement minimum score `0.50`, minimum similarity `0.47`, maximum skipped entries `8`, and next-line corroboration score `0.52`.
- [ ] **Step 2: Preserve winner context**
  Have `bestCandidate()` return the winning candidate with `matchContext.skippedEntries` and `matchContext.nextLineScore` derived from existing ranking/lookahead work.
- [ ] **Step 3: Add timing admission function**
  Return true for high/medium candidates. For low candidates, require direct evidence and either local continuity or next-line corroboration.
- [ ] **Step 4: Refuse timing without deleting evidence**
  In `alignLyricsToTranscript()`, emit the existing unmatched shape with the candidate's confidence/similarity/heard evidence when admission fails; do not advance `cursor`.
- [ ] **Step 5: Add positive low-support regression**
  Prove a low candidate satisfying direct evidence plus sequence support is still timed, preventing the guard from becoming a blanket low-confidence ban.
- [ ] **Step 6: Verify GREEN**
  Require `npm run verify` through the branch workflow to pass.
- [ ] **Step 7: Commit**
  Commit implementation as `guard isolated matcher placements`.
