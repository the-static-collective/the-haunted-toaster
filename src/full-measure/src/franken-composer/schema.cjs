"use strict";

const {canonicalize,deepFreeze}=require("../generation/canonical.cjs");

const FRANKEN_SCHEMA="static-collective/franken-composition/v0";
const FRANKEN_POLICY="franken-composer/v0";
const FRANKEN_FULL_SONG_SCHEMA="static-collective/franken-composition/v1";
const FRANKEN_FULL_SONG_POLICY="franken-composer/full-song-v1";
const FPS=24;
const DURATION_FRAMES=1152;
const MAX_FULL_SONG_FRAMES=1_000_000;
const SHA=/^[a-f0-9]{64}$/;
const MATERIAL_KINDS=new Set(["image","video","text","generated-shape"]);

function reqString(v,label){
  if(typeof v!=="string"||!v.trim())throw new TypeError(`${label} must be a non-empty string.`);
  return v.trim();
}
function int(v,label,min=0,max=Number.MAX_SAFE_INTEGER){
  if(!Number.isSafeInteger(v)||v<min||v>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return v;
}
function finite(v,label,min=-Infinity,max=Infinity){
  if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return v;
}
function normalizeMaterial(m){
  const kind=reqString(m?.kind,"material kind");
  if(!MATERIAL_KINDS.has(kind))throw new TypeError(`Unsupported material kind: ${kind}.`);
  const digest=reqString(m?.digest,"material digest").toLowerCase();
  if(!SHA.test(digest))throw new TypeError("Material digest must be SHA-256.");
  const derivation=m?.derivation==null?null:canonicalize(m.derivation);
  const projectionTreatment=m?.projectionTreatment==null?null:canonicalize(m.projectionTreatment);
  return {
    materialId:reqString(m.materialId,"materialId"),
    kind,
    sourceIdentity:reqString(m.sourceIdentity,"sourceIdentity"),
    digest,
    rightsBasis:reqString(m.rightsBasis,"rightsBasis"),
    admissionBasis:reqString(m.admissionBasis,"admissionBasis"),
    ...(derivation?{derivation}:{}),
    ...(projectionTreatment?{projectionTreatment}:{}),
  };
}
function normalizeTransform(t={}){
  return {
    x:finite(t.x,"transform x",-4,4),
    y:finite(t.y,"transform y",-4,4),
    scale:finite(t.scale,"transform scale",0.01,16),
    rotationDegrees:finite(t.rotationDegrees,"rotation",-3600,3600),
  };
}
function normalizeCrop(c){
  if(c==null)return null;
  if(typeof c!=="object"||Array.isArray(c))throw new TypeError("crop must be null or an object.");
  const x=finite(c.x,"crop x",0,1);
  const y=finite(c.y,"crop y",0,1);
  const width=finite(c.width,"crop width",Number.EPSILON,1);
  const height=finite(c.height,"crop height",Number.EPSILON,1);
  if(x+width>1||y+height>1)throw new RangeError("crop must stay inside the source frame.");
  return {x,y,width,height};
}
function normalizeSourceWindow(w){
  if(w==null)return null;
  if(typeof w!=="object"||Array.isArray(w))throw new TypeError("sourceWindow must be null or an object.");
  const startSeconds=finite(w.startSeconds,"sourceWindow start",0);
  const endSeconds=finite(w.endSeconds,"sourceWindow end",0);
  if(endSeconds<=startSeconds)throw new RangeError("sourceWindow must be non-empty.");
  return {startSeconds,endSeconds};
}
function normalizeTransformKeyframes(value,durationFrames){
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>4)throw new TypeError("clip transformKeyframes must contain at most four keyframes.");
  const offsets=new Set();
  return value.map((keyframe,index)=>{
    if(!keyframe||typeof keyframe!=="object"||Array.isArray(keyframe))throw new TypeError(`clip keyframe ${index} must be an object.`);
    const offsetFrames=int(keyframe.offsetFrames,`clip keyframe ${index} offsetFrames`,0,Math.max(0,durationFrames-1));
    if(offsets.has(offsetFrames))throw new TypeError("clip keyframe offsets must be unique.");
    offsets.add(offsetFrames);
    return {offsetFrames,transform:normalizeTransform(keyframe.transform)};
  }).sort((a,b)=>a.offsetFrames-b.offsetFrames);
}
function normalizeClip(c,sceneStart,sceneEnd,materialIds,compositionDuration){
  const startFrame=int(c?.startFrame,"clip startFrame",sceneStart,sceneEnd-1);
  const durationFrames=int(c?.durationFrames,"clip durationFrames",1,compositionDuration);
  if(startFrame+durationFrames>sceneEnd)throw new RangeError("clip span must stay inside its scene span.");
  const materialId=reqString(c.materialId,"clip materialId");
  if(!materialIds.has(materialId))throw new TypeError(`clip references missing material ${materialId}.`);
  const transformKeyframes=normalizeTransformKeyframes(c.transformKeyframes,durationFrames);
  return {
    clipId:reqString(c.clipId,"clipId"),
    materialId,
    startFrame,
    durationFrames,
    sourceWindow:normalizeSourceWindow(c.sourceWindow),
    transform:normalizeTransform(c.transform),
    ...(transformKeyframes.length?{transformKeyframes}:{}),
    crop:normalizeCrop(c.crop),
    opacity:finite(c.opacity,"clip opacity",0,1),
    blend:reqString(c.blend,"clip blend"),
    stackOrder:int(c.stackOrder??0,"clip stackOrder",0,999),
    entrance:reqString(c.entrance,"clip entrance"),
    transitionRelation:c.transitionRelation==null?null:reqString(c.transitionRelation,"transitionRelation"),
  };
}
function overlapCount(clips){
  let max=0;
  for(const c of clips){
    let count=0;
    for(const o of clips){
      if(c.startFrame<o.startFrame+o.durationFrames&&o.startFrame<c.startFrame+c.durationFrames)count++;
    }
    max=Math.max(max,count);
  }
  return max;
}
function normalizeScene(s,materialIds,compositionDuration){
  const sceneId=reqString(s?.sceneId,"sceneId");
  const startFrame=int(s.startFrame,`${sceneId} startFrame`,0,compositionDuration-1);
  const durationFrames=int(s.durationFrames,`${sceneId} durationFrames`,1,compositionDuration);
  const end=startFrame+durationFrames;
  if(end>compositionDuration)throw new RangeError(`${sceneId} scene span must stay inside composition duration.`);
  if(!Array.isArray(s.tracks)||s.tracks.length>8)throw new TypeError(`${sceneId} tracks must contain at most 8 tracks.`);
  const trackIds=new Set();
  const tracks=s.tracks.map(t=>{
    const trackId=reqString(t.trackId,"trackId");
    if(trackIds.has(trackId))throw new TypeError(`Duplicate trackId ${trackId}.`);
    trackIds.add(trackId);
    if(!Array.isArray(t.clips)||t.clips.length>2048)throw new TypeError(`${trackId} clips must contain at most 2048 clips.`);
    return {
      trackId,
      layer:reqString(t.layer,"track layer"),
      role:reqString(t.role,"track role"),
      clips:t.clips.map(c=>normalizeClip(c,startFrame,end,materialIds,compositionDuration)),
    };
  });
  for(const layer of new Set(tracks.filter(t=>t.layer!=="background").map(t=>t.layer))){
    const clips=tracks.filter(t=>t.layer===layer).flatMap(t=>t.clips);
    if(overlapCount(clips)>2)throw new RangeError(`Excessive overlap on layer ${layer}; at most two simultaneous non-background clips are allowed.`);
  }
  return {sceneId,startFrame,durationFrames,worldRule:reqString(s.worldRule,"worldRule"),tracks};
}
function normalizeTransition(t,sceneIds){
  const fromSceneId=reqString(t?.fromSceneId,"transition fromSceneId");
  const toSceneId=reqString(t?.toSceneId,"transition toSceneId");
  if(!sceneIds.has(fromSceneId)||!sceneIds.has(toSceneId)||fromSceneId===toSceneId)throw new TypeError("Transition references missing or identical scenes.");
  return {
    transitionId:reqString(t.transitionId,"transitionId"),
    fromSceneId,
    toSceneId,
    kind:reqString(t.kind,"transition kind"),
    durationFrames:int(t.durationFrames,"transition durationFrames",1,240),
    parameters:canonicalize(t.parameters??{}),
  };
}
function contractFor(input){
  if(input.schema===FRANKEN_SCHEMA){
    if(input.policy!==FRANKEN_POLICY)throw new TypeError(`Franken policy must be ${FRANKEN_POLICY}.`);
    if(input.fps!==FPS||input.durationFrames!==DURATION_FRAMES)throw new TypeError(`Founding Franken contract requires ${FPS} fps and ${DURATION_FRAMES} frames.`);
    return {schema:FRANKEN_SCHEMA,policy:FRANKEN_POLICY,durationFrames:DURATION_FRAMES,fullSong:false};
  }
  if(input.schema===FRANKEN_FULL_SONG_SCHEMA){
    if(input.policy!==FRANKEN_FULL_SONG_POLICY)throw new TypeError(`Full-song Franken policy must be ${FRANKEN_FULL_SONG_POLICY}.`);
    if(input.fps!==FPS)throw new TypeError(`Full-song Franken contract requires ${FPS} fps.`);
    const durationFrames=int(input.durationFrames,"full-song durationFrames",3,MAX_FULL_SONG_FRAMES);
    return {schema:FRANKEN_FULL_SONG_SCHEMA,policy:FRANKEN_FULL_SONG_POLICY,durationFrames,fullSong:true};
  }
  throw new TypeError(`Franken schema must be ${FRANKEN_SCHEMA} or ${FRANKEN_FULL_SONG_SCHEMA}.`);
}
function normalizeFrankenComposition(input){
  if(!input||typeof input!=="object"||Array.isArray(input))throw new TypeError("Franken composition must be an object.");
  const contract=contractFor(input);
  if(!Array.isArray(input.materials)||input.materials.length<1)throw new TypeError("Franken composition requires materials.");
  const materials=input.materials.map(normalizeMaterial);
  const materialIds=new Set();
  for(const m of materials){
    if(materialIds.has(m.materialId))throw new TypeError(`Duplicate materialId ${m.materialId}.`);
    materialIds.add(m.materialId);
  }
  if(!Array.isArray(input.scenes)||input.scenes.length!==3)throw new TypeError("Franken contract requires exactly three macro scenes.");
  const scenes=input.scenes.map(s=>normalizeScene(s,materialIds,contract.durationFrames));
  const expectedIds=["ARRIVE","CROSS","ASSEMBLE"];
  for(let i=0;i<scenes.length;i++){
    if(scenes[i].sceneId!==expectedIds[i])throw new TypeError(`Franken macro scene ${i} must be ${expectedIds[i]}.`);
    if(i===0&&scenes[i].startFrame!==0)throw new RangeError("Franken scenes must begin at frame zero.");
    if(i>0&&scenes[i].startFrame!==scenes[i-1].startFrame+scenes[i-1].durationFrames)throw new RangeError("Franken scene spans must be contiguous.");
  }
  const finalScene=scenes.at(-1);
  if(finalScene.startFrame+finalScene.durationFrames!==contract.durationFrames)throw new RangeError("Franken scenes must exactly cover composition duration.");
  const sceneIds=new Set(scenes.map(s=>s.sceneId));
  if(!Array.isArray(input.transitions))throw new TypeError("transitions must be an array.");
  const transitions=input.transitions.map(t=>normalizeTransition(t,sceneIds));
  const ancestry=canonicalize(input.ancestry??{});
  const receipts={...canonicalize(input.receipts??{}),policyVersion:contract.policy};
  return deepFreeze(canonicalize({
    schema:contract.schema,
    policy:contract.policy,
    compositionId:reqString(input.compositionId,"compositionId"),
    seed:reqString(input.seed,"seed"),
    fps:FPS,
    durationFrames:contract.durationFrames,
    ancestry,
    materials,
    scenes,
    transitions,
    receipts,
  }));
}
function hashDomainForPlan(plan){
  if(plan?.schema===FRANKEN_FULL_SONG_SCHEMA)return "HauntedToaster-FrankenComposition-v1";
  return "HauntedToaster-FrankenComposition-v0";
}

module.exports={
  DURATION_FRAMES,
  FPS,
  FRANKEN_FULL_SONG_POLICY,
  FRANKEN_FULL_SONG_SCHEMA,
  FRANKEN_POLICY,
  FRANKEN_SCHEMA,
  MAX_FULL_SONG_FRAMES,
  hashDomainForPlan,
  normalizeFrankenComposition,
};
