"use strict";
const {canonicalize}=require("../generation/canonical.cjs");
const SCENES=new Set(["ARRIVE","CROSS","ASSEMBLE"]);
const TRANSITIONS=new Set(["panel-wipe","radial-reveal","cut","hinge"]);
const WORLD_RULES=new Set(["manga-room","comic-page","wrong-medium"]);
const BLENDS=new Set(["normal","screen"]);

function finite(v,label,min,max){
  const n=Number(v);
  if(!Number.isFinite(n)||n<min||n>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return n;
}
function integer(v,label,min,max){
  if(!Number.isSafeInteger(v)||v<min||v>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return v;
}
function normalizedPlacementId(value,index){
  const text=String(value||"").trim();
  if(!/^[A-Za-z0-9._:-]{1,96}$/.test(text))throw new TypeError(`digestPlacements[${index}] placementId must be a stable editor id.`);
  return text;
}
function normalizeCrop(crop,index){
  if(crop==null)return null;
  if(!crop||typeof crop!=="object"||Array.isArray(crop))throw new TypeError(`digestPlacements[${index}] crop must be null or an object.`);
  const x=finite(crop.x??0,`digestPlacements[${index}] crop x`,0,1);
  const y=finite(crop.y??0,`digestPlacements[${index}] crop y`,0,1);
  const width=finite(crop.width??1,`digestPlacements[${index}] crop width`,0.01,1);
  const height=finite(crop.height??1,`digestPlacements[${index}] crop height`,0.01,1);
  if(x+width>1||y+height>1)throw new TypeError(`digestPlacements[${index}] crop must remain inside the source frame.`);
  return {x,y,width,height};
}
function normalizeTransformKeyframes(value,index,durationFrames){
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>4)throw new TypeError(`digestPlacements[${index}] transformKeyframes must contain at most four keyframes.`);
  const offsets=new Set();
  return value.map((keyframe,keyIndex)=>{
    if(!keyframe||typeof keyframe!=="object"||Array.isArray(keyframe))throw new TypeError(`digestPlacements[${index}] keyframe ${keyIndex} must be an object.`);
    const offsetFrames=integer(keyframe.offsetFrames,`digestPlacements[${index}] keyframe offsetFrames`,0,Math.max(0,durationFrames-1));
    if(offsets.has(offsetFrames))throw new TypeError(`digestPlacements[${index}] keyframe offsets must be unique.`);
    offsets.add(offsetFrames);
    return {
      offsetFrames,
      transform:{
        x:finite(keyframe.transform?.x??0.5,`digestPlacements[${index}] keyframe x`,-1,2),
        y:finite(keyframe.transform?.y??0.5,`digestPlacements[${index}] keyframe y`,-1,2),
        scale:finite(keyframe.transform?.scale??1,`digestPlacements[${index}] keyframe scale`,0.05,8),
        rotationDegrees:finite(keyframe.transform?.rotationDegrees??0,`digestPlacements[${index}] keyframe rotation`,-720,720),
      },
    };
  }).sort((a,b)=>a.offsetFrames-b.offsetFrames);
}

function normalizeDigestPlacements(value=[]){
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>96)throw new TypeError("digestPlacements must contain at most ninety-six placements.");
  const placementIds=new Set();
  return value.map((placement,index)=>{
    if(!placement||typeof placement!=="object"||Array.isArray(placement))throw new TypeError("Each digestion placement must be an object.");
    const placementId=normalizedPlacementId(placement.placementId,index);
    if(placementIds.has(placementId))throw new TypeError("Digestion placement ids must be unique.");
    placementIds.add(placementId);
    const materialId=String(placement.materialId||"").trim();
    if(!materialId.startsWith("video-digest:"))throw new TypeError("Digestion placement materialId must name a video-digest material.");
    const sceneId=String(placement.sceneId||"").trim();
    if(!SCENES.has(sceneId))throw new TypeError("Digestion placement scene must be ARRIVE, CROSS, or ASSEMBLE.");
    const blend=String(placement.blend||"screen").trim();
    if(!BLENDS.has(blend))throw new TypeError("Digestion placement blend must be normal or screen.");
    return {
      placementId,
      materialId,
      sceneId,
      startOffsetFrames:integer(placement.startOffsetFrames??48,`digestPlacements[${index}] startOffsetFrames`,0,383),
      sourceStartFrames:integer(placement.sourceStartFrames??0,`digestPlacements[${index}] sourceStartFrames`,0,1000000),
      durationFrames:integer(placement.durationFrames??72,`digestPlacements[${index}] durationFrames`,1,384),
      transform:{
        x:finite(placement.transform?.x??0.5,`digestPlacements[${index}] x`,-1,2),
        y:finite(placement.transform?.y??0.5,`digestPlacements[${index}] y`,-1,2),
        scale:finite(placement.transform?.scale??1,`digestPlacements[${index}] scale`,0.05,8),
        rotationDegrees:finite(placement.transform?.rotationDegrees??0,`digestPlacements[${index}] rotation`,-720,720),
      },
      crop:normalizeCrop(placement.crop,index),
      opacity:finite(placement.opacity??0.72,`digestPlacements[${index}] opacity`,0,1),
      blend,
      stackOrder:integer(placement.stackOrder??30,`digestPlacements[${index}] stackOrder`,0,999),
      transformKeyframes:normalizeTransformKeyframes(placement.transformKeyframes,index,integer(placement.durationFrames??72,`digestPlacements[${index}] durationFrames`,1,384)),
    };
  });
}

