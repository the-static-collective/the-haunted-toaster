# Sigil Grammar v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax.

## Goal

Prove, inside Haunted Toaster and without importing National Treasure runtime code, that the P0–PF Witness Sigil alphabet can behave as a deterministic, replayable topology grammar: first by independently reproducing `witness-sigil/v0.1`, then by constituting a Toaster-owned `sigil-topology-expression/v0`, compiling expressions into renderer-neutral topology intent, and finally producing six materially distinct grammatical descendants from one parent expression.

The v0 stop condition is a **generation-only six-utterance family** with replay/hash proof. It does **not** change VisualScore, ResolvedTimeline, preview, FFmpeg rendering, UI, packaged output, authority/admission semantics, or existing Shape Pack / Ghost Topology behavior.

## Architecture

Keep four units separate:

1. **Witness projection compatibility** — an independent Toaster implementation of the already-frozen National Treasure `witness-sigil/v0.1` recipe/SVG projection. Its job is compatibility evidence only.
2. **Topology expression contract** — a Toaster-owned normalized language object carrying roots, ordered morphology operations, source channel, lineage, and a canonical expression hash.
3. **Renderer-neutral compiler** — deterministic structural consequences derived from an expression, expressed only as Toaster-local topology pressure/traits. It does not write VisualScore or execute a renderer.
4. **Utterance family** — six deterministic child expressions generated from one parent under six fixed grammatical roles, each compiled and receipt-addressed, with family replay proof.

The data flow is:

```text
free-sigil roots OR canonical digest
          ↓
[witness projection compatibility only where needed]
          ↓
sigil-topology-expression/v0
          ↓
ordered morphology
          ↓
sigil-topology-plan/v0
          ↓
six grammar consequences
          ↓
sigil-utterance-family/v0
          ↓
family hash + replay proof
```

No runtime dependency crosses from National Treasure into Haunted Toaster. Shared-looking behavior is proved independently.

## Tech Stack

- Node.js >= 22
- CommonJS (`.cjs`)
- Built-in `node:test` and `node:assert/strict`
- Built-in `node:crypto`
- Existing Haunted Toaster canonical primitives from `src/full-measure/src/generation/canonical.cjs`
- Existing deterministic PRNG from `src/full-measure/src/generation/prng.cjs`
- Existing generation export surface from `src/full-measure/src/generation/index.cjs`
- Existing repository commands from `src/full-measure/package.json`

## Spec

Primary design ancestry:

- National Treasure: `cases/palimpsest-stack/SIGIL-GRAMMAR.md` at commit `3f8dbc5e3461dda94e4f11be6e49903579412451`
- National Treasure: `cases/palimpsest-stack/SHAPE-LANGUAGE.md`
- National Treasure: `tools/witness-sigil/` frozen `witness-sigil/v0.1` reference and five golden vectors
- Haunted Toaster issue #209: **Sigil Grammar v0 — let P0–PF become topology language, not sixteen effects**
- GitBook: **Sigil Language — Geometry Becomes Speech**

## Global Constraints

- The canonical Witness Sigil remains a recognition projection, never authority, authentication, signature, ancestry, admission, or identity proof.
- `witness-locked` and `free-sigil` expressions remain mechanically distinguishable.
- A creative descendant of a Witness Sigil must never impersonate the frozen witness projection that seeded it.
- No National Treasure package/runtime import.
- No new shared cross-project schema/package.
- No renderer, FFmpeg, preview, UI, VisualScore schema, ResolvedTimeline schema, Ghost Topology execution, candidate-family policy, or packaging behavior changes in v0.
- Operation order is significant and must affect expression identity.
- Same accepted inputs + same policy must reproduce byte/hash-equivalent normalized output.
- All numeric operation arguments are finite integers in v0; do not introduce unconstrained floating-point geometry.
- Fail closed on unknown primitives, unknown operators, malformed references, illegal source-channel fields, invalid witness digests, duplicate IDs, or excessive expression size.
- Keep the first grammar finite: the 16 roots P0–PF, the 14 already-declared morphology operators, and six fixed utterance-family roles.
- Preserve existing root test/check/smoke behavior.

---

## Task 1: Independently reproduce Witness Sigil v0.1

**Files:**
- Create: `src/full-measure/src/generation/witness-sigil-projection.cjs`
- Create: `src/full-measure/tests/witness-sigil-projection.test.cjs`
- Create: `src/full-measure/tests/fixtures/witness-sigil-v0.1/README.md`
- Create/copy exactly: `src/full-measure/tests/fixtures/witness-sigil-v0.1/*.recipe.json`
- Create/copy exactly: `src/full-measure/tests/fixtures/witness-sigil-v0.1/*.sigil.svg`

