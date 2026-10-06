"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validatePerformanceProgram}=require("./performance-program.cjs");
const {validatePixelRegionReceipt,frameGraphHash,RENDERER_ID}=require("./performance-program-render.cjs");
const {validateAffectedRegionProposal,validateExecutionScopeApproval}=require("./crossing-execution-custody.cjs");

const CANDIDATE_GRAPH_SCHEMA="static-collective/candidate-derived-frame-graph/v0";
const DISPOSITION_SCHEMA="static-collective/candidate-artifact-disposition/v0";

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
function validateWholeReceipt(program,receipt){
  const source=validatePerformanceProgram(program);
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt))throw new TypeError("Whole-render receipt must be an object.");
  if(receipt.schema!=="static-collective/performance-program-whole-render-receipt/v0"||receipt.authority!=="witness-only"||receipt.renderer!==RENDERER_ID){
    throw new TypeError("Unsupported whole-render receipt.");
  }
  if(receipt.programHash!==source.programHash||receipt.frameCount!==source.totalFrames)throw new TypeError("Whole-render receipt lineage/count mismatch.");
  if(!Array.isArray(receipt.frames)||receipt.frames.length!==source.totalFrames)throw new TypeError("Whole-render frame inventory mismatch.");
  for(let i=0;i<receipt.frames.length;i++){
    const frame=receipt.frames[i];
    if(frame.frame!==i)throw new TypeError("Whole-render frame order mismatch.");
    hash64(frame.sha256,"whole-render frame sha256");
  }
  if(receipt.frameGraphHash!==frameGraphHash(source,receipt.frames))throw new TypeError("Whole-render frame graph hash mismatch.");
  const {receiptHash,...body}=receipt;
  if(hash64(receiptHash,"whole-render receiptHash")!==hashCanonical(canonicalize(body),"HauntedToaster-PerformanceProgram-WholeRenderReceipt-v0")){
    throw new TypeError("Whole-render receipt hash mismatch.");
  }
  return receipt;
}
function composeCandidateDerivedFrameGraph(sourceProgram,derivedProgram,scopeProposal,scopeApproval,sourceWholeReceipt,derivedRegionReceipts=[]){
  const source=validatePerformanceProgram(sourceProgram);
  const derived=validatePerformanceProgram(derivedProgram);
  validateAffectedRegionProposal(source,derived,{...scopeApproval,
    schema:"static-collective/possibility-crossing-binding/v0",
  },scopeProposal);
  // Full binding validation is performed before custody; here scope+program lineage is authoritative.
  validateExecutionScopeApproval(scopeProposal,scopeApproval);
  const sourceWhole=validateWholeReceipt(source,sourceWholeReceipt);
  if(!Array.isArray(derivedRegionReceipts))throw new TypeError("Derived region receipts must be an array.");
  const valid=derivedRegionReceipts.map(item=>validatePixelRegionReceipt(derived,item));
  const expected=new Set(scopeProposal.affectedRegionIds);
  const byRegion=new Map();
  for(const receipt of valid){
    if(!expected.has(receipt.regionId))throw new TypeError(`Derived receipt is outside approved affected scope: ${receipt.regionId}.`);
    if(byRegion.has(receipt.regionId))throw new TypeError(`Duplicate derived receipt for affected region: ${receipt.regionId}.`);
    byRegion.set(receipt.regionId,receipt);
  }
  for(const id of expected)if(!byRegion.has(id))throw new TypeError(`Missing derived coverage for affected region: ${id}.`);

  const changedFrames=new Set();
  for(const span of scopeProposal.changedFrameSpans||[]){
    for(let frame=span.startFrame;frame<span.endFrameExclusive;frame++)changedFrames.add(frame);
  }
  if(changedFrames.size!==scopeProposal.changedFrameCount)throw new TypeError("Changed-frame scope count mismatch.");

  const derivedFrameByNumber=new Map();
  for(const receipt of valid)for(const frame of receipt.frames)derivedFrameByNumber.set(frame.frame,{...frame,receiptHash:receipt.receiptHash,regionId:receipt.regionId});
  const frames=sourceWhole.frames.map(frame=>{
    if(!changedFrames.has(frame.frame)){
      return canonicalize({
        frame:frame.frame,
        sha256:frame.sha256,
        sizeBytes:frame.sizeBytes,
        provenance:"source-world",
        sourceReceiptHash:sourceWhole.receiptHash,
      });
    }
    const changed=derivedFrameByNumber.get(frame.frame);
    if(!changed)throw new TypeError(`Missing derived frame witness for changed frame ${frame.frame}.`);
    return canonicalize({
      frame:changed.frame,
      sha256:changed.sha256,
      sizeBytes:changed.sizeBytes,
      provenance:"derived-world",
      sourceReceiptHash:changed.receiptHash,
      sourceRegionId:changed.regionId,
    });
  });
  const body=canonicalize({
    schema:CANDIDATE_GRAPH_SCHEMA,
    authority:"review-candidate-only",
    renderer:RENDERER_ID,
    sourceProgramHash:source.programHash,
    derivedProgramHash:derived.programHash,
    sourceWholeReceiptHash:sourceWhole.receiptHash,
    sourceScopeProposalHash:scopeProposal.scopeProposalHash,
    sourceScopeApprovalHash:scopeApproval.scopeApprovalHash,
    fps:source.fps,
    frameCount:frames.length,
    changedFrameCount:changedFrames.size,
    derivedRegionIds:[...scopeProposal.affectedRegionIds],
    frames,
    frameGraphHash:hashCanonical(canonicalize({
      derivedProgramHash:derived.programHash,
      frames:frames.map(f=>({frame:f.frame,sha256:f.sha256})),
    }),"HauntedToaster-CandidateDerivedFrameGraphPixels-v0"),
    laws:[
      "CANDIDATE GRAPH != ADOPTION",
      "EXECUTION RESULT != RENDER ACCEPTANCE",
      "UNCHANGED FRAME != DERIVED PROVENANCE",
      "REVIEW ARTIFACT != FREEZE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    candidateGraphHash:hashCanonical(body,"HauntedToaster-CandidateDerivedFrameGraph-v0"),
  }));
}
function validateCandidateDerivedFrameGraph(graph){
  if(!graph||typeof graph!=="object"||Array.isArray(graph))throw new TypeError("Candidate derived frame graph must be an object.");
  if(graph.schema!==CANDIDATE_GRAPH_SCHEMA||graph.authority!=="review-candidate-only"||graph.renderer!==RENDERER_ID)throw new TypeError("Unsupported candidate frame graph.");
  for(const key of ["sourceProgramHash","derivedProgramHash","sourceWholeReceiptHash","sourceScopeProposalHash","sourceScopeApprovalHash","frameGraphHash"])hash64(graph[key],key);
  if(!Array.isArray(graph.frames)||graph.frames.length!==graph.frameCount)throw new TypeError("Candidate frame inventory mismatch.");
  let changed=0;
  for(let i=0;i<graph.frames.length;i++){
    const frame=graph.frames[i];
    if(frame.frame!==i)throw new TypeError("Candidate frame order mismatch.");
    hash64(frame.sha256,"candidate frame sha256");
    hash64(frame.sourceReceiptHash,"candidate frame sourceReceiptHash");
    if(frame.provenance==="derived-world")changed++;
    else if(frame.provenance!=="source-world")throw new TypeError("Candidate frame provenance is unsupported.");
  }
  if(changed!==graph.changedFrameCount)throw new TypeError("Candidate changed-frame count mismatch.");
  const {candidateGraphHash,...body}=graph;
  if(hash64(candidateGraphHash,"candidateGraphHash")!==hashCanonical(canonicalize(body),"HauntedToaster-CandidateDerivedFrameGraph-v0"))throw new TypeError("Candidate graph hash mismatch.");
  return graph;
}
function decideCandidateArtifact(graph,{decision,expectedCandidateGraphHash,reviewMediaSha256,decidedBy}={}){
  const source=validateCandidateDerivedFrameGraph(graph);
  const expected=hash64(expectedCandidateGraphHash,"expectedCandidateGraphHash");
  if(expected!==source.candidateGraphHash)throw new TypeError("Stale candidate graph identity; refusing artifact disposition.");
  const choice=req(decision,"decision").toUpperCase();
  if(choice!=="ADOPT"&&choice!=="REJECT")throw new TypeError("Artifact disposition must be ADOPT or REJECT.");
  const body=canonicalize({
    schema:DISPOSITION_SCHEMA,
    authority:"human-artifact-disposition-only",
    decision:choice,
    sourceCandidateGraphHash:source.candidateGraphHash,
    sourceFrameGraphHash:source.frameGraphHash,
    sourceProgramHash:source.sourceProgramHash,
    derivedProgramHash:source.derivedProgramHash,
    reviewMediaSha256:hash64(reviewMediaSha256,"reviewMediaSha256"),
    decidedBy:req(decidedBy,"decidedBy"),
    laws:[
      "ADOPTION != FREEZE",
      "ADOPTION != SOURCE REWRITE",
      "REJECTION PRESERVES EVIDENCE",
      "DISPOSITION != COMPUTE AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    dispositionHash:hashCanonical(body,"HauntedToaster-CandidateArtifactDisposition-v0"),
  }));
}
function validateArtifactDisposition(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Artifact disposition must be an object.");
  if(value.schema!==DISPOSITION_SCHEMA||value.authority!=="human-artifact-disposition-only")throw new TypeError("Unsupported artifact disposition.");
  if(value.decision!=="ADOPT"&&value.decision!=="REJECT")throw new TypeError("Artifact disposition decision is invalid.");
  for(const key of ["sourceCandidateGraphHash","sourceFrameGraphHash","sourceProgramHash","derivedProgramHash","reviewMediaSha256"])hash64(value[key],key);
  const {dispositionHash,...body}=value;
  if(hash64(dispositionHash,"dispositionHash")!==hashCanonical(canonicalize(body),"HauntedToaster-CandidateArtifactDisposition-v0"))throw new TypeError("Artifact disposition hash mismatch.");
  return value;
}

module.exports={
  CANDIDATE_GRAPH_SCHEMA,
  DISPOSITION_SCHEMA,
  composeCandidateDerivedFrameGraph,
  decideCandidateArtifact,
  validateArtifactDisposition,
  validateCandidateDerivedFrameGraph,
};
