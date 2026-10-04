# FRANKEN TESTER 001 — Branch Ecology Harness

Status: experimental descendant of **FRANKEN-COMPOSER-001**.

## Purpose

The Haunted Toaster has accumulated a real branch ecology. Blender and Playdeck now have
their own Franken experiments too. The wrong integration move is to merge those Git
histories until one branch contains everything.

FRANKEN TESTER 001 treats every branch as a **specimen** and asks a narrower question:

> What organ does this branch actually expose, what evidence supports that claim, and
> which bounded cross-system doors are presently available?

The first harness is intentionally read-only with respect to donor branches.

## Core law

```text
BRANCH != ORGAN
NAME HINT != CODE PROOF
TREE PROBE != RUNTIME QA

SOURCE != PLAN
PROPOSAL != ACCEPTANCE
MATERIAL != AUTHORITY
RENDERER != PLAN AUTHORITY
```

A branch name may suggest an organ. Only an inspected tree can witness the expected code
surface. Even a witnessed file surface is not proof that the branch builds or runs.

## What the tester does

`scripts/franken-tester.cjs` can scan one or more local clones.

Census mode:

```bash
node scripts/franken-tester.cjs \
  --repo toaster=/path/to/the-haunted-toaster \
  --repo blender=/path/to/the-haunted-blender \
  --repo playdeck=/path/to/playdeck
```

This uses `git ls-remote --heads origin`, so every remote branch participates in the
inventory without checkout.

Tree-probe mode:

```bash
node scripts/franken-tester.cjs --probe \
  --repo toaster=/path/to/the-haunted-toaster \
  --repo blender=/path/to/the-haunted-blender \
  --repo playdeck=/path/to/playdeck \
  --output ./FrankenTester/franken-tester-report.json
```

For each selected branch the tester shallow-fetches the remote head into `FETCH_HEAD`,
runs `git ls-tree`, classifies witnessed organs, and then discards the transient
inspection state on the next probe. It does not checkout donor branches or execute their
code.

Use `--max-branches N` for a bounded diagnostic pass before a full ecology scan.

## Output

The report schema is:

```text
static-collective/franken-tester-report/v0
```

It contains:

- source system and branch SHA;
- evidence level: `name-only` or `tree-probed`;
- branch-name hints;
- organs witnessed by file paths;
- the exact evidence files used for classification;
- an organ index;
- branch counts by system;
- currently supportable crossing surfaces;
- a deterministic report hash.

The report has `diagnostic-only` authority.

## First crossing rules

The initial rules describe doors already present in the current Franken family:

1. Playdeck Franken proposal/runtime -> Toaster Franken Composer.
2. Blender accepted take -> Toaster Franken Composer as bounded material.
3. Blender Flow Pantry + Toaster bridge -> Toaster pantry proposal surface.
4. Blender Flow Pantry + Playdeck bridge -> Playdeck proposal surface.
5. Playdeck Franken runtime -> Remotion projection.

A reported door is only a **witnessed compatible surface**. Runtime compatibility still
requires the relevant branch's own tests and a cross-system specimen.

## Why this is the right "all branches" composition

Git branches are histories, not plugins. Flattening every branch into one branch would
destroy the distinction between alternatives, experiments, fixes, plans, releases, and
accepted organs.

The tester instead creates a composition layer over the ecology:

```text
ALL BRANCH HEADS
      |
      v
BRANCH CENSUS
      |
      +---- name hints
      |
      v
OPTIONAL TREE PROBE
      |
      +---- witnessed organs
      |
      v
ORGAN INDEX
      |
      v
BOUNDED CROSSING MATRIX
      |
      v
RUNTIME TEST TARGETS
```

This lets the Toaster ask every branch what it can contribute without pretending every
branch should become current product code.

## Next gate

The next descendant should consume a tree-probed report and execute **selected compatible
organ pairs** in isolated fixtures:

- current Franken Composer parity test;
- latest Video Digestion six-up;
- Listening Eye / listener family;
- Blender accepted-take and cutout/Flow bridges;
- Playdeck Franken runtime + Remotion projection.

That descendant is where **TREE PROBE -> RUNTIME QA** becomes real. This slice stops one
gate earlier on purpose.