Pin fixture ancestry to:

```text
the-static-collective/national-treasure
commit: 3f8dbc5e3461dda94e4f11be6e49903579412451
path: tools/witness-sigil/fixtures/
```

Copy the ten committed golden files byte-for-byte; do not regenerate or prettify them when importing the test fixtures.

### Step 1.1 — Write the failing compatibility test

- [ ] Add `tests/witness-sigil-projection.test.cjs` that loads every `*.recipe.json` fixture, takes its full digest, calls the local Toaster renderer, and asserts byte equality against both the committed recipe JSON and SVG fixture.

Start with this test shape:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  renderWitnessSigilV01,
} = require("../src/generation/witness-sigil-projection.cjs");

const FIXTURE_DIR = path.join(__dirname, "fixtures", "witness-sigil-v0.1");

for (const file of fs.readdirSync(FIXTURE_DIR).filter((name) => name.endsWith(".recipe.json")).sort()) {
  test(`reproduces golden witness vector ${file}`, () => {
    const recipeText = fs.readFileSync(path.join(FIXTURE_DIR, file), "utf8");
    const expectedRecipe = JSON.parse(recipeText);
    const svgFile = file.replace(".recipe.json", ".sigil.svg");
    const svgText = fs.readFileSync(path.join(FIXTURE_DIR, svgFile), "utf8");

    const actual = renderWitnessSigilV01(expectedRecipe.digest);

    assert.equal(actual.recipeText, recipeText);
    assert.equal(actual.svgText, svgText);
    assert.deepEqual(actual.recipe, expectedRecipe);
  });
}

test("rejects non-canonical digest input", () => {
  for (const digest of [
    "ABCDEF",
    "0".repeat(63),
    "0".repeat(65),
    ` ${"0".repeat(64)}`,
    `${"0".repeat(64)}\n`,
  ]) {
    assert.throws(() => renderWitnessSigilV01(digest), /canonical lowercase SHA-256 digest/);
  }
});
```

### Step 1.2 — Run the focused test and prove RED

- [ ] Run:

```bash
cd src/full-measure
node --test tests/witness-sigil-projection.test.cjs
```

Expected: FAIL because `witness-sigil-projection.cjs` / `renderWitnessSigilV01` does not exist yet.

### Step 1.3 — Implement the independent renderer

- [ ] Create `src/generation/witness-sigil-projection.cjs` without copying/importing executable code from National Treasure.

Required public interface:

```js
renderWitnessSigilV01(digest) -> {
  recipe,
  recipeText,
  svgText,
}
```

Required frozen constants:

```js
const WITNESS_SIGIL_PROJECTION = "witness-sigil/v0.1";
const WITNESS_SIGIL_RECIPE_SCHEMA = "witness-sigil.recipe/v0.1";
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
```

Required semantics:

```text
digest nibbles 0..15  -> P0..PF primitive payload
digest nibbles 16..31 -> quarter-turn payload: (hex & 0x3) * 90
digest nibbles 32..63 -> retained in recipe only, not visible geometry
full digest            -> retained exactly
```

The implementation must reproduce the golden recipe/SVG bytes exactly. Do not normalize, trim, uppercase, prefix-strip, or repair input.

### Step 1.4 — Run focused compatibility tests and prove GREEN

- [ ] Run:

```bash
node --test tests/witness-sigil-projection.test.cjs
```

Expected: PASS for all five golden vectors and invalid-input cases.

### Step 1.5 — Commit Task 1

- [ ] Commit:

```bash
git add src/full-measure/src/generation/witness-sigil-projection.cjs \
  src/full-measure/tests/witness-sigil-projection.test.cjs \
  src/full-measure/tests/fixtures/witness-sigil-v0.1
