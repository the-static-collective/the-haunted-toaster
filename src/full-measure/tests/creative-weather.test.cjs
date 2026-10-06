"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  beginOnePass,createOnePassSession,finishOnePass,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {deriveListeningField}=require("../src/nextgen/listening-field.cjs");
const {
  CHANNEL_IDS,
  deriveCreativeWeather,
  validateCreativeWeather,
}=require("../src/nextgen/creative-weather.cjs");
const {compileTransitionField}=require("../src/nextgen/transition-energy.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function program(){
  let session=createOnePassSession({materials,fps:24,totalFrames:84});
  session=beginOnePass(session,0);
  const receipt=finishOnePass(session,3500).receipt;
  return compilePerformanceProgram(receipt,{regionFrames:12});
}

function listening(){
  const fullSongForm=deriveFullSongForm({
    durationSeconds:3.5,
    fps:24,
    sections:[
      {start:0,end:1,label:"Opening"},
      {start:1,end:2.5,label:"Bloom"},
      {start:2.5,end:3.5,label:"Return"},
    ],
  });
  return deriveListeningField({
    fullSongForm,
    songRef:{sourceSha256:"a".repeat(64),durationSeconds:3.5},
    alignment:{
      schema:"full-measure.lyric-alignment.v1",
      cues:[
        {lineId:"l1",text:"open",start:.5,end:.9,status:"high",confidence:.8},
        {lineId:"l2",text:"human",start:1,end:1.4,status:"human",confidence:1,humanCorrected:true},
      ],
    },
    landmarks:[
      {kind:"phrase",label:"phrase turn",compositionFrame:60},
    ],
  });
}

test("CreativeWeatherV0 samples exact frames against exact ListeningField",()=>{
  const field=listening();
  const weather=deriveCreativeWeather({
    listeningField:field,
    sampleFrames:[0,12,24,36,60,83],
    windowFrames:12,
  });
  assert.equal(weather.schema,"static-collective/creative-weather/v0");
  assert.equal(weather.authority,"testimony-derived-only");
  assert.equal(weather.sourceListeningFieldHash,field.fieldHash);
  assert.deepEqual(weather.samples.map(sample=>sample.frame),[0,12,24,36,60,83]);
  assert.match(weather.weatherHash,/^[a-f0-9]{64}$/);
  validateCreativeWeather(weather);
});

test("section edge, lyric, human anchor, and landmark are local weather not global commands",()=>{
  const weather=deriveCreativeWeather({
    listeningField:listening(),
    sampleFrames:[12,24,30,60],
    windowFrames:12,
  });
  const at=(frame,channel)=>weather.samples.find(sample=>sample.frame===frame)
    .channels.find(item=>item.channelId===channel)?.strength||0;

  assert.ok(at(24,CHANNEL_IDS.SECTION_BOUNDARY) > at(12,CHANNEL_IDS.SECTION_BOUNDARY));
  assert.ok(at(12,CHANNEL_IDS.LYRIC_PRESENCE)>0);
  assert.equal(at(30,CHANNEL_IDS.LYRIC_PRESENCE),1);
  assert.equal(at(24,CHANNEL_IDS.HUMAN_ANCHOR),1);
  assert.equal(at(60,CHANNEL_IDS.LANDMARK),1);
});

test("testimony density is bounded and names exact contributing witnesses",()=>{
  const weather=deriveCreativeWeather({
    listeningField:listening(),
    sampleFrames:[24],
    windowFrames:12,
  });
  const density=weather.samples[0].channels.find(item=>item.channelId===CHANNEL_IDS.TESTIMONY_DENSITY);
  assert.ok(density.strength>=0&&density.strength<=1);
  assert.ok(density.witnessIds.length>=1);
  assert.deepEqual([...density.witnessIds].sort(),density.witnessIds);
});

test("weather has no transition effect without an explicit candidate binding",()=>{
  const p=program();
  const weather=deriveCreativeWeather({
    listeningField:listening(),
    sampleFrames:[24],
    windowFrames:12,
  });
  const field=compileTransitionField(p,{
    creativeWeather:weather,
    candidates:[{
      candidateId:"plain",
      kind:"generic-relation",
      frame:24,
      fromState:"A",
      toState:"B",
      baseEnergy:.7,
    }],
  });
  assert.equal(field.transitions[0].energy,.7);
  assert.equal(field.transitions[0].contributions.some(item=>item.kind.startsWith("weather:")),false);
});

