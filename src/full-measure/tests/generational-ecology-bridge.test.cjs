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

function historyRef(){
  return {
    authority:"provenance-only",
    capsuleHash:"1".repeat(64),
    generation:3,
    renderedMediaSha256:"2".repeat(64),
    parentCapsuleHashes:["3".repeat(64)],
  };
}
function receipt(){
  const materials=Array.from({length:6},(_,index)=>({
    slot:index+1,
    roleId:`lane-${index+1}`,
    materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
    sourceDurationFrames:120,
    ...(index===0?{historyRef:historyRef()}:{}),
  }));
  let s=createOnePassSession({materials,fps:24,totalFrames:96});
  s=beginOnePass(s,0);
  s=pressLane(s,0,100);
  s=releaseLane(s,0,1000);
  return finishOnePass(s,4000).receipt;
}

test("bridge persists deterministic generational ecology create-only",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-023-ecology-"));
  try{
    const service=createFrankenComposerService({rootDir:root});
    const first=await service.deriveGenerationalEcology([receipt()],[]);
    assert.equal(first.ecology.authority,"observational-only");
    assert.equal(first.ecology.performances[0].generation,4);
    assert.equal(first.ecology.performances[0].directParentCount,1);
    assert.match(first.ecology.ecologyHash,/^[a-f0-9]{64}$/);
    assert.equal(first.existing,false);
    const stored=JSON.parse(await fs.readFile(first.path,"utf8"));
    assert.equal(stored.ecologyHash,first.ecology.ecologyHash);

    const again=await service.deriveGenerationalEcology([receipt()],[]);
    assert.equal(again.existing,true);
    assert.equal(again.path,first.path);
    assert.equal(again.ecology.ecologyHash,first.ecology.ecologyHash);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});

test("bridge ecology path is observational and does not create composition artifacts",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-023-no-compose-"));
  try{
    const service=createFrankenComposerService({rootDir:root});
    const result=await service.deriveGenerationalEcology([receipt()],[]);
    const rootEntries=await fs.readdir(root);
    assert.deepEqual(rootEntries,["generational-ecology"]);
    assert.match(result.path,/generational-ecology/);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
