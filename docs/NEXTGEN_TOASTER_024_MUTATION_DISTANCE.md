# NEXTGEN-TOASTER-024 — Mutation distance

Stack parent: draft #355, exact head `8e82bd046158109696fc0ee62f59876b8ee57e0a`.
This is an observational experiment, not product promotion.

## Operand and authority boundary

024 rebuilds 023's ecology from sealed ONE PASS receipts; persisted edge,
generation, distance, and authority claims are never accepted as proof. Each
performed parent gets a separate record. Declared ancestor edges and unused
histories do not become measurement edges.

The parent identity is its history capsule hash, retaining rendered-media SHA-256
as a reference. The child identity is its performance hash. Supplied operands also
receive domain-separated canonical SHA-256 evidence hashes. The inherited
performance fingerprint is preserved, not advertised as cryptographic SHA-256.

Full parent measurement accepts a local JSON object containing complete
`historyCapsule` and `performanceReceipt` objects. The capsule's exact
`historicalContext.performanceHash` must bind that receipt. Generation and direct
parents must agree with independently rebuilt receipt ecology. Binding the capsule
back to the child's performed history refs must reproduce them exactly, including
fossils. Contradictions refuse. Missing parent witnesses remain unknown.

The operand is **witnessed performed use**. Historical performance context is not
accepted render cause. This does not prove that rendered pixels executed those
placements, and does not reread referenced media or frozen plans.

## Canonical record and comparison

Schema: `static-collective/mutation-record/v0`.
Policy: `exact-placement-witness-particulars/v0`.
Hash domain: `HauntedToaster-MutationRecord-v0`.

Records bind exact artifact identities/evidence hashes, the complete performed
edge, parent/child generations, comparison version, five deltas, unknown dimensions
and ancestors, evidence references, scope limits, and `mutationRecordHash`.
Unknown ancestor generation stays `null`.

Each delta has status, nullable distance, measured-particular count, changes,
observations, and unknowns. This adapter emits changed/unchanged/unknown; future
grammars may explicitly emit measured/not-applicable. Unchanged means within the
named grammar. Unsupported phenomena remain under `unmeasurable`.

| Dimension | Executed grammar |
| --- | --- |
| Placement | Exact local IDs; added/removed placements; source binding/trim; lane/region; stack order; repetition counts; geometry fields with before/after particulars |
| Timing | Rational onset/duration changes, section reassignment, overlap durations, union-of-occupied-spans silence/gaps, performance span |
| Topology | Directed sequence-before, temporal overlap, temporal containment, concurrent neighboring-lane adjacency |
| Law fossils | Direct performed history and supplied parent capsule's fossil; added/removed/inherited identities; contradictory historical axis annotations; ancestry absence explicitly unknown |
| Material role | Per-material roles on actual placements; use began/ceased; witnessed lane role, held/moving surface, crop; unused capabilities excluded |

Timing uses reduced integer rational seconds plus readable signed deltas. Each
operand uses its own FPS. Section origins reuse ONE PASS's SCENES/SCENE_FRAMES.
Beat grids, spatial crossings/containment, and branch/rejoin are not invented.
Geometry and relations are separate projections: coordinate changes can preserve
all measured topology. Keyframes sort by explicit offset; object keys, placement
lists, material lists, and keyframe file order are not performed ordering.

Exact IDs are local addresses. Renaming an ID yields removal/addition, with no
guessed counterpart. A fossil contradiction means different historical relaxation
annotations for the same source-program axis, not active-law compliance. Removal
means absent from compared observed history, not erased ancestry. Missing ancestor
histories make fossil distance partial.

Aggregate distance is the unweighted count of changed particulars. One event can
have particulars in several dimensions. This is an index, not a physical norm,
fitness, target, ranking, recommendation, or optimization function. If any
dimension is unknown, aggregate value is `null`, coverage is partial, and only
actually observed particulars have a numeric count. `grantedAuthorities=[]` and
`activeLawAuthority="none"`: no selection, placement, execution, render, adoption,
FREEZE, or value authority.

The grammar uses identities, regions, roles, rational spans, and typed relations.
ONE PASS vocabulary/bounds belong to this first adapter/policy; future artifact
adapters can retain the record grammar. Blender Parts Drawer, Paper Director,
adoption, lyric-geography, and rendered-region bridges are not implemented.

## Replay, custody, and editor

`compileFamilyMutations({performanceReceipts,parentEvidence})` produces one record
per performed edge. `verifyMutationRecord(record,inputs)` rebuilds the family and
compares complete canonical bytes. Rehashing forged scalar/authority claims cannot
bypass verification.

