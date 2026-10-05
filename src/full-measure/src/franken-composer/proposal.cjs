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
function normalizeDigestPlacements(value=[]){
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>6)throw new TypeError("digestPlacements must contain at most six placements.");
  const materialIds=new Set();
  return value.map((placement,index)=>{
    if(!placement||typeof placement!=="object"||Array.isArray(placement))throw new TypeError("Each digestion placement must be an object.");
    const materialId=String(placement.materialId||"").trim();
    if(!materialId.startsWith("video-digest:"))throw new TypeError("Digestion placement materialId must name a video-digest material.");
    if(materialIds.has(materialId))throw new TypeError("Each digestion descendant may be placed at most once.");
    materialIds.add(materialId);
    const sceneId=String(placement.sceneId||"").trim();
    if(!SCENES.has(sceneId))throw new TypeError("Digestion placement scene must be ARRIVE, CROSS, or ASSEMBLE.");
    const blend=String(placement.blend||"screen").trim();
    if(!BLENDS.has(blend))throw new TypeError("Digestion placement blend must be normal or screen.");
    return {
      materialId,
      sceneId,
      startOffsetFrames:integer(placement.startOffsetFrames??48,`digestPlacements[${index}] startOffsetFrames`,0,383),
      durationFrames:integer(placement.durationFrames??72,`digestPlacements[${index}] durationFrames`,1,384),
      transform:{
        x:finite(placement.transform?.x??0.5,`digestPlacements[${index}] x`,0,1),
        y:finite(placement.transform?.y??0.5,`digestPlacements[${index}] y`,0,1),
        scale:finite(placement.transform?.scale??1,`digestPlacements[${index}] scale`,0.05,4),
        rotationDegrees:finite(placement.transform?.rotationDegrees??0,`digestPlacements[${index}] rotation`,-360,360),
      },
      opacity:finite(placement.opacity??0.72,`digestPlacements[${index}] opacity`,0,1),
      blend,
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
module.exports={BLENDS,normalizeDigestPlacements,normalizeEdits,SCENES,TRANSITIONS,WORLD_RULES};