git commit -m "feat: reproduce witness sigil v0.1 locally"
```

---

## Task 2: Constitute `sigil-topology-expression/v0`

**Files:**
- Create: `src/full-measure/src/generation/sigil-topology-expression.cjs`
- Create: `src/full-measure/tests/sigil-topology-expression.test.cjs`

### Step 2.1 — Freeze the grammar vocabulary in tests

- [ ] Write failing tests that require exactly these primitive IDs:

```js
[
  "P0", "P1", "P2", "P3",
  "P4", "P5", "P6", "P7",
  "P8", "P9", "PA", "PB",
  "PC", "PD", "PE", "PF",
]
```

and exactly these morphology operators:

```js
[
  "TRANSLATE",
  "ROTATE",
  "REFLECT",
  "SCALE",
  "REPEAT",
  "OVERLAP",
  "LIGATE",
  "CUT",
  "OPEN",
  "CLOSE",
  "NEST",
  "BRANCH",
  "MERGE",
  "PROJECT",
]
```

Test shape:

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  SIGIL_OPERATORS,
  SIGIL_PRIMITIVES,
  createFreeSigilExpression,
  createWitnessLockedSigilExpression,
  normalizeSigilTopologyExpression,
} = require("../src/generation/sigil-topology-expression.cjs");

test("free-sigil and witness-locked are distinct source channels", () => {
  const free = createFreeSigilExpression({ primitives: ["P8"] });
  const witness = createWitnessLockedSigilExpression({ digest: "0".repeat(64) });

  assert.equal(free.source.kind, "free-sigil");
  assert.equal(witness.source.kind, "witness-locked");
  assert.notEqual(free.expressionHash, witness.expressionHash);
});

test("operation order is syntax and changes identity", () => {
  const a = normalizeSigilTopologyExpression({
    schema: "haunted-toaster/sigil-topology-expression/v0",
    source: { kind: "free-sigil" },
    roots: [{ id: "r0", primitive: "P8", quarterTurns: 0 }],
    operations: [
      { id: "o0", kind: "ROTATE", inputs: ["r0"], args: { quarterTurns: 1 } },
      { id: "o1", kind: "CUT", inputs: ["o0"], args: { cutIndex: 0 } },
    ],
    lineage: [],
  });
  const b = normalizeSigilTopologyExpression({
    ...a,
    operations: [...a.operations].reverse(),
    expressionHash: undefined,
  });

  assert.notEqual(a.expressionHash, b.expressionHash);
});
```

Also cover fail-closed cases for:

- unknown primitive;
- unknown operator;
- duplicate root/operation IDs;
- operation input referring to a future/nonexistent node;
- witness source without a digest;
- free-sigil source carrying a `digest` or `projectionVersion`;
- more than 64 roots;
- more than 128 operations;
- non-integer quarter turns / invalid finite arguments.

### Step 2.2 — Run focused tests and prove RED

- [ ] Run:

```bash
node --test tests/sigil-topology-expression.test.cjs
```

Expected: FAIL because the expression module does not exist.

### Step 2.3 — Implement normalized expression construction

- [ ] Implement `sigil-topology-expression.cjs` using existing:

```js
const {
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const {
  renderWitnessSigilV01,
  WITNESS_SIGIL_PROJECTION,
} = require("./witness-sigil-projection.cjs");
```

Freeze:

```js
const SIGIL_TOPOLOGY_EXPRESSION_SCHEMA = "haunted-toaster/sigil-topology-expression/v0";
const MAX_SIGIL_ROOTS = 64;
const MAX_SIGIL_OPERATIONS = 128;
```

Canonical root record:

```js
{
  id: "r0",
  primitive: "P8",
  quarterTurns: 0, // integer 0..3
}
```

Canonical operation record:

```js
{
  id: "o0",
  kind: "ROTATE",
  inputs: ["r0"],
  args: { quarterTurns: 1 },
}
```

For v0, preserve operation arguments as a finite, operator-specific set:

```text
TRANSLATE -> { x: integer, y: integer }
ROTATE    -> { quarterTurns: integer 0..3 }
REFLECT   -> { axis: "horizontal" | "vertical" }
SCALE     -> { numerator: positive integer, denominator: positive integer }
REPEAT    -> { count: integer 2..8 }
OVERLAP   -> {}
LIGATE    -> {}
CUT       -> { cutIndex: integer 0..15 }
OPEN      -> { apertureIndex: integer 0..15 }
CLOSE     -> { apertureIndex: integer 0..15 }
NEST      -> {}
BRANCH    -> { count: integer 2..8 }
MERGE     -> {}
PROJECT   -> { plane: "xy" | "xz" | "yz" }
```

Arity rules:

```text
1 input: TRANSLATE ROTATE REFLECT SCALE REPEAT CUT OPEN CLOSE BRANCH PROJECT
2 inputs: OVERLAP LIGATE NEST MERGE
```

Every operation may refer only to a root or an earlier operation ID.

Public constructors:

