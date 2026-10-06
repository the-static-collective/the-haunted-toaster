# NEXTGEN-TOASTER-013 — BOUND MEDIA × SPARSE TRANSPORT

Status: experimental descendant of NEXTGEN-TOASTER-012 real pixel resume.

## Question

Can a PerformanceProgram keep portable media identity separate from local file paths, prove that the admitted bytes really affect rendered pixels, and send only exact missing pixel regions through a GHoT-shaped sparse work parcel without importing false authority?

013 answers that question with two bounded crossings:

```text
admitted media
    ↓
portable media-binding witness
    +
local path transport
    ↓
byte revalidation
    ↓
FFmpeg source sampling
    ↓
real pixel receipts

and

pixel execution state
    ↓
exact missing region observation
    ↓
GHoT-067-pinned sparse parcel
    ↓
partial execution
    ↓
exact returned IDs
    ↓
reassignment
```

## Portable identity / local transport split

013 adds:

```text
static-collective/performance-program-media-binding-set/v0
static-collective/performance-program-local-media-paths/v0
```

The portable witness contains:

- PerformanceProgram hash;
- exact required material IDs;
- source specimen IDs;
- source SHA-256 values;
- source byte lengths;
- source identities;
- program-material hashes;
- digestion role and sampling metadata where available;
- one canonical media-binding-set hash.

It does **not** contain local paths.

The path transport contains:

- the same program hash;
- the exact media-binding-set hash;
- local material → path bindings;
- a transport-local hash.

Therefore:

```text
CONTENT IDENTITY != LOCAL PATH
LOCAL PATH != SOURCE IDENTITY
PATH TRANSPORT != ADMISSION
```

Moving the same admitted bytes to another local path changes only the local transport hash.

The portable media-binding-set hash remains identical.

## Byte revalidation

Before bound media can affect pixels, every local path is re-hashed.

The observed file must still match:

```text
source SHA-256
source byte length
source specimen identity
```

If the bytes change after admission, rendering refuses.

```text
BYTE REVALIDATION PRECEDES PIXEL USE
```

## Bound-media witness raster

012's witness raster remains valid for unbound execution.

013 adds a compatible bound-media mode.

The admitted source is decoded through the repository's existing packaged FFmpeg seam at the PerformanceProgram frame rate into deterministic RGB source samples.

Those source samples then affect the real rendered witness pixels according to the material's PerformanceProgram metadata.

The founding implementation distinguishes:

- texture material — decoded source RGB;
- topology-mask material — decoded source luma;
- motion-mask material — decoded adjacent-sample RGB difference;
- loop / play-once / stretch source traversal.

This is intentionally still a witness raster rather than the final artistic projection.

```text
ADMITTED BYTES -> DECODED SOURCE SAMPLES -> REAL PIXEL CONSEQUENCE
```

and:

```text
BOUND-MEDIA WITNESS != FINAL FRANKEN PROJECTION
```

Each pixel region receipt may now bind:

- the media-binding-set hash;
- decoded source sample evidence;
- source specimen SHA;
- source sample count;
- source sample-byte SHA.

A complete artifact graph refuses mixed media-binding identities.

## COMPILE TAKE

When ONE PASS was performed from a reviewed NextGen crossing, COMPILE TAKE now asks the privileged crossing for the private admitted-media entries.

It verifies the expected crossing identity before use.

The compiled directory may therefore contain:

```text
performance-program.json
render-region-plan.json
execution-receipt.json
media-binding-witness.json
local-media-paths.json
```

The visible UI shows the sealed media-binding hash beside the program hash.

No source path is moved into the ONE PASS witness.

## GHoT aperture

013 pins the current GHoT sparse work experiment exactly:

```text
repo: the-static-collective/GHoT
PR:   #64
ref:  exp067
SHA:  6456828ca6d2ee2cd10db2017cbd9278c1e3c664
kind: ghot.lightwalker.sparse-region-work-lease/v0
```

Toaster does **not** copy GHoT signatures or claim to become a GHoT authority node.

Instead it introduces:

```text
static-collective/performance-program-sparse-missing/v0
static-collective/ghot-067-sparse-region-parcel/v0
static-collective/ghot-067-sparse-region-result/v0
```

with explicit compatibility:

```text
shape-compatible-with-ghot-067-not-a-ghot-signature
```

## Exact missing work

The sparse observation derives directly from real pixel receipts.

It carries:

- PerformanceProgram hash;
- exact render-region-plan hash;
- media-binding-set hash;
- accepted exact region IDs;
- accepted-coverage digest;
- missing exact region IDs;
- missing-region-set digest;
- assignment-owner particular.

The observation itself grants no assignment, execution, settlement, or compute authority.

