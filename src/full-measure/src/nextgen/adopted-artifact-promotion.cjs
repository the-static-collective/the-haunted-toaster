"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {
  validateArtifactDisposition,
  validateCandidateDerivedFrameGraph,
  validateReviewMediaReceipt,
}=require("./artifact-adoption.cjs");

const ADOPTED_IMPORT_PROPOSAL_SCHEMA="static-collective/adopted-artifact-import-proposal/v0";
const ADOPTED_MATERIAL_ADMISSION_SCHEMA="static-collective/adopted-artifact-material-admission/v0";
const ADOPTED_MATERIAL_DERIVATION_SCHEMA="static-collective/adopted-artifact-material-derivation/v0";

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
function materialIdForGraph(graphHash){
  return `adopted-artifact:${hash64(graphHash,"candidateGraphHash").slice(0,20)}`;
}
function createAdoptedArtifactImportProposal({
  candidateGraph,
  reviewMediaReceipt,
  disposition,
}={}){
  const graph=validateCandidateDerivedFrameGraph(candidateGraph);
  const review=validateReviewMediaReceipt(reviewMediaReceipt);
  const decided=validateArtifactDisposition(disposition);
  if(decided.decision!=="ADOPT")throw new TypeError("Only an ADOPT disposition may propose artifact import.");
  if(review.candidateGraphHash!==graph.candidateGraphHash||review.frameGraphHash!==graph.frameGraphHash){
    throw new TypeError("Adopted artifact import review/candidate graph lineage mismatch.");
  }
  if(decided.sourceCandidateGraphHash!==graph.candidateGraphHash||decided.sourceFrameGraphHash!==graph.frameGraphHash){
    throw new TypeError("Adopted artifact import disposition/candidate graph lineage mismatch.");
  }
  if(decided.reviewMediaSha256!==review.mediaSha256){
    throw new TypeError("Adopted artifact import disposition/review-media hash mismatch.");
  }
  const materialId=materialIdForGraph(graph.candidateGraphHash);
  const body=canonicalize({
    schema:ADOPTED_IMPORT_PROPOSAL_SCHEMA,
    authority:"proposal-only",
    sourceDispositionHash:decided.dispositionHash,
    candidateGraphHash:graph.candidateGraphHash,
    frameGraphHash:graph.frameGraphHash,
    sourceProgramHash:graph.sourceProgramHash,
    derivedProgramHash:graph.derivedProgramHash,
    sourceReviewMediaReceiptHash:review.reviewMediaReceiptHash,
    mediaSha256:review.mediaSha256,
    mediaByteLength:review.mediaByteLength,
    fps:review.fps,
    frameCount:review.frameCount,
    proposedMaterialId:materialId,
    laws:[
      "ADOPTION != IMPORT",
      "IMPORT PROPOSAL != MATERIAL ADMISSION",
      "REVIEW MEDIA != SOURCE AUTHORITY",
      "ADOPTED HISTORY != PLACEMENT AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    importProposalHash:hashCanonical(body,"HauntedToaster-AdoptedArtifactImportProposal-v0"),
  }));
}
function validateAdoptedArtifactImportProposal(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Adopted artifact import proposal must be an object.");
  if(value.schema!==ADOPTED_IMPORT_PROPOSAL_SCHEMA||value.authority!=="proposal-only")throw new TypeError("Unsupported adopted artifact import proposal.");
  for(const key of [
    "sourceDispositionHash","candidateGraphHash","frameGraphHash","sourceProgramHash",
    "derivedProgramHash","sourceReviewMediaReceiptHash","mediaSha256",
  ])hash64(value[key],key);
  whole(value.mediaByteLength,"mediaByteLength",1,Number.MAX_SAFE_INTEGER);
  whole(value.fps,"fps",1,240);
  whole(value.frameCount,"frameCount",1,1_000_000);
  if(value.proposedMaterialId!==materialIdForGraph(value.candidateGraphHash))throw new TypeError("Adopted artifact proposed material identity mismatch.");
  const {importProposalHash,...body}=value;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-AdoptedArtifactImportProposal-v0");
  if(hash64(importProposalHash,"importProposalHash")!==expected)throw new TypeError("Adopted artifact import proposal hash mismatch.");
  return deepFreeze(canonicalize(value));
}
function admitAdoptedArtifactImport(proposal,{
  expectedImportProposalHash,
  admittedBy,
}={}){
  const source=validateAdoptedArtifactImportProposal(proposal);
  const expected=hash64(expectedImportProposalHash,"expectedImportProposalHash");
  if(expected!==source.importProposalHash)throw new TypeError("Stale adopted artifact import proposal identity; refusing admission.");
  const actor=req(admittedBy,"admittedBy");
  const derivation=canonicalize({
    schema:ADOPTED_MATERIAL_DERIVATION_SCHEMA,
    authority:"provenance-only",
    importProposalHash:source.importProposalHash,
    sourceDispositionHash:source.sourceDispositionHash,
    candidateGraphHash:source.candidateGraphHash,
    frameGraphHash:source.frameGraphHash,
    sourceProgramHash:source.sourceProgramHash,
    derivedProgramHash:source.derivedProgramHash,
    sourceReviewMediaReceiptHash:source.sourceReviewMediaReceiptHash,
    sourceDurationFrames:source.frameCount,
    fps:source.fps,
    laws:[
      "DERIVATION != PLACEMENT",
      "HISTORY != EDIT AUTHORITY",
    ],
  });
  const material=canonicalize({
    materialId:source.proposedMaterialId,
    kind:"video",
    sourceIdentity:`adopted-artifact:${source.candidateGraphHash}:review:${source.mediaSha256}`,
    digest:source.mediaSha256,
    rightsBasis:"locally-produced-human-adopted-artifact",
    admissionBasis:"explicit-adopted-artifact-material-admission",
    derivation,
  });
  const body=canonicalize({
    schema:ADOPTED_MATERIAL_ADMISSION_SCHEMA,
    authority:"material-only",
    sourceImportProposalHash:source.importProposalHash,
    sourceDispositionHash:source.sourceDispositionHash,
    candidateGraphHash:source.candidateGraphHash,
    sourceReviewMediaReceiptHash:source.sourceReviewMediaReceiptHash,
    mediaSha256:source.mediaSha256,
    mediaByteLength:source.mediaByteLength,
    admittedBy:actor,
    material,
    laws:[
      "ADOPTION != IMPORT",
      "IMPORT PROPOSAL != MATERIAL ADMISSION",
      "ADMISSION != PLACEMENT",
      "MATERIAL != PLACEMENT",
      "ADOPTED HISTORY != PLACEMENT AUTHORITY",
      "ADMISSION != FREEZE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    admissionHash:hashCanonical(body,"HauntedToaster-AdoptedArtifactMaterialAdmission-v0"),
  }));
}
function validateAdoptedMaterialAdmission(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Adopted artifact material admission must be an object.");
  if(value.schema!==ADOPTED_MATERIAL_ADMISSION_SCHEMA||value.authority!=="material-only")throw new TypeError("Unsupported adopted artifact material admission.");
  for(const key of [
    "sourceImportProposalHash","sourceDispositionHash","candidateGraphHash",
    "sourceReviewMediaReceiptHash","mediaSha256",
  ])hash64(value[key],key);
  whole(value.mediaByteLength,"admission mediaByteLength",1,Number.MAX_SAFE_INTEGER);
  req(value.admittedBy,"admittedBy");
  const material=value.material;
  if(!material||typeof material!=="object"||Array.isArray(material))throw new TypeError("Adopted material admission requires a material.");
  if(material.materialId!==materialIdForGraph(value.candidateGraphHash))throw new TypeError("Adopted material ID does not match candidate graph.");
  if(material.kind!=="video")throw new TypeError("Adopted material must be video.");
  if(material.digest!==value.mediaSha256)throw new TypeError("Adopted material digest does not match admitted media.");
  if(material.rightsBasis!=="locally-produced-human-adopted-artifact"||material.admissionBasis!=="explicit-adopted-artifact-material-admission"){
    throw new TypeError("Adopted material admission basis is invalid.");
  }
  const derivation=material.derivation;
  if(!derivation||derivation.schema!==ADOPTED_MATERIAL_DERIVATION_SCHEMA||derivation.authority!=="provenance-only")throw new TypeError("Adopted material derivation is invalid.");
  for(const key of ["importProposalHash","sourceDispositionHash","candidateGraphHash","frameGraphHash","sourceProgramHash","derivedProgramHash","sourceReviewMediaReceiptHash"])hash64(derivation[key],`derivation ${key}`);
  if(derivation.importProposalHash!==value.sourceImportProposalHash||derivation.sourceDispositionHash!==value.sourceDispositionHash||derivation.candidateGraphHash!==value.candidateGraphHash||derivation.sourceReviewMediaReceiptHash!==value.sourceReviewMediaReceiptHash){
    throw new TypeError("Adopted material derivation lineage mismatch.");
  }
  whole(derivation.sourceDurationFrames,"sourceDurationFrames",1,1_000_000);
  whole(derivation.fps,"derivation fps",1,240);
  const {admissionHash,...body}=value;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-AdoptedArtifactMaterialAdmission-v0");
  if(hash64(admissionHash,"admissionHash")!==expected)throw new TypeError("Adopted artifact material admission hash mismatch.");
  return deepFreeze(canonicalize(value));
}

module.exports={
  ADOPTED_IMPORT_PROPOSAL_SCHEMA,
  ADOPTED_MATERIAL_ADMISSION_SCHEMA,
  ADOPTED_MATERIAL_DERIVATION_SCHEMA,
  admitAdoptedArtifactImport,
  createAdoptedArtifactImportProposal,
  materialIdForGraph,
  validateAdoptedArtifactImportProposal,
  validateAdoptedMaterialAdmission,
};
