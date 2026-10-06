# NEXTGEN-TOASTER-012 — REAL PIXEL RESUME

Status: experimental descendant of NEXTGEN-TOASTER-011 PerformanceProgram.

## Question

Can an exact PerformanceProgram work region produce **real deterministic pixel artifacts**, survive interruption, resume from receipts alone in a different execution root, and converge on the same frame graph as one uninterrupted render?

012 answers that question with a deliberately bounded witness raster.

```text
sealed human performance
        ↓
PerformanceProgramV0
        ↓
exact frame regions
        ↓
packaged FFmpeg
        ↓
real lossless PPM frames
        ↓
SHA-256 per frame
        ↓
region pixel receipt
        ↓
missing-set resume
        ↓
complete frame artifact graph
```

## What changed from 011

011 proved work topology with a deterministic simulator digest.

012 crosses the pixel boundary.

The region worker now invokes the repository's packaged FFmpeg seam and emits actual image files.

Therefore:

```text
SIMULATION DIGEST != PIXEL PROOF

but

HASH(EMITTED FRAME BYTES) = PIXEL ARTIFACT EVIDENCE
```

The generated artifacts are lossless PPM frames rather than an encoded movie container. This is intentional: the first proof should compare exact pixels without codec, muxer, timestamp, or metadata nondeterminism.

## Renderer

012 introduces:

```text
ffmpeg-performance-program-witness-raster/v0
```

It is a deterministic witness renderer for PerformanceProgram semantics.

It currently renders:

- exact action frame spans;
- action stack order;
- performed transform positions;
- spatial transform keyframes;
- scale;
- crop geometry when present;
- opacity;
- material identity as deterministic color;
- rotation as an orientation witness marker;
- source-frame progression as an internal playhead marker;
- residue strength as a historical-state bar.

This is enough to make the program causally visible in real pixels.

It is **not** yet the final artistic Franken projection.

```text
WITNESS RASTER != FINAL ARTISTIC PROJECTION
```

That distinction stays explicit.

## Region receipt

Each rendered region produces:

```text
static-collective/performance-program-pixel-region-receipt/v0
```

with:

- PerformanceProgram hash;
- RenderRegionPlan hash;
- exact region ID;
- exact frame span;
- worker ID;
- attempt ID;
- raster dimensions;
- RGB24 / PPM format;
- one SHA-256 for every emitted frame file;
- one region pixel hash over the ordered frame graph;
- a receipt hash over the complete witness.

No absolute local path participates in receipt identity.

The same region can therefore be rendered into different directories by different workers and still produce the same pixel identity.

## Interruption specimen

The executable test uses a bounded 84-frame PerformanceProgram split into seven regions.

The first worker renders:

```text
3 / 7 regions
= 42.857%
```

Then the process history is reduced to serialized receipts.

The next worker uses:

- the same PerformanceProgram;
- the serialized prior receipts;
- a different worker ID;
- a different output root.

The reconstructed state names exactly four missing region IDs.

Only those four regions are rendered.

No mutable renderer cursor is required.

## Uninterrupted control

The same PerformanceProgram is also rendered from frame 0 through frame 83 in one uninterrupted FFmpeg invocation.

012 then compares:

```text
resumed region frame hashes
        versus
clean whole-render frame hashes
```

The required equality is over every actual emitted frame SHA-256 in order.

The final comparison object is:

```text
frameGraphHash
```

If one pixel differs in one frame, the graph differs.

## Duplicate work

The same exact region is also rendered independently by two worker identities into two different roots.

Both attempts remain separate receipts.

Coverage accounting follows:

```text
PIXEL ATTEMPT COUNT != PIXEL COVERAGE
DUPLICATE PIXELS != DOUBLE CREDIT
CONFLICT != SILENT WINNER
```

If duplicate attempts for one region ever produce different region pixel hashes, that region becomes a conflict and the complete artifact graph refuses to form.

## Artifact graph

Conflict-free complete region coverage can produce:

```text
static-collective/performance-program-pixel-artifact-graph/v0
```

containing:

- ordered region pixel identities;
- every global frame number;
- every real frame SHA-256;
- exact frame count;
- canonical `frameGraphHash`;
- artifact graph hash.

This graph is reconstructible from the program and receipts.

## Why PPM first

The first crossing deliberately avoids MP4 identity.

Two semantically identical encodes can differ in:

- container metadata;
- timestamps;
- encoder implementation details;
- thread scheduling;
- muxer behavior.

Those are useful later, but they obscure the first question.

PPM makes the founding equation simple:

```text
same program
+ same renderer contract
+ same frame number
→ same pixel bytes
```

## Current laws

```text
REPLAY != RE-PERFORMANCE
PIXEL RECEIPT != HUMAN PERFORMANCE
WITNESS RASTER != FINAL ARTISTIC PROJECTION
PIXEL ATTEMPT COUNT != PIXEL COVERAGE
DUPLICATE PIXELS != DOUBLE CREDIT
CONFLICT != SILENT WINNER
MISSING SET != ASSIGNMENT AUTHORITY
WORKER ID != COMPUTE CAPACITY AUTHORITY
ARTIFACT HASH != ECONOMIC VALUE
```

## Nonclaims

012 does not yet claim:

- the witness raster is the final Haunted Toaster aesthetic;
- original video material bytes are replayed from the PerformanceProgram alone;
- distributed transport exists;
- a worker ID proves machine identity or capacity;
- GHoT continuation authority has crossed into Toaster;
- resource evidence proves artistic value;
- frame hashes imply ownership;
- an MP4 container is byte-identical across machines.

## Graduation aperture

After 012 passes, the next useful crossing is narrower than before:

1. retain the proven pixel-region receipt contract;
2. replace or augment witness-raster material with actual admitted media bindings;
3. keep exact frame hashing below the encoded transport;
4. hand sparse missing-region work to a GHoT adapter;
5. attach independent CPU/storage/network/energy observations without changing pixel authority.

012 therefore establishes the first real execution boundary:

> **PerformanceProgram → exact real pixels → interruption → reconstruction → same frame graph.**
