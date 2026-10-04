"use strict";
const {canonicalize}=require("../generation/canonical.cjs");
const SCENES=new Set(["ARRIVE","CROSS","ASSEMBLE"]);
const TRANSITIONS=new Set(["panel-wipe","radial-reveal","cut","hinge"]);
const WORLD_RULES=new Set(["manga-room","comic-page","wrong-medium"]);
function normalizeEdits(base,edits={}){
 const out={...base};
 if(edits.cardOrder!==undefined){if(!Array.isArray(edits.cardOrder)||edits.cardOrder.length!==6||new Set(edits.cardOrder).size!==6)throw new TypeError("cardOrder must contain six unique card ids.");out.cardOrder=[...edits.cardOrder];}
 if(edits.sceneRoles!==undefined){if(!edits.sceneRoles||typeof edits.sceneRoles!=="object"||Array.isArray(edits.sceneRoles))throw new TypeError("sceneRoles must be an object.");for(const [card,scene] of Object.entries(edits.sceneRoles)){if(!SCENES.has(scene))throw new TypeError(`Unsupported scene role ${scene} for ${card}.`);}out.sceneRoles={...out.sceneRoles,...edits.sceneRoles};}
 if(edits.worldRule!==undefined){if(typeof edits.worldRule!=="string"||!WORLD_RULES.has(edits.worldRule.trim()))throw new TypeError("Unsupported world rule.");out.worldRule=edits.worldRule.trim();}
 if(edits.movingTakeSceneId!==undefined){if(!SCENES.has(edits.movingTakeSceneId))throw new TypeError("Moving take scene must be ARRIVE, CROSS, or ASSEMBLE.");out.movingTakeSceneId=edits.movingTakeSceneId;}
 if(edits.transitions!==undefined){const t={...out.transitions,...edits.transitions};for(const v of Object.values(t)){if(!TRANSITIONS.has(v))throw new TypeError(`Unsupported transition ${v}.`);}out.transitions=t;}
 if(edits.text!==undefined){if(typeof edits.text!=="string"||edits.text.length>240)throw new TypeError("text must be at most 240 characters.");out.text=edits.text;}
 if(edits.variation!==undefined){if(!Number.isSafeInteger(edits.variation)||edits.variation<0||edits.variation>9999)throw new TypeError("variation must be an integer in [0, 9999].");out.variation=edits.variation;}
 return canonicalize(out);
}
module.exports={normalizeEdits,SCENES,TRANSITIONS,WORLD_RULES};
