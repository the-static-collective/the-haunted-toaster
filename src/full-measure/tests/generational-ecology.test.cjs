"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  beginOnePass,
  createOnePassSession,
  finishOnePass,
  pressLane,
  releaseLane,
}=require("../src/renderer/one-pass.js");
const {
  GENERATIONAL_ECOLOGY_SCHEMA,
  compileGenerationalEcology,
  validateGenerationalEcology,
}=require("../src/nextgen/generational-ecology.cjs");

function fossil(seed="f"){
  return {
    schema:"static-collective/law-fossil-ref/v0",
    authority:"provenance-only",
    lawFossilHash:seed.repeat(64),
    weirdnessCompilationHash:"a".repeat(64),
    sourceProgramHash:"b".repeat(64),
    compiledProgramHash:"c".repeat(64),
    axes:[{axisId:"gravity-slip",amount:.4}],
    laws:["LAW FOSSIL REF != ACTIVE LAW","ANCESTRY != REACTIVATION"],
  };
}
function historyRef({
  capsule="1",
  generation=2,
  media="2",
  parents=[],
  withFossil=false,
}={}){
  return {
    authority:"provenance-only",
    capsuleHash:capsule.repeat(64),
    generation,
    renderedMediaSha256:media.repeat(64),
    parentCapsuleHashes:parents.map(x=>x.repeat(64)),
    ...(withFossil?{lawFossilRef:fossil("f")}:{})
  };
}
function materials(refs={}){
  return Array.from({length:6},(_,index)=>({
    slot:index+1,
    roleId:`lane-${index+1}`,
    materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
    sourceDurationFrames:120,
    ...(refs[index]?{historyRef:refs[index]}:{}),
  }));
}
function take({refs={},gestures=[[0,100,900]],totalFrames=96}={}){
  let s=createOnePassSession({materials:materials(refs),fps:24,totalFrames});
  s=beginOnePass(s,0);
  for(const [lane,down,up] of gestures){
    s=pressLane(s,lane,down);
    s=releaseLane(s,lane,up);
  }
  return finishOnePass(s,4000).receipt;
}

test("history-free performed world is a generation-one root observation",()=>{
  const ecology=compileGenerationalEcology({performanceReceipts:[take()]});
  assert.equal(ecology.schema,GENERATIONAL_ECOLOGY_SCHEMA);
  assert.equal(ecology.authority,"observational-only");
  assert.equal(ecology.performances.length,1);
  assert.equal(ecology.performances[0].generation,1);
  assert.equal(ecology.performances[0].directParentCount,0);
  assert.equal(ecology.historyNodes.length,0);
  assert.equal(ecology.edges.length,0);
  assert.ok(ecology.laws.includes("GENEALOGY != DESTINY"));
  validateGenerationalEcology(ecology);
});

test("only history actually used by placements becomes performed parentage",()=>{
  const used=historyRef({capsule:"1",generation:3,media:"2"});
  const unused=historyRef({capsule:"3",generation:9,media:"4"});
  const receipt=take({refs:{0:used,1:unused},gestures:[[0,100,1000]]});
  const ecology=compileGenerationalEcology({performanceReceipts:[receipt]});
  assert.equal(ecology.performances[0].generation,4);
  assert.equal(ecology.performances[0].directParentCount,1);
  assert.equal(ecology.historyNodes.length,1);
  assert.equal(ecology.historyNodes[0].capsuleHash,used.capsuleHash);
  assert.equal(ecology.historyNodes.some(node=>node.capsuleHash===unused.capsuleHash),false);
  assert.equal(ecology.edges[0].kind,"performed-from-history");
  assert.deepEqual(ecology.edges[0].materialIds,[materials({0:used})[0].materialId]);
  assert.equal(ecology.edges[0].placementCount,1);
});

test("same historical parent across multiple performed lanes deduplicates without losing placement evidence",()=>{
  const ref=historyRef({capsule:"5",generation:4,media:"6"});
  const receipt=take({refs:{0:ref,1:ref},gestures:[[0,100,900],[1,1000,1700]]});
  const ecology=compileGenerationalEcology({performanceReceipts:[receipt]});
  assert.equal(ecology.historyNodes.length,1);
  assert.equal(ecology.edges.length,1);
  assert.equal(ecology.edges[0].placementCount,2);
  assert.equal(ecology.edges[0].materialIds.length,2);
  assert.deepEqual(ecology.edges[0].sceneIds,["ARRIVE"]);
  assert.ok(ecology.edges[0].usedFrameCount>0);
});

