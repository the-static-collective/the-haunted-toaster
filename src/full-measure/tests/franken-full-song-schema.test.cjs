"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  FRANKEN_SCHEMA,
  FRANKEN_POLICY,
  FRANKEN_FULL_SONG_SCHEMA,
  FRANKEN_FULL_SONG_POLICY,
  normalizeFrankenComposition,
}=require("../src/franken-composer/schema.cjs");

const material={
  materialId:"text:a",
  kind:"text",
  sourceIdentity:"text:sha:hello",
  digest:"a".repeat(64),
  rightsBasis:"human-authored-inline",
  admissionBasis:"test",
};

test("full-song Franken v1 accepts dynamic duration with exactly three contiguous macro scenes",()=>{
  const plan=normalizeFrankenComposition({
    schema:FRANKEN_FULL_SONG_SCHEMA,
    policy:FRANKEN_FULL_SONG_POLICY,
    compositionId:"fc1_test",
    seed:"test",
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
    receipts:{},
  });
  assert.equal(plan.durationFrames,4320);
  assert.equal(plan.schema,FRANKEN_FULL_SONG_SCHEMA);
  assert.equal(plan.scenes[2].startFrame+plan.scenes[2].durationFrames,4320);
});

test("founding Franken v0 remains frozen at 1152 frames",()=>{
  assert.throws(()=>normalizeFrankenComposition({
    schema:FRANKEN_SCHEMA,
    policy:FRANKEN_POLICY,
    compositionId:"fc0_bad",
    seed:"test",
    fps:24,
    durationFrames:4320,
    ancestry:{},
    materials:[material],
    scenes:[
      {sceneId:"ARRIVE",startFrame:0,durationFrames:1440,worldRule:"manga-room",tracks:[]},
      {sceneId:"CROSS",startFrame:1440,durationFrames:1440,worldRule:"manga-room",tracks:[]},
      {sceneId:"ASSEMBLE",startFrame:2880,durationFrames:1440,worldRule:"manga-room",tracks:[]},
    ],
    transitions:[],
    receipts:{},
  }),/1152|Founding/i);
});
