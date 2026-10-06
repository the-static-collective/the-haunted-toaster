"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validatePossibilityMap}=require("./possibility-map.cjs");

const PROPOSAL_SCHEMA="static-collective/possibility-crossing-proposal/v0";
const BINDING_SCHEMA="static-collective/possibility-crossing-binding/v0";

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
function createPossibilityCrossingProposal(map,{frame}={}){
  const source=validatePossibilityMap(map);
  const target=whole(frame,"proposal frame",0,source.totalFrames-1);
  const point=source.points.find(item=>item.frame===target);
  if(!point)throw new TypeError("Possibility crossing proposal requires an exact sampled map frame.");
  const body=canonicalize({
    schema:PROPOSAL_SCHEMA,
    authority:"proposal-only",
    sourceMapHash:source.mapHash,
    sourceProgramHash:source.sourceProgramHash,
    sourceTransitionFieldHash:source.sourceTransitionFieldHash,
    sourceCandidateId:source.sourceCandidateId,
    candidateSpec:source.candidateSpec,
    frame:point.frame,
    transitionHash:point.transitionHash,
    kind:point.kind,
    fromState:point.fromState,
    toState:point.toState,
    baseEnergy:point.baseEnergy,
    totalDelta:point.totalDelta,
    energy:point.energy,
    contributionKinds:point.contributionKinds,
    contributions:point.contributions,
    laws:[
      "POINT CLICK != EDIT",
      "PROPOSAL != ACCEPTANCE",
      "PROPOSAL != EXECUTION",
      "LOW ENERGY != RECOMMENDATION",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    proposalHash:hashCanonical(body,"HauntedToaster-PossibilityCrossingProposal-v0"),
  }));
}
function validatePossibilityCrossingProposal(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Possibility crossing proposal must be an object.");
  if(value.schema!==PROPOSAL_SCHEMA||value.authority!=="proposal-only")throw new TypeError("Unsupported possibility crossing proposal.");
  hash64(value.sourceMapHash,"proposal sourceMapHash");
  hash64(value.sourceProgramHash,"proposal sourceProgramHash");
  hash64(value.sourceTransitionFieldHash,"proposal sourceTransitionFieldHash");
  hash64(value.transitionHash,"proposal transitionHash");
  req(value.sourceCandidateId,"proposal sourceCandidateId");
  if(!value.candidateSpec||typeof value.candidateSpec!=="object"||Array.isArray(value.candidateSpec))throw new TypeError("Proposal candidateSpec is required.");
  whole(value.frame,"proposal frame");
  if(!Array.isArray(value.contributionKinds)||!Array.isArray(value.contributions))throw new TypeError("Proposal contribution ledger is invalid.");
  if(JSON.stringify(value.contributionKinds)!==JSON.stringify(value.contributions.map(item=>item.kind)))throw new TypeError("Proposal contribution inventory mismatch.");
  const {proposalHash,...body}=value;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-PossibilityCrossingProposal-v0");
  if(hash64(proposalHash,"proposalHash")!==expected)throw new TypeError("Possibility crossing proposal hash mismatch.");
  return deepFreeze(canonicalize(value));
}
function acceptPossibilityCrossing(proposal,{expectedProposalHash,acceptedBy}={}){
  const source=validatePossibilityCrossingProposal(proposal);
  const expected=hash64(expectedProposalHash,"expectedProposalHash");
  if(expected!==source.proposalHash)throw new TypeError("Stale possibility crossing proposal identity; refusing ACCEPT.");
  const actor=req(acceptedBy,"acceptedBy");
  const body=canonicalize({
    schema:BINDING_SCHEMA,
    authority:"human-accepted-relation-only",
    sourceProposalHash:source.proposalHash,
    sourceMapHash:source.sourceMapHash,
    sourceProgramHash:source.sourceProgramHash,
    sourceTransitionFieldHash:source.sourceTransitionFieldHash,
    sourceCandidateId:source.sourceCandidateId,
    candidateSpec:source.candidateSpec,
    frame:source.frame,
    transitionHash:source.transitionHash,
    kind:source.kind,
    fromState:source.fromState,
    toState:source.toState,
    observedEnergy:source.energy,
    acceptedBy:actor,
    laws:[
      "ACCEPTANCE != EXECUTION",
      "BINDING != FREEZE",
      "ACCEPTED CROSSING != RENDER AUTHORITY",
      "HUMAN ACCEPTANCE != COMPUTE AUTHORITY",
      "OBSERVED ENERGY != VALUE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    bindingHash:hashCanonical(body,"HauntedToaster-PossibilityCrossingBinding-v0"),
  }));
}
function validatePossibilityCrossingBinding(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Possibility crossing binding must be an object.");
  if(value.schema!==BINDING_SCHEMA||value.authority!=="human-accepted-relation-only")throw new TypeError("Unsupported possibility crossing binding.");
  for(const [key,label] of [
    ["sourceProposalHash","binding sourceProposalHash"],
    ["sourceMapHash","binding sourceMapHash"],
    ["sourceProgramHash","binding sourceProgramHash"],
    ["sourceTransitionFieldHash","binding sourceTransitionFieldHash"],
    ["transitionHash","binding transitionHash"],
  ])hash64(value[key],label);
  req(value.sourceCandidateId,"binding sourceCandidateId");
  if(!value.candidateSpec||typeof value.candidateSpec!=="object"||Array.isArray(value.candidateSpec))throw new TypeError("Binding candidateSpec is required.");
  req(value.acceptedBy,"binding acceptedBy");
  whole(value.frame,"binding frame");
  const {bindingHash,...body}=value;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-PossibilityCrossingBinding-v0");
  if(hash64(bindingHash,"bindingHash")!==expected)throw new TypeError("Possibility crossing binding hash mismatch.");
  return deepFreeze(canonicalize(value));
}

module.exports={
  BINDING_SCHEMA,
  PROPOSAL_SCHEMA,
  acceptPossibilityCrossing,
  createPossibilityCrossingProposal,
  validatePossibilityCrossingBinding,
  validatePossibilityCrossingProposal,
};
