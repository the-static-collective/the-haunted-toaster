# Sigil Algebra v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Toaster-owned exact algebra proof beneath the existing sigil grammar: exact transform evaluation, dual syntax/value identity, typed hexadecimal NUMBER notation, Nibble Helix exponent notation, versioned receipts, and one six-expression equivalence witness.

**Architecture:** Add sibling generation modules. Do not modify the meaning or schema of `haunted-toaster/sigil-topology-expression/v0`; normalize existing expressions first, then evaluate only declared algebraic fragments into exact canonical values. Historical `expressionHash`/lineage remain untouched while algebra produces a separately hashed normal form and receipt.

**Tech Stack:** Node.js >= 22, CommonJS (`.cjs`), built-in `node:test` + `node:assert/strict`, JavaScript `BigInt` internally, canonical portable decimal-string integers/rationals, existing `canonical.cjs`, existing `sigil-topology-expression.cjs`, existing generation export surface.

**Spec:** National Treasure `docs/superpowers/specs/2026-08-22-sigil-algebra-v0-design.md` on design branch `design/sigil-algebra-v0`; Haunted Toaster issue #220.

## Global Constraints

- Do not change `haunted-toaster/sigil-topology-expression/v0` semantics or schema.
- No National Treasure runtime import or shared package dependency.
- Existing `expressionHash` and lineage are historical syntax and must never be replaced by a normal-form hash.
- Mathematical equivalence proves only equivalence under a named theorem/evaluator version.
- Canonical proof material must not contain JavaScript `BigInt` or floating-point approximations; serialize exact integers/rationals as canonical decimal strings.
- Reject unsafe/non-integral JavaScript numeric inputs in exact algebra evaluation rather than converting an already-rounded value.
- P0..PF become hexadecimal digits only inside the explicit NUMBER dialect; semantic sigil roots remain unchanged elsewhere.
- Nibble Helix is exponent notation only: `E = 4r + q`, `q in 0..3`; quarter-turn means exponent +1 (`x2`), radial band means exponent +4 (`x16`).
- `REFLECT` is not arithmetic negation.
- Do not invent algebraic laws for `CUT`, `OPEN`, `CLOSE`, `NEST`, `BRANCH`, `MERGE`, `OVERLAP`, `LIGATE`, `PROJECT`, or any other topology operation.
- No VisualScore, ResolvedTimeline, preview, renderer, FFmpeg, UI, candidate-policy, Ghost Topology execution, packaging, release, authentication, admission, identity, ancestry, signature, or authority behavior.
- `Phi 3·27·81·82` is a later algebraic-number admission witness, not v0 runtime scope.
- Preserve current `npm test`, `npm run check`, `npm run smoke`, and `npm run sigil:smoke` behavior.

---

## File structure

Create focused sibling modules:

```text
src/full-measure/src/generation/sigil-exact-number.cjs
  exact canonical integer/rational helpers; BigInt never escapes

src/full-measure/src/generation/sigil-transform-algebra.cjs
  exact affine Transform2 values and evaluation of ROTATE/REFLECT/TRANSLATE/SCALE

src/full-measure/src/generation/sigil-algebra-receipt.cjs
  expression -> algebra normal form -> normalFormHash + versioned receipt

src/full-measure/src/generation/sigil-number-dialect.cjs
  NUMBER[P0..PF] hexadecimal encoding plus Nibble Helix exponent round-trip

src/full-measure/src/generation/sigil-algebra-witness.cjs
  six deterministic free-sigil specimens with controlled equivalence classes
```

Tests mirror those responsibilities under `src/full-measure/tests/`.

Only `src/full-measure/src/generation/index.cjs` is modified, and only to export the new sibling APIs.

---

## Task 1: Exact integer and rational kernel

**Files:**
- Create: `src/full-measure/src/generation/sigil-exact-number.cjs`
- Create: `src/full-measure/tests/sigil-exact-number.test.cjs`

