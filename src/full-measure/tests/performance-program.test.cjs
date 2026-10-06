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
const {
  compilePerformanceBundle,
  compilePerformanceProgram,
  executeRegion,
  executionState,
  validatePerformanceProgram,
  validateRegionExecutionReceipt,
}=require("../src/nextgen/performance-program.cjs");
const {createFrankenComposerService}=require("../src/franken-composer/bridge.cjs");

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
  session=sampleLanePosition(session,0,1200,{x:.1,y:.2});
  session=sampleLanePosition(session,0,1800,{x:.45,y:.5});
  session=sampleLanePosition(session,0,2400,{x:.8,y:.7});
  session=releaseLane(session,0,3000);
  session=pressLane(session,3,9000);
  session=releaseLane(session,3,10500);
  return finishOnePass(session,48000).receipt;
}

test("PerformanceProgram deterministically compiles a sealed take into replay description + exact region plan",()=>{
  const receipt=performed();
  const a=compilePerformanceProgram(receipt);
  const b=compilePerformanceProgram(receipt);
  assert.equal(a.programHash,b.programHash);
  assert.equal(a.sourcePerformanceHash,receipt.performanceHash);
  assert.equal(a.authority,"portable-replay-description-only");
  assert.equal(a.renderRegionPlan.regionCount,48);
  assert.equal(a.renderRegionPlan.regions[0].startFrame,0);
  assert.equal(a.renderRegionPlan.regions.at(-1).endFrameExclusive,1152);
  assert.ok(a.timelineActions.length>0);
  assert.ok(a.performanceTrace.paintEvents.length>0);
  assert.ok(a.residueMemory.residues.length>0);
  assert.ok(a.laws.includes("REPLAY != RE-PERFORMANCE"));
});

test("PerformanceProgram preserves the full ONE PASS placement envelope needed for replay",()=>{
  const receipt=performed();
  const program=compilePerformanceProgram(receipt);
  const source=receipt.placements[0];
  const action=program.timelineActions[0];
  assert.equal(action.sourcePlacementId,source.placementId);
  assert.equal(action.sourceMaterialId,source.materialId);
  assert.equal(action.sourceStartFrames,source.sourceStartFrames);
  assert.deepEqual(action.transform,source.transform);
  assert.deepEqual(action.crop,source.crop);
  assert.equal(action.opacity,source.opacity);
  assert.equal(action.blend,source.blend);
  assert.equal(action.stackOrder,source.stackOrder);
  assert.deepEqual(action.transformKeyframes,source.transformKeyframes);
  assert.deepEqual(program.materials,receipt.materials);
});

test("render regions exactly cover the carrier without gaps or overlaps",()=>{
  const program=compilePerformanceProgram(performed());
  let cursor=0;
  for(const region of program.renderRegionPlan.regions){
    assert.equal(region.startFrame,cursor);
    assert.equal(region.frameCount,region.endFrameExclusive-region.startFrame);
    cursor=region.endFrameExclusive;
  }
  assert.equal(cursor,program.totalFrames);
});

test("43-percent interruption resumes from the exact missing set",()=>{
  const program=compilePerformanceProgram(performed());
  const regions=program.renderRegionPlan.regions;
  const partial=regions.slice(0,21).map((region,index)=>executeRegion(program,region.regionId,{
    workerId:"local-A",
    attemptId:`before-kill-${index}`,
  }));
  const stopped=executionState(program,partial);
  assert.equal(stopped.complete,false);
  assert.equal(stopped.coveredRegionIds.length,21);
  assert.equal(stopped.missingRegionIds.length,27);
  assert.equal(stopped.creditedCoverageFrames,504);
  assert.deepEqual(stopped.missingRegionIds,regions.slice(21).map(region=>region.regionId));
});

test("overlapping worker attempts do not double-count and converge to the clean replay digest",()=>{
  const program=compilePerformanceProgram(performed());
  const regions=program.renderRegionPlan.regions;
  const receipts=[];

  for(const [index,region] of regions.slice(0,21).entries()){
    receipts.push(executeRegion(program,region.regionId,{workerId:"A",attemptId:`A-${index}`}));
  }
  for(const [index,region] of regions.slice(21,31).entries()){
    receipts.push(executeRegion(program,region.regionId,{workerId:"fork-B",attemptId:`B-${index}`}));
  }
  const forkC=[...regions.slice(21,26),...regions.slice(31,36)];
  for(const [index,region] of forkC.entries()){
    receipts.push(executeRegion(program,region.regionId,{workerId:"fork-C",attemptId:`C-${index}`}));
  }

  const forked=executionState(program,receipts);
  assert.equal(forked.coveredRegionIds.length,36);
  assert.equal(forked.duplicateRegionIds.length,5);
  assert.equal(forked.duplicateAttemptCount,5);
  assert.ok(forked.redundantWorkFrames>0);

  for(const [index,regionId] of forked.missingRegionIds.entries()){
    receipts.push(executeRegion(program,regionId,{workerId:"resume-D",attemptId:`D-${index}`}));
  }
  const resumed=executionState(program,receipts);
  assert.equal(resumed.complete,true);
  assert.equal(resumed.missingRegionIds.length,0);

  const clean=executionState(program,regions.map((region,index)=>executeRegion(program,region.regionId,{
    workerId:"clean",
    attemptId:`clean-${index}`,
  })));
  assert.equal(clean.complete,true);
  assert.equal(resumed.aggregateSimulationDigest,clean.aggregateSimulationDigest);
  assert.equal(resumed.creditedCoverageFrames,program.totalFrames);
  assert.ok(resumed.observedAttemptFrames>resumed.creditedCoverageFrames);
});

