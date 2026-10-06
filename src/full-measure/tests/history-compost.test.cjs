"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {freezeFrankenComposition}=require("../src/franken-composer/freeze.cjs");
const {createRenderedHistoryCapsule}=require("../src/nextgen/history-capsule.cjs");
const {createVideoDigestionSix}=require("../src/render/video-digestion-six.cjs");

function frozen(){
  return freezeFrankenComposition({
    schema:"static-collective/franken-composition/v0",
    policy:"franken-composer/v0",
    compositionId:"history-compost",
    seed:"history-compost",
    fps:24,
    durationFrames:1152,
    ancestry:{},
    materials:[{
      materialId:"text:one",
      kind:"text",
      sourceIdentity:"text:one:HELLO",
      digest:"1".repeat(64),
      rightsBasis:"local-test",
      admissionBasis:"local-test",
    }],
    scenes:[
      {sceneId:"ARRIVE",startFrame:0,durationFrames:384,worldRule:"threshold",tracks:[]},
      {sceneId:"CROSS",startFrame:384,durationFrames:384,worldRule:"threshold",tracks:[]},
      {sceneId:"ASSEMBLE",startFrame:768,durationFrames:384,worldRule:"threshold",tracks:[]},
    ],
    transitions:[],
    receipts:{},
  });
}
function history(seed="4"){
  const {plan,planHash}=frozen();
  return createRenderedHistoryCapsule({
    plan,planHash,
    projection:{kind:"remotion",projectionHash:"2".repeat(64)},
    renderedMedia:{sha256:"3".repeat(64)},
    historicalContext:{performanceHash:seed.repeat(64)},
  });
}
function binding(){
  const sourceSha256="3".repeat(64);
  const byteLength=1000;
  return {
    schema:"haunted-toaster/video-source/v1",
    specimenId:`sha256:${sourceSha256}:${byteLength}`,
    sourceSha256,
    byteLength,
    path:"/tmp/history-video.mp4",
    filename:"history-video.mp4",
    probe:{
      durationSeconds:10,
      width:640,
      height:360,
      frameRate:"24/1",
    },
  };
}
function timeline(){
  return {
    durationTicks:240,
    timebase:24,
  };
}

test("all six descendants inherit one exact source history ref",()=>{
  const capsule=history();
  const family=createVideoDigestionSix({
    videoBinding:binding(),
    timeline:timeline(),
    analysisDurationSeconds:10,
    historyCapsule:capsule,
  });
  assert.equal(family.sourceHistoryRef.capsuleHash,capsule.capsuleHash);
  assert.equal(family.sourceHistoryRef.generation,1);
  for(const descendant of family.descendants){
    assert.equal(descendant.historyRef.capsuleHash,capsule.capsuleHash);
    assert.equal(descendant.sourceSha256,"3".repeat(64));
  }
});

test("same bytes plus different history become different digestion families",()=>{
  const a=createVideoDigestionSix({
    videoBinding:binding(),timeline:timeline(),analysisDurationSeconds:10,historyCapsule:history("4"),
  });
  const b=createVideoDigestionSix({
    videoBinding:binding(),timeline:timeline(),analysisDurationSeconds:10,historyCapsule:history("a"),
  });
  assert.equal(a.sourceSha256,b.sourceSha256);
  assert.notEqual(a.sourceHistoryRef.capsuleHash,b.sourceHistoryRef.capsuleHash);
  assert.notEqual(a.familyHash,b.familyHash);
});

test("no capsule preserves ordinary history-null digestion",()=>{
  const family=createVideoDigestionSix({
    videoBinding:binding(),timeline:timeline(),analysisDurationSeconds:10,
  });
  assert.equal(family.sourceHistoryRef,null);
  assert.ok(family.descendants.every(descendant=>descendant.historyRef===null));
});

test("mismatched capsule bytes are refused before digestion",()=>{
  const capsule=history();
  assert.throws(
    ()=>createVideoDigestionSix({
      videoBinding:{...binding(),sourceSha256:"0".repeat(64)},
      timeline:timeline(),
      analysisDurationSeconds:10,
      historyCapsule:capsule,
    }),
    /bytes/i,
  );
});