```js
createFreeSigilExpression({ primitives, operations = [], lineage = [] })
createWitnessLockedSigilExpression({ digest, operations = [], lineage = [] })
normalizeSigilTopologyExpression(input)
appendSigilOperation(expression, operation)
```

`createWitnessLockedSigilExpression` must:

1. call the local `renderWitnessSigilV01(digest)`;
2. create sixteen roots in canonical recipe order from that frozen projection;
3. retain this source object:

```js
{
  kind: "witness-locked",
  digest,
  projectionVersion: "witness-sigil/v0.1",
  recipeHash: hashCanonical(recipe, "HauntedToaster-WitnessSigilRecipe-v0"),
}
```

It must not claim that `recipeHash` is the canonical witness digest. It is only a Toaster-local address of the imported projection recipe.

`normalizeSigilTopologyExpression` must hash **only** the validated core without `expressionHash`:

```js
const expressionHash = hashCanonical(
  core,
  "HauntedToaster-SigilTopologyExpression-v0",
);
```

Return a deep-frozen object.

### Step 2.4 — Prove deterministic identity and source separation

- [ ] Run:

```bash
node --test tests/sigil-topology-expression.test.cjs
```

Expected: PASS.

### Step 2.5 — Commit Task 2

- [ ] Commit:

```bash
git add src/full-measure/src/generation/sigil-topology-expression.cjs \
  src/full-measure/tests/sigil-topology-expression.test.cjs
git commit -m "feat: add sigil topology expression contract"
```

---

## Task 3: Compile expressions into renderer-neutral Toaster topology intent

**Files:**
- Create: `src/full-measure/src/generation/sigil-topology-compiler.cjs`
- Create: `src/full-measure/tests/sigil-topology-compiler.test.cjs`

### Step 3.1 — Write failing structural-consequence tests

- [ ] Write tests around four intentionally local pressure channels:

```text
rupture     <- P6, P9, CUT, OPEN
recurrence  <- PA, PC, REPEAT, NEST
reflection  <- PD, REFLECT
 ecology    <- PB, PE, PF, BRANCH, MERGE
```

plus two context channels:

```text
witness     <- P8
boundary    <- P2, P3, CLOSE, OPEN
```

The compiler output is not a universal meaning table. It is a Toaster-local deterministic structural projection used only to prove that familiar grammar has inspectable consequences.

Test shape:

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createFreeSigilExpression,
  appendSigilOperation,
} = require("../src/generation/sigil-topology-expression.cjs");
const {
  compileSigilTopologyExpression,
} = require("../src/generation/sigil-topology-compiler.cjs");

test("CUT raises rupture without erasing root ancestry", () => {
  const parent = createFreeSigilExpression({ primitives: ["P8"] });
  const child = appendSigilOperation(parent, {
    id: "o0",
    kind: "CUT",
    inputs: ["r0"],
    args: { cutIndex: 0 },
  });

  const parentPlan = compileSigilTopologyExpression(parent);
  const childPlan = compileSigilTopologyExpression(child);

  assert.equal(parentPlan.pressure.rupture, 0);
  assert.equal(childPlan.pressure.rupture, 1);
  assert.deepEqual(childPlan.rootCounts, parentPlan.rootCounts);
  assert.notEqual(childPlan.planHash, parentPlan.planHash);
});