**Interfaces:**
- Produces:
  - `normalizeInteger(value, label?) -> canonical decimal string`
  - `normalizeRational({ numerator, denominator }, label?) -> { numerator, denominator }`
  - `addRational(a, b) -> RationalValue`
  - `multiplyRational(a, b) -> RationalValue`
  - `negateRational(value) -> RationalValue`
  - `equalRational(a, b) -> boolean`
  - `RATIONAL_ZERO`, `RATIONAL_ONE`
- Internal `BigInt` is permitted but must not appear in returned values.

- [ ] **Step 1.1: Write failing exact-number tests**

Create `tests/sigil-exact-number.test.cjs` with cases equivalent to:

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  addRational,
  multiplyRational,
  normalizeInteger,
  normalizeRational,
} = require("../src/generation/sigil-exact-number.cjs");

test("normalizes canonical arbitrary-precision integers without Number coercion", () => {
  assert.equal(normalizeInteger("37889062373143906"), "37889062373143906");
  assert.equal(normalizeInteger("-00042"), "-42");
  assert.equal(normalizeInteger("-0"), "0");
});

test("rejects unsafe JavaScript numbers", () => {
  assert.throws(() => normalizeInteger(Number.MAX_SAFE_INTEGER + 1), /safe integer/);
  assert.throws(() => normalizeInteger(1.5), /integer/);
});

test("reduces rationals canonically and keeps denominator positive", () => {
  assert.deepEqual(normalizeRational({ numerator: "12", denominator: "-18" }), {
    numerator: "-2",
    denominator: "3",
  });
  assert.deepEqual(normalizeRational({ numerator: "0", denominator: "999" }), {
    numerator: "0",
    denominator: "1",
  });
});

test("adds and multiplies exact rationals", () => {
  assert.deepEqual(
    addRational(
      { numerator: "1", denominator: "6" },
      { numerator: "1", denominator: "3" },
    ),
    { numerator: "1", denominator: "2" },
  );
  assert.deepEqual(
    multiplyRational(
      { numerator: "37889062373143906", denominator: "1" },
      { numerator: "2", denominator: "3" },
    ),
    { numerator: "25259374915429204", denominator: "1" },
  );
});
```

Also reject empty strings, signs without digits, decimal/exponent notation, zero denominator, objects/arrays, `NaN`, and infinities.

- [ ] **Step 1.2: Prove RED**

Run:

```bash
cd src/full-measure
node --test tests/sigil-exact-number.test.cjs
```

Expected: FAIL because `sigil-exact-number.cjs` does not exist.

- [ ] **Step 1.3: Implement the minimal exact kernel**

Use strict decimal parsing and `BigInt` only after syntax validation. Return only canonical strings/objects.

The canonical rational shape is exactly:

```js
{
  numerator: "-2",
  denominator: "3",
}
```

No schema/version field belongs inside primitive rational values; enclosing algebra values/receipts carry version identity.

- [ ] **Step 1.4: Prove GREEN**

```bash
node --test tests/sigil-exact-number.test.cjs
```

Expected: PASS, no warnings.

- [ ] **Step 1.5: Commit Task 1**

```bash
git add src/full-measure/src/generation/sigil-exact-number.cjs \
  src/full-measure/tests/sigil-exact-number.test.cjs
