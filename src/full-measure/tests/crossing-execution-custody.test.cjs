"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const os=require("node:os");
const path=require("node:path");
const fs=require("node:fs/promises");
const {
  beginOnePass,createOnePassSession,finishOnePass,pressLane,releaseLane,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {compileResidueTerrain}=require("../src/nextgen/playable-terrain.cjs");
const {
  acceptPossibilityCrossing,
  createPossibilityCrossingProposal,
}=require("../src/nextgen/possibility-interaction.cjs");
const {
  approveExecutionScope,
  createCrossingExecutionProgram,
  deriveAffectedRegionProposal,
  executeApprovedSparseScope,
  prepareSparseExecutionParcel,
  validateAffectedRegionProposal,
  validateExecutionScopeApproval,
}=require("../src/nextgen/crossing-execution-custody.cjs");
const {renderProgramRegion}=require("../src/nextgen/performance-program-render.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function sourceProgram(){
  let session=createOnePassSession({materials,fps:24,totalFrames:192});
  session=beginOnePass(session,0);
  session=pressLane(session,0,250);
  session=releaseLane(session,0,1200);
  return compilePerformanceProgram(finishOnePass(session,8000).receipt,{
    regionFrames:24,
    decayPerFrame:.01,
  });
}
function accepted(){
  const program=sourceProgram();
  const terrain=compileResidueTerrain(program,{maxSamples:32,baseEnergy:.8});
  const map=terrain.maps[0].map;
  const frame=map.points[Math.floor(map.points.length*.65)].frame;
  const proposal=createPossibilityCrossingProposal(map,{frame});
  const binding=acceptPossibilityCrossing(proposal,{
    expectedProposalHash:proposal.proposalHash,
    acceptedBy:"human-ui",
  });
  return {program,terrain,map,proposal,binding};
}

test("accepted scar-wake becomes a distinct derived program without rewriting pre-acceptance history",()=>{
  const {program,binding}=accepted();
  const derived=createCrossingExecutionProgram(program,binding,{wakeStrength:1});
  assert.notEqual(derived.programHash,program.programHash);
  assert.equal(derived.crossingExecution.kind,"scar-wake");
  assert.equal(derived.crossingExecution.activationFrame,binding.frame);
  assert.equal(derived.crossingExecution.sourceBindingHash,binding.bindingHash);
  assert.equal(derived.crossingExecution.targetResidueId,binding.candidateSpec.targetResidueId);
  assert.equal(derived.crossingExecution.authority,"accepted-relation-execution-description-only");
  assert.ok(derived.laws.includes("EXECUTION DESCRIPTION != COMPUTE AUTHORITY"));
});

test("affected-region proposal contains only regions intersecting actual pixel-semantic change",()=>{
  const {program,binding}=accepted();
  const derived=createCrossingExecutionProgram(program,binding,{wakeStrength:1});
  const proposal=deriveAffectedRegionProposal(program,derived,binding);
  validateAffectedRegionProposal(program,derived,binding,proposal);
  assert.equal(proposal.authority,"scope-proposal-only");
  assert.ok(proposal.affectedRegionIds.length>=1);
  assert.ok(proposal.changedFrameCount>=1);
  for(const regionId of proposal.affectedRegionIds){
    assert.ok(derived.renderRegionPlan.regions.some(region=>region.regionId===regionId));
  }
  assert.equal(proposal.affectedRegionIds.length,proposal.affectedRegions.length);
  assert.equal(JSON.stringify(proposal).includes("executionAuthorized"),false);
});

test("scope approval requires exact proposal identity and still grants no compute authority",()=>{
  const {program,binding}=accepted();
  const derived=createCrossingExecutionProgram(program,binding,{wakeStrength:1});
  const scope=deriveAffectedRegionProposal(program,derived,binding);
  const approval=approveExecutionScope(scope,{
    expectedScopeProposalHash:scope.scopeProposalHash,
    approvedBy:"human-ui",
  });
  validateExecutionScopeApproval(scope,approval);
  assert.equal(approval.authority,"human-approved-scope-only");
  assert.deepEqual(approval.approvedRegionIds,scope.affectedRegionIds);
  assert.equal(approval.computeCapacityAuthority,"none");
  assert.ok(approval.laws.includes("SCOPE APPROVAL != EXECUTION AUTHORIZATION"));
  assert.throws(()=>approveExecutionScope(scope,{
    expectedScopeProposalHash:"0".repeat(64),
    approvedBy:"human-ui",
  }),/stale|scope/i);
});

test("approved scope becomes a GHoT-067-shaped sparse parcel but still cannot execute itself",()=>{
  const {program,binding}=accepted();
  const derived=createCrossingExecutionProgram(program,binding,{wakeStrength:1});
  const scope=deriveAffectedRegionProposal(program,derived,binding);
  const approval=approveExecutionScope(scope,{
    expectedScopeProposalHash:scope.scopeProposalHash,
    approvedBy:"human-ui",
  });
  const parcel=prepareSparseExecutionParcel(derived,scope,approval,{
    assignmentOwnerParticular:"toaster-owner:020",
    workerParticular:"worker:local",
    issuanceCut:"cut:020:open",
    expiryCut:"cut:020:expiry",
  });
  assert.equal(parcel.compatibility,"shape-compatible-with-ghot-067-not-a-ghot-signature");
  assert.deepEqual(parcel.assignedRegionIds,scope.affectedRegionIds);
  assert.equal(parcel.computeCapacityAuthority,"none");
  assert.equal(parcel.ownershipTransfer,false);
  assert.equal(parcel.sourceScopeApprovalHash,approval.scopeApprovalHash);
});

test("local sparse execution requires a separate explicit execution authorization",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-020-scope-"));
  try{
    const {program,binding}=accepted();
    const derived=createCrossingExecutionProgram(program,binding,{wakeStrength:1});
    const scope=deriveAffectedRegionProposal(program,derived,binding);
    const approval=approveExecutionScope(scope,{
      expectedScopeProposalHash:scope.scopeProposalHash,
      approvedBy:"human-ui",
    });
    const parcel=prepareSparseExecutionParcel(derived,scope,approval,{
      assignmentOwnerParticular:"toaster-owner:020",
      workerParticular:"worker:local",
      issuanceCut:"cut:020:open",
      expiryCut:"cut:020:expiry",
    });
    await assert.rejects(
      ()=>executeApprovedSparseScope(derived,scope,approval,parcel,{
        rootDir:path.join(root,"unauthorized"),
      }),
      /execution authorization|compute/i,
    );
    const result=await executeApprovedSparseScope(derived,scope,approval,parcel,{
      rootDir:path.join(root,"authorized"),
      localExecutionAuthorized:true,
    });
    assert.deepEqual(result.result.consumedRegionIds,scope.affectedRegionIds);
    assert.deepEqual(result.result.returnedRegionIds,[]);
    assert.equal(result.receipts.length,scope.affectedRegionIds.length);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("accepted scar-wake actually changes rendered bytes in an affected region",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-020-pixels-"));
  try{
    const {program,binding}=accepted();
    const derived=createCrossingExecutionProgram(program,binding,{wakeStrength:1});
    const scope=deriveAffectedRegionProposal(program,derived,binding);
    const regionId=scope.affectedRegionIds[0];
    const [before,after]=await Promise.all([
      renderProgramRegion(program,regionId,{
        rootDir:path.join(root,"before"),workerId:"before",attemptId:"before",
      }),
      renderProgramRegion(derived,regionId,{
        rootDir:path.join(root,"after"),workerId:"after",attemptId:"after",
      }),
    ]);
    assert.notEqual(before.receipt.regionPixelHash,after.receipt.regionPixelHash);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("execution scope refuses a binding from another source program",()=>{
  const {program,binding}=accepted();
  const another={...binding,sourceProgramHash:"0".repeat(64)};
  assert.throws(()=>createCrossingExecutionProgram(program,another,{wakeStrength:1}),/program|lineage/i);
});
