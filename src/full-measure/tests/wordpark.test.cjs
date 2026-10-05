"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  MOOD_LANES,
  createWordparkSession,
  dropLyric,
  stepWordpark,
  sealWordparkPacket,
  compileLyricVideoMap,
}=require("../src/nextgen/wordpark.cjs");
const {deriveFullSongForm}=require("../src/nextgen/full-song-form.cjs");
const {deriveListeningField}=require("../src/nextgen/listening-field.cjs");

function fixture(){
  const fullSongForm=deriveFullSongForm({
    durationSeconds:90,
    fps:24,
    sections:[
      {start:0,end:30,label:"Opening"},
      {start:30,end:60,label:"Crossing"},
      {start:60,end:90,label:"Return"},
    ],
  });
  const listeningField=deriveListeningField({
    fullSongForm,
    songRef:{sourceSha256:"a".repeat(64),durationSeconds:90},
    alignment:{
      schema:"full-measure.lyric-alignment.v1",
      cues:[
        {lineId:"line-1",text:"hold me true",start:4,end:6,status:"high",confidence:.9},
        {lineId:"line-2",text:"take me home",start:12,end:14,status:"human",confidence:1,humanCorrected:true},
      ],
    },
  });
  return {fullSongForm,listeningField};
}

test("WORDPARK mood lanes are physical text grammars, not semantic labels",()=>{
  assert.deepEqual(Object.keys(MOOD_LANES),["OPEN","TENDER","STRANGE","HARD"]);
  assert.equal(MOOD_LANES.OPEN.geometryKind,"platform");
  assert.equal(MOOD_LANES.TENDER.geometryKind,"bowl");
  assert.equal(MOOD_LANES.STRANGE.geometryKind,"ramp");
  assert.equal(MOOD_LANES.HARD.geometryKind,"wall");
  assert.ok(Object.values(MOOD_LANES).every(lane=>lane.authority==="performance-choice"));
});

test("dropping a lyric makes the exact words become the collision geometry",()=>{
  const {fullSongForm,listeningField}=fixture();
  let session=createWordparkSession({fullSongForm,listeningField});
  const lyric=listeningField.lanes.find(l=>l.laneId==="lyrics").witnesses[0];

  session=dropLyric(session,{
    witnessId:lyric.witnessId,
    moodLane:"STRANGE",
    frame:lyric.startFrame,
    x:.78,
    y:.42,
  });

  assert.equal(session.wordObjects.length,1);
  const word=session.wordObjects[0];
  assert.equal(word.text,"hold me true");
  assert.equal(word.geometry.kind,"ramp");
  assert.equal(word.sourceWitnessId,lyric.witnessId);
  assert.equal(word.authority,"human-performance-placement");
  assert.ok(word.geometry.path.length>=2);
  assert.equal(
    word.geometry.glyphs.map(g=>g.char).join(""),
    "hold me true",
  );
  assert.deepEqual(
    word.geometry.collisionSegments,
    word.geometry.path.slice(0,-1).map((point,index)=>({
      from:point,
      to:word.geometry.path[index+1],
    })),
  );
  assert.equal(session.constructionTrace.length,1);
  assert.equal(session.constructionTrace[0].moodLane,"STRANGE");
});

test("the bird-ball can bounce on text and records the lyric contact",()=>{
  const {fullSongForm,listeningField}=fixture();
  let session=createWordparkSession({
    fullSongForm,
    listeningField,
    ball:{x:.5,y:.28,vx:0,vy:.5,radius:.025},
  });
  const lyric=listeningField.lanes.find(l=>l.laneId==="lyrics").witnesses[0];

  session=dropLyric(session,{
    witnessId:lyric.witnessId,
    moodLane:"OPEN",
    frame:lyric.startFrame,
    x:.5,
    y:.55,
  });

  for(let i=0;i<40;i++){
    session=stepWordpark(session,{frame:lyric.startFrame+i,steerX:0,steerY:0,dt:1/24});
  }

  const contacts=session.traversalTrace.filter(event=>event.kind==="text-contact");
  assert.ok(contacts.length>0);
  assert.ok(contacts.some(event=>event.wordObjectId===session.wordObjects[0].wordObjectId));
  assert.ok(contacts.every(event=>event.sourceWitnessId===lyric.witnessId));
  assert.ok(session.ball.y<.72);
});

