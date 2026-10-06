"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {canonicalBytes}=require("../src/generation/canonical.cjs");
const {createFrankenComposerService}=require("../src/franken-composer/bridge.cjs");
const {specimen}=require("./fixtures/mutation-specimen.cjs");
test("mutation bridge independently verifies and persists create-only, refusing conflicts and changed evidence",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-024-"));
  try{
    const inputs=specimen(c=>{c.placements[0].transform.x+=.1;});
    const evidencePath=path.join(root,"parent-witness.json");
    await fs.writeFile(evidencePath,canonicalBytes(inputs.parentEvidence[0]));
    const service=createFrankenComposerService({rootDir:path.join(root,"FrankenComposer")});
    const [first]=await service.measureMutation(inputs.performanceReceipts,[evidencePath]);
    assert.equal(first.existing,false);
    assert.equal(first.record.deltas.placement.distance,1);
    assert.equal(path.basename(first.path),`${first.record.mutationRecordHash}.json`);
    assert.match(first.path,/mutation-records/);
    assert.deepEqual(await fs.readFile(first.path),canonicalBytes(first.record));
    assert.equal(await service.verifyMutation(first.path,inputs.performanceReceipts,[evidencePath]),true);
    const [replay]=await service.measureMutation(inputs.performanceReceipts,[evidencePath]);
    assert.equal(replay.existing,true);
    assert.equal(replay.path,first.path);
    await fs.writeFile(first.path,"conflicting bytes");
    await assert.rejects(service.measureMutation(inputs.performanceReceipts,[evidencePath]),/conflict/i);
    await fs.writeFile(first.path,canonicalBytes(first.record));
    const bad=JSON.parse(await fs.readFile(evidencePath,"utf8"));bad.performanceReceipt.placements[0].transform.x+=.1;
    await fs.writeFile(evidencePath,JSON.stringify(bad));
    await assert.rejects(service.verifyMutation(first.path,inputs.performanceReceipts,[evidencePath]),/fingerprint/i);
    assert.deepEqual(await fs.readdir(path.join(root,"FrankenComposer")),["mutation-records"]);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
test("missing parent witness persists explicit unknowns without creative authority",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"ht-024-unknown-"));
  try{
    const service=createFrankenComposerService({rootDir:root});
    const rows=await service.measureMutation(specimen().performanceReceipts);
    assert.equal(rows.length,1);assert.equal(rows[0].record.aggregateDistance.value,null);
    assert.deepEqual(rows[0].record.grantedAuthorities,[]);
    assert.deepEqual(await fs.readdir(root),["mutation-records"]);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
