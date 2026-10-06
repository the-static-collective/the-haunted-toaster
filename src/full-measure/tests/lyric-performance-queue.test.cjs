"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");

const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {deriveListeningField}=require("../src/nextgen/listening-field.cjs");
const {
  deriveLyricPerformanceQueue,
  createLyricGuideState,
  setLaneLatch,
  advanceLyricGuide,
  punchCurrentLyric,
}=require("../src/nextgen/lyric-performance-queue.cjs");

function fixture(){
  const fullSongForm=deriveFullSongForm({
    durationSeconds:60,
    fps:24,
    sections:[
      {start:0,end:20,label:"Opening"},
      {start:20,end:40,label:"Crossing"},
      {start:40,end:60,label:"Return"},
    ],
  });
  const alignment={
    schema:"full-measure.lyric-alignment.v1",
    cues:[
      {lineId:"line-1",text:"ready one",start:2,end:3,status:"high",confidence:.92},
      {lineId:"line-2",text:"watch me",start:5,end:6,status:"medium",confidence:.68},
      {lineId:"line-3",text:"catch me",start:8,end:9,status:"low",confidence:.42},
      {lineId:"line-4",text:"human now",start:11,end:12,status:"human",confidence:1,humanCorrected:true},
      {lineId:"line-5",text:"no lawful time",start:null,end:null,status:"unmatched",confidence:0},
    ],
  };
  const listeningField=deriveListeningField({
    fullSongForm,
    songRef:{sourceSha256:"d".repeat(64),durationSeconds:60},
    alignment,
  });
  return {fullSongForm,alignment,listeningField};
}

test("Listener queue maps evidence to interaction burden without inventing unresolved timing",()=>{
  const {fullSongForm,alignment,listeningField}=fixture();
  const queue=deriveLyricPerformanceQueue({fullSongForm,listeningField,alignment});

  assert.equal(queue.schema,"static-collective/lyric-performance-queue/v0");
  assert.equal(queue.authority,"performance-guide-only");
  assert.equal(queue.formRef.formHash,fullSongForm.formHash);
  assert.equal(queue.listeningFieldRef.fieldHash,listeningField.fieldHash);
  assert.deepEqual(queue.entries.map(entry=>entry.state),[
    "READY","WATCH","CATCH","ANCHORED","CATCH",
  ]);
  assert.equal(queue.entries[0].autoArrival,true);
  assert.equal(queue.entries[1].autoArrival,true);
  assert.equal(queue.entries[2].autoArrival,false);
  assert.equal(queue.entries[3].autoArrival,true);
  assert.equal(queue.entries[4].autoArrival,false);
  assert.equal(queue.entries[4].proposedFrame,null);
  assert.equal(queue.entries[4].sourceWitnessId,null);
  assert.match(queue.queueHash,/^[a-f0-9]{64}$/);
});

test("same exact inputs produce byte-equivalent queue identity",()=>{
  const a=fixture(),b=fixture();
  const left=deriveLyricPerformanceQueue(a);
  const right=deriveLyricPerformanceQueue(b);
  assert.deepEqual(left,right);
  assert.equal(left.queueHash,right.queueHash);
});

test("lane latch persists across multiple automatic arrivals",()=>{
  const input=fixture();
  const queue=deriveLyricPerformanceQueue(input);
  let state=createLyricGuideState({queue,initialLane:"OPEN"});
  state=setLaneLatch(state,"STRANGE",0);

  state=advanceLyricGuide(state,queue.entries[0].proposedFrame);
  assert.equal(state.arrivals.length,1);
  assert.equal(state.arrivals[0].lineId,"line-1");
  assert.equal(state.arrivals[0].moodLane,"STRANGE");
  assert.equal(state.arrivals[0].timingSource,"machine-scheduled");

  state=advanceLyricGuide(state,queue.entries[1].proposedFrame);
  assert.equal(state.arrivals.length,2);
  assert.equal(state.arrivals[1].lineId,"line-2");
  assert.equal(state.arrivals[1].moodLane,"STRANGE");
});

test("CATCH never auto-arrives and one punch resolves the current catch without pausing",()=>{
  const input=fixture();
  const queue=deriveLyricPerformanceQueue(input);
  let state=createLyricGuideState({queue,initialLane:"TENDER"});

  state=advanceLyricGuide(state,queue.entries[0].proposedFrame);
  state=advanceLyricGuide(state,queue.entries[1].proposedFrame);
  state=advanceLyricGuide(state,queue.entries[2].proposedFrame+48);

  assert.deepEqual(state.arrivals.map(x=>x.lineId),["line-1","line-2"]);
  assert.equal(state.cursor,2);

  state=punchCurrentLyric(state,{frame:queue.entries[2].proposedFrame+7});
  assert.equal(state.arrivals.at(-1).lineId,"line-3");
  assert.equal(state.arrivals.at(-1).timingSource,"human-punch");
  assert.equal(state.arrivals.at(-1).humanAnchorCreated,true);
  assert.equal(state.cursor,3);
});

test("unmatched CATCH can be punched from alignment identity without a fake ListeningField witness",()=>{
  const input=fixture();
  const queue=deriveLyricPerformanceQueue(input);
  let state=createLyricGuideState({queue,initialLane:"HARD"});

  for(let i=0;i<4;i++){
    const entry=queue.entries[state.cursor];
    if(entry.autoArrival){
      state=advanceLyricGuide(state,entry.proposedFrame);
    }else{
      state=punchCurrentLyric(state,{frame:entry.proposedFrame??200});
    }
  }
  assert.equal(state.cursor,4);
  assert.equal(queue.entries[4].sourceWitnessId,null);

  state=punchCurrentLyric(state,{frame:333});
  const arrival=state.arrivals.at(-1);
  assert.equal(arrival.lineId,"line-5");
  assert.equal(arrival.scheduledFrame,null);
  assert.equal(arrival.actualFrame,333);
  assert.equal(arrival.timingSource,"human-punch");
  assert.equal(arrival.humanAnchorCreated,true);
});

test("missed CATCH can remain unresolved while later scheduled lyrics continue",()=>{
  const input=fixture();
  const queue=deriveLyricPerformanceQueue(input);
  let state=createLyricGuideState({queue,initialLane:"OPEN"});

  state=advanceLyricGuide(state,queue.entries[0].proposedFrame);
  state=advanceLyricGuide(state,queue.entries[1].proposedFrame);

  // line-3 is CATCH. Advancing beyond line-4 must not silently consume it.
  state=advanceLyricGuide(state,queue.entries[3].proposedFrame+10);
  assert.equal(state.cursor,2);
  assert.deepEqual(state.arrivals.map(x=>x.lineId),["line-1","line-2"]);

  // Explicit skip is lawful and does not create placement evidence.
  const {skipCurrentLyric}=require("../src/nextgen/lyric-performance-queue.cjs");
  state=skipCurrentLyric(state,{frame:queue.entries[3].proposedFrame,reason:"missed"});
  assert.equal(state.cursor,3);
  state=advanceLyricGuide(state,queue.entries[3].proposedFrame);
  assert.equal(state.arrivals.at(-1).lineId,"line-4");
  assert.equal(state.misses[0].lineId,"line-3");
});