test("generation is one above the highest explicit direct-parent generation",()=>{
  const older=historyRef({capsule:"7",generation:2,media:"8"});
  const newer=historyRef({capsule:"9",generation:5,media:"a"});
  const receipt=take({refs:{0:older,1:newer},gestures:[[0,100,900],[1,1000,1700]]});
  const ecology=compileGenerationalEcology({performanceReceipts:[receipt]});
  assert.equal(ecology.performances[0].generation,6);
  assert.deepEqual(ecology.performances[0].parentGenerations,[2,5]);
  assert.equal(Object.prototype.hasOwnProperty.call(ecology.performances[0],"preferredParent"),false);
});

test("declared parent capsule hashes become reference edges without invented generations",()=>{
  const ref=historyRef({capsule:"b",generation:4,media:"c",parents:["d","e"]});
  const ecology=compileGenerationalEcology({
    performanceReceipts:[take({refs:{0:ref},gestures:[[0,100,900]]})],
  });
  const stubs=ecology.historyNodes.filter(node=>node.kind==="history-parent-reference");
  assert.equal(stubs.length,2);
  assert.ok(stubs.every(node=>node.generation===null));
  assert.equal(ecology.edges.filter(edge=>edge.kind==="declared-history-parent").length,2);
});

test("law fossil stays provenance annotation and never becomes active law",()=>{
  const ref=historyRef({capsule:"f",generation:3,media:"1",withFossil:true});
  const ecology=compileGenerationalEcology({
    performanceReceipts:[take({refs:{0:ref},gestures:[[0,100,900]]})],
  });
  assert.equal(ecology.lawFossils.length,1);
  assert.equal(ecology.lawFossils[0].lawFossilHash,ref.lawFossilRef.lawFossilHash);
  assert.equal(ecology.lawFossils[0].authority,"provenance-only");
  assert.equal(ecology.activeLawAuthority,"none");
  assert.ok(ecology.laws.includes("LAW FOSSIL != ACTIVE LAW"));
});

test("shared explicit parent across performances yields deterministic sibling and reuse observations",()=>{
  const ref=historyRef({capsule:"2",generation:7,media:"3"});
  const a=take({refs:{0:ref},gestures:[[0,100,900]]});
  const b=take({refs:{0:ref},gestures:[[0,300,1200]]});
  const ecology=compileGenerationalEcology({performanceReceipts:[a,b]});
  assert.equal(ecology.performances.length,2);
  assert.equal(ecology.reuseObservations.length,1);
  assert.equal(ecology.reuseObservations[0].childCount,2);
  assert.equal(ecology.siblingGroups.length,1);
  assert.equal(ecology.siblingGroups[0].performanceHashes.length,2);
  assert.equal(ecology.siblingGroups[0].relation,"shared-explicit-parent-only");
});

