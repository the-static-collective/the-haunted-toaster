# FRANKEN-COMPOSER-001 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one deterministic 30–60 second cross-renderer composition bench in Haunted Toaster that freezes a renderer-neutral `FrankenCompositionV0`, then projects the same accepted semantics through HyperFrames and Remotion.

**Architecture:** Haunted Toaster owns the canonical composition artifact and freeze boundary. Playdeck and Haunted Blender cross through read-only adapters that produce proposal/material evidence only; renderer projectors consume the frozen plan and emit separate receipts without gaining composition authority. The production Electron renderer hosts a bounded experimental bench, while the Remotion runtime remains isolated in a developer-only package so React/Remotion dependencies do not enter the packaged Toaster application.

**Tech Stack:** Node.js 22 CommonJS, Electron 43, Node test runner, Playwright/JSDOM witness infrastructure, ffmpeg-static/ffprobe-static, canonical SHA-256 addressing, Remotion 4.x in an isolated experimental package, HyperFrames HTML/GSAP projection plus local CLI validation.

**Spec:** `docs/superpowers/specs/2026-10-03-franken-composer-001-design.md`

## Global Constraints

- Host repository is `the-static-collective/the-haunted-toaster`; donor repositories remain unchanged.
- Base execution ancestry is the reviewed HyperKitchen carrier, not `main`.
- Preserve `accepted VisualScore -> canonical ResolvedTimeline -> preview -> render -> sidecars -> receipt`; FRANKEN-COMPOSER-001 does not widen that authority chain.
- Canonical schema is `static-collective/franken-composition/v0`.
- Founding witness duration is exactly **48 seconds at 24 fps** (1152 frames), inside the approved 30–60 second range.
- Founding witness has exactly three named scenes: `ARRIVE`, `CROSS`, `ASSEMBLE`.
- Founding witness uses at least six addressable card/image materials, one accepted Blender moving take, one typography layer, one topology/material layer, and at least two transition relations.
- Hidden entropy is forbidden: no `Math.random()`, `Date.now()`, wall-clock choice, renderer-local defaults, or ambient UI state may alter canonical composition semantics.
- Proposal state is not accepted state. Only the freeze boundary creates canonical plan bytes/hash.
- Remotion and HyperFrames consume the same canonical plan hash; semantic parity is required, byte/pixel parity is not.
- Remote HyperFrames or other paid/hosted submission is out of scope unless separately authorized.
- No private media, EXIF location data, credentials, provider secrets, release/tag/main promotion, or automatic KEEP.

## Review Focus

1. **Changed donor bytes after proposal creation:** Playdeck source snapshot, Blender acceptance receipt, or Blender video changes before freeze must refuse rather than silently rebinding. Covered in Tasks 2, 3, and 4.
2. **Unsupported renderer semantic:** if one renderer cannot express a required transform/transition, projection must refuse or record an explicitly allowed approximation; it must never invent a substitute. Covered in Tasks 5 and 6.
3. **Malformed temporal geometry:** zero/negative spans, out-of-range source windows, invalid scene transition references, or excess overlap must refuse before either renderer runs. Covered in Tasks 1 and 4.
4. **UI proposal/acceptance confusion:** preview/recompose must never freeze, KEEP, or overwrite canonical state implicitly; keyboard/focus/refusal states must remain truthful. Covered in Task 7.
5. **Cross-renderer drift:** both projectors may rasterize differently, but their normalized semantic traces must exactly match scene boundaries, material IDs, source windows, track order, transforms, transitions, moving-take placement, and text. Covered in Task 8.

---

### Task 1: Canonical FrankenCompositionV0 contract and freeze boundary

**Files:**
- Create: `src/full-measure/src/franken-composer/schema.cjs`
- Create: `src/full-measure/src/franken-composer/freeze.cjs`
- Create: `src/full-measure/src/franken-composer/trace.cjs`
- Test: `src/full-measure/tests/franken-composer-schema.test.cjs`