test("same expression always produces same plan hash", () => {
  const expression = createFreeSigilExpression({ primitives: ["PA", "PC"] });
  const a = compileSigilTopologyExpression(expression);
  const b = compileSigilTopologyExpression(structuredClone(expression));
  assert.deepEqual(a, b);
});
```

Also test:

- P9 produces rupture pressure even without CUT;
- PA + REPEAT produces recurrence > either alone;
- PD + REFLECT produces reflection > either alone;
- PE + BRANCH produces ecology > either alone;
- pressure values are non-negative integers;
- compiler rejects objects not normalized as `sigil-topology-expression/v0`;
- compiler does not expose or return `authority`, `admission`, `authenticated`, `ancestryGranted`, or equivalent fields.

### Step 3.2 — Run focused test and prove RED

- [ ] Run:

```bash
node --test tests/sigil-topology-compiler.test.cjs
```

Expected: FAIL because the compiler does not exist.

### Step 3.3 — Implement the compiler

- [ ] Create `sigil-topology-compiler.cjs`.

Freeze:

```js
const SIGIL_TOPOLOGY_PLAN_SCHEMA = "haunted-toaster/sigil-topology-plan/v0";
```

Output core:

```js
{
  schema: SIGIL_TOPOLOGY_PLAN_SCHEMA,
  expressionHash,
  sourceKind,
  rootCounts: {
    P0: 0,
    // ... every P0..PF key present
  },
  operatorCounts: {
    TRANSLATE: 0,
    // ... every operator key present
  },
  pressure: {
    rupture: 0,
    recurrence: 0,
    reflection: 0,
    ecology: 0,
    witness: 0,
    boundary: 0,
  },
}
```

Pressure equations in v0 are exact integer sums:

```text
rupture = P6 + P9 + CUT + OPEN
recurrence = PA + PC + REPEAT + NEST
reflection = PD + REFLECT
ecology = PB + PE + PF + BRANCH + MERGE
witness = P8
boundary = P2 + P3 + OPEN + CLOSE
```

Hash the core with:

```js
hashCanonical(core, "HauntedToaster-SigilTopologyPlan-v0")
```

Return `{ ...core, planHash }` deep-frozen.

Do not map these pressures into VisualScore fields in v0.

### Step 3.4 — Run compiler tests and prove GREEN

- [ ] Run:

```bash
node --test tests/sigil-topology-compiler.test.cjs
```

Expected: PASS.

### Step 3.5 — Commit Task 3

- [ ] Commit:

```bash
git add src/full-measure/src/generation/sigil-topology-compiler.cjs \
  src/full-measure/tests/sigil-topology-compiler.test.cjs
git commit -m "feat: compile sigil grammar into topology intent"
```

---

## Task 4: Generate six deterministic grammatical descendants

**Files:**
- Create: `src/full-measure/src/generation/sigil-utterance-family.cjs`
- Create: `src/full-measure/tests/sigil-utterance-family.test.cjs`

### Step 4.1 — Freeze the six utterance roles in failing tests

- [ ] Use these six fixed roles in this exact order:

```js
[
  { role: "turn", operator: "ROTATE" },
  { role: "mirror", operator: "REFLECT" },
  { role: "echo", operator: "REPEAT" },
  { role: "scar", operator: "CUT" },
  { role: "aperture", operator: "OPEN" },
  { role: "branch", operator: "BRANCH" },
]
```

These roles are deliberately unary so the first family can operate on either a one-root free expression or a sixteen-root witness-derived expression without manufacturing an unnamed second parent.

Test shape:

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createFreeSigilExpression,
  createWitnessLockedSigilExpression,
} = require("../src/generation/sigil-topology-expression.cjs");
const {
  generateSigilUtteranceFamily,
  replaySigilUtteranceFamily,
} = require("../src/generation/sigil-utterance-family.cjs");

test("one parent speaks six distinct grammatical descendants", () => {
  const parent = createFreeSigilExpression({ primitives: ["P8"] });
  const family = generateSigilUtteranceFamily({
    parentExpression: parent,
    rootSeed: "first-sentence",
  });

  assert.equal(family.requestedCount, 6);
  assert.equal(family.producedCount, 6);
  assert.deepEqual(family.roles, ["turn", "mirror", "echo", "scar", "aperture", "branch"]);
  assert.equal(new Set(family.expressionHashes).size, 6);
  assert.equal(new Set(family.planHashes).size, 6);
  assert.ok(family.utterances.every((item) => item.parentExpressionHash === parent.expressionHash));
});

test("replay is byte/hash stable", () => {
  const parent = createWitnessLockedSigilExpression({ digest: "0".repeat(64) });
  const family = generateSigilUtteranceFamily({
    parentExpression: parent,
    rootSeed: "witness-family",
  });
  const replay = replaySigilUtteranceFamily(family, { parentExpression: parent });

  assert.equal(replay.ok, true);
  assert.equal(replay.actualFamilyHash, family.familyHash);
  assert.deepEqual(replay.actualExpressionHashes, family.expressionHashes);
  assert.deepEqual(replay.actualPlanHashes, family.planHashes);
});
```

Also test:

- changing `rootSeed` changes at least one operation argument and family hash;
- parent expression hash is unchanged after family generation;
- witness-locked descendants retain source kind/digest/projection version but have new expression hashes;
- no child changes source channel;
- family rejects malformed parent expressions;
- `count` accepts only integers 1..6;
- replay detects modified role/hash metadata;
- repeated generation from deep-cloned input is identical.

### Step 4.2 — Run family tests and prove RED

- [ ] Run:

```bash
node --test tests/sigil-utterance-family.test.cjs
```

Expected: FAIL because the utterance-family module does not exist.

### Step 4.3 — Implement deterministic role arguments