git commit -m "feat: add exact sigil number kernel"
```

---

## Task 2: Exact Transform2 evaluator

**Files:**
- Create: `src/full-measure/src/generation/sigil-transform-algebra.cjs`
- Create: `src/full-measure/tests/sigil-transform-algebra.test.cjs`

**Interfaces:**
- Consumes exact rationals from Task 1.
- Produces:
  - `TRANSFORM_VALUE_SCHEMA = "haunted-toaster/sigil-transform-value/v0"`
  - `identityTransform() -> TransformValue`
  - `composeTransforms(left, right) -> TransformValue`
  - `rotationTransform(quarterTurns) -> TransformValue`
  - `reflectionTransform(axis) -> TransformValue`
  - `translationTransform(x, y) -> TransformValue`
  - `scaleTransform(numerator, denominator) -> TransformValue`
  - `evaluateSigilTransformExpression(expression) -> { rootPrimitive, outputNodeId, transform }`

Canonical TransformValue:

```js
{
  schema: "haunted-toaster/sigil-transform-value/v0",
  matrix: {
    a: { numerator: "1", denominator: "1" },
    b: { numerator: "0", denominator: "1" },
    c: { numerator: "0", denominator: "1" },
    d: { numerator: "1", denominator: "1" },
  },
  translation: {
    x: { numerator: "0", denominator: "1" },
    y: { numerator: "0", denominator: "1" },
  },
}
```

Use column-vector affine semantics. Applying a new unary operation to the current node means composing the new operator on the left of the accumulated transform.

- [ ] **Step 2.1: Write failing transform-law tests**

Cover exact identities:

```js
R90^4 = I
REFLECT(horizontal)^2 = I
S R S = R^-1
T(2,-3) after T(5,7) = T(7,4)
S(2/3) after S(9/4) = S(3/2)
```

Also create two real sigil expressions through `normalizeSigilTopologyExpression`:

```js
A = P4 -> ROTATE(1) -> ROTATE(3)
B = P4
```

and assert their evaluated `{rootPrimitive, transform}` values are deeply equal.

Reject:

- multiple roots in the algebra evaluator;
- binary operators;
- topology-only operators;
- operations not on one connected unary chain;
- unsafe TRANSLATE numbers;
- unsupported output topology.

The grammar expression itself must continue to normalize normally; refusal belongs to the algebra evaluator, not the grammar contract.

- [ ] **Step 2.2: Prove RED**

```bash
node --test tests/sigil-transform-algebra.test.cjs
```

Expected: FAIL because the transform algebra module does not exist.

- [ ] **Step 2.3: Implement exact affine composition**

Implement rotation matrices for quarter turns 0..3, horizontal/vertical reflections, translation, and uniform positive rational scale. Reuse Task 1 arithmetic only.

`evaluateSigilTransformExpression` must first call existing `normalizeSigilTopologyExpression(expression)`; it must not duplicate or loosen grammar validation.

- [ ] **Step 2.4: Prove GREEN**

```bash
node --test tests/sigil-transform-algebra.test.cjs
```

Expected: PASS.

- [ ] **Step 2.5: Commit Task 2**

```bash
git add src/full-measure/src/generation/sigil-transform-algebra.cjs \
  src/full-measure/tests/sigil-transform-algebra.test.cjs
