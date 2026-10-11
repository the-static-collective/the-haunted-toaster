"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {createFrankenComposerService,correspondenceOperand}=require("../src/franken-composer/bridge.cjs");
const {createOnePassSession,beginOnePass,pressLane,releaseLane,finishOnePass}=require("../src/renderer/one-pass.js");

const materials=Array.from({length:6},(_,i)=>({
  slot:i+1,materialId:"material-"+(i+1),sourceDurationFrames:240,
}));
function perform(spec){
  let s=beginOnePass(createOnePassSession({materials,fps:24,totalFrames:1152}),0);
  for(const [lane,start,end] of spec){
    s=pressLane(s,lane,start);
    s=releaseLane(s,lane,end);
  }
  return finishOnePass(s,48000).receipt;
}
const parent=perform([[0,1000,1500]]);
const child=perform([[0,1000,1500],[1,2000,2500]]);
function declared(p=parent,c=child){
  return [{kind:"split",from:[p.placements[0].placementId],
    to:c.placements.map(x=>x.placementId),attestationId:"exact human declaration 1"}];
}
async function fixture(t){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"franken-correspondence-"));
  t.after(async()=>fs.rm(dir,{recursive:true,force:true}));
  const service=createFrankenComposerService({rootDir:dir});
  const parentPath=path.join(dir,"input-parent.json");
  await fs.writeFile(parentPath,JSON.stringify(parent));
  return {dir,service,parentPath};
}
test("real ONE PASS adapter preserves exact placement IDs and recorded particulars",()=>{
  const projected=correspondenceOperand(child);
  assert.equal(projected.performanceHash,child.performanceHash);
  assert.equal(projected.placements[0].id,child.placements[0].placementId);
  assert.equal(projected.placements[0].durationFrames,child.placements[0].durationFrames);
  assert.equal(projected.placements[0].materialId,child.placements[0].materialId);
});
test("sealed real performances yield create-only correspondence and independent custody replay",async t=>{
  const {dir,service,parentPath}=await fixture(t);
  const seen=await service.inspectCorrespondenceParent(parentPath);
  assert.equal(seen.placements[0].id,parent.placements[0].placementId);
  const first=await service.sealPerformedCorrespondence(parentPath,child,declared(),seen.performanceHash);
  assert.equal(first.existing,false);
  assert.equal(first.record.claims[0].kind,"split");
  assert.equal(first.record.parent.performanceHash,parent.performanceHash);
  assert.equal(first.record.child.performanceHash,child.performanceHash);
  assert.equal(await service.verifyPerformedCorrespondenceRecord(first.path),true);
  const repeat=await service.sealPerformedCorrespondence(parentPath,child,declared(),seen.performanceHash);
  assert.equal(repeat.existing,true);
  assert.equal(repeat.path,first.path);
  const file=JSON.parse(await fs.readFile(first.path,"utf8"));
  assert.equal(file.correspondenceSha256,first.record.correspondenceSha256);
  assert.match(first.parentWitnessPath,/correspondence-witnesses/);
  assert.equal(path.relative(dir,first.childWitnessPath).startsWith("correspondence-witnesses"),true);
});
test("tampered retained witnesses and changed record bytes refuse verification",async t=>{
  const {service,parentPath}=await fixture(t);
  const result=await service.sealPerformedCorrespondence(parentPath,child,declared(),parent.performanceHash);
  const original=await fs.readFile(result.childWitnessPath,"utf8");
  const manipulated=JSON.parse(original);manipulated.placements[0].durationFrames+=10;
  await fs.writeFile(result.childWitnessPath,JSON.stringify(manipulated));
  await assert.rejects(()=>service.verifyPerformedCorrespondenceRecord(result.path),/fingerprint mismatch/);
  await fs.writeFile(result.childWitnessPath,original);
  const recordOriginal=await fs.readFile(result.path,"utf8");
  const forged=JSON.parse(recordOriginal);forged.authority="render";
  await fs.writeFile(result.path,JSON.stringify(forged));
  await assert.rejects(()=>service.verifyPerformedCorrespondenceRecord(result.path),/does not match/);
});
test("changed parent after inspection and unsealed child are refused",async t=>{
  const {service,parentPath}=await fixture(t);
  await assert.rejects(()=>service.sealPerformedCorrespondence(parentPath,child,declared(),"0".repeat(64)),/changed since inspection/);
  await assert.rejects(()=>service.sealPerformedCorrespondence(parentPath,{...child,performanceHash:"0".repeat(64)},declared(),parent.performanceHash),/fingerprint mismatch/);
  await assert.rejects(()=>service.sealPerformedCorrespondence(parentPath,parent,declared(parent,parent),parent.performanceHash),/own correspondence parent/);
});
test("record verification rejects paths outside bounded custody",async t=>{
  const {service,parentPath}=await fixture(t);
  await assert.rejects(()=>service.verifyPerformedCorrespondenceRecord(parentPath),/custody/);
});
