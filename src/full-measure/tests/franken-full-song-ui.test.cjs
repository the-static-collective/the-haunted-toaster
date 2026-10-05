"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const ui=require("../src/renderer/franken-composer-ui.js");

const form={
  schema:"static-collective/full-song-form/v0",
  policy:"section-snapped-three-act/v0",
  authority:"timing-form",
  totalFrames:4320,
  sceneSpans:[
    {sceneId:"ARRIVE",startFrame:0,durationFrames:1464},
    {sceneId:"CROSS",startFrame:1464,durationFrames:1368},
    {sceneId:"ASSEMBLE",startFrame:2832,durationFrames:1488},
  ],
  sourceSections:[],
  formHash:"f".repeat(64),
};

test("full-song timeline helpers address late-song frames and dynamic macro scenes",()=>{
  assert.deepEqual(ui.sceneAtGlobalFrame(3000,form),{
    sceneId:"ASSEMBLE",
    startFrame:2832,
    offsetFrame:168,
    durationFrames:1488,
  });
  assert.equal(ui.transportFrameForSeconds(150,180,4320),3599);
});

test("full-song placement movement and resize obey dynamic scene spans",()=>{
  const placement={
    placementId:"p1",
    materialId:"video-digest:test:"+ "a".repeat(12),
    sceneId:"CROSS",
    startOffsetFrames:10,
    sourceStartFrames:0,
    durationFrames:120,
    transform:{x:.5,y:.5,scale:1,rotationDegrees:0},
    crop:null,opacity:1,blend:"screen",stackOrder:40,transformKeyframes:[],
  };
  assert.deepEqual(
    ui.movePlacementOnTimeline(placement,3000,[],false,form),
    {sceneId:"ASSEMBLE",startOffsetFrames:168},
  );
  assert.deepEqual(
    ui.resizePlacementOnTimeline({...placement,sceneId:"ASSEMBLE",startOffsetFrames:168},4319,10000,[],false,form),
    {durationFrames:1319},
  );
});

test("compose config carries the exact full-song form into privileged compose",()=>{
  const state=ui.createBenchState();
  const config=ui.composeConfig(state,form);
  assert.equal(config.fullSongForm.formHash,form.formHash);
  assert.equal(config.fullSongForm.totalFrames,4320);
});
