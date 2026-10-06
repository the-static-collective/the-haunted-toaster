"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validatePerformanceProgram}=require("./performance-program.cjs");
const {validatePossibilityCrossingBinding}=require("./possibility-interaction.cjs");
const {
  CROSSING_EXECUTION_SCHEMA,
  changedFramesForExecution,
  compressFrames,
  validateCrossingExecution,
}=require("./crossing-execution-semantics.cjs");
const {
  renderProgramRegion,
  validatePixelRegionReceipt,
}=require("./performance-program-render.cjs");

const AFFECTED_SCOPE_SCHEMA="static-collective/crossing-affected-region-proposal/v0";
const SCOPE_APPROVAL_SCHEMA="static-collective/crossing-execution-scope-approval/v0";
const SPARSE_PARCEL_SCHEMA="static-collective/ghot-067-approved-crossing-parcel/v0";
const SPARSE_RESULT_SCHEMA="static-collective/ghot-067-approved-crossing-result/v0";
const GHOT_067_PIN=deepFreeze({
  repo:"the-static-collective/GHoT",
  pr:64,
  ref:"exp067",
  sha:"6456828ca6d2ee2cd10db2017cbd9278c1e3c664",
  donorKind:"ghot.lightwalker.sparse-region-work-lease/v0",
});