**Interfaces:**
- Consumes: existing `canonicalize`, `canonicalBytes`, `hashCanonical`, and `deepFreeze` from `src/generation/canonical.cjs`.
- Produces:
  - `normalizeFrankenComposition(input) -> canonical plan object`
  - `freezeFrankenComposition(input) -> {plan, bytes, planHash}`
  - `semanticTrace(plan) -> canonical renderer-neutral trace`
  - constants `FRANKEN_SCHEMA`, `FRANKEN_POLICY`, `FPS=24`, `DURATION_FRAMES=1152`.

- [ ] **Step 1: Write failing contract tests**

Add tests named:

`same inputs produce byte-identical frozen plan and hash`

`explicit semantic delta changes canonical plan hash`

`invalid scene spans transition references and excessive track overlap refuse`

`canonical plan is deeply frozen and cannot be mutated after hashing`

`semantic trace strips renderer-local fields but preserves required parity fields`

Assert exact schema `static-collective/franken-composition/v0`, 24 fps, 1152 frames, finite numbers, stable canonical ordering, and refusal for malformed temporal geometry.

- [ ] **Step 2: Run focused test and verify RED**

Run:

`npm --prefix src/full-measure test -- --test-name-pattern="Franken|frozen plan|semantic trace"`

Expected: FAIL because the Franken modules do not exist.

- [ ] **Step 3: Implement the minimal canonical contract**

In `schema.cjs`, define normalization/validation for ancestry, materials, scenes, tracks, clips, transitions, and receipt identity fields. Bound the founding contract to three scenes, maximum eight tracks per scene, maximum twelve clips per track, and maximum two simultaneous non-background visual clips on the same declared layer.

In `freeze.cjs`, canonicalize, hash with domain `HauntedToaster-FrankenComposition-v0`, deep-freeze, and return immutable bytes/hash.

In `trace.cjs`, project only semantic parity fields: fps, durationFrames, scene spans, tracks/layers, material IDs, source windows, transforms, transition identities/durations, moving-take placement, and text.

- [ ] **Step 4: Run focused test and verify GREEN**

Run:

`node --test src/full-measure/tests/franken-composer-schema.test.cjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/franken-composer/schema.cjs         src/full-measure/src/franken-composer/freeze.cjs         src/full-measure/src/franken-composer/trace.cjs         src/full-measure/tests/franken-composer-schema.test.cjs
git commit -m "feat: add canonical Franken composition contract"
```

---

### Task 2: Read-only Playdeck deck/world adapter

**Files:**
- Create: `src/full-measure/src/franken-composer/adapters/playdeck.cjs`
- Test: `src/full-measure/tests/franken-playdeck-adapter.test.cjs`
- Create: `src/full-measure/tests/fixtures/franken/playdeck-deck.json`
- Create: `src/full-measure/tests/fixtures/franken/playdeck-world-rule.json`
- Create: `src/full-measure/tests/fixtures/franken/cards/card-01.svg` through `card-06.svg`

**Interfaces:**
- Consumes: Playdeck `DeckSpec` / `WorldRule` JSON-compatible shapes from schemaVersion `0.1`.
- Produces: `adaptPlaydeck({deck, worldRule, sourceDigests}) -> {ancestry, cards, worldRule}`, where each card has a stable `materialId`, source digest, order index, bounded traits, temperament/role hints, and explicit proposal-only authority.

- [ ] **Step 1: Write failing adapter tests**

Add tests named:

`six-card Playdeck snapshot adapts without importing session authority`

`changed card bytes or declared digest refuse`

`possibility metadata remains proposal context and never becomes accepted history`

`unknown world rule fields are ignored only when explicitly nonsemantic; unknown semantic fields refuse`

Use six committed SVG fixture cards and exact SHA-256 digests.

- [ ] **Step 2: Run focused test and verify RED**

Run:

`node --test src/full-measure/tests/franken-playdeck-adapter.test.cjs`

