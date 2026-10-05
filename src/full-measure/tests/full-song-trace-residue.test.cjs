"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {createOnePassSession,beginOnePass,pressLane,releaseLane,finishOnePass}=require("../src/renderer/one-pass.js");
const {compilePerformanceTrace}=require("../src/nextgen/performance-trace.cjs");
const {compileResidueMemory}=require("../src/nextgen/residue-memory.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:10000,
}));

test("TRACE and residue preserve full-song macro spans past frame 1151",()=>{
  const form=deriveFullSongForm({durationSeconds:180,fps:24,sections:[]});
  let session=createOnePassSession({materials,fps:24,totalFrames:form.totalFrames,sceneSpans:form.sceneSpans});
  session=beginOnePass(session,0);
  session=pressLane(session,2,150000);
  session=releaseLane(session,2,151000);
  const receipt=finishOnePass(session,180000).receipt;
  const trace=compilePerformanceTrace(receipt);
  const memory=compileResidueMemory(trace,{decayPerFrame:0.00004,carryAcrossScenes:true});

  assert.equal(trace.totalFrames,4320);
  assert.deepEqual(trace.sceneSpans,form.sceneSpans);
  assert.equal(trace.paintEvents[0].span.sceneId,"ASSEMBLE");
  assert.ok(memory.residues[0].birthFrame>1151);
  assert.equal(memory.totalFrames,4320);
});