- [ ] Create `sigil-utterance-family.cjs` using existing `createPrng`, `hashCanonical`, and `deepFreeze`.

Freeze:

```js
const SIGIL_UTTERANCE_FAMILY_SCHEMA = "haunted-toaster/sigil-utterance-family/v0";
const SIGIL_UTTERANCE_FAMILY_POLICY = "six-grammar-consequences-v0";
```

Target the first root ID (`parent.roots[0].id`) in v0.

Derive a role-local PRNG seed as:

```js
`${rootSeed}:${parent.expressionHash}:${slotIndex}:${role}`
```

Use it only to choose bounded arguments:

```text
turn      -> ROTATE { quarterTurns: 1..3 }
mirror    -> REFLECT { axis: horizontal | vertical }
echo      -> REPEAT { count: 2..4 }
scar      -> CUT { cutIndex: 0..15 }
aperture  -> OPEN { apertureIndex: 0..15 }
branch    -> BRANCH { count: 2..4 }
```

Each child operation ID is `o${parent.operations.length}`.

Each utterance record:

```js
{
  index,
  slotIndex,
  role,
  parentExpressionHash,
  operation,
  expression,
  expressionHash: expression.expressionHash,
  plan,
  planHash: plan.planHash,
}
```

Family core:

```js
{
  schema: SIGIL_UTTERANCE_FAMILY_SCHEMA,
  policy: SIGIL_UTTERANCE_FAMILY_POLICY,
  rootSeed: String(rootSeed),
  parentExpressionHash: parent.expressionHash,
  sourceKind: parent.source.kind,
  requestedCount: count,
  producedCount: utterances.length,
  roles: utterances.map((item) => item.role),
  expressionHashes: utterances.map((item) => item.expressionHash),
  planHashes: utterances.map((item) => item.planHash),
}
```

Hash with domain:

```js
"HauntedToaster-SigilUtteranceFamily-v0"
```

`replaySigilUtteranceFamily` regenerates from the stored `rootSeed` and `requestedCount`, then compares:

- family hash;
- role array;
- expression hashes;
- plan hashes.

### Step 4.4 — Run family tests and prove GREEN

- [ ] Run:

```bash
node --test tests/sigil-utterance-family.test.cjs
```

Expected: PASS.

### Step 4.5 — Run all four new test files together

- [ ] Run:

```bash
node --test \
  tests/witness-sigil-projection.test.cjs \
  tests/sigil-topology-expression.test.cjs \
  tests/sigil-topology-compiler.test.cjs \
  tests/sigil-utterance-family.test.cjs
```

Expected: PASS.

### Step 4.6 — Commit Task 4

- [ ] Commit:

```bash
git add src/full-measure/src/generation/sigil-utterance-family.cjs \
  src/full-measure/tests/sigil-utterance-family.test.cjs
git commit -m "feat: generate deterministic sigil utterance families"
```

---

## Task 5: Add an executable grammar smoke witness

**Files:**
- Create: `src/full-measure/scripts/smoke-sigil-grammar.cjs`
- Modify: `src/full-measure/package.json`

### Step 5.1 — Write the smoke witness

- [ ] Create `scripts/smoke-sigil-grammar.cjs` that performs two specimens:

**Specimen A — free-sigil productive novelty**

```text
parent roots: P8, PA
rootSeed: smoke-free-sigil-v0
expected: six distinct child expression hashes + six distinct plan hashes
```

**Specimen B — witness-locked continuity**

```text
digest: 2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881
rootSeed: smoke-witness-sigil-v0
expected: frozen witness source digest/projection preserved across every child; expression identities differ
```

The script must throw on any failed invariant and print one JSON document on success with this shape:

```js
{
  schema: "haunted-toaster/sigil-grammar-smoke/v0",
  freeSigil: {
    parentExpressionHash,
    familyHash,
    roles,
    expressionHashes,
    planHashes,
  },
  witnessLocked: {
    digest,
    projectionVersion,
    parentExpressionHash,
    familyHash,
    roles,
    expressionHashes,
    planHashes,
  },
}
```

Do not print a sigil as authentication proof and do not add admission language.

### Step 5.2 — Add a dedicated package script

- [ ] Modify `src/full-measure/package.json` scripts with:

```json
"sigil:smoke": "node scripts/smoke-sigil-grammar.cjs"
```

Do **not** add it to the existing general `smoke` chain yet; keep this experimental proof separately invokable in v0.

### Step 5.3 — Run smoke witness

- [ ] Run:

```bash
npm run sigil:smoke
```

Expected: exit 0 and one JSON proof document containing two six-utterance families.

### Step 5.4 — Commit Task 5

- [ ] Commit:

```bash
git add src/full-measure/scripts/smoke-sigil-grammar.cjs \
  src/full-measure/package.json
git commit -m "test: add sigil grammar smoke witness"
```

---

## Task 6: Export the local grammar without widening authority

**Files:**
- Modify: `src/full-measure/src/generation/index.cjs`
- Create: `src/full-measure/docs/SIGIL_GRAMMAR_V0.md`
- Modify only if current docs index requires it: `src/full-measure/README.md`

### Step 6.1 — Write export-surface test first

- [ ] Add an export assertion to `tests/sigil-utterance-family.test.cjs` that imports `../src/generation/index.cjs` and verifies these public names exist:

```js
[
  "renderWitnessSigilV01",
  "createFreeSigilExpression",
  "createWitnessLockedSigilExpression",
  "normalizeSigilTopologyExpression",
  "appendSigilOperation",
  "compileSigilTopologyExpression",
  "generateSigilUtteranceFamily",
  "replaySigilUtteranceFamily",
]
```

Run the test before modifying `index.cjs`; expected RED on missing exports.

### Step 6.2 — Export the four modules

- [ ] Append to `src/generation/index.cjs`:

```js
  ...require("./witness-sigil-projection.cjs"),
  ...require("./sigil-topology-expression.cjs"),
  ...require("./sigil-topology-compiler.cjs"),
  ...require("./sigil-utterance-family.cjs"),
```

Keep existing exports unchanged.

### Step 6.3 — Document the exact v0 boundary

- [ ] Create `docs/SIGIL_GRAMMAR_V0.md` with:

1. ancestry and independent-reproduction statement;
2. P0–PF + operator vocabulary;
3. source-channel split (`witness-locked` vs `free-sigil`);
4. expression → plan → utterance-family data flow;
5. six fixed roles;
6. deterministic/replay guarantees;
7. hard non-claims;
8. explicit v0 stop condition;
9. next gate: human review before any visible renderer coupling.

Include this compact law verbatim:

```text
The sigils began as recognition marks.
The primitives became letters.
The operators gave them verbs.
Order gave them syntax.
History gave them tense.
Haunted Toaster v0 tests whether one expression can lawfully speak six next utterances.
```

Also include:

```text
A matching sigil is never authority.
A creative descendant is never the frozen witness it descended from.
```

### Step 6.4 — Commit Task 6

- [ ] Commit:

```bash
git add src/full-measure/src/generation/index.cjs \
  src/full-measure/tests/sigil-utterance-family.test.cjs \
  src/full-measure/docs/SIGIL_GRAMMAR_V0.md \
  src/full-measure/README.md
git commit -m "docs: expose sigil grammar v0 boundary"
```

If `README.md` does not need an index/link edit, omit it from both the change and commit.

---

## Task 7: Full verification and no-consequence audit

**Files:**
- No new feature files expected; only repair files already touched if verification reveals defects.

### Step 7.1 — Run full unit suite

- [ ] Run:

```bash
cd src/full-measure
npm test
```

Expected: all existing tests plus the four sigil grammar test files pass.

### Step 7.2 — Run repository check

- [ ] Run:

```bash
npm run check
```

Expected: PASS.

### Step 7.3 — Run existing smoke unchanged

- [ ] Run:

```bash
npm run smoke
```

Expected: PASS with no behavioral delta attributable to Sigil Grammar v0.

### Step 7.4 — Run dedicated sigil smoke

- [ ] Run:

```bash
npm run sigil:smoke
```

Expected: PASS with exactly two proof specimens and six utterances each.

### Step 7.5 — Audit forbidden coupling

- [ ] Confirm the implementation diff contains **no changes** to:

```text
src/full-measure/src/render*
src/full-measure/src/**/render*
src/full-measure/src/generation/resolver.cjs
src/full-measure/src/generation/schema.cjs
src/full-measure/src/generation/candidate-family.cjs
src/full-measure/src/generation/topology-arc.cjs
src/full-measure/src/generation/mutation-lattice-generation.cjs
src/full-measure/src/renderer/**
src/full-measure/src/ui/**
```

If repository paths differ, use `git diff --name-only <base>...HEAD` and verify semantically that no renderer, VisualScore/ResolvedTimeline schema, candidate-family policy, Ghost Topology, UI, or packaging execution file changed.