function normalizeEdits(base,edits={}){
 const out={...base};
 if(edits.cardOrder!==undefined){if(!Array.isArray(edits.cardOrder)||edits.cardOrder.length!==6||new Set(edits.cardOrder).size!==6)throw new TypeError("cardOrder must contain six unique card ids.");out.cardOrder=[...edits.cardOrder];}
 if(edits.sceneRoles!==undefined){if(!edits.sceneRoles||typeof edits.sceneRoles!=="object"||Array.isArray(edits.sceneRoles))throw new TypeError("sceneRoles must be an object.");for(const [card,scene] of Object.entries(edits.sceneRoles)){if(!SCENES.has(scene))throw new TypeError(`Unsupported scene role ${scene} for ${card}.`);}out.sceneRoles={...out.sceneRoles,...edits.sceneRoles};}
 if(edits.worldRule!==undefined){if(typeof edits.worldRule!=="string"||!WORLD_RULES.has(edits.worldRule.trim()))throw new TypeError("Unsupported world rule.");out.worldRule=edits.worldRule.trim();}
 if(edits.movingTakeSceneId!==undefined){if(!SCENES.has(edits.movingTakeSceneId))throw new TypeError("Moving take scene must be ARRIVE, CROSS, or ASSEMBLE.");out.movingTakeSceneId=edits.movingTakeSceneId;}
 if(edits.transitions!==undefined){const t={...out.transitions,...edits.transitions};for(const v of Object.values(t)){if(!TRANSITIONS.has(v))throw new TypeError(`Unsupported transition ${v}.`);}out.transitions=t;}
 if(edits.text!==undefined){if(typeof edits.text!=="string"||edits.text.length>240)throw new TypeError("text must be at most 240 characters.");out.text=edits.text;}
 if(edits.variation!==undefined){if(!Number.isSafeInteger(edits.variation)||edits.variation<0||edits.variation>9999)throw new TypeError("variation must be an integer in [0, 9999].");out.variation=edits.variation;}
 if(edits.digestPlacements!==undefined)out.digestPlacements=normalizeDigestPlacements(edits.digestPlacements);
 return canonicalize(out);
}
module.exports={BLENDS,normalizeDigestPlacements,normalizeEdits,normalizeTransformKeyframes,SCENES,TRANSITIONS,WORLD_RULES};
