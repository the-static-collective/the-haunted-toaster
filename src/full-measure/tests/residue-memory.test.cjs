"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  beginOnePass,
  createOnePassSession,
  finishOnePass,
  pressLane,
  releaseLane,
  sampleLanePosition,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceTrace}=require("../src/nextgen/performance-trace.cjs");
const {
  compileResidueMemory,
  strengthAtFrame,
}=require("../src/nextgen/residue-memory.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:240,
}));

function traceFromGesture({startMs=1000,endMs=3000,points=[]}={}){
  let session=createOnePassSession({materials,fps:24,totalFrames:1152});
  session=beginOnePass(session,0);
  session=pressLane(session,0,startMs);
  for(const point of points){
    session=sampleLanePosition(session,0,point.ms,{x:point.x,y:point.y});
  }
  session=releaseLane(session,0,endMs);
  const receipt=finishOnePass(session,48000).receipt;
  return compilePerformanceTrace(receipt,{paintMode:"scratch"});
}

test("an ARRIVE stroke leaves deterministic residue visible at CROSS",()=>{
  const trace=traceFromGesture({
    points:[
      {ms:1200,x:.1,y:.2},
      {ms:1800,x:.5,y:.5},
      {ms:2400,x:.8,y:.7},
    ],
  });
  const memory=compileResidueMemory(trace);
  assert.equal(memory.authority,"proposal-only");
  assert.equal(memory.residues.length,1);
  const cross=memory.sceneMemory.find(scene=>scene.sceneId==="CROSS");
  assert.ok(cross);
  assert.equal(cross.residues.length,1);
  assert.ok(cross.residues[0].strength>0);
  assert.ok(cross.residues[0].strength<1);
});

test("residue strength is monotonic after birth and never appears before birth",()=>{
  const trace=traceFromGesture();
  const memory=compileResidueMemory(trace,{decayPerFrame:.001});
  const residue=memory.residues[0];
  assert.equal(strengthAtFrame(residue,residue.birthFrame-1),0);
  const atBirth=strengthAtFrame(residue,residue.birthFrame);
  const later=strengthAtFrame(residue,residue.birthFrame+100);
  const muchLater=strengthAtFrame(residue,residue.birthFrame+500);
  assert.ok(atBirth>=later);
  assert.ok(later>=muchLater);
  assert.ok(muchLater>=0);
});

test("same trace and policy produce the same memory hash",()=>{
  const trace=traceFromGesture({
    points:[{ms:1400,x:.2,y:.3},{ms:2000,x:.7,y:.6}],
  });
  const a=compileResidueMemory(trace);
  const b=compileResidueMemory(trace);
  assert.equal(a.memoryHash,b.memoryHash);
});

test("different decay policy changes memory identity without changing source trace",()=>{
  const trace=traceFromGesture();
  const slow=compileResidueMemory(trace,{decayPerFrame:.0005});
  const fast=compileResidueMemory(trace,{decayPerFrame:.002});
  assert.equal(slow.sourceTraceHash,fast.sourceTraceHash);
  assert.notEqual(slow.memoryHash,fast.memoryHash);
});

test("carryAcrossScenes false keeps the scar local to its birth scene",()=>{
  const trace=traceFromGesture();
  const memory=compileResidueMemory(trace,{carryAcrossScenes:false});
  const cross=memory.sceneMemory.find(scene=>scene.sceneId==="CROSS");
  assert.equal(cross.residues.length,0);
});

test("no paint events produce an empty but valid memory proposal",()=>{
  const trace=traceFromGesture({startMs:1000,endMs:1001});
  const empty={...trace,paintEvents:[],syzygies:[],placementIds:[],spatialStrokeCount:0};
  const {traceHash,...body}=empty;
  const canonical=require("../src/generation/canonical.cjs");
  empty.traceHash=canonical.hashCanonical(canonical.canonicalize(body),"HauntedToaster-PerformanceTrace-v0");
  const memory=compileResidueMemory(empty);
  assert.deepEqual(memory.residues,[]);
  assert.ok(memory.sceneMemory.every(scene=>scene.residues.length===0));
});
