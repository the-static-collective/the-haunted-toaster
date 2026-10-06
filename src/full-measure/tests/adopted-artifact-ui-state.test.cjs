"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  composeConfig,
  createBenchState,
  defaultDigestPlacement,
  descendantFor,
  reduceBenchState,
}=require("../src/renderer/franken-composer-ui.js");

function admission(){
  return {
    admissionPath:"/tmp/FrankenComposer/adopted-artifacts/abc/admission.json",
    admissionHash:"a".repeat(64),
    materialUrl:"file:///tmp/FrankenComposer/adopted-artifacts/abc/material.mp4",
    descriptor:{
      materialId:"adopted-artifact:"+"b".repeat(20),
      roleId:"adopted-world",
      projectionClass:"adopted-artifact",
      planHash:"a".repeat(64),
      sourceDurationFrames:96,
      admissionHash:"a".repeat(64),
      sourceDispositionHash:"c".repeat(64),
      candidateGraphHash:"d".repeat(64),
      mediaSha256:"e".repeat(64),
    },
  };
}

test("material admission is editor-neutral until ordinary placement",()=>{
  let state=createBenchState();
  state={...state,dirty:false,frozen:{planHash:"f".repeat(64)}};
  state=reduceBenchState(state,{type:"promoted-material-admit",value:admission()});

  assert.equal(state.dirty,false);
  assert.equal(state.frozen.planHash,"f".repeat(64));
  assert.equal(state.promotedMaterials.length,1);
  assert.equal(state.edits.digestPlacements.length,0);
  assert.equal(descendantFor(state,admission().descriptor.materialId).isAdoptedArtifact,true);

  const config=composeConfig(state);
  assert.deepEqual(config.adoptedArtifactAdmissionPaths,[admission().admissionPath]);

  const placement=defaultDigestPlacement(descendantFor(state,admission().descriptor.materialId),"CROSS",1);
  state=reduceBenchState(state,{type:"digest-place",placement});
  assert.equal(state.dirty,true);
  assert.equal(state.frozen,null);
  assert.equal(state.edits.digestPlacements.length,1);
  assert.equal(state.edits.digestPlacements[0].materialId,admission().descriptor.materialId);
});

test("re-admitting the same adopted material is idempotent and collision fails closed",()=>{
  let state=createBenchState();
  state=reduceBenchState(state,{type:"promoted-material-admit",value:admission()});
  const replay=reduceBenchState(state,{type:"promoted-material-admit",value:admission()});
  assert.equal(replay,state);

  assert.throws(()=>reduceBenchState(state,{
    type:"promoted-material-admit",
    value:{...admission(),admissionHash:"0".repeat(64)},
  }),/collides/i);
});

test("adopted material never silently enters ONE PASS lane inventory",()=>{
  let state=createBenchState();
  state={
    ...state,
    nextGen:{
      videoDigestion:{
        descendants:Array.from({length:6},(_,index)=>({
          slot:index+1,
          materialId:`video-digest:lane-${index+1}:abc`,
          roleId:`lane-${index+1}`,
          sourceDurationFrames:72,
        })),
      },
    },
  };
  state=reduceBenchState(state,{type:"promoted-material-admit",value:admission()});
  assert.equal(state.nextGen.videoDigestion.descendants.length,6);
  assert.equal(state.nextGen.videoDigestion.descendants.some(item=>item.materialId===admission().descriptor.materialId),false);
  assert.equal(descendantFor(state,admission().descriptor.materialId).roleId,"adopted-world");
});
