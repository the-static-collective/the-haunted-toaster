"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  beginOnePass,
  createOnePassSession,
  finishOnePass,
  pressLane,
  releaseLane,
}=require("../src/renderer/one-pass.js");
const {
  compilePerformanceTrace,
  validatePerformanceReceipt,
}=require("../src/nextgen/performance-trace.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:240,
}));

function performed(){
  let session=createOnePassSession({materials,fps:24,totalFrames:1152});
  session=beginOnePass(session,0);
  session=pressLane(session,0,1000);
  session=releaseLane(session,0,1750);
  session=pressLane(session,3,8000);
  session=releaseLane(session,3,9250);
  return finishOnePass(session,48000).receipt;
}

test("PerformanceTrace deterministically derives paint and syzygy proposals from a sealed take",()=>{
  const receipt=performed();
  const a=compilePerformanceTrace(receipt);
  const b=compilePerformanceTrace(receipt);
  assert.equal(a.traceHash,b.traceHash);
  assert.equal(a.authority,"proposal-only");
  assert.equal(a.sourcePerformanceHash,receipt.performanceHash);
  assert.equal(a.paintEvents.length,receipt.placements.length);
  assert.equal(a.syzygies.length,a.paintEvents.length);
  assert.ok(a.paintEvents.every(event=>event.authority==="proposal-only"));
  assert.ok(a.syzygies.every(relation=>relation.authority==="proposal-only"));
});

test("PerformanceTrace emits held-material stamps rather than inventing motion paths",()=>{
  const trace=compilePerformanceTrace(performed(),{paintMode:"carve"});
  assert.ok(trace.paintEvents.length>0);
  for(const event of trace.paintEvents){
    assert.equal(event.brush.kind,"held-material-stamp");
    assert.equal(event.brush.mode,"carve");
    assert.equal(event.surfaceId,"franken:topology");
    assert.ok(event.brush.amount>=0.12&&event.brush.amount<=1);
  }
});

test("PerformanceTrace keeps preview and render authority out of the derived ecology",()=>{
  const trace=compilePerformanceTrace(performed());
  const bytes=JSON.stringify(trace);
  assert.equal(bytes.includes("file://"),false);
  assert.equal(bytes.includes("previewAssets"),false);
  assert.equal(bytes.includes("planHash"),false);
  assert.equal(bytes.includes("render"),false);
});

test("PerformanceTrace refuses a tampered ONE PASS witness",()=>{
  const receipt=performed();
  validatePerformanceReceipt(receipt);
  assert.throws(
    ()=>compilePerformanceTrace({...receipt,eventCount:receipt.eventCount+1}),
    /counts/i,
  );
  assert.throws(
    ()=>compilePerformanceTrace({...receipt,performanceHash:"0".repeat(64)}),
    /fingerprint/i,
  );
});

test("paint mode is explicit and bounded",()=>{
  assert.throws(()=>compilePerformanceTrace(performed(),{paintMode:"dream-smear"}),/Unsupported topology paint mode/);
});
