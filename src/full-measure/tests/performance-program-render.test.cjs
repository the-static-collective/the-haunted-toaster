"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const {
  beginOnePass,
  createOnePassSession,
  finishOnePass,
  pressLane,
  releaseLane,
  sampleLanePosition,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {
  composePixelArtifactGraph,
  pixelExecutionState,
  renderProgramRegion,
  renderProgramWhole,
  validatePixelRegionReceipt,
}=require("../src/nextgen/performance-program-render.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
}));

function performedSmall(){
  let session=createOnePassSession({materials,fps:24,totalFrames:84});
  session=beginOnePass(session,0);
  session=pressLane(session,0,200);
  session=sampleLanePosition(session,0,400,{x:.15,y:.25,scale:.8,rotationDegrees:-20});
  session=sampleLanePosition(session,0,800,{x:.48,y:.52,scale:1.1,rotationDegrees:15});
  session=sampleLanePosition(session,0,1100,{x:.78,y:.68,scale:.9,rotationDegrees:42});
  session=releaseLane(session,0,1300);
  session=pressLane(session,3,1800);
  session=sampleLanePosition(session,3,2100,{x:.72,y:.28,scale:.95,rotationDegrees:90});
  session=sampleLanePosition(session,3,2600,{x:.3,y:.72,scale:1.25,rotationDegrees:145});
  session=releaseLane(session,3,3000);
  return finishOnePass(session,3500).receipt;
}

function program(){
  return compilePerformanceProgram(performedSmall(),{regionFrames:12,decayPerFrame:.002});
}

test("one exact PerformanceProgram region becomes real deterministic FFmpeg pixel artifacts",async()=>{
  const source=program();
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"toaster-012-region-"));
  try{
    const region=source.renderRegionPlan.regions[0];
    const rendered=await renderProgramRegion(source,region.regionId,{
      rootDir:root,
      workerId:"pixel-worker-a",
      attemptId:"region-0-a",
      width:96,
      height:54,
    });
    validatePixelRegionReceipt(source,rendered.receipt);
    assert.equal(rendered.receipt.frameCount,region.frameCount);
    assert.equal(rendered.receipt.frames.length,region.frameCount);
    assert.match(rendered.receipt.regionPixelHash,/^[a-f0-9]{64}$/);
    const first=await fs.readFile(path.join(rendered.directory,rendered.receipt.frames[0].filename));
    assert.equal(first.subarray(0,2).toString("ascii"),"P6");
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("the same exact region rendered by a second worker produces the same real pixel graph",async()=>{
  const source=program();
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"toaster-012-duplicate-"));
  try{
    const region=source.renderRegionPlan.regions[2];
    const a=await renderProgramRegion(source,region.regionId,{
      rootDir:path.join(root,"worker-a"),
      workerId:"worker-a",
      attemptId:"a",
    });
    const b=await renderProgramRegion(source,region.regionId,{
      rootDir:path.join(root,"worker-b"),
      workerId:"worker-b",
      attemptId:"b",
    });
    assert.equal(a.receipt.regionPixelHash,b.receipt.regionPixelHash);
    assert.deepEqual(
      a.receipt.frames.map(frame=>frame.sha256),
      b.receipt.frames.map(frame=>frame.sha256),
    );
    const state=pixelExecutionState(source,[a.receipt,b.receipt]);
    assert.deepEqual(state.duplicateRegionIds,[region.regionId]);
    assert.deepEqual(state.conflictingRegionIds,[]);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("kill at 3/7 regions, serialize receipts, resume in a new root, and equal one uninterrupted render",async()=>{
  const source=program();
  assert.equal(source.renderRegionPlan.regionCount,7);
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"toaster-012-resume-"));
  try{
    const regions=source.renderRegionPlan.regions;
    const partial=[];
    for(const [index,region] of regions.slice(0,3).entries()){
      const rendered=await renderProgramRegion(source,region.regionId,{
        rootDir:path.join(root,"before-kill"),
        workerId:"worker-before-kill",
        attemptId:`before-${index}`,
      });
      partial.push(rendered.receipt);
    }

    const stopped=pixelExecutionState(source,partial);
    assert.equal(stopped.complete,false);
    assert.equal(stopped.coveredRegionIds.length,3);
    assert.equal(stopped.missingRegionIds.length,4);
    assert.deepEqual(stopped.missingRegionIds,regions.slice(3).map(region=>region.regionId));

    const resumedReceipts=JSON.parse(JSON.stringify(partial));
    for(const [index,regionId] of stopped.missingRegionIds.entries()){
      const rendered=await renderProgramRegion(source,regionId,{
        rootDir:path.join(root,"after-restart-elsewhere"),
        workerId:"worker-after-restart",
        attemptId:`resume-${index}`,
      });
      resumedReceipts.push(rendered.receipt);
    }

    const resumedState=pixelExecutionState(source,resumedReceipts);
    assert.equal(resumedState.complete,true);
    assert.deepEqual(resumedState.missingRegionIds,[]);
    assert.deepEqual(resumedState.conflictingRegionIds,[]);

    const resumedGraph=composePixelArtifactGraph(source,resumedReceipts);
    const clean=await renderProgramWhole(source,{
      rootDir:path.join(root,"clean-uninterrupted"),
      workerId:"clean-worker",
      attemptId:"clean-whole",
    });

    assert.equal(resumedGraph.frameCount,source.totalFrames);
    assert.equal(clean.receipt.frameCount,source.totalFrames);
    assert.equal(resumedGraph.frameGraphHash,clean.receipt.frameGraphHash);
    assert.deepEqual(
      resumedGraph.frames.map(frame=>frame.sha256),
      clean.receipt.frames.map(frame=>frame.sha256),
    );
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("pixel receipts fail closed when real frame evidence is tampered",async()=>{
  const source=program();
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"toaster-012-tamper-"));
  try{
    const region=source.renderRegionPlan.regions[0];
    const rendered=await renderProgramRegion(source,region.regionId,{
      rootDir:root,
      workerId:"worker",
      attemptId:"tamper-control",
    });
    const frames=rendered.receipt.frames.map((frame,index)=>index===0?{...frame,sha256:"0".repeat(64)}:frame);
    assert.throws(
      ()=>validatePixelRegionReceipt(source,{...rendered.receipt,frames}),
      /pixel hash mismatch/i,
    );
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});
