# Perceptual Reflex Layer + Compost Translation

Date: 2026-08-19  
Status: Proposed architecture checkpoint  
Project authority: Haunted Toaster issue #184  
Immediate implementation ancestry: Haunted Toaster issue #183

## Problem

Haunted Toaster is accumulating more interacting creative systems: audio response, candidate ecology, foreign video material, topology, atmosphere, typography, lineage, memory, and increasingly rich receipt/provenance boundaries.

The project needs better **sensing and regulation** without solving that complexity by installing an autonomous AI governor.

At the same time, open-source AI / ML / MIR / computer-vision projects contain decades of useful perception machinery. Some are production-friendly; some are better treated as research instruments; some are useful mostly because they reveal what a native sensor ought to measure.

The architectural opportunity is to borrow those capabilities while preserving existing Toaster law:

- local-first execution;
- explicit provenance;
- deterministic/replayable semantics where possible;
- proposal/influence separated from execution authority;
- accepted `VisualScore -> ResolvedTimeline -> preview/render -> receipt` remains the score-driven execution chain;
- no AI taste governor or hidden renderer intelligence.

## Decision

Introduce two related architectural primitives.

### 1. Perceptual Reflex Layer

A reusable substrate of bounded **sensors** and deterministic **reflex/regulation** machinery.

Sensors may use classical DSP, computer vision, frozen embeddings, similarity mathematics, or explicitly admitted local ML inference. They emit typed observations only.

> **A learned or foreign component may produce testimony. It may never produce authority.**

The receiving system decides whether that testimony is ignored, exposed to proposal/search, consumed by a deterministic regulator, or later admitted through an existing execution boundary.

### 2. Compost Translation

A research-stage process for foreign machinery that is useful to learn from but undesirable as a production dependency.

> **Knowledge may cross; dependency stays behind.**

A foreign research organism may be instrumented, characterized, and compared against fixed specimens. The useful behavior is translated into a native eCODEsystem contract and independently implemented. The upstream dependency may then drop out while its historical contribution remains attributable.

Essentia is the founding **First Dropout** specimen.

## Architecture

```text
source audio / video / lyrics / runtime state
                |
                v
        PERCEPTION ORGANS
  DSP / CV / frozen embeddings / probes
                |
                v
         SensorWitness records
        authority: testimony only
                |
                v
        REFLEX / REGULATOR
 deterministic rules / statecharts / policy
                |
                v
      bounded influence / proposals
                |
                v
    existing constituted project authority
VisualScore -> ResolvedTimeline -> preview/render -> receipt
```

No sensor writes canonical score/timeline state directly. No raw model call is allowed to become ambient renderer decision state.

## Sensor witness contract

Exact schema belongs to implementation, but the stable conceptual envelope is:

```text
SensorWitness {
  schema,
  sensorId,
  sensorVersion,
  implementationKind,
  sourceSha256,
  inputInterval,
  parameters,
  observation,
  confidence,
  observationHash,
  authority: "testimony-only",
  model?: {
    identity,
    version,
    sha256,
    licenseWitness
  }
}
```

A sensor that cannot honestly produce an observation emits a bounded refusal/unavailable witness rather than fabricated values.

## Separation of perception and reflex

Keep measurement separate from policy.

Bad boundary:

```text
DINO says: EXPLORE
```

Good boundary:

```text
DINO-derived witness:
  candidateDistanceMean = 0.11

native deterministic policy:
  if candidateDistanceMean < threshold
  for an admitted bounded window,
  permit increased mutation pressure
```

The model measures. Native constituted policy decides what the measurement is allowed to affect.

## Candidate organ catalog

This catalog records **fits**, not mandatory dependencies. Exact versions, weights, runtime behavior, transitive dependencies, and licenses must be witnessed at adoption time rather than trusted from this dated checkpoint.

### librosa — classical audio / MIR bench

Possible senses:

