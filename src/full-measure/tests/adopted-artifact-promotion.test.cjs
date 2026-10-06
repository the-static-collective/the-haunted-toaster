"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {canonicalize,hashCanonical}=require("../src/generation/canonical.cjs");
const {decideCandidateArtifact}=require("../src/nextgen/artifact-adoption.cjs");
const {
  ADOPTED_IMPORT_PROPOSAL_SCHEMA,
  ADOPTED_MATERIAL_ADMISSION_SCHEMA,
  ADOPTED_MATERIAL_DERIVATION_SCHEMA,
  admitAdoptedArtifactImport,
  createAdoptedArtifactImportProposal,
  validateAdoptedArtifactImportProposal,
  validateAdoptedMaterialAdmission,
}=require("../src/nextgen/adopted-artifact-promotion.cjs");

function graph(){
  const body=canonicalize({
    schema:"static-collective/candidate-derived-frame-graph/v0",
    authority:"review-candidate-only",
    renderer:"ffmpeg-performance-program-witness-raster/v0",
    sourceProgramHash:"a".repeat(64),
    derivedProgramHash:"b".repeat(64),
    sourceWholeReceiptHash:"c".repeat(64),
    sourceScopeProposalHash:"d".repeat(64),
    sourceScopeApprovalHash:"e".repeat(64),
    fps:24,
    frameCount:2,
    changedFrameCount:1,
    derivedRegionIds:["region:0"],
    frames:[
      {frame:0,sha256:"1".repeat(64),sizeBytes:100,provenance:"source-world",sourceReceiptHash:"2".repeat(64)},
      {frame:1,sha256:"3".repeat(64),sizeBytes:100,provenance:"derived-world",sourceReceiptHash:"4".repeat(64),sourceRegionId:"region:0"},
    ],
    frameGraphHash:"5".repeat(64),
    laws:["CANDIDATE GRAPH != ADOPTION"],
  });
  return canonicalize({
    ...body,
    candidateGraphHash:hashCanonical(body,"HauntedToaster-CandidateDerivedFrameGraph-v0"),
  });
}
function review(){
  const g=graph();
  const body=canonicalize({
    schema:"static-collective/candidate-artifact-review-media/v0",
    authority:"review-projection-only",
    candidateGraphHash:g.candidateGraphHash,
    frameGraphHash:g.frameGraphHash,
    frameCount:g.frameCount,
    fps:g.fps,
    mediaSha256:"6".repeat(64),
    mediaByteLength:12345,
    laws:["REVIEW MEDIA != ADOPTION"],
  });
  return canonicalize({
    ...body,
    reviewMediaReceiptHash:hashCanonical(body,"HauntedToaster-CandidateArtifactReviewMedia-v0"),
  });
}
function disposition(decision="ADOPT"){
  const g=graph(),r=review();
  return decideCandidateArtifact(g,{
    decision,
    expectedCandidateGraphHash:g.candidateGraphHash,
    reviewMediaSha256:r.mediaSha256,
    decidedBy:"human-ui",
  });
}

test("only an exact ADOPT disposition can propose material import",()=>{
  const g=graph(),r=review(),d=disposition("ADOPT");
  const proposal=createAdoptedArtifactImportProposal({
    candidateGraph:g,
    reviewMediaReceipt:r,
    disposition:d,
  });
  assert.equal(proposal.schema,ADOPTED_IMPORT_PROPOSAL_SCHEMA);
  assert.equal(proposal.authority,"proposal-only");
  assert.equal(proposal.sourceDispositionHash,d.dispositionHash);
  assert.equal(proposal.candidateGraphHash,g.candidateGraphHash);
  assert.equal(proposal.mediaSha256,r.mediaSha256);
  assert.equal(proposal.frameCount,2);
  assert.equal(proposal.fps,24);
  assert.match(proposal.importProposalHash,/^[a-f0-9]{64}$/);
  validateAdoptedArtifactImportProposal(proposal);

  assert.throws(()=>createAdoptedArtifactImportProposal({
    candidateGraph:g,
    reviewMediaReceipt:r,
    disposition:disposition("REJECT"),
  }),/ADOPT/i);
});

test("proposal refuses mismatched reviewed media or disposition lineage",()=>{
  const g=graph(),r=review(),d=disposition("ADOPT");
  assert.throws(()=>createAdoptedArtifactImportProposal({
    candidateGraph:g,
    reviewMediaReceipt:{...r,candidateGraphHash:"0".repeat(64)},
    disposition:d,
  }),/hash|candidate/i);
  assert.throws(()=>createAdoptedArtifactImportProposal({
    candidateGraph:g,
    reviewMediaReceipt:r,
    disposition:{...d,reviewMediaSha256:"0".repeat(64)},
  }),/hash|review/i);
});

test("explicit admission converts import proposal into ordinary material-only video",()=>{
  const proposal=createAdoptedArtifactImportProposal({
    candidateGraph:graph(),
    reviewMediaReceipt:review(),
    disposition:disposition("ADOPT"),
  });
  const admission=admitAdoptedArtifactImport(proposal,{
    expectedImportProposalHash:proposal.importProposalHash,
    admittedBy:"human-ui",
  });
  assert.equal(admission.schema,ADOPTED_MATERIAL_ADMISSION_SCHEMA);
  assert.equal(admission.authority,"material-only");
  assert.equal(admission.material.kind,"video");
  assert.ok(admission.material.materialId.startsWith("adopted-artifact:"));
  assert.equal(admission.material.digest,proposal.mediaSha256);
  assert.equal(admission.material.derivation.schema,ADOPTED_MATERIAL_DERIVATION_SCHEMA);
  assert.equal(admission.material.derivation.authority,"provenance-only");
  assert.equal(admission.material.derivation.sourceDurationFrames,proposal.frameCount);
  assert.equal(admission.material.derivation.sourceDispositionHash,proposal.sourceDispositionHash);
  assert.equal(admission.material.derivation.candidateGraphHash,proposal.candidateGraphHash);
  assert.equal(Object.prototype.hasOwnProperty.call(admission,"placement"),false);
  assert.ok(admission.laws.includes("ADMISSION != PLACEMENT"));
  assert.match(admission.admissionHash,/^[a-f0-9]{64}$/);
  validateAdoptedMaterialAdmission(admission);
});

test("admission requires the exact reviewed import proposal identity",()=>{
  const proposal=createAdoptedArtifactImportProposal({
    candidateGraph:graph(),
    reviewMediaReceipt:review(),
    disposition:disposition("ADOPT"),
  });
  assert.throws(()=>admitAdoptedArtifactImport(proposal,{
    expectedImportProposalHash:"0".repeat(64),
    admittedBy:"human-ui",
  }),/stale|proposal/i);
});

test("same adopted artifact import is deterministic and provenance-rich",()=>{
  const proposal=createAdoptedArtifactImportProposal({
    candidateGraph:graph(),
    reviewMediaReceipt:review(),
    disposition:disposition("ADOPT"),
  });
  const a=admitAdoptedArtifactImport(proposal,{expectedImportProposalHash:proposal.importProposalHash,admittedBy:"human-ui"});
  const b=admitAdoptedArtifactImport(proposal,{expectedImportProposalHash:proposal.importProposalHash,admittedBy:"human-ui"});
  assert.deepEqual(a,b);
  assert.equal(a.material.sourceIdentity,b.material.sourceIdentity);
  assert.ok(a.laws.includes("ADOPTION != IMPORT"));
  assert.ok(a.laws.includes("ADOPTED HISTORY != PLACEMENT AUTHORITY"));
});
