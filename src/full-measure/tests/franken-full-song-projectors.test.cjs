"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  FRANKEN_FULL_SONG_SCHEMA,
  FRANKEN_FULL_SONG_POLICY,
}=require("../src/franken-composer/schema.cjs");
const {freezeFrankenComposition}=require("../src/franken-composer/freeze.cjs");
const {compileHyperFramesFranken}=require("../src/franken-composer/projectors/hyperframes.cjs");
const {compileRemotionFranken}=require("../src/franken-composer/projectors/remotion.cjs");

function fullSongPlan(){
  const material={
    materialId:"text:full-song",
    kind:"text",
    sourceIdentity:"text:full-song:ONE PASS",
    digest:"a".repeat(64),
    rightsBasis:"human-authored-inline",
    admissionBasis:"test",
  };
  return {
    schema:FRANKEN_FULL_SONG_SCHEMA,
    policy:FRANKEN_FULL_SONG_POLICY,
    compositionId:"fc1_projector_test",
    seed:"full-song-projector-test",
    fps:24,
    durationFrames:4320,
    ancestry:{},
    materials:[material],
    scenes:[
      {sceneId:"ARRIVE",startFrame:0,durationFrames:1464,worldRule:"manga-room",tracks:[]},
      {sceneId:"CROSS",startFrame:1464,durationFrames:1368,worldRule:"manga-room",tracks:[]},
      {sceneId:"ASSEMBLE",startFrame:2832,durationFrames:1488,worldRule:"manga-room",tracks:[]},
    ],
    transitions:[],
    receipts:{fullSongFormHash:"b".repeat(64)},
  };
}

test("full-song frozen duration survives both renderer-neutral projectors",()=>{
  const frozen=freezeFrankenComposition(fullSongPlan());
  const hyper=compileHyperFramesFranken({plan:frozen.plan,planHash:frozen.planHash,assetBindings:{}});
  const remotion=compileRemotionFranken({plan:frozen.plan,planHash:frozen.planHash,assetBindings:{}});

  assert.equal(frozen.plan.durationFrames,4320);
  assert.equal(hyper.manifest.durationFrames,4320);
  assert.equal(remotion.bundle.composition.durationInFrames,4320);
  assert.equal(hyper.semanticTrace.durationFrames,4320);
  assert.equal(remotion.semanticTrace.durationFrames,4320);
});
