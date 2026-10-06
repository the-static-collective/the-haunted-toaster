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
const {resolveFfmpeg,runProcess}=require("../src/render/tooling.cjs");
const {admitVideo}=require("../src/video-pantry/admit.cjs");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {
  createPerformanceProgramMediaBindings,
  revalidateLocalMedia,
}=require("../src/nextgen/performance-program-media.cjs");
const {
  composePixelArtifactGraph,
  pixelExecutionState,
  renderProgramRegion,
  renderProgramWhole,
}=require("../src/nextgen/performance-program-render.cjs");
const {
  GHOT_067_PIN,
  createReturnedWorkParcel,
  createSparseRegionParcel,
  deriveSparseMissingObservation,
  executeSparseRegionParcel,
  serializeSparseRegionParcel,
  validateSparseRegionParcel,
}=require("../src/nextgen/performance-program-sparse-transport.cjs");

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:96,
  planHash:String(index+1).repeat(64),
  digestOperatorId:index===3?"clip-motion-mask-v1":"clip-luma-texture-v1",
  samplingPolicyId:index===3?"play-source-once-v1":"loop-source-clip-v1",
  projectionClass:index===3?"derived-motion":"derived-texture",
}));

function performed(){
  let session=createOnePassSession({materials,fps:24,totalFrames:84});
  session=beginOnePass(session,0);
  session=pressLane(session,0,100);
  session=sampleLanePosition(session,0,300,{x:.2,y:.25,scale:.8,rotationDegrees:-18});
  session=sampleLanePosition(session,0,900,{x:.72,y:.62,scale:1.1,rotationDegrees:24});
  session=releaseLane(session,0,1400);
  session=pressLane(session,3,1700);
  session=sampleLanePosition(session,3,1900,{x:.75,y:.3,scale:1,rotationDegrees:70});
  session=sampleLanePosition(session,3,2800,{x:.28,y:.7,scale:1.2,rotationDegrees:145});
  session=releaseLane(session,3,3200);
  return finishOnePass(session,3500).receipt;
}
function program(){
  return compilePerformanceProgram(performed(),{regionFrames:12,decayPerFrame:.002});
}
async function createVideoFixture(filePath,variant="testsrc2"){
  const input=variant==="testsrc2"
    ?"testsrc2=size=96x54:rate=24:duration=4"
    :"smptebars=size=96x54:rate=24:duration=4";
  await runProcess(resolveFfmpeg(),[
    "-y","-hide_banner","-loglevel","error",
    "-f","lavfi","-i",input,
    "-an","-c:v","libx264","-preset","ultrafast","-pix_fmt","yuv420p",
    filePath,
  ]);
}
async function admittedBindings(root,source,sourcePath){
  const admitted=await admitVideo(sourcePath,{persist:false});
  const entries=source.materials.map(material=>({
    materialId:material.materialId,
    sourceSpecimenId:admitted.binding.specimenId,
    sourceSha256:admitted.binding.sourceSha256,
    sourceByteLength:admitted.binding.byteLength,
    sourceIdentity:`admitted-video:${admitted.binding.specimenId}`,
    sourcePath:admitted.binding.path,
    planHash:material.planHash,
    roleId:material.roleId,
    digestOperatorId:material.digestOperatorId,
    samplingPolicyId:material.samplingPolicyId,
    projectionClass:material.projectionClass,
  }));
  return {
    admitted,
    bindings:createPerformanceProgramMediaBindings(source,{entries}),
  };
}