git commit -m "feat: evaluate exact sigil transforms"
```

---

## Task 3: Dual identity and algebra receipts

**Files:**
- Create: `src/full-measure/src/generation/sigil-algebra-receipt.cjs`
- Create: `src/full-measure/tests/sigil-algebra-receipt.test.cjs`

**Interfaces:**
- Consumes existing `hashCanonical`, normalized sigil expressions, and Task 2 evaluator.
- Produces constants:

```js
SIGIL_ALGEBRA_RECEIPT_SCHEMA = "haunted-toaster/sigil-algebra-receipt/v0"
SIGIL_ALGEBRA_NORMAL_FORM_SCHEMA = "haunted-toaster/sigil-algebra-normal-form/v0"
SIGIL_ALGEBRA_THEOREM_SET = "haunted-toaster/sigil-algebra-theorems/v0"
SIGIL_ALGEBRA_EVALUATOR = "haunted-toaster/sigil-algebra-evaluator/v0"
```

- Produces:
  - `evaluateSigilAlgebra(expression) -> { expressionHash, normalForm, normalFormHash }`
  - `createSigilAlgebraReceipt(expression) -> receipt`
  - `areSigilExpressionsEquivalent(left, right) -> boolean`

Canonical normal form:

```js
{
  schema: SIGIL_ALGEBRA_NORMAL_FORM_SCHEMA,
  rootPrimitive: "P4",
  transform: TransformValue,
}
```

Canonical receipt:

```js
{
  schema: SIGIL_ALGEBRA_RECEIPT_SCHEMA,
  sourceExpressionHash: "...",
  theoremSetVersion: SIGIL_ALGEBRA_THEOREM_SET,
  evaluatorVersion: SIGIL_ALGEBRA_EVALUATOR,
  normalForm,
  normalFormHash: "...",
}
```

The receipt has no authority, identity, signature, admission, ancestry-decision, or authentication fields.

- [ ] **Step 3.1: Write the flagship failing test**

Construct:

```text
A = ROTATE(1, ROTATE(3, P4))
B = P4
```

Require all four simultaneously:

```js
assert.notEqual(A.expressionHash, B.expressionHash);
assert.notDeepEqual(A.lineage, B.lineage); // where ancestry differs by construction
assert.equal(receiptA.normalFormHash, receiptB.normalFormHash);
assert.equal(areSigilExpressionsEquivalent(A, B), true);
```

Also require:

- operation order still changes expression identity;
- non-equivalent `ROTATE(1, P4)` gets a different normal form hash;
- identical reevaluation reproduces byte/hash-equivalent receipt content;
- receipt exact keys exclude authority/identity fields;
- an unsupported topology expression fails closed rather than receiving a guessed normal form.

- [ ] **Step 3.2: Prove RED**

```bash
node --test tests/sigil-algebra-receipt.test.cjs
```

Expected: FAIL because the receipt module does not exist.

- [ ] **Step 3.3: Implement normal-form hashing and receipts**

Use existing `hashCanonical` with new domain separators:

```text
HauntedToaster-SigilAlgebraNormalForm-v0
HauntedToaster-SigilAlgebraReceipt-v0
```

Do not alter the existing expression hash domain separator.

- [ ] **Step 3.4: Prove GREEN**

```bash
node --test tests/sigil-algebra-receipt.test.cjs
```

Expected: PASS.

- [ ] **Step 3.5: Commit Task 3**

```bash
git add src/full-measure/src/generation/sigil-algebra-receipt.cjs \
  src/full-measure/tests/sigil-algebra-receipt.test.cjs
git commit -m "feat: add sigil algebra equivalence receipts"
```

---

## Task 4: Typed NUMBER dialect and Nibble Helix

**Files:**
- Create: `src/full-measure/src/generation/sigil-number-dialect.cjs`
- Create: `src/full-measure/tests/sigil-number-dialect.test.cjs`

**Interfaces:**
- Consumes Task 1 exact integers.
- Produces constants:

```js
SIGIL_NUMBER_DIALECT = "haunted-toaster/sigil-number/v0"
SIGIL_NIBBLE_HELIX_DIALECT = "haunted-toaster/sigil-nibble-helix/v0"
```

- Produces:
  - `encodeSigilHexDigits(primitives) -> { schema, digits, integer }`
  - `decodeSigilHexInteger(integer) -> { schema, digits, integer }`
  - `encodeNibbleHelix(exponent) -> { schema, exponent, ring, quarterTurn }`
  - `decodeNibbleHelix({ ring, quarterTurn }) -> canonical exponent string`

NUMBER is non-negative hexadecimal v0. Leading zero digit sequences normalize to one P0 except canonical zero. The returned `integer` is a decimal string.

Nibble Helix uses Euclidean remainder so `quarterTurn` is always 0..3, including negative exponents.

- [ ] **Step 4.1: Write failing NUMBER tests**

Require:

```text
[P0]       <-> 0
[P8]       <-> 8
[PA]       <-> 10
[PF]       <-> 15
[P3, PA]   <-> 58
[P1, P0, P0] <-> 256
```

Also prove that a free sigil root P8 remains `{ primitive: "P8" }`; importing/using NUMBER must not mutate or reinterpret the grammar object.

Reject non-P0..PF tokens, empty digit lists, negative NUMBER input, non-canonical integer syntax, and unsafe JS Number input.

- [ ] **Step 4.2: Write failing Nibble Helix tests**

Round-trip at least:

```text
E=-9 -> ring=-3, q=3
E=-5 -> ring=-2, q=3
E=-4 -> ring=-1, q=0
E=-1 -> ring=-1, q=3
E=0  -> ring=0,  q=0
E=1  -> ring=0,  q=1
E=3  -> ring=0,  q=3
E=4  -> ring=1,  q=0
E=5  -> ring=1,  q=1
E=27 -> ring=6,  q=3
E=81 -> ring=20, q=1
E=82 -> ring=20, q=2
```

For every vector, assert:

```js
decodeNibbleHelix(encodeNibbleHelix(E)) === normalizeInteger(E)
```

- [ ] **Step 4.3: Prove RED**

```bash
node --test tests/sigil-number-dialect.test.cjs
```

Expected: FAIL because the dialect module does not exist.

- [ ] **Step 4.4: Implement NUMBER and helix encoding**

Use explicit maps:

```js
P0..P9 -> 0..9
PA..PF -> 10..15
```

Do not infer semantic meaning from primitive metadata. This mapping exists only inside this module/API.

For negative helix exponents, compute non-negative `q` first and then exact `r=(E-q)/4` using BigInt internally.

- [ ] **Step 4.5: Prove GREEN**

```bash
node --test tests/sigil-number-dialect.test.cjs
```

Expected: PASS.

- [ ] **Step 4.6: Commit Task 4**

```bash
git add src/full-measure/src/generation/sigil-number-dialect.cjs \
  src/full-measure/tests/sigil-number-dialect.test.cjs
