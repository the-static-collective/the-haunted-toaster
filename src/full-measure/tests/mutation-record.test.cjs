"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {canonicalBytes}=require("../src/generation/canonical.cjs");
const {compileFamilyMutations,verifyMutationRecord}=require("../src/nextgen/mutation-record.cjs");
const {specimen}=require("./fixtures/mutation-specimen.cjs");
test("deterministic family-edge mutation replay is independently verified",()=>{
  const inputs=specimen();
  const a=compileFamilyMutations(inputs)[0];
  const b=compileFamilyMutations(inputs)[0];
  assert.deepEqual(canonicalBytes(a),canonicalBytes(b));
  assert.equal(verifyMutationRecord(a,inputs),true);
});
const {clone,reseal,take,capsuleFor,fossilRef,historyRef}=require("./fixtures/mutation-specimen.cjs");
const {MUTATION_COMPARISON_POLICY}=require("../src/nextgen/mutation-record.cjs");
const record=inputs=>compileFamilyMutations(inputs).find(r=>r.parentArtifact.identityHash===inputs.parentEvidence[0]?.historyCapsule.capsuleHash)||compileFamilyMutations(inputs)[0];

test("unchanged performed child has zero only within known policy dimensions",()=>{
  const r=record(specimen());
  for(const d of Object.values(r.deltas)){assert.equal(d.status,"unchanged");assert.equal(d.distance,0);}
  assert.equal(r.aggregateDistance.value,0);
  assert.equal(r.parentGeneration,1);assert.equal(r.childGeneration,2);
  assert.ok(r.unmeasurable.some(s=>s.includes("beat-relative")));
});
test("missing parent evidence remains unknown, never zero or asserted additions",()=>{
  const inputs=specimen();inputs.parentEvidence=[];
  const r=record(inputs);
  for(const d of Object.values(r.deltas)){assert.equal(d.status,"unknown");assert.equal(d.distance,null);assert.equal(d.changes.length,0);}
  assert.equal(r.aggregateDistance.value,null);
  assert.equal(r.parentArtifact.evidenceHash,null);
  assert.equal(r.parentArtifact.evidenceStatus,"performed-reference-only");
});
test("unknown ancestor generation remains null",()=>{
  const parent=clone(take());parent.materials[1].historyRef={...historyRef(),parentCapsuleHashes:["6".repeat(64)]};
  const inputs=specimen(()=>{},reseal(parent));
  const r=record(inputs);
  assert.ok(r.unknownAncestry.length>0);
  assert.ok(r.unknownAncestry.every(n=>n.generation===null));
  assert.equal(r.deltas.lawFossil.status,"unknown");
  assert.equal(r.deltas.lawFossil.distance,null);
});
test("serialization and collection ordering change exact identity but not performed mutation",()=>{
  const inputs=specimen(c=>{c.placements.reverse();c.materials.reverse();c.events.reverse();});
  const r=record(inputs);
  assert.equal(r.aggregateDistance.value,0);
  assert.notEqual(r.childArtifact.identityHash,record(specimen()).childArtifact.identityHash);
  const reversed=Object.fromEntries(Object.entries(inputs.performanceReceipts[0]).reverse());
  assert.deepEqual(canonicalBytes(record({...inputs,performanceReceipts:[reversed]})),canonicalBytes(r));
});
test("placement geometry changes while relational topology stays unchanged",()=>{
  const r=record(specimen(c=>{c.placements[0].transform.x+=.1;}));
  assert.equal(r.deltas.placement.status,"changed");
  assert.equal(r.deltas.placement.distance,1);
  assert.equal(r.deltas.topology.distance,0);
  assert.equal(r.deltas.timing.distance,0);
});
test("added, removed, lane, ordering, repetition and source-binding particulars remain inspectable",()=>{
  const r=record(specimen(c=>{
    c.materials[1].historyRef=clone(c.materials[0].historyRef);
    c.placements[0].lane=2;c.placements[0].stackOrder+=1;c.placements[0].materialId=c.materials[2].materialId;
    const copy=clone(c.placements[1]);copy.placementId="new-placement";c.placements.push(copy);c.placementCount++;
  }));
  // Keep the measured parent performed on lane 1 too, so changing lane 0's source cannot erase parentage.
  for(const kind of ["added-placement","lane","ordering","source-binding","repetition-count"])assert.ok(r.deltas.placement.changes.some(d=>d.kind===kind));
  const removed=record(specimen(c=>{c.placements.pop();c.placementCount--;}));
  assert.ok(removed.deltas.placement.changes.some(d=>d.kind==="removed-placement"));
});
test("timing retains exact rational seconds and readable onset displacement",()=>{
  const r=record(specimen(c=>{c.placements[0].startOffsetFrames+=2;}));
  const change=r.deltas.timing.changes.find(d=>d.kind==="onset");
  assert.deepEqual(change.delta,{numerator:1,denominator:12,unit:"seconds"});
  assert.match(change.display,/s/);
  assert.equal(r.deltas.topology.distance,0);
  assert.ok(r.deltas.timing.changes.some(d=>d.kind==="silence-gap-structure"));
});
test("different frame rates preserve seconds rather than treating frame indices as time",()=>{
  const inputs=specimen(c=>{
    c.fps*=2;c.totalFrames*=2;
    for(const p of c.placements){p.startOffsetFrames*=2;p.durationFrames*=2;}
  });
  assert.equal(record(inputs).deltas.timing.distance,0);
});
test("duration, overlap, sequence, containment and lane adjacency changes are detected",()=>{
  const r=record(specimen(c=>{c.placements[0].durationFrames=60;}));
  assert.ok(r.deltas.timing.changes.some(d=>d.kind==="duration"));
  assert.ok(r.deltas.timing.changes.some(d=>d.kind==="overlap"));
  assert.ok(r.deltas.topology.changes.some(d=>d.relation.kind==="temporal-overlap"));
  assert.ok(r.deltas.topology.changes.some(d=>d.relation.kind==="temporal-containment"));
  assert.ok(r.deltas.topology.changes.some(d=>d.relation.kind==="sequence-before"));
  assert.ok(r.deltas.topology.changes.some(d=>d.relation.kind==="concurrent-lane-adjacency"));
});
test("law fossils added/removed/inherited/contradicted remain annotation evidence",()=>{
  const parent=clone(take());parent.materials[1].historyRef=historyRef("2",fossilRef());
  const inherited=record(specimen(()=>{},reseal(parent)));
  assert.ok(inherited.deltas.lawFossil.observations.some(d=>d.kind==="inherited"));
  const changed=record(specimen(c=>{c.materials[1].historyRef=historyRef("4",fossilRef("5",.7));},reseal(parent)));
  assert.ok(changed.deltas.lawFossil.changes.some(d=>d.kind==="removed"));
  assert.ok(changed.deltas.lawFossil.changes.some(d=>d.kind==="added"));
  assert.ok(changed.deltas.lawFossil.observations.some(d=>d.kind==="contradicted-annotation"));
  assert.equal(changed.activeLawAuthority,"none");
  assert.ok(changed.deltas.lawFossil.changes.every(d=>d.activeLawAuthority==="none"));
});
test("material role measures used roles, and ignores unused available roles",()=>{
  const r=record(specimen(c=>{c.materials[0].roleId="background";}));
  assert.equal(r.deltas.materialRole.distance,1);
  assert.equal(r.deltas.placement.distance,0);
  const unused=record(specimen(c=>{c.materials[5].roleId="actor";}));
  assert.equal(unused.deltas.materialRole.distance,0);
  const moving=record(specimen(c=>{c.placements[0].transformKeyframes=[{offsetFrames:1,transform:{x:.9,y:.5,scale:1,rotationDegrees:0}}];}));
  assert.ok(moving.deltas.materialRole.changes[0].after.includes("moving-surface"));
});
test("siblings share parent and generation while carrying distinct distances and profiles",()=>{
  const a=specimen(c=>{c.placements[0].transform.x+=.1;});
  const b=specimen(c=>{c.placements[0].startOffsetFrames+=2;c.materials[0].roleId="actor";});
  const rows=compileFamilyMutations({...a,performanceReceipts:[...a.performanceReceipts,...b.performanceReceipts]});
  assert.equal(rows.length,2);assert.equal(rows[0].parentArtifact.identityHash,rows[1].parentArtifact.identityHash);
  assert.equal(rows[0].childGeneration,rows[1].childGeneration);
  assert.notEqual(rows[0].aggregateDistance.value,rows[1].aggregateDistance.value);
  assert.notDeepEqual(rows[0].deltas,rows[1].deltas);
});
test("same aggregate distance can describe entirely different dimensions",()=>{
  const geometry=record(specimen(c=>{c.placements[0].transform.x+=.1;}));
  const role=record(specimen(c=>{c.materials[0].roleId="actor";}));
  assert.equal(geometry.aggregateDistance.value,role.aggregateDistance.value);
  assert.equal(geometry.deltas.placement.distance,1);assert.equal(role.deltas.placement.distance,0);
  assert.equal(geometry.deltas.materialRole.distance,0);assert.equal(role.deltas.materialRole.distance,1);
  assert.notDeepEqual(geometry.deltas,role.deltas);
});
test("multiple performed parents receive separate records, unused histories receive none",()=>{
  const a=specimen(c=>{c.materials[1].historyRef=historyRef();c.materials[5].historyRef=historyRef("4");});
  const rows=compileFamilyMutations(a);
  assert.equal(rows.length,2);assert.notEqual(rows[0].parentArtifact.identityHash,rows[1].parentArtifact.identityHash);
  assert.ok(rows.every(r=>r.genealogyEdge.kind==="performed-from-history"));
  assert.ok(rows.some(r=>r.parentArtifact.identityHash===a.parentEvidence[0].historyCapsule.capsuleHash));
  assert.ok(rows.every(r=>r.parentArtifact.identityHash!=="4".repeat(64)));
});
test("tampered artifacts, parent binding, claims, edge and policy all refuse verification",()=>{
  const inputs=specimen(),r=record(inputs);
  for(const which of ["parent","child"]){
    const bad=clone(inputs);
    if(which==="parent")bad.parentEvidence[0].historyCapsule.renderedMedia.sha256="0".repeat(64);
    else bad.performanceReceipts[0].placements[0].transform.x+=.1;
    assert.throws(()=>verifyMutationRecord(r,bad),/hash|fingerprint/i);
  }
  const changed=specimen(c=>{c.placements[0].transform.x+=.1;});
  assert.throws(()=>verifyMutationRecord(r,changed),/verification/i);
  const claims=clone(r);claims.aggregateDistance.value=999;
  assert.throws(()=>verifyMutationRecord(claims,inputs),/verification/i);
  const edge=clone(r);edge.genealogyEdge.placementIds=[];
  assert.throws(()=>verifyMutationRecord(edge,inputs),/verification/i);
  const bound=clone(inputs);bound.parentEvidence[0].performanceReceipt=specimen(c=>{c.materials[0].roleId="other";}).performanceReceipts[0];
  assert.throws(()=>compileFamilyMutations(bound),/binding/i);
  assert.throws(()=>compileFamilyMutations({...inputs,comparisonPolicy:"optimize"}),/policy/i);
  assert.equal(r.comparisonPolicy,MUTATION_COMPARISON_POLICY);
});
test("no mutation record grants action or value authority",()=>{
  const inputs=specimen(),r=record(inputs);
  assert.equal(r.authority,"observational-only");assert.deepEqual(r.grantedAuthorities,[]);
  for(const key of ["selection","placement","execution","render","adoption","FREEZE","value"]){
    const bad=clone(r);bad.grantedAuthorities=[key];
    assert.throws(()=>verifyMutationRecord(bad,inputs),/verification/i);
  }
  for(const law of ["DISTANCE != VALUE","MUTATION != IMPROVEMENT","DIFFERENCE != RECOMMENDATION","UNKNOWN != ZERO","SUMMARY != EVIDENCE"])assert.ok(r.laws.includes(law));
});
test("discarded material becomes active use and ceased use remains an explicit role change",()=>{
  const r=record(specimen(c=>{
    c.materials[1].historyRef=clone(c.materials[0].historyRef);
    c.placements[0].materialId=c.materials[5].materialId;
  }));
  assert.ok(r.deltas.materialRole.changes.some(d=>d.kind==="use-began"&&d.materialId==="material-5"));
  assert.ok(r.deltas.materialRole.changes.some(d=>d.kind==="use-ceased"&&d.materialId==="material-0"));
});
test("keyframe serialization order does not change performed geometry or roles",()=>{
  const parent=clone(take());
  parent.placements[0].transformKeyframes=[{offsetFrames:1,transform:{x:.2,y:.4,scale:1,rotationDegrees:0}},{offsetFrames:2,transform:{x:.3,y:.4,scale:1,rotationDegrees:0}}];
  const r=record(specimen(c=>{c.placements[0].transformKeyframes.reverse();},reseal(parent)));
  assert.equal(r.aggregateDistance.value,0);
});
test("history parent-reference serialization order is not mutation or a binding refusal",()=>{
  const parent=clone(take());parent.materials[0].historyRef=historyRef("2");parent.materials[1].historyRef=historyRef("4");
  const normal=record(specimen(()=>{},reseal(parent)));
  const reordered=record(specimen(c=>{c.materials[0].historyRef={...c.materials[0].historyRef,parentCapsuleHashes:[...c.materials[0].historyRef.parentCapsuleHashes].reverse()};},reseal(parent)));
  for(const key of Object.keys(normal.deltas))assert.deepEqual(normal.deltas[key],reordered.deltas[key]);
});
test("a multi-parent child has distinct measured distances to each exact parent",()=>{
  const {bindHistoryToVideo}=require("../src/nextgen/history-capsule.cjs");
  const parentB=clone(take());parentB.placements[0].transform.x+=.2;
  const receiptB=reseal(parentB),capsuleB=capsuleFor(receiptB,"d");
  const inputs=specimen(c=>{c.materials[1].historyRef=bindHistoryToVideo({historyCapsule:capsuleB,sourceSha256:capsuleB.renderedMedia.sha256});});
  inputs.parentEvidence.push({historyCapsule:capsuleB,performanceReceipt:receiptB});
  const rows=compileFamilyMutations(inputs);
  assert.equal(rows.length,2);
  assert.deepEqual(rows.map(r=>r.aggregateDistance.value).sort(),[0,1]);
  assert.ok(rows.every(r=>r.childGeneration===2));
  assert.notEqual(rows[0].parentArtifact.identityHash,rows[1].parentArtifact.identityHash);
});
