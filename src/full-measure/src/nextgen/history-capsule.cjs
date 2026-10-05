"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {hashDomainForPlan}=require("../franken-composer/schema.cjs");

const HISTORY_CAPSULE_SCHEMA="static-collective/rendered-history-capsule/v0";
const HISTORY_CAPSULE_POLICY="render-authority-plus-context/v0";
const SHA=/^[a-f0-9]{64}$/;

function req(value,label){
  const s=String(value||"").trim();
  if(!s)throw new TypeError(`${label} is required.`);
  return s;
}
function sha(value,label){
  const s=req(value,label).toLowerCase();
  if(!SHA.test(s))throw new TypeError(`${label} must be 64 lowercase hex characters.`);
  return s;
}
function validatePlanIdentity(plan,planHash){
  if(!plan||typeof plan!=="object"||Array.isArray(plan))throw new TypeError("Rendered history requires a frozen Franken plan.");
  const expectedHash=sha(planHash,"planHash");
  const clone=canonicalize(plan);
  if(!clone.receipts||clone.receipts.planHash!==expectedHash)throw new TypeError("Rendered history plan receipt does not match planHash.");
  delete clone.receipts.planHash;
  const observed=hashCanonical(clone,hashDomainForPlan(clone));
  if(observed!==expectedHash)throw new TypeError("Rendered history refuses a mutated or mismatched frozen plan.");
  return {
    planHash:expectedHash,
    planSchema:req(plan.schema,"plan schema"),
    planPolicy:req(plan.policy,"plan policy"),
    fps:Number(plan.fps),
    durationFrames:Number(plan.durationFrames),
  };
}
function normalizeRenderedMedia(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("renderedMedia is required.");
  const out={sha256:sha(value.sha256,"renderedMedia.sha256")};
  if(value.byteLength!==undefined){
    const n=Number(value.byteLength);
    if(!Number.isSafeInteger(n)||n<1)throw new TypeError("renderedMedia.byteLength must be a positive integer.");
    out.byteLength=n;
  }
  return canonicalize(out);
}
function normalizeProjection(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("projection is required.");
  return canonicalize({
    kind:req(value.kind,"projection.kind"),
    projectionHash:sha(value.projectionHash,"projection.projectionHash"),
  });
}
function normalizeHistoricalContext(value={}){
  if(value==null)return canonicalize({authority:"context-reference-only"});
  if(typeof value!=="object"||Array.isArray(value))throw new TypeError("historicalContext must be an object.");
  const out={authority:"context-reference-only"};
  for(const key of [
    "performanceHash",
    "traceHash",
    "residueMemoryHash",
    "listeningFieldHash",
    "fullSongFormHash",
    "admittedSongSha256",
  ]){
    if(value[key]!==undefined)out[key]=sha(value[key],`historicalContext.${key}`);
  }
  return canonicalize(out);
}
function normalizeParents(parents=[]){
  if(!Array.isArray(parents)||parents.length>32)throw new TypeError("history parents must be an array of at most 32 refs.");
  const seen=new Set();
  return parents.map((parent,index)=>{
    if(!parent||typeof parent!=="object"||Array.isArray(parent))throw new TypeError(`history parent ${index} must be an object.`);
    const capsuleHash=sha(parent.capsuleHash,`parents[${index}].capsuleHash`);
    const generation=Number(parent.generation);
    if(!Number.isSafeInteger(generation)||generation<1||generation>1_000_000)throw new TypeError(`parents[${index}].generation must be a positive integer.`);
    if(seen.has(capsuleHash))throw new TypeError("history parents must be unique.");
    seen.add(capsuleHash);
    return {capsuleHash,generation};
  }).sort((a,b)=>a.generation-b.generation||a.capsuleHash.localeCompare(b.capsuleHash));
}
function validateRenderedHistoryCapsule(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError("Rendered history capsule must be an object.");
  if(value.schema!==HISTORY_CAPSULE_SCHEMA||value.policy!==HISTORY_CAPSULE_POLICY||value.authority!=="provenance-only")throw new TypeError("Unsupported rendered history capsule.");
  sha(value.renderedMedia?.sha256,"renderedMedia.sha256");
  sha(value.renderAuthority?.planHash,"renderAuthority.planHash");
  sha(value.renderAuthority?.projectionHash,"renderAuthority.projectionHash");
  if(value.renderAuthority?.authority!=="render-cause-reference")throw new TypeError("renderAuthority must remain render-cause-reference.");
  if(value.historicalContext?.authority!=="context-reference-only")throw new TypeError("historicalContext must remain context-reference-only.");
  const parents=normalizeParents(value.parents||[]);
  const expectedGeneration=parents.length?Math.max(...parents.map(parent=>parent.generation))+1:1;
  if(value.generation!==expectedGeneration)throw new TypeError("Rendered history generation does not match parent lineage.");
  const {capsuleHash,...body}=value;
  const observed=hashCanonical(canonicalize(body),"HauntedToaster-RenderedHistoryCapsule-v0");
  if(sha(capsuleHash,"capsuleHash")!==observed)throw new TypeError("Rendered history capsule hash mismatch.");
  return deepFreeze(canonicalize(value));
}
function createRenderedHistoryCapsule({
  plan,
  planHash,
  projection,
  renderedMedia,
  historicalContext={},
  parents=[],
}={}){
  const planRef=validatePlanIdentity(plan,planHash);
  const projectionRef=normalizeProjection(projection);
  const parentRefs=normalizeParents(parents);
  const generation=parentRefs.length?Math.max(...parentRefs.map(parent=>parent.generation))+1:1;
  const body=canonicalize({
    schema:HISTORY_CAPSULE_SCHEMA,
    policy:HISTORY_CAPSULE_POLICY,
    authority:"provenance-only",
    generation,
    renderedMedia:normalizeRenderedMedia(renderedMedia),
    renderAuthority:{
      authority:"render-cause-reference",
      ...planRef,
      ...projectionRef,
    },
    historicalContext:normalizeHistoricalContext(historicalContext),
    parents:parentRefs,
    laws:[
      "BYTES != HISTORY",
      "FROZEN OUTPUT != SURROUNDING HISTORY",
      "SURROUNDING HISTORY != RENDER CAUSE",
      "PROVENANCE != BEHAVIOR",
      "PAST RELATION != FUTURE AUTHORITY",
      "RECURSION != DESTINY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    capsuleHash:hashCanonical(body,"HauntedToaster-RenderedHistoryCapsule-v0"),
  }));
}
function bindHistoryToVideo({historyCapsule,sourceSha256}={}){
  const capsule=validateRenderedHistoryCapsule(historyCapsule);
  const source=sha(sourceSha256,"sourceSha256");
  if(source!==capsule.renderedMedia.sha256)throw new TypeError("History capsule bytes do not match the admitted video bytes.");
  return deepFreeze(canonicalize({
    authority:"provenance-only",
    capsuleHash:capsule.capsuleHash,
    generation:capsule.generation,
    renderedMediaSha256:capsule.renderedMedia.sha256,
    parentCapsuleHashes:capsule.parents.map(parent=>parent.capsuleHash),
  }));
}

module.exports={
  HISTORY_CAPSULE_POLICY,
  HISTORY_CAPSULE_SCHEMA,
  bindHistoryToVideo,
  createRenderedHistoryCapsule,
  validateRenderedHistoryCapsule,
};