test("admitted media witness is path-independent while local path transport remains replaceable",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"toaster-013-media-"));
  try{
    const source=program();
    const aPath=path.join(root,"source-a.mp4");
    const bPath=path.join(root,"moved-source.mp4");
    await createVideoFixture(aPath);
    await fs.copyFile(aPath,bPath);
    const first=await admittedBindings(root,source,aPath);
    const movedEntries=source.materials.map(material=>({
      materialId:material.materialId,
      sourceSpecimenId:first.admitted.binding.specimenId,
      sourceSha256:first.admitted.binding.sourceSha256,
      sourceByteLength:first.admitted.binding.byteLength,
      sourceIdentity:`admitted-video:${first.admitted.binding.specimenId}`,
      sourcePath:bPath,
      planHash:material.planHash,
      roleId:material.roleId,
      digestOperatorId:material.digestOperatorId,
      samplingPolicyId:material.samplingPolicyId,
      projectionClass:material.projectionClass,
    }));
    const moved=createPerformanceProgramMediaBindings(source,{entries:movedEntries});
    assert.equal(first.bindings.witness.bindingSetHash,moved.witness.bindingSetHash);
    assert.deepEqual(first.bindings.witness,moved.witness);
    assert.notEqual(first.bindings.localPaths.transportHash,moved.localPaths.transportHash);
    await revalidateLocalMedia(source,moved.witness,moved.localPaths);
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("actual admitted bytes causally change bound-media pixel evidence and byte drift is refused",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"toaster-013-causal-"));
  try{
    const source=program();
    const videoPath=path.join(root,"source.mp4");
    await createVideoFixture(videoPath);
    const {bindings}=await admittedBindings(root,source,videoPath);
    const region=source.renderRegionPlan.regions[0];
    const unbound=await renderProgramRegion(source,region.regionId,{
      rootDir:path.join(root,"unbound"),
      workerId:"unbound",
      attemptId:"control",
    });
    const bound=await renderProgramRegion(source,region.regionId,{
      rootDir:path.join(root,"bound"),
      workerId:"bound",
      attemptId:"media",
      mediaBindingSet:bindings.witness,
      localMediaPaths:bindings.localPaths,
    });
    assert.equal(bound.receipt.mediaBindingSetHash,bindings.witness.bindingSetHash);
    assert.equal(bound.receipt.mediaSampleEvidence.length,1);
    assert.notEqual(bound.receipt.regionPixelHash,unbound.receipt.regionPixelHash);

    await createVideoFixture(videoPath,"smptebars");
    await assert.rejects(
      ()=>renderProgramRegion(source,region.regionId,{
        rootDir:path.join(root,"tampered"),
        workerId:"tampered",
        attemptId:"tampered",
        mediaBindingSet:bindings.witness,
        localMediaPaths:bindings.localPaths,
      }),
      /admitted media bytes changed/i,
    );
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});