test("replaying a program never manufactures a second performance witness",()=>{
  const receipt=performed();
  const program=compilePerformanceProgram(receipt);
  const region=program.renderRegionPlan.regions[0];
  const execution=executeRegion(program,region.regionId,{workerId:"replay-node",attemptId:"replay-1"});
  assert.equal(program.sourcePerformanceHash,receipt.performanceHash);
  assert.equal(execution.programHash,program.programHash);
  assert.equal(Object.prototype.hasOwnProperty.call(execution,"performanceHash"),false);
  assert.ok(program.laws.includes("REPLAY != RE-PERFORMANCE"));
});

test("tampered program and region receipts fail closed",()=>{
  const program=compilePerformanceProgram(performed());
  assert.throws(
    ()=>validatePerformanceProgram({...program,programHash:"0".repeat(64)}),
    /program hash mismatch/i,
  );
  const region=program.renderRegionPlan.regions[0];
  const valid=executeRegion(program,region.regionId,{workerId:"node",attemptId:"one"});
  validateRegionExecutionReceipt(program,valid);
  assert.throws(
    ()=>validateRegionExecutionReceipt(program,{...valid,simulationDigest:"0".repeat(64)}),
    /simulation digest mismatch/i,
  );
  assert.throws(
    ()=>validateRegionExecutionReceipt(program,{...valid,executionKind:"real-render"}),
    /kind mismatch/i,
  );
});

test("Franken service writes the three 011 artifacts create-only and byte-stable",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"toaster-performance-program-"));
  try{
    const service=createFrankenComposerService({rootDir:root});
    const first=await service.writePerformanceProgramBundle(performed());
    assert.equal(path.basename(first.programPath),"performance-program.json");
    assert.equal(path.basename(first.renderRegionPlanPath),"render-region-plan.json");
    assert.equal(path.basename(first.executionReceiptPath),"execution-receipt.json");
    const [programBytes,planBytes,receiptBytes]=await Promise.all([
      fs.readFile(first.programPath,"utf8"),
      fs.readFile(first.renderRegionPlanPath,"utf8"),
      fs.readFile(first.executionReceiptPath,"utf8"),
    ]);
    const second=await service.writePerformanceProgramBundle(performed());
    assert.equal(second.programHash,first.programHash);
    assert.equal(await fs.readFile(second.programPath,"utf8"),programBytes);
    assert.equal(await fs.readFile(second.renderRegionPlanPath,"utf8"),planBytes);
    assert.equal(await fs.readFile(second.executionReceiptPath,"utf8"),receiptBytes);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("COMPILE TAKE is wired from visible control through preload to renderer handler",async()=>{
  const [html,preload,uiSource]=await Promise.all([
    fs.readFile(path.join(__dirname,"../src/renderer/index.html"),"utf8"),
    fs.readFile(path.join(__dirname,"../src/preload.cjs"),"utf8"),
    fs.readFile(path.join(__dirname,"../src/renderer/franken-composer-ui.js"),"utf8"),
  ]);
  assert.match(html,/id="frankenCompileTake"/);
  assert.match(html,/id="frankenPerformanceProgram"/);
  assert.match(preload,/writePerformanceProgramBundle/);
  assert.match(uiSource,/async function compileOnePassTake\(\)/);
  assert.match(uiSource,/bridge\.writePerformanceProgramBundle\(onePassSession\.receipt,\{/);
});

test("bundle begins with an explicit missing-work execution receipt",()=>{
  const bundle=compilePerformanceBundle(performed());
  assert.equal(bundle.executionReceipt.complete,false);
  assert.equal(bundle.executionReceipt.attemptCount,0);
  assert.equal(bundle.executionReceipt.coveredRegionIds.length,0);
  assert.equal(bundle.executionReceipt.missingRegionIds.length,bundle.renderRegionPlan.regionCount);
  assert.equal(bundle.executionReceipt.aggregateSimulationDigest,null);
});