Expected: FAIL because `adaptPlaydeck` is missing.

- [ ] **Step 3: Implement `adaptPlaydeck`**

Validate `schemaVersion: "0.1"`, unique card IDs, exactly six founding cards, deterministic order, bounded strings/arrays, and world-rule values `physical`, `surface`, `transition`, `awakening`, and optional `bridge`. Preserve inherited/possibility metadata only inside `ancestry.observation`; emit `authority: "proposal-only"`.

- [ ] **Step 4: Run focused test and verify GREEN**

Run the same test command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/franken-composer/adapters/playdeck.cjs         src/full-measure/tests/franken-playdeck-adapter.test.cjs         src/full-measure/tests/fixtures/franken
git commit -m "feat: adapt Playdeck material into Franken proposals"
```

---

### Task 3: Read-only Haunted Blender accepted-take adapter

**Files:**
- Create: `src/full-measure/src/franken-composer/adapters/blender-take.cjs`
- Test: `src/full-measure/tests/franken-blender-take-adapter.test.cjs`
- Create: `src/full-measure/tests/helpers/franken-blender-fixture.cjs`

**Interfaces:**
- Consumes:
  - Blender acceptance JSON schema `haunted-blender/accepted-creative-take/v0`;
  - matching Creative Claw admission receipt schema `haunted-blender/creative-claw-take-receipt/v0`;
  - exact local MP4 path.
- Produces: `adaptAcceptedBlenderTake({acceptance, admissionReceipt, videoPath}) -> {ancestry, material}`, with `material.kind="video"`, exact digest/byte length, beat identity, private-preview status, and `distributionAuthorized:false`.

- [ ] **Step 1: Write failing Blender boundary tests**

Add tests named:

`accepted private Blender take becomes bounded video material`

`candidate-admitted but not filmmaker-accepted receipt refuses`

`changed video bytes acceptance digest or admission receipt digest refuse`

`distribution authorization is never inferred from acceptance`

The helper should create a deterministic short synthetic MP4 using existing ffmpeg tooling at test time, then construct matching synthetic admission/acceptance witnesses.

- [ ] **Step 2: Run focused test and verify RED**

Run:

`node --test src/full-measure/tests/franken-blender-take-adapter.test.cjs`

Expected: FAIL because the adapter is missing.

- [ ] **Step 3: Implement `adaptAcceptedBlenderTake`**

Use existing file hashing helpers. Require exact schemas/statuses, recompute video SHA-256, recompute admission receipt file digest, compare the acceptance's `admission_receipt_sha256`, preserve `beat`, `artifact_sha256`, and `request_sha256`, and set explicit nonclaims/authority fields. Never read or mutate Blender project state.

- [ ] **Step 4: Run focused test and verify GREEN**

Run the same test command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/franken-composer/adapters/blender-take.cjs         src/full-measure/tests/franken-blender-take-adapter.test.cjs         src/full-measure/tests/helpers/franken-blender-fixture.cjs
git commit -m "feat: admit accepted Blender takes into Franken proposals"
```

---

### Task 4: Deterministic three-act proposal composer and freeze input

**Files:**
- Create: `src/full-measure/src/franken-composer/compose.cjs`
- Create: `src/full-measure/src/franken-composer/proposal.cjs`
- Test: `src/full-measure/tests/franken-composer-compose.test.cjs`

**Interfaces:**
- Consumes:
  - Task 2 `adaptPlaydeck(...)` output;
  - Task 3 `adaptAcceptedBlenderTake(...)` output;
  - `seed: string`;
  - bounded human edits shaped as `{cardOrder, sceneRoles, worldRule, movingTakeSceneId, transitions, text, variation}`.
- Produces:
  - `composeFrankenProposal(inputs) -> proposal`;
  - `applyFrankenEdits(proposal, edits) -> newProposal`;
  - `proposalToComposition(proposal) -> input accepted by Task 1 freeze`.

- [ ] **Step 1: Write failing deterministic composition tests**

Add tests named:

`default seed composes ARRIVE CROSS ASSEMBLE at 48 seconds`

`six cards moving take typography and topology layers are all addressable`

`same seed and edit set replay byte-identically before freeze`

`card reorder transition edit text edit and variation each create attributable semantic deltas`

`stale donor digest between proposal and freeze refuses`

`unsupported role transition or moving-take placement refuses rather than coercing`

Use exact scene spans:
- `ARRIVE`: frames 0–383
- `CROSS`: frames 384–767
- `ASSEMBLE`: frames 768–1151.

Founding transitions:
- `ARRIVE -> CROSS`: `panel-wipe`, 18 frames;
- `CROSS -> ASSEMBLE`: `radial-reveal`, 24 frames.

- [ ] **Step 2: Run focused test and verify RED**

Run:

`node --test src/full-measure/tests/franken-composer-compose.test.cjs`

Expected: FAIL because composer/proposal modules are missing.

- [ ] **Step 3: Implement deterministic proposal/composition lowering**

Derive bounded choices from SHA-256(seed + canonical donor identities + variation) rather than ambient randomness. Keep editable proposal state separate from frozen composition state. Use only the founding transform vocabulary: position/scale/rotation, normalized crop, opacity, z/layer, and source window for video. Typography text is explicit human input; topology/material layer is a generated-shape material with declared parameters.

Before `proposalToComposition` returns, revalidate donor digests captured by Tasks 2 and 3.

- [ ] **Step 4: Run focused test and verify GREEN**

Run the same test command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/franken-composer/compose.cjs         src/full-measure/src/franken-composer/proposal.cjs         src/full-measure/tests/franken-composer-compose.test.cjs
git commit -m "feat: compose deterministic three-act Franken proposals"
```

---

### Task 5: HyperFrames projection and local proof package

**Files:**
- Create: `src/full-measure/src/franken-composer/projectors/hyperframes.cjs`
- Create: `src/full-measure/src/franken-composer/projection-receipt.cjs`
- Create: `src/full-measure/scripts/franken-hyperframes.cjs`
- Test: `src/full-measure/tests/franken-hyperframes-projector.test.cjs`

**Interfaces:**
- Consumes: Task 1 frozen `{plan, planHash}`.
- Produces:
  - `compileHyperFramesFranken({plan, planHash, assetBindings}) -> {manifest, html, semanticTrace}`;
  - `createProjectionReceipt({renderer:"hyperframes", planHash, projectionIdentity, checks, output?})`;
  - CLI writes a self-contained local projection directory.

- [ ] **Step 1: Write failing HyperFrames projection tests**

Add tests named:

`HyperFrames projection carries exact canonical plan hash and semantic trace`

`every clip receives explicit timing track and deterministic entrance semantics`

`multi-scene projection contains both declared transitions and no hidden exit semantics`

`unsupported transform or transition refuses before HTML generation`

`projection receipt cannot claim success without required validation evidence`

- [ ] **Step 2: Run focused test and verify RED**

Run:

`node --test src/full-measure/tests/franken-hyperframes-projector.test.cjs`

Expected: FAIL because projector is missing.

- [ ] **Step 3: Implement the HyperFrames projector**

Follow the installed HyperFrames contract: explicit `data-composition-id`, `data-start`, `data-duration`, `data-track-index`; registered paused GSAP timeline; finite repeats only; synchronous timeline construction; entrance animation on every scene element; transitions own non-final exits.

Do not reuse PR #297's 320×180 HyperFood-specific identity as Franken authority. Reuse only proven HTML/timeline implementation patterns.

- [ ] **Step 4: Run unit proof and local CLI validation**

Run:

```bash
node --test src/full-measure/tests/franken-hyperframes-projector.test.cjs
node src/full-measure/scripts/franken-hyperframes.cjs --fixture
npx hyperframes lint <generated-dir>
npx hyperframes validate <generated-dir>
npx hyperframes inspect <generated-dir>
```

Expected: all commands succeed. If the local HyperFrames CLI is unavailable, record that environment blocker and do not mark the validation evidence as passed.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/franken-composer/projectors/hyperframes.cjs         src/full-measure/src/franken-composer/projection-receipt.cjs         src/full-measure/scripts/franken-hyperframes.cjs         src/full-measure/tests/franken-hyperframes-projector.test.cjs
git commit -m "feat: project Franken plans into HyperFrames"
```