test("construction and traversal remain separate witnessed performances",()=>{
  const {fullSongForm,listeningField}=fixture();
  let session=createWordparkSession({fullSongForm,listeningField});
  const lyric=listeningField.lanes.find(l=>l.laneId==="lyrics").witnesses[1];

  session=dropLyric(session,{
    witnessId:lyric.witnessId,
    moodLane:"TENDER",
    frame:lyric.startFrame,
    x:.8,
    y:.6,
  });
  session=stepWordpark(session,{frame:lyric.startFrame,steerX:-1,steerY:.25,dt:1/24});

  assert.equal(session.constructionTrace.length,1);
  assert.ok(session.traversalTrace.some(event=>event.kind==="ball-sample"));
  assert.equal(session.constructionTrace[0].sourceAuthority,"testimony-only");
  assert.equal(session.constructionTrace[0].moodAuthority,"performance-choice");
  assert.equal(session.constructionTrace[0].meaningClaim,null);
});

test("sealed WORDPARK packet carries song/form/hearing ancestry without a score",()=>{
  const {fullSongForm,listeningField}=fixture();
  let session=createWordparkSession({fullSongForm,listeningField});
  const lyric=listeningField.lanes.find(l=>l.laneId==="lyrics").witnesses[0];
  session=dropLyric(session,{witnessId:lyric.witnessId,moodLane:"HARD",frame:lyric.startFrame,x:.82,y:.5});
  session=stepWordpark(session,{frame:lyric.startFrame,steerX:-.4,steerY:0,dt:1/24});
  const packet=sealWordparkPacket(session);

  assert.equal(packet.schema,"static-collective/wordpark-performance/v0");
  assert.equal(packet.authority,"witness-only");
  assert.equal(packet.songRef.sourceSha256,"a".repeat(64));
  assert.equal(packet.formRef.formHash,fullSongForm.formHash);
  assert.equal(packet.listeningFieldRef.fieldHash,listeningField.fieldHash);
  assert.match(packet.performanceHash,/^[a-f0-9]{64}$/);
  assert.equal("score" in packet,false);
  assert.equal("quality" in packet,false);
  assert.equal(packet.laws.includes("MOOD PLACEMENT != LYRIC MEANING"),true);
  assert.equal(packet.laws.includes("TEXT != SUBTITLE"),true);
});

test("the lyric-video map is derived from performed word geometry and remains proposal-only",()=>{
  const {fullSongForm,listeningField}=fixture();
  let session=createWordparkSession({fullSongForm,listeningField});
  const lyrics=listeningField.lanes.find(l=>l.laneId==="lyrics").witnesses;

  session=dropLyric(session,{witnessId:lyrics[0].witnessId,moodLane:"OPEN",frame:lyrics[0].startFrame,x:.72,y:.35});
  session=dropLyric(session,{witnessId:lyrics[1].witnessId,moodLane:"STRANGE",frame:lyrics[1].startFrame,x:.8,y:.64});
  const packet=sealWordparkPacket(session);
  const map=compileLyricVideoMap(packet);

  assert.equal(map.schema,"static-collective/wordpark-lyric-map/v0");
  assert.equal(map.authority,"proposal-only");
  assert.equal(map.wordObjects.length,2);
  assert.deepEqual(map.wordObjects.map(x=>x.text),["hold me true","take me home"]);
  assert.ok(map.wordObjects.every(x=>x.geometry.glyphs.length===x.text.length));
  assert.equal(map.sourcePerformanceHash,packet.performanceHash);
  assert.equal(map.laws.includes("LYRIC MAP != FROZEN PLAN"),true);
});
