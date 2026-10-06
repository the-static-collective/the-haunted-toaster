"use strict";

const {canonicalize,deepFreeze,hashCanonical}=require("../generation/canonical.cjs");
const {validateListeningField}=require("./listening-field.cjs");

const CREATIVE_WEATHER_SCHEMA="static-collective/creative-weather/v0";
const CREATIVE_WEATHER_POLICY="bounded-listening-testimony-weather/v0";
const CHANNEL_IDS=Object.freeze({
  SECTION_BOUNDARY:"section-boundary",
  LYRIC_PRESENCE:"lyric-presence",
  HUMAN_ANCHOR:"human-anchor",
  LANDMARK:"landmark",
  TESTIMONY_DENSITY:"testimony-density",
});
const CHANNEL_ORDER=Object.freeze(Object.values(CHANNEL_IDS));

function finite(value,label,min=-Infinity,max=Infinity){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  return number;
}
function whole(value,label,min=0,max=1_000_000){
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<min||number>max)throw new TypeError(`${label} must be an integer in [${min}, ${max}].`);
  return number;
}
function q(value){
  return Math.round(Number(value)*1_000_000)/1_000_000;
}
function flattenedWitnesses(field){
  return field.lanes
    .flatMap(lane=>lane.witnesses||[])
    .slice()
    .sort((a,b)=>a.startFrame-b.startFrame||a.endFrame-b.endFrame||a.witnessId.localeCompare(b.witnessId));
}
function distanceToWitness(frame,witness){
  if(frame<witness.startFrame)return witness.startFrame-frame;
  if(frame>witness.endFrame)return frame-witness.endFrame;
  return 0;
}
function proximity(frame,witness,windowFrames){
  const distance=distanceToWitness(frame,witness);
  if(distance>windowFrames)return 0;
  if(windowFrames===0)return distance===0?1:0;
  return q(Math.max(0,1-(distance/windowFrames)));
}
function channel(channelId,strength,witnessIds,details={}){
  return canonicalize({
    channelId,
    strength:q(Math.max(0,Math.min(1,Number(strength)||0))),
    witnessIds:[...new Set(witnessIds)].sort(),
    ...details,
  });
}
function sampleChannels(field,witnesses,frame,windowFrames){
  const section=witnesses.filter(w=>w.kind==="section-boundary");
  const lyrics=witnesses.filter(w=>w.kind==="lyric-cue");
  const anchors=witnesses.filter(w=>w.kind==="human-anchor");
  const landmarks=witnesses.filter(w=>w.laneId==="landmarks");

  const sectionStrength=Math.max(0,...section.map(w=>proximity(frame,w,windowFrames)));
  const sectionIds=section.filter(w=>proximity(frame,w,windowFrames)>0).map(w=>w.witnessId);

  const activeLyrics=lyrics.filter(w=>frame>=w.startFrame&&frame<=w.endFrame);
  const lyricStrength=Math.max(0,...activeLyrics.map(w=>{
    const confidence=Number(w.confidence);
    return Number.isFinite(confidence)?Math.max(0,Math.min(1,confidence)):1;
  }));
  const lyricIds=activeLyrics.map(w=>w.witnessId);

  const anchorStrength=Math.max(0,...anchors.map(w=>proximity(frame,w,windowFrames)));
  const anchorIds=anchors.filter(w=>proximity(frame,w,windowFrames)>0).map(w=>w.witnessId);

  const landmarkStrength=Math.max(0,...landmarks.map(w=>proximity(frame,w,windowFrames)));
  const landmarkIds=landmarks.filter(w=>proximity(frame,w,windowFrames)>0).map(w=>w.witnessId);

  const nearby=witnesses.filter(w=>distanceToWitness(frame,w)<=windowFrames);
  const densityStrength=q(Math.min(1,nearby.length/8));

  return canonicalize([
    channel(CHANNEL_IDS.SECTION_BOUNDARY,sectionStrength,sectionIds,{
      method:"linear-proximity-to-section-boundary",
    }),
    channel(CHANNEL_IDS.LYRIC_PRESENCE,lyricStrength,lyricIds,{
      method:"active-lyric-cue-confidence",
    }),
    channel(CHANNEL_IDS.HUMAN_ANCHOR,anchorStrength,anchorIds,{
      method:"linear-proximity-to-human-anchor",
    }),
    channel(CHANNEL_IDS.LANDMARK,landmarkStrength,landmarkIds,{
      method:"linear-proximity-to-admitted-landmark",
    }),
    channel(CHANNEL_IDS.TESTIMONY_DENSITY,densityStrength,nearby.map(w=>w.witnessId),{
      method:"bounded-witness-count",
      witnessCount:nearby.length,
      saturationCount:8,
    }),
  ]);
}
function deriveCreativeWeather({listeningField,sampleFrames=[],windowFrames=24}={}){
  const field=validateListeningField(listeningField);
  if(!Array.isArray(sampleFrames))throw new TypeError("CreativeWeather sampleFrames must be an array.");
  const window=whole(windowFrames,"CreativeWeather windowFrames",0,10_000);
  const frames=[...new Set(sampleFrames.map((frame,index)=>whole(
    frame,
    `CreativeWeather sampleFrames[${index}]`,
    0,
    field.formRef.totalFrames-1,
  )))].sort((a,b)=>a-b);
  const witnesses=flattenedWitnesses(field);
  const samples=frames.map(frame=>canonicalize({
    frame,
    authority:"testimony-derived-only",
    channels:sampleChannels(field,witnesses,frame,window),
  }));
  const body=canonicalize({
    schema:CREATIVE_WEATHER_SCHEMA,
    policy:CREATIVE_WEATHER_POLICY,
    authority:"testimony-derived-only",
    sourceListeningFieldHash:field.fieldHash,
    songRef:field.songRef,
    formRef:field.formRef,
    windowFrames:window,
    sampleCount:samples.length,
    samples,
    laws:[
      "WEATHER != COMMAND",
      "TESTIMONY != FORCE",
      "CHANNEL STRENGTH != IMPORTANCE",
      "MISSING WITNESS != ZERO SONG FEATURE",
      "WEATHER != SONG MEANING",
      "WEATHER BINDING != ACCEPTANCE",
    ],
  });
  return deepFreeze(canonicalize({
    ...body,
    weatherHash:hashCanonical(body,"HauntedToaster-CreativeWeather-v0"),
  }));
}
function validateCreativeWeather(weather){
  if(!weather||typeof weather!=="object"||Array.isArray(weather))throw new TypeError("CreativeWeather must be an object.");
  if(weather.schema!==CREATIVE_WEATHER_SCHEMA||weather.policy!==CREATIVE_WEATHER_POLICY||weather.authority!=="testimony-derived-only"){
    throw new TypeError("Unsupported CreativeWeather contract.");
  }
  if(!/^[a-f0-9]{64}$/.test(String(weather.sourceListeningFieldHash||"")))throw new TypeError("CreativeWeather ListeningField hash is invalid.");
  const totalFrames=whole(weather.formRef?.totalFrames,"CreativeWeather totalFrames",1,1_000_000);
  whole(weather.formRef?.fps,"CreativeWeather fps",1,240);
  whole(weather.windowFrames,"CreativeWeather windowFrames",0,10_000);
  if(!Array.isArray(weather.samples)||weather.samples.length!==weather.sampleCount)throw new TypeError("CreativeWeather sample count mismatch.");
  let previous=-1;
  for(const sample of weather.samples){
    const frame=whole(sample.frame,"CreativeWeather sample frame",0,totalFrames-1);
    if(frame<=previous)throw new TypeError("CreativeWeather samples must be unique and ascending.");
    previous=frame;
    if(sample.authority!=="testimony-derived-only")throw new TypeError("CreativeWeather sample authority mismatch.");
    if(!Array.isArray(sample.channels)||sample.channels.length!==CHANNEL_ORDER.length)throw new TypeError("CreativeWeather channel inventory mismatch.");
    const observed=sample.channels.map(item=>item.channelId);
    if(JSON.stringify(observed)!==JSON.stringify(CHANNEL_ORDER))throw new TypeError("CreativeWeather channels are not canonical.");
    for(const item of sample.channels){
      finite(item.strength,`CreativeWeather ${item.channelId} strength`,0,1);
      if(!Array.isArray(item.witnessIds))throw new TypeError("CreativeWeather channel witnessIds must be an array.");
      const sorted=[...new Set(item.witnessIds)].sort();
      if(JSON.stringify(sorted)!==JSON.stringify(item.witnessIds))throw new TypeError("CreativeWeather witness IDs are not canonical.");
    }
  }
  const {weatherHash,...body}=weather;
  const expected=hashCanonical(canonicalize(body),"HauntedToaster-CreativeWeather-v0");
  if(weatherHash!==expected)throw new TypeError("CreativeWeather hash mismatch.");
  return deepFreeze(canonicalize(weather));
}
function weatherSampleAt(weather,frame){
  const valid=validateCreativeWeather(weather);
  return valid.samples.find(sample=>sample.frame===frame)||null;
}

module.exports={
  CHANNEL_IDS,
  CHANNEL_ORDER,
  CREATIVE_WEATHER_POLICY,
  CREATIVE_WEATHER_SCHEMA,
  deriveCreativeWeather,
  validateCreativeWeather,
  weatherSampleAt,
};
