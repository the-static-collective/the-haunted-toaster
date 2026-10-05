"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");

const RESIDUE_MEMORY_SCHEMA="static-collective/residue-memory/v0";
const RESIDUE_MEMORY_POLICY="performed-topology-residue/v0";
const SCENE_ORDER=["ARRIVE","CROSS","ASSEMBLE"];
const SCENE_FRAMES=384;

function req(value,label){
  const text=String(value||"").trim();
  if(!text)throw new TypeError(`${label} is required.`);
  return text;
}
function finite(value,label,min=-Infinity,max=Infinity){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return number;
}
function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}
function sceneSpans(sourceOrTotal,totalFrames=null){
  const source=sourceOrTotal&&typeof sourceOrTotal==="object"&&!Array.isArray(sourceOrTotal)?sourceOrTotal:null;
  const total=Math.floor(finite(source?source.totalFrames:(totalFrames??sourceOrTotal),"totalFrames",1,1_000_000));
  if(source&&Array.isArray(source.sceneSpans)&&source.sceneSpans.length===3){
    let cursor=0;
    const spans=source.sceneSpans.map((span,index)=>{
      const sceneId=req(span?.sceneId,`sceneSpans[${index}].sceneId`);
      if(sceneId!==SCENE_ORDER[index])throw new TypeError(`Residue macro scene ${index} must be ${SCENE_ORDER[index]}.`);
      const startFrame=Math.floor(finite(span.startFrame,`${sceneId} startFrame`,0,total-1));
      const durationFrames=Math.floor(finite(span.durationFrames,`${sceneId} durationFrames`,1,total));
      if(startFrame!==cursor)throw new RangeError("Residue macro scene spans must be contiguous.");
      cursor=startFrame+durationFrames;
      return {sceneId,startFrame,endFrame:cursor};
    });
    if(cursor!==total)throw new RangeError("Residue macro scene spans must exactly cover totalFrames.");
    return spans;
  }
  return SCENE_ORDER.map((sceneId,index)=>{
    const startFrame=index*SCENE_FRAMES;
    if(startFrame>=total)return null;
    return {sceneId,startFrame,endFrame:Math.min(total,(index+1)*SCENE_FRAMES)};
  }).filter(Boolean);
}
function sceneSpanFor(source,sceneId,totalFrames){
  const span=sceneSpans(source,totalFrames).find(item=>item.sceneId===sceneId);
  if(!span)throw new TypeError(`Unknown residue scene: ${sceneId}.`);
  return span;
}
function validateTrace(trace){
  if(!trace||typeof trace!=="object"||Array.isArray(trace))throw new TypeError("ResidueMemory requires a PerformanceTrace object.");
  if(trace.schema!=="static-collective/performance-trace/v0")throw new TypeError("ResidueMemory requires PerformanceTrace v0.");
  if(trace.authority!=="proposal-only")throw new TypeError("PerformanceTrace must remain proposal-only.");
  if(!Array.isArray(trace.paintEvents))throw new TypeError("PerformanceTrace paintEvents must be an array.");
  if(!/^[a-f0-9]{64}$/.test(String(trace.traceHash||"")))throw new TypeError("PerformanceTrace traceHash must be 64 lowercase hex.");
  const {traceHash,...body}=trace;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-PerformanceTrace-v0");
  if(expected!==traceHash)throw new TypeError("PerformanceTrace hash mismatch.");
  return trace;
}
function strengthAtFrame(residue,frame){
  const target=Math.floor(Number(frame));
  if(!Number.isFinite(target))throw new TypeError("Residue frame must be finite.");
  if(target<residue.birthFrame)return 0;
  if(Number.isSafeInteger(residue.deathFrame)&&target>=residue.deathFrame)return 0;
  const age=target-residue.birthFrame;
  const raw=residue.initialStrength-(age*residue.decay.perFrame);
  if(raw<=residue.decay.floor)return 0;
  return Math.round(clamp(raw,0,1)*1_000_000)/1_000_000;
}
function residueFromPaint(trace,paint,index,{decayPerFrame,carryAcrossScenes,totalFrames}){
  const sceneId=req(paint?.span?.sceneId,`paintEvents[${index}].span.sceneId`);
  const startOffsetFrames=Math.floor(finite(paint?.span?.startOffsetFrames,`paintEvents[${index}].span.startOffsetFrames`,0,1_000_000));
  const durationFrames=Math.floor(finite(paint?.span?.durationFrames,`paintEvents[${index}].span.durationFrames`,1,1_000_000));
  const scene=sceneSpanFor(trace,sceneId,totalFrames);
  const birthFrame=Math.min(totalFrames-1,scene.startFrame+startOffsetFrames+durationFrames-1);
  const initialStrength=finite(paint?.brush?.amount,`paintEvents[${index}].brush.amount`,0,1);
  const localSceneEnd=scene.endFrame;
  const naturalDeath=birthFrame+Math.ceil(Math.max(0,initialStrength)/Math.max(decayPerFrame,Number.EPSILON))+1;
  const deathFrame=Math.min(
    totalFrames,
    carryAcrossScenes?naturalDeath:localSceneEnd,
  );
  return canonicalize({
    residueId:`residue:${trace.traceHash.slice(0,12)}:${index}`,
    authority:"proposal-only",
    residueClass:"performed-topology-scar",
    sourceTraceHash:trace.traceHash,
    sourcePerformanceHash:req(trace.sourcePerformanceHash,"sourcePerformanceHash"),
    sourcePaintEventId:req(paint.paintEventId,`paintEvents[${index}].paintEventId`),
    sourcePlacementId:req(paint.sourcePlacementId,`paintEvents[${index}].sourcePlacementId`),
    sourceMaterialId:req(paint.sourceMaterialId,`paintEvents[${index}].sourceMaterialId`),
    surfaceId:req(paint.surfaceId,`paintEvents[${index}].surfaceId`),
    birthSceneId:sceneId,
    birthFrame,
    deathFrame,
    initialStrength,
    decay:{
      kind:"linear",
      perFrame:decayPerFrame,
      floor:0,
    },
    carryAcrossScenes,
    ancestry:{
      brushKind:req(paint?.brush?.kind,`paintEvents[${index}].brush.kind`),
      paintMode:req(paint?.brush?.mode,`paintEvents[${index}].brush.mode`),
      ...(Number.isFinite(Number(paint?.brush?.pathLength))
        ?{pathLength:Number(paint.brush.pathLength)}
        :{}),
    },
  });
}
function compileResidueMemory(trace,{
  decayPerFrame=.0004,
  carryAcrossScenes=true,
}={}){
  const source=validateTrace(trace);
  const decay=finite(decayPerFrame,"decayPerFrame",0.000001,1);
  if(typeof carryAcrossScenes!=="boolean")throw new TypeError("carryAcrossScenes must be boolean.");
  const totalFrames=Math.floor(finite(source.totalFrames,"PerformanceTrace totalFrames",1,1_000_000));
  const residues=source.paintEvents.map((paint,index)=>residueFromPaint(
    source,
    paint,
    index,
    {decayPerFrame:decay,carryAcrossScenes,totalFrames},
  ));
  const spans=sceneSpans(source,totalFrames);
  const sceneMemory=spans.map(scene=>canonicalize({
    sceneId:scene.sceneId,
    startFrame:scene.startFrame,
    endFrame:scene.endFrame,
    residues:residues
      .map(residue=>{
        const strength=strengthAtFrame(residue,scene.startFrame);
        const exitStrength=strengthAtFrame(residue,Math.max(scene.startFrame,scene.endFrame-1));
        if(strength<=0&&exitStrength<=0)return null;
        return {
          residueId:residue.residueId,
          sourcePaintEventId:residue.sourcePaintEventId,
          sourceMaterialId:residue.sourceMaterialId,
          strength,
          exitStrength,
        };
      })
      .filter(Boolean),
  }));
  const checkpoints=[...new Set([
    0,
    ...spans.flatMap(scene=>[scene.startFrame,Math.max(scene.startFrame,scene.endFrame-1)]),
    totalFrames-1,
  ])].sort((a,b)=>a-b).map(frame=>canonicalize({
    frame,
    residues:residues.map(residue=>({
      residueId:residue.residueId,
      strength:strengthAtFrame(residue,frame),
    })).filter(item=>item.strength>0),
  }));
  const body=canonicalize({
    schema:RESIDUE_MEMORY_SCHEMA,
    policy:RESIDUE_MEMORY_POLICY,
    authority:"proposal-only",
    sourceTraceHash:source.traceHash,
    sourcePerformanceHash:source.sourcePerformanceHash,
    fps:source.fps,
    totalFrames,
    sceneSpans:spans.map(span=>({sceneId:span.sceneId,startFrame:span.startFrame,durationFrames:span.endFrame-span.startFrame})),
    decayPolicy:{
      kind:"linear",
      perFrame:decay,
      carryAcrossScenes,
    },
    residues,
    sceneMemory,
    checkpoints,
    laws:[
      "PAINT EVENT != RESIDUE",
      "RESIDUE != SOURCE",
      "RESIDUE STATE != FREEZE",
      "CARRY != AUTHORITY",
      "DECAY LAW MUST BE EXPLICIT",
      "HISTORY != DESTINY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    memoryHash:hashCanonical(body,"HauntedToaster-ResidueMemory-v0"),
  }));
}

module.exports={
  RESIDUE_MEMORY_POLICY,
  RESIDUE_MEMORY_SCHEMA,
  SCENE_FRAMES,
  SCENE_ORDER,
  compileResidueMemory,
  sceneSpans,
  strengthAtFrame,
  validateTrace,
};
