"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {deriveListeningField}=require("../src/nextgen/listening-field.cjs");
const {deriveRecurrenceField}=require("../src/nextgen/recurrence-field.cjs");
const {
  RECURRENCE_CHANNEL_IDS,
  deriveCreativeWeatherV1,
  validateCreativeWeatherV1,
}=require("../src/nextgen/creative-weather-v1.cjs");
const {
  beginOnePass,createOnePassSession,finishOnePass,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {compileTransitionField}=require("../src/nextgen/transition-energy.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,roleId:`lane-${index+1}`,
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

test("CreativeWeatherV1 binds recurrence field to the exact same song/form world",()=>{
  const weather=deriveCreativeWeatherV1({
    listeningField:listening(),
    recurrenceField:recurrence(),
    sampleFrames:[24,36,96,120,132],
    windowFrames:12,
  });
  assert.equal(weather.schema,"static-collective/creative-weather/v1");
  assert.equal(weather.authority,"testimony-derived-only");
  assert.equal(weather.sourceListeningFieldHash,listening().fieldHash);
  assert.equal(weather.sourceRecurrenceFieldHash,recurrence().recurrenceHash);
  assert.match(weather.weatherHash,/^[a-f0-9]{64}$/);
  validateCreativeWeatherV1(weather);
});

test("recurrence presence exists only inside admitted recurrence regions",()=>{
  const weather=deriveCreativeWeatherV1({
    listeningField:listening(),recurrenceField:recurrence(),
    sampleFrames:[24,36,96,120,132],windowFrames:12,
  });
  const strength=(frame)=>weather.samples.find(sample=>sample.frame===frame)
    .channels.find(channel=>channel.channelId===RECURRENCE_CHANNEL_IDS.PRESENCE).strength;

  assert.ok(strength(24)>0);
  assert.ok(strength(36)>0);
  assert.equal(strength(96),0);
  assert.ok(strength(120)>0);
  assert.ok(strength(132)>0);
});

test("recurrence entry is strongest at exact occurrence start and decays with distance",()=>{
  const weather=deriveCreativeWeatherV1({
    listeningField:listening(),recurrenceField:recurrence(),
    sampleFrames:[12,18,24,30],windowFrames:12,
  });
  const strength=(frame)=>weather.samples.find(sample=>sample.frame===frame)
    .channels.find(channel=>channel.channelId===RECURRENCE_CHANNEL_IDS.ENTRY).strength;

  assert.equal(strength(24),.8);
  assert.ok(strength(18)>0&&strength(18)<strength(24));
  assert.ok(strength(30)>0&&strength(30)<strength(24));
  assert.equal(strength(12),0);
});

test("recurrence weather retains exact group and occurrence evidence",()=>{
  const weather=deriveCreativeWeatherV1({
    listeningField:listening(),recurrenceField:recurrence(),
    sampleFrames:[120],windowFrames:12,
  });
  const presence=weather.samples[0].channels.find(channel=>channel.channelId===RECURRENCE_CHANNEL_IDS.PRESENCE);
  assert.deepEqual(presence.recurrenceGroupIds,["motif-A"]);
  assert.deepEqual(presence.recurrenceOccurrenceIds,["A2"]);
  assert.equal(presence.sourceRecurrenceFieldHash,recurrence().recurrenceHash);
});

test("explicit recurrence weather binding lowers transition energy only in recurrence weather",()=>{
  const p=program();
  const weather=deriveCreativeWeatherV1({
    listeningField:listening(),recurrenceField:recurrence(),
    sampleFrames:[96,120],windowFrames:12,
  });
  const make=(frame)=>compileTransitionField(p,{
    creativeWeather:weather,
    candidates:[{
      candidateId:`return-${frame}`,
      kind:"generic-relation",
      frame,
      fromState:"absent",
      toState:"return",
      baseEnergy:.8,
      weatherBindings:[{
        bindingId:"recurrence-return",
        channelId:RECURRENCE_CHANNEL_IDS.PRESENCE,
        direction:"lower",
        maxDelta:.25,
      }],
    }],
  }).transitions[0];

  const outside=make(96);
  const inside=make(120);
  assert.equal(outside.energy,.8);
  assert.ok(inside.energy<outside.energy);
  const contribution=inside.contributions.find(item=>item.kind==="weather:recurrence-presence");
  assert.ok(contribution);
  assert.equal(contribution.evidence.recurrenceFieldHash,recurrence().recurrenceHash);
  assert.deepEqual(contribution.evidence.recurrenceOccurrenceIds,["A2"]);
});

test("recurrence weather cannot be synthesized from ListeningField alone",()=>{
  assert.throws(()=>deriveCreativeWeatherV1({
    listeningField:listening(),
    recurrenceField:null,
    sampleFrames:[120],
    windowFrames:12,
  }),/RecurrenceField/i);
});

test("recurrence field must share exact ListeningField and frame geometry",()=>{
  const otherListening=(()=>{
    const form=deriveFullSongForm({durationSeconds:8,fps:24,sections:[]});
    return deriveListeningField({
      fullSongForm:form,
      songRef:{sourceSha256:"c".repeat(64),durationSeconds:8},
    });
  })();
  assert.throws(()=>deriveCreativeWeatherV1({
    listeningField:otherListening,
    recurrenceField:recurrence(),
    sampleFrames:[120],
    windowFrames:12,
  }),/ListeningField|song|form/i);
});