The bridge reads bounded local witness files and shares 023's canonical bytes and
create-only persistence helper. Records live under
`FrankenComposer/mutation-records/<mutationRecordHash>.json`. Identical replay is
idempotent; conflicting bytes refuse. Verification rereads the persisted record
and parent witness files. Changed parent capsule/performance or child evidence
fails verification. Paths are custody locators, not creative identities. Retain
input witnesses: records carry evidence references, not every raw source artifact.

After BUILD FAMILY TREE, the editor offers LOAD PARENT WITNESS, MEASURE MUTATION,
and VERIFY RECORD. Select an explicit edge to inspect neutral dimension bars and
expanded changed/unknown particulars. Roots have no parent edge to measure. A new
take clears stale measurements. Measuring changes no take, composition, execution
scope, or FREEZE state and selects no preferred parent.

## Executable specimen and proof

```bash
node src/full-measure/scripts/mutation-distance.cjs --specimen > /tmp/mutation-specimen.json
node src/full-measure/scripts/mutation-distance.cjs --input family-evidence.json
node --test src/full-measure/tests/mutation-*.test.cjs
npm run verify
npm --prefix src/full-measure run witness:build
npm --prefix src/full-measure run witness:test
npm --prefix src/full-measure run pack
# Linux packaged proof; use a display/Xvfb in headless environments:
node src/full-measure/scripts/smoke-mutation-packaged.cjs src/full-measure/release/linux-unpacked/haunted-toaster
```

Three children share one parent and generation 2:

| Child | Placement | Timing | Topology | Fossils | Role | Aggregate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A: geometry | 1 | 0 | 0 | 0 | 0 | 1 |
| B: onset + role | 0 | 2 | 0 | 0 | 1 | 3 |
| C: role | 0 | 0 | 0 | 0 | 1 | 1 |

A/B prove shared parent and generation do not imply equal mutations/distances.
A/C prove equal scalar distance can describe entirely different profiles. Every
specimen record is independently verified before canonical stdout emission.

The 25 new domain/bridge/JSDOM tests cover deterministic replay, known unchanged
dimensions, unknown evidence/generation, serialization, placement, rational timing
and FPS equivalence, relational changes, inert fossils, performed material use,
siblings, equal aggregates/different profiles, multiple parents, tampering,
create-only conflict refusal, UI reset/refusal, and authority denial.

The inherited local consolidated runs passed 1,041 and then 1,043 tests and both
smoke renders. The final affected-boundary run passed all 25 new tests, including
the two additional serialization/multi-parent cases. Final exact-head proof and CI are recorded in
the draft PR. Packaged Linux proof executes real preload/IPC/filesystem and rereads
tampered evidence. The harness supplies the native-dialog return; native dialog
appearance and Windows package behavior remain unproven.

Local full browser comparison found seven inherited screenshot failures on Debian.
Unchanged #355 independently reproduces the empty-screen mismatch (expected
1380×994, actual 1380×1008). Baselines are retained. The new browser interaction
passes; its 1380×900 image was inspected. Exact-head Ubuntu CI is the inherited
screenshot gate.

Generated witness output, smoke media/receipts, local package, and mutation proof
screenshots are ignored artifacts. No canonical score, timeline, execution profile,
accepted plan, or compatibility contract is migrated. The observational record
schema and additive bridge calls are new contracts. GitBook ontology is unchanged.

## Founding laws

```text
DISTANCE != VALUE
MUTATION != IMPROVEMENT
DIFFERENCE != RECOMMENDATION
GENEALOGY != DESTINY
GEOMETRY != TOPOLOGY
SERIALIZATION DELTA != CREATIVE DELTA
SERIALIZATION DELTA != PLACEMENT DELTA
TIME DIFFERENCE != RHYTHMIC QUALITY
LAW FOSSIL != ACTIVE LAW
HISTORICAL PRESENCE != CURRENT AUTHORITY
AVAILABLE ROLE != PERFORMED ROLE
UNKNOWN != ZERO
UNKNOWN GENERATION != ZERO
SUMMARY != EVIDENCE
SHARED PARENT != SAME MUTATION
SAME GENERATION != SAME DISTANCE
SAME DISTANCE != SAME MUTATION
```

## Next aperture revealed

A renamed, split, or resegmented placement appears as removal/addition even when
a human considers it continued material. The experiment exposes missing evidence:
explicit correspondence between performed particulars across an edge. What can
witness continuity through split/rejoin without inferring identity from resemblance,
genealogy, or the aggregate distance?
