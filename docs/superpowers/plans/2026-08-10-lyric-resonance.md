# Lyric Resonance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, time-addressed lyric resonance so canonically timed words can summon bounded atmosphere-family responses without rewriting the base VisualScore.

**Architecture:** Reuse the existing lyric parser as the timing-evidence gate, derive a small canonical resonance object before timeline hashing, carry that evidence through every active generation wrapper, and compile only accepted timeline evidence in the atmosphere renderer. Plain/evenly-distributed lyric timing remains presentation-only and cannot create semantic procs.

**Tech Stack:** Node.js CommonJS, `node:test`, existing canonical hashing/freezing utilities, ASS overlay compiler, GitHub Actions `npm run verify` proof.

## Global Constraints

- Current `main` is product authority; branch starts from `70d700c2d08d0ab3202964feea7c378f1064901d`.
- `ResolvedTimeline` remains the sole semantic execution authority after resolution.
- No renderer-side lyric-string interpretation.
- No hidden entropy, network lookup, embedding model, wall-clock semantic choice, or new dependency.
- Only `createLyricTrack(...).timed === true` evidence may create time-addressed lyric resonance.
- Existing VisualScore address behavior remains unchanged solely because lyric text changes.
- Legacy timelines with no `lyricResonance` remain valid and retain existing canonical behavior.
- No tag, release, package-version change, or merge in this slice without separate explicit authorization.
- Local repository execution is unavailable in this agent host because outbound GitHub DNS is unavailable; use branch-push GitHub Actions as the executable red/green proof and report that limitation.

---

### Task 1: Prove the missing semantic boundary (RED)

**Files:**
- Create: `src/full-measure/tests/lyric-resonance.test.cjs`

**Interfaces:**
- Consumes: existing `generation.resolve(analysis, score, constraints, profile, optionalLyricTrack)` call shape; the optional fifth argument is intentionally ignored before implementation.
- Produces: executable expectations for `ResolvedTimeline.lyricResonance`.

- [ ] **Step 1: Write the first failing test**

Create a timed LRC track with the existing `createLyricTrack`, resolve an otherwise unchanged VisualScore with that track, and assert that a `smoke` event exists at the canonical cue tick.

```js
const track = createLyricTrack("[00:03.00]nothing left but smoke", sectional.durationSeconds);
const timeline = generation.resolve(sectional, score.score, porchlight, profile, track);
assert.equal(timeline.lyricResonance.schema, "haunted-toaster/lyric-resonance/v1");
assert.equal(timeline.lyricResonance.events[0].family, "smoke");
assert.equal(timeline.lyricResonance.events[0].startTick, 3000);
```

- [ ] **Step 2: Push the test-only commit and verify RED in GitHub Actions**

Expected failing boundary: `timeline.lyricResonance` is absent because no production resolver consumes timed lyric evidence yet.

Canonical CI command executed by Actions:

```bash
npm run verify
```

- [ ] **Step 3: Record the failing workflow/job as TDD evidence**

Do not write production code until Actions demonstrates the assertion failure for the missing feature.

---

### Task 2: Add the deterministic lyric-resonance resolver (GREEN at generation boundary)

**Files:**
- Create: `src/full-measure/src/generation/lyric-resonance.cjs`
- Modify: `src/full-measure/src/generation/index.cjs`
- Modify: `src/full-measure/src/generation/atmosphere-generation.cjs`
- Modify: `src/full-measure/src/generation/primitive-field-generation.cjs`
- Modify: `src/full-measure/src/generation/stomp-generation.cjs`
- Modify: `src/full-measure/src/candidate-session.cjs`
- Extend: `src/full-measure/tests/lyric-resonance.test.cjs`

**Interfaces:**
- Produces: `resolveLyricResonance(track, { timebase, durationTicks }) -> frozen evidence | null`.
- Produces constants: `LYRIC_RESONANCE_SCHEMA`, `LYRIC_RESONANCE_POLICY`, `LYRIC_RESONANCE_FAMILIES`.
- Extends generation entry points with optional `lyricTrack` while leaving callers without it unchanged.

- [ ] **Step 1: Extend RED coverage before implementation**

Add focused assertions proving:

```js
// exact > strong
assert.equal(exact.events[0].intensity, 1);
assert.equal(strong.events[0].intensity, 0.72);

// plain lyrics have no authority
assert.equal(resolveLyricResonance(plainTrack, timelineClock), null);

// unrelated text is silent
assert.equal(resolveLyricResonance(unrelatedTimedTrack, timelineClock), null);

// nearby same-family cues coalesce
assert.deepEqual(coalesced.events[0].cueIndices, [0, 1]);

// the score address is independent from timed lyric text
assert.equal(smokeTimeline.scoreAddress, rainTimeline.scoreAddress);
assert.notEqual(smokeTimeline.timelineHash, rainTimeline.timelineHash);
```

- [ ] **Step 2: Implement the local v1 lexicon and scoring**

Implement exact/strong/related weights from the approved design (`1.0`, `0.72`, `0.45`), stable token normalization, `+0.08` additional-token accumulation capped at `1.0`, nominal event duration `2.4 + intensity * 2.4` seconds, and 1.5-second same-family coalescing.

- [ ] **Step 3: Attach resonance before timeline hashing**

