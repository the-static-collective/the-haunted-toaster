"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  beginOnePass,createOnePassSession,finishOnePass,pressLane,releaseLane,sampleLanePosition,
}=require("../src/renderer/one-pass.js");
const {compilePerformanceProgram}=require("../src/nextgen/performance-program.cjs");
const {AXIS_IDS,compileWeirdness}=require("../src/nextgen/weirdness-compiler.cjs");
const {
  compileTransitionField,
  validateTransitionField,
}=require("../src/nextgen/transition-energy.cjs");

function historyRef({capsule="a",fossil="d",axes=[]}={}){
  return {
    authority:"provenance-only",
    capsuleHash:capsule.repeat(64),
    generation:2,
    renderedMediaSha256:"b".repeat(64),
    parentCapsuleHashes:["c".repeat(64)],
    lawFossilRef:{
      schema:"static-collective/law-fossil-ref/v0",
      authority:"provenance-only",
      lawFossilHash:fossil.repeat(64),
      weirdnessCompilationHash:"e".repeat(64),
      sourceProgramHash:"f".repeat(64),
      compiledProgramHash:"1".repeat(64),
      axes,
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

function materials(){
  return Array.from({length:6},(_,index)=>({
    slot:index+1,
    roleId:`lane-${index+1}`,
    materialId:`video-digest:lane-${index+1}:${String(index+1).repeat(12)}`,
    sourceDurationFrames:120,
    ...(index===0?{historyRef:historyRef({
      capsule:"a",fossil:"d",
      axes:[
        {axisId:AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,amount:.45},
        {axisId:AXIS_IDS.COORDINATE_AGREEMENT,amount:.7},
      ],
    })}:{}),
    ...(index===1?{historyRef:historyRef({
      capsule:"a",fossil:"d",
      axes:[
        {axisId:AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,amount:.45},
        {axisId:AXIS_IDS.COORDINATE_AGREEMENT,amount:.7},
      ],
    })}:{}),
    ...(index===2?{historyRef:historyRef({
      capsule:"9",fossil:"8",
      axes:[{axisId:AXIS_IDS.HISTORY_DECAY_AGREEMENT,amount:.3}],
    })}:{}),
  }));
}

function baseProgram(){
  let session=createOnePassSession({materials:materials(),fps:24,totalFrames:84});
  session=beginOnePass(session,0);
  session=pressLane(session,0,200);
  session=sampleLanePosition(session,0,400,{x:.15,y:.25});
  session=sampleLanePosition(session,0,800,{x:.48,y:.52});
  session=sampleLanePosition(session,0,1100,{x:.78,y:.68});
  session=releaseLane(session,0,1300);
  return compilePerformanceProgram(finishOnePass(session,3500).receipt,{
    regionFrames:12,
    decayPerFrame:.002,
  });
}

function currentWorld(){
  return compileWeirdness(baseProgram(),{axes:[
    {axisId:AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,amount:.6},
  ]}).compiledProgram;
}

test("generic crossing with no evidence keeps exact base energy",()=>{
  const program=baseProgram();
  const field=compileTransitionField(program,{candidates:[{
    candidateId:"generic:a-to-b",
    kind:"generic-relation",
    frame:10,
    fromState:"A",
    toState:"B",
    baseEnergy:.73,
  }]});
  const crossing=field.transitions[0];
  assert.equal(crossing.energy,.73);
  assert.deepEqual(crossing.contributions,[]);
  assert.equal(Object.prototype.hasOwnProperty.call(field,"selectedCandidateId"),false);
});

test("current weirdness and matching law fossil independently lower law-return energy",()=>{
  const program=currentWorld();
  const materialId=program.materials[0].materialId;
  const field=compileTransitionField(program,{candidates:[{
    candidateId:"return:time",
    kind:"law-return",
    frame:20,
    fromState:"ordinary-clock",
    toState:"altered-clock-return",
    baseEnergy:.9,
    materialId,
    targetAxisId:AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,
  }]});
  const crossing=field.transitions[0];
  const types=crossing.contributions.map(item=>item.kind);
  assert.ok(types.includes("current-world-law-resonance"));
  assert.ok(types.includes("law-fossil-resonance"));
  assert.ok(crossing.energy<crossing.baseEnergy);
  assert.equal(crossing.authority,"candidate-only");
});

test("live residue lowers scar-wake energy but the same scar before birth does not",()=>{
  const program=baseProgram();
  const residue=program.residueMemory.residues[0];
  const after=compileTransitionField(program,{candidates:[{
    candidateId:"scar:after",
    kind:"scar-wake",
    frame:Math.min(program.totalFrames-1,residue.birthFrame+8),
    fromState:"dormant-scar",
    toState:"awake-scar",
    baseEnergy:.8,
    targetResidueId:residue.residueId,
  }]});
  const before=compileTransitionField(program,{candidates:[{
    candidateId:"scar:before",
    kind:"scar-wake",
    frame:Math.max(0,residue.birthFrame-1),
    fromState:"dormant-scar",
    toState:"awake-scar",
    baseEnergy:.8,
    targetResidueId:residue.residueId,
  }]});
  assert.ok(after.transitions[0].contributions.some(item=>item.kind==="residue-presence"));
  assert.ok(after.transitions[0].energy<before.transitions[0].energy);
  assert.equal(before.transitions[0].contributions.some(item=>item.kind==="residue-presence"),false);
});

test("shared exact capsule ancestry lowers kinship crossing energy",()=>{
  const program=baseProgram();
  const [a,b,c]=program.materials;
  const related=compileTransitionField(program,{candidates:[{
    candidateId:"kin:a-b",
    kind:"kinship-cross",
    frame:30,
    fromState:"apart",
    toState:"related",
    baseEnergy:.75,
    fromMaterialId:a.materialId,
    toMaterialId:b.materialId,
  }]});
  const unrelated=compileTransitionField(program,{candidates:[{
    candidateId:"kin:a-c",
    kind:"kinship-cross",
    frame:30,
    fromState:"apart",
    toState:"related",
    baseEnergy:.75,
    fromMaterialId:a.materialId,
    toMaterialId:c.materialId,
  }]});
  assert.ok(related.transitions[0].contributions.some(item=>item.kind==="shared-history-capsule"));
  assert.ok(related.transitions[0].energy<unrelated.transitions[0].energy);
});

test("candidate order cannot become hidden preference order",()=>{
  const program=currentWorld();
  const ids=program.materials.map(material=>material.materialId);
  const candidates=[
    {
      candidateId:"z-law",kind:"law-return",frame:20,fromState:"x",toState:"y",baseEnergy:.8,
      materialId:ids[0],targetAxisId:AXIS_IDS.EXPERIENCED_TIME_AGREEMENT,
    },
    {
      candidateId:"a-kin",kind:"kinship-cross",frame:30,fromState:"x",toState:"y",baseEnergy:.8,
      fromMaterialId:ids[0],toMaterialId:ids[1],
    },
  ];
  const a=compileTransitionField(program,{candidates});
  const b=compileTransitionField(program,{candidates:[...candidates].reverse()});
  assert.equal(a.fieldHash,b.fieldHash);
  assert.deepEqual(a.transitions.map(item=>item.candidateId),["a-kin","z-law"]);
});

test("lowest energy remains descriptive and is never marked recommended or selected",()=>{
  const program=currentWorld();
  const field=compileTransitionField(program,{candidates:[
    {candidateId:"hard",kind:"generic-relation",frame:10,fromState:"A",toState:"B",baseEnergy:.95},
    {candidateId:"easy",kind:"generic-relation",frame:10,fromState:"A",toState:"C",baseEnergy:.1},
  ]});
  assert.equal(field.transitions.find(item=>item.candidateId==="easy").energy,.1);
  assert.equal(JSON.stringify(field).includes("recommended"),false);
  assert.equal(JSON.stringify(field).includes("selected"),false);
  assert.ok(field.laws.includes("LOWEST ENERGY != RECOMMENDATION"));
});

test("transition field is deterministic, hash-validated, and rejects malformed candidates",()=>{
  const program=baseProgram();
  const candidates=[{
    candidateId:"generic:test",kind:"generic-relation",frame:10,
    fromState:"A",toState:"B",baseEnergy:.5,
  }];
  const a=compileTransitionField(program,{candidates});
  const b=compileTransitionField(program,{candidates});
  assert.equal(a.fieldHash,b.fieldHash);
  validateTransitionField(a);
  assert.throws(()=>compileTransitionField(program,{candidates:[
    ...candidates,{...candidates[0]},
  ]}),/duplicate/i);
  assert.throws(()=>compileTransitionField(program,{candidates:[{
    candidateId:"bad",kind:"teleport-destiny",frame:10,fromState:"A",toState:"B",baseEnergy:.5,
  }]}),/Unsupported transition kind/);
  assert.throws(()=>validateTransitionField({...a,fieldHash:"0".repeat(64)}),/hash mismatch/i);
});