- onset / transient evidence;
- energy and loudness envelopes;
- spectral centroid / bandwidth / flux;
- pulse / beat hypotheses;
- harmonic/percussive evidence;
- recurrence and section-change features.

Role: strong research bench and possible production source depending on packaging/runtime choices. Current upstream framework license observed 2026-08-19: ISC.

### OpenCV — visual geometry / motion bench

Possible senses:

- frame difference;
- optical flow / motion-vector fields;
- foreground/background change;
- edge / contour / occupancy measures;
- quiet-region and motion-pressure witnesses;
- deterministic image transforms.

Role: classical CV instrument before semantic vision. Current OpenCV 4.5+ upstream license observed 2026-08-19: Apache-2.0.

### DINOv2 — frozen visual feature geometry

Possible senses:

- candidate-family distance;
- near-duplicate/collapse detection;
- novelty and coverage measurement;
- visual nearest-neighbor relationships;
- specimen retrieval.

Role: learned microscope. It may measure difference; it may not rank taste or choose a winner. Current primary DINOv2 code/model license observed 2026-08-19: Apache-2.0; downstream heads/assets still require exact witness.

### MediaPipe — anatomy / landmark / segmentation sensors

Possible senses:

- body / hand / face landmark geometry;
- foreground masks;
- pose axes;
- typography avoidance geometry;
- bounded body-attached effects.

Role: geometry witness rather than semantic/emotional authority. Current upstream code license observed 2026-08-19: Apache-2.0. Product telemetry behavior must be inspected independently before adoption.

### Sentence Transformers / small text embeddings — semantic coordinates

Possible senses:

- lyric-line similarity;
- motif recurrence;
- clip/tag proximity;
- bounded semantic retrieval;
- textual distance as proposal evidence.

Role: text microscope, not writer. Current framework license observed 2026-08-19: Apache-2.0. Every downloaded model requires its own identity/hash/license witness.

### XState — deterministic reflex topology

Possible uses:

- explicit state machines / statecharts;
- sensor-pressure thresholds;
- degraded / refused-sensor states;
- bounded orchestration;
- inspectable transition history.

Role: likely strong JS-native regulator candidate. Actor terminology does not imply an AI-agent architecture. Current upstream license observed 2026-08-19: MIT.

### ONNX Runtime — model-cartridge socket

Possible uses:

- explicitly admitted local frozen-model inference;
- one boring tensor-in / witness-out adapter;
- model hash/version isolation from project authority.

Role: stable local inference boundary if learned microscopes become useful in production. Current upstream license observed 2026-08-19: MIT. Model terms remain independent.

### BehaviorTree.CPP — robotics reflex reference

Possible uses:

- reactive-tree composition ideas;
- bounded action/refusal semantics;
- transition logging/replay concepts;
- design reference where statecharts become insufficient.

Role: research/reference first; JS-native re-expression is likely preferable to adding a C++ runtime dependency. Current upstream license observed 2026-08-19: MIT.

### Essentia — First Dropout

Essentia covers a broad audio-analysis surface: classical DSP, statistics, spectral/temporal/tonal descriptors, beat/rhythm work, and optional learned-model inference.

That breadth makes it useful for the question:

> **What senses should this organism possess?**

It is intentionally staged as a research organism, not a casual production dependency.

Observed upstream posture on 2026-08-19:

- library: AGPLv3 for open/non-commercial use, proprietary licensing available;
- model terms are separate and must be checked per exact model;
- current Essentia licensing/model pages are not perfectly aligned on blanket model wording, so exact model LICENSE + file hash outrank this checkpoint;
- optional dependencies may carry GPL/LGPL/other obligations.

## Compost Translation lifecycle

```text
foreign research organism
        |
      INGEST
        |
controlled specimens + receipts
        |
      DIGEST
        |
behavioral hypotheses / public math / spec
        |
       GROW
        |
native eCODEsystem primitive
        |
     COMPOST
        |
foreign runtime dependency drops out
```