git commit -m "feat: add sigil number and nibble helix dialects"
```

---

## Task 5: Six-expression algebra witness

**Files:**
- Create: `src/full-measure/src/generation/sigil-algebra-witness.cjs`
- Create: `src/full-measure/tests/sigil-algebra-witness.test.cjs`

**Interfaces:**
- Consumes existing free-sigil expression normalization and Task 3 receipts.
- Produces:

```js
createSigilAlgebraWitness({ primitive = "P4" } = {}) -> {
  schema: "haunted-toaster/sigil-algebra-witness/v0",
  primitive,
  specimens: [ six records ],
  witnessHash,
}
```

Use six fixed roles:

```text
identity
full-turn        // R1 then R3
half-turn-twice  // R2 then R2
double-reflect   // same reflection twice
quarter-turn     // R1
mirror           // one reflection
```

Each specimen contains:

```js
{
  role,
  expression,
  algebraReceipt,
}
```

Expected equivalence topology:

```text
identity == full-turn == half-turn-twice == double-reflect
quarter-turn != identity
mirror != identity
quarter-turn != mirror
```

All six expression hashes must be distinct. The first four normal-form hashes must be identical.

- [ ] **Step 5.1: Write the failing witness test**

Assert:

- exactly six roles in fixed order;
- six distinct `expressionHash` values;
- first four share one `normalFormHash`;
- last two occupy distinct normal forms;
- repeated witness creation is byte/hash deterministic;
- only `free-sigil` source channel appears;
- witness record contains no renderer/VisualScore/ResolvedTimeline/auth/admission/identity fields.

- [ ] **Step 5.2: Prove RED**

```bash
node --test tests/sigil-algebra-witness.test.cjs
```

Expected: FAIL because the witness module does not exist.

- [ ] **Step 5.3: Implement the six fixed derivations**

Build every specimen through existing `createFreeSigilExpression` / `normalizeSigilTopologyExpression`; do not hand-author expression hashes.

Hash the canonical witness core with:

```text
HauntedToaster-SigilAlgebraWitness-v0
```

- [ ] **Step 5.4: Prove GREEN**

```bash
node --test tests/sigil-algebra-witness.test.cjs
```

Expected: PASS.

- [ ] **Step 5.5: Commit Task 5**

```bash
git add src/full-measure/src/generation/sigil-algebra-witness.cjs \
  src/full-measure/tests/sigil-algebra-witness.test.cjs
