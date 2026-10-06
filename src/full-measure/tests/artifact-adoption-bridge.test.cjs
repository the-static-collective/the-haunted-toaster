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
const {createFrankenComposerService}=require("../src/franken-composer/bridge.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function take(){
  let s=createOnePassSession({materials,fps:24,totalFrames:96});
  s=beginOnePass(s,0);s=pressLane(s,0,100);s=releaseLane(s,0,1100);
  return finishOnePass(s,4000).receipt;
}
function bindingFor(receipt){
  const p=compilePerformanceProgram(receipt);
  const map=compileResidueTerrain(p,{maxSamples:24}).maps[0].map;
  const point=map.points[Math.floor(map.points.length*.6)];
  const proposal=createPossibilityCrossingProposal(map,{frame:point.frame});
  return acceptPossibilityCrossing(proposal,{expectedProposalHash:proposal.proposalHash,acceptedBy:"human-ui"});
}
async function executeChain(service,receipt,binding){
  const prepared=await service.prepareCrossingExecution(receipt,binding,{wakeStrength:1});
  const approved=await service.approveCrossingExecutionScope(
    receipt,binding,prepared.scopeProposal,prepared.scopeProposal.scopeProposalHash,
  );
  const executed=await service.executeApprovedCrossing(
    receipt,binding,prepared.scopeProposal,approved.approval,{localExecutionAuthorized:true},
  );
  return {prepared,approved,executed};
}

test("bridge materializes exact composite review media after sparse execution",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-021-review-"));
  try{
    const receipt=take(),binding=bindingFor(receipt);
    const service=createFrankenComposerService({rootDir:root});
    const {prepared,approved,executed}=await executeChain(service,receipt,binding);
    const review=await service.prepareCandidateArtifactReview(
      receipt,binding,prepared.scopeProposal,approved.approval,executed,
    );
    assert.equal(review.graph.authority,"review-candidate-only");
    assert.equal(review.reviewReceipt.authority,"review-projection-only");
    assert.equal(review.reviewReceipt.candidateGraphHash,review.graph.candidateGraphHash);
    assert.match(review.reviewReceipt.mediaSha256,/^[a-f0-9]{64}$/);
    await fs.access(review.mediaPath);
    assert.match(review.mediaUrl,/^file:/);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("ADOPT persists exact graph+review-media disposition without freezing source",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-021-adopt-"));
  try{
    const receipt=take(),binding=bindingFor(receipt);
    const service=createFrankenComposerService({rootDir:root});
    const {prepared,approved,executed}=await executeChain(service,receipt,binding);
    const review=await service.prepareCandidateArtifactReview(
      receipt,binding,prepared.scopeProposal,approved.approval,executed,
    );
    const result=await service.decideCandidateArtifact(
      review.graph,review.reviewReceipt,"ADOPT",review.graph.candidateGraphHash,
    );
    assert.equal(result.disposition.decision,"ADOPT");
    assert.equal(result.disposition.reviewMediaSha256,review.reviewReceipt.mediaSha256);
    assert.ok(result.disposition.laws.includes("ADOPTION != FREEZE"));
    assert.equal(result.existing,false);
    const again=await service.decideCandidateArtifact(
      review.graph,review.reviewReceipt,"ADOPT",review.graph.candidateGraphHash,
    );
    assert.equal(again.existing,true);
    assert.equal(again.disposition.dispositionHash,result.disposition.dispositionHash);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("REJECT persists review evidence with a distinct disposition",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-021-reject-"));
  try{
    const receipt=take(),binding=bindingFor(receipt);
    const service=createFrankenComposerService({rootDir:root});
    const {prepared,approved,executed}=await executeChain(service,receipt,binding);
    const review=await service.prepareCandidateArtifactReview(
      receipt,binding,prepared.scopeProposal,approved.approval,executed,
    );
    const result=await service.decideCandidateArtifact(
      review.graph,review.reviewReceipt,"REJECT",review.graph.candidateGraphHash,
    );
    assert.equal(result.disposition.decision,"REJECT");
    assert.ok(result.disposition.laws.includes("REJECTION PRESERVES EVIDENCE"));
    await fs.access(result.path);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("tampered sparse frame bytes refuse candidate review before MP4 encoding",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-021-tamper-"));
  try{
    const receipt=take(),binding=bindingFor(receipt);
    const service=createFrankenComposerService({rootDir:root});
    const {prepared,approved,executed}=await executeChain(service,receipt,binding);
    const derivedFrame=executed.receipts.flatMap(r=>r.frames).find(Boolean);
    const output=executed.outputs.find(o=>o.receiptHash===executed.receipts[0].receiptHash);
    const framePath=path.join(output.directory,derivedFrame.filename);
    await fs.writeFile(framePath,Buffer.from("tampered","utf8"));
    await assert.rejects(
      ()=>service.prepareCandidateArtifactReview(
        receipt,binding,prepared.scopeProposal,approved.approval,executed,
      ),
      /bytes changed|frame bytes/i,
    );
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