### Step 7.6 — Authority-language scan

- [ ] Run:

```bash
grep -RniE "sigil.*(authenticate|authorize|authority|admit|identity proof)|matching sigil.*(prove|grant)" \
  src/generation/witness-sigil-projection.cjs \
  src/generation/sigil-topology-expression.cjs \
  src/generation/sigil-topology-compiler.cjs \
  src/generation/sigil-utterance-family.cjs \
  docs/SIGIL_GRAMMAR_V0.md
```

Expected: either no matches or only explicit negative/non-claim language in documentation. Any positive authority implication is a failure.

### Step 7.7 — Commit verification repairs only if needed

- [ ] If verification required fixes, commit only those verified repairs:

```bash
git add <files actually repaired>
git commit -m "fix: close sigil grammar verification gaps"
```

If no repair was needed, do not create an empty commit.

---

## Task 8: Field witness before visible coupling

This task is evidence capture, not renderer implementation.

### Step 8.1 — Produce one human-readable witness packet

- [ ] Capture the output of:

```bash
npm run sigil:smoke
```

along with:

- source commit SHA;
- `npm test` result;
- `npm run check` result;
- `npm run smoke` result;
- focused golden-vector test result.

### Step 8.2 — Ask the three language questions

- [ ] Human witness should answer:

1. **Recognition:** Do descendants still feel attributable to familiar roots when their grammar differs?
2. **Composition:** Do the six roles produce materially distinguishable structural consequences rather than six arbitrary hashes?
3. **Productive novelty:** Given a never-before-seen child, can the witness infer anything about what happened from known roots + operation role before reading its full machine record?

Record `yes / partial / no` plus notes. Do not auto-promote the result.

### Step 8.3 — Choose the next disposition explicitly

- [ ] End the v0 witness with exactly one disposition:

```text
VISIBLE_COUPLING_CANDIDATE
REVISE_GENERATION_GRAMMAR
COMPOST_LANGUAGE_CLAIM
```

Only `VISIBLE_COUPLING_CANDIDATE` authorizes writing a **separate** design/spec for mapping `sigil-topology-plan/v0` into Mutation Lattice / VisualScore / renderer behavior.

No current task authorizes that coupling.

---

## Final Acceptance Criteria

Sigil Grammar v0 is complete only when all are true:

- [ ] Haunted Toaster independently reproduces all five frozen National Treasure Witness Sigil golden vectors byte-for-byte.
- [ ] The local expression contract distinguishes `witness-locked` from `free-sigil` and fails closed on malformed cross-channel state.
- [ ] P0–PF and all 14 declared morphology operators are frozen and test-covered.
- [ ] Operation order changes expression identity.
- [ ] Same normalized expression reproduces the same expression hash.
- [ ] Compiler pressure is deterministic, inspectable, integer-valued, and renderer-neutral.
- [ ] One parent expression deterministically produces six materially distinct grammatical children.
- [ ] Each child preserves the parent source channel and parent expression reference.
- [ ] Witness-derived children preserve the canonical digest/projection source without impersonating the frozen Witness Sigil.
- [ ] Family replay detects any role/hash drift and succeeds on identical accepted input.
- [ ] Dedicated smoke proves both free-sigil and witness-locked six-utterance families.
- [ ] Existing `npm test`, `npm run check`, and `npm run smoke` remain green.
- [ ] No renderer, VisualScore/ResolvedTimeline schema, candidate-family policy, Ghost Topology execution, UI, or packaging behavior changes in v0.
- [ ] Human witness records recognition/composition/productive-novelty results before any visible-coupling spec is written.

## Self-Review

- **Placeholder scan:** No TODO/TBD placeholders remain. Every v0 schema, file, operator list, role list, arity rule, hash domain, test command, and stop condition is named.
- **Coverage check:** Compatibility, source-channel separation, normalization, syntax/order, deterministic compiler behavior, six-child generation, replay, exports, smoke proof, regression gates, and authority boundaries each have explicit tests or verification steps.
- **Type consistency:** `expressionHash`, `planHash`, and `familyHash` are distinct SHA-256 hex strings with separate hash domains. The canonical witness digest remains a separate source field and is never replaced by a Toaster-local hash.
- **Scope check:** v0 is intentionally generation-only. Visible renderer coupling is excluded and requires a later approved design/spec after field witness.
- **Ancestry check:** National Treasure supplies design ancestry and frozen fixture evidence only; Haunted Toaster owns its implementation, schemas, compilation policy, tests, and consequences.