test("adoption evidence bridges to history only by exact media hash",()=>{
  const ref=historyRef({capsule:"4",generation:2,media:"5"});
  const receipt=take({refs:{0:ref},gestures:[[0,100,900]]});
  const admission={
    schema:"static-collective/adopted-artifact-material-admission/v0",
    authority:"material-only",
    sourceImportProposalHash:"6".repeat(64),
    sourceDispositionHash:"7".repeat(64),
    candidateGraphHash:"8".repeat(64),
    sourceReviewMediaReceiptHash:"9".repeat(64),
    mediaSha256:"5".repeat(64),
    mediaByteLength:1234,
    admittedBy:"human-ui",
    material:{
      materialId:"adopted-artifact:"+"8".repeat(20),
      kind:"video",
      sourceIdentity:"adopted-artifact:"+"8".repeat(64)+":review:"+"5".repeat(64),
      digest:"5".repeat(64),
      rightsBasis:"locally-produced-human-adopted-artifact",
      admissionBasis:"explicit-adopted-artifact-material-admission",
      derivation:{
        schema:"static-collective/adopted-artifact-material-derivation/v0",
        authority:"provenance-only",
        importProposalHash:"6".repeat(64),
        sourceDispositionHash:"7".repeat(64),
        candidateGraphHash:"8".repeat(64),
        frameGraphHash:"a".repeat(64),
        sourceProgramHash:"b".repeat(64),
        derivedProgramHash:"c".repeat(64),
        sourceReviewMediaReceiptHash:"9".repeat(64),
        sourceDurationFrames:48,
        fps:24,
        laws:["DERIVATION != PLACEMENT","HISTORY != EDIT AUTHORITY"],
      },
    },
    laws:[
      "ADOPTION != IMPORT","IMPORT PROPOSAL != MATERIAL ADMISSION","ADMISSION != PLACEMENT",
      "MATERIAL != PLACEMENT","ADOPTED HISTORY != PLACEMENT AUTHORITY","ADMISSION != FREEZE",
    ],
  };
  const {hashCanonical,canonicalize}=require("../src/generation/canonical.cjs");
  admission.admissionHash=hashCanonical(canonicalize(admission),"HauntedToaster-AdoptedArtifactMaterialAdmission-v0");

  const ecology=compileGenerationalEcology({
    performanceReceipts:[receipt],
    artifactAdmissions:[admission],
  });
  assert.equal(ecology.adoptionEvidence.length,1);
  assert.equal(ecology.adoptionEvidence[0].matchedHistoryCapsuleHash,ref.capsuleHash);
  assert.equal(ecology.adoptionEvidence[0].matchBasis,"exact-media-sha256");
  assert.ok(ecology.laws.includes("SAME BYTES != SAME AUTHORITY"));
});

test("different media hash leaves adoption evidence explicitly unresolved rather than guessing kinship",()=>{
  const ref=historyRef({capsule:"6",generation:2,media:"7"});
  const receipt=take({refs:{0:ref},gestures:[[0,100,900]]});
  const adoption={
    schema:"static-collective/adopted-artifact-material-admission/v0",
    authority:"material-only",
    sourceImportProposalHash:"1".repeat(64),
    sourceDispositionHash:"2".repeat(64),
    candidateGraphHash:"3".repeat(64),
    sourceReviewMediaReceiptHash:"4".repeat(64),
    mediaSha256:"8".repeat(64),
    mediaByteLength:99,
    admittedBy:"human-ui",
    material:{
      materialId:"adopted-artifact:"+"3".repeat(20),kind:"video",
      sourceIdentity:"adopted-artifact:"+"3".repeat(64)+":review:"+"8".repeat(64),
      digest:"8".repeat(64),
      rightsBasis:"locally-produced-human-adopted-artifact",
      admissionBasis:"explicit-adopted-artifact-material-admission",
      derivation:{
        schema:"static-collective/adopted-artifact-material-derivation/v0",authority:"provenance-only",
        importProposalHash:"1".repeat(64),sourceDispositionHash:"2".repeat(64),
        candidateGraphHash:"3".repeat(64),frameGraphHash:"5".repeat(64),
        sourceProgramHash:"6".repeat(64),derivedProgramHash:"9".repeat(64),
        sourceReviewMediaReceiptHash:"4".repeat(64),sourceDurationFrames:48,fps:24,
        laws:["DERIVATION != PLACEMENT","HISTORY != EDIT AUTHORITY"],
      },
    },
    laws:[
      "ADOPTION != IMPORT","IMPORT PROPOSAL != MATERIAL ADMISSION","ADMISSION != PLACEMENT",
      "MATERIAL != PLACEMENT","ADOPTED HISTORY != PLACEMENT AUTHORITY","ADMISSION != FREEZE",
    ],
  };
  const {hashCanonical,canonicalize}=require("../src/generation/canonical.cjs");
  adoption.admissionHash=hashCanonical(canonicalize(adoption),"HauntedToaster-AdoptedArtifactMaterialAdmission-v0");

  const ecology=compileGenerationalEcology({
    performanceReceipts:[receipt],
    artifactAdmissions:[adoption],
  });
  assert.equal(ecology.adoptionEvidence[0].matchedHistoryCapsuleHash,null);
  assert.equal(ecology.adoptionEvidence[0].matchBasis,"unresolved");
});