function req(value,label){
  const text=String(value||"").trim();
  if(!text)throw new TypeError(`${label} is required.`);
  return text;
}
function hash64(value,label){
  const text=req(value,label).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(text))throw new TypeError(`${label} must be 64 lowercase hex characters.`);
  return text;
}
function whole(value,label,min=0,max=1_000_000){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<min||number>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return number;
}
function finite(value,label,min=-Infinity,max=Infinity){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return Math.round(number*1_000_000)/1_000_000;
}
function digestRegions(program,regionIds,domain){
  return hashCanonical(canonicalize({
    programHash:program.programHash,
    regionPlanHash:program.renderRegionPlan.regionPlanHash,
    regionIds,
  }),domain);
}
function regionOrder(program){
  return new Map(program.renderRegionPlan.regions.map((region,index)=>[region.regionId,index]));
}
function orderedRegionIds(program,ids,label){
  if(!Array.isArray(ids))throw new TypeError(`${label} must be an array.`);
  const order=regionOrder(program);
  const unique=[...new Set(ids.map(id=>req(id,label)))];
  if(unique.length!==ids.length)throw new TypeError(`${label} contains duplicate region IDs.`);
  for(const id of unique)if(!order.has(id))throw new TypeError(`${label} contains region outside the derived plan: ${id}.`);
  return unique.sort((a,b)=>order.get(a)-order.get(b));
}
function createCrossingExecutionProgram(program,binding,{wakeStrength=1,decayPerFrame=null}={}){
  const source=validatePerformanceProgram(program);
  const accepted=validatePossibilityCrossingBinding(binding);
  if(accepted.sourceProgramHash!==source.programHash)throw new TypeError("Accepted crossing/program lineage mismatch.");
  if(accepted.kind!=="scar-wake"||accepted.candidateSpec?.kind!=="scar-wake"){
    throw new TypeError("Execution custody v0 currently supports accepted scar-wake crossings only.");
  }
  const targetResidueId=req(accepted.candidateSpec?.targetResidueId,"accepted scar-wake targetResidueId");
  const residue=(source.residueMemory?.residues||[]).find(item=>item.residueId===targetResidueId);
  if(!residue)throw new TypeError("Accepted scar-wake target residue is absent from source program.");
  const wake=finite(wakeStrength,"wakeStrength",0.000001,1);
  const decay=decayPerFrame===null
    ?finite(residue.decay?.perFrame,"source residue decay",0.000001,1)
    :finite(decayPerFrame,"decayPerFrame",0.000001,1);
  const {programHash:sourceProgramHash,...body}=source;
  const crossingExecution=canonicalize({
    schema:CROSSING_EXECUTION_SCHEMA,
    authority:"accepted-relation-execution-description-only",
    kind:"scar-wake",
    sourceBindingHash:accepted.bindingHash,
    sourceProgramHash,
    activationFrame:whole(accepted.frame,"accepted frame",0,source.totalFrames-1),
    targetResidueId,
    wakeStrength:wake,
    decayPerFrame:decay,
    laws:[
      "SCAR WAKE != HISTORY REWRITE",
      "ACCEPTED RELATION != COMPUTE AUTHORITY",
      "EXECUTION DESCRIPTION != COMPUTE AUTHORITY",
      "WAKE ENVELOPE != SOURCE RESIDUE",
    ],
  });
  const derivedBody=canonicalize({
    ...body,
    crossingExecution,
    laws:[...source.laws,
      "ACCEPTED RELATION != COMPUTE AUTHORITY",
      "EXECUTION DESCRIPTION != COMPUTE AUTHORITY",
      "SCAR WAKE != HISTORY REWRITE",
    ],
  });
  const derived=deepFreeze(canonicalize({
    ...derivedBody,
    programHash:hashCanonical(derivedBody,"HauntedToaster-PerformanceProgram-v0"),
  }));
  validatePerformanceProgram(derived);
  validateCrossingExecution(derived);
  return derived;
}
function deriveAffectedRegionProposal(sourceProgram,derivedProgram,binding){
  const source=validatePerformanceProgram(sourceProgram);
  const derived=validatePerformanceProgram(derivedProgram);
  const accepted=validatePossibilityCrossingBinding(binding);
  const execution=validateCrossingExecution(derived);
  if(accepted.sourceProgramHash!==source.programHash)throw new TypeError("Affected scope source binding/program mismatch.");
  if(execution.sourceBindingHash!==accepted.bindingHash||execution.sourceProgramHash!==source.programHash)throw new TypeError("Affected scope derived-program lineage mismatch.");
  if(source.renderRegionPlan.regionPlanHash!==derived.renderRegionPlan.regionPlanHash)throw new TypeError("Affected scope requires stable render-region geometry.");
  const changedFrames=changedFramesForExecution(derived);
  if(!changedFrames.length)throw new TypeError("Accepted crossing has no executable pixel-semantic change.");
  const changedSpans=compressFrames(changedFrames);
  const affectedRegions=derived.renderRegionPlan.regions.filter(region=>
    changedSpans.some(span=>region.startFrame<span.endFrameExclusive&&region.endFrameExclusive>span.startFrame)
  ).map(region=>canonicalize({
    regionId:region.regionId,
    startFrame:region.startFrame,
    endFrameExclusive:region.endFrameExclusive,
    frameCount:region.frameCount,
  }));
  const affectedRegionIds=affectedRegions.map(region=>region.regionId);
  const body=canonicalize({
    schema:AFFECTED_SCOPE_SCHEMA,
    authority:"scope-proposal-only",
    sourceBindingHash:accepted.bindingHash,
    sourceProgramHash:source.programHash,
    derivedProgramHash:derived.programHash,
    regionPlanHash:derived.renderRegionPlan.regionPlanHash,
    crossingKind:execution.kind,
    targetResidueId:execution.targetResidueId,
    activationFrame:execution.activationFrame,
    wakeStrength:execution.wakeStrength,
    decayPerFrame:execution.decayPerFrame,
    changedFrameCount:changedFrames.length,
    changedFrameSpans:changedSpans,
    affectedRegionCount:affectedRegionIds.length,
    affectedRegionIds,
    affectedRegions,
    affectedRegionSetDigest:digestRegions(derived,affectedRegionIds,"HauntedToaster-CrossingAffectedRegions-v0"),
    computeCapacityAuthority:"none",
    renderAuthority:"none",
    laws:[
      "AFFECTED REGION PROPOSAL != SCOPE APPROVAL",
      "AFFECTED REGION != PIXEL OWNERSHIP",
      "SCOPE PROPOSAL != EXECUTION",
      "CHANGED FRAME != REGION AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    scopeProposalHash:hashCanonical(body,"HauntedToaster-CrossingAffectedRegionProposal-v0"),
  }));
}
function validateAffectedRegionProposal(sourceProgram,derivedProgram,binding,proposal){
  const source=validatePerformanceProgram(sourceProgram);
  const derived=validatePerformanceProgram(derivedProgram);
  const accepted=validatePossibilityCrossingBinding(binding);
  if(!proposal||typeof proposal!=="object"||Array.isArray(proposal))throw new TypeError("Affected-region proposal must be an object.");
  if(proposal.schema!==AFFECTED_SCOPE_SCHEMA||proposal.authority!=="scope-proposal-only")throw new TypeError("Unsupported affected-region proposal.");
  if(proposal.sourceBindingHash!==accepted.bindingHash||proposal.sourceProgramHash!==source.programHash||proposal.derivedProgramHash!==derived.programHash){
    throw new TypeError("Affected-region proposal lineage mismatch.");
  }
  if(proposal.regionPlanHash!==derived.renderRegionPlan.regionPlanHash)throw new TypeError("Affected-region proposal region-plan mismatch.");
  const ids=orderedRegionIds(derived,proposal.affectedRegionIds,"affectedRegionIds");
  if(ids.length!==proposal.affectedRegionCount||ids.length!==proposal.affectedRegions?.length)throw new TypeError("Affected-region proposal region count mismatch.");
  if(proposal.affectedRegionSetDigest!==digestRegions(derived,ids,"HauntedToaster-CrossingAffectedRegions-v0"))throw new TypeError("Affected-region proposal digest mismatch.");
  const expected=deriveAffectedRegionProposal(source,derived,accepted);
  if(expected.scopeProposalHash!==proposal.scopeProposalHash)throw new TypeError("Affected-region proposal does not match derived execution semantics.");
  return proposal;
}
function approveExecutionScope(scopeProposal,{expectedScopeProposalHash,approvedBy}={}){
  if(!scopeProposal||typeof scopeProposal!=="object"||scopeProposal.schema!==AFFECTED_SCOPE_SCHEMA)throw new TypeError("Execution scope approval requires an affected-region proposal.");
  const expected=hash64(expectedScopeProposalHash,"expectedScopeProposalHash");
  if(expected!==scopeProposal.scopeProposalHash)throw new TypeError("Stale execution scope proposal identity; refusing scope approval.");
  const approvedRegionIds=[...(scopeProposal.affectedRegionIds||[])];
  const body=canonicalize({
    schema:SCOPE_APPROVAL_SCHEMA,
    authority:"human-approved-scope-only",
    sourceScopeProposalHash:scopeProposal.scopeProposalHash,
    sourceBindingHash:scopeProposal.sourceBindingHash,
    sourceProgramHash:scopeProposal.sourceProgramHash,
    derivedProgramHash:scopeProposal.derivedProgramHash,
    regionPlanHash:scopeProposal.regionPlanHash,
    approvedBy:req(approvedBy,"approvedBy"),
    approvedRegionIds,
    approvedRegionSetDigest:scopeProposal.affectedRegionSetDigest,
    computeCapacityAuthority:"none",
    renderAuthority:"none",
    laws:[
      "SCOPE APPROVAL != EXECUTION AUTHORIZATION",
      "APPROVED REGION != COMPUTE CAPACITY",
      "SCOPE APPROVAL != RENDER AUTHORITY",
      "SCOPE APPROVAL != OWNERSHIP",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    scopeApprovalHash:hashCanonical(body,"HauntedToaster-CrossingExecutionScopeApproval-v0"),
  }));
}
function validateExecutionScopeApproval(scopeProposal,approval){
  if(!scopeProposal||scopeProposal.schema!==AFFECTED_SCOPE_SCHEMA)throw new TypeError("Scope approval requires an affected-region proposal.");
  if(!approval||typeof approval!=="object"||Array.isArray(approval))throw new TypeError("Scope approval must be an object.");
  if(approval.schema!==SCOPE_APPROVAL_SCHEMA||approval.authority!=="human-approved-scope-only")throw new TypeError("Unsupported scope approval.");
  if(approval.sourceScopeProposalHash!==scopeProposal.scopeProposalHash||approval.sourceBindingHash!==scopeProposal.sourceBindingHash||approval.derivedProgramHash!==scopeProposal.derivedProgramHash){
    throw new TypeError("Scope approval lineage mismatch.");
  }
  if(JSON.stringify(approval.approvedRegionIds)!==JSON.stringify(scopeProposal.affectedRegionIds)||approval.approvedRegionSetDigest!==scopeProposal.affectedRegionSetDigest){
    throw new TypeError("Scope approval does not approve the exact proposed region set.");
  }
  const {scopeApprovalHash,...body}=approval;
  if(hash64(scopeApprovalHash,"scopeApprovalHash")!==hashCanonical(canonicalize(body),"HauntedToaster-CrossingExecutionScopeApproval-v0"))throw new TypeError("Scope approval hash mismatch.");
  return approval;
}
function prepareSparseExecutionParcel(program,scopeProposal,scopeApproval,{
  assignmentOwnerParticular,
  workerParticular,
  issuanceCut,
  expiryCut,
}={}){
  const source=validatePerformanceProgram(program);
  if(scopeProposal.derivedProgramHash!==source.programHash)throw new TypeError("Sparse parcel program/scope lineage mismatch.");
  validateExecutionScopeApproval(scopeProposal,scopeApproval);
  const assigned=orderedRegionIds(source,scopeApproval.approvedRegionIds,"approvedRegionIds");
  const body=canonicalize({
    schema:SPARSE_PARCEL_SCHEMA,
    authority:"transport-description-only",
    donorPin:GHOT_067_PIN,
    compatibility:"shape-compatible-with-ghot-067-not-a-ghot-signature",
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    sourceBindingHash:scopeProposal.sourceBindingHash,
    sourceScopeProposalHash:scopeProposal.scopeProposalHash,
    sourceScopeApprovalHash:scopeApproval.scopeApprovalHash,
    assignmentOwnerParticular:req(assignmentOwnerParticular,"assignmentOwnerParticular"),
    workerParticular:req(workerParticular,"workerParticular"),
    assignedRegionIds:assigned,
    assignedRegionCount:assigned.length,
    assignedRegionSetDigest:digestRegions(source,assigned,"HauntedToaster-ApprovedCrossingAssignedRegions-v0"),
    issuanceCut:req(issuanceCut,"issuanceCut"),
    expiryCut:req(expiryCut,"expiryCut"),
    computeCapacityAuthority:"none",
    ownershipTransfer:false,
    settlementAuthority:"none",
    laws:[
      "SCOPE APPROVAL != COMPUTE CAPACITY AUTHORITY",
      "REGION ASSIGNMENT != OWNERSHIP",
      "REGION PARCEL != REGION RESULT",
      "ASSIGNMENT MUST NAME EXACT APPROVED WORK",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    parcelHash:hashCanonical(body,"HauntedToaster-GHoT067ApprovedCrossingParcel-v0"),
  }));
}
function validateSparseExecutionParcel(program,scopeProposal,scopeApproval,parcel){
  const source=validatePerformanceProgram(program);
  validateExecutionScopeApproval(scopeProposal,scopeApproval);
  if(!parcel||typeof parcel!=="object"||Array.isArray(parcel))throw new TypeError("Sparse execution parcel must be an object.");
  if(parcel.schema!==SPARSE_PARCEL_SCHEMA||parcel.authority!=="transport-description-only")throw new TypeError("Unsupported sparse execution parcel.");
  if(parcel.programHash!==source.programHash||parcel.regionPlanHash!==source.renderRegionPlan.regionPlanHash||parcel.sourceScopeProposalHash!==scopeProposal.scopeProposalHash||parcel.sourceScopeApprovalHash!==scopeApproval.scopeApprovalHash){
    throw new TypeError("Sparse execution parcel lineage mismatch.");
  }
  const ids=orderedRegionIds(source,parcel.assignedRegionIds,"assignedRegionIds");
  if(JSON.stringify(ids)!==JSON.stringify(scopeApproval.approvedRegionIds))throw new TypeError("Sparse execution parcel deviates from approved scope.");
  if(parcel.assignedRegionSetDigest!==digestRegions(source,ids,"HauntedToaster-ApprovedCrossingAssignedRegions-v0"))throw new TypeError("Sparse execution parcel digest mismatch.");
  if(parcel.computeCapacityAuthority!=="none"||parcel.ownershipTransfer!==false||parcel.settlementAuthority!=="none")throw new TypeError("Sparse execution parcel authority escalation refused.");
  const {parcelHash,...body}=parcel;
  if(hash64(parcelHash,"parcelHash")!==hashCanonical(canonicalize(body),"HauntedToaster-GHoT067ApprovedCrossingParcel-v0"))throw new TypeError("Sparse execution parcel hash mismatch.");
  return parcel;
}
function sparseResult(program,parcel,receipts){
  const source=validatePerformanceProgram(program);
  const valid=receipts.map(receipt=>validatePixelRegionReceipt(source,receipt));
  const consumed=valid.map(item=>item.regionId);
  const order=regionOrder(source);
  consumed.sort((a,b)=>order.get(a)-order.get(b));
  const consumedSet=new Set(consumed);
  const returned=parcel.assignedRegionIds.filter(id=>!consumedSet.has(id));
  const body=canonicalize({
    schema:SPARSE_RESULT_SCHEMA,
    authority:"execution-witness-only",
    donorPin:GHOT_067_PIN,
    parcelHash:parcel.parcelHash,
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    sourceScopeApprovalHash:parcel.sourceScopeApprovalHash,
    workerParticular:parcel.workerParticular,
    consumedRegionIds:consumed,
    returnedRegionIds:returned,
    consumedReceiptHashes:valid.map(item=>item.receiptHash),
    computeCapacityAuthority:"none",
    historyDeleted:false,
    laws:[
      "EXECUTION RESULT != RENDER ACCEPTANCE",
      "PARTIAL EXECUTION MUST PRESERVE RETURNED REGION IDS",
      "CONSUMED REGION != REASSIGNABLE REGION",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    resultHash:hashCanonical(body,"HauntedToaster-GHoT067ApprovedCrossingResult-v0"),
  }));
}
async function executeApprovedSparseScope(program,scopeProposal,scopeApproval,parcel,{
  rootDir,
  localExecutionAuthorized=false,
  consumeRegionIds=null,
  width=96,
  height=54,
}={}){
  const source=validatePerformanceProgram(program);
  const work=validateSparseExecutionParcel(source,scopeProposal,scopeApproval,parcel);
  if(localExecutionAuthorized!==true)throw new TypeError("Scope approval does not grant compute; separate local execution authorization is required.");
  const selected=consumeRegionIds===null
    ?[...work.assignedRegionIds]
    :orderedRegionIds(source,consumeRegionIds,"consumeRegionIds");
  const assigned=new Set(work.assignedRegionIds);
  for(const id of selected)if(!assigned.has(id))throw new TypeError(`Sparse execution attempted an unapproved region: ${id}.`);
  const receipts=[];
  for(const [index,regionId] of selected.entries()){
    const rendered=await renderProgramRegion(source,regionId,{
      rootDir,
      workerId:work.workerParticular,
      attemptId:`${work.parcelHash.slice(0,12)}-${index}`,
      width,
      height,
    });
    receipts.push(rendered.receipt);
  }
  return deepFreeze({
    receipts,
    result:sparseResult(source,work,receipts),
  });
}

module.exports={
  AFFECTED_SCOPE_SCHEMA,
  GHOT_067_PIN,
  SCOPE_APPROVAL_SCHEMA,
  SPARSE_PARCEL_SCHEMA,
  SPARSE_RESULT_SCHEMA,
  approveExecutionScope,
  createCrossingExecutionProgram,
  deriveAffectedRegionProposal,
  executeApprovedSparseScope,
  prepareSparseExecutionParcel,
  validateAffectedRegionProposal,
  validateExecutionScopeApproval,
  validateSparseExecutionParcel,
};
