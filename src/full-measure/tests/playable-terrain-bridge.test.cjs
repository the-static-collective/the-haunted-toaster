"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {
  beginOnePass,createOnePassSession,finishOnePass,pressLane,releaseLane,
}=require("../src/renderer/one-pass.js");
const {createFrankenComposerService}=require("../src/franken-composer/bridge.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function receipt(){
  let session=createOnePassSession({materials,fps:24,totalFrames:192});
  session=beginOnePass(session,0);
  session=pressLane(session,0,300);
  session=releaseLane(session,0,1600);
  return finishOnePass(session,8000).receipt;
}

test("privileged bridge derives playable terrain from exact sealed take",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-terrain-bridge-"));
  try{
    const service=createFrankenComposerService({rootDir:root});
    const result=await service.derivePlayableTerrain(receipt(),{maxSamples:24,baseEnergy:.8});
    assert.equal(result.terrain.authority,"observational-only");
    assert.ok(result.terrain.maps.length>0);
    assert.equal(result.projection.terrainHash,result.terrain.terrainHash);
    assert.equal(result.projection.maps.length,result.terrain.maps.length);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("bridge click proposal and ACCEPT persist exact binding create-only",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-terrain-accept-"));
  try{
    const service=createFrankenComposerService({rootDir:root});
    const terrain=await service.derivePlayableTerrain(receipt(),{maxSamples:24});
    const map=terrain.terrain.maps[0].map;
    const frame=map.points[Math.floor(map.points.length/2)].frame;
    const proposal=await service.proposePossibilityCrossing(map,frame);
    assert.equal(proposal.frame,frame);
    assert.equal(proposal.authority,"proposal-only");

    const first=await service.acceptPossibilityCrossing(proposal,proposal.proposalHash);
    assert.equal(first.binding.authority,"human-accepted-relation-only");
    assert.equal(first.existing,false);
    assert.equal(path.basename(first.path),`${first.binding.bindingHash}.json`);

    const bytes=JSON.parse(await fs.readFile(first.path,"utf8"));
    assert.equal(bytes.bindingHash,first.binding.bindingHash);

    const second=await service.acceptPossibilityCrossing(proposal,proposal.proposalHash);
    assert.equal(second.existing,true);
    assert.equal(second.path,first.path);
    assert.equal(second.binding.bindingHash,first.binding.bindingHash);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("bridge ACCEPT refuses stale proposal identity and writes nothing",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-terrain-stale-"));
  try{
    const service=createFrankenComposerService({rootDir:root});
    const terrain=await service.derivePlayableTerrain(receipt(),{maxSamples:24});
    const map=terrain.terrain.maps[0].map;
    const proposal=await service.proposePossibilityCrossing(map,map.points[0].frame);
    await assert.rejects(
      ()=>service.acceptPossibilityCrossing(proposal,"0".repeat(64)),
      /stale|proposal/i,
    );
    const dir=path.join(root,"possibility-bindings");
    const exists=await fs.access(dir).then(()=>true).catch(()=>false);
    assert.equal(exists,false);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});
