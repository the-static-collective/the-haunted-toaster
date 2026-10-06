"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  beginOnePass,createOnePassSession,finishOnePass,pressLane,releaseLane,sampleLanePosition,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {
  compileResidueTerrain,
  projectResidueTerrain,
  validatePlayableTerrain,
}=require("../src/nextgen/playable-terrain.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function program(){
  let session=createOnePassSession({materials,fps:24,totalFrames:192});
  session=beginOnePass(session,0);
  session=pressLane(session,0,250);
  session=sampleLanePosition(session,0,400,{x:.2,y:.2});
  session=sampleLanePosition(session,0,800,{x:.7,y:.6});
  session=releaseLane(session,0,1400);
  session=pressLane(session,2,2200);
  session=sampleLanePosition(session,2,2400,{x:.8,y:.2});
  session=sampleLanePosition(session,2,3000,{x:.3,y:.8});
  session=releaseLane(session,2,3400);
  return compilePerformanceProgram(finishOnePass(session,8000).receipt,{
    regionFrames:24,
    decayPerFrame:.002,
  });
}

test("playable residue terrain exposes one map per actual residue without ranking them",()=>{
  const p=program();
  const terrain=compileResidueTerrain(p,{maxSamples:32,baseEnergy:.8});
  assert.equal(terrain.schema,"static-collective/playable-possibility-terrain/v0");
  assert.equal(terrain.authority,"observational-only");
  assert.equal(terrain.sourceProgramHash,p.programHash);
  assert.equal(terrain.mapCount,p.residueMemory.residues.length);
  assert.deepEqual(
    terrain.maps.map(entry=>entry.targetResidueId).sort(),
    p.residueMemory.residues.map(item=>item.residueId).sort(),
  );
  assert.equal(JSON.stringify(terrain).includes("recommended"),false);
  assert.equal(JSON.stringify(terrain).includes("selected"),false);
  validatePlayableTerrain(terrain);
});

test("each scar-wake map uses the same explicit base energy and exact residue identity",()=>{
  const terrain=compileResidueTerrain(program(),{maxSamples:24,baseEnergy:.73});
  assert.ok(terrain.maps.length>0);
  for(const entry of terrain.maps){
    assert.equal(entry.map.candidateSpec.kind,"scar-wake");
    assert.equal(entry.map.candidateSpec.baseEnergy,.73);
    assert.equal(entry.map.candidateSpec.targetResidueId,entry.targetResidueId);
    assert.equal(entry.map.sourceCandidateId,entry.candidateId);
  }
});

test("terrain projection generates deterministic SVG without changing terrain identity",()=>{
  const terrain=compileResidueTerrain(program(),{maxSamples:24});
  const a=projectResidueTerrain(terrain);
  const b=projectResidueTerrain(terrain);
  assert.equal(a.terrainHash,terrain.terrainHash);
  assert.deepEqual(a,b);
  assert.equal(a.maps.length,terrain.maps.length);
  assert.ok(a.maps.every(entry=>entry.svg.includes('data-authority="observational-only"')));
});

test("sample count and base energy are bounded",()=>{
  const p=program();
  assert.throws(()=>compileResidueTerrain(p,{maxSamples:1}),/maxSamples/i);
  assert.throws(()=>compileResidueTerrain(p,{maxSamples:999}),/maxSamples/i);
  assert.throws(()=>compileResidueTerrain(p,{baseEnergy:-.1}),/baseEnergy/i);
  assert.throws(()=>compileResidueTerrain(p,{baseEnergy:1.1}),/baseEnergy/i);
});

test("terrain identity changes when explicit base-energy policy changes",()=>{
  const p=program();
  const a=compileResidueTerrain(p,{maxSamples:24,baseEnergy:.8});
  const b=compileResidueTerrain(p,{maxSamples:24,baseEnergy:.6});
  assert.notEqual(a.terrainHash,b.terrainHash);
});
