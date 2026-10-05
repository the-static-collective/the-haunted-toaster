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

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:240,
}));

function perform(points=[]){
  let session=createOnePassSession({materials,fps:24,totalFrames:1152});
  session=beginOnePass(session,0);
  session=pressLane(session,0,1000);
  for(const point of points){
    session=sampleLanePosition(session,0,point.ms,{x:point.x,y:point.y});
  }
  session=releaseLane(session,0,2200);
  return finishOnePass(session,48000).receipt;
}

test("witnessed pointer motion becomes a topology stroke proposal",()=>{
  const receipt=perform([
    {ms:1100,x:.1,y:.2},
    {ms:1300,x:.3,y:.35},
    {ms:1500,x:.55,y:.5},
    {ms:1800,x:.85,y:.75},
  ]);
  const trace=compilePerformanceTrace(receipt,{paintMode:"carve"});
  assert.equal(trace.spatialStrokeCount,1);
  assert.equal(trace.paintEvents[0].brush.kind,"performed-spatial-stroke");
  assert.equal(trace.paintEvents[0].brush.mode,"carve");
  assert.ok(trace.paintEvents[0].brush.path.length>=2);
  assert.ok(trace.paintEvents[0].brush.pathLength>0);
});

test("no spatial witness still falls back to an honest held-material stamp",()=>{
  const trace=compilePerformanceTrace(perform([]));
  assert.equal(trace.spatialStrokeCount,0);
  assert.equal(trace.paintEvents[0].brush.kind,"held-material-stamp");
  assert.equal(Object.prototype.hasOwnProperty.call(trace.paintEvents[0].brush,"path"),false);
});

test("stroke path is bounded and deterministic even with many witnessed samples",()=>{
  const points=Array.from({length:40},(_,index)=>({
    ms:1050+index*25,
    x:index/39,
    y:(39-index)/39,
  }));
  const receipt=perform(points);
  const a=compilePerformanceTrace(receipt);
  const b=compilePerformanceTrace(receipt);
  assert.equal(a.traceHash,b.traceHash);
  assert.ok(a.paintEvents[0].brush.path.length<=16);
});

test("different performed paths produce different performance and trace identities",()=>{
  const left=perform([{ms:1200,x:.1,y:.2},{ms:1600,x:.2,y:.8}]);
  const right=perform([{ms:1200,x:.9,y:.2},{ms:1600,x:.8,y:.8}]);
  assert.notEqual(left.performanceHash,right.performanceHash);
  assert.notEqual(compilePerformanceTrace(left).traceHash,compilePerformanceTrace(right).traceHash);
});

test("spatial motion never upgrades TRACE beyond proposal-only authority",()=>{
  const trace=compilePerformanceTrace(perform([
    {ms:1200,x:.1,y:.1},
    {ms:1400,x:.5,y:.5},
    {ms:1600,x:.9,y:.9},
  ]));
  assert.equal(trace.authority,"proposal-only");
  assert.ok(trace.paintEvents.every(event=>event.authority==="proposal-only"));
  assert.ok(trace.syzygies.every(relation=>relation.authority==="proposal-only"));
});