---

### Task 6: Isolated Remotion projection runtime

**Files:**
- Create: `src/full-measure/src/franken-composer/projectors/remotion.cjs`
- Create: `src/full-measure/tests/franken-remotion-projector.test.cjs`
- Create: `experiments/franken-composer-remotion/package.json`
- Create: `experiments/franken-composer-remotion/tsconfig.json`
- Create: `experiments/franken-composer-remotion/src/index.ts`
- Create: `experiments/franken-composer-remotion/src/Root.tsx`
- Create: `experiments/franken-composer-remotion/src/FrankenComposition.tsx`
- Create: `experiments/franken-composer-remotion/src/types.ts`
- Create: `experiments/franken-composer-remotion/src/loadBundle.ts`
- Modify: root `package.json` to add developer-only `franken:remotion:check` and `franken:remotion:studio` scripts without changing `npm run verify`.

**Interfaces:**
- Consumes: Task 1 frozen `{plan, planHash}`.
- Produces:
  - `compileRemotionFranken({plan, planHash, assetBindings}) -> {bundle, semanticTrace}`;
  - developer bundle JSON written for the isolated Remotion project;
  - `FrankenComposition` React component consuming only the frozen bundle.

- [ ] **Step 1: Write failing Remotion projector tests**

Add tests named:

`Remotion bundle carries exact canonical plan hash and semantic trace`

`renderer bundle contains no proposal-only or mutable editor state`

`unsupported semantic refuses rather than defaulting in React`

`duration fps dimensions and scene spans derive only from frozen plan`

- [ ] **Step 2: Run focused test and verify RED**

Run:

`node --test src/full-measure/tests/franken-remotion-projector.test.cjs`

Expected: FAIL because projector/runtime files are missing.

- [ ] **Step 3: Implement the Node projector and isolated Remotion package**

Pin compatible Remotion/React versions in the experiment package. Keep the Toaster app manifest free of React/Remotion dependencies. Give every independently editable/rendered clip its own JSX node; use Remotion sequencing only to realize frozen plan spans. Renderer code must not compute creative choices.

- [ ] **Step 4: Verify the Remotion composition is loadable**

Run:

```bash
npm --prefix experiments/franken-composer-remotion ci
npm run franken:remotion:check
npm run franken:remotion:studio -- --no-open
```

