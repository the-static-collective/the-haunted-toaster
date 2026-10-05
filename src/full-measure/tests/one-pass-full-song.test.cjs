"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {createOnePassSession,beginOnePass,pressLane,releaseLane,finishOnePass}=require("../src/renderer/one-pass.js");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:10000,
}));

test("ONE PASS can span the entire admitted song and split one gesture at section-snapped macro boundaries",()=>{
  const form=deriveFullSongForm({
    durationSeconds:180,
    fps:24,
    sections:[
      {start:0,end:32,label:"Intro"},
      {start:32,end:61,label:"Verse"},
      {start:61,end:118,label:"Middle"},
      {start:118,end:180,label:"Final"},
    ],
  });
  let session=createOnePassSession({materials,fps:24,totalFrames:form.totalFrames,sceneSpans:form.sceneSpans});
  session=beginOnePass(session,0);
  session=pressLane(session,0,60900);
  session=releaseLane(session,0,61100);
  const receipt=finishOnePass(session,180000);

  assert.equal(receipt.totalFrames,4320);
  assert.deepEqual(receipt.receipt.sceneSpans,form.sceneSpans);
  assert.equal(receipt.receipt.placements.length,2);
  assert.equal(receipt.receipt.placements[0].sceneId,"ARRIVE");
  assert.equal(receipt.receipt.placements[1].sceneId,"CROSS");
  assert.equal(receipt.receipt.placements[0].startOffsetFrames,1462);
  assert.equal(receipt.receipt.placements[1].startOffsetFrames,0);
  assert.equal(receipt.receipt.performanceHash.length,64);
});

test("a late-song gesture lands in ASSEMBLE instead of clamping to the old 48-second carrier",()=>{
  const form=deriveFullSongForm({durationSeconds:240,fps:24,sections:[]});
  let session=createOnePassSession({materials,fps:24,totalFrames:form.totalFrames,sceneSpans:form.sceneSpans});
  session=beginOnePass(session,0);
  session=pressLane(session,4,210000);
  session=releaseLane(session,4,211000);
  const receipt=finishOnePass(session,240000).receipt;
  assert.equal(receipt.totalFrames,5760);
  assert.equal(receipt.placements.length,1);
  assert.equal(receipt.placements[0].sceneId,"ASSEMBLE");
  assert.ok(receipt.placements[0].startOffsetFrames>384);
});
