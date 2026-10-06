"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validateListeningField}=require("./listening-field.cjs");

const RECURRENCE_FIELD_SCHEMA="static-collective/recurrence-field/v0";
const RECURRENCE_FIELD_POLICY="explicit-repeated-region-testimony/v0";
const RECURRENCE_AUTHORITY="testimony-only";

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
function confidence(value){
  if(value===undefined||value===null)return null;
  const number=Number(value);
  if(!Number.isFinite(number)||number<0||number>1)throw new TypeError("recurrence confidence must be finite in [0, 1].");
  return Math.round(number*1_000_000)/1_000_000;
}
function normalizeOccurrence(region,index,totalFrames){
  if(!region||typeof region!=="object"||Array.isArray(region))throw new TypeError(`recurrence region ${index} must be an object.`);
  const startFrame=whole(region.startFrame,`recurrence region ${index} startFrame`,0,totalFrames-1);
  const endFrame=whole(region.endFrame,`recurrence region ${index} endFrame`,startFrame,totalFrames-1);
  return canonicalize({
    recurrenceGroupId:req(region.recurrenceGroupId,`recurrence region ${index} recurrenceGroupId`),
    occurrenceId:req(region.occurrenceId,`recurrence region ${index} occurrenceId`),
    startFrame,
    endFrame,
    label:String(region.label||"").trim().slice(0,240),
    confidence:confidence(region.confidence),
    sourceRef:{
      kind:req(region.sourceKind,`recurrence region ${index} sourceKind`),
      sourceHash:hash64(region.sourceHash,`recurrence region ${index} sourceHash`),
      method:req(region.method,`recurrence region ${index} method`),
    },
    authority:RECURRENCE_AUTHORITY,
  });
}
function normalizeGroups(regions,totalFrames){
  if(!Array.isArray(regions))throw new TypeError("recurrence regions must be an array.");
  if(regions.length>1024)throw new TypeError("recurrence field is limited to 1024 occurrences.");
  const occurrences=regions.map((region,index)=>normalizeOccurrence(region,index,totalFrames));
  const ids=new Set();
  for(const occurrence of occurrences){
    if(ids.has(occurrence.occurrenceId))throw new TypeError(`Duplicate occurrence identity: ${occurrence.occurrenceId}.`);
    ids.add(occurrence.occurrenceId);
  }
  const grouped=new Map();
  for(const occurrence of occurrences){
    if(!grouped.has(occurrence.recurrenceGroupId))grouped.set(occurrence.recurrenceGroupId,[]);
    grouped.get(occurrence.recurrenceGroupId).push(occurrence);
  }
  const groups=[...grouped.entries()].map(([recurrenceGroupId,items])=>{
    if(items.length<2)throw new TypeError(`Recurrence group ${recurrenceGroupId} requires at least two occurrences.`);
    const ordered=[...items].sort((a,b)=>a.startFrame-b.startFrame||a.endFrame-b.endFrame||a.occurrenceId.localeCompare(b.occurrenceId));
    return canonicalize({
      recurrenceGroupId,
      authority:RECURRENCE_AUTHORITY,
      occurrenceCount:ordered.length,
      occurrences:ordered,
      sourceHashes:[...new Set(ordered.map(item=>item.sourceRef.sourceHash))].sort(),
      methods:[...new Set(ordered.map(item=>item.sourceRef.method))].sort(),
    });
  }).sort((a,b)=>a.recurrenceGroupId.localeCompare(b.recurrenceGroupId));
  return canonicalize(groups);
}
function deriveRecurrenceField({listeningField,regions=[]}={}){
  const listening=validateListeningField(listeningField);
  const groups=normalizeGroups(regions,listening.formRef.totalFrames);
  const body=canonicalize({
    schema:RECURRENCE_FIELD_SCHEMA,
    policy:RECURRENCE_FIELD_POLICY,
    authority:RECURRENCE_AUTHORITY,
    sourceListeningFieldHash:listening.fieldHash,
    songRef:listening.songRef,
    formRef:listening.formRef,
    groupCount:groups.length,
    occurrenceCount:groups.reduce((sum,group)=>sum+group.occurrenceCount,0),
    groups,
    laws:[
      "RECURRENCE TESTIMONY != SONG STRUCTURE TRUTH",
      "ONE OCCURRENCE != RECURRENCE",
      "SECTION LABEL != RECURRENCE EVIDENCE",
      "LYRIC REPETITION != RECURRENCE EVIDENCE",
      "RECURRENCE WITNESS != RETURN COMMAND",
      "CONFIDENCE != AUTHORITY",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    recurrenceHash:hashCanonical(body,"HauntedToaster-RecurrenceField-v0"),
  }));
}
function validateRecurrenceField(field){
  if(!field||typeof field!=="object"||Array.isArray(field))throw new TypeError("RecurrenceField must be an object.");
  if(field.schema!==RECURRENCE_FIELD_SCHEMA||field.policy!==RECURRENCE_FIELD_POLICY||field.authority!==RECURRENCE_AUTHORITY){
    throw new TypeError("Unsupported RecurrenceField contract.");
  }
  hash64(field.sourceListeningFieldHash,"RecurrenceField sourceListeningFieldHash");
  const totalFrames=whole(field.formRef?.totalFrames,"RecurrenceField totalFrames",1,1_000_000);
  whole(field.formRef?.fps,"RecurrenceField fps",1,240);
  if(!Array.isArray(field.groups)||field.groups.length!==field.groupCount)throw new TypeError("RecurrenceField group count mismatch.");
  let occurrenceCount=0;
  const groupIds=new Set();
  const occurrenceIds=new Set();
  for(const group of field.groups){
    const groupId=req(group.recurrenceGroupId,"RecurrenceField recurrenceGroupId");
    if(groupIds.has(groupId))throw new TypeError("RecurrenceField contains duplicate group IDs.");
    groupIds.add(groupId);
    if(group.authority!==RECURRENCE_AUTHORITY)throw new TypeError("Recurrence group authority mismatch.");
    if(!Array.isArray(group.occurrences)||group.occurrences.length<2||group.occurrences.length!==group.occurrenceCount){
      throw new TypeError("Recurrence group requires at least two occurrences.");
    }
    occurrenceCount+=group.occurrences.length;
    let prior=-1;
    for(const occurrence of group.occurrences){
      if(occurrence.authority!==RECURRENCE_AUTHORITY)throw new TypeError("Recurrence occurrence authority mismatch.");
      const id=req(occurrence.occurrenceId,"Recurrence occurrenceId");
      if(occurrenceIds.has(id))throw new TypeError("RecurrenceField contains duplicate occurrence IDs.");
      occurrenceIds.add(id);
      const start=whole(occurrence.startFrame,"Recurrence occurrence startFrame",0,totalFrames-1);
      const end=whole(occurrence.endFrame,"Recurrence occurrence endFrame",start,totalFrames-1);
      if(start<prior)throw new TypeError("Recurrence occurrences are not canonical.");
      prior=start;
      hash64(occurrence.sourceRef?.sourceHash,"Recurrence occurrence sourceHash");
      req(occurrence.sourceRef?.kind,"Recurrence occurrence source kind");
      req(occurrence.sourceRef?.method,"Recurrence occurrence source method");
      confidence(occurrence.confidence);
    }
  }
  if(occurrenceCount!==field.occurrenceCount)throw new TypeError("RecurrenceField occurrence count mismatch.");
  const sorted=[...field.groups].sort((a,b)=>a.recurrenceGroupId.localeCompare(b.recurrenceGroupId));
  if(JSON.stringify(sorted)!==JSON.stringify(field.groups))throw new TypeError("RecurrenceField groups are not canonical.");
  const {recurrenceHash,...body}=field;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-RecurrenceField-v0");
  if(recurrenceHash!==expected)throw new TypeError("RecurrenceField hash mismatch.");
  return deepFreeze(canonicalize(field));
}

module.exports={
  RECURRENCE_AUTHORITY,
  RECURRENCE_FIELD_POLICY,
  RECURRENCE_FIELD_SCHEMA,
  deriveRecurrenceField,
  validateRecurrenceField,
};
