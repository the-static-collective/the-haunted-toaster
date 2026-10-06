"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {composeFrankenProposal,applyFrankenEdits}=require("../src/franken-composer/compose.cjs");
const {normalizeDigestPlacements}=require("../src/franken-composer/proposal.cjs");

function playdeck(){
  return {
    authority:"proposal-only",
    ancestry:{snapshotHash:"a".repeat(64)},
    worldRule:{id:"manga-room"},
    cards:Array.from({length:6},(_,index)=>({
      cardId:`card-${index+1}`,
      materialId:`card-material-${index+1}`,
      source:`card-${index+1}.png`,
      digest:String(index+1).repeat(64),
      crop:null,
    })),
  };
}
function blenderTake(){
  return {
    authority:"material-only",
    material:{
      materialId:"blender:accepted",
      kind:"video",
      sourceIdentity:"blender:accepted:specimen",
      digest:"b".repeat(64),
      rightsBasis:"accepted-local-render",
      admissionBasis:"accepted-blender-take",
    },
    ancestry:{admissionReceiptSha256:"c".repeat(64)},
  };
}
function promoted(){
  const material={
    materialId:"adopted-artifact:"+"d".repeat(20),
    kind:"video",
    sourceIdentity:"adopted-artifact:"+"e".repeat(64)+":review:"+"f".repeat(64),
    digest:"f".repeat(64),
    rightsBasis:"locally-produced-human-adopted-artifact",
    admissionBasis:"explicit-adopted-artifact-material-admission",
    derivation:{
      schema:"static-collective/adopted-artifact-material-derivation/v0",
      authority:"provenance-only",
      importProposalHash:"1".repeat(64),
      sourceDispositionHash:"2".repeat(64),
      candidateGraphHash:"e".repeat(64),
      frameGraphHash:"3".repeat(64),
      sourceProgramHash:"4".repeat(64),
      derivedProgramHash:"5".repeat(64),
      sourceReviewMediaReceiptHash:"6".repeat(64),
      sourceDurationFrames:96,
      fps:24,
      laws:["DERIVATION != PLACEMENT","HISTORY != EDIT AUTHORITY"],
    },
  };
  return {
    materials:[material],
    bindings:{[material.materialId]:"/tmp/adopted-material.mp4"},
    records:[{
      materialId:material.materialId,
      admissionHash:"7".repeat(64),
      sourceDispositionHash:"2".repeat(64),
      candidateGraphHash:"e".repeat(64),
      mediaSha256:"f".repeat(64),
    }],
  };
}
function stripDonor(proposal){
  const {_donor,...rest}=proposal;
  return rest;
}

test("admitted adopted artifact does not alter proposal until it is placed",()=>{
  const baseline=composeFrankenProposal({
    playdeck:playdeck(),blenderTake:blenderTake(),seed:"promotion-test",
  });
  const withAdmission=composeFrankenProposal({
    playdeck:playdeck(),blenderTake:blenderTake(),seed:"promotion-test",
    promotedReservoir:promoted(),
  });
  assert.deepEqual(stripDonor(withAdmission),stripDonor(baseline));
  assert.equal(withAdmission.materials.some(m=>m.materialId.startsWith("adopted-artifact:")),false);
});

test("ordinary placement admits adopted artifact into plan with exact ancestry",()=>{
  const initial=composeFrankenProposal({
    playdeck:playdeck(),blenderTake:blenderTake(),seed:"promotion-test",
    promotedReservoir:promoted(),
  });
  const material=promoted().materials[0];
  const placed=applyFrankenEdits(initial,{
    digestPlacements:[{
      placementId:"p-adopted-1",
      materialId:material.materialId,
      sceneId:"CROSS",
      startOffsetFrames:40,
      sourceStartFrames:0,
      durationFrames:72,
      transform:{x:.5,y:.5,scale:1,rotationDegrees:0},
      crop:null,
      opacity:.8,
      blend:"normal",
      stackOrder:44,
      transformKeyframes:[],
    }],
  });
  assert.ok(placed.materials.some(m=>m.materialId===material.materialId));
  const track=placed.scenes.find(s=>s.sceneId==="CROSS").tracks.find(t=>t.role==="adopted-artifact-placement");
  assert.ok(track);
  assert.equal(track.clips[0].materialId,material.materialId);
  assert.deepEqual(placed.ancestry.adoptedArtifacts,[{
    admissionHash:"7".repeat(64),
    candidateGraphHash:"e".repeat(64),
    materialId:material.materialId,
    mediaSha256:"f".repeat(64),
    sourceDispositionHash:"2".repeat(64),
  }]);
  assert.equal(placed.authority,"proposal-only");
});

test("adopted material uses the same bounded placement editor grammar",()=>{
  const materialId=promoted().materials[0].materialId;
  const [placement]=normalizeDigestPlacements([{
    placementId:"p-adopted-1",
    materialId,
    sceneId:"ARRIVE",
    startOffsetFrames:12,
    sourceStartFrames:4,
    durationFrames:24,
    transform:{x:.4,y:.6,scale:.9,rotationDegrees:3},
    crop:{x:.1,y:.1,width:.8,height:.8},
    opacity:.7,
    blend:"screen",
    stackOrder:31,
    transformKeyframes:[{offsetFrames:12,transform:{x:.6,y:.4,scale:1.1,rotationDegrees:-2}}],
  }]);
  assert.equal(placement.materialId,materialId);
  assert.equal(placement.durationFrames,24);
  assert.equal(placement.transformKeyframes.length,1);
  assert.throws(()=>normalizeDigestPlacements([{
    ...placement,placementId:"bad-prefix",materialId:"privileged-world:thing",
  }]),/materialId|placeable/i);
});
