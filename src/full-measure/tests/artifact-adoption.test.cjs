"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {
  beginOnePass,createOnePassSession,finishOnePass,pressLane,releaseLane,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {compileResidueTerrain}=require("../src/nextgen/playable-terrain.cjs");
const {createPossibilityCrossingProposal,acceptPossibilityCrossing}=require("../src/nextgen/possibility-interaction.cjs");
const {
  approveExecutionScope,createCrossingExecutionProgram,deriveAffectedRegionProposal,
  executeApprovedSparseScope,prepareSparseExecutionParcel,
}=require("../src/nextgen/crossing-execution-custody.cjs");
const {renderProgramWhole}=require("../src/nextgen/performance-program-render.cjs");
const {
  composeCandidateDerivedFrameGraph,
  decideCandidateArtifact,
  validateArtifactDisposition,
  validateCandidateDerivedFrameGraph,
}=require("../src/nextgen/artifact-adoption.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function sourceProgram(){
  let s=createOnePassSession({materials,fps:24,totalFrames:96});
  s=beginOnePass(s,0);s=pressLane(s,0,100);s=releaseLane(s,0,1100);
  return compilePerformanceProgram(finishOnePass(s,4000).receipt,{regionFrames:24,decayPerFrame:.01});
}
function accepted(source){
  const map=compileResidueTerrain(source,{maxSamples:24}).maps[0].map;
  const point=map.points[Math.floor(map.points.length*.6)];
  const proposal=createPossibilityCrossingProposal(map,{frame:point.frame});
  return acceptPossibilityCrossing(proposal,{expectedProposalHash:proposal.proposalHash,acceptedBy:"human-ui"});
}
async function specimen(root){
  const source=sourceProgram();
  const binding=accepted(source);
  const derived=createCrossingExecutionProgram(source,binding,{wakeStrength:1});
  const scope=deriveAffectedRegionProposal(source,derived,binding);
  const approval=approveExecutionScope(scope,{expectedScopeProposalHash:scope.scopeProposalHash,approvedBy:"human-ui"});
  const parcel=prepareSparseExecutionParcel(derived,scope,approval,{
    assignmentOwnerParticular:"owner:021",workerParticular:"worker:021",
    issuanceCut:"cut:open",expiryCut:"cut:close",
  });
  const sparse=await executeApprovedSparseScope(derived,scope,approval,parcel,{
    rootDir:path.join(root,"derived"),localExecutionAuthorized:true,
  });
  const sourceWhole=await renderProgramWhole(source,{rootDir:path.join(root,"source")});
  return {source,binding,derived,scope,approval,sparse,sourceWhole};
}

test("candidate graph composes source world outside scope and derived world inside scope",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-021-graph-"));
  try{
    const x=await specimen(root);
    const graph=composeCandidateDerivedFrameGraph(
      x.source,x.derived,x.scope,x.approval,x.sourceWhole.receipt,x.sparse.receipts,
    );
    validateCandidateDerivedFrameGraph(graph);
    assert.equal(graph.authority,"review-candidate-only");
    assert.equal(graph.frameCount,x.source.totalFrames);
    assert.equal(graph.derivedRegionIds.length,x.scope.affectedRegionIds.length);
    assert.equal(graph.frames.filter(f=>f.provenance==="derived-world").length,x.scope.changedFrameCount);
    assert.equal(graph.frames.filter(f=>f.provenance==="source-world").length,x.source.totalFrames-x.scope.changedFrameCount);
    assert.match(graph.candidateGraphHash,/^[a-f0-9]{64}$/);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("candidate graph matches a clean whole render of the derived program frame-for-frame",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-021-clean-"));
  try{
    const x=await specimen(root);
    const graph=composeCandidateDerivedFrameGraph(
      x.source,x.derived,x.scope,x.approval,x.sourceWhole.receipt,x.sparse.receipts,
    );
    const clean=await renderProgramWhole(x.derived,{rootDir:path.join(root,"clean")});
    assert.deepEqual(graph.frames.map(f=>f.sha256),clean.receipt.frames.map(f=>f.sha256));
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("missing or outside derived receipt refuses candidate assembly",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-021-refuse-"));
  try{
    const x=await specimen(root);
    assert.throws(()=>composeCandidateDerivedFrameGraph(
      x.source,x.derived,x.scope,x.approval,x.sourceWhole.receipt,x.sparse.receipts.slice(1),
    ),/coverage|affected|missing/i);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("ADOPT and REJECT are exact human dispositions, neither is FREEZE",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-021-decide-"));
  try{
    const x=await specimen(root);
    const graph=composeCandidateDerivedFrameGraph(
      x.source,x.derived,x.scope,x.approval,x.sourceWhole.receipt,x.sparse.receipts,
    );
    const adopt=decideCandidateArtifact(graph,{
      decision:"ADOPT",expectedCandidateGraphHash:graph.candidateGraphHash,
      reviewMediaSha256:"a".repeat(64),decidedBy:"human-ui",
    });
    const reject=decideCandidateArtifact(graph,{
      decision:"REJECT",expectedCandidateGraphHash:graph.candidateGraphHash,
      reviewMediaSha256:"a".repeat(64),decidedBy:"human-ui",
    });
    assert.equal(adopt.decision,"ADOPT");
    assert.equal(reject.decision,"REJECT");
    assert.notEqual(adopt.dispositionHash,reject.dispositionHash);
    assert.ok(adopt.laws.includes("ADOPTION != FREEZE"));
    assert.ok(reject.laws.includes("REJECTION PRESERVES EVIDENCE"));
    validateArtifactDisposition(adopt);
    validateArtifactDisposition(reject);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("stale candidate graph identity refuses disposition",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-021-stale-"));
  try{
    const x=await specimen(root);
    const graph=composeCandidateDerivedFrameGraph(
      x.source,x.derived,x.scope,x.approval,x.sourceWhole.receipt,x.sparse.receipts,
    );
    assert.throws(()=>decideCandidateArtifact(graph,{
      decision:"ADOPT",expectedCandidateGraphHash:"0".repeat(64),
      reviewMediaSha256:"a".repeat(64),decidedBy:"human-ui",
    }),/stale|graph/i);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
