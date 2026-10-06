"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");

const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {deriveListeningField}=require("../src/nextgen/listening-field.cjs");
const {createAssistedWordparkRuntime}=require("../src/nextgen/wordpark-runtime.cjs");

function fixture(){
  const fullSongForm=deriveFullSongForm({
    durationSeconds:30,
    fps:24,
    sections:[
      {start:0,end:10,label:"Opening"},
      {start:10,end:20,label:"Crossing"},
      {start:20,end:30,label:"Return"},
    ],
  });
  const alignment={
    schema:"full-measure.lyric-alignment.v1",
    cues:[
      {lineId:"a",text:"ready",start:1,end:2,status:"high",confidence:.95},
      {lineId:"b",text:"watch",start:3,end:4,status:"medium",confidence:.67},
      {lineId:"c",text:"catch",start:null,end:null,status:"unmatched",confidence:0},
      {lineId:"d",text:"anchor",start:6,end:7,status:"human",confidence:1,humanCorrected:true},
    ],
  };
  const listeningField=deriveListeningField({
    fullSongForm,
    songRef:{sourceSha256:"f".repeat(64),durationSeconds:30},
    alignment,
  });
  return {fullSongForm,listeningField,alignment};
}

test("play runtime owns assisted WORDPARK state outside the renderer",()=>{
  const runtime=createAssistedWordparkRuntime();
  const snapshot=runtime.start({...fixture(),initialLane:"OPEN"});
  assert.equal(snapshot.schema,"static-collective/wordpark-play-snapshot/v0");
  assert.equal(snapshot.authority,"view-snapshot-only");
  assert.equal(snapshot.active,true);
  assert.equal(snapshot.laneLatch,"OPEN");
  assert.equal(snapshot.lookahead.length,3);
  assert.equal("traversalTrace" in snapshot,false);
  assert.equal("constructionTrace" in snapshot,false);
});

test("runtime auto-arrives READY and WATCH and preserves one lane latch",()=>{
  const runtime=createAssistedWordparkRuntime();
  let snapshot=runtime.start({...fixture(),initialLane:"OPEN"});
  snapshot=runtime.setLane({moodLane:"STRANGE",frame:0});
  snapshot=runtime.advanceTo({frame:72,steerX:1,steerY:0});
  assert.equal(snapshot.arrivalCount,2);
  assert.equal(snapshot.wordObjects.length,2);
  assert.deepEqual(snapshot.wordObjects.map(word=>word.moodLane),["STRANGE","STRANGE"]);
  assert.ok(snapshot.ball.x>.28);
});

test("runtime punch resolves CATCH and emits a human anchor",()=>{
  const runtime=createAssistedWordparkRuntime();
  let snapshot=runtime.start({...fixture(),initialLane:"TENDER"});
  snapshot=runtime.advanceTo({frame:72});
  assert.equal(snapshot.lookahead[0].state,"CATCH");
  snapshot=runtime.punch({frame:90});
  assert.equal(snapshot.humanAnchorCount,1);
  assert.equal(snapshot.wordObjects.at(-1).timingSource,"human-punch");
  assert.equal(snapshot.wordObjects.at(-1).authority,"human-punched-performance-placement");
});

test("runtime refuses backward audio-clock movement",()=>{
  const runtime=createAssistedWordparkRuntime();
  runtime.start({...fixture(),initialLane:"OPEN"});
  runtime.advanceTo({frame:80});
  assert.throws(()=>runtime.advanceTo({frame:79}),/cannot run backward/);
});

test("runtime seal returns ordinary WORDPARK witness plus guide evidence",()=>{
  const runtime=createAssistedWordparkRuntime();
  runtime.start({...fixture(),initialLane:"HARD"});
  runtime.advanceTo({frame:72});
  const sealed=runtime.seal();
  assert.equal(sealed.packet.schema,"static-collective/wordpark-performance/v0");
  assert.equal(sealed.packet.authority,"witness-only");
  assert.match(sealed.packet.performanceHash,/^[a-f0-9]{64}$/);
  assert.match(sealed.guide.queueHash,/^[a-f0-9]{64}$/);
});

test("reset removes active play state",()=>{
  const runtime=createAssistedWordparkRuntime();
  runtime.start({...fixture()});
  const reset=runtime.reset();
  assert.equal(reset.active,false);
  assert.throws(()=>runtime.seal(),/Start WORDPARK/);
});