Extend atmosphere resolution to accept an optional lyric track. If the resolver returns evidence, add `body.lyricResonance` before computing `HauntedToaster-ResolvedTimeline-v1`; if it returns null, omit the field entirely.

- [ ] **Step 4: Preserve resonance through the active wrapper stack**

Thread `lyricTrack` through primitive-field generation/replay/converge and STOMP pool generation. `candidate-session.cjs` must derive the track from `config.lyrics` using inspected media duration and pass it only when `track.timed === true`.

- [ ] **Step 5: Push and verify focused generation tests GREEN**

GitHub Actions runs:

```bash
npm run verify
```

Expected: the new lyric-resonance tests pass and legacy generation/replay tests remain green.

---

### Task 3: Validate accepted timeline evidence

**Files:**
- Modify: `src/full-measure/src/render/timeline-execution.cjs`
- Extend: `src/full-measure/tests/lyric-resonance.test.cjs`

**Interfaces:**
- Consumes: optional `timeline.lyricResonance`.
- Produces: fail-closed validation before preview/final execution.

- [ ] **Step 1: Write failing validation tests**

Cover unsupported family, out-of-range ticks, `endTick <= startTick`, intensity outside `[0, 1]`, malformed cue indices/matched terms, and unordered events.

- [ ] **Step 2: Implement narrow optional validation**

When absent, do nothing. When present, require the exact v1 schema/policy, supported atmosphere family, canonical integer bounds, finite intensity, and stable arrays.

- [ ] **Step 3: Push and verify validation tests GREEN**

```bash
npm run verify
```

---

### Task 4: Compile resonance as bounded additive atmosphere

**Files:**
- Modify: `src/full-measure/src/render/atmosphere.cjs`
- Modify: `src/full-measure/src/render/render.cjs`
- Extend: `src/full-measure/tests/atmosphere.test.cjs`
- Extend: `src/full-measure/tests/lyric-resonance.test.cjs`

**Interfaces:**
- Consumes: accepted `timeline.lyricResonance.events` only; never lyric strings.
- Produces: one ASS overlay containing the unchanged base atmosphere field plus deterministic bounded burst events.
- Produces render evidence: base `kind`, resonance event count/families, content hash.

- [ ] **Step 1: Write failing renderer tests**

Prove:

```js
// none + smoke summons smoke only during the event window
assert.equal(result.evidence.kind, "none");
assert.deepEqual(result.evidence.resonanceFamilies, ["smoke"]);
assert.equal(result.evidence.resonanceEventCount, 1);

// base rain is still rain while smoke visits
assert.equal(result.evidence.kind, "rain");
assert.deepEqual(result.evidence.resonanceFamilies, ["smoke"]);

// no resonance preserves legacy no-op/content behavior
assert.equal(noResonance.contentSha256, legacyExpected.contentSha256);
```

- [ ] **Step 2: Add family-specific burst generators**

Generate compact smoke/rain/dust/firefly ASS events bounded to each accepted `[startTick, endTick]` window and scaled by accepted intensity. Seed from timeline identity plus canonical event contents.

- [ ] **Step 3: Permit resonance-only overlay injection**

Change the current `kind === "none"` early return so `none` remains a no-op only when there is also no resonance content.

- [ ] **Step 4: Surface atmosphere evidence in the receipt compiler record**

Add `atmosphere: filter.atmosphereEvidence` to `render.visualCompiler`. The retained timeline sidecar already preserves the canonical resonance plan; this makes the compiled result directly visible in the receipt as well.

- [ ] **Step 5: Push and verify renderer tests GREEN**

```bash
npm run verify
```

---

### Task 5: Full proof, review, and PR completion boundary

**Files:**
- Possibly modify tests/docs only if verification exposes an in-scope defect.

**Interfaces:**
- Consumes: final branch head.
- Produces: draft/ready PR linked to #110 with exact validation evidence and known limitations.

- [ ] **Step 1: Confirm GitHub Actions `verify` success at the exact final head**

Required CI stages from `.github/workflows/haunted-toaster.yml`:

```text
Install locked dependencies
Run consolidated application proof (npm run verify)
Audit runtime dependencies
Upload smoke proof
```

- [ ] **Step 2: Inspect changed files and PR scope**

Confirm no package version, lockfile dependency, release workflow, unrelated UI, or artifact binaries changed.

- [ ] **Step 3: Open a draft PR linked to #110**

PR body must state the authority model, timing-evidence gate, exact tests/CI proof, artifact impact, and local-execution limitation.

- [ ] **Step 4: Run one bounded automated-review pass if repository review automation starts**

Classify every unresolved thread against #110. Fix only valid in-scope findings, rerun CI after fixes, and do not broaden into unrelated semantic families.

- [ ] **Step 5: Stop at verified ready-to-merge state**

Do not merge because this request authorized implementation/PR completion work but did not explicitly authorize merge or release promotion.

## Self-review

- Spec coverage: timing authority, semantic weights, coalescing, canonical hashing, generation/replay/STOMP transport, validation, renderer bursts, receipt evidence, compatibility, and proof are each assigned to a task.
- Placeholder scan: no TODO/TBD or unspecified implementation step remains.
- Type consistency: `lyricTrack` is the single optional transport input; `lyricResonance` is the single accepted timeline evidence field; renderer consumes the latter only.