```text
MISSING SET != ASSIGNMENT
```

## Sparse parcel

A parcel must name an exact subset of the observed missing IDs.

It binds:

- exact missing observation hash;
- accepted-coverage digest;
- missing-region-set digest;
- assignment owner;
- worker particular;
- exact assigned region IDs;
- exact assigned-region-set digest;
- issuance cut;
- expiry cut;
- media-binding-set hash.

It explicitly says:

```text
computeCapacityAuthority = none
ownershipTransfer = false
settlementAuthority = none
```

A scalar count can never substitute for exact IDs.

```text
QUANTITY != REGION AUTHORITY
ASSIGNMENT MUST NAME EXACT MISSING WORK
```

## Worker execution

The parcel itself cannot start rendering.

The caller must explicitly provide local execution authorization.

That local authorization is outside the sparse parcel.

```text
REGION ASSIGNMENT != COMPUTE CAPACITY AUTHORITY
```

The worker may execute only exact parcel regions.

Attempting any outside region is refused before rendering.

If the parcel is media-bound, the worker must also possess:

- the exact portable media-binding witness;
- a local path transport whose bytes revalidate against that witness.

## Partial return

The worker may consume only part of its parcel.

The result preserves:

```text
consumed exact region IDs
returned exact region IDs
```

such that:

```text
consumed ∩ returned = empty
consumed ∪ returned = original assigned set
```

The exact returned IDs can be reassigned.

Consumed IDs are not silently made available again.

```text
PARTIAL REGION EXECUTION MUST PRESERVE UNFINISHED IDS
```

## Founding specimen

The 013 end-to-end test uses a real locally generated MP4 admitted through VSPantry admission logic.

The test proves:

1. the same admitted bytes copied to another path produce the same portable media-binding witness;
2. the local path transport changes;
3. both paths revalidate successfully;
4. bound rendering produces a different real pixel graph from the unbound material-ID fallback;
5. replacing the admitted file bytes causes rendering to refuse;
6. two already-rendered regions become accepted coverage;
7. the exact remaining five regions become one GHoT-067-pinned parcel for worker R;
8. R is refused until caller-local execution authorization is explicit;
9. R consumes three exact regions and returns two exact IDs;
10. R cannot execute a region outside the parcel;
11. only those two returned IDs are reassigned to worker S;
12. S executes them using the **relocated** copy of the same admitted media;
13. the combined owner + R + S receipts produce complete media-bound pixel coverage;
14. that sparse resumed frame graph equals one uninterrupted bound-media render frame-for-frame.

## Current laws

```text
REPLAY != RE-PERFORMANCE

CONTENT IDENTITY != LOCAL PATH
LOCAL PATH != SOURCE IDENTITY
PATH TRANSPORT != ADMISSION
MEDIA BINDING != RENDER AUTHORITY
BYTE REVALIDATION PRECEDES PIXEL USE

QUANTITY != REGION AUTHORITY
ASSIGNMENT MUST NAME EXACT MISSING WORK
MISSING SET != ASSIGNMENT
REGION ASSIGNMENT != OWNERSHIP
REGION ASSIGNMENT != COMPUTE CAPACITY AUTHORITY
REGION PARCEL != REGION RESULT
PARTIAL REGION EXECUTION MUST PRESERVE UNFINISHED IDS
CONSUMED REGION != REASSIGNABLE REGION

PIXEL RECEIPT != HUMAN PERFORMANCE
ARTIFACT HASH != ECONOMIC VALUE
BOUND-MEDIA WITNESS != FINAL FRANKEN PROJECTION
```

## Nonclaims

013 does not claim:

- the local path file is portable authority;
- a GHoT-compatible parcel is a GHoT-signed lease;
- Toaster now owns GHoT's assignment ledger;
- parcel possession proves compute capacity;
- worker labels prove machine identity;
- source samples are the final artistic video treatment;
- actual admitted media bindings transfer ownership;
- resource usage establishes economic or artistic value;
- transport is globally consensus-safe.

GHoT 067 itself identifies assignment forks between disconnected owner replicas as the next pressure point.

013 therefore stops before pretending local sparse non-overlap is global non-overlap.

## Result

012 proved:

```text
PerformanceProgram
-> exact real pixels
-> interruption
-> reconstruction
-> same frame graph
```

013 adds:

```text
admitted media identity
-> path-independent portable custody
-> byte-revalidated pixel consequence

and

exact missing pixel work
-> sparse transport parcel
-> partial execution
-> exact unfinished return
-> reassignment
-> same bound-media frame graph
```

The movie program can now carry real admitted material without carrying a local path as truth, and its missing work can leave the owner as exact named regions without turning quantity, transport, or worker identity into authority.
