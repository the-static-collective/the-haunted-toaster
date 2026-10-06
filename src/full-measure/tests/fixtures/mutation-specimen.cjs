"use strict";
const {beginOnePass,createOnePassSession,finishOnePass,pressLane,releaseLane,fingerprint256,stableStringify}=require("../../src/renderer/one-pass.js");
const {hashCanonical,canonicalize}=require("../../src/generation/canonical.cjs");
const {bindHistoryToVideo}=require("../../src/nextgen/history-capsule.cjs");
const {compileGenerationalEcology}=require("../../src/nextgen/generational-ecology.cjs");
function clone(value){return JSON.parse(JSON.stringify(value));}
function reseal(value){const {performanceHash,...body}=clone(value);return {...body,performanceHash:fingerprint256(stableStringify(body))};}
function take(){
  const materials=Array.from({length:6},(_,i)=>({slot:i+1,roleId:`lane-${i+1}`,materialId:`material-${i}`,sourceDurationFrames:120}));
  let s=beginOnePass(createOnePassSession({materials,fps:24,totalFrames:96}),0);
  s=releaseLane(pressLane(s,0,100),0,900);
  s=releaseLane(pressLane(s,1,1500),1,2300);
  return finishOnePass(s,4000).receipt;
}
function capsuleFor(receipt,seed="a"){
  const ecology=compileGenerationalEcology({performanceReceipts:[receipt]});
  const body=canonicalize({
    schema:"static-collective/rendered-history-capsule/v0",policy:"render-authority-plus-context/v0",authority:"provenance-only",
    generation:ecology.performances[0].generation,renderedMedia:{sha256:seed.repeat(64),byteLength:1},
    renderAuthority:{authority:"render-cause-reference",planHash:"b".repeat(64),planSchema:"fixture-plan/v0",planPolicy:"fixture/v0",fps:receipt.fps,durationFrames:receipt.totalFrames,kind:"fixture",projectionHash:"c".repeat(64)},
    historicalContext:{authority:"context-reference-only",performanceHash:receipt.performanceHash},
    parents:ecology.historyNodes.filter(n=>ecology.performances[0].parentCapsuleHashes.includes(n.capsuleHash)).map(n=>({capsuleHash:n.capsuleHash,generation:n.generation})),laws:["LAW FOSSIL != ACTIVE LAW"],
  });
  return {...body,capsuleHash:hashCanonical(body,"HauntedToaster-RenderedHistoryCapsule-v0")};
}
function specimen(mutate=()=>{},parentReceipt=take()){
  const capsule=capsuleFor(parentReceipt);
  const child=clone(parentReceipt);
  child.materials[0].historyRef=bindHistoryToVideo({historyCapsule:capsule,sourceSha256:capsule.renderedMedia.sha256});
  mutate(child);
  return {performanceReceipts:[reseal(child)],parentEvidence:[{historyCapsule:capsule,performanceReceipt:parentReceipt}]};
}
function fossilRef(seed="d",amount=.4){return {schema:"static-collective/law-fossil-ref/v0",authority:"provenance-only",lawFossilHash:seed.repeat(64),weirdnessCompilationHash:"e".repeat(64),sourceProgramHash:"f".repeat(64),compiledProgramHash:"1".repeat(64),axes:[{axisId:"gravity-slip",amount}],laws:["LAW FOSSIL REF != ACTIVE LAW","ANCESTRY != REACTIVATION"]};}
function historyRef(seed="2",fossil=null){return {authority:"provenance-only",capsuleHash:seed.repeat(64),generation:1,renderedMediaSha256:"3".repeat(64),parentCapsuleHashes:[],...(fossil?{lawFossilRef:fossil}:{})};}
module.exports={clone,reseal,take,capsuleFor,specimen,fossilRef,historyRef};
