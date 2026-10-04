"use strict";
const {canonicalize,deepFreeze,hashCanonical}=require("../../generation/canonical.cjs");
const SHA=/^[a-f0-9]{64}$/;
const WORLD_KEYS=new Set(["schemaVersion","id","physical","surface","transition","awakening","bridge","laws","metadata"]);
const CARD_KEYS=new Set(["id","source","front","back","traits","temperament","relationships","permissions","metadata"]);
function str(v,label){if(typeof v!=="string"||!v.trim())throw new TypeError(`${label} must be a non-empty string.`);return v.trim();}
function strings(v,label,max=16){if(v==null)return [];if(!Array.isArray(v)||v.length>max||v.some(x=>typeof x!=="string"||!x.trim()))throw new TypeError(`${label} must be a bounded string array.`);return v.map(x=>x.trim());}
function rejectUnknown(obj,allowed,label){for(const key of Object.keys(obj||{})){if(!allowed.has(key))throw new TypeError(`Unknown ${label} field: ${key}.`);}}
function crop(value,label){
 if(value==null)return null;
 if(!value||typeof value!=="object"||Array.isArray(value))throw new TypeError(`${label} crop must be an object.`);
 const out={x:Number(value.x),y:Number(value.y),width:Number(value.width),height:Number(value.height)};
 for(const [key,n] of Object.entries(out)){if(!Number.isFinite(n)||n<0||n>1)throw new TypeError(`${label} crop ${key} must be within [0,1].`);}
 if(out.width<=0||out.height<=0||out.x+out.width>1.000001||out.y+out.height>1.000001)throw new TypeError(`${label} crop must stay inside the source.`);
 return canonicalize(out);
}
function adaptPlaydeck({deck,worldRule,sourceDigests,selectedCardIds}={}){
 if(!deck||deck.schemaVersion!=="0.1")throw new TypeError("Playdeck deck must use schemaVersion 0.1.");
 if(!worldRule||worldRule.schemaVersion!=="0.1")throw new TypeError("Playdeck world rule must use schemaVersion 0.1.");
 rejectUnknown(worldRule,WORLD_KEYS,"world rule");
 if(!Array.isArray(deck.cards)||deck.cards.length<6)throw new TypeError("Founding Franken Playdeck adapter requires at least six cards.");
 if(!sourceDigests||typeof sourceDigests!=="object")throw new TypeError("Playdeck source digests are required.");
 const ids=new Set();
 const allCards=deck.cards.map((card,index)=>{
   rejectUnknown(card,CARD_KEYS,"card");
   const id=str(card.id,"card id"),source=str(card.source,"card source");
   if(ids.has(id))throw new TypeError(`Duplicate Playdeck card id ${id}.`);ids.add(id);
   if(card.front?.source!=null&&str(card.front.source,`${id} front source`)!==source)throw new TypeError(`${id} uses a separate front source; founding Franken adapter requires one source identity per card.`);
   const observed=String(sourceDigests[source]||"").toLowerCase();
   const declared=card.metadata?.sha256==null?null:String(card.metadata.sha256).toLowerCase();
   if(!SHA.test(observed)||(declared!==null&&(!SHA.test(declared)||observed!==declared)))throw new TypeError(`Playdeck source digest mismatch for ${id}.`);
   return {materialId:`playdeck:${id}`,cardId:id,source,digest:observed,crop:crop(card.front?.crop,`${id} front`),orderIndex:index,traits:strings(card.traits,`${id} traits`),temperament:strings(card.temperament,`${id} temperament`),permissions:canonicalize(card.permissions??{}),relationships:canonicalize(card.relationships??[]),authority:"proposal-only"};
 });
 const traversal=Array.isArray(deck.order)?deck.order.map(x=>str(x,"deck order id")):allCards.map(x=>x.cardId);
 if(new Set(traversal).size!==traversal.length||traversal.some(x=>!ids.has(x)))throw new TypeError("Playdeck order contains duplicate or unknown card ids.");
 const requested=selectedCardIds==null?traversal.slice(0,6):selectedCardIds.map(x=>str(x,"selected card id"));
 if(requested.length!==6||new Set(requested).size!==6||requested.some(x=>!ids.has(x)))throw new TypeError("Franken Playdeck selection must name exactly six unique cards.");
 const byId=new Map(allCards.map(c=>[c.cardId,c]));
 const ordered=requested.map((id,i)=>({...byId.get(id),orderIndex:i}));
 const knownWorld={schemaVersion:"0.1",id:str(worldRule.id,"world rule id")};
 for(const key of ["physical","surface","transition","awakening"]){if(worldRule[key]!=null)knownWorld[key]=str(worldRule[key],`world rule ${key}`);}
 if(worldRule.bridge!=null)knownWorld.bridge=canonicalize(worldRule.bridge);
 if(worldRule.laws!=null)knownWorld.laws=strings(worldRule.laws,"world rule laws",32);
 const observation={};
 if(deck.inheritedReceipt!=null)observation.inheritedReceipt=str(deck.inheritedReceipt,"inheritedReceipt");
 if(deck.metadata?.possibilityKeep!=null)observation.possibilityKeep=canonicalize(deck.metadata.possibilityKeep);
 if(deck.metadata?.branchRelation!=null)observation.branchRelation=canonicalize(deck.metadata.branchRelation);
 const ancestry={deckId:str(deck.id,"deck id"),donorCardCount:deck.cards.length,selectedCardIds:requested,snapshotHash:hashCanonical({deck,worldRule,sourceDigests,selectedCardIds:requested},"HauntedToaster-FrankenPlaydeck-v0"),authority:"observation-only",observation};
 return deepFreeze(canonicalize({authority:"proposal-only",ancestry,cards:ordered,worldRule:knownWorld}));
}
module.exports={adaptPlaydeck};
