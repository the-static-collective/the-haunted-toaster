"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validatePerformanceProgram}=require("./performance-program.cjs");
const {compileTransitionField,validateTransitionField}=require("./transition-energy.cjs");

const POSSIBILITY_MAP_SCHEMA="static-collective/possibility-map/v0";
const POSSIBILITY_MAP_POLICY="one-crossing-over-song-time/v0";

function req(value,label){
  const text=String(value||"").trim();
  if(!text)throw new TypeError(`${label} is required.`);
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
  return number;
}
function hash64(value,label){
  const text=req(value,label).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(text))throw new TypeError(`${label} must be 64 lowercase hex characters.`);
  return text;
}
function q(value){
  return Math.round(Number(value)*1_000_000)/1_000_000;
}
function uniformSampleFrames({totalFrames,maxSamples=128}={}){
  const total=whole(totalFrames,"totalFrames",1,1_000_000);
  const limit=whole(maxSamples,"maxSamples",2,256);
  if(total===1)return [0];
  const count=Math.min(total,limit);
  if(count===2)return [0,total-1];
  const frames=[];
  for(let index=0;index<count;index++){
    frames.push(Math.round((index*(total-1))/(count-1)));
  }
  return [...new Set(frames)].sort((a,b)=>a-b);
}
function normalizeSampleFrames(frames,totalFrames){
  if(!Array.isArray(frames)||frames.length<1)throw new TypeError("PossibilityMap sampleFrames must be a non-empty array.");
  if(frames.length>256)throw new TypeError("PossibilityMap is limited to 256 sampled frames.");
  return [...new Set(frames.map((frame,index)=>whole(
    frame,
    `PossibilityMap sampleFrames[${index}]`,
    0,
    totalFrames-1,
  )))].sort((a,b)=>a-b);
}
function normalizeCandidate(candidate){
  if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))throw new TypeError("PossibilityMap candidate must be an object.");
  if(Object.prototype.hasOwnProperty.call(candidate,"frame"))throw new TypeError("PossibilityMap owns candidate frame; candidate frame must not be supplied.");
  const sourceCandidateId=req(candidate.candidateId,"PossibilityMap candidateId");
  const spec=canonicalize({...candidate});
  delete spec.candidateId;
  return {sourceCandidateId,spec};
}
function pointFromTransition(transition,sourceCandidateId){
  return canonicalize({
    frame:transition.frame,
    sourceCandidateId,
    transitionHash:transition.transitionHash,
    kind:transition.kind,
    fromState:transition.fromState,
    toState:transition.toState,
    baseEnergy:transition.baseEnergy,
    totalDelta:transition.totalDelta,
    energy:transition.energy,
    contributionKinds:(transition.contributions||[]).map(item=>item.kind),
    contributions:transition.contributions||[],
  });
}
function observedRange(points){
  const energies=points.map(point=>finite(point.energy,"PossibilityMap point energy",0,1));
  const min=q(Math.min(...energies));
  const max=q(Math.max(...energies));
  const minFrames=points.filter(point=>point.energy===min).map(point=>point.frame);
  const maxFrames=points.filter(point=>point.energy===max).map(point=>point.frame);
  return {
    energyRange:{min,max},
    minimumObserved:{energy:min,frames:minFrames},
    maximumObserved:{energy:max,frames:maxFrames},
  };
}
function compilePossibilityMap(program,{
  candidate,
  sampleFrames,
  creativeWeather=null,
}={}){
  const source=validatePerformanceProgram(program);
  const frames=normalizeSampleFrames(sampleFrames,source.totalFrames);
  const {sourceCandidateId,spec}=normalizeCandidate(candidate);
  const candidates=frames.map(frame=>canonicalize({
    candidateId:`${sourceCandidateId}@frame:${String(frame).padStart(8,"0")}`,
    ...spec,
    frame,
  }));
  const field=compileTransitionField(source,{
    candidates,
    creativeWeather,
  });
  const byId=new Map(field.transitions.map(transition=>[transition.candidateId,transition]));
  const points=frames.map(frame=>{
    const id=`${sourceCandidateId}@frame:${String(frame).padStart(8,"0")}`;
    const transition=byId.get(id);
    if(!transition)throw new TypeError(`PossibilityMap missing transition for sampled frame ${frame}.`);
    return pointFromTransition(transition,sourceCandidateId);
  });
  const range=observedRange(points);
  const body=canonicalize({
    schema:POSSIBILITY_MAP_SCHEMA,
    policy:POSSIBILITY_MAP_POLICY,
    authority:"observational-only",
    sourceProgramHash:source.programHash,
    sourcePerformanceHash:source.sourcePerformanceHash,
    sourceTransitionFieldHash:field.fieldHash,
    sourceCandidateId,
    candidateSpec:spec,
    fps:source.fps,
    totalFrames:source.totalFrames,
    creativeWeatherRef:field.creativeWeatherRef||null,
    pointCount:points.length,
    points,
    ...range,
    laws:[
      "MAP != SELECTION",
      "CURVE != RECOMMENDATION",
      "MINIMUM OBSERVED ENERGY != RECOMMENDATION",
      "SAMPLED POINT != INTERPOLATED TRUTH",
      "LOWER TRANSITION COST != TAKE TRANSITION",
      "ENERGY != VALUE",
      "ENERGY != PROBABILITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    mapHash:hashCanonical(body,"HauntedToaster-PossibilityMap-v0"),
  }));
}
function validatePossibilityMap(map){
  if(!map||typeof map!=="object"||Array.isArray(map))throw new TypeError("PossibilityMap must be an object.");
  if(map.schema!==POSSIBILITY_MAP_SCHEMA||map.policy!==POSSIBILITY_MAP_POLICY||map.authority!=="observational-only"){
    throw new TypeError("Unsupported PossibilityMap contract.");
  }
  hash64(map.sourceProgramHash,"PossibilityMap sourceProgramHash");
  hash64(map.sourcePerformanceHash,"PossibilityMap sourcePerformanceHash");
  hash64(map.sourceTransitionFieldHash,"PossibilityMap sourceTransitionFieldHash");
  req(map.sourceCandidateId,"PossibilityMap sourceCandidateId");
  const fps=whole(map.fps,"PossibilityMap fps",1,240);
  const totalFrames=whole(map.totalFrames,"PossibilityMap totalFrames",1,1_000_000);
  if(!Array.isArray(map.points)||map.points.length!==map.pointCount||map.points.length<1||map.points.length>256){
    throw new TypeError("PossibilityMap point count mismatch.");
  }
  let prior=-1;
  for(const point of map.points){
    const frame=whole(point.frame,"PossibilityMap point frame",0,totalFrames-1);
    if(frame<=prior)throw new TypeError("PossibilityMap points must be unique and ascending.");
    prior=frame;
    if(point.sourceCandidateId!==map.sourceCandidateId)throw new TypeError("PossibilityMap point candidate identity mismatch.");
    hash64(point.transitionHash,"PossibilityMap point transitionHash");
    finite(point.baseEnergy,"PossibilityMap point baseEnergy",0,1);
    finite(point.totalDelta,"PossibilityMap point totalDelta",-1,1);
    finite(point.energy,"PossibilityMap point energy",0,1);
    if(!Array.isArray(point.contributionKinds)||!Array.isArray(point.contributions))throw new TypeError("PossibilityMap point contribution inventory is invalid.");
    if(JSON.stringify(point.contributionKinds)!==JSON.stringify(point.contributions.map(item=>item.kind))){
      throw new TypeError("PossibilityMap contribution kinds do not match contribution ledger.");
    }
  }
  const observed=observedRange(map.points);
  if(JSON.stringify(observed.energyRange)!==JSON.stringify(map.energyRange))throw new TypeError("PossibilityMap energy range mismatch.");
  if(JSON.stringify(observed.minimumObserved)!==JSON.stringify(map.minimumObserved))throw new TypeError("PossibilityMap minimum observation mismatch.");
  if(JSON.stringify(observed.maximumObserved)!==JSON.stringify(map.maximumObserved))throw new TypeError("PossibilityMap maximum observation mismatch.");
  if(map.creativeWeatherRef!==null){
    if(!map.creativeWeatherRef||map.creativeWeatherRef.authority!=="testimony-derived-only")throw new TypeError("PossibilityMap CreativeWeather ref is invalid.");
    hash64(map.creativeWeatherRef.weatherHash,"PossibilityMap weatherHash");
  }
  const {mapHash,...body}=map;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-PossibilityMap-v0");
  if(hash64(mapHash,"PossibilityMap mapHash")!==expected)throw new TypeError("PossibilityMap hash mismatch.");
  return deepFreeze(canonicalize(map));
}

module.exports={
  POSSIBILITY_MAP_POLICY,
  POSSIBILITY_MAP_SCHEMA,
  compilePossibilityMap,
  uniformSampleFrames,
  validatePossibilityMap,
};
