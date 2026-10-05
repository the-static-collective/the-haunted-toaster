"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");

test("full-song form snaps three macro acts to detected section boundaries",()=>{
  const form=deriveFullSongForm({
    durationSeconds:180,
    fps:24,
    sections:[
      {start:0,end:32,label:"Intro",energy:0.2},
      {start:32,end:61,label:"Verse",energy:0.4},
      {start:61,end:91,label:"Chorus",energy:0.9},
      {start:91,end:118,label:"Verse 2",energy:0.5},
      {start:118,end:151,label:"Chorus 2",energy:1},
      {start:151,end:180,label:"Outro",energy:0.3},
    ],
  });
  assert.equal(form.schema,"static-collective/full-song-form/v0");
  assert.equal(form.totalFrames,4320);
  assert.deepEqual(form.sceneSpans,[
    {sceneId:"ARRIVE",startFrame:0,durationFrames:1464},
    {sceneId:"CROSS",startFrame:1464,durationFrames:1368},
    {sceneId:"ASSEMBLE",startFrame:2832,durationFrames:1488},
  ]);
  assert.equal(form.boundaryBasis,"detected-section-boundaries");
  assert.equal(form.sourceSections.length,6);
  assert.equal(form.formHash.length,64);
});

test("full-song form falls back to deterministic thirds when section evidence is insufficient",()=>{
  const form=deriveFullSongForm({durationSeconds:180,fps:24,sections:[]});
  assert.deepEqual(form.sceneSpans,[
    {sceneId:"ARRIVE",startFrame:0,durationFrames:1440},
    {sceneId:"CROSS",startFrame:1440,durationFrames:1440},
    {sceneId:"ASSEMBLE",startFrame:2880,durationFrames:1440},
  ]);
  assert.equal(form.boundaryBasis,"duration-thirds");
});

test("macro spans are contiguous, positive, and exactly cover the admitted song",()=>{
  const form=deriveFullSongForm({
    durationSeconds:203.37,
    sections:[
      {start:0,end:8.2,label:"cold open"},
      {start:8.2,end:65.7,label:"body"},
      {start:65.7,end:140.1,label:"middle"},
      {start:140.1,end:203.37,label:"arrival"},
    ],
  });
  assert.equal(form.sceneSpans[0].startFrame,0);
  assert.equal(form.sceneSpans[1].startFrame,form.sceneSpans[0].durationFrames);
  assert.equal(form.sceneSpans[2].startFrame,form.sceneSpans[1].startFrame+form.sceneSpans[1].durationFrames);
  assert.equal(form.sceneSpans[2].startFrame+form.sceneSpans[2].durationFrames,form.totalFrames);
  assert.ok(form.sceneSpans.every(span=>span.durationFrames>0));
});