test("GHoT-067 sparse parcel carries exact missing media-bound work through partial return and reassignment",async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"toaster-013-sparse-"));
  try{
    const source=program();
    assert.equal(source.renderRegionPlan.regionCount,7);
    const originalPath=path.join(root,"admitted.mp4");
    const relocatedPath=path.join(root,"relocated.mp4");
    await createVideoFixture(originalPath);
    await fs.copyFile(originalPath,relocatedPath);
    const first=await admittedBindings(root,source,originalPath);
    const relocated=createPerformanceProgramMediaBindings(source,{entries:source.materials.map(material=>({
      materialId:material.materialId,
      sourceSpecimenId:first.admitted.binding.specimenId,
      sourceSha256:first.admitted.binding.sourceSha256,
      sourceByteLength:first.admitted.binding.byteLength,
      sourceIdentity:`admitted-video:${first.admitted.binding.specimenId}`,
      sourcePath:relocatedPath,
      planHash:material.planHash,
      roleId:material.roleId,
      digestOperatorId:material.digestOperatorId,
      samplingPolicyId:material.samplingPolicyId,
      projectionClass:material.projectionClass,
    }))});
    assert.equal(first.bindings.witness.bindingSetHash,relocated.witness.bindingSetHash);

    const accepted=[];
    for(const [index,region] of source.renderRegionPlan.regions.slice(0,2).entries()){
      const rendered=await renderProgramRegion(source,region.regionId,{
        rootDir:path.join(root,"owner"),
        workerId:"owner-local",
        attemptId:`owner-${index}`,
        mediaBindingSet:first.bindings.witness,
        localMediaPaths:first.bindings.localPaths,
      });
      accepted.push(rendered.receipt);
    }

    const observation=deriveSparseMissingObservation(source,accepted,{
      assignmentOwnerParticular:"toaster-owner:013",
      mediaBindingSetHash:first.bindings.witness.bindingSetHash,
    });
    assert.equal(observation.missingRegionIds.length,5);
    assert.equal(observation.donorPin.sha,GHOT_067_PIN.sha);

    const parcelR=createSparseRegionParcel(source,observation,{
      assignedRegionIds:observation.missingRegionIds,
      assignmentOwnerParticular:"toaster-owner:013",
      workerParticular:"worker:R",
      issuanceCut:"cut:013:R:open",
      expiryCut:"cut:013:R:expiry",
    });
    const transported=JSON.parse(serializeSparseRegionParcel(source,observation,parcelR).toString("utf8"));
    validateSparseRegionParcel(source,observation,transported);

    await assert.rejects(
      ()=>executeSparseRegionParcel(source,observation,transported,{
        rootDir:path.join(root,"unauthorized"),
        mediaBindingSet:first.bindings.witness,
        localMediaPaths:first.bindings.localPaths,
        consumeRegionIds:[transported.assignedRegionIds[0]],
      }),
      /does not grant compute capacity/i,
    );

    const rWork=await executeSparseRegionParcel(source,observation,transported,{
      rootDir:path.join(root,"worker-r"),
      mediaBindingSet:first.bindings.witness,
      localMediaPaths:first.bindings.localPaths,
      consumeRegionIds:transported.assignedRegionIds.slice(0,3),
      localExecutionAuthorized:true,
    });
    assert.deepEqual(rWork.result.consumedRegionIds,transported.assignedRegionIds.slice(0,3));
    assert.deepEqual(rWork.result.returnedRegionIds,transported.assignedRegionIds.slice(3));

    const outside=source.renderRegionPlan.regions[0].regionId;
    await assert.rejects(
      ()=>executeSparseRegionParcel(source,observation,transported,{
        rootDir:path.join(root,"outside"),
        mediaBindingSet:first.bindings.witness,
        localMediaPaths:first.bindings.localPaths,
        consumeRegionIds:[outside],
        localExecutionAuthorized:true,
      }),
      /unassigned region/i,
    );

    const parcelS=createReturnedWorkParcel(source,observation,transported,rWork.result,{
      assignmentOwnerParticular:"toaster-owner:013",
      workerParticular:"worker:S",
      issuanceCut:"cut:013:S:open",
      expiryCut:"cut:013:S:expiry",
    });
    assert.deepEqual(parcelS.assignedRegionIds,rWork.result.returnedRegionIds);

    const sWork=await executeSparseRegionParcel(source,observation,parcelS,{
      rootDir:path.join(root,"worker-s-relocated"),
      mediaBindingSet:relocated.witness,
      localMediaPaths:relocated.localPaths,
      localExecutionAuthorized:true,
    });
    assert.deepEqual(sWork.result.returnedRegionIds,[]);

    const allReceipts=[...accepted,...rWork.receipts,...sWork.receipts];
    const state=pixelExecutionState(source,allReceipts);
    assert.equal(state.complete,true);
    assert.equal(state.mediaBindingSetHash,first.bindings.witness.bindingSetHash);
    const resumedGraph=composePixelArtifactGraph(source,allReceipts);

    const clean=await renderProgramWhole(source,{
      rootDir:path.join(root,"clean"),
      workerId:"clean",
      attemptId:"clean-bound-media",
      mediaBindingSet:first.bindings.witness,
      localMediaPaths:first.bindings.localPaths,
    });
    assert.equal(resumedGraph.frameGraphHash,clean.receipt.frameGraphHash);
    assert.deepEqual(
      resumedGraph.frames.map(frame=>frame.sha256),
      clean.receipt.frames.map(frame=>frame.sha256),
    );
  }finally{
    await fs.rm(root,{recursive:true,force:true});
  }
});
