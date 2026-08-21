# Attention Resolution / Resolution Field — Design

Status: **approved concept slice; implementation not yet authorized**

Canonical issue: [#197 — Attention Resolution / Resolution Field](https://github.com/the-static-collective/the-haunted-toaster/issues/197)

## Problem

Haunted Toaster renders can become very large and expensive, while the current pipeline generally treats every part of the composed frame as if it deserves the same spatial precision at every moment.

The proposed primitive keeps the accepted final output canvas fixed while allowing selected layers or bounded temporal regions to be rendered at lower **internal resolution** and then upscaled before final composition.

The optimization is useful, but the deeper creative law is more important:

> **Resolution can express attention.**
>
> Important things receive pixels. Peripheral things may relinquish them.

## Governing distinction

This design does **not** change output dimensions during a video.

The final composition remains at its accepted native canvas. Only intermediate work may occur at a reduced internal scale.

Example:

```text
accepted 1920×1080 composition
        ↓
background atmosphere @ 0.50 scale
smoke / bloom          @ 0.25 scale
critical image         @ 1.00 scale
protected typography  @ 1.00 scale
        ↓
upscale reduced layers
        ↓
compose at 1920×1080
        ↓
encode ordinary fixed-size output
```

## Product model

A useful conceptual expression is:

```text
effective resolution
  = importance
  × stillness
  × detail need
  × lock state
  × topology
```

This is a design relation, not yet a numeric algorithm. The implementation must not infer hidden taste or introduce ambient randomness merely to satisfy the equation.

The accepted choice must remain deterministic, inspectable, replayable, and compatible with the existing authority chain.

## Authority boundary

The repository operating law remains unchanged:

```text
accepted VisualScore
  → canonical ResolvedTimeline
  → production preview
  → production render
  → retained score/timeline sidecars
  → receipt
```

Resolution behavior may be compiled into renderer operations, but it must not become hidden renderer-only improvisation.

A future implementation therefore needs an explicit versioned representation of the admitted resolution policy or resolved scale decisions at whichever existing artifact boundary proves least invasive. Preview and final render must consume the same accepted semantics.

## Invariants

1. **Fixed output canvas** — output dimensions do not change mid-file.
2. **Determinism** — the same accepted artifacts produce the same internal scale decisions.
3. **Preview/render parity** — preview cannot silently use different resolution semantics from production render.
4. **Protected precision** — declared protected layers/anchors can remain native scale.
5. **Inspectability** — every non-native internal scale is attributable in retained evidence.
6. **Legacy safety** — old scores/profiles do not silently acquire this behavior.
7. **No fake authority** — encoder heuristics may compress bytes, but they do not decide semantic attention.
8. **Graceful refusal** — unsupported layer/effect paths stay native rather than being silently degraded.

## Sacrifice ladder

The first candidate policy should surrender precision where the content already tolerates it.

### First to fall

- smoke;
- dust;
- rain;
- glow / bloom;
- displacement fields;
- grain / film debris;
- already-distorted or intentionally degraded textures.

### Contextually eligible

- high-motion image regions;
- peripheral/background imagery;
- topology passages where loss of precision is part of the intended visual event.

### Protected by default

- typography;
- explicitly locked visual anchors;
- detail-critical linework;
- declared focal subjects;
- any layer whose renderer path cannot prove safe scale reduction.

The protected list is policy, not ontology. Future evidence may refine it.

## First bounded experiment

Do **not** begin with scene-wide dynamic resolution.

The smallest useful proof is layer-scaled atmosphere/effects.

### Scale set

Allow only:

```text
1.00
0.50
0.25
```

for the experiment.

### Experiment contract

1. Select one currently expensive atmosphere/effect path that can be isolated without changing semantic timing.
2. Produce a native-resolution control.
3. Produce deterministic 0.50 and/or 0.25 internal-scale variants.
4. Upscale the reduced layer before native-canvas composition.
5. Keep typography and the critical image path at native scale.
6. Retain the chosen scale in inspectable render evidence.
7. Compare render cost, encoded output size, and human-visible quality.
8. Do not assume pixel-count reduction maps linearly to encoded-byte reduction.

## What success would prove

A successful first specimen proves only that selective internal resolution is a viable renderer primitive.

It does **not** yet prove that the Toaster should autonomously choose scene-wide resolution.

The first proof should answer:

- Can one isolated effect layer safely relinquish pixels?
- Is the speed/memory/file-size gain material?
- Does the resulting upscale remain visually acceptable or creatively useful?
- Can the decision be replayed and witnessed exactly?
- Can native protected layers remain untouched?

## Creative extension — only after the bounded proof

If the primitive survives the first experiment, it can become expressive vocabulary instead of remaining a cost-saving switch.

Candidate expressions:

- **Possession collapse** — spatial precision progressively deteriorates through a possession arc.
- **Memory residue** — a topology event briefly resolves like an overhandled JPEG or half-remembered image.
- **Lyric focus** — the visual field resolves around a lyric arrival while peripheral material stays coarse.
- **Protected object** — one native-resolution object remains exact while its surrounding world relinquishes precision.
- **Motion economy** — frantic passages can lawfully spend less spatial detail; still passages can recover it.

This is where the primitive earns the name **Resolution Field**.

## Naming

Two names are useful at different layers:

- **Attention Resolution** — human-facing/product concept: precision follows attention.
- **Resolution Field** — underlying renderer/creative primitive: scale may vary across layers or bounded time under explicit law.

Neither name implies implementation shape yet.

## Compatibility

The safest first implementation is opt-in through a new/versioned renderer profile or equivalent admitted policy surface.

Legacy artifacts must continue to resolve to native internal scale unless deliberately migrated.

A future migration must be explicit because reduced internal scale can alter visible texture even when output dimensions remain unchanged.

## Evidence requirements for implementation

A future approved code slice should report:

1. exact profile/artifact representation chosen;
2. deterministic scale-resolution tests;
3. preview/render parity proof;
4. protected-layer regression proof;
5. legacy compatibility proof;
6. retained evidence/receipt impact;
7. native control vs reduced-scale render timings;
8. output byte sizes;
9. field witness of visible quality;
10. unsupported cases or renderer paths forced to native scale.

## Non-goals

This design does not authorize:

- automatic winner selection;
- hidden perceptual AI ranking;
- arbitrary scene-wide quality reduction;
- changing final frame dimensions over time;
- nondeterministic encoder-driven scene decisions;
- retroactive reinterpretation of existing scores;
- implementation before a separately approved bounded slice.

## Design compression

> **The Toaster may know that something exists without insisting on knowing it at full precision.**

Locks protect what must remain exact. Resolution law governs what may lawfully become coarse. The result should reduce unnecessary work without reducing the Toaster to a conventional quality slider.
