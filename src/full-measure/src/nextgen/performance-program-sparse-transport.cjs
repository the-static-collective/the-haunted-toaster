"use strict";

const {canonicalBytes,canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {
  pixelExecutionState,
  renderProgramRegion,
  validatePixelRegionReceipt,
}=require("./performance-program-render.cjs");
const {validatePerformanceProgram}=require("./performance-program.cjs");
const {validateMediaBindingSet}=require("./performance-program-media.cjs");

const GHOT_067_PIN=deepFreeze({
  repo:"the-static-collective/GHoT",
  pr:64,
  ref:"exp067",
  sha:"6456828ca6d2ee2cd10db2017cbd9278c1e3c664",
  donorKind:"ghot.lightwalker.sparse-region-work-lease/v0",
});
const SPARSE_MISSING_SCHEMA="static-collective/performance-program-sparse-missing/v0";
const SPARSE_PARCEL_SCHEMA="static-collective/ghot-067-sparse-region-parcel/v0";
const SPARSE_RESULT_SCHEMA="static-collective/ghot-067-sparse-region-result/v0";

function req(value,label){
  const text=String(value||"").trim();
  if(!text)throw new TypeError(`${label} is required.`);
  return text;
}
function orderedSubset(order,ids,label){
  if(!Array.isArray(ids))throw new TypeError(`${label} must be an array.`);
  const unique=[...new Set(ids.map(value=>req(value,label)))];
  if(unique.length!==ids.length)throw new TypeError(`${label} contains duplicate region IDs.`);
  for(const id of unique)if(!order.has(id))throw new TypeError(`${label} contains a region outside the plan: ${id}.`);
  return unique.sort((a,b)=>order.get(a)-order.get(b));
}
function regionOrder(program){
  return new Map(program.renderRegionPlan.regions.map((region,index)=>[region.regionId,index]));
}
function digestRegionSet(program,regionIds,domain){
  return hashCanonical(canonicalize({
    programHash:program.programHash,
    regionPlanHash:program.renderRegionPlan.regionPlanHash,
    regionIds,
  }),domain);
}
function deriveSparseMissingObservation(program,receipts=[],{
  assignmentOwnerParticular,
  mediaBindingSetHash=null,
}={}){
  const source=validatePerformanceProgram(program);
  const owner=req(assignmentOwnerParticular,"assignmentOwnerParticular");
  const state=pixelExecutionState(source,receipts);
  if(state.mediaBindingConflict)throw new TypeError("Sparse missing observation refuses conflicting media bindings.");
  if(mediaBindingSetHash&&state.mediaBindingSetHash&&mediaBindingSetHash!==state.mediaBindingSetHash)throw new TypeError("Sparse missing observation media binding mismatch.");
  const bindingHash=mediaBindingSetHash||state.mediaBindingSetHash||null;
  const accepted=[...state.coveredRegionIds];
  const missing=[...state.missingRegionIds];
  const body=canonicalize({
    schema:SPARSE_MISSING_SCHEMA,
    authority:"derived-exact-missing-work-observation",
    donorPin:GHOT_067_PIN,
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    mediaBindingSetHash:bindingHash,
    assignmentOwnerParticular:owner,
    acceptedRegionIds:accepted,
    acceptedCoverageDigest:digestRegionSet(source,accepted,"HauntedToaster-SparseAcceptedRegions-v0"),
    missingRegionIds:missing,
    missingRegionSetDigest:digestRegionSet(source,missing,"HauntedToaster-SparseMissingRegions-v0"),
    missingRegionCount:missing.length,
    assignmentAuthority:"none",
    executionAuthority:"none",
    settlementAuthority:"none",
    laws:[
      "QUANTITY != REGION AUTHORITY",
      "ASSIGNMENT MUST NAME EXACT MISSING WORK",
      "MISSING SET != ASSIGNMENT",
      "REGION ASSIGNMENT != COMPUTE CAPACITY AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    observationHash:hashCanonical(body,"HauntedToaster-SparseMissingObservation-v0"),
  }));
}
function validateSparseMissingObservation(program,observation){
  const source=validatePerformanceProgram(program);
  if(!observation||typeof observation!=="object"||Array.isArray(observation))throw new TypeError("Sparse missing observation must be an object.");
  if(observation.schema!==SPARSE_MISSING_SCHEMA||observation.authority!=="derived-exact-missing-work-observation")throw new TypeError("Unsupported sparse missing observation.");
  if(observation.programHash!==source.programHash||observation.regionPlanHash!==source.renderRegionPlan.regionPlanHash)throw new TypeError("Sparse missing observation lineage mismatch.");
  const order=regionOrder(source);
  const accepted=orderedSubset(order,observation.acceptedRegionIds,"acceptedRegionIds");
  const missing=orderedSubset(order,observation.missingRegionIds,"missingRegionIds");
  if(accepted.some(id=>missing.includes(id)))throw new TypeError("Sparse missing observation overlaps accepted and missing regions.");
  if(accepted.length+missing.length!==source.renderRegionPlan.regionCount)throw new TypeError("Sparse missing observation does not partition the region plan.");
  if(observation.acceptedCoverageDigest!==digestRegionSet(source,accepted,"HauntedToaster-SparseAcceptedRegions-v0"))throw new TypeError("Sparse accepted coverage digest mismatch.");
  if(observation.missingRegionSetDigest!==digestRegionSet(source,missing,"HauntedToaster-SparseMissingRegions-v0"))throw new TypeError("Sparse missing region-set digest mismatch.");
  const {observationHash,...body}=observation;
  if(observationHash!==hashCanonical(canonicalize(body),"HauntedToaster-SparseMissingObservation-v0"))throw new TypeError("Sparse missing observation hash mismatch.");
  return observation;
}
function createSparseRegionParcel(program,observation,{
  assignedRegionIds,
  assignmentOwnerParticular,
  workerParticular,
  issuanceCut,
  expiryCut,
}={}){
  const source=validatePerformanceProgram(program);
  const missing=validateSparseMissingObservation(source,observation);
  const owner=req(assignmentOwnerParticular,"assignmentOwnerParticular");
  if(owner!==missing.assignmentOwnerParticular)throw new TypeError("Sparse parcel assigner is not the observation owner.");
  const order=regionOrder(source);
  const assigned=orderedSubset(order,assignedRegionIds,"assignedRegionIds");
  if(!assigned.length)throw new TypeError("Sparse parcel must assign at least one region.");
  const missingSet=new Set(missing.missingRegionIds);
  for(const regionId of assigned)if(!missingSet.has(regionId))throw new TypeError(`Sparse parcel assigns a non-missing region: ${regionId}.`);
  const body=canonicalize({
    schema:SPARSE_PARCEL_SCHEMA,
    authority:"transport-description-only",
    donorPin:GHOT_067_PIN,
    compatibility:"shape-compatible-with-ghot-067-not-a-ghot-signature",
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    mediaBindingSetHash:missing.mediaBindingSetHash||null,
    exactMissingObservationHash:missing.observationHash,
    acceptedCoverageDigest:missing.acceptedCoverageDigest,
    missingRegionSetDigest:missing.missingRegionSetDigest,
    assignmentOwnerParticular:owner,
    workerParticular:req(workerParticular,"workerParticular"),
    assignedRegionIds:assigned,
    assignedRegionSetDigest:digestRegionSet(source,assigned,"HauntedToaster-SparseAssignedRegions-v0"),
    assignedRegionCount:assigned.length,
    issuanceCut:req(issuanceCut,"issuanceCut"),
    expiryCut:req(expiryCut,"expiryCut"),
    computeCapacityAuthority:"none",
    ownershipTransfer:false,
    settlementAuthority:"none",
    laws:[
      "REGION ASSIGNMENT != OWNERSHIP",
      "REGION ASSIGNMENT != COMPUTE CAPACITY AUTHORITY",
      "REGION PARCEL != REGION RESULT",
      "ASSIGNMENT MUST NAME EXACT MISSING WORK",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    parcelHash:hashCanonical(body,"HauntedToaster-GHoT067SparseParcel-v0"),
  }));
}
function validateSparseRegionParcel(program,observation,parcel){
  const source=validatePerformanceProgram(program);
  const missing=validateSparseMissingObservation(source,observation);
  if(!parcel||typeof parcel!=="object"||Array.isArray(parcel))throw new TypeError("Sparse region parcel must be an object.");
  if(parcel.schema!==SPARSE_PARCEL_SCHEMA||parcel.authority!=="transport-description-only")throw new TypeError("Unsupported sparse region parcel.");
  if(parcel.programHash!==source.programHash||parcel.regionPlanHash!==source.renderRegionPlan.regionPlanHash)throw new TypeError("Sparse region parcel lineage mismatch.");
  if(parcel.exactMissingObservationHash!==missing.observationHash||parcel.missingRegionSetDigest!==missing.missingRegionSetDigest||parcel.acceptedCoverageDigest!==missing.acceptedCoverageDigest)throw new TypeError("Sparse region parcel missing-set lineage mismatch.");
  if(parcel.assignmentOwnerParticular!==missing.assignmentOwnerParticular)throw new TypeError("Sparse region parcel owner mismatch.");
  if(parcel.mediaBindingSetHash!==missing.mediaBindingSetHash)throw new TypeError("Sparse region parcel media binding mismatch.");
  const order=regionOrder(source);
  const assigned=orderedSubset(order,parcel.assignedRegionIds,"assignedRegionIds");
  const missingSet=new Set(missing.missingRegionIds);
  for(const id of assigned)if(!missingSet.has(id))throw new TypeError("Sparse region parcel contains work outside the exact missing set.");
  if(parcel.assignedRegionSetDigest!==digestRegionSet(source,assigned,"HauntedToaster-SparseAssignedRegions-v0"))throw new TypeError("Sparse region parcel region-set digest mismatch.");
  const {parcelHash,...body}=parcel;
  if(parcelHash!==hashCanonical(canonicalize(body),"HauntedToaster-GHoT067SparseParcel-v0"))throw new TypeError("Sparse region parcel hash mismatch.");
  return parcel;
}
function recordSparseParcelResult(program,observation,parcel,receipts=[]){
  const source=validatePerformanceProgram(program);
  const work=validateSparseRegionParcel(source,observation,parcel);
  if(!Array.isArray(receipts))throw new TypeError("Sparse parcel receipts must be an array.");
  const valid=receipts.map(item=>validatePixelRegionReceipt(source,item));
  const assignedSet=new Set(work.assignedRegionIds);
  const consumed=[];
  const seen=new Set();
  for(const receipt of valid){
    if(!assignedSet.has(receipt.regionId))throw new TypeError(`Sparse parcel result contains an outside region: ${receipt.regionId}.`);
    if(seen.has(receipt.regionId))throw new TypeError(`Sparse parcel result replays consumed region: ${receipt.regionId}.`);
    if((receipt.mediaBindingSetHash||null)!==(work.mediaBindingSetHash||null))throw new TypeError("Sparse parcel result media binding mismatch.");
    seen.add(receipt.regionId);
    consumed.push(receipt.regionId);
  }
  const order=regionOrder(source);
  consumed.sort((a,b)=>order.get(a)-order.get(b));
  const returned=work.assignedRegionIds.filter(id=>!seen.has(id));
  const body=canonicalize({
    schema:SPARSE_RESULT_SCHEMA,
    authority:"execution-witness-only",
    donorPin:GHOT_067_PIN,
    parcelHash:work.parcelHash,
    programHash:source.programHash,
    regionPlanHash:source.renderRegionPlan.regionPlanHash,
    mediaBindingSetHash:work.mediaBindingSetHash||null,
    workerParticular:work.workerParticular,
    consumedRegionIds:consumed,
    returnedRegionIds:returned,
    consumedRegionSetDigest:digestRegionSet(source,consumed,"HauntedToaster-SparseConsumedRegions-v0"),
    returnedRegionSetDigest:digestRegionSet(source,returned,"HauntedToaster-SparseReturnedRegions-v0"),
    consumedReceiptHashes:valid.map(item=>item.receiptHash),
    historyDeleted:false,
    computeCapacityAuthority:"none",
    laws:[
      "PARTIAL REGION EXECUTION MUST PRESERVE UNFINISHED IDS",
      "REGION PARCEL != REGION RESULT",
      "CONSUMED REGION != REASSIGNABLE REGION",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    resultHash:hashCanonical(body,"HauntedToaster-GHoT067SparseResult-v0"),
  }));
}
async function executeSparseRegionParcel(program,observation,parcel,{
  rootDir,
  mediaBindingSet=null,
  localMediaPaths=null,
  consumeRegionIds=null,
  localExecutionAuthorized=false,
  width=96,
  height=54,
}={}){
  const source=validatePerformanceProgram(program);
  const work=validateSparseRegionParcel(source,observation,parcel);
  if(localExecutionAuthorized!==true)throw new TypeError("Sparse parcel does not grant compute capacity; caller must provide local execution authorization.");
  if(work.mediaBindingSetHash){
    const witness=validateMediaBindingSet(source,mediaBindingSet);
    if(witness.bindingSetHash!==work.mediaBindingSetHash)throw new TypeError("Sparse worker media binding witness mismatch.");
  }
  const order=regionOrder(source);
  const selected=consumeRegionIds===null
    ?[...work.assignedRegionIds]
    :orderedSubset(order,consumeRegionIds,"consumeRegionIds");
  const assignedSet=new Set(work.assignedRegionIds);
  for(const id of selected)if(!assignedSet.has(id))throw new TypeError(`Sparse worker attempted an unassigned region: ${id}.`);
  const receipts=[];
  for(const [index,regionId] of selected.entries()){
    const rendered=await renderProgramRegion(source,regionId,{
      rootDir,
      workerId:work.workerParticular,
      attemptId:`${work.parcelHash.slice(0,12)}-${index}`,
      width,
      height,
      mediaBindingSet,
      localMediaPaths,
    });
    receipts.push(rendered.receipt);
  }
  return deepFreeze({
    receipts,
    result:recordSparseParcelResult(source,observation,work,receipts),
  });
}
function createReturnedWorkParcel(program,observation,priorParcel,priorResult,{
  assignmentOwnerParticular,
  workerParticular,
  issuanceCut,
  expiryCut,
}={}){
  const source=validatePerformanceProgram(program);
  const parcel=validateSparseRegionParcel(source,observation,priorParcel);
  if(!priorResult||priorResult.schema!==SPARSE_RESULT_SCHEMA||priorResult.parcelHash!==parcel.parcelHash)throw new TypeError("Returned-work reassignment requires the exact prior parcel result.");
  const returned=[...priorResult.returnedRegionIds];
  if(!returned.length)throw new TypeError("Sparse parcel returned no work to reassign.");
  return createSparseRegionParcel(source,observation,{
    assignedRegionIds:returned,
    assignmentOwnerParticular,
    workerParticular,
    issuanceCut,
    expiryCut,
  });
}
function serializeSparseRegionParcel(program,observation,parcel){
  return canonicalBytes(validateSparseRegionParcel(program,observation,parcel));
}

module.exports={
  GHOT_067_PIN,
  SPARSE_MISSING_SCHEMA,
  SPARSE_PARCEL_SCHEMA,
  SPARSE_RESULT_SCHEMA,
  createReturnedWorkParcel,
  createSparseRegionParcel,
  deriveSparseMissingObservation,
  executeSparseRegionParcel,
  recordSparseParcelResult,
  serializeSparseRegionParcel,
  validateSparseMissingObservation,
  validateSparseRegionParcel,
};