Expected: typecheck/composition discovery succeeds and Studio exposes the `Franken001` composition. Do not render an MP4 by default; interactive preview is the required proof at this task.

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/franken-composer/projectors/remotion.cjs         src/full-measure/tests/franken-remotion-projector.test.cjs         experiments/franken-composer-remotion         package.json
git commit -m "feat: add isolated Remotion projection for Franken plans"
```

---

### Task 7: Bounded Electron composition bench and freeze bridge

**Files:**
- Create: `src/full-measure/src/franken-composer/bridge.cjs`
- Create: `src/full-measure/src/renderer/franken-composer-ui.js`
- Create: `src/full-measure/src/renderer/franken-composer-ui.css`
- Modify: `src/full-measure/src/main.cjs`
- Modify: `src/full-measure/src/preload.cjs`
- Modify: `src/full-measure/src/renderer/index.html`
- Modify: `src/full-measure/witness/witness-bridge.js`
- Test: `src/full-measure/tests/franken-composer-bridge.test.cjs`
- Test: `src/full-measure/tests/franken-composer-ui.test.cjs`
- Modify: `src/full-measure/tests/ui-witness.spec.cjs` only for the reviewed experimental bench states.

**Interfaces:**
- Consumes: Tasks 2–4 adapters/composer/freeze.
- Produces main/preload bridge methods:
  - `chooseFrankenPlaydeckDeck()`
  - `chooseFrankenWorldRule()`
  - `chooseFrankenBlenderAcceptance()`
  - `chooseFrankenBlenderReceipt()`
  - `chooseFrankenBlenderVideo()`
  - `composeFranken(config)`
  - `freezeFranken(config)`
  - `writeFrankenProjectionBundle(config)`.

- [ ] **Step 1: Write failing bridge/UI tests**

Bridge tests:

`franken file pickers validate only expected local JSON MP4 and image surfaces`

`compose returns proposal identity but never a frozen plan hash`

`freeze revalidates source bytes and returns canonical plan hash`

`freeze refuses stale donor material and existing output overwrite`

UI tests:

`bench exposes ARRIVE CROSS ASSEMBLE and six addressable cards`

`reorder role transition text and variation edits recompose without freezing`

`FREEZE THIS COMPOSITION is the only action that creates accepted plan identity`

`keyboard focus refusal and reduced-motion states remain truthful`

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test src/full-measure/tests/franken-composer-bridge.test.cjs
node --test src/full-measure/tests/franken-composer-ui.test.cjs
```

Expected: FAIL because bridge/UI do not exist.

- [ ] **Step 3: Implement the bridge and bounded bench**

Register Franken IPC in `bridge.cjs` and call it from `main.cjs` rather than expanding main with composition logic. Expose only the narrow preload functions above.

Mount one experimental `FRANKEN COMPOSER` home-window surface in the production renderer. Keep the interaction bounded to card order, scene role, world rule, moving-take scene, transition choice, text, variation, `RECOMPOSE`, and `FREEZE THIS COMPOSITION`. Do not add drag-drop timeline tracks, generic node editing, or automatic KEEP/render.

- [ ] **Step 4: Run semantic and browser witness proof**

Run:

```bash
node --test src/full-measure/tests/franken-composer-bridge.test.cjs
node --test src/full-measure/tests/franken-composer-ui.test.cjs
npm --prefix src/full-measure run witness:build
npm --prefix src/full-measure run witness:test
```

Inspect every intentional 1380×900 screenshot delta before updating a baseline.

Required completion record:

```text
UI impact: bridge + behavioral + visual
browser witness: PASS @ <commit>
visual delta: expected
packaged witness required: yes
packaged witness: pending until Task 8
GitBook ontology changed: no
```

- [ ] **Step 5: Commit**

```bash
git add src/full-measure/src/franken-composer/bridge.cjs         src/full-measure/src/renderer/franken-composer-ui.js         src/full-measure/src/renderer/franken-composer-ui.css         src/full-measure/src/main.cjs         src/full-measure/src/preload.cjs         src/full-measure/src/renderer/index.html         src/full-measure/witness/witness-bridge.js         src/full-measure/tests/franken-composer-bridge.test.cjs         src/full-measure/tests/franken-composer-ui.test.cjs         src/full-measure/tests/ui-witness.spec.cjs
git commit -m "feat: add bounded Franken composition bench"
```

---

### Task 8: Cross-renderer parity witness, receipts, exact-head verification, and handoff

**Files:**
- Create: `src/full-measure/scripts/smoke-franken-composer.cjs`
- Create: `src/full-measure/tests/franken-cross-renderer-parity.test.cjs`
- Create: `docs/reconciliation/2026-10-03-franken-composer-001-witness.md`
- Modify: `.github/workflows/haunted-toaster.yml` only if a dedicated Franken job is needed to exercise the isolated Remotion package and HyperFrames local validation.
- Modify: `docs/superpowers/specs/2026-10-03-franken-composer-001-design.md` only to append exact witnessed implementation evidence; do not rewrite the approved design.

