"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {freezeFrankenComposition}=require("../src/franken-composer/freeze.cjs");
const {createRenderedHistoryCapsule}=require("../src/nextgen/history-capsule.cjs");
const {createVideoDigestionSix}=require("../src/render/video-digestion-six.cjs");
const {frankenVideoDigestionReservoir}=require("../src/nextgen/live-crossings.cjs");

function capsule(){
  const frozen=freezeFrankenComposition({
    schema:"static-collective/franken-composition/v0",
    policy:"franken-composer/v0",
    compositionId:"history-reservoir",
    seed:"history-reservoir",
    fps:24,durationFrames:1152,ancestry:{},
    materials:[{
      materialId:"text:one",kind:"text",sourceIdentity:"text:one:HELLO",
      digest:"1".repeat(64),rightsBasis:"local-test",admissionBasis:"local-test",
    }],
    scenes:[
      {sceneId:"ARRIVE",startFrame:0,durationFrames:384,worldRule:"threshold",tracks:[]},
      {sceneId:"CROSS",startFrame:384,durationFrames:384,worldRule:"threshold",tracks:[]},
      {sceneId:"ASSEMBLE",startFrame:768,durationFrames:384,worldRule:"threshold",tracks:[]},
    ],transitions:[],receipts:{},
  });
  return createRenderedHistoryCapsule({
    plan:frozen.plan,planHash:frozen.planHash,
    projection:{kind:"hyperframes",projectionHash:"2".repeat(64)},
    renderedMedia:{sha256:"3".repeat(64),byteLength:1000},
    historicalContext:{listeningFieldHash:"4".repeat(64)},
  });
}
function binding(historyCapsule){
  const sourceSha256="3".repeat(64),byteLength=1000;
  return {
    schema:"haunted-toaster/video-source/v1",
    specimenId:`sha256:${sourceSha256}:${byteLength}`,
    sourceSha256,byteLength,
    path:"/tmp/history-reservoir.mp4",
    filename:"history-reservoir.mp4",
    probe:{durationSeconds:10,width:640,height:360,frameRate:"24/1"},
    historyCapsule,
  };
}

test("Franken reservoir retains recursive fossil on every derived material",()=>{
  const historyCapsule=capsule();
  const family=createVideoDigestionSix({
    videoBinding:binding(historyCapsule),
    timeline:{durationTicks:240,timebase:24},
    analysisDurationSeconds:10,
    historyCapsule,
  });
  const reservoir=frankenVideoDigestionReservoir({_private:{videoDigestion:family}});
  assert.equal(reservoir.materials.length,6);
  for(const material of reservoir.materials){
    assert.equal(material.digest,"3".repeat(64));
    assert.equal(material.derivation.historyRef.capsuleHash,historyCapsule.capsuleHash);
    assert.match(material.sourceIdentity,new RegExp(historyCapsule.capsuleHash));
  }
});

test("history-free reservoir does not grow fossil fields",()=>{
  const family=createVideoDigestionSix({
    videoBinding:binding(null),
    timeline:{durationTicks:240,timebase:24},
    analysisDurationSeconds:10,
  });
  const reservoir=frankenVideoDigestionReservoir({_private:{videoDigestion:family}});
  assert.ok(reservoir.materials.every(material=>!Object.prototype.hasOwnProperty.call(material.derivation,"historyRef")));
  assert.ok(reservoir.materials.every(material=>!material.sourceIdentity.includes(":history:")));
});
