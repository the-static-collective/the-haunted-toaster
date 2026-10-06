"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");

const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {deriveListeningField}=require("../src/nextgen/listening-field.cjs");
const {createWordparkSession,dropLyric}=require("../src/nextgen/wordpark.cjs");
const {
  advanceAssistedWordpark,
  assistedLookahead,
  createAssistedWordparkSession,
  punchAssistedLyric,
  sealAssistedWordpark,
  setAssistedLane,
}=require("../src/nextgen/wordpark-assisted.cjs");

function fixture(){
  const fullSongForm=deriveFullSongForm({
    durationSeconds:45,
    fps:24,
    sections:[
      {start:0,end:15,label:"Opening"},
      {start:15,end:30,label:"Crossing"},
      {start:30,end:45,label:"Return"},
    ],
  });
  const alignment={
    schema:"full-measure.lyric-alignment.v1",
    cues:[
      {lineId:"a",text:"first ready",start:2,end:3,status:"high",confidence:.94},
      {lineId:"b",text:"second watch",start:5,end:6,status:"medium",confidence:.66},
      {lineId:"c",text:"third catch",start:null,end:null,status:"unmatched",confidence:0},
      {lineId:"d",text:"fourth human",start:9,end:10,status:"human",confidence:1,humanCorrected:true},
    ],
  };
  const listeningField=deriveListeningField({
    fullSongForm,
    songRef:{sourceSha256:"e".repeat(64),durationSeconds:45},
    alignment,
  });
  return {fullSongForm,alignment,listeningField};
}

test("assisted WORDPARK auto-arrives heard lyrics under one persistent creative lane",()=>{
  const input=fixture();
  let session=createAssistedWordparkSession({...input,initialLane:"OPEN"});
  session=setAssistedLane(session,{moodLane:"STRANGE",frame:0});

  const readyFrame=session.guide.queue.entries[0].proposedFrame;
  session=advanceAssistedWordpark(session,{frame:readyFrame,dt:1/24});
  const watchFrame=session.guide.queue.entries[1].proposedFrame;
  session=advanceAssistedWordpark(session,{frame:watchFrame,dt:1/24});

  assert.equal(session.wordpark.wordObjects.length,2);
  assert.deepEqual(
    session.wordpark.wordObjects.map(word=>word.moodLane),
    ["STRANGE","STRANGE"],
  );
  assert.ok(session.wordpark.wordObjects.every(word=>
    word.authority==="machine-scheduled-performance-placement"
  ));
  assert.deepEqual(
    session.wordpark.wordObjects.map(word=>word.timingSource),
    ["machine-scheduled","machine-scheduled"],
  );
});

test("NOW punch turns an unresolved lyric into explicit human timing without inventing a hearing witness",()=>{
  const input=fixture();
  let session=createAssistedWordparkSession({...input,initialLane:"TENDER"});

  session=advanceAssistedWordpark(session,{
    frame:session.guide.queue.entries[0].proposedFrame,
    dt:1/24,
  });
  session=advanceAssistedWordpark(session,{
    frame:session.guide.queue.entries[1].proposedFrame,
    dt:1/24,
  });
  assert.equal(session.guide.cursor,2);
  assert.equal(session.guide.queue.entries[2].sourceWitnessId,null);

  session=punchAssistedLyric(session,{frame:173});
  const word=session.wordpark.wordObjects.at(-1);

  assert.equal(word.text,"third catch");
  assert.equal(word.sourceWitnessId,null);
  assert.equal(word.sourceAuthority,"listener-unresolved");
  assert.equal(word.authority,"human-punched-performance-placement");
  assert.equal(word.timingSource,"human-punch");
  assert.equal(word.humanAnchorCreated,true);
  assert.equal(word.dropFrame,173);
});

test("look-ahead rail exposes at most three queue items",()=>{
  const session=createAssistedWordparkSession({...fixture(),initialLane:"HARD"});
  const lookahead=assistedLookahead(session);
  assert.equal(lookahead.length,3);
  assert.deepEqual(lookahead.map(x=>x.lineId),["a","b","c"]);
  assert.deepEqual(lookahead.map(x=>x.state),["READY","WATCH","CATCH"]);
});

test("missed CATCH falls behind and later human anchor auto-arrives",()=>{
  const input=fixture();
  let session=createAssistedWordparkSession({...input,initialLane:"OPEN"});

  session=advanceAssistedWordpark(session,{frame:48,dt:1/24});
  session=advanceAssistedWordpark(session,{frame:120,dt:1/24});
  session=advanceAssistedWordpark(session,{frame:216,dt:1/24});

  assert.deepEqual(
    session.wordpark.wordObjects.map(word=>word.text),
    ["first ready","second watch","fourth human"],
  );
  assert.equal(session.guide.misses.length,1);
  assert.equal(session.guide.misses[0].lineId,"c");
  assert.equal(session.wordpark.wordObjects.at(-1).authority,"machine-scheduled-performance-placement");
});

test("sealed assisted result keeps machine timing, human treatment, misses, and performance packet distinct",()=>{
  const input=fixture();
  let session=createAssistedWordparkSession({...input,initialLane:"OPEN"});
  session=setAssistedLane(session,{moodLane:"HARD",frame:0});
  session=advanceAssistedWordpark(session,{frame:48,dt:1/24});
  const sealed=sealAssistedWordpark(session);

  assert.equal(sealed.packet.schema,"static-collective/wordpark-performance/v0");
  assert.match(sealed.packet.performanceHash,/^[a-f0-9]{64}$/);
  assert.equal(sealed.packet.wordObjects[0].moodAuthority,"performance-choice");
  assert.equal(sealed.packet.wordObjects[0].timingSource,"machine-scheduled");
  assert.equal(sealed.guide.queueHash,session.guide.queueHash);
  assert.equal(sealed.guide.laneChanges[0].moodLane,"HARD");
});

test("assisted mode is additive: original explicit-drop WORDPARK semantics remain available",()=>{
  const {fullSongForm,listeningField}=fixture();
  let session=createWordparkSession({fullSongForm,listeningField});
  const lyric=listeningField.lanes.find(l=>l.laneId==="lyrics").witnesses[0];
  session=dropLyric(session,{
    witnessId:lyric.witnessId,
    moodLane:"OPEN",
    frame:lyric.startFrame,
  });
  assert.equal(session.wordObjects[0].authority,"human-performance-placement");
  assert.equal("timingSource" in session.wordObjects[0],false);
});