### Ingest

Run a foreign tool only inside an explicit research boundary.

Bind each run to:

- tool/version;
- algorithm/model identity;
- parameters;
- exact input hash;
- generated or real specimen identity;
- exact output/hash;
- observed license provenance.

### Digest

Use controlled inputs to understand behavior.

Useful probe families include:

```text
silence
single impulse
periodic impulses
sine tones
frequency sweeps
white / pink noise
amplitude ramps
multi-tone mixtures
sample-rate variants
frame/window-size variants
fixed real WAV specimens
```

Hypotheses are versioned and allowed to fail.

```text
H17
  explains: R001-R438
  fails: R439
  supersedes: H11
```

The goal is a behavioral specification grounded in measurements, public mathematics/papers/standards, and explicit uncertainty.

### Grow

A native implementation is shaped around **eCODEsystem semantics**, not the foreign API.

Example:

```text
foreign API concept:
  detectOnsets(audio)

native primitive:
  witnessTransientPressure(window)
    -> interval
    -> pressure
    -> confidence
    -> contributing bands
    -> lineage
```

The native shape is reusable across projects because it speaks witness/provenance grammar rather than library-specific objects.

### Compost

The foreign runtime is no longer required by the production path.

Its contribution remains visible in ancestry:

```text
NativeTransientPressure v1
  ancestry:
    - reference research receipts
    - public literature/math
    - failed hypotheses
    - fixed specimen corpus
    - native implementation proof
```

The dependency dies. Its attributable contribution does not.

## Reference observation contract

Conceptually:

```text
ReferenceObservation {
  foreignToolVersion,
  algorithm,
  parameters,
  inputSha256,
  inputGenerator,
  output,
  outputHash,
  licenseWitness
}
```

A graduation receipt should additionally record:

- source research receipts;
- behavioral spec version;
- native implementation identity;
- tolerated numerical/semantic delta;
- fixed specimens exercised;
- production dependency scan/result;
- unresolved mismatches.

## Stage-separation boundary

Where implementation independence matters, prefer an explicit clean-room-friendly shape:

```text
REFERENCE LAB
  executes foreign tool
  reads documented API / public papers
  emits behavior spec + receipts

           || ONLY SPEC CROSSES ||

NATIVE IMPLEMENTATION
  consumes behavior spec + public math
  does not import foreign runtime/source

           || DIFFERENTIAL PROOF ||

REFERENCE OUTPUT <-> NATIVE OUTPUT
```

Receipts establish lineage and separation. They do not automatically erase copyright, patent, contract, model-license, or anticircumvention obligations. Any future case involving proprietary contracts, patents, access-control circumvention, or model-output cloning requires separate review.

## First grounded Toaster slice

Issue #183 already provides the right entry seam: attached VSPantry audio becomes a non-master **Specimen Pulse** witness.

The first implementation experiment should therefore remain tiny:

```text
VSPantry attached audio
        |
        v
Specimen Pulse research bench
        |
        +-- native/basic DSP baseline
        |
        +-- optional Essentia reference
        |
        v
receipted comparison corpus
        |
        v
one native graduated witness
```

Recommended first graduation target: one low-level measurement such as transient pressure, spectral flux, or bounded energy dynamics.

Do not begin with beat semantics, source separation, embeddings, classifier stacks, or a generalized AI runtime.

## Graduation gate

A research-derived sensor is eligible for production only when:

1. the needed behavior is described in a native eCODEsystem contract;
2. fixed specimens and parameters are addressed;
3. reference and native observations can be compared under declared tolerances;
4. failures and ambiguity remain visible;
5. exact production dependencies are known;
6. unwanted research dependencies/models are absent from the production package;
7. project authority boundaries remain unchanged;
8. the witness is reusable without importing Toaster-specific renderer authority.

For the #183 descendant, final song master audio must remain unaffected by specimen audio.

