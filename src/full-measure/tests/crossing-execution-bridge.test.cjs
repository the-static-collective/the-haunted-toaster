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
const {
  acceptPossibilityCrossing,
  createPossibilityCrossingProposal,
}=require("../src/nextgen/possibility-interaction.cjs");
const {createFrankenComposerService}=require("../src/franken-composer/bridge.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function receipt(){
  let session=createOnePassSession({materials,fps:24,totalFrames:192});
  session=beginOnePass(session,0);
  session=pressLane(session,0,250);
  session=releaseLane(session,0,1200);
  return finishOnePass(session,8000).receipt;
}
function bindingFor(receiptValue){
  const p=compilePerformanceProgram(receiptValue);
  const terrain=compileResidueTerrain(p,{maxSamples:32});
  const map=terrain.maps[0].map;
  const point=map.points[Math.floor(map.points.length*.65)];
  const proposal=createPossibilityCrossingProposal(map,{frame:point.frame});
  return acceptPossibilityCrossing(proposal,{
    expectedProposalHash:proposal.proposalHash,
    acceptedBy:"human-ui",
  });
}

test("bridge prepares exact crossing execution scope from accepted binding",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-020-prepare-"));
  try{
    const take=receipt();
    const binding=bindingFor(take);
    const service=createFrankenComposerService({rootDir:root});
    const prepared=await service.prepareCrossingExecution(take,binding,{wakeStrength:1});
    assert.notEqual(prepared.sourceProgramHash,prepared.derivedProgram.programHash);
    assert.equal(prepared.scopeProposal.sourceBindingHash,binding.bindingHash);
    assert.equal(prepared.scopeProposal.derivedProgramHash,prepared.derivedProgram.programHash);
    assert.ok(prepared.scopeProposal.affectedRegionIds.length>0);
    assert.equal(prepared.scopeProposal.computeCapacityAuthority,"none");
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("bridge persists exact scope approval create-only",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-020-approve-"));
  try{
    const take=receipt();
    const binding=bindingFor(take);
    const service=createFrankenComposerService({rootDir:root});
    const prepared=await service.prepareCrossingExecution(take,binding,{wakeStrength:1});
    const first=await service.approveCrossingExecutionScope(
      take,binding,prepared.scopeProposal,prepared.scopeProposal.scopeProposalHash,
    );
    assert.equal(first.approval.authority,"human-approved-scope-only");
    assert.equal(first.existing,false);
    const second=await service.approveCrossingExecutionScope(
      take,binding,prepared.scopeProposal,prepared.scopeProposal.scopeProposalHash,
    );
    assert.equal(second.existing,true);
    assert.equal(second.approval.scopeApprovalHash,first.approval.scopeApprovalHash);
    assert.equal(JSON.parse(await fs.readFile(first.path,"utf8")).scopeApprovalHash,first.approval.scopeApprovalHash);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("bridge refuses execution before separate local authorization",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-020-noexec-"));
  try{
    const take=receipt();
    const binding=bindingFor(take);
    const service=createFrankenComposerService({rootDir:root});
    const prepared=await service.prepareCrossingExecution(take,binding,{wakeStrength:1});
    const approved=await service.approveCrossingExecutionScope(
      take,binding,prepared.scopeProposal,prepared.scopeProposal.scopeProposalHash,
    );
    await assert.rejects(
      ()=>service.executeApprovedCrossing(
        take,binding,prepared.scopeProposal,approved.approval,{localExecutionAuthorized:false},
      ),
      /execution authorization|compute/i,
    );
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("explicit local authorization executes only approved sparse regions and persists custody artifacts",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-020-exec-"));
  try{
    const take=receipt();
    const binding=bindingFor(take);
    const service=createFrankenComposerService({rootDir:root});
    const prepared=await service.prepareCrossingExecution(take,binding,{wakeStrength:1});
    const approved=await service.approveCrossingExecutionScope(
      take,binding,prepared.scopeProposal,prepared.scopeProposal.scopeProposalHash,
    );
    const executed=await service.executeApprovedCrossing(
      take,binding,prepared.scopeProposal,approved.approval,{localExecutionAuthorized:true},
    );
    assert.equal(executed.receiptCount,prepared.scopeProposal.affectedRegionIds.length);
    assert.deepEqual(executed.result.consumedRegionIds,prepared.scopeProposal.affectedRegionIds);
    assert.deepEqual(executed.result.returnedRegionIds,[]);
    assert.equal(executed.parcel.computeCapacityAuthority,"none");
    assert.equal(executed.parcel.compatibility,"shape-compatible-with-ghot-067-not-a-ghot-signature");
    for(const name of [
      "derivedProgramPath","scopeProposalPath","scopeApprovalPath","sparseParcelPath","sparseResultPath",
    ]){
      assert.ok(executed[name]);
      await fs.access(executed[name]);
    }
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});
