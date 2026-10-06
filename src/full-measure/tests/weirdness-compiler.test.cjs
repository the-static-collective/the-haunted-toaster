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
  AXIS_IDS,
  compileWeirdness,
  validateWeirdnessCompilation,
}=require("../src/nextgen/weirdness-compiler.cjs");
const {
  experiencedOffsetForAction,
  renderProgramWhole,
}=require("../src/nextgen/performance-program-render.cjs");
const {strengthAtFrame}=require("../src/nextgen/residue-memory.cjs");

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

function sourceProgram(){
  return compilePerformanceProgram(performedSmall(),{regionFrames:12,decayPerFrame:.002});
}

test("zero relaxation is exact source-program excision",()=>{
  const source=sourceProgram();
  const compiled=compileWeirdness(source,{axes:[]});
  assert.equal(compiled.changed,false);
  assert.equal(compiled.compiledProgram.programHash,source.programHash);
  assert.deepEqual(compiled.compiledProgram,source);
  validateWeirdnessCompilation(compiled);
});

test("coordinate agreement relaxation changes projected coordinates but not performance custody",()=>{
  const source=sourceProgram();
  const compiled=compileWeirdness(source,{axes:[
    {axisId:AXIS_IDS.COORDINATE_AGREEMENT,amount:.8},
  ]});
  assert.equal(compiled.changed,true);
  assert.notEqual(compiled.compiledProgram.programHash,source.programHash);
  assert.equal(compiled.compiledProgram.sourcePerformanceHash,source.sourcePerformanceHash);
  assert.equal(compiled.compiledProgram.timelineActions[0].sourcePlacementId,source.timelineActions[0].sourcePlacementId);
  assert.notDeepEqual(compiled.compiledProgram.timelineActions[0].transform,source.timelineActions[0].transform);
  assert.deepEqual(source,sourceProgram());
});

test("experienced-time relaxation keeps action span fixed while changing its internal clock",()=>{
  const source=sourceProgram();
  const compiled=compileWeirdness(source,{axes:[
    {axisId:AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,amount:.75},
  ]});
  const before=source.timelineActions[0];
  const after=compiled.compiledProgram.timelineActions[0];
  assert.equal(after.startFrame,before.startFrame);
  assert.equal(after.endFrameExclusive,before.endFrameExclusive);
  assert.equal(after.durationFrames,before.durationFrames);
  assert.equal(after.experiencedTime.law,"ease-in-power");
  const raw=Math.floor(after.durationFrames/2);
  const experienced=experiencedOffsetForAction(after,raw);
  assert.ok(experienced<raw);
});

test("history-decay relaxation makes the same residue persist longer without changing its ancestry",()=>{
  const source=sourceProgram();
  const compiled=compileWeirdness(source,{axes:[
    {axisId:AXIS_IDS.HISTORY_DECAY_AGREEMENT,amount:1},
  ]});
  const before=source.residueMemory.residues[0];
  const after=compiled.compiledProgram.residueMemory.residues[0];
  assert.equal(after.sourcePaintEventId,before.sourcePaintEventId);
  assert.ok(after.decay.perFrame<before.decay.perFrame);
  const frame=Math.min(source.totalFrames-1,before.birthFrame+30);
  assert.ok(strengthAtFrame(after,frame)>=strengthAtFrame(before,frame));
});

test("axis order is canonical and does not create a hidden composition order",()=>{
  const source=sourceProgram();
  const a=compileWeirdness(source,{axes:[
    {axisId:AXIS_IDS.HISTORY_DECAY_AGREEMENT,amount:.5},
    {axisId:AXIS_IDS.COORDINATE_AGREEMENT,amount:.6},
    {axisId:AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,amount:.7},
  ]});
  const b=compileWeirdness(source,{axes:[
    {axisId:AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,amount:.7},
    {axisId:AXIS_IDS.HISTORY_DECAY_AGREEMENT,amount:.5},
    {axisId:AXIS_IDS.COORDINATE_AGREEMENT,amount:.6},
  ]});
  assert.equal(a.compilationHash,b.compilationHash);
  assert.equal(a.compiledProgram.programHash,b.compiledProgram.programHash);
});

test("unknown, duplicate, and out-of-range relaxations refuse",()=>{
  const source=sourceProgram();
  assert.throws(()=>compileWeirdness(source,{axes:[{axisId:"psychedelic-mode",amount:1}]}),/Unsupported weirdness axis/);
  assert.throws(()=>compileWeirdness(source,{axes:[
    {axisId:AXIS_IDS.COORDINATE_AGREEMENT,amount:.2},
    {axisId:AXIS_IDS.COORDINATE_AGREEMENT,amount:.3},
  ]}),/duplicate/i);
  assert.throws(()=>compileWeirdness(source,{axes:[{axisId:AXIS_IDS.COORDINATE_AGREEMENT,amount:1.2}]}),/amount/i);
});

test("each founding relaxation produces a real pixel consequence and repeated compilation is stable",async()=>{
  const source=sourceProgram();
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"toaster-weirdness-pixels-"));
  try{
    const baseline=await renderProgramWhole(source,{rootDir:path.join(root,"baseline"),attemptId:"baseline"});
    const variants={};
    for(const [name,axisId] of [
      ["space",AXIS_IDS.COORDINATE_AGREEMENT],
      ["time",AXIS_IDS.EXPERIENCED_TIME_AGREEMENT],
      ["history",AXIS_IDS.HISTORY_DECAY_AGREEMENT],
    ]){
      const first=compileWeirdness(source,{axes:[{axisId,amount:1}]});
      const second=compileWeirdness(source,{axes:[{axisId,amount:1}]});
      assert.equal(first.compiledProgram.programHash,second.compiledProgram.programHash);
      const rendered=await renderProgramWhole(first.compiledProgram,{
        rootDir:path.join(root,name),
        attemptId:name,
      });
      variants[name]=rendered.receipt.frameGraphHash;
      assert.notEqual(rendered.receipt.frameGraphHash,baseline.receipt.frameGraphHash);
    }
    assert.equal(new Set(Object.values(variants)).size,3);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});
