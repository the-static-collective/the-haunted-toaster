"use strict";
const {canonicalize,deepFreeze,hashCanonical}=require("../../generation/canonical.cjs");
const SHA=/^[a-f0-9]{64}$/;
const WORLD_KEYS=new Set(["schemaVersion","id","physical","surface","transition","awakening","bridge","laws","metadata"]);
const CARD_KEYS=new Set(["id","source","front","back","traits","temperament","relationships","permissions","metadata"]);
function str(v,label){if(typeof v!=="string"||!v.trim())throw new TypeError(`${label} must be a non-empty string.`);return v.trim();}
function strings(v,label,max=16){if(v==null)return [];if(!Array.isArray(v)||v.length>max||v.some(x=>typeof x!=="string"||!x.trim()))throw new TypeError(`${label} must be a bounded string array.`);return v.map(x=>x.trim());}
function rejectUnknown(obj,allowed,label){for(const key of Object.keys(obj||{})){if(!allowed.has(key))throw new TypeError(`Unknown ${label} field: ${key}.`);}}
function adaptPlaydeck({deck,worldRule,sourceDigests}={}){
 if(!deck||deck.schemaVersion!=="0.1")throw new TypeError("Playdeck deck must use schemaVersion 0.1.");
 if(!worldRule||worldRule.schemaVersion!=="0.1")throw new TypeError("Playdeck world rule must use schemaVersion 0.1.");
 rejectUnknown(worldRule,WORLD_KEYS,"world rule");
 if(!Array.isArray(deck.cards)||deck.cards.length!==6)throw new TypeError("Founding Franken Playdeck adapter requires exactly six cards.");
 if(!sourceDigests||typeof sourceDigests!=="object")throw new TypeError("Playdeck source digests are required.");
 const ids=new Set();
 const cards=deck.cards.map((card,index)=>{
   rejectUnknown(card,CARD_KEYS,"card");
   const id=str(card.id,"card id"),source=str(card.source,"card source");
   if(ids.has(id))throw new TypeError(`Duplicate Playdeck card id ${id}.`);ids.add(id);
   const observed=String(sourceDigests[source]||"").toLowerCase();
   const declared=String(card.metadata?.sha256||"").toLowerCase();
   if(!SHA.test(observed)||!SHA.test(declared)||observed!==declared)throw new TypeError(`Playdeck source digest mismatch for ${id}.`);
   return {materialId:`playdeck:${id}`,cardId:id,source,digest:observed,orderIndex:index,traits:strings(card.traits,`${id} traits`),temperament:strings(card.temperament,`${id} temperament`),permissions:canonicalize(card.permissions??{}),relationships:canonicalize(card.relationships??[]),authority:"proposal-only"};
 });
 const requested=Array.isArray(deck.order)?deck.order.map(x=>str(x,"deck order id")):cards.map(x=>x.cardId);
 if(requested.length!==6||new Set(requested).size!==6||requested.some(x=>!ids.has(x)))throw new TypeError("Playdeck order must name each founding card exactly once.");
 const byId=new Map(cards.map(c=>[c.cardId,c]));
 const ordered=requested.map((id,i)=>({...byId.get(id),orderIndex:i}));
 const knownWorld={schemaVersion:"0.1",id:str(worldRule.id,"world rule id")};
 for(const key of ["physical","surface","transition","awakening"]){if(worldRule[key]!=null)knownWorld[key]=str(worldRule[key],`world rule ${key}`);}
 if(worldRule.bridge!=null)knownWorld.bridge=canonicalize(worldRule.bridge);
 if(worldRule.laws!=null)knownWorld.laws=strings(worldRule.laws,"world rule laws",32);
 const observation={};
 if(deck.inheritedReceipt!=null)observation.inheritedReceipt=str(deck.inheritedReceipt,"inheritedReceipt");
 if(deck.metadata?.possibilityKeep!=null)observation.possibilityKeep=canonicalize(deck.metadata.possibilityKeep);
 if(deck.metadata?.branchRelation!=null)observation.branchRelation=canonicalize(deck.metadata.branchRelation);
 const ancestry={deckId:str(deck.id,"deck id"),snapshotHash:hashCanonical({deck,worldRule,sourceDigests},"HauntedToaster-FrankenPlaydeck-v0"),authority:"observation-only",observation};
 return deepFreeze(canonicalize({authority:"proposal-only",ancestry,cards:ordered,worldRule:knownWorld}));
}
module.exports={adaptPlaydeck};