**Interfaces:**
- Consumes: all prior tasks.
- Produces:
  - one synthetic 48-second frozen plan;
  - one HyperFrames projection bundle/receipt;
  - one Remotion projection bundle/receipt;
  - normalized parity report;
  - exact-head verification record.

- [ ] **Step 1: Write the failing end-to-end parity test**

Add test:

`one frozen witness yields equal Remotion and HyperFrames semantic traces`

Assert exact equality for:
- plan hash;
- fps/duration;
- scene boundaries;
- material IDs;
- source windows;
- layer/track order;
- transforms;
- transition IDs/durations;
- moving-take placement;
- text.

Also assert renderer-specific receipt fields differ and neither receipt mutates the composition receipt.

- [ ] **Step 2: Run end-to-end test and verify RED if any integration seam is still incomplete**

Run:

`node --test src/full-measure/tests/franken-cross-renderer-parity.test.cjs`

Expected before final wiring: FAIL on the first missing seam; fix only the owning task's interface, not the test expectation.

- [ ] **Step 3: Implement the smoke witness and linked receipts**

`smoke-franken-composer.cjs` should:

1. materialize the six-card fixture;
2. create the synthetic accepted Blender take fixture;
3. adapt both donors;
4. compose the three-act proposal;
5. apply one explicit human-style edit fixture;
6. freeze and write canonical plan bytes;
7. compile both projections;
8. write three linked receipts;
9. compare semantic traces;
10. write a machine-readable parity result.

It must be repeatable and refuse overwriting changed immutable outputs.

- [ ] **Step 4: Run all focused and repository proof**

Run:

```bash
node --test src/full-measure/tests/franken-*.test.cjs
node src/full-measure/scripts/smoke-franken-composer.cjs
npm --prefix experiments/franken-composer-remotion ci
npm run franken:remotion:check
npm --prefix src/full-measure run witness:build
npm --prefix src/full-measure run witness:test
npm run verify
npm --prefix src/full-measure run pack
npm run dist:win
```

Then run the HyperFrames local proof from Task 5 against the exact frozen witness package:

```bash
npx hyperframes lint <generated-dir>
npx hyperframes validate <generated-dir>
npx hyperframes inspect <generated-dir>
```

Expected: all available required commands pass on the exact head. Any unavailable environment capability is recorded as a blocker, never converted into PASS.

- [ ] **Step 5: Human visual review**

Inspect:
- Remotion Studio `Franken001` preview;
- HyperFrames hero frames / local preview;
- production Electron Franken bench;
- packaged Electron witness if bridge/native dialogs changed.

Confirm:
- no unexplained clipping;
- all six cards visibly participate;
- moving take is bounded to the declared scene;
- typography and topology layers are visibly distinct;
- both transition relations occur;
- editor changes visibly alter proposal output;
- frozen identity is displayed only after freeze.

- [ ] **Step 6: Write the reconciliation/witness note**

Record exact branch/head, donor branch/SHA identities, all commands/results, plan hash, projection identities, parity result, UI completion record, artifact impact, unsupported cases, and whether any canonical artifact/profile/receipt compatibility surface changed.

Do not claim hosted HyperFrames execution unless it actually occurred with explicit authorization.

- [ ] **Step 7: Commit final witness state**

```bash
git add src/full-measure/scripts/smoke-franken-composer.cjs         src/full-measure/tests/franken-cross-renderer-parity.test.cjs         docs/reconciliation/2026-10-03-franken-composer-001-witness.md         docs/superpowers/specs/2026-10-03-franken-composer-001-design.md         .github/workflows/haunted-toaster.yml
git commit -m "test: witness Franken cross-renderer composition"
```

- [ ] **Step 8: Whole-branch review and PR handoff**

Run a fresh whole-branch review against the approved spec and this plan. Resolve only evidenced defects. Push the implementation branch, open/update the implementation PR against the reviewed experimental carrier, and use PR Completion to shepherd CI/reviews/conflicts to **ready**. Stop before landing unless the user gives explicit per-PR landing confirmation for the exact ready head SHA.