test("explicit weather binding lowers energy only from witnessed local channel strength",()=>{
  const p=program();
  const weather=deriveCreativeWeather({
    listeningField:listening(),
    sampleFrames:[12,24],
    windowFrames:12,
  });
  const make=(frame)=>compileTransitionField(p,{
    creativeWeather:weather,
    candidates:[{
      candidateId:`section-${frame}`,
      kind:"generic-relation",
      frame,
      fromState:"steady",
      toState:"turn",
      baseEnergy:.8,
      weatherBindings:[{
        bindingId:"section-turn",
        channelId:CHANNEL_IDS.SECTION_BOUNDARY,
        direction:"lower",
        maxDelta:.2,
      }],
    }],
  }).transitions[0];

  const far=make(12);
  const edge=make(24);
  assert.ok(edge.energy<far.energy);
  assert.ok(edge.contributions.some(item=>item.kind==="weather:section-boundary"));
  assert.equal(edge.contributions.find(item=>item.kind==="weather:section-boundary").evidence.listeningFieldHash,listening().fieldHash);
});

test("weather may explicitly raise transition energy as well as lower it",()=>{
  const p=program();
  const weather=deriveCreativeWeather({
    listeningField:listening(),
    sampleFrames:[30],
    windowFrames:12,
  });
  const transition=compileTransitionField(p,{
    creativeWeather:weather,
    candidates:[{
      candidateId:"lyric-resist",
      kind:"generic-relation",
      frame:30,
      fromState:"visible",
      toState:"vanish",
      baseEnergy:.4,
      weatherBindings:[{
        bindingId:"keep-during-lyric",
        channelId:CHANNEL_IDS.LYRIC_PRESENCE,
        direction:"raise",
        maxDelta:.15,
      }],
    }],
  }).transitions[0];
  assert.ok(transition.energy>.4);
  assert.ok(transition.contributions.some(item=>item.delta>0));
});

test("weather bindings are canonical and duplicate channels refuse",()=>{
  const p=program();
  const weather=deriveCreativeWeather({
    listeningField:listening(),
    sampleFrames:[24],
    windowFrames:12,
  });
  assert.throws(()=>compileTransitionField(p,{
    creativeWeather:weather,
    candidates:[{
      candidateId:"dupe",kind:"generic-relation",frame:24,
      fromState:"A",toState:"B",baseEnergy:.5,
      weatherBindings:[
        {bindingId:"x",channelId:CHANNEL_IDS.SECTION_BOUNDARY,direction:"lower",maxDelta:.1},
        {bindingId:"y",channelId:CHANNEL_IDS.SECTION_BOUNDARY,direction:"lower",maxDelta:.1},
      ],
    }],
  }),/duplicate weather channel/i);
});

test("weather/program clock mismatch refuses",()=>{
  const p=program();
  const otherForm=deriveFullSongForm({durationSeconds:4,fps:24,sections:[]});
  const other=deriveListeningField({
    fullSongForm:otherForm,
    songRef:{sourceSha256:"a".repeat(64),durationSeconds:4},
  });
  const weather=deriveCreativeWeather({listeningField:other,sampleFrames:[24],windowFrames:12});
  assert.throws(()=>compileTransitionField(p,{
    creativeWeather:weather,
    candidates:[{
      candidateId:"mismatch",kind:"generic-relation",frame:24,
      fromState:"A",toState:"B",baseEnergy:.5,
      weatherBindings:[{
        bindingId:"section",channelId:CHANNEL_IDS.SECTION_BOUNDARY,direction:"lower",maxDelta:.1,
      }],
    }],
  }),/clock|frame domain/i);
});

test("sample-frame order is canonical and weather is deterministic",()=>{
  const field=listening();
  const a=deriveCreativeWeather({listeningField:field,sampleFrames:[60,24,12,24],windowFrames:12});
  const b=deriveCreativeWeather({listeningField:field,sampleFrames:[12,24,60],windowFrames:12});
  assert.equal(a.weatherHash,b.weatherHash);
  assert.deepEqual(a.samples.map(sample=>sample.frame),[12,24,60]);
});
