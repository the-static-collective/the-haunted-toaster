"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  beginOnePass,createOnePassSession,finishOnePass,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {deriveListeningField}=require("../src/nextgen/listening-field.cjs");
const {deriveRecurrenceField}=require("../src/nextgen/recurrence-field.cjs");
const {deriveCreativeWeatherV1,RECURRENCE_CHANNEL_IDS}=require("../src/nextgen/creative-weather-v1.cjs");
const {
  compilePossibilityMap,
  uniformSampleFrames,
  validatePossibilityMap,
}=require("../src/nextgen/possibility-map.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function program(){
  let session=createOnePassSession({materials,fps:24,totalFrames:192});
  session=beginOnePass(session,0);
  return compilePerformanceProgram(finishOnePass(session,8000).receipt,{regionFrames:24});
}
function listening(){
  const fullSongForm=deriveFullSongForm({
    durationSeconds:8,fps:24,
    sections:[
      {start:0,end:2,label:"Opening"},
      {start:2,end:5,label:"Middle"},
      {start:5,end:8,label:"Return"},
    ],
  });
  return deriveListeningField({
    fullSongForm,
    songRef:{sourceSha256:"a".repeat(64),durationSeconds:8},
  });
}
function recurrence(){
  return deriveRecurrenceField({
    listeningField:listening(),
    regions:[
      {
        recurrenceGroupId:"motif-A",occurrenceId:"A1",
        startFrame:24,endFrame:47,label:"first",
        confidence:.8,sourceKind:"self-similarity-analysis",
        sourceHash:"b".repeat(64),method:"bounded-self-similarity-v1",
      },
      {
        recurrenceGroupId:"motif-A",occurrenceId:"A2",
        startFrame:120,endFrame:143,label:"return",
        confidence:.9,sourceKind:"self-similarity-analysis",
        sourceHash:"b".repeat(64),method:"bounded-self-similarity-v1",
      },
    ],
  });
}
function frames(){
  return [0,12,24,36,48,60,72,84,96,108,120,132,144,156,168,180,191];
}
function weather(){
  return deriveCreativeWeatherV1({
    listeningField:listening(),
    recurrenceField:recurrence(),
    sampleFrames:frames(),
    windowFrames:12,
  });
}
function candidate(){
  return {
    candidateId:"return-with-altered-clock",
    kind:"generic-relation",
    fromState:"absent",
    toState:"return",
    baseEnergy:.8,
    weatherBindings:[{
      bindingId:"return-in-recurrence",
      channelId:RECURRENCE_CHANNEL_IDS.PRESENCE,
      direction:"lower",
      maxDelta:.25,
    }],
  };
}

test("PossibilityMapV0 asks one crossing question across exact song frames",()=>{
  const map=compilePossibilityMap(program(),{
    candidate:candidate(),
    sampleFrames:frames(),
    creativeWeather:weather(),
  });
  assert.equal(map.schema,"static-collective/possibility-map/v0");
  assert.equal(map.authority,"observational-only");
  assert.equal(map.sourceCandidateId,"return-with-altered-clock");
  assert.equal(map.pointCount,frames().length);
  assert.deepEqual(map.points.map(point=>point.frame),frames());
  assert.ok(map.points.every(point=>point.fromState==="absent"&&point.toState==="return"));
  assert.match(map.mapHash,/^[a-f0-9]{64}$/);
  validatePossibilityMap(map);
});

test("same crossing becomes cheap only in admitted recurrence seasons",()=>{
  const map=compilePossibilityMap(program(),{
    candidate:candidate(),
    sampleFrames:frames(),
    creativeWeather:weather(),
  });
  const energy=(frame)=>map.points.find(point=>point.frame===frame).energy;
  assert.equal(energy(96),.8);
  assert.ok(energy(120)<.8);
  assert.ok(energy(132)<.8);
  assert.equal(energy(156),.8);
  assert.ok(map.points.find(point=>point.frame===120).contributionKinds.includes("weather:recurrence-presence"));
});

test("map summarizes observed energy range without recommending minima",()=>{
  const map=compilePossibilityMap(program(),{
    candidate:candidate(),
    sampleFrames:frames(),
    creativeWeather:weather(),
  });
  assert.equal(map.energyRange.max,.8);
  assert.ok(map.energyRange.min<map.energyRange.max);
  assert.ok(map.minimumObserved.frames.includes(120)||map.minimumObserved.frames.includes(132));
  const serialized=JSON.stringify(map);
  assert.equal(serialized.includes("recommended"),false);
  assert.equal(serialized.includes("selected"),false);
  assert.ok(map.laws.includes("MINIMUM OBSERVED ENERGY != RECOMMENDATION"));
});

test("each point preserves the exact transition-energy evidence ledger",()=>{
  const w=weather();
  const map=compilePossibilityMap(program(),{
    candidate:candidate(),
    sampleFrames:frames(),
    creativeWeather:w,
  });
  const point=map.points.find(item=>item.frame===120);
  const weatherContribution=point.contributions.find(item=>item.kind==="weather:recurrence-presence");
  assert.equal(weatherContribution.evidence.weatherHash,w.weatherHash);
  assert.equal(weatherContribution.evidence.recurrenceFieldHash,recurrence().recurrenceHash);
  assert.deepEqual(weatherContribution.evidence.recurrenceOccurrenceIds,["A2"]);
  assert.match(point.transitionHash,/^[a-f0-9]{64}$/);
});

test("sample order is canonical and does not alter map identity",()=>{
  const p=program(),w=weather();
  const a=compilePossibilityMap(p,{
    candidate:candidate(),
    sampleFrames:frames(),
    creativeWeather:w,
  });
  const b=compilePossibilityMap(p,{
    candidate:candidate(),
    sampleFrames:[...frames()].reverse(),
    creativeWeather:w,
  });
  assert.equal(a.mapHash,b.mapHash);
  assert.deepEqual(a,b);
});

test("uniform sampler includes both song endpoints and stays bounded",()=>{
  assert.deepEqual(uniformSampleFrames({totalFrames:10,maxSamples:2}),[0,9]);
  const sampled=uniformSampleFrames({totalFrames:192,maxSamples:32});
  assert.equal(sampled[0],0);
  assert.equal(sampled.at(-1),191);
  assert.ok(sampled.length<=32);
  assert.deepEqual([...new Set(sampled)],sampled);
});

test("map refuses candidate frame smuggling and missing weather samples",()=>{
  assert.throws(()=>compilePossibilityMap(program(),{
    candidate:{...candidate(),frame:99},
    sampleFrames:frames(),
    creativeWeather:weather(),
  }),/frame.*map/i);

  const sparseWeather=deriveCreativeWeatherV1({
    listeningField:listening(),
    recurrenceField:recurrence(),
    sampleFrames:[0,120],
    windowFrames:12,
  });
  assert.throws(()=>compilePossibilityMap(program(),{
    candidate:candidate(),
    sampleFrames:[0,12,120],
    creativeWeather:sparseWeather,
  }),/no sample/i);
});

test("candidate without weather bindings maps without CreativeWeather",()=>{
  const map=compilePossibilityMap(program(),{
    candidate:{
      candidateId:"plain-crossing",
      kind:"generic-relation",
      fromState:"A",
      toState:"B",
      baseEnergy:.63,
    },
    sampleFrames:[0,48,96,144,191],
  });
  assert.ok(map.points.every(point=>point.energy===.63));
  assert.equal(map.creativeWeatherRef,null);
});
