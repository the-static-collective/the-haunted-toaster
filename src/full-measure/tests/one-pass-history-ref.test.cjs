"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  createOnePassSession,
  finishOnePass,
  beginOnePass,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");

function historyRef(){
  return {
    authority:"provenance-only",
    capsuleHash:"a".repeat(64),
    generation:2,
    renderedMediaSha256:"b".repeat(64),
    parentCapsuleHashes:["c".repeat(64)],
    lawFossilRef:{
      schema:"static-collective/law-fossil-ref/v0",
      authority:"provenance-only",
      lawFossilHash:"d".repeat(64),
      weirdnessCompilationHash:"e".repeat(64),
      sourceProgramHash:"f".repeat(64),
      compiledProgramHash:"1".repeat(64),
      axes:[
        {axisId:"experienced-time-agreement",amount:.45},
        {axisId:"coordinate-agreement",amount:.7},
      ],
      laws:["LAW FOSSIL REF != ACTIVE LAW","ANCESTRY != REACTIVATION"],
    },
    worldLawCauseRef:{
      authority:"provenance-only",
      causeHash:"2".repeat(64),
      renderer:"ffmpeg-performance-program-witness-raster/v0",
      wholeRenderReceiptHash:"3".repeat(64),
      frameGraphHash:"4".repeat(64),
    },
  };
}

const materials=Array.from({length:6},(_,index)=>({
  slot:index+1,
  roleId:`lane-${index+1}`,
  materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
  sourceDurationFrames:120,
  ...(index===0?{historyRef:historyRef()}:{}),
}));

test("ONE PASS preserves bounded causal history refs on material lanes",()=>{
  const session=createOnePassSession({materials,fps:24,totalFrames:84});
  assert.deepEqual(session.materials[0].historyRef,historyRef());
  assert.equal(Object.prototype.hasOwnProperty.call(session.materials[1],"historyRef"),false);
});

test("sealed receipt and PerformanceProgram retain material law ancestry",()=>{
  let session=createOnePassSession({materials,fps:24,totalFrames:84});
  session=beginOnePass(session,0);
  const receipt=finishOnePass(session,3500).receipt;
  const program=compilePerformanceProgram(receipt,{regionFrames:12});
  assert.equal(program.materials[0].historyRef.lawFossilRef.lawFossilHash,"d".repeat(64));
  assert.equal(program.materials[0].historyRef.worldLawCauseRef.frameGraphHash,"4".repeat(64));
});

test("invalid active-law smuggling inside history ref refuses",()=>{
  const poisoned=materials.map((material,index)=>index===0
    ?{...material,historyRef:{...historyRef(),weirdness:{axes:[{axisId:"coordinate-agreement",amount:1}]}}}
    :material
  );
  assert.throws(()=>createOnePassSession({materials:poisoned,fps:24,totalFrames:84}),/history ref/i);
});