git commit -m "feat: add six-expression sigil algebra witness"
```

---

## Task 6: Export surface, regression proof, and authority boundary

**Files:**
- Modify: `src/full-measure/src/generation/index.cjs`
- Create: `src/full-measure/tests/sigil-algebra-boundary.test.cjs`

**Interfaces:**
- Export only the public functions/constants introduced by Tasks 1–5.
- Do not modify existing exports or schemas.

- [ ] **Step 6.1: Write failing export/boundary tests**

Require the public `./generation` surface to expose:

```text
normalizeInteger
normalizeRational
evaluateSigilTransformExpression
evaluateSigilAlgebra
createSigilAlgebraReceipt
areSigilExpressionsEquivalent
encodeSigilHexDigits
decodeSigilHexInteger
encodeNibbleHelix
decodeNibbleHelix
createSigilAlgebraWitness
```

Also test exact receipt keys and assert forbidden decision-bearing keys are absent recursively:

```text
authority
authentication
authenticated
admission
admitted
identity
signature
ancestryDecision
capability
```

This is a structural authority-boundary test; explanatory documentation may still use these words in explicit non-claims.

- [ ] **Step 6.2: Prove RED**

```bash
node --test tests/sigil-algebra-boundary.test.cjs
```

Expected: FAIL because exports have not been wired.

- [ ] **Step 6.3: Add exports only**

Modify `src/generation/index.cjs` following its existing CommonJS export style. Do not restructure unrelated exports.

- [ ] **Step 6.4: Prove focused GREEN**

```bash
node --test tests/sigil-exact-number.test.cjs \
  tests/sigil-transform-algebra.test.cjs \
  tests/sigil-algebra-receipt.test.cjs \
  tests/sigil-number-dialect.test.cjs \
  tests/sigil-algebra-witness.test.cjs \
  tests/sigil-algebra-boundary.test.cjs
```

Expected: PASS.

- [ ] **Step 6.5: Run the full repository proof**

```bash
npm test
npm run check
npm run sigil:smoke
npm run smoke
```

Expected: all commands exit 0 with no new warnings.

Also run:

```bash
git diff --check
git status --short
```

Expected: clean diff check; status contains only intentional branch changes before commit.

- [ ] **Step 6.6: Preserve explicit phi non-scope**

Confirm no production module contains an algebraic-number implementation (`phi`, `sqrt5`, quadratic-field arithmetic, or generic symbolic power reducer). The `Phi 3·27·81·82` specimen remains design/issue evidence for a later gate.

- [ ] **Step 6.7: Commit Task 6**

```bash
git add src/full-measure/src/generation/index.cjs \
  src/full-measure/tests/sigil-algebra-boundary.test.cjs
git commit -m "feat: expose bounded sigil algebra proof"
```

---

## Required RED/GREEN evidence before implementation PR readiness

For every task, preserve evidence that the focused test first failed for the intended missing behavior/module and then passed after minimal implementation. A final implementation PR is not ready merely because the combined suite is green if the individual RED proofs were not observed.

The strongest final witness must demonstrate simultaneously:

```text
A != B historically
A ≡ B mathematically
normalFormHash(A) == normalFormHash(B)
expressionHash(A) != expressionHash(B)
```

and the six-expression witness must demonstrate controlled equivalence classes without renderer coupling.

## Self-review checklist

Before calling the plan complete:

- Spec coverage: Tasks 1–6 cover exact values, transform theorem kernel, dual hashes/receipts, NUMBER, Nibble Helix, six-up witness, exports, regression, and authority boundary.
- Placeholder scan: no TBD/TODO/“implement later” instructions are permitted.
- Type consistency: canonical integers are decimal strings everywhere outside internal arithmetic; rationals always use `{numerator, denominator}` strings; normal forms use the Task 2 TransformValue unchanged.
- Scope: no algebraic-number runtime, topology equations, renderer behavior, or authority semantics.
- Existing grammar: no edit to `sigil-topology-expression.cjs` is required by this plan.
