"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {
  CHANNEL_ORDER,
  deriveCreativeWeather,
  validateCreativeWeather,
}=require("./creative-weather.cjs");
const {validateListeningField}=require("./listening-field.cjs");
const {validateRecurrenceField}=require("./recurrence-field.cjs");

const CREATIVE_WEATHER_V1_SCHEMA="static-collective/creative-weather/v1";
const CREATIVE_WEATHER_V1_POLICY="recurrence-augmented-listening-weather/v1";
const RECURRENCE_CHANNEL_IDS=Object.freeze({
  PRESENCE:"recurrence-presence",
  ENTRY:"recurrence-entry",
});
const CHANNEL_ORDER_V1=Object.freeze([
  ...CHANNEL_ORDER,
  RECURRENCE_CHANNEL_IDS.PRESENCE,
  RECURRENCE_CHANNEL_IDS.ENTRY,
]);

function q(value){
  return Math.round(Number(value)*1_000_000)/1_000_000;
}
function confidence(value){
  if(value===null||value===undefined)return 1;
  const number=Number(value);
  if(!Number.isFinite(number)||number<0||number>1)throw new TypeError("recurrence confidence must be finite in [0, 1].");
  return number;
}
function proximity(frame,startFrame,windowFrames){
  const distance=Math.abs(frame-startFrame);
  if(distance>windowFrames)return 0;
  if(windowFrames===0)return distance===0?1:0;
  return q(Math.max(0,1-(distance/windowFrames)));
}
function recurrenceOccurrences(field){
  return field.groups.flatMap(group=>
    group.occurrences.map(occurrence=>({
      ...occurrence,
      recurrenceGroupId:group.recurrenceGroupId,
    }))
  ).sort((a,b)=>a.startFrame-b.startFrame||a.endFrame-b.endFrame||a.occurrenceId.localeCompare(b.occurrenceId));
}
function recurrenceChannels(field,frame,windowFrames){
  const occurrences=recurrenceOccurrences(field);
  const active=occurrences.filter(item=>frame>=item.startFrame&&frame<=item.endFrame);
  const activeStrength=Math.max(0,...active.map(item=>confidence(item.confidence)));
  const entryCandidates=occurrences
    .map(item=>({
      item,
      strength:q(proximity(frame,item.startFrame,windowFrames)*confidence(item.confidence)),
    }))
    .filter(entry=>entry.strength>0);
  const entryStrength=Math.max(0,...entryCandidates.map(entry=>entry.strength));

  return canonicalize([
    {
      channelId:RECURRENCE_CHANNEL_IDS.PRESENCE,
      strength:q(activeStrength),
      witnessIds:[],
      recurrenceGroupIds:[...new Set(active.map(item=>item.recurrenceGroupId))].sort(),
      recurrenceOccurrenceIds:[...new Set(active.map(item=>item.occurrenceId))].sort(),
      sourceRecurrenceFieldHash:field.recurrenceHash,
      method:"active-admitted-recurrence-region",
    },
    {
      channelId:RECURRENCE_CHANNEL_IDS.ENTRY,
      strength:q(entryStrength),
      witnessIds:[],
      recurrenceGroupIds:[...new Set(entryCandidates.map(entry=>entry.item.recurrenceGroupId))].sort(),
      recurrenceOccurrenceIds:[...new Set(entryCandidates.map(entry=>entry.item.occurrenceId))].sort(),
      sourceRecurrenceFieldHash:field.recurrenceHash,
      method:"confidence-weighted-proximity-to-recurrence-entry",
    },
  ]);
}
function sameWorld(listening,recurrence){
  if(recurrence.sourceListeningFieldHash!==listening.fieldHash)throw new TypeError("RecurrenceField does not belong to this ListeningField.");
  if(recurrence.songRef?.sourceSha256!==listening.songRef?.sourceSha256)throw new TypeError("RecurrenceField song identity mismatch.");
  if(recurrence.formRef?.formHash!==listening.formRef?.formHash)throw new TypeError("RecurrenceField form identity mismatch.");
  if(Number(recurrence.formRef?.fps)!==Number(listening.formRef?.fps)||Number(recurrence.formRef?.totalFrames)!==Number(listening.formRef?.totalFrames)){
    throw new TypeError("RecurrenceField frame geometry mismatch.");
  }
}
function deriveCreativeWeatherV1({
  listeningField,
  recurrenceField,
  sampleFrames=[],
  windowFrames=24,
}={}){
  const listening=validateListeningField(listeningField);
  if(!recurrenceField)throw new TypeError("CreativeWeatherV1 requires a RecurrenceField.");
  const recurrence=validateRecurrenceField(recurrenceField);
  sameWorld(listening,recurrence);
  const base=deriveCreativeWeather({
    listeningField:listening,
    sampleFrames,
    windowFrames,
  });
  const samples=base.samples.map(sample=>canonicalize({
    frame:sample.frame,
    authority:"testimony-derived-only",
    channels:[
      ...sample.channels,
      ...recurrenceChannels(recurrence,sample.frame,base.windowFrames),
    ],
  }));
  const body=canonicalize({
    schema:CREATIVE_WEATHER_V1_SCHEMA,
    policy:CREATIVE_WEATHER_V1_POLICY,
    authority:"testimony-derived-only",
    sourceListeningFieldHash:listening.fieldHash,
    sourceRecurrenceFieldHash:recurrence.recurrenceHash,
    songRef:listening.songRef,
    formRef:listening.formRef,
    baseCreativeWeatherHash:base.weatherHash,
    windowFrames:base.windowFrames,
    sampleCount:samples.length,
    samples,
    laws:[
      "WEATHER != COMMAND",
      "RECURRENCE TESTIMONY != RETURN COMMAND",
      "ONE OCCURRENCE != RECURRENCE",
      "RECURRENCE STRENGTH != IMPORTANCE",
      "RECURRENCE WEATHER != SONG MEANING",
      "WEATHER BINDING != ACCEPTANCE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    weatherHash:hashCanonical(body,"HauntedToaster-CreativeWeather-v1"),
  }));
}
function validateCreativeWeatherV1(weather){
  if(!weather||typeof weather!=="object"||Array.isArray(weather))throw new TypeError("CreativeWeatherV1 must be an object.");
  if(weather.schema!==CREATIVE_WEATHER_V1_SCHEMA||weather.policy!==CREATIVE_WEATHER_V1_POLICY||weather.authority!=="testimony-derived-only"){
    throw new TypeError("Unsupported CreativeWeatherV1 contract.");
  }
  for(const [key,label] of [
    ["sourceListeningFieldHash","ListeningField hash"],
    ["sourceRecurrenceFieldHash","RecurrenceField hash"],
    ["baseCreativeWeatherHash","base CreativeWeather hash"],
  ]){
    if(!/^[a-f0-9]{64}$/.test(String(weather[key]||"")))throw new TypeError(`CreativeWeatherV1 ${label} is invalid.`);
  }
  const totalFrames=Number(weather.formRef?.totalFrames);
  const fps=Number(weather.formRef?.fps);
  if(!Number.isSafeInteger(totalFrames)||totalFrames<1)throw new TypeError("CreativeWeatherV1 totalFrames is invalid.");
  if(!Number.isSafeInteger(fps)||fps<1||fps>240)throw new TypeError("CreativeWeatherV1 fps is invalid.");
  if(!Number.isSafeInteger(weather.windowFrames)||weather.windowFrames<0)throw new TypeError("CreativeWeatherV1 windowFrames is invalid.");
  if(!Array.isArray(weather.samples)||weather.samples.length!==weather.sampleCount)throw new TypeError("CreativeWeatherV1 sample count mismatch.");
  let prior=-1;
  for(const sample of weather.samples){
    if(!Number.isSafeInteger(sample.frame)||sample.frame<0||sample.frame>=totalFrames||sample.frame<=prior)throw new TypeError("CreativeWeatherV1 sample frames are invalid or non-canonical.");
    prior=sample.frame;
    if(sample.authority!=="testimony-derived-only")throw new TypeError("CreativeWeatherV1 sample authority mismatch.");
    if(!Array.isArray(sample.channels)||sample.channels.length!==CHANNEL_ORDER_V1.length)throw new TypeError("CreativeWeatherV1 channel inventory mismatch.");
    const ids=sample.channels.map(channel=>channel.channelId);
    if(JSON.stringify(ids)!==JSON.stringify(CHANNEL_ORDER_V1))throw new TypeError("CreativeWeatherV1 channels are not canonical.");
    for(const channel of sample.channels){
      const strength=Number(channel.strength);
      if(!Number.isFinite(strength)||strength<0||strength>1)throw new TypeError(`CreativeWeatherV1 ${channel.channelId} strength is invalid.`);
      if(!Array.isArray(channel.witnessIds))throw new TypeError("CreativeWeatherV1 witnessIds must be an array.");
      if(channel.channelId===RECURRENCE_CHANNEL_IDS.PRESENCE||channel.channelId===RECURRENCE_CHANNEL_IDS.ENTRY){
        if(channel.sourceRecurrenceFieldHash!==weather.sourceRecurrenceFieldHash)throw new TypeError("CreativeWeatherV1 recurrence channel source mismatch.");
        if(!Array.isArray(channel.recurrenceGroupIds)||!Array.isArray(channel.recurrenceOccurrenceIds))throw new TypeError("CreativeWeatherV1 recurrence evidence lists are required.");
        if(JSON.stringify([...channel.recurrenceGroupIds].sort())!==JSON.stringify(channel.recurrenceGroupIds))throw new TypeError("CreativeWeatherV1 recurrence group IDs are not canonical.");
        if(JSON.stringify([...channel.recurrenceOccurrenceIds].sort())!==JSON.stringify(channel.recurrenceOccurrenceIds))throw new TypeError("CreativeWeatherV1 recurrence occurrence IDs are not canonical.");
      }
    }
  }
  const {weatherHash,...body}=weather;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-CreativeWeather-v1");
  if(weatherHash!==expected)throw new TypeError("CreativeWeatherV1 hash mismatch.");
  return deepFreeze(canonicalize(weather));
}
function weatherSampleAtV1(weather,frame){
  const valid=validateCreativeWeatherV1(weather);
  return valid.samples.find(sample=>sample.frame===frame)||null;
}

module.exports={
  CHANNEL_ORDER_V1,
  CREATIVE_WEATHER_V1_POLICY,
  CREATIVE_WEATHER_V1_SCHEMA,
  RECURRENCE_CHANNEL_IDS,
  deriveCreativeWeatherV1,
  validateCreativeWeatherV1,
  weatherSampleAtV1,
};
