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
const {createFrankenComposerService}=require("../src/franken-composer/bridge.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:240,
}));

function receipt(){
  let session=createOnePassSession({materials,fps:24,totalFrames:1152});
  session=beginOnePass(session,0);
  session=pressLane(session,0,1000);
  session=sampleLanePosition(session,0,1200,{x:.1,y:.2});
  session=sampleLanePosition(session,0,1800,{x:.5,y:.5});
  session=sampleLanePosition(session,0,2400,{x:.8,y:.7});
  session=releaseLane(session,0,3000);
  return finishOnePass(session,48000).receipt;
}

test("privileged Franken boundary derives proposal-only trace plus residue memory",async()=>{
  const service=createFrankenComposerService({rootDir:process.cwd()});
  const ecology=await service.derivePerformanceEcology(receipt());
  assert.equal(ecology.schema,"static-collective/performance-ecology-preview/v0");
  assert.equal(ecology.authority,"proposal-preview-only");
  assert.equal(ecology.trace.authority,"proposal-only");
  assert.equal(ecology.residueMemory.authority,"proposal-only");
  assert.equal(ecology.performanceHash,ecology.trace.sourcePerformanceHash);
  assert.equal(ecology.trace.traceHash,ecology.residueMemory.sourceTraceHash);
  assert.ok(ecology.residueMemory.residues.length>0);
});

test("privileged ecology derivation refuses a tampered performance receipt",async()=>{
  const service=createFrankenComposerService({rootDir:process.cwd()});
  const valid=receipt();
  await assert.rejects(
    ()=>service.derivePerformanceEcology({...valid,performanceHash:"0".repeat(64)}),
    /fingerprint/i,
  );
});
