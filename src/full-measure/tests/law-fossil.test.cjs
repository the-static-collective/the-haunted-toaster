"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {freezeFrankenComposition}=require("../src/franken-composer/freeze.cjs");
const {
  beginOnePass,createOnePassSession,finishOnePass,pressLane,releaseLane,sampleLanePosition,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {AXIS_IDS,compileWeirdness}=require("../src/nextgen/weirdness-compiler.cjs");
const {
  createLawFossil,validateLawFossil,
}=require("../src/nextgen/law-fossil.cjs");
const {
  bindHistoryToVideo,createRenderedHistoryCapsule,
}=require("../src/nextgen/history-capsule.cjs");
const {createVideoDigestionSix}=require("../src/render/video-digestion-six.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function program(){
  let session=createOnePassSession({materials,fps:24,totalFrames:84});
  session=beginOnePass(session,0);
  session=pressLane(session,0,200);
  session=sampleLanePosition(session,0,500,{x:.2,y:.3});
  session=sampleLanePosition(session,0,900,{x:.7,y:.6});
  session=releaseLane(session,0,1300);
  return compilePerformanceProgram(finishOnePass(session,3500).receipt,{regionFrames:12,decayPerFrame:.002});
}

function weird(){
  return compileWeirdness(program(),{axes:[
    {axisId:AXIS_IDS.COORDINATE_AGREEMENT,amount:.7},
    {axisId:AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,amount:.45},
  ]});
}

function frozen(){
  return freezeFrankenComposition({
    schema:"static-collective/franken-composition/v1",
    policy:"franken-composer/full-song-v1",
    compositionId:"law-fossil-specimen",
    seed:"law-fossil-specimen",
    fps:24,durationFrames:240,ancestry:{},
    materials:[{
      materialId:"text:one",kind:"text",sourceIdentity:"text:one:HELLO",
      digest:"1".repeat(64),rightsBasis:"local-test",admissionBasis:"local-test",
    }],
    scenes:[
      {sceneId:"ARRIVE",startFrame:0,durationFrames:80,worldRule:"threshold",tracks:[]},
      {sceneId:"CROSS",startFrame:80,durationFrames:80,worldRule:"threshold",tracks:[]},
      {sceneId:"ASSEMBLE",startFrame:160,durationFrames:80,worldRule:"threshold",tracks:[]},
    ],transitions:[],receipts:{},
  });
}

function capsule(){
  const compilation=weird();
  const fossil=createLawFossil(compilation);
  const f=frozen();
  return {
    fossil,
    capsule:createRenderedHistoryCapsule({
      plan:f.plan,planHash:f.planHash,
      projection:{kind:"ffmpeg-performance-program-witness-raster/v0",projectionHash:"2".repeat(64)},
      renderedMedia:{sha256:"3".repeat(64),byteLength:1000},
      historicalContext:{lawFossil:fossil},
    }),
  };
}

function binding(historyCapsule){
  const sourceSha256="3".repeat(64),byteLength=1000;
  return {
    schema:"haunted-toaster/video-source/v1",
    specimenId:`sha256:${sourceSha256}:${byteLength}`,
    sourceSha256,byteLength,path:"/tmp/law-fossil.mp4",filename:"law-fossil.mp4",
    probe:{durationSeconds:10,width:640,height:360,frameRate:"24/1"},
    historyCapsule,
  };
}

test("LawFossil records exact active relaxed assumptions without executable authority",()=>{
  const compilation=weird();
  const fossil=createLawFossil(compilation);
  validateLawFossil(fossil);
  assert.equal(fossil.authority,"provenance-only");
  assert.equal(fossil.weirdnessCompilationHash,compilation.compilationHash);
  assert.equal(fossil.sourceProgramHash,compilation.sourceProgramHash);
  assert.equal(fossil.compiledProgramHash,compilation.compiledProgramHash);
  assert.deepEqual(fossil.axes.map(axis=>axis.axisId),[
    AXIS_IDS.COORDINATE_AGREEMENT,
    AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,
  ]);
  assert.ok(fossil.laws.includes("LAW FOSSIL != ACTIVE LAW"));
});

test("unchanged world does not mint a relaxed-law fossil",()=>{
  assert.throws(()=>createLawFossil(compileWeirdness(program(),{axes:[]})),/no relaxed assumptions/i);
});

test("render history binds a bounded law fossil ref to exact media bytes",()=>{
  const {fossil,capsule:historyCapsule}=capsule();
  const ref=bindHistoryToVideo({historyCapsule,sourceSha256:"3".repeat(64)});
  assert.equal(ref.lawFossilRef.lawFossilHash,fossil.lawFossilHash);
  assert.equal(ref.lawFossilRef.weirdnessCompilationHash,fossil.weirdnessCompilationHash);
  assert.deepEqual(ref.lawFossilRef.axes,fossil.axes.map(({axisId,amount})=>({axisId,amount})));
  assert.equal(ref.lawFossilRef.authority,"provenance-only");
});

test("all six compost descendants inherit law fossil evidence but no active weirdness binding",()=>{
  const {fossil,capsule:historyCapsule}=capsule();
  const family=createVideoDigestionSix({
    videoBinding:binding(historyCapsule),
    timeline:{durationTicks:240,timebase:24},
    analysisDurationSeconds:10,
    historyCapsule,
  });
  assert.equal(family.sourceHistoryRef.lawFossilRef.lawFossilHash,fossil.lawFossilHash);
  for(const descendant of family.descendants){
    assert.equal(descendant.historyRef.lawFossilRef.lawFossilHash,fossil.lawFossilHash);
    assert.equal(Object.prototype.hasOwnProperty.call(descendant,"weirdness"),false);
    assert.equal(Object.prototype.hasOwnProperty.call(descendant.plan,"weirdness"),false);
  }
});

test("different relaxed-law histories produce distinct compost family identities for same bytes",()=>{
  const base=program();
  const make=(axisId)=>createLawFossil(compileWeirdness(base,{axes:[{axisId,amount:.8}]}));
  const wrap=(fossil)=>{
    const f=frozen();
    return createRenderedHistoryCapsule({
      plan:f.plan,planHash:f.planHash,
      projection:{kind:"witness",projectionHash:"2".repeat(64)},
      renderedMedia:{sha256:"3".repeat(64),byteLength:1000},
      historicalContext:{lawFossil:fossil},
    });
  };
  const a=wrap(make(AXIS_IDS.COORDINATE_AGREEMENT));
  const b=wrap(make(AXIS_IDS.HISTORY_DECAY_AGREEMENT));
  const fa=createVideoDigestionSix({
    videoBinding:binding(a),timeline:{durationTicks:240,timebase:24},analysisDurationSeconds:10,historyCapsule:a,
  });
  const fb=createVideoDigestionSix({
    videoBinding:binding(b),timeline:{durationTicks:240,timebase:24},analysisDurationSeconds:10,historyCapsule:b,
  });
  assert.equal(fa.sourceSha256,fb.sourceSha256);
  assert.notEqual(fa.familyHash,fb.familyHash);
  assert.notEqual(fa.sourceHistoryRef.lawFossilRef.lawFossilHash,fb.sourceHistoryRef.lawFossilRef.lawFossilHash);
});
