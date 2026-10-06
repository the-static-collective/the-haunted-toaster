"use strict";

const {canonicalize,deepFreeze}=require("../generation/canonical.cjs");
const {strengthAtFrame}=require("./residue-memory.cjs");

const CROSSING_EXECUTION_SCHEMA="static-collective/crossing-execution-description/v0";

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
function validateCrossingExecution(program){
  const execution=program?.crossingExecution;
  if(execution===undefined||execution===null)return null;
  if(!execution||typeof execution!=="object"||Array.isArray(execution))throw new TypeError("crossingExecution must be an object.");
  if(execution.schema!==CROSSING_EXECUTION_SCHEMA)throw new TypeError("Unsupported crossingExecution schema.");
  if(execution.authority!=="accepted-relation-execution-description-only")throw new TypeError("crossingExecution authority mismatch.");
  if(execution.kind!=="scar-wake")throw new TypeError(`Unsupported crossingExecution kind: ${String(execution.kind||"")}.`);
  hash64(execution.sourceBindingHash,"crossingExecution sourceBindingHash");
  hash64(execution.sourceProgramHash,"crossingExecution sourceProgramHash");
  if(execution.sourceProgramHash===program.programHash)throw new TypeError("crossingExecution sourceProgramHash must name the parent program, not itself.");
  const targetResidueId=req(execution.targetResidueId,"crossingExecution targetResidueId");
  const residue=(program.residueMemory?.residues||[]).find(item=>item.residueId===targetResidueId);
  if(!residue)throw new TypeError(`crossingExecution target residue is absent: ${targetResidueId}.`);
  whole(execution.activationFrame,"crossingExecution activationFrame",0,program.totalFrames-1);
  finite(execution.wakeStrength,"crossingExecution wakeStrength",0.000001,1);
  finite(execution.decayPerFrame,"crossingExecution decayPerFrame",0.000001,1);
  if(!Array.isArray(execution.laws)||!execution.laws.includes("SCAR WAKE != HISTORY REWRITE"))throw new TypeError("crossingExecution founding law is missing.");
  return execution;
}
function wakeStrengthAtFrame(execution,frame){
  if(!execution)return 0;
  const target=Math.floor(Number(frame));
  if(!Number.isFinite(target)||target<execution.activationFrame)return 0;
  const age=target-execution.activationFrame;
  const raw=Number(execution.wakeStrength)-(age*Number(execution.decayPerFrame));
  return Math.max(0,Math.round(raw*1_000_000)/1_000_000);
}
function effectiveResidueStrength(program,residue,frame){
  const base=strengthAtFrame(residue,frame);
  const execution=validateCrossingExecution(program);
  if(!execution||execution.targetResidueId!==residue.residueId)return base;
  const wake=wakeStrengthAtFrame(execution,frame);
  return Math.max(base,wake);
}
function changedFramesForExecution(program){
  const execution=validateCrossingExecution(program);
  if(!execution)return [];
  const residue=program.residueMemory.residues.find(item=>item.residueId===execution.targetResidueId);
  const changed=[];
  for(let frame=0;frame<program.totalFrames;frame++){
    const base=strengthAtFrame(residue,frame);
    const effective=effectiveResidueStrength(program,residue,frame);
    if(Math.abs(effective-base)>0.0000005)changed.push(frame);
  }
  return deepFreeze(canonicalize(changed));
}
function compressFrames(frames=[]){
  if(!Array.isArray(frames))throw new TypeError("frames must be an array.");
  const ordered=[...new Set(frames.map(value=>whole(value,"changed frame")))].sort((a,b)=>a-b);
  if(!ordered.length)return [];
  const spans=[];
  let start=ordered[0],prior=ordered[0];
  for(const frame of ordered.slice(1)){
    if(frame===prior+1){prior=frame;continue;}
    spans.push({startFrame:start,endFrameExclusive:prior+1,frameCount:(prior+1)-start});
    start=prior=frame;
  }
  spans.push({startFrame:start,endFrameExclusive:prior+1,frameCount:(prior+1)-start});
  return deepFreeze(canonicalize(spans));
}

module.exports={
  CROSSING_EXECUTION_SCHEMA,
  changedFramesForExecution,
  compressFrames,
  effectiveResidueStrength,
  validateCrossingExecution,
  wakeStrengthAtFrame,
};
