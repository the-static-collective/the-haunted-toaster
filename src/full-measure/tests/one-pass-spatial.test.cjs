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

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:240,
}));

test("spatial samples are witnessed only while a lane is active",()=>{
  let session=createOnePassSession({materials,fps:24,totalFrames:1152});
  session=beginOnePass(session,0);
  const inactive=sampleLanePosition(session,0,1000,{x:.2,y:.3});
  assert.equal(inactive.spatialSamples.length,0);

  session=pressLane(session,0,1000);
  session=sampleLanePosition(session,0,1100,{x:.2,y:.3});
  session=sampleLanePosition(session,0,1200,{x:.4,y:.5});
  session=releaseLane(session,0,1600);

  assert.equal(session.spatialSamples.length,2);
  assert.equal(session.spatialSamples[0].gestureSeq,0);
  assert.equal(session.spatialSamples[0].lane,0);
});

test("performed spatial samples become bounded placement keyframes",()=>{
  let session=createOnePassSession({materials,fps:24,totalFrames:1152});
  session=beginOnePass(session,0);
  session=pressLane(session,2,1000);
  for(const [ms,x,y] of [[1100,.1,.2],[1200,.25,.3],[1300,.45,.45],[1400,.7,.6],[1500,.9,.8]]){
    session=sampleLanePosition(session,2,ms,{x,y});
  }
  session=releaseLane(session,2,1800);

  assert.equal(session.placements.length,1);
  assert.ok(session.placements[0].transformKeyframes.length<=4);
  assert.ok(session.placements[0].transformKeyframes.length>=2);
  assert.equal(session.placements[0].gestureSeq,0);
  assert.equal(session.placements[0].lane,2);
  for(const keyframe of session.placements[0].transformKeyframes){
    assert.ok(keyframe.offsetFrames>=0);
    assert.ok(keyframe.offsetFrames<session.placements[0].durationFrames);
  }
});

test("same-frame samples coalesce instead of inflating the witness",()=>{
  let session=createOnePassSession({materials,fps:24,totalFrames:1152});
  session=beginOnePass(session,0);
  session=pressLane(session,1,1000);
  session=sampleLanePosition(session,1,1100,{x:.1,y:.1});
  session=sampleLanePosition(session,1,1104,{x:.8,y:.8});
  assert.equal(session.spatialSamples.length,1);
  assert.equal(session.spatialSamples[0].x,.8);
  assert.equal(session.spatialSamples[0].y,.8);
});

test("scene-boundary performance keeps spatial keyframes inside each lawful chunk",()=>{
  let session=createOnePassSession({materials,fps:24,totalFrames:1152});
  session=beginOnePass(session,0);
  session=pressLane(session,4,15800);
  session=sampleLanePosition(session,4,15900,{x:.2,y:.2});
  session=sampleLanePosition(session,4,16100,{x:.4,y:.4});
  session=sampleLanePosition(session,4,16300,{x:.6,y:.6});
  session=sampleLanePosition(session,4,16500,{x:.8,y:.8});
  session=releaseLane(session,4,16800);

  assert.ok(session.placements.length>=2);
  for(const placement of session.placements){
    for(const keyframe of placement.transformKeyframes){
      assert.ok(keyframe.offsetFrames>=0);
      assert.ok(keyframe.offsetFrames<placement.durationFrames);
    }
  }
});

test("sealed receipt carries bounded spatial witness and hashes it",()=>{
  const perform=(x)=>{
    let session=createOnePassSession({materials,fps:24,totalFrames:1152});
    session=beginOnePass(session,0);
    session=pressLane(session,0,1000);
    session=sampleLanePosition(session,0,1200,{x,y:.5});
    session=releaseLane(session,0,1600);
    return finishOnePass(session,48000).receipt;
  };
  const a=perform(.2),b=perform(.2),c=perform(.7);
  assert.equal(a.spatialSampleCount,1);
  assert.equal(a.performanceHash,b.performanceHash);
  assert.notEqual(a.performanceHash,c.performanceHash);
});