## Dependency classes

These are adoption-posture labels, not permanent judgments about upstream projects.

### GREEN — ordinary/permissive production candidate

May be considered for production after runtime, packaging, privacy, determinism, transitive dependency, and exact-license inspection.

Likely candidates: native DSP, OpenCV, XState, ONNX Runtime, selected permissive audio tooling.

### YELLOW — learned microscope

Frozen models may be useful as testimony producers when exact weights/license/version/hash are known and outputs remain non-authoritative.

Likely candidates: DINOv2, selected MediaPipe tasks, explicitly licensed text embeddings.

### RED / RESEARCH-ONLY UNTIL CLEARED

Useful in quarantine when licensing, model terms, runtime size, opacity, or dependency chains make production adoption undesirable.

First specimen: Essentia.

## Cross-ecosystem fit

A native witness grammar is intentionally broader than Haunted Toaster.

- **Haunted Toaster** — Specimen Pulse, candidate diversity, topology/motion response, typography placement, visual ecology pressure.
- **Haunted Phonograph** — rhythmic/structural seed extraction without semantic authority.
- **Band Runtime** — density, silence, recurrence, collision, shared field pressure without central assignment authority.
- **Founder Node** — neighborhood/similarity geometry without converting proximity into routing authority.
- **Corpus OS** — anomaly/pressure witnesses without statistics constituting legal state.
- **TranchNode / Project0** — deterministic projections over multidimensional observations while projection remains witness.
- **Haunted Camera** — pose/motion/foreground/reflex sensing without semantic AI governorship.

Cross-project reuse follows the existing BEE direction: provenance may travel; authority stays local; each recipient re-proves the invariant in its own field.

## Alternatives considered

### A. Add one general-purpose AI supervisor

Rejected.

It centralizes interpretation and decision-making, creates hidden authority pressure, complicates replayability, and would make system behavior less inspectable as complexity grows.

### B. Integrate each upstream library directly wherever needed

Rejected as the default.

This creates adapter-shaped ontology, inconsistent provenance, duplicated dependency policy, and makes later removal difficult.

### C. Use only classical hand-written DSP/CV and reject all learned models

Too restrictive.

Frozen learned feature extractors can be valuable measuring instruments when bounded correctly. The architecture should distinguish testimony from authority rather than prohibit a useful class of microscope.

### D. Perceptual Reflex Layer + Compost Translation

Chosen.

It preserves a small native authority core while allowing the ecosystem to borrow, test, digest, and eventually regrow useful perception mechanisms.

## Non-goals

- no LLM supervisor;
- no autonomous tool-using Toaster agent;
- no AI taste ranking / automatic winner selection;
- no sensor writing `VisualScore` or `ResolvedTimeline` directly;
- no ambient model inference during raster execution;
- no cloud requirement;
- no wholesale Essentia port;
- no assumption that framework license covers model weights or training data;
- no production dependency merely because its license is permissive;
- no claim that receipts alone resolve all legal/licensing questions.

## Validation for this design checkpoint

This PR is documentation-only. It changes no renderer, package, canonical artifact, receipt schema, or compatibility surface.

Review should verify:

- issue #184 is the project-owned architecture authority;
- issue #183 remains the first grounded Toaster sensor ancestor;
- the organ catalog does not imply mandatory adoption;
- Essentia remains research-only until separately cleared;
- testimony, proposal/influence, and execution authority remain distinct;
- the first implementation target remains one small audio witness rather than a platform rewrite.

UI impact: none  
browser witness: not-required  
visual delta: none  
packaged witness required: no  
packaged witness: not-required  
GitBook ontology changed: yes — bounded frontier projection planned separately

## Stop condition

The design is sufficient when the project can truthfully say:

> **The eCODEsystem may borrow foreign senses, learn their useful laws, and regrow those laws in native grammar without letting the borrowed machinery become sovereign.**
